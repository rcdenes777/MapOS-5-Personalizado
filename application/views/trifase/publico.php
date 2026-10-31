<!DOCTYPE html>
<html lang="pt-br" data-tema="padrao" data-tema-modo="claro">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow, noarchive">
    <title><?= e('Acompanhar OS #' . $os['id']) ?></title>
    <link rel="stylesheet" href="<?= e($basePublica . 'assets/dist/app.css') ?>">
</head>
<body class="bg-canvas text-text">
    <main class="mx-auto flex max-w-3xl flex-col gap-4 p-4 sm:p-6">
        <header>
            <p class="text-caption text-muted">Acompanhamento da ordem de serviço</p>
            <h1 class="font-display text-heading-xl"><?= e('OS #' . $os['id']) ?></h1>
        </header>
        <section class="rounded-card border border-border bg-surface p-4" aria-labelledby="andamento">
            <h2 id="andamento" class="text-heading-sm">Andamento</h2>
            <div class="mt-3"><?= component('pill-status', osStatusPill($os['status'])) ?></div>
            <dl class="mt-4 grid gap-3 sm:grid-cols-2">
                <div><dt class="text-caption text-muted">Entrada</dt><dd><?= e($os['inicio'] !== '' ? dataBr($os['inicio']) : 'Não informada') ?></dd></div>
                <div><dt class="text-caption text-muted">Previsão</dt><dd><?= e($os['previsao'] !== '' ? dataBr($os['previsao']) : 'Não informada') ?></dd></div>
            </dl>
        </section>
        <section class="rounded-card border border-border bg-surface p-4" aria-labelledby="equipamento">
            <h2 id="equipamento" class="text-heading-sm">Equipamento</h2>
            <p class="mt-3 whitespace-pre-wrap break-words text-body-md"><?= e($os['equipamento']) ?></p>
        </section>
        <section class="rounded-card border border-border bg-surface p-4" aria-labelledby="anexos">
            <h2 id="anexos" class="text-heading-sm">Arquivos compartilhados</h2>
            <ul class="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2" aria-label="Anexos compartilhados">
                <?php foreach ($anexos as $anexo) { ?>
                    <li class="flex min-w-0 flex-col overflow-hidden rounded-card border border-border bg-surface">
                        <?php $this->load->view('trifase/miniatura', ['nomeMiniatura' => $anexo['nome'], 'urlMiniatura' => $anexo['miniatura'], 'urlImagem' => $anexo['imagem'], 'extensaoMiniatura' => $anexo['extensao']]); ?>
                        <div class="flex flex-col gap-2 p-3">
                            <p class="text-label-md"><?= e($anexo['nome']) ?></p>
                            <?= component('button', ['label' => 'Baixar ' . $anexo['nome'], 'variant' => 'outline', 'size' => 'sm', 'href' => $anexo['url']]) ?>
                        </div>
                    </li>
                <?php } ?>
            </ul>
            <?php if ($anexos === []) { ?>
                <p class="mt-3 text-body-md text-muted">Nenhum arquivo compartilhado nesta OS.</p>
            <?php } ?>
        </section>
        <p class="text-caption text-muted">Este link é privado. Compartilhe apenas com pessoas autorizadas.</p>
    </main>
</body>
</html>
