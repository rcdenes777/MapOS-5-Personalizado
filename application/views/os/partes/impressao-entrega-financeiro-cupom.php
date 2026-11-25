<?php
/**
 * Entrega e situação financeira no cupom de 80 mm.
 * Somente total, pago, saldo e situação — sem custos ou notas internas.
 *
 * @var bool        $mostrarEntrega
 * @var object|null $entregaImpressao
 * @var array|null  $financeiroImpressao
 */
$mostrarEntrega = $mostrarEntrega ?? false;
$entregaImpressao = $entregaImpressao ?? null;
$financeiroImpressao = $financeiroImpressao ?? null;
?>
<?php if ($mostrarEntrega) { ?>
    <div class="mt-1 text-xs"><b>Entrega:</b> <?= e($entregaImpressao !== null ? date('d/m/Y', strtotime($entregaImpressao->entregue_em)) : 'Não registrada') ?></div>
<?php } ?>
<?php if ($financeiroImpressao !== null) { ?>
    <div class="mt-1 text-xs"><b>Total cobrado:</b> <?= e(dinheiro($financeiroImpressao['total_c'] / 100)) ?> <b>Pago:</b> <?= e(dinheiro($financeiroImpressao['pago_c'] / 100)) ?> <b>Saldo:</b> <?= e(dinheiro($financeiroImpressao['saldo_c'] / 100)) ?></div>
    <div class="text-xs"><b>Situação:</b> <?= e($financeiroImpressao['situacao']) ?></div>
<?php } ?>
