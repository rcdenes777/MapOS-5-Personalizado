<?php
$idRetorno = (int) $vinculoRetorno->os_id;
$avaliacao = $avaliacaoRetorno;
$editavelRetorno = $podeAvaliarRetorno && $retornoOs->status !== 'Cancelado';
$solucoesRetorno = trifaseRetornoSolucoes();
$custosCorrigidosRetorno = [];
foreach ($eventosRetorno as $eventoCustoRetorno) {
    if ($eventoCustoRetorno->tipo === 'corrigir_custo') {
        $custosCorrigidosRetorno[(int) $eventoCustoRetorno->referencia_id] = true;
    }
}
?>
<div class="mx-auto flex max-w-4xl flex-col gap-5 py-4">
    <header><h1 class="text-heading-xl text-text"><?= e('Retorno em garantia · OS #' . $idRetorno) ?></h1><p class="mt-2 text-body-md text-muted">Avaliação técnica, solução e histórico desta unidade. Pagamento e andamento são registrados na OS.</p></header>
    <div class="flex flex-wrap gap-3">
        <?= component('button', ['label' => 'Abrir OS de retorno', 'variant' => 'outline', 'href' => site_url('os/visualizar/' . $idRetorno)]) ?>
        <?= component('link', ['label' => 'OS de origem #' . (int) $vinculoRetorno->origem_id, 'href' => site_url('os/visualizar/' . (int) $vinculoRetorno->origem_id)]) ?>
        <?= component('link', ['label' => 'Histórico do equipamento', 'href' => site_url('trifase_equipamentos/visualizar/' . (int) $vinculoRetorno->equipamento_id)]) ?>
    </div>
    <?php if ($podeNovoRetorno) { ?><?= component('button', ['label' => 'Registrar novo retorno desta unidade', 'variant' => 'outline', 'href' => site_url('trifase_retornos/novo/' . $idRetorno)]) ?><?php } ?>
    <section class="rounded-card border border-border bg-surface p-4">
        <h2 class="mb-3 text-heading-sm text-text">Referência original</h2>
        <p class="text-body-md text-text"><?= e('Conclusão ' . dataBr($vinculoRetorno->conclusao_origem) . ' · prazo original ' . (int) $vinculoRetorno->prazo_origem . ' dias') ?></p>
        <p class="mt-2 text-body-md text-text"><?= e($vinculoRetorno->vencimento_origem ? 'Garantia da origem até ' . dataBr($vinculoRetorno->vencimento_origem) : 'Sem prazo informado na origem') ?></p>
        <?php if ($vinculoRetorno->vencimento_origem !== null) { ?><p class="mt-2 text-label-md text-text"><?= e($vinculoRetorno->vencimento_origem < date('Y-m-d') ? 'Prazo temporal: fora do prazo' : 'Prazo temporal: dentro do prazo') ?></p><?php } ?>
        <p class="mt-2 text-caption text-muted">O retorno não reinicia esse prazo. Estar dentro dele não confirma cobertura automaticamente.</p>
        <dl class="mt-4 grid gap-3">
            <div><dt class="text-label-md text-muted">Novo defeito relatado</dt><dd class="whitespace-pre-wrap break-words text-body-md text-text"><?= e(html_entity_decode(strip_tags((string) $retornoOs->defeito), ENT_QUOTES | ENT_HTML5, 'UTF-8')) ?></dd></div>
            <div><dt class="text-label-md text-muted">Cobertura</dt><dd class="text-body-md text-text"><?= e(trifaseRetornoCobertura($avaliacao)) ?></dd></div>
            <div><dt class="text-label-md text-muted">Diagnóstico do retorno</dt><dd class="whitespace-pre-wrap break-words text-body-md text-text"><?= e($avaliacao->diagnostico ?? 'Ainda não registrado') ?></dd></div>
            <div><dt class="text-label-md text-muted">Solução escolhida</dt><dd class="text-body-md text-text"><?= e($solucoesRetorno[$avaliacao->solucao ?? '']) ?></dd></div>
        </dl>
    </section>
    <?php if ($editavelRetorno) { ?>
        <section class="rounded-card border border-border bg-surface p-4">
            <details>
            <summary class="text-heading-sm text-text">Registrar ou revisar avaliação</summary>
            <form method="post" action="<?= e(site_url('trifase_retornos/avaliar/' . $idRetorno)) ?>" class="mt-4 grid gap-4" <?= js_module('formulario/padrao') ?>>
                <input type="hidden" name="<?= e($this->security->get_csrf_token_name()) ?>" value="<?= e($this->security->get_csrf_hash()) ?>"><input type="hidden" name="operacao" value="<?= e(bin2hex(random_bytes(16))) ?>"><input type="hidden" name="anterior" value="<?= e((int) ($avaliacao->id ?? 0)) ?>">
                <?= component('select', ['name' => 'cobertura', 'id' => 'retorno-cobertura', 'label' => 'Resultado da avaliação', 'selected' => $avaliacao->cobertura ?? 'avaliacao', 'options' => ['avaliacao' => 'Em avaliação', 'coberto' => 'Coberto', 'nao_coberto' => 'Não coberto'], 'required' => true]) ?>
                <?= component('textarea', ['name' => 'diagnostico', 'id' => 'retorno-diagnostico', 'label' => 'Diagnóstico técnico deste retorno', 'value' => $avaliacao->diagnostico ?? '', 'help' => 'Obrigatório ao concluir a avaliação de cobertura.', 'attrs' => ['maxlength' => 20000, 'rows' => 4]]) ?>
                <?= component('select', ['name' => 'solucao', 'id' => 'retorno-solucao', 'label' => 'Solução escolhida', 'selected' => $avaliacao->solucao ?? '', 'options' => $solucoesRetorno]) ?>
                <?= component('textarea', ['name' => 'motivo', 'id' => 'retorno-motivo', 'label' => 'Justificativa desta decisão ou revisão', 'required' => true, 'attrs' => ['maxlength' => 10000, 'rows' => 3]]) ?>
                <?= component('checkbox', ['name' => 'confirmar', 'id' => 'avaliacao-retorno-confirmar', 'value' => '1', 'label' => 'Conferi cobertura, diagnóstico e solução. Esta decisão não executa cobrança, troca de estoque ou devolução de dinheiro.', 'required' => true]) ?>
                <?= component('button', ['label' => 'Registrar avaliação', 'type' => 'submit']) ?>
            </form>
            </details>
        </section>
    <?php } ?>
    <?php if ($garantiaOperacoes ?? false) {
        $this->load->view('trifase/garantia-operacoes');
    } ?>
    <?php if ($verCustosRetorno) { ?>
        <section class="rounded-card border border-border bg-surface p-4">
            <h2 class="text-heading-sm text-text">Custos internos registrados</h2>
            <p class="mt-3 text-body-md text-text"><?= e('Neste retorno: ' . dinheiro($custosRetorno['valor_c'] / 100) . ' · ' . $custosRetorno['minutos'] . ' minutos') ?></p>
            <p class="mt-2 text-body-md text-text"><?= e('Nos retornos desta unidade: ' . dinheiro($custosUnidadeRetorno['valor_c'] / 100) . ' · ' . $custosUnidadeRetorno['minutos'] . ' minutos') ?></p>
            <p class="mt-3 text-caption text-muted">Valores e tempo informados pela equipe. Não incluem custos antigos não registrados. Não são preço cobrado, despesa paga ou movimentação de estoque; evite registrar novamente o mesmo custo.</p>
            <?php if (($custosItensRetorno ?? null) !== null) { ?>
                <p class="mt-3 text-body-md text-text"><?= e('Peças e serviços registrados nesta OS: ' . dinheiro($custosItensRetorno['valor_c'] / 100)) ?></p>
                <p class="mt-2 text-caption text-muted"><?= e($custosItensRetorno['desconhecidos'] > 0 ? 'Existem itens sem custo conhecido. A composição está incompleta.' : 'Custos dos itens registrados no uso, separados dos valores adicionais declarados acima.') ?></p>
                <?= component('link', ['label' => 'Consultar composição e histórico dos custos', 'href' => site_url('trifase_estoque/os/' . $idRetorno)]) ?>
            <?php } ?>

            <?php if ($editavelRetorno) { ?>
                <details class="mt-4"><summary>Registrar custo ou tempo de trabalho</summary>
                    <form method="post" action="<?= e(site_url('trifase_retornos/custo/' . $idRetorno)) ?>" class="mt-3 grid gap-3" <?= js_module('formulario/padrao') ?>>
                        <input type="hidden" name="<?= e($this->security->get_csrf_token_name()) ?>" value="<?= e($this->security->get_csrf_hash()) ?>"><input type="hidden" name="operacao" value="<?= e(bin2hex(random_bytes(16))) ?>">
                        <?= component('input', ['name' => 'valor', 'id' => 'retorno-custo-valor', 'label' => 'Custo interno (R$)', 'value' => '0,00', 'required' => true, 'attrs' => ['inputmode' => 'decimal']]) ?>
                        <?= component('input', ['name' => 'minutos', 'id' => 'retorno-custo-minutos', 'label' => 'Tempo de trabalho (minutos)', 'type' => 'number', 'value' => '0', 'required' => true, 'attrs' => ['min' => 0, 'max' => 100000, 'step' => 1]]) ?>
                        <?= component('textarea', ['name' => 'descricao', 'id' => 'retorno-custo-descricao', 'label' => 'Descrição e referência do custo ou trabalho', 'required' => true, 'attrs' => ['maxlength' => 10000, 'rows' => 3]]) ?>
                        <?= component('checkbox', ['name' => 'confirmar', 'id' => 'retorno-custo-confirmar', 'value' => '1', 'label' => 'Confirmei a referência e não estou duplicando um custo já registrado.', 'required' => true]) ?>
                        <?= component('button', ['label' => 'Registrar custo interno', 'type' => 'submit', 'variant' => 'outline']) ?>
                    </form>
                </details>
            <?php } ?>
        </section>
    <?php } ?>
    <section class="rounded-card border border-border bg-surface p-4">
        <h2 class="mb-3 text-heading-sm text-text">Histórico deste retorno</h2>
        <?php if ($eventosRetorno === []) { ?><p class="text-muted">Nenhuma avaliação registrada.</p><?php } ?>
        <ol class="grid min-w-0 grid-cols-1 gap-3">
            <?php foreach ($eventosRetorno as $eventoRetorno) { ?>
                <li class="min-w-0 rounded-sm border border-border p-3">
                    <p class="text-caption text-muted"><?= e(date('d/m/Y H:i', strtotime($eventoRetorno->criado_em)) . ' · Operador #' . (int) $eventoRetorno->usuario_id) ?></p>
                    <?php if ($eventoRetorno->tipo === 'avaliar') { ?>
                        <p class="mt-2 text-label-md text-text"><?= e(trifaseRetornoCobertura($eventoRetorno) . ' · ' . $solucoesRetorno[$eventoRetorno->solucao]) ?></p>
                        <p class="mt-2 whitespace-pre-wrap break-words text-body-md text-text"><?= e($eventoRetorno->diagnostico) ?></p>
                    <?php } else { ?>
                        <p class="mt-2 text-label-md text-text"><?= e(($eventoRetorno->tipo === 'custo' ? 'Custo registrado: ' : 'Correção do custo #' . (int) $eventoRetorno->referencia_id . ': ') . dinheiro($eventoRetorno->valor_c / 100) . ' · ' . (int) $eventoRetorno->minutos . ' minutos') ?></p>
                    <?php } ?>
                    <p class="mt-2 whitespace-pre-wrap break-words text-body-md text-text"><?= e($eventoRetorno->motivo) ?></p>
                    <?php if ($eventoRetorno->tipo === 'custo' && isset($custosCorrigidosRetorno[(int) $eventoRetorno->id])) { ?><?= component('pill-status', ['label' => 'Corrigido · original preservado', 'variant' => 'neutral']) ?><?php } ?>
                    <?php if ($verCustosRetorno && $editavelRetorno && $eventoRetorno->tipo === 'custo' && ! isset($custosCorrigidosRetorno[(int) $eventoRetorno->id])) { ?>
                        <details class="mt-3"><summary>Corrigir este custo</summary>
                            <form method="post" action="<?= e(site_url('trifase_retornos/corrigirCusto/' . $idRetorno)) ?>" class="mt-3 grid gap-3" <?= js_module('formulario/padrao') ?>>
                                <input type="hidden" name="<?= e($this->security->get_csrf_token_name()) ?>" value="<?= e($this->security->get_csrf_hash()) ?>"><input type="hidden" name="operacao" value="<?= e(bin2hex(random_bytes(16))) ?>"><input type="hidden" name="evento" value="<?= e((int) $eventoRetorno->id) ?>">
                                <?= component('textarea', ['name' => 'motivo', 'id' => 'corrigir-custo-' . (int) $eventoRetorno->id, 'label' => 'Motivo da correção', 'required' => true, 'attrs' => ['maxlength' => 10000, 'rows' => 3]]) ?>
                                <?= component('checkbox', ['name' => 'confirmar', 'id' => 'confirmar-custo-' . (int) $eventoRetorno->id, 'value' => '1', 'label' => 'Preservar o registro original e descontar seu custo e tempo dos totais.', 'required' => true]) ?>
                                <?= component('button', ['label' => 'Confirmar correção', 'type' => 'submit', 'variant' => 'outline']) ?>
                            </form>
                        </details>
                    <?php } ?>
                </li>
            <?php } ?>
        </ol>
    </section>
    <section class="rounded-card border border-border bg-surface p-4">
        <h2 class="mb-3 text-heading-sm text-text">Retornos desta unidade</h2>
        <ul class="grid gap-2"><?php foreach ($outrosRetornos as $outroRetorno) { ?><li><?= component('link', ['label' => 'OS #' . (int) $outroRetorno->os_id . ' · origem #' . (int) $outroRetorno->origem_id, 'href' => site_url('trifase_retornos/visualizar/' . (int) $outroRetorno->os_id)]) ?></li><?php } ?></ul>
    </section>
</div>
