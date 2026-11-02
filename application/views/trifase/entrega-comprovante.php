<?php $retirada = $comprovante['evento']; ?>
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow, noarchive">
    <title><?= e('Entrega da OS #' . (int) $osEntrega->idOs . ' — registro #' . (int) $retirada->id) ?></title>
    <link rel="stylesheet" href="<?= e(base_url('assets/dist/imprimir.css')) ?>">
    <script type="module" src="<?= e(base_url('assets/js/app.js')) ?>"></script>
</head>
<body>
    <nav class="recibo-acoes" aria-label="Ações do comprovante">
        <a href="<?= e(site_url('os/visualizar/' . (int) $osEntrega->idOs)) ?>">Voltar à OS</a>
        <button type="button" <?= js_module('trifase/imprimir') ?>>Imprimir comprovante</button>
    </nav>
    <main class="doc-folha recibo-folha">
        <header class="doc-cabecalho">
            <div><h1 class="text-xl font-bold">Registro de entrega do equipamento</h1><p><?= e('OS #' . (int) $osEntrega->idOs . ' · registro #' . (int) $retirada->id) ?></p></div>
            <p><?= e('Consulta em ' . date('d/m/Y H:i')) ?></p>
        </header>
        <p class="my-4 font-bold"><?= e($emitente !== null ? $emitente->nome : 'Emitente não configurado. Complete os dados da empresa antes de entregar este documento.') ?></p>
        <?php if ($comprovante['cancelamento'] !== null) { ?>
            <p class="my-4 border-2 border-danger p-4 font-bold"><?= e('REGISTRO CANCELADO em ' . date('d/m/Y H:i', strtotime($comprovante['cancelamento']->registrado_em)) . '. Consulte o histórico para localizar uma nova entrega.') ?></p>
        <?php } ?>
        <dl class="my-4 grid gap-4">
            <div><dt class="font-bold">Cliente</dt><dd><?= e($osEntrega->nomeCliente) ?></dd></div>
            <div><dt class="font-bold">Retirado por</dt><dd><?= e($retirada->recebedor . ((int) $retirada->terceiro === 1 ? ' · terceiro autorizado' : ' · próprio cliente')) ?></dd></div>
            <div><dt class="font-bold">Data e hora reais da retirada</dt><dd><?= e(date('d/m/Y H:i', strtotime($retirada->entregue_em))) ?></dd></div>
            <div><dt class="font-bold">Equipamento registrado na ocasião</dt><dd class="whitespace-pre-wrap break-words"><?= e(osTextoWhatsApp('{TEXTO}', ['{TEXTO}' => $retirada->equipamento])) ?></dd></div>
            <div><dt class="font-bold">Itens entregues e conferidos</dt><dd class="whitespace-pre-wrap break-words"><?= e($retirada->itens) ?></dd></div>
            <div><dt class="font-bold">Registro pelo atendente</dt><dd><?= e('Operador #' . (int) $retirada->usuario_id . ' em ' . date('d/m/Y H:i', strtotime($retirada->registrado_em))) ?></dd></div>
        </dl>
        <p>Este documento registra a retirada informada pelo atendente. Não representa quitação financeira nem assinatura eletrônica do recebedor. A garantia e os pagamentos são consultados separadamente.</p>
    </main>
</body>
</html>
