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
    $financeiro = $db->table_exists('trifase_financeiro_obrigacoes') && $db->field_exists('garantia_inicio', 'trifase_financeiro_obrigacoes');
    $tecnico = $db->table_exists('trifase_atendimentos');
    if ($financeiro) {
        $db->join('trifase_financeiro_obrigacoes tf_garantia', 'tf_garantia.os_id = os.idOs', 'left');
    }
    if ($tecnico) {
        $db->join('trifase_atendimentos tf_atendimento', 'tf_atendimento.os_id = os.idOs', 'left');
        $db->select('tf_atendimento.garantia_dias AS trifase_garantia_dias', false);
    }
    $data = match (true) {
        $tecnico && $financeiro => 'COALESCE(tf_atendimento.concluido_em, tf_garantia.garantia_inicio)',
        $tecnico => 'tf_atendimento.concluido_em', $financeiro => 'tf_garantia.garantia_inicio', default => null,
    };
    if ($data !== null) {
        $gerido = implode(' OR ', array_filter([$tecnico ? 'tf_atendimento.os_id IS NOT NULL' : null, $financeiro ? 'tf_garantia.os_id IS NOT NULL' : null]));
        $db->select($data . ' AS trifase_garantia_inicio, CASE WHEN ' . $gerido . ' THEN 1 ELSE 0 END AS trifase_financeiro_gerida', false);
    }
}
