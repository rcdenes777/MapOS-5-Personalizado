<?php

require_once APPPATH . 'helpers/trifase_equipamento_helper.php';

function trifaseEntregaHabilitada(): bool
{
    return filter_var($_ENV['TRIFASE_ENTREGAS_ENABLED'] ?? false, FILTER_VALIDATE_BOOLEAN);
}

/** Situação de entrega só é apresentada com o módulo ativo e migrado. */
function trifaseEntregasDisponiveis(object $db): bool
{
    return trifaseEntregaHabilitada()
        && $db->table_exists('trifase_entregas_estado')
        && $db->table_exists('trifase_entregas_eventos');
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

function trifaseEntregaItensSugeridos(object $db, int $osId, string $descricao): string
{
    // Lazy: CI_Model só existe depois que o controller carrega o primeiro model.
    require_once APPPATH . 'models/Trifase_equipamento_model.php';
    $modelo = new Trifase_equipamento_model();
    $modelo->db = $db;
    $vinculo = $modelo->porOs($osId);
    if ($vinculo === null) {
        return mb_substr($descricao, 0, 10000);
    }
    $linhas = [$descricao, 'Marca: ' . $vinculo->marca, 'Modelo: ' . $vinculo->modelo];
    foreach (['selo' => 'Selo', 'serie' => 'Série', 'imei' => 'IMEI'] as $campo => $rotulo) {
        if ($vinculo->$campo !== '') {
            $linhas[] = $rotulo . ': ' . $vinculo->$campo;
        }
    }
    $itens = trim((string) $vinculo->itens_recebidos);
    $texto = implode("\n", array_filter($linhas, static fn (string $linha): bool => trim($linha) !== ''));
    if ($itens !== '') {
        $texto = rtrim($texto) . "\nItens e acessórios:\n" . $itens;
    }
    return mb_substr($texto, 0, 10000);
}

function trifaseEntregaRotulo(object $os): string
{
    if (! empty($os->entregue_em)) {
        return 'Entregue em ' . date('d/m/Y', strtotime($os->entregue_em));
    }
    return in_array($os->status, ['Finalizado', 'Cancelado'], true) ? 'Aguardando retirada' : '—';
}
