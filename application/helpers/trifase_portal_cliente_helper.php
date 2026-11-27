<?php

defined('BASEPATH') or exit('No direct script access allowed');

/** Filtros comuns aos portais: nenhuma obrigação não significa paga. */
function trifasePortalFiltrar(array $ordens, string $filtro): array
{
    return array_values(array_filter($ordens, static function ($ordem) use ($filtro): bool {
        $financeiro = $ordem->financeiro ?? null;
        return match ($filtro) {
            'pago' => $financeiro !== null && $financeiro['situacao'] === 'Quitada',
            'pendente' => $financeiro !== null && $financeiro['saldo_c'] > 0,
            'entregue' => (bool) $ordem->entregue,
            'nao-entregue' => ! $ordem->entregue,
            default => true,
        };
    }));
}
