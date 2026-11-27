<?php
/**
 * Ordens de serviço do cliente (#2848), no padrão das listagens (#2852):
 * data-table que vira cartões abaixo de 640px, paginação do componente e
 * "Abrir OS" como ação principal, na Top Nav.
 *
 * @var list<object> $results
 * @var int          $total
 * @var array        $paginacao
 */
?>
<div class="flex flex-col gap-4">
    <header>
        <h1 class="font-display text-heading-xl text-text">Ordens de serviço</h1>
        <p class="text-caption text-muted" aria-live="polite"><?= e($total === 1 ? '1 ordem de serviço' : number_format($total, 0, ',', '.') . ' ordens de serviço') ?></p>
    </header>

    <?php if (($totaisFinanceiros ?? null) !== null) { ?>
        <section class="rounded-card border border-border bg-surface p-4" aria-label="Resumo financeiro das ordens">
            <h2 class="text-heading-sm">Resumo financeiro das ordens</h2>
            <dl class="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
                <?php foreach (['total_c' => 'Total cobrado', 'pago_c' => 'Total pago', 'saldo_c' => 'Saldo a pagar'] as $campo => $rotulo) { ?>
                    <div><dt class="text-caption text-muted"><?= e($rotulo) ?></dt><dd><?= e('R$ ' . number_format($totaisFinanceiros[$campo] / 100, 2, ',', '.')) ?></dd></div>
                <?php } ?>
            </dl>
            <p class="mt-3 text-caption text-muted">Valores incluem todas as OS com cobrança formalizada, em todas as páginas.</p>
        </section>
    <?php } ?>
    <?php if ($entregasDisponiveis ?? false) { ?>
        <nav class="flex flex-wrap gap-3" aria-label="Filtrar ordens">
            <?php
            $filtrosOs = ['' => 'Todas'];
            if ($financeiroVisivel ?? false) {
                $filtrosOs += ['pendente' => 'A pagar', 'pago' => 'Pagas'];
            }
            $filtrosOs += ['entregue' => 'Entregues', 'nao-entregue' => 'Não entregues'];
            foreach ($filtrosOs as $valor => $rotulo) { ?>
                <a class="inline-flex min-h-11 items-center rounded-md px-2 underline <?= e(($filtro ?? '') === $valor ? 'bg-primary-tint font-semibold' : '') ?>" href="<?= e(site_url('mine/os') . ($valor === '' ? '' : '?filtro=' . rawurlencode($valor))) ?>" <?= ($filtro ?? '') === $valor ? 'aria-current="page"' : '' ?>><?= e($rotulo) ?></a>
            <?php } ?>
        </nav>
    <?php } ?>

    <?= component('data-table', [
        'columns' => conecteColunasOs(true, $financeiroVisivel ?? false, $entregasDisponiveis ?? false),
        'rows' => $results,
        'caption' => 'Ordens de serviço',
        'empty' => component('empty-state', [
            'title' => 'Nenhuma ordem de serviço ainda',
            'message' => 'Precisa de conserto ou manutenção? Abra uma OS e a assistência entra em contato.',
            'icon' => 'wrench',
            'action' => component('button', ['label' => 'Abrir OS', 'icon' => 'plus', 'variant' => 'outline', 'href' => site_url('mine/adicionarOs')]),
            'class' => 'border-0',
        ]),
    ]) ?>

    <?= component('pagination', $paginacao) ?>
</div>
