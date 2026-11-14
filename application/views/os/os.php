<?php
/**
 * Listagem de ordens de serviço (#2842), no padrão das listagens da v5 (#2852,
 * ver views/clientes/clientes.php): filtros em GET, data-table que vira
 * cartões abaixo de 640px, empty-state para "nada cadastrado" e "nada
 * encontrado", paginação que mantém os filtros, "Nova OS" na topbar e exclusão
 * com um modal-confirm só, preenchido pelo gatilho da linha (data-valor-*).
 *
 * @var list<object>          $results
 * @var array<string, string> $filtros
 * @var int                   $total
 * @var bool                  $status_ocultos  Sem filtro, só os status marcados em Configurações aparecem
 * @var bool                  $controle_editos OS faturada/cancelada continua editável
 * @var array                 $paginacao
 * @var array{adicionar: bool, editar: bool, excluir: bool} $pode
 */
$temFiltro = $filtros !== [];
$contextoFinanceiro = $contextoFinanceiro ?? false;
$urlLista = site_url($contextoFinanceiro ? 'financeiro/ordens' : 'os');
$clienteComLink = ! $contextoFinanceiro || ($listaVerCliente ?? false);
$filtrarFilas = ! empty($listaFilas);
$filtrarFinanceiro = $contextoFinanceiro && ($trifase_ui_piloto ?? false) && ($listaVerFinanceiro ?? false) && ($listaFinanceiroHabilitado ?? false);
$filtrosMoveis = ! $contextoFinanceiro;
$andamentos = osOpcoesAndamento();
$filtrosAtivos = array_filter([
    ($andamentos[$filtros['status'] ?? ''] ?? ''),
    ($listaEntregaHabilitada ?? false) ? (['pendente' => 'Aguardando retirada', 'entregue' => 'Entregues'][$filtros['entrega'] ?? ''] ?? '') : '',
    $listaFilas[$filtros['fila'] ?? ''] ?? '',
    empty($filtros['de']) ? '' : 'Entrada desde ' . dataBr($filtros['de']),
    empty($filtros['ate']) ? '' : 'Previsão até ' . dataBr($filtros['ate']),
]);
$cancelamentosPendentes = $cancelamentosPendentes ?? [];
$mapaCancelamentosPendentes = [];
foreach ($cancelamentosPendentes as $cp) {
    $mapaCancelamentosPendentes[(int) $cp['os_id']] = $cp;
}

$colunas = [
    ['key' => 'idOs', 'label' => 'Nº', 'align' => 'right', 'nowrap' => true],
    ['label' => 'Cliente', 'class' => 'min-w-40', 'render' => fn ($o) => $o->nomeCliente !== null
        ? ($clienteComLink ? component('link', ['label' => $o->nomeCliente, 'href' => site_url('clientes/visualizar/' . $o->clientes_id), 'class' => 'font-medium']) : (string) $o->nomeCliente)
        : 'Cliente removido'],
    // A descrição pode ter HTML (vinha do editor); aqui só um resumo em texto.
    ['label' => 'Equipamento', 'hide_until' => 'lg', 'class' => 'max-w-64', 'render' => fn ($o) => osTextoCurto($o->descricaoProduto, 60)],
    ['key' => 'responsavel', 'label' => 'Responsável', 'nowrap' => true, 'hide_until' => '2xl'],
    ['label' => 'Entrada', 'align' => 'right', 'nowrap' => true, 'hide_until' => 'xl', 'render' => fn ($o) => dataBr($o->dataInicial)],
    ['label' => 'Previsão', 'align' => 'right', 'nowrap' => true, 'hide_until' => 'xl', 'render' => fn ($o) => dataBr($o->dataFinal)],
    ['label' => ($trifase_ui_piloto ?? false) ? 'Andamento do serviço' : 'Status', 'nowrap' => true, 'render' => function ($o) use ($contextoFinanceiro, $mapaCancelamentosPendentes) {
        $pill = component('pill-status', osStatusPill($o->status));
        if ($contextoFinanceiro && isset($mapaCancelamentosPendentes[(int) $o->idOs]) && $o->status !== 'Cancelado') {
            return new HtmlSeguro('<div class="flex flex-col items-start gap-1">' . $pill . component('pill-status', ['label' => 'Cancelamento solicitado — aguardando análise financeira', 'variant' => 'warning', 'class' => 'max-w-full whitespace-normal']) . '</div>');
        }
        return $pill;
    }],
    ...(! $contextoFinanceiro && ($listaEntregaHabilitada ?? false) ? [['label' => 'Entrega', 'render' => fn ($o) => trifaseEntregaRotulo($o)]] : []),
    ...(($contextoFinanceiro ? ($listaVerFinanceiro ?? false) : ($listaVerTotal ?? false)) ? [
        ['label' => 'Total', 'align' => 'right', 'nowrap' => true, 'render' => fn ($o) => dinheiro($o->total)],
    ] : []),
    ['label' => 'Ações', 'align' => 'right', 'nowrap' => true, 'render' => function ($o) use ($pode, $controle_editos, $contextoFinanceiro, $mapaCancelamentosPendentes) {
        $numero = 'OS ' . $o->idOs;
        $editavel = osEditavel($o, $pode['editar'], $controle_editos);
        $acoes = [
            component('button', ['label' => 'Ver ' . $numero, 'icon' => 'eye', 'icon_only' => true, 'variant' => 'ghost', 'size' => 'sm', 'href' => site_url('os/visualizar/' . $o->idOs)]),
        ];
        if ($contextoFinanceiro && isset($mapaCancelamentosPendentes[(int) $o->idOs])) {
            $acoes[] = component('button', ['label' => 'Analisar cancelamento', 'variant' => 'outline', 'size' => 'sm', 'href' => site_url('trifase_cancelamentos/visualizar/' . (int) $o->idOs)]);
        }
        if ($contextoFinanceiro) {
            $acoes[] = component('button', ['label' => 'Recebimentos da ' . $numero, 'icon' => 'circle-dollar-sign', 'icon_only' => true, 'variant' => 'ghost', 'size' => 'sm', 'href' => site_url('trifase_financeiro/visualizar/' . (int) $o->idOs)]);
        }
        if ($editavel) {
            $acoes[] = component('button', ['label' => 'Editar ' . $numero, 'icon' => 'pencil', 'icon_only' => true, 'variant' => 'ghost', 'size' => 'sm', 'href' => site_url('os/editar/' . $o->idOs)]);
        }
        // Como na v4: excluir exige dOs e uma OS que ainda pode ser editada.
        if ($pode['excluir'] && $editavel) {
            $acoes[] = component('button', ['label' => 'Excluir ' . $numero, 'icon' => 'trash-2', 'icon_only' => true, 'variant' => 'ghost', 'size' => 'sm', 'class' => 'hover:text-danger-ink', 'attrs' => [
                'data-modal-abrir' => 'excluir-os',
                'data-valor-id' => (string) $o->idOs,
                'data-valor-numero' => (string) $o->idOs,
                'data-valor-cliente' => (string) ($o->nomeCliente ?? 'cliente removido'),
            ]]);
        }

        return $acoes;
    }],
];

if ($trifase_ui_piloto ?? false) {
    $adaptadas = [];
    foreach ($colunas as $coluna) {
        // Prioriza os valores e ações; o responsável continua no detalhe da OS.
        if ($filtrarFinanceiro && $coluna['label'] === 'Responsável') {
            continue;
        }
        if ($contextoFinanceiro && $coluna['label'] === 'Equipamento') {
            continue;
        }
        if ($coluna['label'] === 'Total') {
            if (! $contextoFinanceiro) {
                continue;
            }
            if ($listaVerFinanceiro ?? false) {
                // A obrigação é a fonte do total das OS geridas, inclusive após
                // abatimentos; a soma nativa dos itens fica para as demais OS.
                $coluna['render'] = static function ($o) use ($listaFinanceiro, $listaFinanceiroHabilitado) {
                    $resumo = $listaFinanceiroHabilitado ? ($listaFinanceiro[(int) $o->idOs] ?? null) : null;

                    return dinheiro($resumo === null ? $o->total : $resumo['total_c'] / 100);
                };
                $adaptadas[] = $coluna;
                if ($listaFinanceiroHabilitado ?? false) {
                    $adaptadas[] = ['label' => 'Pagamento', 'render' => static function ($o) use ($listaFinanceiro) {
                        $f = $listaFinanceiro[(int) $o->idOs] ?? null;
                        if ($f === null) {
                            return (int) $o->faturado === 1 ? 'Faturamento anterior' : 'Não faturada';
                        }
                        return component('pill-status', ['label' => $f['situacao'], 'variant' => $f['saldo_c'] === 0 ? 'success' : 'warning']);
                    }];
                    $adaptadas[] = ['label' => 'Acerto financeiro', 'align' => 'right', 'render' => static function ($o) use ($listaFinanceiro, $mapaCancelamentosPendentes) {
                        if (isset($mapaCancelamentosPendentes[(int) $o->idOs])) {
                            return 'Aguardando conferência';
                        }
                        $f = $listaFinanceiro[(int) $o->idOs] ?? null;
                        if ($f === null) {
                            return 'Não apurado';
                        }
                        $saldo = (int) $f['saldo_c'];
                        return ($saldo > 0 ? 'A receber: ' : ($saldo < 0 ? 'A devolver: ' : 'Sem pendência: ')) . dinheiro(abs($saldo) / 100);
                    }];
                }
            }
            continue;
        }
        if ($filtrarFinanceiro && in_array($coluna['label'], ['Entrada', 'Previsão', 'Equipamento'], true)) {
            $coluna['hide_until'] = '2xl';
        }
        $coluna['label'] = match ($coluna['label']) {
            'Status' => 'Andamento',
            'Andamento do serviço' => $filtrarFinanceiro ? 'Andamento' : 'Andamento do serviço',
            default => $coluna['label']
        };
        $adaptadas[] = $coluna;
    }
    $colunas = $adaptadas;
}

$vazio = $temFiltro
    ? component('empty-state', [
        'title' => 'Nenhuma OS encontrada',
        'message' => 'Nada corresponde aos filtros. Confira a busca ou limpe os filtros.',
        'icon' => 'search-x',
        'action' => component('button', ['label' => 'Limpar filtros', 'variant' => 'outline', 'href' => $urlLista]),
        'class' => 'border-0',
    ])
    : component('empty-state', [
        'title' => $status_ocultos ? 'Nenhuma OS nos status exibidos' : 'Nenhuma OS cadastrada',
        'message' => $status_ocultos
            ? 'A listagem mostra só os status marcados em Configurações. Filtre por outro status para ver as demais.'
            : 'As ordens de serviço cadastradas aparecem aqui.',
        'icon' => 'file-text',
        'action' => $pode['adicionar'] ? component('button', ['label' => 'Cadastrar OS', 'icon' => 'plus', 'variant' => 'outline', 'href' => site_url('os/adicionar')]) : null,
        'class' => 'border-0',
    ]);

$resumo = ($total === 1 ? '1 ordem de serviço' : number_format($total, 0, ',', '.') . ' ordens de serviço')
    . ($temFiltro ? ($total === 1 ? ' encontrada' : ' encontradas') . ' com os filtros' : '')
    . ($status_ocultos ? ' nos status marcados em Configurações' : '');
?>
<div class="flex flex-col gap-4 pt-2 pb-8">
    <header>
        <h1 class="font-display text-heading-xl text-text"><?= e($contextoFinanceiro ? 'Financeiro das OS' : 'Ordens de serviço') ?></h1>
        <p class="text-caption text-muted" aria-live="polite"><?= e($resumo) ?></p>
    </header>

    <?php if ($contextoFinanceiro) { ?>
        <?php if ($cancelamentosPendentes !== []) { ?>
            <section class="rounded-xl border border-border bg-surface p-4" aria-labelledby="fila-cancelamentos-pendentes">
                <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h2 id="fila-cancelamentos-pendentes" class="text-heading-sm text-text">Cancelamentos pendentes</h2>
                        <p class="text-caption text-muted">Cancelamento solicitado — aguardando análise financeira. A OS só fica Cancelada depois da conferência final.</p>
                    </div>
                    <?= component('pill-status', ['label' => count($cancelamentosPendentes) . (count($cancelamentosPendentes) === 1 ? ' pendente' : ' pendentes'), 'variant' => 'warning']) ?>
                </div>
                <?= component('data-table', [
                    'caption' => 'Cancelamentos pendentes de análise financeira',
                    'dense' => true,
                    'rows' => $cancelamentosPendentes,
                    'empty' => 'Nenhum cancelamento pendente.',
                    'columns' => [
                        ['label' => 'OS', 'align' => 'right', 'nowrap' => true, 'render' => fn ($c) => '#' . (int) $c['os_id']],
                        ['label' => 'Cliente', 'render' => fn ($c) => $clienteComLink && $c['clientes_id'] > 0
                            ? component('link', ['label' => $c['nomeCliente'], 'href' => site_url('clientes/visualizar/' . $c['clientes_id']), 'class' => 'font-medium'])
                            : $c['nomeCliente']],
                        ['label' => 'Conferência técnica', 'nowrap' => true, 'render' => fn ($c) => component('pill-status', $c['tecnica_concluida']
                            ? ['label' => 'Concluída', 'variant' => 'success']
                            : ['label' => 'Pendente', 'variant' => 'warning'])],
                        ['label' => 'Total', 'align' => 'right', 'nowrap' => true, 'render' => fn ($c) => $c['total_c'] === null ? 'Não faturada' : dinheiro($c['total_c'] / 100)],
                        ['label' => 'Recebido', 'align' => 'right', 'nowrap' => true, 'render' => fn ($c) => $c['recebido_c'] === null ? 'R$ 0,00' : dinheiro($c['recebido_c'] / 100)],
                        ['label' => 'Já devolvido', 'align' => 'right', 'nowrap' => true, 'render' => fn ($c) => $c['devolvido_c'] === null ? 'R$ 0,00' : dinheiro($c['devolvido_c'] / 100)],
                        ['label' => 'Saldo', 'align' => 'right', 'nowrap' => true, 'render' => fn ($c) => $c['saldo_c'] === null ? 'R$ 0,00' : dinheiro($c['saldo_c'] / 100)],
                        ['label' => 'Ações', 'align' => 'right', 'nowrap' => true, 'render' => fn ($c) => component('button', ['label' => 'Analisar cancelamento', 'variant' => 'outline', 'size' => 'sm', 'href' => site_url('trifase_cancelamentos/visualizar/' . (int) $c['os_id'])])],
                    ],
                ]) ?>
            </section>
        <?php } ?>
    <?php } ?>

    <form method="get" action="<?= e($urlLista) ?>" role="search" aria-label="Filtrar ordens de serviço" class="grid items-end gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-2 <?= e(($filtrarFinanceiro || $filtrarFilas) ? 'lg:grid-cols-3 xl:grid-cols-4' : 'lg:grid-cols-[minmax(0,1fr)_12rem_10rem_10rem_auto]') ?>">
        <?= component('input', [
            'name' => 'pesquisa',
            'label' => 'Buscar',
            'type' => 'search',
            'value' => $filtros['pesquisa'] ?? null,
            'placeholder' => 'Nº, cliente, documento ou equipamento',
            'attrs' => ['maxlength' => 100],
        ]) ?>
        <?php if (($contextoFinanceiro ?? false) && $filtrarFinanceiro) { ?>
            <?php
            $historicoFinanceiro = ($filtros['pendencia'] ?? '') === 'nenhuma';
            $opcoesFinanceiras = ['receber' => 'A receber', 'devolver' => 'A devolver', 'cancelamento' => 'Aguardando análise', 'nao_apurado' => 'Não apurado'];
            ?>
            <?php if ($historicoFinanceiro) { ?>
                <input type="hidden" name="historico" value="1">
                <p class="text-label-md">Histórico — casos sem pendência</p>
            <?php } else { ?>
                <?= component('select', ['name' => 'situacao', 'label' => 'Situação financeira', 'placeholder' => 'Todas as pendências', 'options' => $opcoesFinanceiras, 'selected' => $filtros['pendencia'] ?? '']) ?>
            <?php } ?>
            <?= component('input', ['name' => 'vencimento_de', 'label' => 'Vencimento a partir de', 'type' => 'date', 'value' => $filtros['vencimento_de'] ?? null]) ?>
            <?= component('input', ['name' => 'vencimento_ate', 'label' => 'Vencimento até', 'type' => 'date', 'value' => $filtros['vencimento_ate'] ?? null]) ?>
        <?php } else { ?>
        <?php if ($filtrosMoveis) { ?>
            <details class="os-filtros-complementares min-w-0">
                <summary class="cursor-pointer text-label-md text-text">Mais filtros<span data-os-filtros-ativos class="block text-caption font-normal text-muted"><?= e(implode(' · ', $filtrosAtivos)) ?></span></summary>
                <div class="mt-3 grid gap-3">
        <?php } ?>
        <?= component('select', [
            'name' => 'status',
            'label' => ($trifase_ui_piloto ?? false) ? 'Andamento do serviço' : 'Status',
            'placeholder' => 'Todos',
            'options' => $andamentos,
            'selected' => $filtros['status'] ?? null,
        ]) ?>
        <?php if ($listaEntregaHabilitada ?? false) { ?>
            <?= component('select', ['name' => 'entrega', 'label' => 'Entrega do equipamento', 'placeholder' => 'Todas', 'options' => ['pendente' => 'Aguardando retirada', 'entregue' => 'Entregues'], 'selected' => $filtros['entrega'] ?? null]) ?>
        <?php } ?>
        <?php if ($filtrarFilas) { ?>
            <?= component('select', ['name' => 'fila', 'label' => 'Fila de trabalho', 'placeholder' => 'Todas', 'options' => $listaFilas, 'selected' => $filtros['fila'] ?? null]) ?>
        <?php } ?>
        <?php if ($filtrarFinanceiro) { ?>
            <?= component('select', ['name' => 'financeiro', 'label' => 'Situação financeira', 'placeholder' => 'Todas', 'options' => Trifase_financeiro_busca::OPCOES, 'selected' => $filtros['financeiro'] ?? null]) ?>
            <?= component('select', ['name' => 'saldo', 'label' => 'Saldo a receber', 'placeholder' => 'Todos', 'options' => ['pendente' => 'Somente com saldo'], 'selected' => $filtros['saldo'] ?? null]) ?>
        <?php } ?>
        <?= component('input', [
            'name' => 'de',
            'label' => 'Entrada a partir de',
            'type' => 'date',
            'value' => $filtros['de'] ?? null,
        ]) ?>
        <?= component('input', [
            'name' => 'ate',
            'label' => 'Previsão até',
            'type' => 'date',
            'value' => $filtros['ate'] ?? null,
        ]) ?>
        <?php if ($filtrosMoveis) { ?>
                </div>
            </details>
        <?php } ?>
        <?php } ?>
        <div class="flex gap-2">
            <?= component('button', ['label' => 'Filtrar', 'icon' => 'search', 'variant' => 'outline', 'type' => 'submit']) ?>
            <div data-listagem-limpar<?= e($temFiltro ? '' : ' hidden') ?>>
                <?= component('button', ['label' => 'Limpar', 'icon' => 'x', 'variant' => 'ghost', 'href' => $urlLista]) ?>
            </div>
        </div>
    </form>

    <?php if (($contextoFinanceiro ?? false) && $filtrarFinanceiro) { ?>
        <?= component('button', ['label' => ($filtros['pendencia'] ?? '') === 'nenhuma' ? 'Voltar às pendências' : 'Ver histórico', 'variant' => 'outline', 'href' => $urlLista . (($filtros['pendencia'] ?? '') === 'nenhuma' ? '' : '?historico=1')]) ?>
    <?php } ?>

    <?php if ($filtrarFinanceiro) { ?>
        <p class="text-caption text-muted">Saldo considera cobranças registradas, estornos e reembolsos. Faturamento anterior tem saldo não apurado. Os filtros financeiros pesquisam todos os andamentos, salvo quando você escolhe um.</p>
    <?php } ?>

    <?= component('data-table', [
        'columns' => $colunas,
        'dense' => $filtrarFinanceiro,
        'rows' => $results,
        'empty' => $vazio,
        'caption' => 'Ordens de serviço',
    ]) ?>

    <?= component('pagination', $paginacao) ?>
</div>

<?php if ($pode['excluir']) { ?>
    <form id="form-excluir-os" method="post" action="<?= e(site_url('os/excluir') . listagemQuery($filtros)) ?>" hidden>
        <input type="hidden" name="<?= e($this->security->get_csrf_token_name()) ?>" value="<?= e($this->security->get_csrf_hash()) ?>">
        <input type="hidden" name="id" value="" data-modal-de="excluir-os" data-modal-valor="id">
    </form>
    <?= component('modal-confirm', [
        'id' => 'excluir-os',
        'title' => 'Excluir OS?',
        // Nº e cliente entram pelo modal.js (textContent) a partir do
        // data-valor-* do botão da linha; aqui só os marcadores vazios.
        'message' => [
            'A OS ',
            new HtmlSeguro('<strong class="font-semibold text-text" data-modal-valor="numero"></strong>'),
            ' de ',
            new HtmlSeguro('<strong class="font-semibold text-text" data-modal-valor="cliente"></strong>'),
            ' será removida com os produtos, serviços, anexos e anotações. O estoque dos produtos volta e a fatura, se houver, é excluída. Essa ação não pode ser desfeita.',
        ],
        'confirm_label' => 'Excluir',
        'confirm_attrs' => ['form' => 'form-excluir-os'],
    ]) ?>
<?php } ?>
