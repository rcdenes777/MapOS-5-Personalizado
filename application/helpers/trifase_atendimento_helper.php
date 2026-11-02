<?php

function trifaseAtendimentoHabilitado(): bool
{
    return filter_var($_ENV['TRIFASE_ATENDIMENTOS_ENABLED'] ?? false, FILTER_VALIDATE_BOOLEAN);
}

/** Histórico continua sendo referência mesmo com a função desligada. */
function trifaseAtendimentoDaOs(object $db, int $os): ?object
{
    return $db->table_exists('trifase_atendimentos') ? ($db->where('os_id', $os)->get('trifase_atendimentos', 1)->row() ?: null) : null;
}
