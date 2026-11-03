<?php
$equipamentoDaOs = $pilotoEquipamento ?? null;
$idEquipamentoOs = (int) $os->idOs;
?>
<section class="trifase-os-painel" aria-labelledby="piloto-identificacao" <?= js_module('trifase/equipamento') ?>>
    <h2 id="piloto-identificacao">Identificação do equipamento</h2>
    <?php if ($equipamentoDaOs !== null) { ?>
        <dl class="trifase-os-dados">
            <?php foreach (['marca' => 'Marca', 'modelo' => 'Modelo', 'selo' => 'Número do selo de garantia', 'serie' => 'Número de série', 'imei' => 'IMEI', 'itens_recebidos' => 'Itens recebidos e acessórios', 'estado_entrada' => 'Estado na entrada'] as $campoEquipamento => $rotuloEquipamento) { ?>
                <div><dt><?= e($rotuloEquipamento) ?></dt><dd class="whitespace-pre-wrap break-words"><?= e($equipamentoDaOs->$campoEquipamento !== '' ? $equipamentoDaOs->$campoEquipamento : 'Não informado') ?></dd></div>
            <?php } ?>
        </dl>
        <div class="trifase-os-links-itens">
            <?= component('link', ['label' => 'Histórico deste equipamento', 'href' => site_url('trifase_equipamentos/visualizar/' . (int) $equipamentoDaOs->equipamento_id)]) ?>
            <?php if ($this->permission->checkPermission($this->session->userdata('permissao'), 'aOs')) { ?>
                <?= component('button', ['label' => 'Nova OS deste equipamento', 'icon' => 'plus', 'variant' => 'outline', 'href' => site_url('os/adicionar') . '?equipamento_id=' . (int) $equipamentoDaOs->equipamento_id]) ?>
            <?php } ?>
        </div>
        <p class="trifase-os-ajuda">Identificação registrada neste atendimento. Outra OS reutiliza a unidade e pede novos dados de entrada.</p>
        <?php $this->load->view('trifase/equipamento-correcao', ['os' => $os, 'equipamentoDaOs' => $equipamentoDaOs, 'pilotoPodeCorrigirEquipamento' => $pilotoPodeCorrigirEquipamento ?? false, 'pilotoCorrecoesEquipamento' => $pilotoCorrecoesEquipamento ?? []]); ?>
    <?php } else { ?>
        <p class="text-muted">Sem unidade identificada. A descrição original da OS continua preservada.</p>
        <?php if ($pilotoPodeIdentificar ?? false) { ?>
            <details class="trifase-os-adicionar mt-4">
                <summary>Cadastrar esta unidade</summary>
                <form method="post" action="<?= e(site_url('trifase_equipamentos/vincular/' . $idEquipamentoOs)) ?>" class="grid gap-3 p-3" data-os-acao="equipamento">
                    <input type="hidden" name="modo" value="novo">
                    <input type="hidden" name="operacao" value="<?= e(bin2hex(random_bytes(16))) ?>">
                    <div class="relative" data-modelo-busca data-autocomplete="<?= e(site_url('trifase_equipamentos/modelos')) ?>" data-autocomplete-alvo="piloto-equipamento-modelo-id" data-autocomplete-listar data-autocomplete-livre>
                        <?= component('input', ['name' => 'busca_modelo', 'id' => 'piloto-equipamento-busca-modelo', 'label' => 'Reaproveitar marca/modelo cadastrado', 'autocomplete' => 'off', 'placeholder' => 'Clique para listar ou digite para filtrar', 'help' => 'Opcional. Se não encontrar, preencha marca e modelo abaixo.']) ?>
                        <input type="hidden" name="modelo_id" id="piloto-equipamento-modelo-id" value="">
                    </div>
                    <?= component('button', ['label' => 'Preencher outra marca/modelo', 'variant' => 'ghost', 'attrs' => ['data-equipamento-limpar-modelo' => '']]) ?>
                    <?= component('select', ['name' => 'tipo', 'id' => 'piloto-equipamento-tipo', 'label' => 'Tipo de equipamento', 'options' => ['placa' => 'Placa eletrônica', 'celular' => 'Celular', 'outro' => 'Outro equipamento'], 'selected' => 'placa', 'required' => true]) ?>
                    <?= component('input', ['name' => 'marca', 'id' => 'piloto-equipamento-marca', 'label' => 'Marca', 'required' => true, 'attrs' => ['maxlength' => 100]]) ?>
                    <?= component('input', ['name' => 'modelo', 'id' => 'piloto-equipamento-modelo', 'label' => 'Modelo', 'required' => true, 'attrs' => ['maxlength' => 160]]) ?>
                    <?= component('input', ['name' => 'selo', 'id' => 'piloto-equipamento-selo', 'label' => 'Número do selo de garantia', 'help' => 'Identificador físico único. O selo não altera o prazo da garantia.', 'attrs' => ['maxlength' => 100]]) ?>
                    <?= component('input', ['name' => 'serie', 'id' => 'piloto-equipamento-serie', 'label' => 'Número de série', 'attrs' => ['maxlength' => 100]]) ?>
                    <?= component('input', ['name' => 'imei', 'id' => 'piloto-equipamento-imei', 'label' => 'IMEI (quando aplicável)', 'attrs' => ['maxlength' => 100]]) ?>
                    <p class="text-caption text-muted">Informe ao menos selo, série ou IMEI para distinguir esta unidade de outras do mesmo modelo.</p>
                    <?= component('textarea', ['name' => 'itens_recebidos', 'id' => 'piloto-equipamento-itens', 'label' => 'Itens recebidos e acessórios', 'required' => true, 'help' => 'Ex.: placa e dissipador; ou somente o aparelho, sem acessórios.', 'attrs' => ['maxlength' => 10000, 'rows' => 3]]) ?>
                    <?= component('textarea', ['name' => 'estado_entrada', 'id' => 'piloto-equipamento-estado', 'label' => 'Estado na entrada', 'required' => true, 'attrs' => ['maxlength' => 10000, 'rows' => 3]]) ?>
                    <?= component('button', ['label' => 'Salvar identificação', 'type' => 'submit']) ?>
                </form>
            </details>
            <details class="trifase-os-adicionar mt-4">
                <summary>Usar unidade já cadastrada deste cliente</summary>
                <form method="post" action="<?= e(site_url('trifase_equipamentos/vincular/' . $idEquipamentoOs)) ?>" class="grid gap-3 p-3" data-os-acao="equipamento">
                    <input type="hidden" name="modo" value="existente">
                    <input type="hidden" name="operacao" value="<?= e(bin2hex(random_bytes(16))) ?>">
                    <div class="relative" data-autocomplete="<?= e(site_url('trifase_equipamentos/unidades/' . $idEquipamentoOs)) ?>" data-autocomplete-alvo="piloto-equipamento-unidade-id" data-autocomplete-listar>
                        <?= component('input', ['name' => 'busca_unidade', 'id' => 'piloto-equipamento-busca-unidade', 'label' => 'Buscar selo, série, IMEI ou modelo', 'autocomplete' => 'off', 'required' => true, 'placeholder' => 'Somente equipamentos deste cliente']) ?>
                        <input type="hidden" name="equipamento_id" id="piloto-equipamento-unidade-id" value="">
                    </div>
                    <?= component('textarea', ['name' => 'itens_recebidos', 'id' => 'piloto-equipamento-reuso-itens', 'label' => 'Itens recebidos neste atendimento', 'required' => true, 'attrs' => ['maxlength' => 10000, 'rows' => 3]]) ?>
                    <?= component('textarea', ['name' => 'estado_entrada', 'id' => 'piloto-equipamento-reuso-estado', 'label' => 'Estado nesta entrada', 'required' => true, 'attrs' => ['maxlength' => 10000, 'rows' => 3]]) ?>
                    <?= component('button', ['label' => 'Vincular unidade à OS', 'type' => 'submit']) ?>
                </form>
            </details>
        <?php } ?>
    <?php } ?>
</section>

<?php require_once APPPATH . 'helpers/trifase_cadastro_helper.php'; ?>
<?php if (trifaseCadastrosHabilitados()) { ?><div class="mt-3"><?= component('link', ['label' => 'Consultar marcas e modelos', 'href' => site_url('trifase_cadastros/catalogo')]) ?></div><?php } ?>
