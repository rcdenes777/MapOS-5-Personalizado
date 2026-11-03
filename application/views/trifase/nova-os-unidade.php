<?php
$unidadeNovaOs = $equipamentoNovaOs ?? null;
$entradaNovaOs = $entradaEquipamentoNovaOs ?? [];
?>
<section class="<?= e($caixa) ?>" aria-labelledby="secao-unidade-reutilizada" data-nova-os-unidade>
    <h2 id="secao-unidade-reutilizada" class="text-heading-sm text-text">Identificação e estado de entrada</h2>
    <p class="mt-2 text-caption text-muted">Opcional: busque uma unidade já atendida deste cliente. Somente a identificação será reaproveitada; informe o novo defeito e os dados desta entrada. A OS anterior fica preservada.</p>
    <div class="relative mt-4" data-nova-os-unidade-busca data-unidade-cliente-url="<?= e(site_url('trifase_equipamentos/unidadesCliente')) ?>" data-autocomplete="<?= e(site_url('trifase_equipamentos/unidadesCliente') . '?cliente_id=' . (int) $valores['clientes_id']) ?>" data-autocomplete-alvo="nova-os-equipamento-id" data-autocomplete-listar>
        <?= component('input', [
            'name' => 'equipamento_busca', 'id' => 'nova-os-equipamento-busca', 'label' => 'Buscar pelo selo, série, IMEI ou modelo',
            'value' => $unidadeNovaOs !== null ? $unidadeNovaOs->marca . ' · ' . $unidadeNovaOs->modelo : '',
            'autocomplete' => 'off', 'disabled' => $valores['clientes_id'] === '',
            'placeholder' => 'Escolha o cliente e clique para listar',
            'help' => 'Para uma unidade ainda não cadastrada, mantenha a descrição do equipamento e identifique-a nos detalhes da OS.',
        ]) ?>
        <input type="hidden" id="nova-os-equipamento-id" name="equipamento_id" value="<?= e($unidadeNovaOs !== null ? (int) $unidadeNovaOs->id : '') ?>">
    </div>
    <p class="mt-2 text-caption text-muted" data-nova-os-unidade-confirmada role="status"><?= e($unidadeNovaOs !== null ? 'Unidade #' . (int) $unidadeNovaOs->id . ($unidadeNovaOs->selo !== '' ? ' · Selo ' . $unidadeNovaOs->selo : '') : 'Nenhuma unidade selecionada.') ?></p>
    <?= component('button', ['label' => 'Não usar esta unidade', 'variant' => 'ghost', 'class' => 'mt-2', 'attrs' => ['data-nova-os-unidade-limpar' => '']]) ?>
    <input type="hidden" name="equipamento_operacao" value="<?= e(is_string($entradaNovaOs['operacao'] ?? null) ? $entradaNovaOs['operacao'] : bin2hex(random_bytes(16))) ?>">
    <fieldset class="<?= e($grade) ?>" data-nova-os-unidade-entrada <?= e($unidadeNovaOs === null ? 'disabled' : '') ?>>
        <legend class="sr-only">Dados da nova entrada da unidade selecionada</legend>
        <?= component('textarea', ['name' => 'equipamento_itens', 'label' => 'Itens recebidos neste atendimento', 'value' => is_string($entradaNovaOs['itens_recebidos'] ?? null) ? $entradaNovaOs['itens_recebidos'] : '', 'required' => true, 'help' => 'Preencha novamente; os acessórios do atendimento anterior não são copiados.', 'attrs' => ['maxlength' => 10000, 'rows' => 3]]) ?>
        <?= component('textarea', ['name' => 'equipamento_estado', 'label' => 'Estado nesta entrada', 'value' => is_string($entradaNovaOs['estado_entrada'] ?? null) ? $entradaNovaOs['estado_entrada'] : '', 'required' => true, 'attrs' => ['maxlength' => 10000, 'rows' => 3]]) ?>
    </fieldset>
</section>
