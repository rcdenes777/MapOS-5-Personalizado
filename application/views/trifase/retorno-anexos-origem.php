<?php
/**
 * Consulta exclusivamente privada, separada dos anexos próprios do retorno.
 * @var array{origem_id?: int, anexos?: list<object>} $anexosOrigem
 */
$origemHistorico = $anexosOrigem['origem_id'] ?? null;
$arquivosHistorico = $anexosOrigem['anexos'] ?? [];
if (! is_int($origemHistorico) || $origemHistorico <= 0 || $arquivosHistorico === []) {
    return;
}
?>
<section class="space-y-4 rounded-xl border border-border bg-surface p-4" aria-labelledby="retorno-anexos-origem-titulo">
    <h2 id="retorno-anexos-origem-titulo" class="text-heading-sm text-text">Imagens da OS de origem — histórico</h2>
    <p class="text-body-md text-muted">Fotos e arquivos anteriores, preservados na OS de origem; não são novas imagens do retorno.</p>
    <?= component('button', ['label' => 'Consultar OS de origem #' . $origemHistorico, 'variant' => 'outline', 'href' => site_url('os/visualizar/' . $origemHistorico)]) ?>
    <ul class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Arquivos históricos da OS de origem">
        <?php foreach ($arquivosHistorico as $arquivoHistorico) {
            $idHistorico = (int) ($arquivoHistorico->idAnexos ?? 0);
            if ($idHistorico <= 0) {
                continue;
            }
            $nomeHistorico = (string) ($arquivoHistorico->nome ?? 'Arquivo da origem');
            ?>
            <li class="min-w-0 space-y-2 overflow-hidden rounded-xl border border-border bg-surface-subtle p-3">
                <?php if (($arquivoHistorico->imagem ?? false) && ($arquivoHistorico->tem_miniatura ?? false)) { ?>
                    <img src="<?= e(site_url('os/anexo/' . $idHistorico . '/thumb')) ?>" alt="<?= e('Imagem anterior: ' . $nomeHistorico) ?>" loading="lazy" class="aspect-[8/5] w-full rounded-lg object-contain">
                <?php } ?>
                <p class="break-words text-label-md text-text"><?= e($nomeHistorico) ?></p>
                <p class="break-words text-caption text-muted"><?= e('Entrada da OS de origem: ' . (string) ($arquivoHistorico->data_origem ?? 'Não informada')) ?></p>
                <?= component('button', ['label' => 'Baixar arquivo anterior: ' . $nomeHistorico, 'variant' => 'ghost', 'href' => site_url('os/downloadanexo/' . $idHistorico)]) ?>
            </li>
        <?php } ?>
    </ul>
</section>
