<?php
/** Player local compartilhado pela OS, painel de publicação e página do cliente. */
?>
<?= component('modal', [
    'id' => 'trifase-video',
    'title' => 'Vídeo do anexo',
    'size' => 'xl',
    'close_label' => 'Fechar vídeo',
    'attrs' => ['data-module' => 'trifase/video'],
    'footer' => component('button', ['label' => 'Baixar vídeo', 'variant' => 'outline', 'href' => '#', 'attrs' => ['data-trifase-video-baixar' => true]]),
]) ?>
