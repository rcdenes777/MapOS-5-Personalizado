<?php

defined('BASEPATH') or exit('No direct script access allowed');
require_once APPPATH . 'libraries/Trifase_os_lock.php';
require_once APPPATH . 'helpers/trifase_atendimento_helper.php';
require_once APPPATH . 'helpers/trifase_retorno_helper.php';

class Trifase_atendimento_model extends CI_Model
{
    public function alterarAndamento(int $id, string $status, int $usuario): void
    {
        if ($usuario <= 0 || ! in_array($status, ['Orçamento', 'Negociação', 'Orçamento recusado', 'Aberto', 'Aprovado', 'Em Andamento', 'Aguardando Peças', 'Finalizado'], true)) {
            throw new DomainException('Andamento inválido. Cancelamento usa o fluxo de conciliação existente.');
        }
        $this->transacao($id, function ($os) use ($id, $status, $usuario) {
            if (in_array($os->status, ['Cancelado', 'Faturado'], true)) {
                throw new DomainException('Concilie o estado legado ou cancelamento antes de alterar o andamento.');
            }
            if ($os->status === $status) {
                return;
            }
            $this->prepararTransicao($os, $status, $usuario);
            if (! $this->db->insert('os_historico', ['os_id' => $id, 'status_anterior' => $os->status, 'status_novo' => $status, 'usuarios_id' => $usuario, 'data_hora' => date('Y-m-d H:i:s')])
                || ! $this->db->where('idOs', $id)->update('os', ['status' => $status])) {
                throw new RuntimeException('Não foi possível registrar o andamento.');
            }
        });
    }

    /** Interno: só executar sob Trifase_os_lock, antes de gravar o status. */
    public function prepararTransicao(object $os, string $status, int $usuario): void
    {
        $id = (int) $os->idOs;
        trifaseValidarMudancaDeAndamento($this->db, $os, $status);
        if ($os->status === 'Finalizado' && $status !== 'Finalizado') {
            if (trifaseRetornoTemDerivados($this->db, $id)) {
                throw new DomainException('Esta OS já originou retorno. Preserve o atendimento encerrado e use a nova OS.');
            }
            if ($this->db->table_exists('trifase_entregas_estado') && $this->db->where('os_id', $id)->where('evento_id IS NOT NULL', null, false)->count_all_results('trifase_entregas_estado') > 0) {
                throw new DomainException('Equipamento entregue: registre outro atendimento em vez de reabrir esta OS.');
            }
            if ($this->conclusao($id) === null && $this->referenciaFinanceira($id) === null) {
                throw new DomainException('Registre a conclusão real antes de reabrir, preservando a referência da garantia.');
            }
        }
        require_once APPPATH . 'helpers/trifase_garantia_helper.php';
        if ($status === 'Finalizado' && trifaseGarantiaOperacoesHabilitadas() && trifaseRetornoDaOs($this->db, $id)) {
            $av = $this->db->where('os_id', $id)->where('tipo', 'avaliar')->order_by('id', 'desc')->get('trifase_garantia_eventos', 1)->row();
            if ($av && in_array($av->solucao, ['troca', 'devolucao_valor'], true) && ! trifaseGarantiaResolucaoExecutada($this->db, $id)) {
                throw new DomainException('Execute a solução de garantia escolhida antes de concluir o retorno.');
            }
        }
        if ($status === 'Finalizado' && $this->conclusao($id) === null) {
            $this->gravarConclusao($os, $this->referenciaFinanceira($id) ?? date('Y-m-d'), $usuario);
        }
    }

    public function registrarConclusao(int $id, string $data, int $usuario): void
    {
        $this->transacao($id, function ($os) use ($id, $data, $usuario) {
            if ($os->status !== 'Finalizado' || $this->conclusao($id) !== null || $this->referenciaFinanceira($id) !== null) {
                throw new DomainException('A conclusão só pode ser registrada uma vez, em OS finalizada sem referência conhecida.');
            }
            $this->gravarConclusao($os, $data, $usuario);
        });
    }

    public function conclusao(int $id): ?object
    {
        return trifaseAtendimentoDaOs($this->db, $id);
    }

    private function referenciaFinanceira(int $id): ?string
    {
        if (! $this->db->table_exists('trifase_financeiro_obrigacoes') || ! $this->db->field_exists('garantia_inicio', 'trifase_financeiro_obrigacoes')) {
            return null;
        }
        $r = $this->db->select('garantia_inicio')->where('os_id', $id)->get('trifase_financeiro_obrigacoes', 1)->row();
        return ! empty($r->garantia_inicio) ? (string) $r->garantia_inicio : null;
    }

    private function gravarConclusao(object $os, string $data, int $usuario): void
    {
        $d = DateTimeImmutable::createFromFormat('!Y-m-d', $data);
        $dias = filter_var(($os->garantia ?? '') === '' ? 0 : $os->garantia, FILTER_VALIDATE_INT, ['options' => ['min_range' => 0, 'max_range' => 9999]]);
        if ($this->db->table_exists('trifase_garantia_retornos') && $this->db->where('os_id', (int) $os->idOs)->count_all_results('trifase_garantia_retornos') > 0) {
            $dias = 0; // O retorno não concede outro prazo; sua origem permanece a referência.
        }
        if ($usuario <= 0 || $d === false || $d->format('Y-m-d') !== $data || $data > date('Y-m-d') || $data < substr((string) $os->dataInicial, 0, 10) || $dias === false) {
            throw new DomainException('Confira a data real da conclusão e o prazo concedido na OS.');
        }
        if (! $this->db->insert('trifase_atendimentos', ['os_id' => (int) $os->idOs, 'concluido_em' => $data,
            'garantia_dias' => $dias, 'usuario_id' => $usuario, 'registrado_em' => date('Y-m-d H:i:s')])) {
            throw new RuntimeException('Não foi possível registrar a conclusão técnica.');
        }
    }

    private function transacao(int $id, callable $acao): void
    {
        $lock = new Trifase_os_lock($this->db, $id);
        try {
            $acao($lock->os);
            $lock->finalizar(true);
        } catch (Throwable $e) {
            $lock->finalizar(false);
            throw $e;
        }
    }
}
