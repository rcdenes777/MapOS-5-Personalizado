<?php $os = $legadoFinanceiro['os'];
$l = $legadoFinanceiro['lancamento']; ?>
<div class="flex flex-col gap-4 py-4">
    <h1 class="text-heading-xl text-text"><?= e('Conferir faturamento antigo da OS #' . (int) $os->idOs) ?></h1>
    <?= component('button', ['label' => 'Voltar', 'variant' => 'outline', 'href' => site_url('trifase_financeiro/visualizar/' . (int) $os->idOs)]) ?>
    <?= component('alert', ['variant' => 'info', 'message' => 'A conferência reutiliza o lançamento já vinculado, sem gerar outra receita. Não deduz a conclusão do serviço a partir do faturamento. Pagamentos antigos e vínculos ambíguos exigem conciliação manual.']) ?>
    <?php if ($erroLegado) { ?><?= component('alert', ['variant' => 'danger', 'message' => $erroLegado]) ?><?php } ?>
    <?php if (! $legadoFinanceiro['elegivel']) { ?>
        <?= component('alert', ['variant' => 'warning', 'message' => $legadoFinanceiro['motivo']]) ?>
    <?php } else { ?>
        <section class="rounded-card border border-border bg-surface p-4">
            <p class="mb-3 text-body-md text-text"><?= e('Lançamento #' . $l->idLancamentos . ' · ' . dinheiro(financeiroLiquido($l)) . ' · Vencimento ' . dataBr($l->data_vencimento) . ' · Não recebido') ?></p>
            <form method="post" class="flex flex-col gap-3" novalidate <?= js_module('formulario/padrao') ?>>
                <input type="hidden" name="<?= e($this->security->get_csrf_token_name()) ?>" value="<?= e($this->security->get_csrf_hash()) ?>">
                <?= component('select', ['name' => 'status', 'label' => 'Andamento real do serviço', 'placeholder' => 'Confira e escolha o andamento', 'options' => ['Aberto' => 'Aberto', 'Em Andamento' => 'Em Andamento', 'Aguardando Peças' => 'Aguardando Peças', 'Finalizado' => 'Finalizado'], 'required' => true]) ?>
                <?= component('checkbox', ['name' => 'confirmar', 'value' => '1', 'label' => 'Conferi o lançamento, o valor e o andamento real desta OS.', 'required' => true]) ?>
                <div><?= component('button', ['label' => 'Confirmar conciliação', 'type' => 'submit']) ?></div>
            </form>
        </section>
    <?php } ?>
</div>
