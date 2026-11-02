<?php
function trifaseGarantiaOperacoesHabilitadas(): bool
{
    return filter_var($_ENV['TRIFASE_GARANTIA_OPERACOES_ENABLED'] ?? false, FILTER_VALIDATE_BOOLEAN);
}
function trifaseGarantiaTroca(object $db, int $os): ?object
{
    return $db->table_exists('trifase_garantia_trocas') ? ($db->where('os_id', $os)->get('trifase_garantia_trocas', 1)->row() ?: null) : null;
}
function trifaseGarantiaUnidadeSubstituida(object $db, int $id): ?object
{
    return $db->table_exists('trifase_garantia_trocas') ? ($db->where('antiga_id', $id)->get('trifase_garantia_trocas', 1)->row() ?: null) : null;
}
function trifaseGarantiaCreditos(object $db, int $origem): array
{
    $r = ['reembolsado_c' => 0, 'abatimento_garantia_c' => 0];
    if ($db->table_exists('trifase_garantia_reembolsos')) {
        foreach ($db->where('origem_id', $origem)->where('cancelado_id', null)->get('trifase_garantia_reembolsos')->result() as $e) {
            $r['reembolsado_c'] += (int) $e->valor_c;
            $r['abatimento_garantia_c'] += (int) $e->credito_c;
        }
    }
    return $r;
}
/** Preserva total e recebimentos originais; mostra obrigação/caixa líquidos dos eventos. */
function trifaseGarantiaResumo(object $db, int $origem, int $total, int $recebido, ?array $creditos = null): array
{
    $c = $creditos ?? trifaseGarantiaCreditos($db, $origem);
    $liquido = $total - $c['abatimento_garantia_c'];
    $retido = $recebido - $c['reembolsado_c'];
    if ($c['reembolsado_c'] === 0 && $c['abatimento_garantia_c'] === 0) {
        return ['total_c' => $total, 'recebido_c' => $recebido, 'saldo_c' => $total - $recebido, 'situacao' => $recebido === 0 ? 'Pendente' : ($recebido === $total ? 'Quitado' : 'Parcialmente pago')];
    }
    return ['total_c' => $liquido, 'recebido_c' => $retido, 'saldo_c' => $liquido - $retido,
        'situacao' => $liquido === 0 && $c['abatimento_garantia_c'] > 0 ? ($c['reembolsado_c'] > 0 ? 'Reembolsado' : 'Encerrado por garantia') : ($retido === 0 ? 'Pendente' : ($retido === $liquido ? 'Quitado' : 'Parcialmente pago'))]
        + $c + ['total_original_c' => $total, 'recebido_original_c' => $recebido];
}
/** Não depende da flag: registros financeiros continuam protegidos quando a tela é desligada. */
function trifaseGarantiaResolucaoExecutada(object $db, int $os): bool
{
    return trifaseGarantiaTroca($db, $os) !== null || ($db->table_exists('trifase_garantia_reembolsos') && $db->where('os_id', $os)->where('cancelado_id', null)->count_all_results('trifase_garantia_reembolsos') > 0);
}

/** Cadeia privada de substituições, sempre sob a mesma origem. */
function trifaseGarantiaMesmaLinhagem(object $db, int $original, int $atual, int $origem): bool
{
    $vistos = [];
    while ($original !== $atual) {
        if (isset($vistos[$original])) {
            return false;
        }
        $vistos[$original] = true;
        $t = trifaseGarantiaUnidadeSubstituida($db, $original);
        if (! $t || (int) $t->origem_id !== $origem) {
            return false;
        }
        $original = (int) $t->nova_id;
    }
    return true;
}
function trifaseGarantiaEquipamentoEntrega(object $db, int $os, string $padrao): string
{
    $t = trifaseGarantiaTroca($db, $os);
    if (! $t) {
        return $padrao;
    }
    $d = json_decode($t->identificacao, true, 512, JSON_THROW_ON_ERROR);
    return 'Substituta em garantia · ' . implode(' · ', array_filter([$d['tipo'], $d['marca'], $d['modelo'], $d['selo'] ? 'Selo ' . $d['selo'] : '', $d['serie'] ? 'Série ' . $d['serie'] : '', $d['imei'] ? 'IMEI ' . $d['imei'] : '']));
}
