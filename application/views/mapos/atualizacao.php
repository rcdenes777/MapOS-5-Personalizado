<?php
/**
 * Consulta da versão oficial do Map-OS e das notas da release.
 *
 * @var string      $versao_atual
 * @var array|null  $release         Github_updater::ultimaRelease()
 * @var string|null $erro
 */
$caixa = 'rounded-xl border border-border bg-surface p-4 sm:p-6';
$notas = $release !== null ? trim($release['notas']) : '';
?>
<div class="flex max-w-3xl flex-col gap-4 pt-2 pb-8">
    <header>
        <h1 class="font-display text-heading-xl text-text">Consultar versão oficial do Map-OS</h1>
        <p class="text-caption text-muted">Versão instalada: <?= e($versao_atual) ?></p>
    </header>

    <?= component('alert', ['variant' => 'warning', 'message' => 'A aplicação de releases oficiais está bloqueada no MapOS 5 Personalizado.']) ?>

    <?php if ($erro !== null) { ?>
        <?= component('alert', ['variant' => 'danger', 'message' => $erro]) ?>
    <?php } elseif ($release === null) { ?>
        <?= component('empty-state', ['icon' => 'package', 'title' => 'Nenhuma versão publicada', 'message' => 'O GitHub ainda não tem uma release oficial com tag.']) ?>
    <?php } else { ?>
        <section class="<?= e($caixa) ?>" aria-labelledby="secao-versao">
            <div class="flex flex-wrap items-center gap-2">
                <h2 id="secao-versao" class="text-heading-sm text-text">Versão oficial <?= e($release['versao']) ?></h2>
                <?php if ($release['prerelease']) { ?>
                    <?= component('pill-status', ['label' => 'Pré-release', 'variant' => 'warning']) ?>
                <?php } ?>
            </div>
            <?php if ($release['publicada_em'] !== '') { ?>
                <p class="mt-1 text-caption text-muted">Publicada em <?= e(dataBr(substr($release['publicada_em'], 0, 10))) ?></p>
            <?php } ?>

            <h3 class="mt-4 text-label-md text-text">O que mudou</h3>
            <?php if ($notas !== '') { ?>
                <pre class="mt-2 max-h-96 overflow-y-auto rounded-md border border-border bg-surface-subtle p-3 font-sans text-caption whitespace-pre-wrap text-text"><?= e(mb_strimwidth($notas, 0, 8000, '…')) ?></pre>
            <?php } else { ?>
                <p class="mt-2 text-caption text-muted">Esta release não tem descrição.</p>
            <?php } ?>

        </section>
    <?php } ?>

    <div class="mt-4 flex justify-end">
        <?= component('button', ['label' => 'Voltar', 'variant' => 'ghost', 'href' => site_url('mapos/configurar?aba=sistema')]) ?>
    </div>
</div>
