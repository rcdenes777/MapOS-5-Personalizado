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


function trifaseValidarMudancaDeAndamento(object $db, object $os, string $status): void
{
    if ($status === $os->status) {
        return;
    }
    if ($status === 'Orçamento recusado') {
        throw new DomainException('Registre a resposta do cliente na versão do orçamento.');
    }
    if ($status === 'Finalizado' && $db->table_exists('trifase_cancelamentos')) {
        $pedido = $db->select('tipo')->where('os_id', (int) $os->idOs)
            ->where_in('tipo', ['solicitar', 'retirar', 'confirmar'])->order_by('id', 'desc')->get('trifase_cancelamentos', 1)->row();
        if (($pedido->tipo ?? '') === 'solicitar') {
            throw new DomainException('Resolva ou retire o pedido de cancelamento antes de finalizar a OS.');
        }
    }
}
