<?php
$unidadeNovaOs = $equipamentoNovaOs ?? null;
$entradaNovaOs = $entradaEquipamentoNovaOs ?? [];
$modoNovaOs = $modoEquipamentoNovaOs ?? ($entradaNovaOs['modo'] ?? 'existente');
$valorUnidadeNovaOs = static fn (string $campo): string => is_string($entradaNovaOs[$campo] ?? null) ? $entradaNovaOs[$campo] : '';
$novaUnidadeOs = $modoNovaOs === 'novo';
$buscaUnidadeOs = $modoNovaOs === 'existente';
$clienteUnidadeOs = $valores['clientes_id'] !== '';
?>
<section class="<?= e($caixa) ?>" aria-labelledby="secao-unidade-reutilizada" data-nova-os-unidade>
    <h2 id="secao-unidade-reutilizada" class="text-heading-sm text-text">Identificação e estado de entrada</h2>
    <p class="mt-2 text-caption text-muted">Escolha uma unidade deste cliente ou cadastre a que está chegando. Informe o novo defeito e os dados desta entrada; a OS anterior fica preservada.</p>
    <div class="mt-4">
        <?= component('select', ['name' => 'equipamento_modo', 'id' => 'nova-os-equipamento-modo', 'label' => 'Como identificar o equipamento?', 'selected' => $modoNovaOs, 'options' => ['existente' => 'Usar unidade já cadastrada', 'novo' => 'Cadastrar nova unidade', '' => 'Identificar depois'], 'help' => 'A unidade será vinculada ao cliente selecionado quando você salvar a OS.']) ?>
    </div>
    <fieldset data-nova-os-unidade-existente <?= e($buscaUnidadeOs ? '' : 'hidden disabled') ?>>
        <legend class="sr-only">Unidade já cadastrada deste cliente</legend>
        <div class="relative mt-4" data-nova-os-unidade-busca data-unidade-cliente-url="<?= e(site_url('trifase_equipamentos/unidadesCliente')) ?>" data-autocomplete="<?= e(site_url('trifase_equipamentos/unidadesCliente') . '?cliente_id=' . (int) $valores['clientes_id']) ?>" data-autocomplete-alvo="nova-os-equipamento-id" data-autocomplete-listar>
            <?= component('input', [
                'name' => 'equipamento_busca', 'id' => 'nova-os-equipamento-busca', 'label' => 'Buscar pelo selo, série, IMEI ou modelo',
                'value' => $unidadeNovaOs !== null ? $unidadeNovaOs->marca . ' · ' . $unidadeNovaOs->modelo : '',
                'autocomplete' => 'off', 'disabled' => ! $clienteUnidadeOs,
                'placeholder' => 'Escolha o cliente e clique para listar',
            ]) ?>
            <input type="hidden" id="nova-os-equipamento-id" name="equipamento_id" value="<?= e($unidadeNovaOs !== null ? (int) $unidadeNovaOs->id : '') ?>">
        </div>
        <p class="mt-2 text-caption text-muted" data-nova-os-unidade-confirmada role="status"><?= e($unidadeNovaOs !== null ? 'Unidade #' . (int) $unidadeNovaOs->id . ($unidadeNovaOs->selo !== '' ? ' · Selo ' . $unidadeNovaOs->selo : '') : 'Nenhuma unidade selecionada.') ?></p>
        <?= component('button', ['label' => 'Não usar esta unidade', 'variant' => 'ghost', 'class' => 'mt-2', 'attrs' => ['data-nova-os-unidade-limpar' => '']]) ?>
    </fieldset>
    <fieldset class="mt-4 grid gap-4" data-nova-os-unidade-nova <?= e($novaUnidadeOs ? ($clienteUnidadeOs ? '' : 'disabled') : 'hidden disabled') ?>>
        <legend class="sr-only">Cadastro da nova unidade</legend>
        <div class="relative" data-nova-os-modelo-busca data-autocomplete="<?= e(site_url('trifase_equipamentos/modelos')) ?>" data-autocomplete-alvo="nova-os-modelo-id" data-autocomplete-listar data-autocomplete-livre>
            <?= component('input', ['name' => 'equipamento_busca_modelo', 'id' => 'nova-os-modelo-busca', 'label' => 'Reaproveitar marca/modelo cadastrado', 'value' => $valorUnidadeNovaOs('modelo_id') !== '' ? $valorUnidadeNovaOs('marca') . ' · ' . $valorUnidadeNovaOs('modelo') : '', 'autocomplete' => 'off', 'placeholder' => 'Clique para listar ou digite para filtrar', 'help' => 'Opcional. Se não encontrar, preencha marca e modelo abaixo.']) ?>
            <input type="hidden" name="equipamento_modelo_id" id="nova-os-modelo-id" value="<?= e($valorUnidadeNovaOs('modelo_id')) ?>">
        </div>
        <?= component('button', ['label' => 'Preencher outra marca/modelo', 'variant' => 'ghost', 'attrs' => ['data-nova-os-modelo-limpar' => '']]) ?>
        <div class="grid gap-4 sm:grid-cols-2">
            <?= component('select', ['name' => 'equipamento_tipo', 'id' => 'nova-os-tipo', 'label' => 'Tipo de equipamento', 'selected' => $valorUnidadeNovaOs('tipo') ?: 'placa', 'options' => ['placa' => 'Placa eletrônica', 'celular' => 'Celular', 'outro' => 'Outro equipamento'], 'required' => true]) ?>
            <?= component('input', ['name' => 'equipamento_marca', 'id' => 'nova-os-marca', 'label' => 'Marca', 'value' => $valorUnidadeNovaOs('marca'), 'required' => true, 'attrs' => ['maxlength' => 100]]) ?>
            <?= component('input', ['name' => 'equipamento_modelo', 'id' => 'nova-os-modelo', 'label' => 'Modelo', 'value' => $valorUnidadeNovaOs('modelo'), 'required' => true, 'attrs' => ['maxlength' => 160]]) ?>
            <?= component('input', ['name' => 'equipamento_selo', 'id' => 'nova-os-selo', 'label' => 'Número do selo de garantia', 'value' => $valorUnidadeNovaOs('selo'), 'help' => 'O selo identifica esta unidade física; não define o prazo da garantia.', 'attrs' => ['maxlength' => 100]]) ?>
            <?= component('input', ['name' => 'equipamento_serie', 'id' => 'nova-os-serie', 'label' => 'Número de série', 'value' => $valorUnidadeNovaOs('serie'), 'attrs' => ['maxlength' => 100]]) ?>
            <?= component('input', ['name' => 'equipamento_imei', 'id' => 'nova-os-imei', 'label' => 'IMEI (quando aplicável)', 'value' => $valorUnidadeNovaOs('imei'), 'attrs' => ['maxlength' => 100]]) ?>
        </div>
        <p class="text-caption text-muted">Informe pelo menos selo, série ou IMEI. Marca/modelo pode ser igual ao de outras placas; a identificação física distingue cada unidade.</p>
    </fieldset>
    <input type="hidden" name="equipamento_operacao" value="<?= e(is_string($entradaNovaOs['operacao'] ?? null) ? $entradaNovaOs['operacao'] : bin2hex(random_bytes(16))) ?>">
    <fieldset class="<?= e($grade) ?>" data-nova-os-unidade-entrada <?= e(($novaUnidadeOs && $clienteUnidadeOs) || ($buscaUnidadeOs && $unidadeNovaOs !== null) ? '' : 'disabled') ?>>
        <legend class="sr-only">Dados desta entrada da unidade</legend>
        <?= component('textarea', ['name' => 'equipamento_itens', 'label' => 'Itens recebidos neste atendimento', 'value' => $valorUnidadeNovaOs('itens_recebidos'), 'required' => true, 'help' => 'Preencha para esta entrada; os acessórios do atendimento anterior não são copiados.', 'attrs' => ['maxlength' => 10000, 'rows' => 3]]) ?>
        <?= component('textarea', ['name' => 'equipamento_estado', 'label' => 'Estado nesta entrada', 'value' => $valorUnidadeNovaOs('estado_entrada'), 'required' => true, 'attrs' => ['maxlength' => 10000, 'rows' => 3]]) ?>
    </fieldset>
</section>
