<?php $id = (int) $osTecnica->idOs; ?>
<div class="flex flex-col gap-4 py-4">
    <header class="flex flex-wrap items-center justify-between gap-3">
        <h1 class="text-heading-xl text-text"><?= e('Dados técnicos da OS #' . $id) ?></h1>
        <?= component('button', ['label' => 'Voltar à OS', 'variant' => 'outline', 'href' => site_url('os/visualizar/' . $id)]) ?>
    </header>
    <?= component('alert', ['variant' => 'info', 'message' => 'Atualize o equipamento, o defeito, as observações e o laudo. Esta tela preserva produtos, serviços, descontos, recebimentos e a conclusão já registrada.']) ?>
    <?php if ($erroTecnico) { ?><?= component('alert', ['variant' => 'danger', 'message' => $erroTecnico]) ?><?php } ?>
    <form method="post" class="grid gap-4 rounded-card border border-border bg-surface p-4" novalidate <?= js_module('formulario/padrao') ?>>
        <input type="hidden" name="<?= e($this->security->get_csrf_token_name()) ?>" value="<?= e($this->security->get_csrf_hash()) ?>">
        <?php foreach (['descricaoProduto' => 'Equipamento e serviço', 'defeito' => 'Defeito informado', 'observacoes' => 'Observações internas', 'laudoTecnico' => 'Laudo técnico'] as $campo => $rotulo) { ?>
            <?= component('textarea', ['name' => $campo, 'label' => $rotulo, 'value' => osTextoWhatsApp('{TEXTO}', ['{TEXTO}' => $osTecnica->$campo ?? '']), 'attrs' => ['maxlength' => 20000, 'rows' => 4]]) ?>
        <?php } ?>
        <?= component('input', ['name' => 'dataFinal', 'label' => 'Previsão de entrega', 'type' => 'date', 'value' => $osTecnica->dataFinal, 'required' => true, 'attrs' => ['readonly' => $metaTecnica->origem === 'legado_nao_conciliado'], 'help' => 'Alterar a previsão não muda a data de início da garantia.']) ?>
        <div><?= component('button', ['label' => 'Salvar dados técnicos', 'type' => 'submit']) ?></div>
    </form>
    <section class="rounded-card border border-border bg-surface p-4">
        <h2 class="mb-3 text-heading-sm text-text">Conclusão e garantia</h2>
        <?php if ($metaTecnica->origem === 'legado_nao_conciliado') { ?>
            <p class="text-body-md text-muted">A garantia desta OS antiga mantém a regra e a data existentes. A data final está protegida até a conciliação. Laudo, observações e anexos não alteram sua referência.</p>
        <?php } elseif (! empty($metaTecnica->garantia_inicio)) { ?>
            <p class="text-body-md text-text"><?= e('Conclusão registrada em ' . dataBr($metaTecnica->garantia_inicio) . '. Recebimentos, reabertura e mudanças de previsão não alteram essa data.') ?></p>
        <?php } elseif ($osTecnica->status === 'Finalizado') { ?>
            <p class="mb-3 text-body-md text-muted">A OS foi finalizada sem uma data de conclusão registrada neste módulo. Confira a data real antes de iniciar a contagem da garantia.</p>
            <form method="post" action="<?= e(site_url('trifase_financeiro/conclusao/' . $id)) ?>" class="flex flex-wrap items-end gap-3">
                <input type="hidden" name="<?= e($this->security->get_csrf_token_name()) ?>" value="<?= e($this->security->get_csrf_hash()) ?>">
                <?= component('input', ['name' => 'conclusao', 'label' => 'Data real da conclusão', 'type' => 'date', 'required' => true, 'attrs' => ['max' => date('Y-m-d')]]) ?>
                <?= component('button', ['label' => 'Registrar conclusão', 'variant' => 'outline', 'type' => 'submit']) ?>
            </form>
        <?php } else { ?>
            <p class="text-body-md text-muted">A primeira mudança para Finalizado registra a conclusão de hoje e inicia a contagem dos dias de garantia definidos na OS.</p>
        <?php } ?>
    </section>
</div>
