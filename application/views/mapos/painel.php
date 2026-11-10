<?php
/** Início operacional: filas de OS, agenda e avisos curtos conforme as permissões. */
$caixa = 'rounded-xl border border-border bg-surface p-4 sm:p-6';
$avisosPendencias = array_filter($avisos_pendencias ?? [], static fn ($permissao) => $pode[$permissao] ?? false, ARRAY_FILTER_USE_KEY);

// Cards clicáveis com acento de status (kpi-card, prop accent).
$kpis = [];
$filasClassicas = $pode['os'] ? ($operacional_classico ?? null) : null;
if ($pode['os'] && $filasClassicas === null) {
    $aguardando = (int) ($os_por_status['Aguardando Peças'] ?? 0);
    $kpis[] = [
        'label' => 'OS em andamento',
        'value' => painelSomar($os_por_status, PAINEL_OS_ANDAMENTO),
        'icon' => 'wrench',
        'accent' => 'progress',
        'href' => site_url('os'),
        'caption' => $aguardando === 0 ? 'Nenhuma aguardando peças' : $aguardando . ' aguardando peças',
    ];
    $kpis[] = [
        'label' => 'Orçamentos',
        'value' => painelSomar($os_por_status, PAINEL_OS_ORCAMENTO),
        'icon' => 'file-text',
        'accent' => 'info',
        'href' => site_url('os'),
        'caption' => 'Em orçamento ou negociação',
    ];
}
?>
<div class="flex flex-col gap-4 pt-2 pb-8" <?= js_module('painel/painel') ?>>
    <header class="flex flex-wrap items-start justify-between gap-3">
        <div>
            <h1 class="font-display text-heading-xl text-text">Painel</h1>
            <p class="text-caption text-muted"><?= e(ucfirst(painelDataPorExtenso($hoje))) ?></p>
        </div>
    </header>

    <?php if (! empty($avisos_sistema) || ! empty($instalador_no_servidor)) { ?>
        <details class="rounded-xl border border-border bg-surface px-4 py-3">
            <summary class="text-label-md">Avisos do sistema (<?= e(count($avisos_sistema ?? []) + (int) ! empty($instalador_no_servidor)) ?>)</summary>
            <div class="mt-3 grid gap-3">
                <?php foreach ($avisos_sistema ?? [] as $aviso) { ?>
                    <?= component('alert', ['variant' => 'warning', 'message' => $aviso]) ?>
                <?php } ?>
                <?php if (! empty($instalador_no_servidor)) { ?>
                    <?= component('alert', ['variant' => 'warning', 'message' => 'A pasta install ainda está no servidor. Ela já não funciona, mas apague-a do servidor para não deixar arquivos desnecessários expostos.']) ?>
                <?php } ?>
            </div>
        </details>
    <?php } ?>

    <?php if ($avisosPendencias !== []) { ?>
        <section aria-label="Precisa de atenção" class="rounded-xl border border-border bg-surface px-4 py-3">
            <h2 class="text-label-md">Precisa de atenção</h2>
            <ul class="mt-2 flex flex-wrap gap-x-6 gap-y-2">
                <?php foreach ($avisosPendencias as $aviso) { ?><li><?= component('link', $aviso) ?></li><?php } ?>
            </ul>
        </section>
    <?php } ?>

    <?php if ($filasClassicas !== null) {
        $this->load->view('trifase/painel-filas', ['resumoFilas' => $filasClassicas, 'lista_painel' => $lista_painel ?? null]);
    } ?>

    <?php if ($pode['os']) { ?>
        <div class="grid gap-4">
            <?php if (isset($lista_painel)) {
                $this->load->view('trifase/painel-lista', ['lista' => $lista_painel]);
            } else { ?>
            <section class="<?= e($caixa) ?> min-w-0" aria-labelledby="titulo-agenda">
                <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h2 id="titulo-agenda" class="text-heading-sm text-text">Agenda de entregas</h2>
                        <p class="text-caption text-muted">OS pela data final. Clique numa OS para ver os detalhes.</p>
                    </div>
                    <div class="sm:w-56">
                        <?= component('select', [
                            'name' => 'status',
                            'id' => 'agenda-status',
                            'label' => 'Status',
                            'placeholder' => 'Todos os status',
                            'options' => [
                                'Aberto' => 'Aberto',
                                'Orçamento' => 'Orçamento',
                                'Negociação' => 'Negociação',
                                'Aprovado' => 'Aprovado',
                                'Em Andamento' => 'Em Andamento',
                                'Aguardando Peças' => 'Aguardando Peças',
                                'Finalizado' => 'Finalizado',
                                'Orçamento recusado' => 'Orçamento recusado',
                                'Cancelado' => 'Cancelado',
                                'Faturado' => 'Faturado',
                            ],
                            'attrs' => ['data-agenda-status' => true],
                        ]) ?>
                    </div>
                </div>
                <div class="painel-agenda mt-4 min-h-96" data-agenda="<?= e(site_url('mapos/calendario')) ?>" aria-live="polite">
                    <p class="text-caption text-muted" data-agenda-carregando>Carregando a agenda…</p>
                </div>
            </section>

            <?php } ?>

        </div>
    <?php } ?>

    <?php if ($kpis !== []) { ?>
        <div class="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <?php foreach ($kpis as $kpi) { ?>
                <?= component('kpi-card', $kpi) ?>
            <?php } ?>
        </div>
    <?php } ?>

    <?php if ($pode === array_fill_keys(array_keys($pode), false)) { ?>
        <?= component('empty-state', ['title' => 'Bem-vindo ao Map-OS', 'message' => 'Seu usuário ainda não tem permissão para ver os módulos do painel. Fale com o administrador.', 'icon' => 'house']) ?>
    <?php } ?>
</div>

<?php if ($pode['os']) { ?>
    <?= component('modal', [
        'id' => 'agenda-os',
        'title' => 'OS',
        'size' => 'md',
        // Marcação estática; os dados entram por textContent (módulo
        // painel/painel). Um pill-status por status, escondidos: o módulo
        // mostra o da OS clicada.
        'body' => [
            new HtmlSeguro('<div class="flex flex-col gap-3"><div>'),
            array_map(static fn ($status) => component('pill-status', osStatusPill($status) + ['attrs' => ['data-agenda-pill' => $status, 'hidden' => true]]), array_keys(OS_STATUS_VARIANTES)),
            new HtmlSeguro('</div>'
            . '<dl class="grid gap-3 sm:grid-cols-2">'
            . '<div class="sm:col-span-2"><dt class="text-caption text-muted">Cliente</dt><dd class="text-body-md [overflow-wrap:anywhere] text-text" data-agenda-campo="cliente"></dd></div>'
            . '<div><dt class="text-caption text-muted">Entrada</dt><dd class="text-body-md tabular-nums text-text" data-agenda-campo="dataInicial"></dd></div>'
            . '<div><dt class="text-caption text-muted">Entrega</dt><dd class="text-body-md tabular-nums text-text" data-agenda-campo="dataFinal"></dd></div>'
            . '<div class="sm:col-span-2"><dt class="text-caption text-muted">Equipamento</dt><dd class="text-body-md [overflow-wrap:anywhere] text-text" data-agenda-campo="equipamento"></dd></div>'
            . ($pode['lancamentos'] ?
                '<div><dt class="text-caption text-muted">Total</dt><dd class="text-body-md tabular-nums text-text" data-agenda-campo="total"></dd></div>'
            . '<div><dt class="text-caption text-muted">Faturada</dt><dd class="text-body-md text-text" data-agenda-campo="faturado"></dd></div>' : '')
            . '</dl></div>'),
        ],
        'footer' => [
            component('button', ['label' => 'Fechar', 'variant' => 'ghost', 'attrs' => ['data-modal-fechar' => true]]),
            component('button', ['label' => 'Editar OS', 'icon' => 'pencil', 'variant' => 'outline', 'href' => site_url('os'), 'attrs' => ['data-agenda-link' => 'urlEditar', 'hidden' => true]]),
            component('button', ['label' => 'Ver OS', 'icon' => 'eye', 'variant' => 'outline', 'href' => site_url('os'), 'attrs' => ['data-agenda-link' => 'url']]),
        ],
    ]) ?>
<?php } ?>
