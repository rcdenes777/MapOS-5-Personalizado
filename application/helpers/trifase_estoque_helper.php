<?php
function trifaseEstoqueHabilitado(): bool
{
    return filter_var($_ENV['TRIFASE_ESTOQUE_ENABLED'] ?? false, FILTER_VALIDATE_BOOLEAN);
}
