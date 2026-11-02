<div class="grid min-w-0 grid-cols-1 gap-5 py-4">
    <h1 class="text-heading-lg text-text"><?= e('Custo interno · ' . $servicoCusto->nome) ?></h1>
    <?= component('link', ['label' => 'Voltar ao serviço', 'href' => site_url('servicos/editar/' . (int) $servicoCusto->idServicos)]) ?>
    <p class="text-body-md text-muted">Custo de referência por unidade de serviço, informado pela equipe. É separado do preço cobrado e fica salvo ao adicionar novos serviços à OS. Alterar aqui não modifica OS anteriores.</p>
    <p class="text-label-md text-text"><?= e($custoServico ? 'Custo atual: ' . dinheiro($custoServico->valor_c / 100) : 'Custo ainda não informado; não equivale a zero.') ?></p>
    <?php if ($erroCusto !== null) { ?><?= component('alert', ['variant' => 'danger', 'message' => $erroCusto]) ?><?php } ?>
    <?php if ($editarCustoServico) { ?>
        <form method="post" class="grid gap-4 rounded-card border border-border bg-surface p-4" <?= js_module('formulario/padrao') ?>>
            <input type="hidden" name="<?= e($this->security->get_csrf_token_name()) ?>" value="<?= e($this->security->get_csrf_hash()) ?>"><input type="hidden" name="operacao" value="<?= e(bin2hex(random_bytes(16))) ?>"><input type="hidden" name="anterior" value="<?= e((int) ($custoServico->id ?? 0)) ?>">
            <?= component('input', ['name' => 'custo', 'label' => 'Custo interno unitário (R$)', 'required' => true, 'attrs' => ['inputmode' => 'decimal']]) ?>
            <?= component('textarea', ['name' => 'motivo', 'label' => 'Composição ou motivo do custo', 'required' => true, 'attrs' => ['maxlength' => 2000, 'rows' => 3]]) ?>
            <?= component('checkbox', ['name' => 'confirmar', 'value' => '1', 'label' => 'Confirmo o custo para os próximos usos, preservando os anteriores.', 'required' => true]) ?>
            <?= component('button', ['label' => 'Salvar custo de referência', 'type' => 'submit']) ?>
        </form>
    <?php } ?>
    <section><h2 class="text-heading-sm text-text">Histórico de custos do serviço</h2>
        <ol class="mt-3 grid gap-3"><?php foreach ($historicoServicoCusto as $hCusto) { ?><li class="min-w-0 border-b border-border pb-3"><p class="text-label-md text-text"><?= e(dinheiro($hCusto->valor_c / 100) . ' · ' . $hCusto->criado_em . ' · Operador #' . $hCusto->usuario_id) ?></p><p class="break-words text-body-md text-muted"><?= e($hCusto->motivo) ?></p></li><?php } ?></ol>
    </section>
</div>
