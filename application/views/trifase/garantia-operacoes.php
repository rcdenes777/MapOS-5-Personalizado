<?php
$idGarantia = (int) $vinculoRetorno->os_id;
$solucaoGarantia = $avaliacaoRetorno->solucao ?? '';
$ativaGarantia = ! in_array($retornoOs->status, ['Finalizado', 'Cancelado'], true);
?>
<section class="rounded-card border border-border bg-surface p-4" <?= js_module('trifase/garantia') ?>>
    <h2 class="text-heading-sm text-text">Executar solução da garantia</h2>
    <p class="mt-2 text-body-md text-muted">A decisão técnica e a execução são registros separados. A conclusão e a entrega continuam na OS.</p>
    <?php if ($trocaGarantia) {
        $substitutaGarantia = json_decode($trocaGarantia->identificacao, true, 512, JSON_THROW_ON_ERROR); ?>
        <div class="mt-4 grid gap-3">
            <?= component('pill-status', ['label' => 'Troca executada', 'variant' => 'success']) ?>
            <p class="break-words text-body-md text-text"><?= e('Substituta: ' . $substitutaGarantia['marca'] . ' · ' . $substitutaGarantia['modelo'] . ' · selo ' . $substitutaGarantia['selo'] . ' · série ' . $substitutaGarantia['serie'] . ' · IMEI ' . $substitutaGarantia['imei']) ?></p>
            <?php if ($verCustosRetorno) { ?><p class="text-body-md text-text"><?= e($trocaGarantia->custo_c === null ? 'Custo da substituta não informado.' : 'Custo interno da substituta: ' . dinheiro((int) $trocaGarantia->custo_c / 100)) ?></p><?php } ?>
            <p class="text-caption text-muted"><?= e($trocaGarantia->produto_id ? 'Uma unidade retirada do estoque.' : 'Unidade obtida fora do estoque; estoque preservado.') ?></p>
            <p class="text-caption text-muted"><?= e($trocaGarantia->destino_antiga === 'retida_assistencia' ? 'Unidade antiga retida na assistência.' : 'Unidade antiga devolvida ao cliente.') ?></p>
            <?= component('link', ['label' => 'Histórico da substituta', 'href' => site_url('trifase_equipamentos/visualizar/' . (int) $trocaGarantia->nova_id)]) ?>
        </div>
    <?php } elseif ($solucaoGarantia === 'novo_orcamento') { ?>
        <div class="mt-4 grid gap-3">
            <p class="text-body-md text-text">Adicione peças e serviços nesta OS de retorno e publique uma versão para aprovação do cliente. A publicação não fatura automaticamente. Mudanças nos itens exigem nova versão aprovada.</p>
            <?= component('button', ['label' => 'Peças e serviços do retorno', 'variant' => 'outline', 'href' => site_url('os/visualizar/' . $idGarantia) . '?aba=produtos']) ?>
            <?php if ($verCustosRetorno) { ?><?= component('button', ['label' => 'Prévia e aprovação do orçamento', 'variant' => 'outline', 'href' => site_url('trifase_orcamentos/visualizar/' . $idGarantia)]) ?><?php } ?>
        </div>
    <?php } elseif ($ativaGarantia && $solucaoGarantia === 'troca' && $podeTrocarGarantia) { ?>
        <form method="post" action="<?= e(site_url('trifase_retornos/trocar/' . $idGarantia)) ?>" class="mt-4 grid gap-4" <?= js_module('formulario/padrao') ?>>
            <?php $this->load->view('trifase/garantia-campos-operacao'); ?>
            <?= component('select', ['name' => 'origem', 'id' => 'garantia-origem', 'label' => 'Origem da substituta', 'options' => ['externa' => 'Obtida fora do estoque', 'estoque' => 'Retirar uma unidade do estoque']]) ?>
            <div class="relative" data-autocomplete="<?= e(site_url('os/autoCompleteProduto')) ?>" data-autocomplete-alvo="garantia-produto-id" data-autocomplete-listar data-autocomplete-livre>
                <?= component('input', ['name' => 'busca_produto', 'id' => 'garantia-produto-busca', 'label' => 'Produto do estoque (obrigatório na retirada)', 'autocomplete' => 'off']) ?>
                <input type="hidden" name="produto_id" id="garantia-produto-id" value="">
            </div>
            <div class="relative" data-modelo-busca data-autocomplete="<?= e(site_url('trifase_equipamentos/modelos')) ?>" data-autocomplete-alvo="garantia-modelo-id" data-autocomplete-listar data-autocomplete-livre>
                <?= component('input', ['name' => 'busca_modelo', 'id' => 'garantia-modelo-busca', 'label' => 'Aproveitar modelo cadastrado', 'autocomplete' => 'off']) ?>
                <input type="hidden" name="modelo_id" id="garantia-modelo-id" value="">
            </div>
            <?= component('button', ['label' => 'Informar outro modelo', 'variant' => 'ghost', 'attrs' => ['data-equipamento-limpar-modelo' => true]]) ?>
            <?= component('select', ['name' => 'tipo', 'id' => 'garantia-tipo', 'label' => 'Tipo', 'options' => ['placa' => 'Placa', 'celular' => 'Celular', 'outro' => 'Outro equipamento']]) ?>
            <p class="text-caption text-muted">Identifique a substituta com pelo menos um número de selo de garantia, série ou IMEI.</p>
            <?php foreach (['marca' => 'Marca', 'modelo' => 'Modelo', 'selo' => 'Número do selo de garantia', 'serie' => 'Número de série', 'imei' => 'IMEI'] as $campoGarantia => $rotuloGarantia) { ?>
                <?= component('input', ['name' => $campoGarantia, 'id' => 'garantia-' . $campoGarantia, 'label' => $rotuloGarantia, 'required' => in_array($campoGarantia, ['marca', 'modelo'], true), 'attrs' => ['maxlength' => 100]]) ?>
            <?php } ?>
            <?= component('select', ['name' => 'destino_antiga', 'id' => 'garantia-destino', 'label' => 'Destino da unidade antiga', 'options' => ['retida_assistencia' => 'Retida na assistência', 'devolvida_cliente' => 'Devolvida ao cliente']]) ?>
            <?= component('input', ['name' => 'custo_externo', 'id' => 'garantia-custo', 'label' => 'Custo interno da unidade externa (opcional)', 'help' => 'Use ponto decimal. Não cria despesa paga nem cobrança ao cliente.']) ?>
            <?= component('textarea', ['name' => 'motivo', 'id' => 'garantia-motivo-troca', 'label' => 'Motivo e conferência da substituição', 'required' => true, 'attrs' => ['maxlength' => 2000]]) ?>
            <?= component('checkbox', ['name' => 'confirmar', 'id' => 'garantia-confirmar-troca', 'value' => '1', 'label' => 'Conferi a substituta e a unidade antiga. Confirmo a troca física e a baixa de uma unidade, se escolhi estoque. Não haverá cobrança automática.', 'required' => true]) ?>
            <?= component('button', ['label' => 'Registrar troca', 'type' => 'submit', 'variant' => 'outline']) ?>
        </form>
    <?php } ?>
    <?php if ($verCustosRetorno && $financeiroGarantia) { ?>
        <div class="mt-4 grid gap-2 text-body-md text-text">
            <p><?= e('Cobrança atual da origem: ' . dinheiro($financeiroGarantia['total_c'] / 100) . ' · recebido líquido: ' . dinheiro($financeiroGarantia['recebido_c'] / 100) . ' · saldo: ' . dinheiro($financeiroGarantia['saldo_c'] / 100)) ?></p>
            <p><?= e('Devolvido: ' . dinheiro(($financeiroGarantia['reembolsado_c'] ?? 0) / 100) . ' · abatimento acumulado: ' . dinheiro(($financeiroGarantia['abatimento_garantia_c'] ?? 0) / 100)) ?></p>
        </div>
        <?php if ($ativaGarantia && $solucaoGarantia === 'devolucao_valor' && $podeReembolsarGarantia && ($financeiroGarantia['recebido_c'] > 0 || $financeiroGarantia['saldo_c'] > 0)) { ?>
            <form method="post" action="<?= e(site_url('trifase_retornos/reembolsar/' . $idGarantia)) ?>" class="mt-4 grid gap-4" <?= js_module('formulario/padrao') ?>>
                <?php $this->load->view('trifase/garantia-campos-operacao'); ?>
                <input type="hidden" name="financeiro_hash" value="<?= e($hashFinanceiroGarantia) ?>">
                <?= component('select', ['name' => 'modo', 'id' => 'garantia-modo', 'label' => 'Modalidade', 'options' => ['parcial' => 'Devolução parcial', 'total' => 'Encerramento total']]) ?>
                <p class="text-caption text-muted">Na parcial, o valor devolvido abate a cobrança e mantém o saldo pendente. No encerramento total, devolva todo o recebido líquido; o saldo restante será cancelado.</p>
                <?= component('input', ['name' => 'valor', 'id' => 'garantia-valor', 'label' => 'Valor já devolvido (R$)', 'required' => true, 'attrs' => ['inputmode' => 'decimal']]) ?>
                <?= component('input', ['name' => 'data', 'id' => 'garantia-data', 'type' => 'date', 'label' => 'Data da devolução', 'value' => date('Y-m-d'), 'required' => true]) ?>
                <?= component('select', ['name' => 'forma', 'id' => 'garantia-forma', 'label' => 'Forma', 'options' => array_combine(['Pix', 'Dinheiro', 'Transferência', 'Cartão de Crédito', 'Cartão de Débito'], ['Pix', 'Dinheiro', 'Transferência', 'Cartão de Crédito', 'Cartão de Débito'])]) ?>
                <?= component('input', ['name' => 'referencia', 'id' => 'garantia-referencia', 'label' => 'Referência do comprovante ou confirmação', 'required' => true, 'attrs' => ['maxlength' => 300]]) ?>
                <?= component('textarea', ['name' => 'motivo', 'id' => 'garantia-motivo-reembolso', 'label' => 'Motivo', 'required' => true, 'attrs' => ['maxlength' => 2000]]) ?>
                <?= component('checkbox', ['name' => 'confirmar', 'id' => 'garantia-confirmar-reembolso', 'value' => '1', 'label' => 'Conferi o valor efetivamente devolvido fora do MapOS (zero se não houve recebimento), destinatário e modalidade. Confirmo a saída de caixa e o abatimento da cobrança original.', 'required' => true]) ?>
                <?= component('button', ['label' => 'Registrar devolução', 'type' => 'submit', 'variant' => 'outline']) ?>
            </form>
        <?php } ?>
        <?php foreach ($reembolsosGarantia as $reembolsoGarantia) { ?>
            <article class="mt-4 rounded-card border border-border p-3">
                <h3 class="text-label-md text-text"><?= e('Devolução #' . (int) $reembolsoGarantia->id . ' · ' . dinheiro((int) $reembolsoGarantia->valor_c / 100) . ' · ' . ($reembolsoGarantia->cancelado_id ? 'Registro cancelado' : 'Registrada')) ?></h3>
                <p class="mt-2 break-words text-body-md text-text"><?= e(dataBr($reembolsoGarantia->data_evento) . ' · ' . $reembolsoGarantia->forma . ' · ' . $reembolsoGarantia->referencia) ?></p>
                <p class="mt-2 whitespace-pre-wrap break-words text-body-md text-text"><?= e($reembolsoGarantia->motivo) ?></p>
                <?php if (! $reembolsoGarantia->cancelado_id && $podeReembolsarGarantia && $podeCorrigirReembolsoGarantia) { ?>
                    <details class="mt-3"><summary>Corrigir registro lançado por engano</summary>
                        <form method="post" action="<?= e(site_url('trifase_retornos/corrigirReembolso/' . $idGarantia)) ?>" class="mt-3 grid gap-3" <?= js_module('formulario/padrao') ?>>
                            <?php $this->load->view('trifase/garantia-campos-operacao'); ?>
                            <input type="hidden" name="reembolso" value="<?= e((int) $reembolsoGarantia->id) ?>">
                            <?= component('textarea', ['name' => 'motivo', 'id' => 'garantia-correcao-' . (int) $reembolsoGarantia->id, 'label' => 'Motivo da correção', 'required' => true, 'attrs' => ['maxlength' => 2000]]) ?>
                            <?= component('checkbox', ['name' => 'confirmar', 'id' => 'garantia-correcao-confirma-' . (int) $reembolsoGarantia->id, 'value' => '1', 'label' => 'O dinheiro não foi devolvido. O registro foi feito por engano. Esta correção não faz transferência bancária.', 'required' => true]) ?>
                            <?= component('button', ['label' => 'Corrigir registro', 'type' => 'submit', 'variant' => 'outline']) ?>
                        </form>
                    </details>
                <?php } ?>
            </article>
        <?php } ?>
    <?php } ?>
</section>
