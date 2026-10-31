<?php

/** Mantém IDs de projeções quitadas/estornadas sem exibir pendências de zero reais. */
function trifaseFinanceiroFiltro(object $db): string
{
    if (! $db->table_exists('trifase_financeiro_projecoes')) {
        return '1=1';
    }
    return 'NOT EXISTS (SELECT 1 FROM trifase_financeiro_projecoes tfp WHERE tfp.lancamento_id = lancamentos.idLancamentos AND tfp.ativo = 0)';
}

function trifaseFinanceiroGerido(object $db, int $id): bool
{
    return $db->table_exists('trifase_financeiro_projecoes')
        && $db->where('lancamento_id', $id)->count_all_results('trifase_financeiro_projecoes') > 0;
}

function trifaseFinanceiroHabilitado(): bool
{
    return filter_var($_ENV['TRIFASE_FINANCEIRO_ENABLED'] ?? false, FILTER_VALIDATE_BOOLEAN);
}

function trifaseFinanceiroOsGerida(object $db, int $id): bool
{
    return $db->table_exists('trifase_financeiro_obrigacoes')
        && $db->where('os_id', $id)->count_all_results('trifase_financeiro_obrigacoes') > 0;
}

require_once APPPATH . 'libraries/Trifase_os_lock.php';

/** Enriquece consultas de OS sem mudar a regra nem as datas do legado. */
function trifaseGarantiaJoin(object $db): void
{
    if ($db->table_exists('trifase_financeiro_obrigacoes') && $db->field_exists('garantia_inicio', 'trifase_financeiro_obrigacoes')) {
        $db->select('tf_garantia.garantia_inicio AS trifase_garantia_inicio, CASE WHEN tf_garantia.os_id IS NULL THEN 0 ELSE 1 END AS trifase_financeiro_gerida', false);
        $db->join('trifase_financeiro_obrigacoes tf_garantia', 'tf_garantia.os_id = os.idOs', 'left');
    }
}
