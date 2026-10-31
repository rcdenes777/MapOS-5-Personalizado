<?php
/** Reutiliza o dialog e os controles do design system, sem HTML dinâmico em slots. */
?>
<?= component('modal', [
    'id' => 'trifase-galeria',
    'title' => 'Imagem do anexo',
    'size' => 'xl',
    'close_label' => 'Fechar imagem',
    'attrs' => ['data-module' => 'trifase/galeria'],
    'footer' => component('button', ['label' => 'Baixar imagem', 'variant' => 'outline', 'href' => '#', 'attrs' => ['data-trifase-baixar' => true]]),
]) ?>
