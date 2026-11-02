<?php

function trifaseEquipamentosHabilitados(): bool
{
    return filter_var($_ENV['TRIFASE_EQUIPAMENTOS_ENABLED'] ?? false, FILTER_VALIDATE_BOOLEAN);
}

/** Identificações históricas continuam protegidas quando a extensão está desligada. */
function trifaseEquipamentoDaOs(object $db, int $id): ?object
{
    return $db->table_exists('trifase_os_equipamentos')
        ? ($db->where('os_id', $id)->get('trifase_os_equipamentos', 1)->row() ?: null) : null;
}

/** Alteração de cliente não transfere silenciosamente a unidade física. */
function trifaseEquipamentoClienteValido(object $db, int $osId, int $clienteId): bool
{
    $vinculo = trifaseEquipamentoDaOs($db, $osId);
    if ($vinculo === null) {
        return true;
    }
    $unidade = $db->where('id', (int) $vinculo->equipamento_id)->get('trifase_equipamentos', 1)->row();
    return $unidade !== null && (int) $unidade->cliente_id === $clienteId;
}

/** Usado só em documentos privados; não amplia a projeção do link público. */
function trifaseEquipamentoTextoDaOs(object $db, int $osId, string $descricao): string
{
    $vinculo = trifaseEquipamentoDaOs($db, $osId);
    if ($vinculo === null) {
        return $descricao;
    }
    $linhas = [$descricao, 'Marca: ' . $vinculo->marca, 'Modelo: ' . $vinculo->modelo];
    foreach (['selo' => 'Selo', 'serie' => 'Série', 'imei' => 'IMEI'] as $campo => $rotulo) {
        if ($vinculo->$campo !== '') {
            $linhas[] = $rotulo . ': ' . $vinculo->$campo;
        }
    }
    return implode("\n", $linhas);
}
