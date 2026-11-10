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
    public const OPCOES = ['andamento' => 'Em atendimento', 'orcamentos' => 'Aguardando orçamento', 'retirada' => 'Prontas para retirada', 'retornos' => 'Retornos em avaliação', 'recusados' => 'Orçamentos recusados', 'cancelamentos' => 'Cancelamentos em processo'];

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
        if (! trifaseOrcamentoHabilitado() || ! $db->table_exists('trifase_orcamento_estado') || ! $db->table_exists('trifase_orcamento_eventos')) {
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
                $semEntrega = trifaseEntregaHabilitada() && $db->table_exists('trifase_entregas_estado')
                    ? 'NOT EXISTS (SELECT 1 FROM trifase_entregas_estado tfe WHERE tfe.os_id = os.idOs AND tfe.evento_id IS NOT NULL)' : '1 = 1';
                $db->where("((os.status != 'Cancelado' AND COALESCE((SELECT c.tipo FROM trifase_cancelamentos c WHERE c.os_id = os.idOs AND c.tipo IN ('solicitar', 'retirar', 'confirmar') ORDER BY c.id DESC LIMIT 1), '') = 'solicitar') OR (os.status = 'Cancelado' AND EXISTS (SELECT 1 FROM trifase_cancelamentos c WHERE c.os_id = os.idOs AND c.tipo = 'confirmar') AND " . $semEntrega . '))', null, false);
                break;
            case 'recusados':
                $db->where('os.status !=', 'Cancelado')
                    ->where("EXISTS (SELECT 1 FROM trifase_orcamento_estado toe JOIN trifase_orcamento_eventos tor ON tor.os_id = toe.os_id AND tor.decisao_versao = toe.versao_id WHERE toe.os_id = os.idOs AND toe.ativo = 1 AND tor.tipo = 'recusar')", null, false);
                break;
            case 'retirada':
                $db->where('os.status', 'Finalizado')->where('NOT EXISTS (SELECT 1 FROM trifase_entregas_estado tfe WHERE tfe.os_id = os.idOs)', null, false);
                break;
            case 'retornos':
                $db->where_not_in('os.status', ['Finalizado', 'Cancelado', 'Faturado'])
                    ->where('EXISTS (SELECT 1 FROM trifase_garantia_retornos tfr WHERE tfr.os_id = os.idOs)', null, false)
                    ->where("COALESCE((SELECT tfg.cobertura FROM trifase_garantia_eventos tfg WHERE tfg.os_id = os.idOs AND tfg.tipo = 'avaliar' ORDER BY tfg.id DESC LIMIT 1), 'avaliacao') = 'avaliacao'", null, false);
                break;
        }
    }
}
