<?php

defined('BASEPATH') or exit('No direct script access allowed');

require_once APPPATH . 'helpers/trifase_publico_helper.php';
require_once APPPATH . 'libraries/Trifase_token.php';

/** Um único link recuperável pelo painel e verificável por hash por cliente. */
class Trifase_cliente_publico_model extends CI_Model
{
    public function __construct(private ?Trifase_token $tokens = null)
    {
        parent::__construct();
    }

    private function tokens(): Trifase_token
    {
        return $this->tokens ??= new Trifase_token();
    }

    public function gerar(int $id, int $usuario): string
    {
        if ($usuario <= 0) {
            throw new DomainException('Operador inválido.');
        }
        return $this->transacao($id, function () use ($id, $usuario): string {
            $token = bin2hex(random_bytes(32));
            $dados = ['token_hash' => hash('sha256', $token), 'token_cifrado' => $this->tokens()->cifrar($token, $id),
                'expira_em' => time() + trifasePublicoValidadeDias() * 86400, 'usuario_id' => $usuario];
            $existe = $this->db->where('cliente_id', $id)->count_all_results('trifase_cliente_publico_links') > 0;
            $ok = $existe ? $this->db->where('cliente_id', $id)->update('trifase_cliente_publico_links', $dados)
                : $this->db->insert('trifase_cliente_publico_links', ['cliente_id' => $id] + $dados);
            if (! $ok) {
                throw new RuntimeException('Não foi possível gerar o link.');
            }
            return $token;
        });
    }

    public function revogar(int $id): void
    {
        $this->transacao($id, function () use ($id): void {
            if (! $this->db->where('cliente_id', $id)->update('trifase_cliente_publico_links', ['token_hash' => null, 'token_cifrado' => null, 'expira_em' => null])) {
                throw new RuntimeException('Não foi possível revogar o link.');
            }
        });
    }

    public function estado(int $id): ?object
    {
        return $this->db->select('expira_em')->where('cliente_id', $id)->where('token_hash IS NOT NULL', null, false)
            ->where('expira_em >', time())->get('trifase_cliente_publico_links', 1)->row() ?: null;
    }

    public function tokenAtivo(int $id): ?string
    {
        $linha = $this->db->where('cliente_id', $id)->where('expira_em >', time())->get('trifase_cliente_publico_links', 1)->row();
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

    /** Projeção pública mínima; cada consulta limita os registros ao cliente. */
    public function ordens(int $clienteId): array
    {
        return $this->consultaOrdens($clienteId)->order_by('os.idOs', 'desc')->get()->result();
    }

    public function ordem(int $clienteId, int $osId): ?object
    {
        return $this->consultaOrdens($clienteId)->where('os.idOs', $osId)->get()->row() ?: null;
    }

    private function consultaOrdens(int $clienteId): object
    {
        return $this->db->select('os.idOs, os.status, os.dataInicial, os.dataFinal, os.descricaoProduto, evento.id AS entregue')
            ->from('os')->join('trifase_entregas_estado AS entrega', 'entrega.os_id = os.idOs', 'left')
            ->join('trifase_entregas_eventos AS evento', 'evento.id = entrega.evento_id AND evento.os_id = entrega.os_id', 'left')
            ->where('os.clientes_id', $clienteId);
    }

    public function resolver(mixed $token): ?object
    {
        if (! trifasePublicoTokenValido($token)) {
            return null;
        }
        return $this->db->select('clientes.idClientes, clientes.nomeCliente')->from('trifase_cliente_publico_links AS link')
            ->join('clientes', 'clientes.idClientes = link.cliente_id')->where('link.token_hash', hash('sha256', $token))
            ->where('link.expira_em >', time())->get()->row() ?: null;
    }

    private function transacao(int $id, callable $acao): mixed
    {
        if ($id <= 0 || ! $this->db->trans_begin()) {
            throw new DomainException('Cliente inválido ou indisponível.');
        }
        try {
            $lock = match ($this->db->dbdriver) {
                'mysqli' => ' FOR UPDATE',
                'sqlite3' => '',
                default => throw new RuntimeException('Driver de banco não suportado.'),
            };
            $sql = $this->db->select('idClientes')->where('idClientes', $id)->get_compiled_select('clientes');
            if (! $this->db->query($sql . $lock)->row()) {
                throw new DomainException('Cliente não encontrado.');
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
