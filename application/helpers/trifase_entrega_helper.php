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

/** Consulta de retirada sem expor nome ou autorização do recebedor nas listas. */
function trifaseEntregaConsultaDisponivel(object $db): bool
{
    return trifaseInterfacePiloto() && trifaseEntregaHabilitada()
        && $db->table_exists('trifase_entregas_estado') && $db->table_exists('trifase_entregas_eventos');
}

function trifaseEntregaFiltrar(object $db, string $situacao): void
{
    if (! trifaseEntregaConsultaDisponivel($db) || ! in_array($situacao, ['todas', 'pendente', 'entregue'], true)) {
        return;
    }
    $db->where_in('os.status', ['Finalizado', 'Cancelado']);
    if ($situacao !== 'todas') {
        $existe = 'EXISTS (SELECT 1 FROM trifase_entregas_estado tfe WHERE tfe.os_id = os.idOs AND tfe.evento_id IS NOT NULL)';
        $db->where(($situacao === 'pendente' ? 'NOT ' : '') . $existe, null, false);
    }
}

function trifaseEntregaRotulo(object $os): string
{
    if (! empty($os->entregue_em)) {
        return 'Entregue em ' . date('d/m/Y \à\s H:i', strtotime($os->entregue_em));
    }
    return in_array($os->status, ['Finalizado', 'Cancelado'], true) ? 'Aguardando retirada' : '—';
}
