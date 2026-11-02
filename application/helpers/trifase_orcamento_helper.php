<?php

function trifaseOrcamentoHabilitado(): bool
{
    return filter_var($_ENV['TRIFASE_ORCAMENTOS_ENABLED'] ?? false, FILTER_VALIDATE_BOOLEAN);
}

/** A proteção do histórico continua mesmo com a função desligada. */
function trifaseOrcamentoTemHistorico(object $db, int $os): bool
{
    return $db->table_exists('trifase_orcamento_versoes')
        && $db->where('os_id', $os)->count_all_results('trifase_orcamento_versoes') > 0;
}

function trifaseOrcamentoSituacao(?object $decisao): string
{
    return match ($decisao->tipo ?? '') {
        'aprovar' => 'Aprovado', 'recusar' => 'Recusado', default => 'Aguardando resposta',
    };
}
