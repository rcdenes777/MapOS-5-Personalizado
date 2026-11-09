<div class="grid min-w-0 gap-5 py-4">
    <h1 class="text-heading-xl text-text">Marcas e modelos de equipamentos</h1>
    <p class="text-body-md text-muted">Cadastros reutilizáveis. Alterar um modelo não substitui a identificação histórica das OS.</p>
    <form method="get" class="flex flex-wrap items-end gap-3">
        <?= component('input', ['name' => 'pesquisa', 'type' => 'search', 'label' => 'Buscar marca ou modelo', 'value' => $pesquisaCatalogo, 'attrs' => ['maxlength' => 100]]) ?>
        <?= component('button', ['label' => 'Buscar', 'variant' => 'outline', 'type' => 'submit']) ?>
    </form>
    <ul class="grid gap-3">
        <?php foreach ($modelosCatalogo as $modeloCatalogo) { ?>
            <li class="rounded-card border border-border bg-surface p-4">
                <?= component('link', ['label' => $modeloCatalogo->marca . ' · ' . $modeloCatalogo->modelo, 'href' => site_url('trifase_cadastros/modelo/' . (int) $modeloCatalogo->id)]) ?>
                <p class="mt-2 text-caption text-muted"><?= e($modeloCatalogo->tipo) ?></p>
            </li>
        <?php } ?>
        <?php if ($modelosCatalogo === []) { ?><li class="text-muted">Nenhum modelo encontrado. Novos modelos podem ser cadastrados ao identificar uma OS.</li><?php } ?>
    </ul>
    <?= component('pagination', $paginacaoCatalogo) ?>
</div>
