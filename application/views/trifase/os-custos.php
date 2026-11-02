<div class="grid min-w-0 grid-cols-1 gap-5 py-4">
    <h1 class="text-heading-lg text-text"><?= e('Custos internos · OS #' . (int) $osCusto->idOs) ?></h1>
    <?= component('link', ['label' => 'Voltar à OS', 'href' => site_url('os/visualizar/' . (int) $osCusto->idOs)]) ?>
    <?php if ($erroCustoOs !== null) { ?><?= component('alert', ['variant' => 'danger', 'message' => $erroCustoOs]) ?><?php } ?>
    <section class="rounded-card border border-border bg-surface p-4">
        <h2 class="text-heading-sm text-text">Composição registrada</h2>
        <p class="mt-3 text-body-md text-text"><?= e('Peças e serviços: ' . dinheiro($resumoCustosOs['valor_c'] / 100)) ?></p>
        <?php if ($ehRetornoCusto) { ?><p class="mt-2 text-body-md text-text"><?= e('Custos adicionais declarados no retorno: ' . dinheiro($custosManuaisOs['valor_c'] / 100) . ' · ' . $custosManuaisOs['minutos'] . ' minutos') ?></p><?php } ?>
        <p class="mt-2 text-label-md text-text"><?= e('Total registrado: ' . dinheiro(($resumoCustosOs['valor_c'] + ($resumoCustosOs['cancelada'] ? 0 : $custosManuaisOs['valor_c'])) / 100)) ?></p>
        <p class="mt-3 text-caption text-muted"><?= e($resumoCustosOs['cancelada'] ? 'OS cancelada: custos não somados. Registros preservados para consulta.' : 'Custos registrados não representam lucro líquido nem despesas pagas. Não incluem itens desconhecidos ou trabalho não informado. No retorno, custos adicionais devem excluir os valores já registrados nos itens.') ?></p>
        <?php if ($resumoCustosOs['desconhecidos'] > 0) { ?><?= component('alert', ['variant' => 'warning', 'message' => $resumoCustosOs['desconhecidos'] . ' item(ns) sem custo conhecido. O total está incompleto; custos antigos não são inferidos do cadastro atual.']) ?><?php } ?>
    </section>
    <section><h2 class="text-heading-sm text-text">Peças e serviços desta OS</h2><ul class="mt-3 grid min-w-0 grid-cols-1 gap-4">
        <?php foreach ($resumoCustosOs['linhas'] as $linhaCusto) { ?>
            <li class="min-w-0 rounded-card border border-border bg-surface p-4">
                <h3 class="break-words text-label-md text-text"><?= e(($linhaCusto['tipo'] === 'servico' ? 'Serviço' : 'Produto') . ' #' . $linhaCusto['item'] . ' · ' . $linhaCusto['descricao']) ?></h3>
                <p class="mt-2 text-body-md text-text"><?= e('Quantidade: ' . $linhaCusto['quantidade'] . ' · Custo: ' . ($linhaCusto['valor_c'] === null ? 'Não informado' : dinheiro($linhaCusto['valor_c'] / 100))) ?></p>
                <?php if ($editarCustoOs) { ?>
                    <details class="mt-3"><summary>Registrar ou corrigir custo deste item</summary>
                        <form method="post" class="mt-3 grid gap-4" <?= js_module('formulario/padrao') ?>>
                            <input type="hidden" name="<?= e($this->security->get_csrf_token_name()) ?>" value="<?= e($this->security->get_csrf_hash()) ?>"><input type="hidden" name="operacao" value="<?= e(bin2hex(random_bytes(16))) ?>">
                            <input type="hidden" name="tipo" value="<?= e($linhaCusto['tipo']) ?>"><input type="hidden" name="item" value="<?= e($linhaCusto['item']) ?>"><input type="hidden" name="anterior" value="<?= e($linhaCusto['versao']) ?>">
                            <?= component('input', ['id' => 'custo-' . $linhaCusto['tipo'] . $linhaCusto['item'], 'name' => 'custo', 'label' => 'Custo interno unitário (R$)', 'required' => true, 'help' => 'Informe o custo conhecido daquele uso, não o preço cobrado ao cliente.', 'attrs' => ['inputmode' => 'decimal']]) ?>
                            <?= component('textarea', ['id' => 'motivo-' . $linhaCusto['tipo'] . $linhaCusto['item'], 'name' => 'motivo', 'label' => 'Referência e motivo do custo ou da correção', 'required' => true, 'attrs' => ['maxlength' => 2000, 'rows' => 2]]) ?>
                            <?= component('checkbox', ['id' => 'confirma-' . $linhaCusto['tipo'] . $linhaCusto['item'], 'name' => 'confirmar', 'value' => '1', 'label' => 'Conferi o custo e confirmo sua gravação com histórico.', 'required' => true]) ?>
                            <?= component('button', ['label' => 'Registrar custo do item', 'variant' => 'outline', 'type' => 'submit']) ?>
                        </form>
                    </details>
                <?php } ?>
            </li>
        <?php } ?>
        <?php if ($resumoCustosOs['linhas'] === []) { ?><li class="text-muted">Nenhum produto ou serviço adicionado.</li><?php } ?>
    </ul></section>
    <section><h2 class="text-heading-sm text-text">Histórico de custos dos itens</h2>
        <p class="mt-2 text-caption text-muted">Versões e itens removidos permanecem aqui; somente a versão atual dos itens presentes entra na composição.</p>
        <ol class="mt-3 grid gap-3"><?php foreach ($historicoCustosOs as $hCusto) { ?><li class="min-w-0 border-b border-border pb-3"><p class="text-label-md text-text"><?= e(($hCusto->tipo === 'servico' ? 'Serviço' : 'Produto') . ' #' . $hCusto->item_id . ' · ' . $hCusto->quantidade . ' × ' . ($hCusto->custo_unitario_c === null ? 'Custo desconhecido' : dinheiro($hCusto->custo_unitario_c / 100))) ?></p><p class="mt-1 break-words text-caption text-muted"><?= e($hCusto->origem . ' · ' . $hCusto->criado_em . ' · Operador #' . $hCusto->usuario_id) ?></p><p class="mt-2 break-words text-body-md text-muted"><?= e($hCusto->descricao) ?></p></li><?php } ?></ol>
    </section>
</div>
