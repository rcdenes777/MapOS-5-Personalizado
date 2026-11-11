<?php

defined('BASEPATH') or exit('No direct script access allowed');

require_once APPPATH . 'helpers/trifase_publico_helper.php';
require_once APPPATH . 'libraries/Trifase_token.php';

class Trifase_publico_model extends CI_Model
{
    public const VALIDADE_DIAS = 120;

    public function __construct(private ?Trifase_token $tokens = null)
    {
        parent::__construct();
    }

    private function tokens(): Trifase_token
    {
        return $this->tokens ??= new Trifase_token();
    }

    /** Só o controller autorizado do painel chama esta leitura. */
    public function tokenAtivo(int $id): ?string
    {
        $linha = $this->db->where('os_id', $id)->where('expira_em >', time())->get('trifase_publico_links', 1)->row();
        if (! $linha || ! $linha->token_hash || ! $linha->token_cifrado) {
            return null;
        }
        try {
            $token = $this->tokens()->decifrar($linha->token_cifrado, $id);
        } catch (RuntimeException $erro) {
            return null;
        }

        return $token !== null && hash_equals($linha->token_hash, hash('sha256', $token)) ? $token : null;
    }

    /** Recuperação administrativa de token antigo conhecido, sem trocar sua URL. */
    public function guardarTokenExistente(int $id, string $token): bool
    {
        if (! trifasePublicoTokenValido($token)) {
            return false;
        }

        return $this->transacao($id, function () use ($id, $token): bool {
            $linha = $this->db->where('os_id', $id)->where('expira_em >', time())->get('trifase_publico_links', 1)->row();
            if (! $linha || ! is_string($linha->token_hash) || ! hash_equals($linha->token_hash, hash('sha256', $token))) {
                return false;
            }
            if (! $this->db->where('os_id', $id)->update('trifase_publico_links', ['token_cifrado' => $this->tokens()->cifrar($token, $id)])) {
                throw new RuntimeException('Não foi possível guardar o link existente.');
            }

            return true;
        });
    }

    public function ordem(int $id): ?object
    {
        return $this->db->select('idOs, status, dataInicial, dataFinal, descricaoProduto')->where('idOs', $id)->get('os', 1)->row() ?: null;
    }

    public function estado(int $id): ?object
    {
        return $this->db->select('expira_em')->where('os_id', $id)->where('token_hash IS NOT NULL', null, false)->where('expira_em >', time())->get('trifase_publico_links', 1)->row() ?: null;
    }

    /** Um único slot por OS: hash público e cópia cifrada para o painel. */
    public function gerar(int $id, int $usuario): string
    {
        return $this->transacao($id, function () use ($id, $usuario): string {
            $token = bin2hex(random_bytes(32));
            $dias = trifasePublicoValidadeDias();
            $dados = ['token_hash' => hash('sha256', $token), 'token_cifrado' => $this->tokens()->cifrar($token, $id), 'validade_dias' => $dias, 'expira_em' => time() + $dias * 86400, 'usuario_id' => $usuario];
            if ($this->db->where('os_id', $id)->count_all_results('trifase_publico_links') > 0) {
                $ok = $this->db->where('os_id', $id)->update('trifase_publico_links', $dados);
            } else {
                $ok = $this->db->insert('trifase_publico_links', ['os_id' => $id] + $dados);
            }
            if (! $ok) {
                throw new RuntimeException('Não foi possível gerar o link.');
            }

            return $token;
        });
    }

    /** Define novo vencimento a partir de hoje, mantendo token e anexos. */
    public function renovar(int $id, int $usuario): void
    {
        $this->transacao($id, function () use ($id, $usuario): void {
            $link = $this->db->where('os_id', $id)->where('token_hash IS NOT NULL', null, false)->where('expira_em >', time())->get('trifase_publico_links', 1)->row();
            if (! $link) {
                throw new DomainException('Não há link ativo para renovar.');
            }
            $dias = trifasePublicoValidadeDias();
            if (! $this->db->where('os_id', $id)->update('trifase_publico_links', ['expira_em' => time() + $dias * 86400, 'validade_dias' => $dias, 'usuario_id' => $usuario])) {
                throw new RuntimeException('Não foi possível renovar a validade.');
            }
        });
    }

    public function revogar(int $id): void
    {
        $this->transacao($id, function () use ($id): void {
            if (! $this->db->where('os_id', $id)->update('trifase_publico_links', ['token_hash' => null, 'token_cifrado' => null, 'expira_em' => null])) {
                throw new RuntimeException('Não foi possível revogar o link.');
            }
        });
    }

    public function resolver(mixed $token): ?object
    {
        if (! trifasePublicoTokenValido($token)) {
            return null;
        }

        return $this->db->select('os.idOs, os.status, os.dataInicial, os.dataFinal, os.descricaoProduto')
            ->from('trifase_publico_links AS link')->join('os', 'os.idOs = link.os_id')
            ->where('link.token_hash', hash('sha256', $token))->where('link.expira_em >', time())->get()->row() ?: null;
    }

    /** @return list<object> */
    public function anexos(int $id, bool $somentePublicos = false): array
    {
        if ($somentePublicos && ! $this->db->table_exists('trifase_publico_anexos')) {
            return [];
        }
        $this->db->select('anexos.*, publicado.anexo_id AS publicado')->from('anexos')
            ->join('trifase_publico_anexos AS publicado', 'publicado.anexo_id = anexos.idAnexos AND publicado.os_id = anexos.os_id', 'left')
            ->where('anexos.os_id', $id);
        if ($somentePublicos) {
            $this->db->where('publicado.anexo_id IS NOT NULL', null, false);
        }

        return $this->db->order_by('anexos.idAnexos')->get()->result();
    }

    public function anexoPublicado(int $osId, int $anexoId): ?object
    {
        if (! $this->db->table_exists('trifase_publico_anexos')) {
            return null;
        }
        return $this->db->select('anexos.*')->from('anexos')
            ->join('trifase_publico_anexos AS publicado', 'publicado.anexo_id = anexos.idAnexos AND publicado.os_id = anexos.os_id')
            ->where('anexos.os_id', $osId)->where('anexos.idAnexos', $anexoId)->get()->row() ?: null;
    }

    /** Substitui a seleção somente após validar TODOS os IDs na OS dona. */
    public function publicarAnexos(int $id, array $ids): void
    {
        if (count($ids) > 1000) {
            throw new DomainException('Seleção de anexos inválida.');
        }
        foreach ($ids as $item) {
            if ((! is_string($item) && ! is_int($item)) || ! preg_match('/\A[1-9][0-9]{0,9}\z/', (string) $item)) {
                throw new DomainException('Seleção de anexos inválida.');
            }
        }
        $ids = array_values(array_unique(array_map('intval', $ids)));
        $this->transacao($id, function () use ($id, $ids): void {
            if ($ids !== [] && $this->db->where('os_id', $id)->where_in('idAnexos', $ids)->count_all_results('anexos') !== count($ids)) {
                throw new DomainException('Um dos anexos não pertence a esta OS.');
            }
            if (! $this->db->where('os_id', $id)->delete('trifase_publico_anexos')) {
                throw new RuntimeException('Não foi possível salvar a seleção.');
            }
            foreach ($ids as $anexoId) {
                if (! $this->db->insert('trifase_publico_anexos', ['os_id' => $id, 'anexo_id' => $anexoId])) {
                    throw new RuntimeException('Não foi possível publicar o anexo.');
                }
            }
        });
    }

    /** Altera um único anexo sem sobrescrever a seleção de outra sessão. */
    public function alterarAnexo(int $id, int $anexo, bool $publicar, bool $anterior): array
    {
        return $this->transacao($id, function () use ($id, $anexo, $publicar, $anterior): array {
            if (! $this->db->where('os_id', $id)->where('idAnexos', $anexo)->get('anexos', 1)->row()) {
                throw new DomainException('Anexo não encontrado nesta OS.');
            }
            $atual = $this->db->where('os_id', $id)->where('anexo_id', $anexo)->count_all_results('trifase_publico_anexos') > 0;
            if ($atual !== $anterior && $atual !== $publicar) {
                return ['publicado' => $atual, 'conflito' => true];
            }
            if ($atual !== $publicar) {
                $ok = $publicar
                    ? $this->db->insert('trifase_publico_anexos', ['os_id' => $id, 'anexo_id' => $anexo])
                    : $this->db->where('os_id', $id)->where('anexo_id', $anexo)->delete('trifase_publico_anexos');
                if (! $ok) {
                    throw new RuntimeException('Não foi possível alterar a visibilidade.');
                }
            }
            return ['publicado' => $publicar, 'conflito' => false];
        });
    }

    /** Serializa mudanças do módulo na mesma OS; InnoDB em produção, SQLite nos testes. */
    private function transacao(int $id, callable $acao): mixed
    {
        if ($id <= 0 || ! $this->db->trans_begin()) {
            throw new DomainException('OS inválida ou indisponível.');
        }
        try {
            $lock = match ($this->db->dbdriver) {
                'mysqli' => ' FOR UPDATE',
                'sqlite3' => '',
                default => throw new RuntimeException('Driver de banco não suportado pelo módulo público.'),
            };
            $consulta = $this->db->select('idOs')->where('idOs', $id)->get_compiled_select('os');
            $os = $this->db->query($consulta . $lock)->row();
            if (! $os) {
                throw new DomainException('OS não encontrada.');
            }
            $resultado = $acao();
            if (! $this->db->trans_status() || ! $this->db->trans_commit()) {
                throw new RuntimeException('Não foi possível concluir a operação.');
            }

            return $resultado;
        } catch (Throwable $erro) {
            $this->db->trans_rollback();
            throw $erro;
        }
    }
}
