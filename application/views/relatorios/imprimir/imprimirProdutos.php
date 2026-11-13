<?php
$estoqueSemCusto = $verCusto && array_any($produtos, static fn ($p) => $p->precoCompra === null && (int) $p->estoque !== 0);
?>
<?php $this->load->view('relatorios/imprimir/partes/inicio', ['tituloDoc' => ucfirst($title)]); ?>
    <table class="rel-tabela">
        <thead>
            <tr>
                <th class="rel-th">Nome</th>
                <th class="rel-th">UN</th>
                <?php if ($verCusto) { ?>
                    <th class="rel-th">Preço compra</th>
                <?php } ?>
                <th class="rel-th">Preço venda</th>
                <th class="rel-th">Estoque</th>
                <th class="rel-th">Valor (venda)</th>
                <?php if ($verCusto) { ?>
                    <th class="rel-th">Valor (compra)</th>
                <?php } ?>
            </tr>
        </thead>
        <tbody>
            <?php foreach ($produtos as $p) : ?>
                <tr>
                    <td class="rel-td"><?= e($p->descricao) ?></td>
                    <td class="rel-td text-center"><?= e($p->unidade) ?></td>
                    <?php if ($verCusto) { ?>
                        <td class="rel-td text-center"><?= e($p->precoCompra === null ? 'Não informado' : 'R$: ' . $p->precoCompra) ?></td>
                    <?php } ?>
                    <td class="rel-td text-center">R$: <?= e($p->precoVenda) ?></td>
                    <td class="rel-td text-center"><?= e($p->estoque) ?></td>
                    <td class="rel-td text-center">R$: <?= number_format($p->valorEstoque, 2, ',', '.') ?></td>
                    <?php if ($verCusto) { ?>
                        <td class="rel-td text-center"><?= e($p->precoCompra === null ? 'Não informado' : 'R$: ' . number_format((float) $p->valorEstoqueR, 2, ',', '.')) ?></td>
                    <?php } ?>
                </tr>
            <?php endforeach; ?>
        </tbody>
    </table>

    <table class="rel-tabela mt-3">
        <tr>
            <th class="rel-th">Itens em estoque</th>
            <th class="rel-th">Valor do estoque (venda)</th>
            <?php if ($verCusto) { ?>
                <th class="rel-th"><?= e($estoqueSemCusto ? 'Subtotal dos custos informados' : 'Valor do estoque (compra)') ?></th>
            <?php } ?>
        </tr>
        <tr>
            <td class="rel-total text-center"><?= e(array_sum(array_column($produtos, 'estoque'))) ?></td>
            <td class="rel-total text-center">R$: <?= number_format(array_sum(array_column($produtos, 'valorEstoque')), 2, ',', '.') ?></td>
            <?php if ($verCusto) { ?>
                <td class="rel-total text-center"><?php $custosInformados = array_filter(array_column($produtos, 'valorEstoqueR'), static fn ($custo) => $custo !== null); ?>
                    <?= e($estoqueSemCusto && $custosInformados === [] ? 'Não informado' : 'R$: ' . number_format(array_sum($custosInformados), 2, ',', '.')) ?></td>
            <?php } ?>
        </tr>
    </table>
<?php $this->load->view('relatorios/imprimir/partes/fim'); ?>
