<div class="flex flex-col gap-5 py-4">
    <header class="flex flex-wrap items-start justify-between gap-3">
        <div><h1 class="text-heading-xl text-text"><?= e('Equipamento #' . (int) $equipamento->id) ?></h1><p class="mt-2 text-body-md text-muted"><?= e($equipamento->marca . ' · ' . $equipamento->modelo) ?></p></div>
        <?php if ($podeNovaOs) { ?><?= component('button', ['label' => 'Nova OS deste equipamento', 'icon' => 'plus', 'href' => site_url('os/adicionar') . '?equipamento_id=' . (int) $equipamento->id]) ?><?php } ?>
    </header>
    <section class="rounded-card border border-border bg-surface p-5">
        <h2 class="mb-3 text-heading-sm text-text">Identificação da unidade</h2>
        <dl class="grid gap-4 sm:grid-cols-3">
            <?php foreach (['selo' => 'Selo de garantia', 'serie' => 'Número de série', 'imei' => 'IMEI'] as $campoUnidade => $rotuloUnidade) { ?>
                <div><dt class="text-label-md text-muted"><?= e($rotuloUnidade) ?></dt><dd class="break-words text-body-md text-text"><?= e($equipamento->$campoUnidade !== '' ? $equipamento->$campoUnidade : 'Não informado') ?></dd></div>
            <?php } ?>
        </dl>
    </section>
    <section class="rounded-card border border-border bg-surface p-5">
        <h2 class="mb-3 text-heading-sm text-text">Atendimentos desta unidade</h2>
        <p class="mb-4 text-caption text-muted">Cada OS preserva sua identificação e os dados da entrada. Um novo atendimento não reabre ou altera os anteriores.</p>
        <ol class="grid gap-4">
            <?php foreach ($historicoEquipamento as $atendimentoEquipamento) { ?>
                <li class="rounded-sm border border-border p-4">
                    <div class="flex flex-wrap items-center justify-between gap-3">
                        <?= component('link', ['label' => 'OS #' . (int) $atendimentoEquipamento->idOs, 'href' => site_url('os/visualizar/' . (int) $atendimentoEquipamento->idOs)]) ?>
                        <?= component('pill-status', osStatusPill($atendimentoEquipamento->status)) ?>
                    </div>
                    <p class="mt-2 text-caption text-muted"><?= e('Entrada em ' . dataBr($atendimentoEquipamento->dataInicial) . ' · ' . $atendimentoEquipamento->marca . ' · ' . $atendimentoEquipamento->modelo) ?></p>
                    <dl class="mt-3 grid gap-3">
                        <div><dt class="text-label-md text-muted">Itens recebidos</dt><dd class="whitespace-pre-wrap break-words text-body-md text-text"><?= e($atendimentoEquipamento->itens_recebidos) ?></dd></div>
                        <div><dt class="text-label-md text-muted">Estado na entrada</dt><dd class="whitespace-pre-wrap break-words text-body-md text-text"><?= e($atendimentoEquipamento->estado_entrada) ?></dd></div>
                    </dl>
                </li>
            <?php } ?>
        </ol>
    </section>
</div>
