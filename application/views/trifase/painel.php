<?php
$caixa = 'rounded-xl border border-border bg-surface p-4 sm:p-6';
$filas = $operacional['filas'] ?? [];
$cards = [];
foreach ($filas as $fila => $resumoFila) {
    $cards[] = ['label' => $resumoFila['label'], 'value' => $resumoFila['total'], 'accent' => $fila === 'retirada' ? 'success' : ($fila === 'retornos' ? 'warning' : 'info'), 'href' => site_url('os') . listagemQuery(['fila' => $fila])];
}
if ($operacional !== null) {
    array_splice($cards, min(2, count($cards)), 0, [[
        'label' => 'Aguardando peças', 'value' => (int) ($operacional['status']['Aguardando Peças'] ?? 0), 'accent' => 'warning',
        'href' => site_url('os') . listagemQuery(['status' => 'Aguardando Peças']),
    ]]);
}
?>
<div class="flex flex-col gap-5 pt-2 pb-8" <?= js_module('painel/painel') ?> data-painel-assistencia>
    <header class="flex flex-wrap items-start justify-between gap-3">
        <div>
            <h1 class="font-display text-heading-xl text-text">Painel da assistência</h1>
            <p class="mt-1 text-body-md text-muted"><?= e(ucfirst(painelDataPorExtenso($hoje))) ?></p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
            <?= component('button', ['label' => 'Agenda e gráficos', 'variant' => 'ghost', 'href' => site_url('mapos') . '?visao=classica']) ?>
            <?php if ($pode['lancamentos']) { ?>
                <?= component('button', ['label' => 'Ocultar valores', 'icon' => 'eye-off', 'variant' => 'ghost', 'class' => 'painel-valores-ocultar', 'attrs' => ['data-valores-alternar' => true]]) ?>
                <?= component('button', ['label' => 'Mostrar valores', 'icon' => 'eye', 'variant' => 'ghost', 'class' => 'painel-valores-mostrar', 'attrs' => ['data-valores-alternar' => true]]) ?>
            <?php } ?>
        </div>
    </header>

    <?php foreach ($avisos_sistema ?? [] as $aviso) { ?>
        <?= component('alert', ['variant' => 'warning', 'message' => $aviso]) ?>
    <?php } ?>
    <?php if (! empty($instalador_no_servidor)) { ?>
        <?= component('alert', ['variant' => 'warning', 'message' => 'A pasta install ainda está no servidor. Ela já não funciona, mas apague-a do servidor para não deixar arquivos desnecessários expostos.']) ?>
    <?php } ?>

    <?php if ($operacional !== null) { ?>
        <section aria-labelledby="painel-filas-titulo">
            <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 id="painel-filas-titulo" class="text-heading-md text-text">Ordens de serviço</h2>
                <?= component('button', ['label' => 'Ver OS', 'variant' => 'ghost', 'href' => site_url('os')]) ?>
            </div>
            <div class="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
                <?php foreach ($cards as $card) { ?>
                    <?= component('kpi-card', $card) ?>
                <?php } ?>
            </div>
            <p class="mt-2 text-caption text-muted">As filas podem incluir a mesma OS. Orçamentos incluem negociação; retirada considera serviço finalizado sem entrega registrada.</p>
        </section>

        <div class="grid gap-4 xl:grid-cols-3">
            <section class="<?= e($caixa) ?> min-w-0 xl:col-span-2" aria-labelledby="painel-atencao-titulo">
                <h2 id="painel-atencao-titulo" class="text-heading-md text-text">Precisam de atenção</h2>
                <p class="mt-1 text-caption text-muted">Até seis atendimentos em aberto ou orçamento, pela previsão mais próxima.</p>
                <?php if ($operacional['atencao'] === []) { ?>
                    <?= component('empty-state', ['title' => 'Nenhum atendimento em aberto', 'message' => 'As próximas OS aparecem aqui pela previsão de entrega.', 'icon' => 'circle-check', 'class' => 'border-0']) ?>
                <?php } else { ?>
                    <ul class="mt-3 divide-y divide-border">
                        <?php foreach ($operacional['atencao'] as $linha) { ?>
                            <li class="flex flex-col gap-2 py-4 sm:flex-row sm:items-start sm:justify-between">
                                <div class="min-w-0 [overflow-wrap:anywhere]">
                                    <?= component('link', ['label' => 'OS #' . (int) $linha->idOs . ' · ' . ($linha->nomeCliente ?? 'Cliente removido'), 'href' => site_url('os/visualizar/' . (int) $linha->idOs), 'class' => 'font-medium']) ?>
                                    <p class="mt-1 text-body-md text-muted"><?= e(osTextoCurto($linha->descricaoProduto, 90)) ?></p>
                                    <?php if ($linha->dataFinal && $linha->dataFinal !== '0000-00-00') { ?>
                                        <p class="mt-1 text-caption text-muted"><?= e(($linha->dataFinal < $hoje ? 'Previsão vencida · ' : 'Previsão · ') . dataBr($linha->dataFinal)) ?></p>
                                    <?php } else { ?>
                                        <p class="mt-1 text-caption text-muted">Sem previsão informada</p>
                                    <?php } ?>
                                </div>
                                <div class="shrink-0"><?= component('pill-status', osStatusPill($linha->status)) ?></div>
                            </li>
                        <?php } ?>
                    </ul>
                <?php } ?>
            </section>

            <?php if (isset($filas['retirada'])) { ?>
                <section class="<?= e($caixa) ?> min-w-0" aria-labelledby="painel-retirada-titulo">
                    <h2 id="painel-retirada-titulo" class="text-heading-md text-text">Prontas para retirada</h2>
                    <p class="mt-1 text-caption text-muted">Serviço finalizado; entrega física ainda não registrada.</p>
                    <?php if ($operacional['retirada'] === []) { ?>
                        <?= component('empty-state', ['title' => 'Nenhuma retirada pendente', 'message' => 'As OS finalizadas sem entrega registrada aparecem aqui.', 'icon' => 'circle-check', 'class' => 'border-0']) ?>
                    <?php } else { ?>
                        <ul class="mt-3 divide-y divide-border">
                            <?php foreach ($operacional['retirada'] as $linha) { ?>
                                <li class="py-3 [overflow-wrap:anywhere]">
                                    <?= component('link', ['label' => 'OS #' . (int) $linha->idOs . ' · ' . ($linha->nomeCliente ?? 'Cliente removido'), 'href' => site_url('os/visualizar/' . (int) $linha->idOs), 'class' => 'font-medium']) ?>
                                    <p class="mt-1 text-caption text-muted"><?= e(osTextoCurto($linha->descricaoProduto, 70)) ?></p>
                                </li>
                            <?php } ?>
                        </ul>
                    <?php } ?>
                    <div class="mt-3"><?= component('button', ['label' => 'Ver todas as retiradas', 'variant' => 'ghost', 'href' => site_url('os') . listagemQuery(['fila' => 'retirada'])]) ?></div>
                </section>
            <?php } ?>
        </div>

        <section class="<?= e($caixa) ?>" aria-labelledby="painel-status-titulo">
            <h2 id="painel-status-titulo" class="text-heading-sm text-text">Andamento do serviço</h2>
            <div class="mt-3 flex flex-wrap gap-2">
                <?php foreach ($operacional['status'] as $status => $quantidade) { ?>
                    <?php if (isset(OS_STATUS_VARIANTES[$status])) { ?>
                        <?= component('button', ['label' => $status . ' · ' . $quantidade, 'variant' => 'outline', 'size' => 'sm', 'href' => site_url('os') . listagemQuery(['status' => $status])]) ?>
                    <?php } else { ?>
                        <?= component('pill-status', ['label' => $status . ' · ' . $quantidade, 'variant' => 'neutral']) ?>
                    <?php } ?>
                <?php } ?>
                <?php if ($operacional['status'] === []) { ?>
                    <p class="text-body-md text-muted">Nenhuma OS cadastrada.</p>
                <?php } ?>
            </div>
        </section>
    <?php } ?>

    <div class="grid gap-4 xl:grid-cols-3">
        <?php if ($pode['lancamentos']) { ?>
            <section class="<?= e($caixa) ?> min-w-0 xl:col-span-2" aria-labelledby="painel-financeiro-titulo">
                <h2 id="painel-financeiro-titulo" class="text-heading-md text-text">Financeiro</h2>
                <dl class="mt-4 grid gap-5 sm:grid-cols-2">
                    <div>
                        <dt class="text-body-md text-muted"><?= e('Recebido em ' . substr($hoje, 5, 2) . '/' . substr($hoje, 0, 4)) ?></dt>
                        <dd class="mt-1">
                            <div class="font-display text-heading-lg text-text"><?= component('valor-sensivel', ['value' => dinheiro($recebido_mes)]) ?></div>
                            <p class="mt-2 text-caption text-muted">Todas as receitas pagas no mês. Reembolsos aparecem como despesas.</p>
                        </dd>
                    </div>
                    <?php if ($financeiro_os !== null) { ?>
                        <div>
                            <dt class="text-body-md text-muted">Saldo das OS a receber</dt>
                            <dd class="mt-1">
                                <div class="font-display text-heading-lg text-text"><?= component('valor-sensivel', ['value' => dinheiro($financeiro_os['saldo_c'] / 100)]) ?></div>
                                <p class="mt-2 text-caption text-muted"><?= component('valor-sensivel', ['value' => $financeiro_os['quantidade'] . ' OS com saldo registrado. Faturas antigas sem apuração não entram.']) ?></p>
                                <div class="mt-2"><?= component('button', ['label' => 'Ver OS com saldo', 'variant' => 'ghost', 'href' => site_url('os') . listagemQuery(['saldo' => 'pendente'])]) ?></div>
                            </dd>
                        </div>
                    <?php } ?>
                </dl>
                <div class="mt-4"><?= component('button', ['label' => 'Abrir financeiro', 'variant' => 'outline', 'href' => site_url('financeiro/lancamentos')]) ?></div>
            </section>
        <?php } ?>
        <section class="<?= e($caixa) ?> min-w-0" aria-labelledby="painel-atalhos-titulo">
            <h2 id="painel-atalhos-titulo" class="text-heading-md text-text">Acesso rápido</h2>
            <div class="mt-3 flex flex-col items-start gap-2">
                <?php foreach ($atalhos as $atalho) { ?>
                    <?= component('button', $atalho + ['variant' => 'ghost']) ?>
                <?php } ?>
                <?php if ($atalhos === []) { ?>
                    <p class="text-body-md text-muted">Os atalhos aparecem conforme suas permissões de acesso.</p>
                <?php } ?>
            </div>
        </section>
    </div>
</div>
