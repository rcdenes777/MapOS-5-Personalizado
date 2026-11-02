<?php
$rotulosCadastro = ['selo' => 'Número do selo de garantia', 'serie' => 'Número de série', 'imei' => 'IMEI', 'marca' => 'Marca', 'modelo' => 'Modelo'];
$voltarCadastro = match ($tipoCadastro) {
    'cliente' => 'clientes/visualizar/' . $idCadastro, 'modelo' => 'trifase_cadastros/catalogo', 'unidade' => 'trifase_equipamentos/visualizar/' . $idCadastro
};
?>
<div class="grid min-w-0 grid-cols-1 gap-5 py-4">
    <header><?php if ($cadastroIntegrado ?? false) { ?><h2 class="break-words text-heading-lg text-text"><?= e($tituloCadastro) ?></h2><?php } else { ?><h1 class="break-words text-heading-lg text-text"><?= e($tituloCadastro) ?></h1><?php } ?>
        <p class="mt-3 text-body-md text-muted"><?= e($tipoCadastro === 'cliente' ? 'Categoria e orientações são privadas. Não aparecem ao cliente, em impressões ou no link público; não alteram preços ou permissões.' : 'Correções valem para os próximos atendimentos. Identificações, datas e comprovantes anteriores permanecem preservados; não transfere o equipamento entre clientes.') ?></p>
    </header>
    <?php if (! ($cadastroIntegrado ?? false)) { ?><?= component('link', ['label' => 'Voltar', 'href' => site_url($voltarCadastro)]) ?><?php } ?>
    <?php if ($erroCadastro !== null) { ?><?= component('alert', ['variant' => 'danger', 'message' => $erroCadastro]) ?><?php } ?>
    <?php if ($podeEditarCadastro) { ?>
        <form method="post" action="<?= e(site_url('trifase_cadastros/' . $tipoCadastro . '/' . $idCadastro)) ?>" class="grid min-w-0 gap-4 rounded-card border border-border bg-surface p-4 sm:p-6" <?= js_module('formulario/padrao') ?>>
            <input type="hidden" name="<?= e($this->security->get_csrf_token_name()) ?>" value="<?= e($this->security->get_csrf_hash()) ?>">
            <input type="hidden" name="operacao" value="<?= e(bin2hex(random_bytes(16))) ?>"><input type="hidden" name="versao" value="<?= e($versaoCadastro) ?>">
            <?php if ($tipoCadastro === 'cliente') { ?>
                <?= component('select', ['name' => 'categoria', 'label' => 'Categoria interna', 'selected' => $valoresCadastro['categoria'], 'options' => trifaseCategoriasClientes()]) ?>
                <?= component('textarea', ['name' => 'orientacoes', 'label' => 'Orientações de atendimento', 'value' => $valoresCadastro['orientacoes'], 'help' => 'Registre orientações objetivas, como preferência de contato ou confirmação por escrito.', 'attrs' => ['maxlength' => 4000, 'rows' => 4]]) ?>
            <?php } else { ?>
                <?php if ($tipoCadastro === 'modelo') { ?><?= component('select', ['name' => 'tipo', 'label' => 'Tipo', 'selected' => $valoresCadastro['tipo'], 'options' => ['placa' => 'Placa', 'celular' => 'Celular', 'outro' => 'Outro']]) ?><?php } ?>
                <?php foreach ($valoresCadastro as $campoCadastro => $valorCadastro) {
                    if ($campoCadastro === 'tipo') {
                        continue;
                    } ?>
                    <?= component('input', ['name' => $campoCadastro, 'label' => $rotulosCadastro[$campoCadastro], 'value' => $valorCadastro, 'required' => in_array($campoCadastro, ['marca', 'modelo'], true), 'attrs' => ['maxlength' => $campoCadastro === 'modelo' ? 160 : 100]]) ?>
                <?php } ?>
            <?php } ?>
            <?= component('textarea', ['name' => 'motivo', 'label' => 'Motivo da alteração', 'required' => true, 'attrs' => ['maxlength' => 2000, 'rows' => 2]]) ?>
            <?= component('checkbox', ['name' => 'confirmar', 'value' => '1', 'label' => 'Conferi os dados e confirmo o registro com histórico.', 'required' => true]) ?>
            <?= component('button', ['label' => 'Salvar alteração', 'type' => 'submit']) ?>
        </form>
    <?php } elseif ($tipoCadastro === 'cliente') { ?>
        <p class="text-label-md text-text"><?= e(trifaseCategoriasClientes()[$valoresCadastro['categoria']]) ?></p>
        <p class="whitespace-pre-wrap break-words text-body-md text-text"><?= e($valoresCadastro['orientacoes'] ?: 'Nenhuma orientação registrada.') ?></p>
    <?php } ?>
    <details class="min-w-0 rounded-card border border-border bg-surface p-4 sm:p-6">
        <summary class="text-heading-sm text-text">Histórico das alterações</summary>
        <ol class="mt-4 grid min-w-0 gap-4">
            <?php foreach ($historicoCadastro as $eventoCadastro) { ?>
                <li class="min-w-0 border-b border-border pb-4">
                    <p class="text-caption text-muted"><?= e($eventoCadastro->criado_em . ' · Operador #' . (int) $eventoCadastro->usuario_id) ?></p>
                    <?php foreach (['antes' => 'Antes', 'depois' => 'Depois'] as $ladoCadastro => $nomeLadoCadastro) { ?>
                        <h3 class="mt-2 text-label-md text-text"><?= e($nomeLadoCadastro) ?></h3>
                        <?php foreach (json_decode($eventoCadastro->$ladoCadastro, true) as $campoCadastro => $valorCadastro) { ?>
                            <p class="whitespace-pre-wrap break-words text-body-md text-text"><?= e(($campoCadastro === 'categoria' ? 'Categoria: ' . (trifaseCategoriasClientes()[$valorCadastro] ?? $valorCadastro) : ucfirst($campoCadastro) . ': ' . $valorCadastro)) ?></p>
                        <?php } ?>
                    <?php } ?>
                    <p class="mt-2 whitespace-pre-wrap break-words text-body-md text-muted"><?= e('Motivo: ' . $eventoCadastro->motivo) ?></p>
                </li>
            <?php } ?>
            <?php if ($historicoCadastro === []) { ?><li class="text-muted">Nenhuma alteração registrada.</li><?php } ?>
        </ol>
    </details>
</div>
