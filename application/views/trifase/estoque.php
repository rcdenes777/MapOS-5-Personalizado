<?php
$idProdutoEstoque = (int) $produtoEstoque->idProdutos;
$nomesMovimento = ['entrada' => 'Entrada de compra', 'saida' => 'Saída manual', 'contagem' => 'Ajuste de contagem', 'os_saida' => 'Saída para OS', 'os_devolucao' => 'Devolução da OS', 'os_consumo' => 'Baixa confirmada como consumida', 'os_conciliacao' => 'Conciliação sem reposição', 'venda_saida' => 'Saída para venda', 'venda_devolucao' => 'Devolução da venda', 'legado_entrada' => 'Entrada nativa', 'legado_saida' => 'Saída nativa', 'inicial' => 'Saldo inicial'];
?>
<div class="grid min-w-0 grid-cols-1 gap-5 py-4">
    <header><h1 class="text-heading-xl text-text">Estoque e movimentações</h1><p class="mt-2 break-words text-body-md text-muted"><?= e($produtoEstoque->descricao . ' · Saldo atual: ' . (int) $produtoEstoque->estoque) ?></p></header>
    <?= component('link', ['label' => 'Voltar à ficha do produto', 'href' => site_url('produtos/visualizar/' . $idProdutoEstoque)]) ?>
    <?php if ($erroEstoque !== null) { ?><?= component('alert', ['variant' => 'danger', 'message' => $erroEstoque]) ?><?php } ?>
    <?php if ($editarEstoque) { ?>
        <section class="rounded-card border border-border bg-surface p-4 sm:p-6">
            <h2 class="text-heading-sm text-text">Registrar movimentação</h2>
            <form method="post" class="mt-4 grid gap-4" <?= js_module('formulario/padrao') ?>>
                <input type="hidden" name="<?= e($this->security->get_csrf_token_name()) ?>" value="<?= e($this->security->get_csrf_hash()) ?>"><input type="hidden" name="operacao" value="<?= e(bin2hex(random_bytes(16))) ?>">
                <input type="hidden" name="esperado" value="<?= e((int) $produtoEstoque->estoque) ?>">
                <?= component('select', ['name' => 'tipo', 'id' => 'estoque-movimento-tipo', 'label' => 'Tipo de movimentação', 'options' => ($editarCustoEstoque ? ['entrada' => 'Entrada de compra'] : []) + ['saida' => 'Saída manual', 'contagem' => 'Ajuste de contagem']]) ?>
                <?= component('input', ['name' => 'quantidade', 'label' => 'Quantidade', 'type' => 'number', 'required' => true, 'help' => 'Na contagem, informe o saldo contado. Para entrada ou saída, informe a quantidade movimentada.', 'attrs' => ['min' => 0, 'max' => 1000000, 'step' => 1]]) ?>
                <?php if ($editarCustoEstoque) { ?><?= component('input', ['name' => 'custo', 'label' => 'Custo unitário da compra (R$)', 'help' => 'Obrigatório na entrada. Atualiza o custo de referência para os próximos usos; o preço de venda e os custos antigos não mudam.', 'attrs' => ['inputmode' => 'decimal']]) ?><?php } ?>
                <?= component('input', ['name' => 'data', 'label' => 'Data do movimento', 'type' => 'date', 'value' => date('Y-m-d'), 'required' => true, 'attrs' => ['min' => '1900-01-01', 'max' => date('Y-m-d')]]) ?>
                <?= component('textarea', ['name' => 'motivo', 'label' => 'Motivo e referência', 'required' => true, 'attrs' => ['maxlength' => 2000, 'rows' => 2]]) ?>
                <?= component('checkbox', ['name' => 'confirmar', 'value' => '1', 'label' => 'Conferi a movimentação e confirmo seu registro no histórico.', 'required' => true]) ?>
                <?= component('button', ['label' => 'Registrar movimentação', 'type' => 'submit']) ?>
            </form>
        </section>
    <?php } ?>
    <section class="min-w-0 rounded-card border border-border bg-surface p-4 sm:p-6">
        <h2 class="text-heading-sm text-text">Histórico de estoque</h2>
        <p class="mt-2 text-caption text-muted">O histórico começa com a ativação desta extensão. O saldo anterior não revela movimentações antigas. A data informada não reordena saldos históricos; a sequência é a do registro.</p>
        <form method="get" class="mt-4 grid gap-3 sm:grid-cols-3">
            <?= component('input', ['name' => 'inicio', 'label' => 'De', 'type' => 'date', 'value' => $filtrosEstoque['inicio'] ?? '']) ?>
            <?= component('input', ['name' => 'fim', 'label' => 'Até', 'type' => 'date', 'value' => $filtrosEstoque['fim'] ?? '']) ?>
            <?= component('select', ['name' => 'tipo', 'id' => 'estoque-filtro-tipo', 'label' => 'Tipo', 'selected' => $filtrosEstoque['tipo'] ?? '', 'options' => ['' => 'Todos'] + $nomesMovimento]) ?>
            <?= component('button', ['label' => 'Filtrar', 'type' => 'submit', 'variant' => 'outline']) ?>
        </form>
        <ol class="mt-4 grid min-w-0 grid-cols-1 gap-3">
            <?php foreach ($movimentosEstoque as $movimentoEstoque) { ?>
                <li class="min-w-0 border-b border-border pb-3">
                    <p class="text-label-md text-text"><?= e(($nomesMovimento[$movimentoEstoque->tipo] ?? $movimentoEstoque->tipo) . ' · ' . sprintf(in_array($movimentoEstoque->tipo, ['os_consumo', 'os_conciliacao'], true) ? '%d' : '%+d', $movimentoEstoque->quantidade) . ' un.') ?></p>
                    <p class="mt-1 text-body-md text-text"><?= e('Saldo: ' . $movimentoEstoque->saldo_antes . ' → ' . $movimentoEstoque->saldo_depois) ?></p>
                    <p class="mt-1 break-words text-caption text-muted"><?= e($movimentoEstoque->data_movimento . ' · Registrado ' . $movimentoEstoque->criado_em . ' · Operador #' . $movimentoEstoque->usuario_id . ' · ' . $movimentoEstoque->origem) ?></p>
                    <p class="mt-2 whitespace-pre-wrap break-words text-body-md text-text"><?= e($movimentoEstoque->motivo) ?></p>
                    <?php if ($verCustoEstoque && $movimentoEstoque->custo_unitario_c !== null) { ?><p class="mt-1 text-caption text-muted"><?= e('Custo unitário registrado: ' . dinheiro($movimentoEstoque->custo_unitario_c / 100)) ?></p><?php } ?>
                </li>
            <?php } ?>
            <?php if ($movimentosEstoque === []) { ?><li class="text-muted">Nenhuma movimentação neste período.</li><?php } ?>
        </ol>
        <nav class="mt-4 flex flex-wrap gap-4" aria-label="Páginas de movimentações">
            <?php if ($paginaEstoque > 0) { ?><?= component('link', ['label' => 'Mais recentes', 'href' => site_url('trifase_estoque/produto/' . $idProdutoEstoque) . '?' . http_build_query($filtrosEstoque + ['pagina' => max(0, $paginaEstoque - 50)])]) ?><?php } ?>
            <?php if (count($movimentosEstoque) === 50) { ?><?= component('link', ['label' => 'Mais antigas', 'href' => site_url('trifase_estoque/produto/' . $idProdutoEstoque) . '?' . http_build_query($filtrosEstoque + ['pagina' => $paginaEstoque + 50])]) ?><?php } ?>
        </nav>
    </section>
</div>
