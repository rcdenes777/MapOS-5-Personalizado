<?php
$evento = $recibo['evento'];
$estorno = $recibo['estorno'];
$identificador = 'OS ' . (int) $osRecibo->idOs . ' / recebimento ' . (int) $evento->id;
?>
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow, noarchive">
    <title><?= e('Recibo — ' . $identificador) ?></title>
    <link rel="stylesheet" href="<?= e(base_url('assets/dist/imprimir.css')) ?>">
    <script type="module" src="<?= e(base_url('assets/js/app.js')) ?>"></script>
</head>
<body>
    <nav class="recibo-acoes" aria-label="Ações do recibo">
        <a href="<?= e(site_url('trifase_financeiro/visualizar/' . (int) $osRecibo->idOs)) ?>">Voltar ao financeiro da OS</a>
        <button type="button" <?= js_module('trifase/imprimir') ?>>Imprimir recibo</button>
    </nav>
    <main class="doc-folha recibo-folha">
        <header class="doc-cabecalho">
            <div>
                <h1 class="text-xl font-bold"><?= e($estorno !== null ? 'Registro de recebimento estornado' : 'Recibo de recebimento') ?></h1>
                <p><?= e($identificador) ?></p>
            </div>
            <p><?= e('Consulta em ' . date('d/m/Y H:i')) ?></p>
        </header>
        <?php if ($emitente !== null) { ?>
            <section class="my-4" aria-label="Emitente">
                <h2 class="text-lg font-bold"><?= e($emitente->nome) ?></h2>
                <p><?= e($emitente->cnpj) ?></p>
                <p><?= e(trim((string) $emitente->telefone . ' · ' . (string) $emitente->email, ' ·')) ?></p>
            </section>
        <?php } else { ?>
            <p class="my-4 font-bold">Emitente não configurado. Complete os dados da empresa antes de entregar este documento.</p>
        <?php } ?>
        <?php if ($estorno !== null) { ?>
            <p class="my-4 border-2 border-danger p-4 font-bold"><?= e('ESTORNADO em ' . dataBr($estorno->data_evento) . '. Este registro não compõe o valor recebido da OS.') ?></p>
        <?php } ?>
        <section class="my-4" aria-label="Dados do recebimento">
            <h2 class="doc-subtitulo">Pagamento registrado</h2>
            <dl class="my-4 grid gap-4">
                <div><dt class="font-bold">Cliente</dt><dd><?= e($osRecibo->nomeCliente) ?></dd></div>
                <div><dt class="font-bold">Data do recebimento</dt><dd><?= e(dataBr($evento->data_evento)) ?></dd></div>
                <div><dt class="font-bold">Valor deste recebimento</dt><dd class="text-xl font-bold"><?= e(dinheiro($evento->valor_c / 100)) ?></dd></div>
                <div><dt class="font-bold">Forma de pagamento</dt><dd><?= e($evento->forma) ?></dd></div>
            </dl>
            <p>Este documento corresponde somente ao pagamento identificado acima. Outros recebimentos, saldo e andamento do serviço são consultados separadamente na OS.</p>
        </section>
    </main>
</body>
</html>
