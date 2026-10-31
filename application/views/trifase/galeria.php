<?php
/** Reutiliza o dialog e os controles do design system, sem HTML dinâmico em slots. */
?>
<?= component('modal', [
    'id' => 'trifase-galeria',
    'title' => 'Imagem do anexo',
    'size' => 'xl',
    'close_label' => 'Fechar imagem',
    'attrs' => ['data-module' => 'trifase/galeria-zoom'],
    'footer' => [
        component('button', ['label' => 'Ampliar', 'icon' => 'search', 'variant' => 'outline', 'disabled' => true, 'attrs' => ['data-trifase-ampliar' => true, 'title' => 'Ampliar imagem até 8 vezes']]),
        component('button', ['label' => 'Reduzir', 'variant' => 'outline', 'disabled' => true, 'attrs' => ['data-trifase-reduzir' => true]]),
        component('button', ['label' => 'Ajustar', 'variant' => 'ghost', 'disabled' => true, 'attrs' => ['data-trifase-ajustar' => true, 'title' => 'Voltar à imagem inteira']]),
        component('button', ['label' => 'Baixar imagem', 'variant' => 'outline', 'href' => '#', 'attrs' => ['data-trifase-baixar' => true]]),
    ],
]) ?>
