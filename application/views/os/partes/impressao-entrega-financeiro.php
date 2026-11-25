<?php
/**
 * Entrega e situação financeira na impressão A4.
 * Somente total, pago, saldo e situação — sem custos, margens ou notas internas.
 *
 * @var bool        $mostrarEntrega
 * @var object|null $entregaImpressao
 * @var array|null  $financeiroImpressao
 */
$mostrarEntrega = $mostrarEntrega ?? false;
$entregaImpressao = $entregaImpressao ?? null;
$financeiroImpressao = $financeiroImpressao ?? null;
?>
<?php if ($mostrarEntrega || $financeiroImpressao !== null) { ?>
    <?php if ($mostrarEntrega) { ?>
        <div class="doc-subtitulo">ENTREGA</div>
        <div class="doc-dados">
            <div>
                <span><b>Entregue em:</b> <?= e($entregaImpressao !== null ? date('d/m/Y', strtotime($entregaImpressao->entregue_em)) : 'Não registrada') ?></span>
            </div>
        </div>
    <?php } ?>
    <?php if ($financeiroImpressao !== null) { ?>
        <div class="doc-subtitulo">SITUAÇÃO FINANCEIRA</div>
        <table class="doc-tabela">
            <thead>
                <tr>
                    <th class="text-center">TOTAL COBRADO</th>
                    <th class="text-center">PAGO</th>
                    <th class="text-center">SALDO A PAGAR</th>
                    <th class="text-center">SITUAÇÃO</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td class="text-center"><?= e(dinheiro($financeiroImpressao['total_c'] / 100)) ?></td>
                    <td class="text-center"><?= e(dinheiro($financeiroImpressao['pago_c'] / 100)) ?></td>
                    <td class="text-center"><?= e(dinheiro($financeiroImpressao['saldo_c'] / 100)) ?></td>
                    <td class="text-center"><?= e($financeiroImpressao['situacao']) ?></td>
                </tr>
            </tbody>
        </table>
    <?php } ?>
<?php } ?>
