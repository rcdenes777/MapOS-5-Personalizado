<?php $ref = $referenciaRetorno; ?>
<div class="mx-auto flex max-w-3xl flex-col gap-5 py-4">
    <header><h1 class="text-heading-xl text-text">Registrar retorno em garantia</h1><p class="mt-2 text-body-md text-muted">Abra outro atendimento para esta unidade. A OS anterior e seu prazo permanecem preservados.</p></header>
    <?= component('link', ['label' => 'Voltar à OS anterior', 'href' => site_url('os/visualizar/' . (int) $ref['anterior']->idOs)]) ?>
    <section class="rounded-card border border-border bg-surface p-4">
        <h2 class="break-words text-heading-sm text-text"><?= e($ref['equipamento']->marca . ' · ' . $ref['equipamento']->modelo) ?></h2>
        <p class="mt-2 break-words text-body-md text-text"><?= e('Selo: ' . ($ref['equipamento']->selo ?: 'Não informado')) ?></p>
        <p class="mt-2 text-body-md text-text"><?= e('OS de origem #' . (int) $ref['origem']->idOs . ' · conclusão ' . dataBr($ref['conclusao']) . ' · prazo ' . $ref['prazo'] . ' dias') ?></p>
        <p class="mt-2 text-body-md text-text"><?= e($ref['vencimento'] === null ? 'Origem sem prazo de garantia informado.' : 'Prazo original até ' . dataBr($ref['vencimento']) . ($ref['vencimento'] < date('Y-m-d') ? ' · fora do prazo' : ' · dentro do prazo')) ?></p>
        <p class="mt-3 text-caption text-muted">A data indica o prazo; a cobertura depende da avaliação técnica. O retorno começa em avaliação, sem cobrança, sem receber valores e sem reiniciar a garantia.</p>
    </section>
    <?php if ($erroRetorno !== null) { ?><?= component('alert', ['variant' => 'danger', 'title' => 'Confira a entrada', 'message' => $erroRetorno]) ?><?php } ?>
    <form method="post" action="<?= e(site_url('trifase_retornos/novo/' . (int) $ref['anterior']->idOs)) ?>" class="grid gap-4 rounded-card border border-border bg-surface p-4" <?= js_module('formulario/padrao') ?>>
        <input type="hidden" name="<?= e($this->security->get_csrf_token_name()) ?>" value="<?= e($this->security->get_csrf_hash()) ?>">
        <input type="hidden" name="operacao" value="<?= e($chaveRetorno) ?>">
        <?= component('textarea', ['name' => 'defeito', 'id' => 'retorno-defeito', 'label' => 'Novo defeito relatado', 'value' => $valoresRetorno['defeito'], 'required' => true, 'attrs' => ['maxlength' => 10000, 'rows' => 4]]) ?>
        <?= component('textarea', ['name' => 'itens_recebidos', 'id' => 'retorno-itens', 'label' => 'Itens recebidos e acessórios nesta entrada', 'value' => $valoresRetorno['itens_recebidos'], 'required' => true, 'attrs' => ['maxlength' => 10000, 'rows' => 3]]) ?>
        <?= component('textarea', ['name' => 'estado_entrada', 'id' => 'retorno-estado', 'label' => 'Estado do equipamento nesta entrada', 'value' => $valoresRetorno['estado_entrada'], 'required' => true, 'attrs' => ['maxlength' => 10000, 'rows' => 3]]) ?>
        <?= component('checkbox', ['name' => 'confirmar', 'id' => 'retorno-confirmar', 'value' => '1', 'label' => 'Recebi novamente esta unidade e confirmo abrir outra OS, preservando o atendimento e prazo originais.', 'required' => true]) ?>
        <?= component('button', ['label' => 'Abrir OS de retorno', 'type' => 'submit']) ?>
    </form>
</div>
