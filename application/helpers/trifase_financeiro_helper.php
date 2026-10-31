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
