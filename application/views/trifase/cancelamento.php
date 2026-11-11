<?php $idCancelamento = (int) $osCancelamento->idOs;
$pendenteCancelamento = ($pedidoCancelamento->tipo ?? '') === 'solicitar' && $osCancelamento->status !== 'Cancelado';
$tecnicaLiberada = ($tecnicaCancelamento ?? null) !== null && $pecasCancelamento === [];
$cancelado = $osCancelamento->status === 'Cancelado';
$entregue = ($entregaCancelamento ?? null) !== null;
$etapaCancelamento = $cancelado ? ($entregue ? 4 : 3) : ($pendenteCancelamento ? ($tecnicaLiberada ? 2 : 1) : 0);
?>
<div class="mx-auto flex max-w-4xl flex-col gap-5 py-4" <?= js_module('trifase/cancelamento') ?>>
    <h1 class="text-heading-xl"><?= e('Cancelamento da OS #' . $idCancelamento) ?></h1>
    <?= component('link', ['label' => 'Voltar à OS', 'href' => site_url('os/visualizar/' . $idCancelamento)]) ?>
    <p class="text-body-md text-muted"><?= e('Cliente: ' . $clienteCancelamento) ?></p>
    <?php if ($etapaCancelamento > 0) { ?>
        <ol class="grid gap-3 sm:grid-cols-3" aria-label="Etapas do cancelamento">
            <?php foreach ([1 => 'Técnico: peças e serviços', 2 => 'Financeiro: acerto e cancelamento', 3 => 'Atendimento: entrega'] as $numero => $etapa) { ?>
                <li class="border-b border-border pb-3 <?= $numero === $etapaCancelamento ? 'font-semibold text-text' : 'text-muted' ?>" <?= $numero === $etapaCancelamento ? 'aria-current="step"' : '' ?>><?= e($numero . '. ' . $etapa . ($numero < $etapaCancelamento ? ' — concluído' : ($numero === $etapaCancelamento ? ' — agora' : ' — depois'))) ?></li>
            <?php } ?>
        </ol>
        <?= component('alert', ['variant' => $etapaCancelamento === 4 ? 'success' : 'info', 'message' => match ($etapaCancelamento) {
            1 => 'Próxima ação do técnico: conferir peças e serviços antes de liberar o financeiro.',
            2 => 'Próxima ação do financeiro ou administrador: conferir o valor devido, simular o acerto e confirmar o cancelamento.',
            3 => 'Cancelamento confirmado. Próxima ação: registrar a entrega do equipamento ao cliente.',
            default => 'Processo concluído: cancelamento confirmado e entrega registrada.',
        }]) ?>
    <?php } ?>
    <p class="text-danger-ink" role="alert" data-cancelamento-erro tabindex="-1" hidden></p>
    <?php if ($erroCancelamento !== null) { ?><?= component('alert', ['variant' => 'danger', 'message' => $erroCancelamento]) ?><?php } ?>
    <?php if (! $pendenteCancelamento && $osCancelamento->status !== 'Cancelado' && $podePedirCancelamento) { ?>
        <section class="rounded-card border border-border bg-surface p-4">
            <h2 class="text-heading-sm">Registrar pedido de cancelamento</h2>
            <?php if ($bloqueiosCancelamento === []) { ?>
                <form method="post" action="<?= e(site_url('trifase_cancelamentos/solicitar/' . $idCancelamento)) ?>" class="mt-4 grid gap-4" <?= js_module('formulario/padrao') ?>>
                    <input type="hidden" name="<?= e($this->security->get_csrf_token_name()) ?>" value="<?= e($this->security->get_csrf_hash()) ?>">
                    <input type="hidden" name="operacao" value="<?= e(bin2hex(random_bytes(16))) ?>">
                    <?= component('select', ['name' => 'origem', 'label' => 'Origem do pedido', 'selected' => $valoresCancelamento['origem'], 'required' => true, 'options' => ['cliente' => 'Solicitado pelo cliente', 'assistencia' => 'Por iniciativa da assistência']]) ?>
                    <p class="text-body-md text-muted"><?= e('Cliente vinculado à OS: ' . $clienteCancelamento) ?></p>
                    <?= component('textarea', ['name' => 'motivo', 'label' => 'Motivo do pedido', 'value' => $valoresCancelamento['motivo'], 'required' => true, 'attrs' => ['maxlength' => 2000]]) ?>
                    <?= component('button', ['label' => 'Registrar pedido', 'type' => 'submit']) ?>
                </form>
            <?php } else { ?>
                <p class="mt-3 text-warning-ink">Resolva estas pendências antes de registrar o pedido.</p>
                <ul class="mt-2 grid gap-2"><?php foreach ($bloqueiosCancelamento as $bloqueio) { ?><li><?= e($bloqueio) ?></li><?php } ?></ul>
            <?php } ?>
        </section>
    <?php } ?>
    <?php if ($pendenteCancelamento) { ?>
        <details class="rounded-card border border-border bg-surface p-4">
            <summary class="text-label-md">Pedido pendente — motivo e opções</summary>
            <p class="mt-3 break-words"><?= e($pedidoCancelamento->solicitante . ' · ' . date('d/m/Y H:i', strtotime($pedidoCancelamento->criado_em))) ?></p>
            <p class="mt-2 whitespace-pre-wrap break-words"><?= e($pedidoCancelamento->motivo) ?></p>
            <?php if ($podePedirCancelamento) { ?>
                <details class="mt-4"><summary>Retirar pedido sem cancelar a OS</summary>
                    <form method="post" action="<?= e(site_url('trifase_cancelamentos/retirar/' . $idCancelamento)) ?>" class="mt-3 grid gap-3" <?= js_module('formulario/padrao') ?>>
                        <input type="hidden" name="<?= e($this->security->get_csrf_token_name()) ?>" value="<?= e($this->security->get_csrf_hash()) ?>">
                        <input type="hidden" name="operacao" value="<?= e(bin2hex(random_bytes(16))) ?>"><input type="hidden" name="pedido_id" value="<?= e((int) $pedidoCancelamento->id) ?>">
                        <?= component('textarea', ['name' => 'motivo', 'id' => 'retirar-cancelamento-motivo', 'label' => 'Motivo da retirada do pedido', 'required' => true, 'attrs' => ['maxlength' => 2000]]) ?>
                        <?= component('button', ['label' => 'Retirar pedido', 'variant' => 'outline', 'type' => 'submit']) ?>
                    </form>
                </details>
            <?php } ?>
        </details>
    <?php } ?>
    <?php if ($pendenteCancelamento && ! $tecnicaLiberada) { ?>
    <section class="rounded-card border border-border bg-surface p-4">
        <h2 class="text-heading-sm">1. Conferir peças e serviços</h2>
        <div class="mt-4 grid gap-5 sm:grid-cols-2">
            <?php foreach (['Peças' => $pecasCancelamento, 'Serviços' => $servicosCancelamento] as $tituloCancelamento => $itensCancelamento) { ?>
                <div><h3 class="text-label-md"><?= e($tituloCancelamento) ?></h3>
                    <?php if ($itensCancelamento === []) { ?><p class="mt-2 text-muted">Nenhum item vinculado.</p><?php } ?>
                    <ul class="mt-2 grid gap-3"><?php foreach ($itensCancelamento as $itemCancelamento) { ?>
                        <li class="break-words border-b border-border pb-3">
                            <p><?= e($itemCancelamento['nome'] . ' · Qtd. ' . $itemCancelamento['quantidade']) ?></p>
                            <?php if ($podePedirCancelamento && $bloqueiosCancelamento === []) {
                                $ehPeca = $tituloCancelamento === 'Peças';
                                $acoes = $ehPeca ? ['consumir' => 'Registrar peça consumida ou perdida'] : ['retirar' => 'Retirar serviço não executado'];
                                if ($ehPeca && $devolverPecasCancelamento) {
                                    $acoes = ['retirar' => 'Devolver peça não utilizada'] + $acoes;
                                }
                                foreach ($acoes as $acao => $rotulo) {
                                    $idAcao = ($ehPeca ? 'peca-' : 'servico-') . $itemCancelamento['id'] . '-' . $acao; ?>
                                    <details class="mt-2"><summary><?= e($rotulo) ?></summary>
                                        <form method="post" action="<?= e(site_url('trifase_cancelamentos/retirar_item/' . $idCancelamento)) ?>" class="mt-3 grid gap-3" data-cancelamento-item>
                                            <input type="hidden" name="pedido_id" value="<?= e((int) $pedidoCancelamento->id) ?>">
                                            <input type="hidden" name="tipo_item" value="<?= e($ehPeca ? 'produto' : 'servico') ?>">
                                            <input type="hidden" name="operacao" value="<?= e(bin2hex(random_bytes(16))) ?>">
                                            <input type="hidden" name="idItem" value="<?= e((int) $itemCancelamento['id']) ?>">
                                            <?php if ($acao === 'consumir') { ?>
                                                <input type="hidden" name="consumida" value="1">
                                                <?= component('textarea', ['name' => 'motivo_perda', 'id' => 'motivo-' . $idAcao, 'label' => 'Motivo do consumo ou perda', 'required' => true, 'attrs' => ['maxlength' => 2000]]) ?>
                                            <?php } ?>
                                            <?= component('checkbox', ['name' => 'conferido', 'id' => 'conferido-' . $idAcao, 'value' => '1', 'label' => match (true) {
                                                $acao === 'consumir' => 'Toda a quantidade deste item foi consumida ou perdida e não retorna ao estoque.',
                                                $ehPeca => 'Esta peça não foi utilizada e está apta a voltar ao estoque.',
                                                default => 'Este serviço não foi executado.',
                                            }, 'required' => true]) ?>
                                            <?= component('button', ['label' => $rotulo, 'type' => 'submit', 'variant' => 'outline']) ?>
                                        </form>
                                    </details>
                                <?php }
                                } ?>
                        </li>
                    <?php } ?></ul>
                </div>
            <?php } ?>
        </div>
        <p class="mt-4 text-body-md text-muted">Registre o destino de cada peça. Retire os serviços não executados e mantenha os que foram realizados. O financeiro decide o valor devido.</p>
        <?php if ($bloqueiosCancelamento !== []) { ?>
            <h3 class="mt-4 text-label-md">Pendências que impedem confirmar</h3>
            <ul class="mt-2 grid gap-2 text-warning-ink"><?php foreach ($bloqueiosCancelamento as $bloqueioCancelamento) { ?><li><?= e($bloqueioCancelamento) ?></li><?php } ?></ul>
        <?php } ?>
            <h3 class="mt-6 text-heading-sm">Concluir conferência técnica</h3>
            <?php if ($tecnicaLiberada) { ?>
                <p class="mt-3 text-success-ink"><?= e('Conferência técnica registrada em ' . date('d/m/Y H:i', strtotime($tecnicaCancelamento['criado_em'])) . ' · Usuário #' . $tecnicaCancelamento['usuario_id']) ?></p>
            <?php } ?>
            <?php if ($pecasCancelamento !== []) { ?><p class="mt-3 text-warning-ink">Registre a devolução ou o consumo de cada peça acima para liberar a conferência financeira.</p><?php } ?>
            <?php if ($podePedirCancelamento) { ?>
                <form method="post" action="<?= e(site_url('trifase_cancelamentos/tecnica/' . $idCancelamento)) ?>" class="mt-4 grid gap-4" <?= js_module('formulario/padrao') ?>>
                    <input type="hidden" name="<?= e($this->security->get_csrf_token_name()) ?>" value="<?= e($this->security->get_csrf_hash()) ?>">
                    <input type="hidden" name="operacao" value="<?= e(bin2hex(random_bytes(16))) ?>"><input type="hidden" name="pedido_id" value="<?= e((int) $pedidoCancelamento->id) ?>"><input type="hidden" name="hash_tecnico" value="<?= e($hashTecnicoCancelamento) ?>">
                    <?= component('checkbox', ['name' => 'pecas_nao_utilizadas', 'value' => '1', 'label' => 'Conferi o destino de todas as peças.', 'required' => true, 'checked' => $tecnicaLiberada, 'disabled' => $tecnicaLiberada]) ?>
                    <?= component('checkbox', ['name' => 'servicos_executados', 'value' => '1', 'label' => 'Conferi: os serviços ainda vinculados foram executados.', 'required' => true, 'checked' => $tecnicaLiberada, 'disabled' => $tecnicaLiberada]) ?>
                    <?php if (! $tecnicaLiberada) { ?>
                        <?= component('textarea', ['name' => 'observacoes_tecnicas', 'label' => 'Observações técnicas (opcional)', 'value' => $valoresCancelamento['observacoes_tecnicas'] ?? '', 'attrs' => ['maxlength' => 2000]]) ?>
                        <?= component('button', ['label' => 'Concluir conferência técnica', 'variant' => 'outline', 'type' => 'submit', 'disabled' => $pecasCancelamento !== []]) ?>
                    <?php } ?>
                </form>
            <?php } ?>
        </section>
    <?php } ?>
    <?php if ($pendenteCancelamento) { ?>
        <?php if ($tecnicaLiberada && $podeConfirmarCancelamento) { ?>
            <?php
            $financeiroBloqueado = ! $tecnicaLiberada || $bloqueiosCancelamento !== [];
            $acerto = $acertoCancelamento ?? [
                'valor_devido_c' => (int) ($financeiroCancelamento['total_c'] ?? 0),
                'desconto_c' => 0,
                'total_final_c' => (int) ($financeiroCancelamento['total_c'] ?? 0),
                'recebido_bruto_c' => (int) ($financeiroCancelamento['recebido_original_c'] ?? $financeiroCancelamento['recebido_c'] ?? 0),
                'ja_devolvido_c' => (int) ($financeiroCancelamento['reembolsado_c'] ?? 0),
                'recebido_liquido_c' => (int) ($financeiroCancelamento['recebido_c'] ?? 0),
                'a_devolver_c' => 0,
                'a_receber_c' => (int) ($financeiroCancelamento['saldo_c'] ?? 0),
                'resultado' => ((int) ($financeiroCancelamento['saldo_c'] ?? 0)) > 0 ? 'a_receber' : 'sem_pendencias',
            ];
            $exigeAcerto = $financeiroCancelamento !== null || $acerto['valor_devido_c'] > 0 || $acerto['desconto_c'] > 0;
            ?>
            <section class="rounded-card border border-border bg-surface p-4">
                <h2 class="text-heading-sm">2. Acertar valores e cancelar a OS</h2>
                <details class="mt-3"><summary>Consultar pagamentos e orientações internas</summary>
                    <?= component('link', ['label' => 'Conferir cobranças e pagamentos', 'href' => site_url('trifase_financeiro/visualizar/' . $idCancelamento)]) ?>
                    <?php if ($podeClassificarClienteCancelamento ?? false) { ?><?= component('link', ['label' => 'Classificação e orientações internas do cliente', 'href' => site_url('trifase_cadastros/cliente/' . (int) $osCancelamento->clientes_id)]) ?><?php } ?>
                </details>
                <?php if ($servicosCancelamento !== []) { ?>
                    <h3 class="mt-3 text-label-md">Serviços executados</h3>
                    <ul class="mt-2 grid gap-2">
                        <?php foreach ($servicosCancelamento as $servico) { ?>
                            <li><?= e($servico['nome'] . ' · Qtd. ' . $servico['quantidade']) ?></li>
                        <?php } ?>
                    </ul>
                <?php } ?>
                <div class="mt-4 grid gap-3 rounded-xl border border-border p-4 text-body-md">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                        <h3 class="text-label-md">Cálculo do acerto financeiro</h3>
                        <?= component('pill-status', match ($acerto['resultado']) {
                            'a_devolver' => ['label' => 'Valor a devolver ao cliente: ' . dinheiro($acerto['a_devolver_c'] / 100), 'variant' => 'warning', 'class' => 'max-w-full whitespace-normal'],
                            'a_receber' => ['label' => 'Valor a receber do cliente: ' . dinheiro($acerto['a_receber_c'] / 100), 'variant' => 'warning', 'class' => 'max-w-full whitespace-normal'],
                            default => ['label' => 'Sem valores a acertar', 'variant' => 'success'],
                        }) ?>
                    </div>
                    <dl class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div><dt class="text-caption text-muted">Cobrança original</dt><dd class="font-medium"><?= e($financeiroCancelamento !== null ? dinheiro($financeiroCancelamento['total_c'] / 100) : 'R$ 0,00') ?></dd></div>
                        <div><dt class="text-caption text-muted">Recebido</dt><dd class="font-medium"><?= e(dinheiro($acerto['recebido_bruto_c'] / 100)) ?></dd></div>
                        <div><dt class="text-caption text-muted">Já devolvido</dt><dd class="font-medium"><?= e(dinheiro($acerto['ja_devolvido_c'] / 100)) ?></dd></div>
                        <div><dt class="text-caption text-muted">Total final devido após desconto</dt><dd class="font-medium"><?= e(dinheiro($acerto['total_final_c'] / 100)) ?></dd></div>
                    </dl>
                    <p class="text-caption text-muted">O sistema calcula automaticamente o valor líquido a devolver ou a receber a partir do valor devido e do desconto informados abaixo. Conceder desconto não altera a classificação do cliente automaticamente.</p>
                </div>
                <form method="post" action="<?= e(site_url('trifase_cancelamentos/confirmar/' . $idCancelamento)) ?>" class="mt-4 grid gap-4" <?= js_module('formulario/padrao') ?>>
                    <input type="hidden" name="<?= e($this->security->get_csrf_token_name()) ?>" value="<?= e($this->security->get_csrf_hash()) ?>">
                    <input type="hidden" name="operacao" value="<?= e(bin2hex(random_bytes(16))) ?>"><input type="hidden" name="pedido_id" value="<?= e((int) $pedidoCancelamento->id) ?>"><input type="hidden" name="hash" value="<?= e($hashCancelamento) ?>">
                    <div class="grid gap-4 sm:grid-cols-2">
                        <?= component('input', ['name' => 'valor_devido', 'label' => 'Valor devido pelo trabalho ou diagnóstico (R$)', 'value' => $valoresCancelamento['valor_devido'] ?? '0,00', 'disabled' => $financeiroBloqueado, 'attrs' => ['inputmode' => 'decimal']]) ?>
                        <?= component('input', ['name' => 'desconto', 'label' => 'Desconto negociado (R$)', 'value' => $valoresCancelamento['desconto'] ?? '0,00', 'disabled' => $financeiroBloqueado, 'attrs' => ['inputmode' => 'decimal']]) ?>
                    </div>
                    <div>
                        <?= component('button', ['label' => 'Simular cálculo do acerto', 'variant' => 'outline', 'type' => 'submit', 'disabled' => $financeiroBloqueado, 'attrs' => ['name' => 'simular', 'value' => '1', 'formnovalidate' => 'formnovalidate']]) ?>
                    </div>
                    <?php if ($acerto['a_devolver_c'] > 0) { ?>
                        <div class="grid gap-4 rounded-xl border border-border p-4">
                            <h3 class="text-label-md">Registrar devolução ao cliente (<?= e(dinheiro($acerto['a_devolver_c'] / 100)) ?>)</h3>
                            <div class="grid gap-4 sm:grid-cols-3">
                                <?= component('input', ['name' => 'valor_devolucao', 'label' => 'Valor devolvido (R$)', 'value' => $valoresCancelamento['valor_devolucao'] ?? number_format($acerto['a_devolver_c'] / 100, 2, ',', '.'), 'required' => true, 'disabled' => $financeiroBloqueado, 'attrs' => ['inputmode' => 'decimal']]) ?>
                                <?= component('input', ['name' => 'data_devolucao', 'type' => 'date', 'label' => 'Data da devolução', 'value' => $valoresCancelamento['data_devolucao'] ?? date('Y-m-d'), 'required' => true, 'disabled' => $financeiroBloqueado]) ?>
                                <?= component('select', ['name' => 'forma_devolucao', 'label' => 'Forma da devolução', 'selected' => $valoresCancelamento['forma_devolucao'] ?? 'Pix', 'options' => array_combine(['Pix', 'Dinheiro', 'Transferência', 'Cartão de Crédito', 'Cartão de Débito'], ['Pix', 'Dinheiro', 'Transferência', 'Cartão de Crédito', 'Cartão de Débito']), 'disabled' => $financeiroBloqueado]) ?>
                            </div>
                            <?= component('input', ['name' => 'referencia_devolucao', 'label' => 'Comprovante ou referência da devolução', 'value' => $valoresCancelamento['referencia_devolucao'] ?? '', 'required' => true, 'disabled' => $financeiroBloqueado, 'attrs' => ['maxlength' => 300]]) ?>
                        </div>
                    <?php } ?>
                    <?= component('textarea', ['name' => 'conferencia', 'label' => $exigeAcerto ? 'Motivo interno / justificativa do acerto financeiro' : 'Observações da conferência (opcional)', 'value' => $valoresCancelamento['conferencia'] ?? '', 'required' => $exigeAcerto, 'disabled' => $financeiroBloqueado, 'attrs' => ['maxlength' => 2000]]) ?>
                    <?php if ($exigeAcerto) { ?>
                        <?= component('checkbox', ['name' => 'acerto_confirmado', 'value' => '1', 'label' => 'Confirmo o valor devido, o desconto negociado e o resultado do acerto financeiro calculado para este cancelamento.', 'required' => true, 'disabled' => $financeiroBloqueado]) ?>
                    <?php } ?>
                    <?= component('checkbox', ['name' => 'financeiro_conferido', 'value' => '1', 'label' => 'Conferi os valores, pagamentos recebidos e eventuais devoluções deste cancelamento.', 'required' => true, 'disabled' => $financeiroBloqueado]) ?>
                    <?= component('checkbox', ['name' => 'confirmar', 'value' => '1', 'label' => 'Confirmo o cancelamento da OS após as conferências técnica e financeira.', 'required' => true, 'disabled' => $financeiroBloqueado]) ?>
                    <?= component('button', ['label' => 'Concluir acerto e cancelar OS', 'type' => 'submit', 'disabled' => $financeiroBloqueado]) ?>
                </form>
            </section>
        <?php } else { ?>
            <section class="rounded-card border border-border bg-surface p-4">
                <h2 class="text-heading-sm">2. Acerto financeiro</h2>
                <p class="mt-3 text-muted"><?= e(! $tecnicaLiberada ? 'Aguardando conferência técnica. O acerto será apurado nesta etapa; os valores ainda não foram confirmados.' : 'Conferência técnica concluída. Aguarde o financeiro ou administrador concluir o acerto e confirmar o cancelamento.') ?></p>
            </section>
        <?php } ?>
    <?php } ?>
    <?php if ($cancelado) { ?>
        <section class="rounded-card border border-border bg-surface p-4">
            <h2 class="text-heading-sm">3. Entrega do equipamento</h2>
            <?php if ($entregue) { ?>
                <p class="mt-3 text-success-ink"><?= e('Entregue em ' . date('d/m/Y H:i', strtotime($entregaCancelamento->entregue_em)) . ' · Recebedor: ' . $entregaCancelamento->recebedor) ?></p>
                <?= component('link', ['label' => 'Abrir comprovante', 'href' => site_url('trifase_entregas/comprovante/' . $idCancelamento . '/' . (int) $entregaCancelamento->id)]) ?>
            <?php } else { ?>
                <p class="my-3 text-muted">O cancelamento não registra a retirada física. Registre quem recebeu o equipamento e quando.</p>
                <?= component('button', ['label' => 'Registrar entrega do equipamento', 'href' => site_url('os/visualizar/' . $idCancelamento) . '?secao=entrega#piloto-entrega']) ?>
            <?php } ?>
        </section>
    <?php } ?>
    <details class="rounded-card border border-border bg-surface p-4">
        <summary class="text-label-md">Histórico do cancelamento</summary>
        <ol class="mt-4 grid gap-4">
            <?php foreach ($historicoCancelamento as $eventoCancelamento) { ?>
                <li><p class="text-label-md"><?= e(match ($eventoCancelamento->tipo) {
                    'solicitar' => 'Pedido registrado', 'tecnica' => 'Conferência técnica registrada', 'retirar' => 'Pedido retirado', 'retirar_item' => 'Item retirado da OS', 'consumir_peca' => 'Consumo ou perda de peça registrado', default => 'Cancelamento confirmado'
                }) ?></p>
                    <p class="text-caption text-muted"><?= e(date('d/m/Y H:i', strtotime($eventoCancelamento->criado_em)) . ' · Usuário #' . (int) $eventoCancelamento->usuario_id . ' · Solicitante: ' . $eventoCancelamento->solicitante) ?></p>
                    <p class="mt-1 whitespace-pre-wrap break-words"><?= e($eventoCancelamento->motivo) ?></p>
                </li>
            <?php } ?>
        </ol>
        <?php if ($historicoCancelamento === []) { ?><p class="mt-3 text-muted">Nenhum pedido registrado.</p><?php } ?>
    </details>
</div>
