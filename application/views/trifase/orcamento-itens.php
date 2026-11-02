<ul class="grid gap-3" aria-label="Itens do orçamento">
    <?php foreach ($retratoOrcamento['itens'] as $itemOrcamento) { ?>
        <li class="min-w-0 rounded-sm border border-border p-3">
            <p class="break-words text-label-md text-text"><?= e($itemOrcamento['nome']) ?></p>
            <p class="mt-1 text-caption text-muted"><?= e(($itemOrcamento['tipo'] === 'peca' ? 'Peça' : 'Serviço') . ' · Qtd. ' . str_replace('.', ',', $itemOrcamento['quantidade']) . ' · ' . dinheiro($itemOrcamento['unitario_c'] / 100) . ' por unidade') ?></p>
            <?php if ($itemOrcamento['desconto_c'] > 0) { ?><p class="mt-1 text-caption text-muted"><?= e('Desconto do item: ' . dinheiro($itemOrcamento['desconto_c'] / 100)) ?></p><?php } ?>
            <p class="mt-2 text-body-md text-text"><?= e(dinheiro($itemOrcamento['total_c'] / 100)) ?></p>
        </li>
    <?php } ?>
</ul>
<dl class="mt-4 grid gap-2 text-body-md text-text">
    <div class="flex flex-wrap justify-between gap-2"><dt>Peças</dt><dd><?= e(dinheiro($retratoOrcamento['pecas_c'] / 100)) ?></dd></div>
    <div class="flex flex-wrap justify-between gap-2"><dt>Serviços</dt><dd><?= e(dinheiro($retratoOrcamento['servicos_c'] / 100)) ?></dd></div>
    <?php if ($retratoOrcamento['desconto_c'] > 0) { ?><div class="flex flex-wrap justify-between gap-2"><dt>Desconto geral</dt><dd><?= e(dinheiro($retratoOrcamento['desconto_c'] / 100)) ?></dd></div><?php } ?>
    <div class="flex flex-wrap justify-between gap-2 border-t border-border pt-3 text-heading-sm"><dt>Total do orçamento</dt><dd><?= e(dinheiro($retratoOrcamento['total_c'] / 100)) ?></dd></div>
</dl>
