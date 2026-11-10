<?php

require_once APPPATH . 'helpers/trifase_entrega_helper.php';
require_once APPPATH . 'helpers/trifase_retorno_helper.php';
require_once APPPATH . 'helpers/trifase_interface_helper.php';
require_once APPPATH . 'helpers/trifase_orcamento_helper.php';

/** As mesmas filas no painel, na contagem e na listagem de OS. */
final class Trifase_os_fila
{
    public const ANDAMENTO = ['Aberto', 'Aprovado', 'Em Andamento', 'Aguardando Peças'];
    public const ORCAMENTOS = ['Orçamento', 'Negociação'];
    public const OPCOES = ['andamento' => 'Em atendimento', 'orcamentos' => 'Aguardando orçamento', 'retirada' => 'Aguardando retirada', 'retornos' => 'Retornos em avaliação', 'recusados' => 'Orçamentos recusados', 'cancelamentos' => 'Cancelamentos pendentes'];

    public static function opcoes(object $db): array
    {
        if (! trifaseInterfacePiloto()) {
            return [];
        }
        $opcoes = self::OPCOES;
        if (! trifaseEntregaHabilitada() || ! $db->table_exists('trifase_entregas_estado')) {
            unset($opcoes['retirada']);
        }
        if (! trifaseRetornoHabilitado() || ! $db->table_exists('trifase_garantia_retornos') || ! $db->table_exists('trifase_garantia_eventos')) {
            unset($opcoes['retornos']);
        }
        if (! trifaseOrcamentoHabilitado() || ! $db->table_exists('trifase_orcamento_estado') || ! $db->table_exists('trifase_orcamento_eventos') || ! $db->table_exists('trifase_orcamento_versoes')) {
            unset($opcoes['recusados']);
        }
        if (! $db->table_exists('trifase_cancelamentos')) {
            unset($opcoes['cancelamentos']);
        }
        return $opcoes;
    }

    public static function aplicar(object $db, string $fila): void
    {
        if (! isset(self::opcoes($db)[$fila])) {
            return;
        }
        switch ($fila) {
            case 'andamento':
                $db->where_in('os.status', self::ANDAMENTO);
                break;
            case 'orcamentos':
                $db->where_in('os.status', self::ORCAMENTOS);
                break;
            case 'cancelamentos':
                $db->where('os.status !=', 'Cancelado')
                    ->where("COALESCE((SELECT c.tipo FROM trifase_cancelamentos c WHERE c.os_id = os.idOs AND c.tipo IN ('solicitar', 'retirar', 'confirmar') ORDER BY c.id DESC LIMIT 1), '') = 'solicitar'", null, false);
                break;
            case 'recusados':
                $ids = self::recusasVigentes($db);
                if ($ids === []) {
                    $db->where('1 = 0', null, false);
                } else {
                    $db->where_in('os.idOs', $ids);
                }
                break;
            case 'retirada':
                $db->where_in('os.status', ['Finalizado', 'Cancelado'])->where('NOT EXISTS (SELECT 1 FROM trifase_entregas_estado tfe WHERE tfe.os_id = os.idOs AND tfe.evento_id IS NOT NULL)', null, false);
                break;
            case 'retornos':
                $db->where_not_in('os.status', ['Finalizado', 'Cancelado', 'Faturado'])
                    ->where('EXISTS (SELECT 1 FROM trifase_garantia_retornos tfr WHERE tfr.os_id = os.idOs)', null, false)
                    ->where("COALESCE((SELECT tfg.cobertura FROM trifase_garantia_eventos tfg WHERE tfg.os_id = os.idOs AND tfg.tipo = 'avaliar' ORDER BY tfg.id DESC LIMIT 1), 'avaliacao') = 'avaliacao'", null, false);
                break;
        }
    }

    private static function recusasVigentes(object $db): array
    {
        require_once APPPATH . 'models/Trifase_orcamento_model.php';
        // Preserve a consulta de contagem ou listagem em montagem.
        $consulta = clone $db;
        $consulta->reset_query();
        $candidatas = $consulta->select('os.*, v.conteudo_hash, e.ativo')->from('os')
            ->join('trifase_orcamento_estado e', 'e.os_id = os.idOs')
            ->join('trifase_orcamento_versoes v', 'v.id = e.versao_id AND v.os_id = os.idOs')
            ->join('trifase_orcamento_eventos r', 'r.os_id = os.idOs AND r.decisao_versao = e.versao_id')
            ->where(['os.status' => 'Orçamento recusado', 'e.ativo' => 1, 'r.tipo' => 'recusar'])->get()->result();
        $orcamentos = new Trifase_orcamento_model();
        $orcamentos->db = $consulta;
        $ids = [];
        foreach ($candidatas as $os) {
            if ($orcamentos->versaoVigente($os, $os) !== null) {
                $ids[] = (int) $os->idOs;
            }
        }

        return $ids;
    }

}
