<?php

defined('BASEPATH') or exit('No direct script access allowed');
require_once APPPATH . 'libraries/Trifase_os_lock.php';
require_once APPPATH . 'helpers/trifase_equipamento_helper.php';

/** Eventos de retirada imutáveis; correção cancela o registro sem apagá-lo. */
class Trifase_entrega_model extends CI_Model
{
    public function ativa(int $osId): ?object
    {
        return $this->db->select('e.*')->from('trifase_entregas_estado s')
            ->join('trifase_entregas_eventos e', 'e.id = s.evento_id AND e.os_id = s.os_id')
            ->where('s.os_id', $osId)->get()->row() ?: null;
    }

    public function historico(int $osId): array
    {
        return $this->db->select('id, tipo, referencia_id, entregue_em, registrado_em, usuario_id, recebedor, terceiro, motivo')
            ->where('os_id', $osId)->order_by('id', 'desc')->get('trifase_entregas_eventos')->result();
    }

    public function comprovante(int $osId, int $eventoId): ?array
    {
        $evento = $this->db->select('id, entregue_em, registrado_em, usuario_id, recebedor, terceiro, equipamento, itens')
            ->where(['os_id' => $osId, 'id' => $eventoId, 'tipo' => 'registrar'])->get('trifase_entregas_eventos', 1)->row();
        if (! $evento) {
            return null;
        }
        $cancelamento = $this->db->select('id, registrado_em')->where(['os_id' => $osId, 'referencia_id' => $eventoId, 'tipo' => 'cancelar'])
            ->get('trifase_entregas_eventos', 1)->row();
        return ['evento' => $evento, 'cancelamento' => $cancelamento ?: null];
    }

    public function registrar(int $osId, array $dados, int $usuario, string $chave): int
    {
        $recebedor = $this->texto($dados['recebedor'] ?? null, 150, true);
        $itens = $this->texto($dados['itens'] ?? null, 10000, true);
        $observacoes = $this->texto($dados['observacoes'] ?? '', 10000);
        $terceiro = $dados['terceiro'] ?? null;
        if (! in_array($terceiro, ['0', '1'], true) || ($dados['confirmou_condicoes'] ?? null) !== '1') {
            throw new DomainException('Confirme o recebedor e as condições de retirada, inclusive eventual saldo pendente.');
        }
        $autorizacao = $this->texto($dados['autorizacao'] ?? '', 500, $terceiro === '1');
        if ($terceiro === '0') {
            $autorizacao = '';
        }
        $valorData = $dados['entregue_em'] ?? null;
        $data = is_string($valorData) && strlen($valorData) === 16 && ! str_contains($valorData, "\0") ? DateTimeImmutable::createFromFormat('!Y-m-d\TH:i', $valorData) : false;
        if (! $data || $data->format('Y-m-d\TH:i') !== $valorData || $data->getTimestamp() > time() + 60) {
            throw new DomainException('Informe a data e hora reais da retirada, sem data futura.');
        }
        $hash = $this->hash([$osId, 'registrar', $recebedor, $itens, $observacoes, $terceiro, $autorizacao, $valorData, $usuario]);
        return $this->transacao($osId, function ($os) use ($osId, $usuario, $chave, $hash, $recebedor, $itens, $observacoes, $terceiro, $autorizacao, $data) {
            if ($id = $this->repeticao($chave, $hash)) {
                return $id;
            }
            if ($usuario <= 0 || (! empty($os->dataInicial) && $data->format('Y-m-d') < $os->dataInicial)) {
                throw new DomainException('Data de retirada anterior à entrada ou operador inválido.');
            }
            if ($this->ativa($osId) !== null) {
                throw new DomainException('Esta OS já tem uma entrega ativa. Corrija o registro anterior com justificativa antes de registrar outra.');
            }
            $id = $this->inserir([
                'os_id' => $osId, 'tipo' => 'registrar', 'entregue_em' => $data->format('Y-m-d H:i:s'),
                'registrado_em' => date('Y-m-d H:i:s'), 'usuario_id' => $usuario,
                'recebedor' => $recebedor, 'terceiro' => (int) $terceiro, 'autorizacao' => $autorizacao,
                'equipamento' => trifaseEquipamentoTextoDaOs($this->db, $osId, (string) ($os->descricaoProduto ?? '')), 'itens' => $itens, 'observacoes' => $observacoes,
                'confirmou_condicoes' => 1, 'operacao' => $chave, 'payload_hash' => $hash,
            ]);
            if (! $this->db->insert('trifase_entregas_estado', ['os_id' => $osId, 'evento_id' => $id])) {
                throw new RuntimeException('Não foi possível confirmar a retirada.');
            }
            return $id;
        });
    }

    public function cancelar(int $osId, int $eventoId, string $motivo, int $usuario, string $chave): int
    {
        $motivo = $this->texto($motivo, 500, true);
        if (mb_strlen($motivo) < 5 || $usuario <= 0) {
            throw new DomainException('Explique o motivo da correção com pelo menos cinco caracteres.');
        }
        $hash = $this->hash([$osId, 'cancelar', $eventoId, $motivo, $usuario]);
        return $this->transacao($osId, function () use ($osId, $eventoId, $motivo, $usuario, $chave, $hash) {
            if ($id = $this->repeticao($chave, $hash)) {
                return $id;
            }
            $ativa = $this->ativa($osId);
            if ($ativa === null || (int) $ativa->id !== $eventoId) {
                throw new DomainException('Entrega ativa não encontrada nesta OS. Recarregue antes de corrigir.');
            }
            $id = $this->inserir(['os_id' => $osId, 'tipo' => 'cancelar', 'referencia_id' => $eventoId,
                'registrado_em' => date('Y-m-d H:i:s'), 'usuario_id' => $usuario, 'motivo' => $motivo,
                'operacao' => $chave, 'payload_hash' => $hash]);
            if (! $this->db->where(['os_id' => $osId, 'evento_id' => $eventoId])->delete('trifase_entregas_estado')) {
                throw new RuntimeException('Não foi possível corrigir o estado da retirada.');
            }
            return $id;
        });
    }

    private function texto(mixed $valor, int $limite, bool $obrigatorio = false): string
    {
        if (! is_string($valor) || ! mb_check_encoding($valor, 'UTF-8') || str_contains($valor, "\0") || mb_strlen(trim($valor)) > $limite || ($obrigatorio && trim($valor) === '')) {
            throw new DomainException('Confira os campos obrigatórios e o tamanho dos textos.');
        }
        return trim($valor);
    }

    private function hash(array $dados): string
    {
        return hash('sha256', json_encode($dados, JSON_THROW_ON_ERROR));
    }

    private function repeticao(string $chave, string $hash): ?int
    {
        if (! preg_match('/\A[a-zA-Z0-9_-]{16,64}\z/', $chave)) {
            throw new DomainException('Identificador da operação inválido. Recarregue a página.');
        }
        $evento = $this->db->where('operacao', $chave)->get('trifase_entregas_eventos', 1)->row();
        if ($evento !== null && ! hash_equals($evento->payload_hash, $hash)) {
            throw new DomainException('Operação já utilizada com outros dados. Recarregue a OS.');
        }
        return $evento ? (int) $evento->id : null;
    }

    private function inserir(array $dados): int
    {
        if (! $this->db->insert('trifase_entregas_eventos', $dados)) {
            throw new RuntimeException('Não foi possível gravar o histórico da retirada.');
        }
        return (int) $this->db->insert_id();
    }

    private function transacao(int $osId, callable $acao): int
    {
        $lock = new Trifase_os_lock($this->db, $osId);
        try {
            $id = $acao($lock->os);
            $lock->finalizar(true);
            return $id;
        } catch (Throwable $e) {
            $lock->finalizar(false);
            throw $e;
        }
    }
}
