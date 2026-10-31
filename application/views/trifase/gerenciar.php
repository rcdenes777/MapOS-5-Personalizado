<?php
/** Extensão Trifase, tela independente do controller e das abas da OS. */
$id = (int) $osPublica->idOs;
?>
<div class="flex flex-col gap-4 pb-8">
    <header class="flex flex-wrap items-center justify-between gap-3">
        <h1 class="font-display text-heading-xl text-text"><?= e('Link público · OS #' . $id) ?></h1>
        <?= component('button', ['label' => 'Voltar à OS', 'variant' => 'outline', 'href' => site_url('os/visualizar/' . $id)]) ?>
    </header>
    <?= component('alert', ['variant' => 'info', 'message' => 'Quem receber o link poderá ver o andamento, a descrição do equipamento e os anexos selecionados abaixo. Não compartilhe arquivos internos.']) ?>
    <?php if ($novoLinkPublico) { ?>
        <section class="rounded-card border border-border bg-surface p-4">
            <?= component('input', ['name' => 'link_publico', 'label' => 'Copie e envie este link ao cliente', 'value' => $novoLinkPublico, 'readonly' => true, 'help' => 'Exibido somente agora. Guarde o link antes de sair desta tela.']) ?>
            <div class="mt-3 flex flex-wrap gap-2">
                <?= component('button', ['label' => 'Abrir link', 'variant' => 'outline', 'href' => $novoLinkPublico, 'attrs' => ['target' => '_blank', 'rel' => 'noopener noreferrer']]) ?>
                <?= component('button', ['label' => 'Compartilhar no WhatsApp', 'variant' => 'outline', 'href' => 'https://wa.me/?text=' . rawurlencode('Acompanhe sua OS: ' . $novoLinkPublico), 'attrs' => ['target' => '_blank', 'rel' => 'noopener noreferrer']]) ?>
            </div>
        </section>
    <?php } ?>
    <section class="rounded-card border border-border bg-surface p-4">
        <h2 class="text-heading-sm text-text">Acesso do cliente</h2>
        <p class="my-3 text-body-md text-muted"><?= e($estadoPublico ? 'Link ativo até ' . date('d/m/Y H:i', (int) $estadoPublico->expira_em) . '. Gerar outro invalida o anterior imediatamente.' : 'Nenhum link ativo. Os links expiram após 30 dias.') ?></p>
        <form method="post" action="<?= e(site_url('trifase/gerar/' . $id)) ?>" class="inline">
            <input type="hidden" name="<?= e($this->security->get_csrf_token_name()) ?>" value="<?= e($this->security->get_csrf_hash()) ?>">
            <?= component('button', ['label' => $estadoPublico ? 'Gerar novo link e invalidar anterior' : 'Gerar link público', 'type' => 'submit']) ?>
        </form>
        <?php if ($estadoPublico) { ?>
            <form method="post" action="<?= e(site_url('trifase/revogar/' . $id)) ?>" class="mt-3">
                <input type="hidden" name="<?= e($this->security->get_csrf_token_name()) ?>" value="<?= e($this->security->get_csrf_hash()) ?>">
                <?= component('button', ['label' => 'Revogar acesso público', 'variant' => 'outline', 'type' => 'submit']) ?>
            </form>
        <?php } ?>
    </section>
    <section class="rounded-card border border-border bg-surface p-4">
        <h2 class="text-heading-sm text-text">Anexos autorizados para o cliente</h2>
        <p class="mt-1 text-caption text-muted">Novos anexos começam privados. Alterar esta seleção não exige gerar outro link.</p>
        <form method="post" action="<?= e(site_url('trifase/anexos/' . $id)) ?>" class="mt-4 flex flex-col gap-3">
            <input type="hidden" name="<?= e($this->security->get_csrf_token_name()) ?>" value="<?= e($this->security->get_csrf_hash()) ?>">
            <?php foreach ($anexosPublicos as $anexo) { ?>
                <?= component('checkbox', ['name' => 'anexos[]', 'id' => 'publicar-anexo-' . (int) $anexo->idAnexos, 'value' => (string) $anexo->idAnexos, 'label' => 'Anexo #' . (int) $anexo->idAnexos . ' · ' . basename((string) $anexo->anexo), 'checked' => $anexo->publicado !== null]) ?>
            <?php } ?>
            <?php if ($anexosPublicos === []) { ?>
                <p class="text-body-md text-muted">Esta OS ainda não tem anexos.</p>
            <?php } ?>
            <div><?= component('button', ['label' => 'Salvar anexos públicos', 'type' => 'submit', 'variant' => 'outline']) ?></div>
        </form>
    </section>
</div>
