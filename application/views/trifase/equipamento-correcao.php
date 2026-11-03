<?php
$camposCorrecao = ['marca' => 'Marca', 'modelo' => 'Modelo', 'selo' => 'Número do selo de garantia', 'serie' => 'Número de série', 'imei' => 'IMEI', 'itens_recebidos' => 'Itens recebidos e acessórios', 'estado_entrada' => 'Estado na entrada'];
?>
<?php if ($pilotoPodeCorrigirEquipamento ?? false) { ?>
    <details class="trifase-os-adicionar mt-4">
        <summary>Editar identificação</summary>
        <form method="post" action="<?= e(site_url('trifase_equipamentos/corrigir/' . (int) $os->idOs)) ?>" class="grid gap-3 p-3" data-os-acao="equipamento">
            <p class="text-caption text-muted">Correção somente desta OS, com histórico. O cadastro da unidade, outras OS, comprovantes e prazos de garantia são preservados.</p>
            <input type="hidden" name="operacao" value="<?= e(bin2hex(random_bytes(16))) ?>">
            <input type="hidden" name="versao" value="<?= e((string) $equipamentoDaOs->correcao_versao) ?>">
            <?php foreach ($camposCorrecao as $campoCorrecao => $rotuloCorrecao) { ?>
                <?php if (in_array($campoCorrecao, ['itens_recebidos', 'estado_entrada'], true)) { ?>
                    <?= component('textarea', ['name' => $campoCorrecao, 'id' => 'corrigir-equipamento-' . $campoCorrecao, 'label' => $rotuloCorrecao, 'value' => $equipamentoDaOs->$campoCorrecao, 'required' => true, 'attrs' => ['maxlength' => 10000, 'rows' => 3]]) ?>
                <?php } else { ?>
                    <?= component('input', ['name' => $campoCorrecao, 'id' => 'corrigir-equipamento-' . $campoCorrecao, 'label' => $rotuloCorrecao, 'value' => $equipamentoDaOs->$campoCorrecao, 'required' => in_array($campoCorrecao, ['marca', 'modelo'], true), 'attrs' => ['maxlength' => $campoCorrecao === 'modelo' ? 160 : 100]]) ?>
                <?php } ?>
            <?php } ?>
            <?= component('textarea', ['name' => 'motivo', 'id' => 'corrigir-equipamento-motivo', 'label' => 'Motivo da correção', 'required' => true, 'attrs' => ['maxlength' => 2000, 'rows' => 2]]) ?>
            <?= component('button', ['label' => 'Salvar correção', 'type' => 'submit']) ?>
        </form>
    </details>
<?php } ?>
<?php if (($pilotoCorrecoesEquipamento ?? []) !== []) { ?>
    <details class="trifase-os-adicionar mt-4">
        <summary>Histórico das correções da identificação</summary>
        <ol class="grid gap-4 p-3">
            <?php foreach ($pilotoCorrecoesEquipamento as $correcaoEquipamento) {
                $antesCorrecao = json_decode($correcaoEquipamento->antes, true, 512, JSON_THROW_ON_ERROR);
                $depoisCorrecao = json_decode($correcaoEquipamento->depois, true, 512, JSON_THROW_ON_ERROR); ?>
                <li class="min-w-0 border-b border-border pb-3">
                    <p class="text-caption text-muted"><?= e($correcaoEquipamento->criado_em . ' · Operador #' . (int) $correcaoEquipamento->usuario_id) ?></p>
                    <p class="whitespace-pre-wrap break-words"><?= e('Motivo: ' . $correcaoEquipamento->motivo) ?></p>
                    <?php foreach ($camposCorrecao as $campoCorrecao => $rotuloCorrecao) {
                        if ($antesCorrecao[$campoCorrecao] === $depoisCorrecao[$campoCorrecao]) {
                            continue;
                        } ?>
                        <p class="mt-2 text-label-md"><?= e($rotuloCorrecao) ?></p>
                        <p class="whitespace-pre-wrap break-words"><?= e('Antes: ' . ($antesCorrecao[$campoCorrecao] ?: 'Não informado')) ?></p>
                        <p class="whitespace-pre-wrap break-words"><?= e('Depois: ' . ($depoisCorrecao[$campoCorrecao] ?: 'Não informado')) ?></p>
                    <?php } ?>
                </li>
            <?php } ?>
        </ol>
    </details>
<?php } ?>
