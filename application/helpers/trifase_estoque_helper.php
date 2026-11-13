<?php
function trifaseEstoqueHabilitado(): bool
{
    return filter_var($_ENV['TRIFASE_ESTOQUE_ENABLED'] ?? false, FILTER_VALIDATE_BOOLEAN);
}

function trifaseRazaoEstoquePorLinhaDisponivel($db): bool
{
    return $db->table_exists('trifase_estoque_eventos')
        && $db->field_exists('os_item_id', 'trifase_estoque_eventos');
}
