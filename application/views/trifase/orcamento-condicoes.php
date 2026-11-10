<?php $c = $escolhasCondicoes;
$termosTexto = array_map(static fn ($t) => trifaseOrcamentoTexto($t['textoGarantia']), $termosCondicoes);
$termosOpcoes = ['' => 'Sem termo adicional'];
foreach ($termosCondicoes as $termoId => $termo) {
    $termosOpcoes[(string) $termoId] = $termo['refGarantia'];
} ?>
<div class="grid gap-4" <?= js_module('trifase/orcamento-condicoes') ?> data-termos="<?= e(json_encode($termosTexto, JSON_THROW_ON_ERROR)) ?>">
    <input type="hidden" name="condicoes_opcoes" value="1">
    <fieldset class="grid gap-3 rounded-card border border-border p-4">
        <legend class="text-label-md">Condições de pagamento</legend>
        <?= component('checkbox', ['name' => 'pagamento_vista', 'label' => 'À vista', 'value' => '1', 'checked' => $c['pagamento_vista']]) ?>
        <?= component('checkbox', ['name' => 'pagamento_cartao', 'label' => 'Parcelado no cartão de crédito', 'value' => '1', 'checked' => $c['pagamento_cartao']]) ?>
        <?= component('input', ['name' => 'pagamento_parcelas', 'label' => 'Número máximo de parcelas', 'type' => 'number', 'value' => $c['pagamento_parcelas'], 'attrs' => ['min' => 2, 'max' => 24, 'step' => 1]]) ?>
        <details <?= $c['pagamento_outro'] !== '' ? 'open' : '' ?>>
            <summary>Outra condição de pagamento</summary>
            <?= component('textarea', ['name' => 'pagamento_outro', 'label' => 'Condição adicional ou personalizada', 'value' => $c['pagamento_outro'], 'attrs' => ['maxlength' => 1000]]) ?>
        </details>
        <p class="whitespace-pre-wrap text-body-md text-muted" data-previa="pagamento" aria-live="polite"></p>
    </fieldset>
    <fieldset class="grid gap-3 rounded-card border border-border p-4">
        <legend class="text-label-md">Prazo estimado de execução</legend>
        <?= component('select', ['name' => 'prazo_dias', 'label' => 'Prazo em dias úteis', 'selected' => $c['prazo_dias'], 'options' => ['' => 'Não informar', '1' => '1 dia útil', '2' => '2 dias úteis', '3' => '3 dias úteis', '5' => '5 dias úteis', '7' => '7 dias úteis', '10' => '10 dias úteis', '15' => '15 dias úteis', '20' => '20 dias úteis', '30' => '30 dias úteis', 'outro' => 'Outro prazo']]) ?>
        <div data-personalizado="prazo">
            <?= component('textarea', ['name' => 'prazo_outro', 'label' => 'Prazo personalizado', 'value' => $c['prazo_outro'], 'attrs' => ['maxlength' => 500], 'help' => 'Preencha somente se escolher Outro prazo.']) ?>
        </div>
        <?= component('checkbox', ['name' => 'prazo_importar', 'label' => 'Necessário importar peça', 'value' => '1', 'checked' => $c['prazo_importar']]) ?>
        <?= component('checkbox', ['name' => 'prazo_aguardar', 'label' => 'Aguardando chegada da peça', 'value' => '1', 'checked' => $c['prazo_aguardar']]) ?>
        <p class="text-caption text-muted">Com uma dessas opções marcada, o prazo em dias conta após a chegada da peça.</p>
        <p class="whitespace-pre-wrap text-body-md text-muted" data-previa="prazo" aria-live="polite"></p>
    </fieldset>
    <fieldset class="grid gap-3 rounded-card border border-border p-4">
        <legend class="text-label-md">Garantia do serviço</legend>
        <?= component('select', ['name' => 'garantia_dias', 'label' => 'Prazo da garantia', 'selected' => $c['garantia_dias'], 'options' => ['30' => '30 dias', '60' => '60 dias', '90' => '90 dias', '120' => '120 dias', 'outro' => 'Texto personalizado / anterior']]) ?>
        <div data-personalizado="garantia">
            <?= component('textarea', ['name' => 'garantia_outro', 'label' => 'Garantia personalizada', 'value' => $c['garantia_outro'], 'attrs' => ['maxlength' => 8000], 'help' => 'Preencha somente se escolher Texto personalizado / anterior.']) ?>
        </div>
        <?= component('select', ['name' => 'termo_garantia_id', 'label' => 'Termo de garantia cadastrado', 'selected' => $c['termo_garantia_id'], 'options' => $termosOpcoes, 'help' => 'O texto do termo será guardado nesta versão do orçamento.']) ?>
        <p class="whitespace-pre-wrap text-body-md text-muted" data-previa="garantia" aria-live="polite"></p>
    </fieldset>
</div>
