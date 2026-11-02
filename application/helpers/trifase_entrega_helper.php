<?php

function trifaseEntregaHabilitada(): bool
{
    return filter_var($_ENV['TRIFASE_ENTREGAS_ENABLED'] ?? false, FILTER_VALIDATE_BOOLEAN);
}

/** A proteção do histórico permanece mesmo com a extensão desligada. */
function trifaseEntregaTemHistorico(object $db, int $id): bool
{
    return $db->table_exists('trifase_entregas_eventos')
        && $db->where('os_id', $id)->count_all_results('trifase_entregas_eventos') > 0;
}
