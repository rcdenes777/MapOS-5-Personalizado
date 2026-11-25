<?php
/**
 * Situação financeira visível ao cliente no link público da OS.
 * Somente total, pago, saldo e situação — sem custos, margens ou notas.
 *
 * @var array{total_c:int,pago_c:int,saldo_c:int,situacao:string,situacao_variant:string}|null $financeiro
 */
if (($financeiro ?? null) === null) {
    return;
}
?>
<section class="rounded-card border border-border bg-surface p-4" aria-labelledby="pagamento">
    <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 id="pagamento" class="text-heading-sm text-text">Pagamento</h2>
        <?= component('pill-status', ['label' => $financeiro['situacao'], 'variant' => $financeiro['situacao_variant']]) ?>
    </div>
    <dl class="mt-3 grid gap-3 sm:grid-cols-3">
        <div>
            <dt class="text-caption text-muted">Total cobrado</dt>
            <dd class="text-heading-sm text-text"><?= e(dinheiro($financeiro['total_c'] / 100)) ?></dd>
        </div>
        <div>
            <dt class="text-caption text-muted">Pago</dt>
            <dd class="text-heading-sm text-text"><?= e(dinheiro($financeiro['pago_c'] / 100)) ?></dd>
        </div>
        <div>
            <dt class="text-caption text-muted">Saldo a pagar</dt>
            <dd class="text-heading-sm text-text"><?= e(dinheiro($financeiro['saldo_c'] / 100)) ?></dd>
        </div>
    </dl>
</section>
