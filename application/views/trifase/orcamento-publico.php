<!DOCTYPE html>
<html lang="pt-br" data-tema="azul" data-tema-modo="claro">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow, noarchive">
    <title><?= e('Orçamento da OS #' . $retratoOrcamento['os']) ?></title>
    <link rel="stylesheet" href="<?= e($basePublica . 'assets/dist/app.css') ?>">
</head>
<body class="bg-canvas text-text">
    <main class="mx-auto flex max-w-3xl flex-col gap-4 p-4 sm:p-6">
        <header><p class="text-caption text-muted">Orçamento publicado pela assistência</p><h1 class="font-display text-heading-xl"><?= e('OS #' . $retratoOrcamento['os'] . ' · Versão ' . (int) $versaoOrcamento->numero) ?></h1></header>
        <?php $this->load->view('trifase/orcamento-conteudo'); ?>
        <?= component('link', ['label' => 'Voltar ao acompanhamento da OS', 'href' => $voltarOrcamentoUrl]) ?>
    </main>
</body>
</html>
