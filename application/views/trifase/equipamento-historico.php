<?php require_once APPPATH . 'helpers/trifase_cadastro_helper.php';
require_once APPPATH . 'helpers/trifase_garantia_helper.php';
$substituicaoHistorico = trifaseGarantiaUnidadeSubstituida($this->db, (int) $equipamento->id);
$origemSubstitutaHistorico = $this->db->table_exists('trifase_garantia_trocas') ? $this->db->where('nova_id', (int) $equipamento->id)->get('trifase_garantia_trocas', 1)->row() : null;
?>
<div class="flex flex-col gap-5 py-4">
    <header class="flex flex-wrap items-start justify-between gap-3">
        <div><h1 class="text-heading-xl text-text"><?= e('Equipamento #' . (int) $equipamento->id) ?></h1><p class="mt-2 text-body-md text-muted"><?= e($equipamento->marca . ' · ' . $equipamento->modelo) ?></p></div>
        <?php if ($podeNovaOs && ! $substituicaoHistorico) { ?><?= component('button', ['label' => 'Nova OS deste equipamento', 'icon' => 'plus', 'href' => site_url('os/adicionar') . '?equipamento_id=' . (int) $equipamento->id]) ?><?php } ?>
    </header>
    <?php foreach (array_filter([$substituicaoHistorico, $origemSubstitutaHistorico]) as $trocaHistorico) { ?>
        <section class="rounded-card border border-border bg-surface p-4">
            <h2 class="text-heading-sm text-text">Substituição em garantia</h2>
            <div class="mt-3 flex flex-wrap gap-3">
                <?= component('link', ['label' => 'Unidade anterior #' . (int) $trocaHistorico->antiga_id, 'href' => site_url('trifase_equipamentos/visualizar/' . (int) $trocaHistorico->antiga_id)]) ?>
                <?= component('link', ['label' => 'Substituta #' . (int) $trocaHistorico->nova_id, 'href' => site_url('trifase_equipamentos/visualizar/' . (int) $trocaHistorico->nova_id)]) ?>
                <?= component('link', ['label' => 'Retorno #' . (int) $trocaHistorico->os_id, 'href' => site_url('trifase_retornos/visualizar/' . (int) $trocaHistorico->os_id)]) ?>
            </div>
            <p class="mt-2 text-caption text-muted">Unidade anterior preservada no histórico; atendimentos seguintes usam a substituta. Prazo original preservado.</p>
        </section>
    <?php } ?>
    <?php if (trifaseCadastrosHabilitados()) { ?>
        <nav class="flex flex-wrap gap-4" aria-label="Cadastros do equipamento">
            <?= component('link', ['label' => 'Identificação atual e correções', 'href' => site_url('trifase_cadastros/unidade/' . (int) $equipamento->id)]) ?>
            <?= component('link', ['label' => 'Consultar ou editar modelo', 'href' => site_url('trifase_cadastros/modelo/' . (int) $equipamento->modelo_id)]) ?>
            <?= component('link', ['label' => 'Marcas e modelos', 'href' => site_url('trifase_cadastros/catalogo')]) ?>
        </nav>
    <?php } ?>
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
