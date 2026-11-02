<?php
$id = (int) $osFinanceira->idOs;
$csrfNome = $this->security->get_csrf_token_name();
$csrfValor = $this->security->get_csrf_hash();
$prefixoRecebimento = ($recebimentoIntegrado ?? false) ? 'piloto-recebimento' : 'trifase-recebimento';
?>
                <form method="post" action="<?= e(site_url('trifase_financeiro/receber/' . $id)) ?>" class="grid gap-3 <?= ($recebimentoIntegrado ?? false) ? '' : 'sm:grid-cols-3' ?>" novalidate <?= ($recebimentoIntegrado ?? false) ? 'data-os-acao="financeiro"' : js_module('formulario/padrao') ?>>
                    <input type="hidden" name="<?= e($csrfNome) ?>" value="<?= e($csrfValor) ?>"><input type="hidden" name="operacao" value="<?= e($financeiroChave) ?>">
                    <?= component('input', ['name' => 'valor', 'id' => $prefixoRecebimento . '-valor', 'label' => 'Valor recebido (R$)', 'value' => $financeiroValores['valor'], 'required' => true, 'attrs' => ['inputmode' => 'decimal', 'maxlength' => 12]]) ?>
                    <?= component('input', ['name' => 'data', 'id' => $prefixoRecebimento . '-data', 'label' => 'Data do recebimento', 'type' => 'date', 'value' => $financeiroValores['data'], 'required' => true]) ?>
                    <?= component('select', ['name' => 'forma', 'id' => $prefixoRecebimento . '-forma', 'label' => 'Forma de pagamento', 'selected' => $financeiroValores['forma'], 'options' => ['Pix' => 'Pix', 'Dinheiro' => 'Dinheiro', 'Cartão de Crédito' => 'Cartão de Crédito', 'Cartão de Débito' => 'Cartão de Débito', 'Transferência' => 'Transferência'], 'required' => true]) ?>
                    <div><?= component('button', ['label' => 'Registrar recebimento', 'type' => 'submit']) ?></div>
                </form>
