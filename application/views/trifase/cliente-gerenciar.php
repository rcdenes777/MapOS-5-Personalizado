<?php $id = (int) $clientePublico->idClientes; ?>
<div class="flex flex-col gap-4 pb-8">
    <header class="flex flex-wrap items-center justify-between gap-3">
        <h1 class="font-display text-heading-xl text-text"><?= e('Link público · ' . $clientePublico->nomeCliente) ?></h1>
        <?= component('button', ['label' => 'Voltar ao cliente', 'variant' => 'outline', 'href' => site_url('clientes/visualizar/' . $id)]) ?>
    </header>
    <?= component('alert', ['variant' => 'info', 'message' => 'Quem receber este link poderá consultar as ordens e os valores do cliente. Compartilhe somente com pessoas autorizadas.']) ?>
    <?php if ($linkPublicoAtivo) { ?>
        <section class="rounded-card border border-border bg-surface p-4" <?= js_module('trifase/copiar-link') ?>>
            <?= component('input', ['name' => 'link_cliente_publico', 'id' => 'link-cliente-publico', 'label' => 'Link exclusivo do cliente', 'value' => $linkPublicoAtivo, 'readonly' => true]) ?>
            <div class="mt-3 flex flex-wrap gap-2">
                <?= component('button', ['label' => 'Copiar link', 'variant' => 'outline', 'attrs' => ['data-copiar-link' => 'link-cliente-publico']]) ?>
                <?= component('button', ['label' => 'Abrir link', 'variant' => 'outline', 'href' => $linkPublicoAtivo, 'attrs' => ['target' => '_blank', 'rel' => 'noopener noreferrer']]) ?>
                <?= component('button', ['label' => 'Compartilhar no WhatsApp', 'variant' => 'outline', 'href' => 'https://wa.me/?text=' . rawurlencode('Acompanhe suas ordens de serviço: ' . $linkPublicoAtivo), 'attrs' => ['target' => '_blank', 'rel' => 'noopener noreferrer']]) ?>
            </div>
        </section>
    <?php } ?>
    <section class="rounded-card border border-border bg-surface p-4">
        <h2 class="text-heading-sm">Acesso do cliente</h2>
        <p class="my-3 text-muted"><?= e($estadoPublico ? 'Link ativo até ' . date('d/m/Y H:i', (int) $estadoPublico->expira_em) . '. Renovar cria um novo endereço e invalida o anterior.' : 'Nenhum link ativo. Novos links valem ' . $prazoPublicoDias . ' dias.') ?></p>
        <form method="post" action="<?= e(site_url('trifase_cliente/gerar/' . $id)) ?>">
            <input type="hidden" name="<?= e($this->security->get_csrf_token_name()) ?>" value="<?= e($this->security->get_csrf_hash()) ?>">
            <?= component('button', ['label' => $estadoPublico ? 'Renovar link e invalidar anterior' : 'Gerar link exclusivo', 'type' => 'submit']) ?>
        </form>
        <?php if ($estadoPublico) { ?>
            <form method="post" action="<?= e(site_url('trifase_cliente/revogar/' . $id)) ?>" class="mt-3">
                <input type="hidden" name="<?= e($this->security->get_csrf_token_name()) ?>" value="<?= e($this->security->get_csrf_hash()) ?>">
                <?= component('button', ['label' => 'Revogar acesso', 'variant' => 'outline', 'type' => 'submit']) ?>
            </form>
        <?php } ?>
    </section>
</div>
