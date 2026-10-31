<?php
/** Trecho compartilhado: o controller de destino sempre revalida o acesso. */
if ($urlMiniatura !== null) { ?>
    <a href="<?= e($urlImagem) ?>" data-trifase-imagem data-trifase-nome="<?= e($nomeMiniatura) ?>" data-trifase-download="<?= e($urlDownload) ?>" class="relative flex aspect-[8/5] items-center justify-center overflow-hidden bg-surface-subtle focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-ring" aria-label="<?= e('Ampliar ' . $nomeMiniatura) ?>" aria-haspopup="dialog" aria-controls="trifase-galeria">
        <img src="<?= e($urlMiniatura) ?>" alt="<?= e($nomeMiniatura) ?>" loading="lazy" decoding="async" class="absolute inset-0 size-full object-contain">
    </a>
<?php } elseif (! empty($urlVideo)) { ?>
    <a href="<?= e($urlVideo) ?>" data-trifase-video data-trifase-nome="<?= e($nomeMiniatura) ?>" data-trifase-download="<?= e($urlDownload) ?>" class="flex aspect-[8/5] flex-col items-center justify-center gap-2 bg-surface-subtle text-muted focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-ring" aria-label="<?= e('Reproduzir ' . $nomeMiniatura) ?>" aria-haspopup="dialog" aria-controls="trifase-video">
        <?= icon('file', ['class' => 'size-10']) ?>
        <span class="text-caption"><?= e('Reproduzir vídeo · ' . $extensaoMiniatura) ?></span>
    </a>
<?php } else { ?>
    <div class="flex aspect-[8/5] flex-col items-center justify-center gap-2 bg-surface-subtle text-muted">
        <?= icon('file', ['class' => 'size-10']) ?>
        <span class="text-caption"><?= e($extensaoMiniatura !== '' ? $extensaoMiniatura : 'Arquivo') ?></span>
    </div>
<?php } ?>
