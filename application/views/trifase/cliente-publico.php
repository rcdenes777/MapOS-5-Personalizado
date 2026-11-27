<?php
$dinheiro = static fn (int $centavos): string => 'R$ ' . number_format($centavos / 100, 2, ',', '.');
$filtros = ['' => 'Todas'];
if ($financeiroDisponivel) {
    $filtros += ['pendente' => 'A pagar', 'pago' => 'Pagas'];
}
$filtros += ['entregue' => 'Entregues', 'nao-entregue' => 'Não entregues'];
?>
<!DOCTYPE html>
<html lang="pt-br" data-tema="padrao" data-tema-modo="claro">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow, noarchive">
    <title>Acompanhamento de ordens de serviço</title>
    <link rel="stylesheet" href="<?= e($basePublica . 'assets/dist/app.css') ?>">
</head>
<body class="bg-canvas text-text">
<main class="mx-auto flex max-w-3xl flex-col gap-4 p-4 sm:p-6">
    <header>
        <p class="text-caption text-muted">Acompanhamento de ordens de serviço</p>
        <h1 class="font-display text-heading-xl"><?= e($cliente->nomeCliente) ?></h1>
    </header>
    <?php if (! $detalhe) { ?>
        <section class="rounded-card border border-border bg-surface p-4" aria-label="Resumo">
            <h2 class="text-heading-sm">Resumo</h2>
            <dl class="mt-4 grid grid-cols-2 gap-4">
                <div><dt class="text-caption text-muted">Ordens de serviço</dt><dd><?= e($total) ?></dd></div>
                <?php if ($financeiro !== null) { ?>
                    <div><dt class="text-caption text-muted">Total cobrado</dt><dd><?= e($dinheiro($financeiro['total_c'])) ?></dd></div>
                    <div><dt class="text-caption text-muted">Total pago</dt><dd><?= e($dinheiro($financeiro['pago_c'])) ?></dd></div>
                    <div><dt class="text-caption text-muted">Saldo a pagar</dt><dd><?= e($dinheiro($financeiro['saldo_c'])) ?></dd></div>
                <?php } ?>
            </dl>
            <?php if ($financeiroDisponivel) { ?><p class="mt-3 text-caption text-muted">Valores incluem apenas cobranças formalizadas. OS sem cobrança formalizada aparecem sem valor.</p><?php } ?>
        </section>
        <nav class="flex flex-wrap gap-3" aria-label="Filtrar ordens">
            <?php foreach ($filtros as $valor => $rotulo) { ?>
                <a class="underline" href="<?= e($urlPortal . ($valor === '' ? '' : '?filtro=' . rawurlencode($valor))) ?>" <?= $filtro === $valor ? 'aria-current="page"' : '' ?>><?= e($rotulo) ?></a>
            <?php } ?>
        </nav>
    <?php } else { ?>
        <a class="underline" href="<?= e($urlPortal) ?>">Voltar às ordens</a>
    <?php } ?>
    <section class="flex flex-col gap-4" aria-label="Ordens de serviço">
        <?php foreach ($ordens as $ordem) { ?>
            <article class="rounded-card border border-border bg-surface p-4">
                <h2 class="text-heading-sm"><a class="underline" href="<?= e($urlOs . (int) $ordem->idOs) ?>"><?= e('OS #' . (int) $ordem->idOs) ?></a></h2>
                <dl class="mt-3 grid gap-3 sm:grid-cols-2">
                    <div><dt class="text-caption text-muted">Equipamento</dt><dd class="break-words"><?= e(osTextoCurto($ordem->descricaoProduto) ?: 'Não informado') ?></dd></div>
                    <div><dt class="text-caption text-muted">Serviço</dt><dd><?= e($ordem->status) ?></dd></div>
                    <div><dt class="text-caption text-muted">Entregue</dt><dd><?= e($ordem->entregue ? 'Sim' : 'Não') ?></dd></div>
                    <?php if ($detalhe && isset($ordem->financeiro)) { ?>
                        <div><dt class="text-caption text-muted">Total cobrado</dt><dd><?= e($dinheiro($ordem->financeiro['total_c'])) ?></dd></div>
                        <div><dt class="text-caption text-muted">Total pago</dt><dd><?= e($dinheiro($ordem->financeiro['pago_c'])) ?></dd></div>
                    <?php } ?>
                    <div><dt class="text-caption text-muted">Pagamento</dt><dd><?= e($financeiroDisponivel ? ($ordem->financeiro['situacao'] ?? 'Sem cobrança formalizada') : 'Informação financeira indisponível') ?></dd></div>
                    <div><dt class="text-caption text-muted">Saldo a pagar</dt><dd><?= e(isset($ordem->financeiro) ? $dinheiro($ordem->financeiro['saldo_c']) : '—') ?></dd></div>
                </dl>
            </article>
        <?php } ?>
        <?php if ($detalhe) { ?>
            <section class="rounded-card border border-border bg-surface p-4" aria-label="Arquivos compartilhados">
                <h2 class="text-heading-sm">Arquivos compartilhados</h2>
                <?php if ($anexos === []) { ?><p class="mt-3 text-muted">Nenhum arquivo compartilhado.</p><?php } ?>
                <ul class="mt-3 flex flex-col gap-2">
                    <?php foreach ($anexos as $anexo) { ?>
                        <li><a class="underline" href="<?= e($urlAnexo . (int) $ordens[0]->idOs . '/' . (int) $anexo->idAnexos) ?>"><?= e('Baixar anexo #' . (int) $anexo->idAnexos) ?></a></li>
                    <?php } ?>
                </ul>
            </section>
        <?php } ?>
        <?php if ($ordens === []) { ?><p class="text-muted">Nenhuma ordem encontrada para este filtro.</p><?php } ?>
    </section>
    <p class="text-caption text-muted">Este link é privado. Compartilhe apenas com pessoas autorizadas.</p>
</main>
</body>
</html>
