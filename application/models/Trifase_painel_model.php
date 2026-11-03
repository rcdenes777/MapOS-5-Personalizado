<?php

require_once APPPATH . 'libraries/Trifase_os_fila.php';
require_once APPPATH . 'libraries/Trifase_financeiro_busca.php';
require_once APPPATH . 'helpers/trifase_financeiro_helper.php';

/** Consultas de leitura para a visão operacional do painel. */
class Trifase_painel_model extends CI_Model
{
    public function operacional(): array
    {
        $status = [];
        foreach ($this->db->select('status, COUNT(*) AS total')->group_by('status')->get('os')->result() as $linha) {
            $status[(string) $linha->status] = (int) $linha->total;
        }
        $filas = [];
        foreach (Trifase_os_fila::opcoes($this->db) as $fila => $label) {
            $this->db->from('os');
            Trifase_os_fila::aplicar($this->db, $fila);
            $filas[$fila] = ['label' => $label, 'total' => (int) $this->db->count_all_results()];
        }
        return ['status' => $status, 'filas' => $filas,
            'atencao' => $this->lista(null),
            'retirada' => isset($filas['retirada']) ? $this->lista('retirada') : [],
        ];
    }

    private function lista(?string $fila): array
    {
        $this->db->select('os.idOs, os.status, os.dataFinal, os.descricaoProduto, clientes.nomeCliente')->from('os')
            ->join('clientes', 'clientes.idClientes = os.clientes_id', 'left');
        if ($fila !== null) {
            Trifase_os_fila::aplicar($this->db, $fila);
        } else {
            $this->db->where_in('os.status', array_merge(Trifase_os_fila::ANDAMENTO, Trifase_os_fila::ORCAMENTOS));
        }
        return $this->db->order_by("CASE WHEN os.dataFinal IS NULL OR CAST(os.dataFinal AS CHAR) = '0000-00-00' THEN 1 ELSE 0 END", 'ASC', false)
            ->order_by('os.dataFinal', 'ASC')->order_by('os.idOs', 'DESC')->limit(6)->get()->result();
    }

    /** Saldo formalizado das OS; não mistura previsão de faturamento com caixa. */
    public function financeiroOs(): ?array
    {
        if (! trifaseFinanceiroHabilitado() || ! $this->db->table_exists('trifase_financeiro_obrigacoes') || ! $this->db->table_exists('trifase_financeiro_eventos')) {
            return null;
        }
        $this->db->select('COUNT(*) AS quantidade, COALESCE(SUM(tf_os_financeiro.total_c - tf_os_financeiro.recebido_c), 0) AS saldo_c', false)->from('os');
        Trifase_financeiro_busca::aplicar($this->db, ['saldo' => 'pendente']);
        $linha = $this->db->get()->row();
        return ['quantidade' => (int) $linha->quantidade, 'saldo_c' => (int) $linha->saldo_c];
    }
}
