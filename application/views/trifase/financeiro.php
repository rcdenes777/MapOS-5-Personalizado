<?php
$id = (int) $osFinanceira->idOs;
$csrfNome = $this->security->get_csrf_token_name();
$csrfValor = $this->security->get_csrf_hash();
$permite = fn ($p) => $this->permission->checkPermission($this->session->userdata('permissao'), $p);
$estornados = array_column(array_filter($financeiroEventos, fn ($e) => $e->tipo === 'estornar'), 'referencia_id');
$opcoes = [];
foreach ($financeiroEventos as $e) {
    if ($e->tipo === 'receber' && ! in_array($e->id, $estornados)) {
        $opcoes[(string) $e->id] = '#' . $e->id . ' · ' . dinheiro($e->valor_c / 100) . ' · ' . dataBr($e->data_evento);
    }
}
?>
<div class="flex flex-col gap-4 py-4">
    <header class="flex flex-wrap items-center justify-between gap-3">
        <div><h1 class="text-heading-xl text-text"><?= e('Financeiro da OS #' . $id) ?></h1><p class="mt-2 text-body-md text-muted">O pagamento e o andamento do serviço são controles independentes.</p></div>
        <?= component('button', ['label' => 'Voltar à OS', 'variant' => 'outline', 'href' => site_url('os/visualizar/' . $id)]) ?>
    </header>
    <div class="flex flex-wrap items-center gap-3"><span class="text-body-md text-muted">Andamento do serviço</span><?= component('pill-status', osStatusPill($osFinanceira->status)) ?></div>
    <?php if ($financeiroErro) { ?><?= component('alert', ['variant' => 'danger', 'message' => $financeiroErro]) ?><?php } ?>
    <?php if ($financeiroResumo === null) { ?>
        <section class="rounded-card border border-border bg-surface p-4">
            <h2 class="text-heading-sm text-text">Cobrança ainda não registrada neste módulo</h2>
            <p class="my-3 text-body-md text-muted">O valor vem dos produtos, serviços e descontos da OS. Registrar a cobrança não finaliza o serviço.</p>
            <?php if ((int) $osFinanceira->faturado === 1) { ?>
                <?= component('alert', ['variant' => 'warning', 'message' => 'Esta OS já possui faturamento anterior. A conversão exige conciliação; não será criada outra cobrança.']) ?>
            <?php if ($permite('eOs') && $permite('eLancamento')) { ?>
                    <div class="mt-3"><?= component('button', ['label' => 'Conferir faturamento antigo', 'variant' => 'outline', 'href' => site_url('trifase_financeiro/conciliar/' . $id)]) ?></div>
                <?php } ?>
            <?php } elseif ($permite('eOs') && $permite('aLancamento')) { ?>
                <form method="post" action="<?= e(site_url('trifase_financeiro/formalizar/' . $id)) ?>" class="flex flex-col gap-3" novalidate <?= js_module('formulario/padrao') ?>>
                    <input type="hidden" name="<?= e($csrfNome) ?>" value="<?= e($csrfValor) ?>">
                    <?= component('input', ['name' => 'vencimento', 'label' => 'Vencimento', 'type' => 'date', 'value' => date('Y-m-d'), 'required' => true]) ?>
                    <div><?= component('button', ['label' => 'Registrar cobrança', 'type' => 'submit']) ?></div>
                </form>
            <?php } ?>
        </section>
    <?php } else { ?>
        <?php if (($financeiroResumo['abatimento_garantia_c'] ?? 0) > 0) { ?>
            <section class="rounded-card border border-border bg-surface p-4">
                <h2 class="text-heading-sm text-text">Ajustes por garantia</h2>
                <p class="mt-2 text-body-md text-text"><?= e('Total original: ' . dinheiro($financeiroResumo['total_original_c'] / 100) . ' · recebimentos originais líquidos de correções: ' . dinheiro($financeiroResumo['recebido_original_c'] / 100)) ?></p>
                <p class="mt-2 text-body-md text-text"><?= e('Dinheiro devolvido: ' . dinheiro($financeiroResumo['reembolsado_c'] / 100) . ' · abatimento da cobrança: ' . dinheiro($financeiroResumo['abatimento_garantia_c'] / 100)) ?></p>
                <p class="mt-2 text-caption text-muted">Os totais abaixo já consideram esses ajustes. Recebimentos e comprovantes anteriores permanecem no histórico.</p>
            </section>
        <?php } ?>
        <div class="grid gap-3 sm:grid-cols-3">
            <?php foreach (['total_c' => 'Total acordado', 'recebido_c' => 'Recebido líquido', 'saldo_c' => 'Saldo a receber'] as $campo => $rotulo) { ?>
                <section class="rounded-card border border-border bg-surface p-4"><h2 class="text-caption text-muted"><?= e($rotulo) ?></h2><p class="mt-2 text-heading-lg text-text"><?= e(dinheiro($financeiroResumo[$campo] / 100)) ?></p></section>
            <?php } ?>
        </div>
        <div class="flex flex-wrap items-center gap-3"><span class="text-body-md text-muted">Situação de pagamento</span><?= component('pill-status', ['label' => $financeiroResumo['situacao'], 'variant' => $financeiroResumo['saldo_c'] === 0 ? 'success' : 'warning']) ?></div>
        <?php if ($permite('aLancamento') && $financeiroResumo['saldo_c'] > 0 && $osFinanceira->status !== 'Cancelado') { ?>
            <section class="rounded-card border border-border bg-surface p-4">
                <h2 class="mb-3 text-heading-sm text-text">Registrar recebimento</h2>
                <?php $this->load->view('trifase/formulario-recebimento', ['recebimentoIntegrado' => false]); ?>
            </section>
        <?php } ?>
        <section class="rounded-card border border-border bg-surface p-4">
            <h2 class="mb-3 text-heading-sm text-text">Histórico financeiro</h2>
            <?php if ($financeiroEventos === []) { ?><p class="text-body-md text-muted">Nenhum recebimento registrado.</p><?php } ?>
            <ul class="flex flex-col gap-3">
                <?php foreach ($financeiroEventos as $e) { ?>
                    <li class="border-b border-border pb-3 text-body-md text-text">
                        <?= e('#' . $e->id . ' · ' . ($e->tipo === 'receber' ? 'Recebimento' : 'Estorno do registro #' . $e->referencia_id) . ' · ' . dinheiro($e->valor_c / 100) . ' · ' . dataBr($e->data_evento) . ' · ' . $e->forma . ' · Operador #' . $e->usuario_id) ?>
                        <?php if ($e->tipo === 'receber') { ?>
                            <div class="mt-2"><?= component('link', ['label' => in_array($e->id, $estornados) ? 'Consultar registro estornado' : 'Abrir recibo deste recebimento', 'href' => site_url('trifase_financeiro/recibo/' . $id . '/' . (int) $e->id), 'attrs' => ['target' => '_blank', 'rel' => 'noopener']]) ?></div>
                        <?php } ?>
                        <?php if ($e->motivo) { ?><p class="mt-1 text-caption text-muted"><?= e($e->motivo) ?></p><?php } ?>
                        <?php if ($e->tipo === 'receber' && in_array($e->id, $estornados)) { ?><p class="mt-1 text-caption text-muted">Registro estornado; preservado para consulta.</p><?php } ?>
                    </li>
                <?php } ?>
            </ul>
        </section>
        <?php if ($permite('estornarRecebimento') && $opcoes !== []) { ?>
            <section class="rounded-card border border-border bg-surface p-4">
                <h2 class="mb-3 text-heading-sm text-text">Corrigir recebimento</h2>
                <p class="mb-3 text-caption text-muted">O estorno corrige o registro e recompõe o saldo. Não devolve dinheiro ao cliente.</p>
                <form id="trifase-estorno" method="post" action="<?= e(site_url('trifase_financeiro/estornar/' . $id)) ?>" class="grid gap-3 sm:grid-cols-2">
                    <input type="hidden" name="<?= e($csrfNome) ?>" value="<?= e($csrfValor) ?>"><input type="hidden" name="operacao" value="<?= e(bin2hex(random_bytes(16))) ?>">
                    <?= component('select', ['name' => 'evento_id', 'label' => 'Recebimento a estornar', 'options' => $opcoes, 'required' => true]) ?>
                    <?= component('input', ['name' => 'data', 'id' => 'trifase-estorno-data', 'label' => 'Data da correção', 'type' => 'date', 'value' => date('Y-m-d'), 'required' => true]) ?>
                    <?= component('input', ['name' => 'motivo', 'label' => 'Motivo do estorno', 'required' => true, 'attrs' => ['maxlength' => 500]]) ?>
                    <div><?= component('button', ['label' => 'Revisar estorno', 'variant' => 'outline', 'attrs' => ['data-modal-abrir' => 'confirmar-trifase-estorno']]) ?></div>
                </form>
                <?= component('modal-confirm', ['id' => 'confirmar-trifase-estorno', 'title' => 'Estornar este registro?', 'message' => 'O recebimento selecionado deixará de compor o valor recebido e voltará ao saldo pendente. O histórico será preservado. Nenhum dinheiro será transferido.', 'confirm_label' => 'Estornar registro', 'confirm_attrs' => ['form' => 'trifase-estorno']]) ?>
            </section>
        <?php } ?>
    <?php } ?>
</div>
