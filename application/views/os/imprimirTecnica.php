<?php
/** Documento operacional sem valores, independente da apresentação solicitada. */
?>
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><?= e('OS #' . (int) $result->idOs . ' — Atendimento técnico') ?></title>
    <link rel="stylesheet" href="<?= e(base_url('assets/dist/imprimir.css')) ?>">
</head>
<body>
    <main class="<?= ! empty($termica) ? 'cupom' : 'doc-folha' ?>">
        <header class="doc-cabecalho">
            <h1><?= e('Ordem de serviço #' . (int) $result->idOs) ?></h1>
            <p><?= e($emitente->nome ?? '') ?></p>
            <p><?= e('Cliente: ' . $result->nomeCliente) ?></p>
            <p><?= e('Andamento: ' . $result->status . ' · Entrada: ' . dataBr($result->dataInicial)) ?></p>
        </header>
        <?php foreach (['Equipamento' => $result->descricaoProduto, 'Defeito relatado' => $result->defeito, 'Observações' => $result->observacoes, 'Laudo técnico' => $result->laudoTecnico] as $rotulo => $valor) { ?>
            <section class="mt-4">
                <h2><?= e($rotulo) ?></h2>
                <div><?= componenteConteudo(osTextoExibicao($valor ?? '')) ?></div>
            </section>
        <?php } ?>
        <section class="mt-4">
            <h2>Peças e serviços</h2>
            <table class="w-full">
                <thead><tr><th class="text-left">Descrição</th><th>Quantidade</th></tr></thead>
                <tbody>
                    <?php foreach (array_merge($produtos, $servicos) as $item) { ?>
                        <tr><td><?= e($item->descricao ?? $item->nome) ?></td><td><?= e((string) (0 + $item->quantidade)) ?></td></tr>
                    <?php } ?>
                </tbody>
            </table>
        </section>
        <p class="mt-4">Registro do atendimento técnico. Cobranças e recebimentos são consultados no financeiro.</p>
    </main>
</body>
</html>
