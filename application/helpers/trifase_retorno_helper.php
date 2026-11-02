<?php

function trifaseRetornoHabilitado(): bool
{
    return filter_var($_ENV['TRIFASE_RETORNOS_ENABLED'] ?? false, FILTER_VALIDATE_BOOLEAN);
}

function trifaseRetornoDaOs(object $db, int $id): ?object
{
    return $db->table_exists('trifase_garantia_retornos') ? ($db->where('os_id', $id)->get('trifase_garantia_retornos', 1)->row() ?: null) : null;
}

function trifaseRetornoCobertura(?object $evento): string
{
    return match ($evento->cobertura ?? '') {
        'coberto' => 'Coberto', 'nao_coberto' => 'Não coberto', default => 'Em avaliação'
    };
}

function trifaseRetornoSolucoes(): array
{
    return ['' => 'Ainda não definida', 'reparo_sem_cobranca' => 'Reparo sem cobrança', 'novo_orcamento' => 'Novo orçamento', 'troca' => 'Troca', 'devolucao_valor' => 'Devolução do valor — decisão, sem executar pagamento'];
}

/** Mantém a origem encerrada mesmo quando a apresentação do módulo é desligada. */
function trifaseRetornoTemDerivados(object $db, int $id): bool
{
    return $db->table_exists('trifase_garantia_retornos')
        && $db->group_start()->where('origem_id', $id)->or_where('anterior_id', $id)->group_end()->count_all_results('trifase_garantia_retornos') > 0;
}
