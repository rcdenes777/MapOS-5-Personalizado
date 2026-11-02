<?php
$idEntregaOs = (int) $os->idOs;
$entregaAtual = $pilotoEntrega ?? null;
$permiteEntrega = fn (string $p): bool => $this->permission->checkPermission($this->session->userdata('permissao'), $p);
?>
<section class="trifase-os-painel" aria-labelledby="piloto-entrega">
    <h2 id="piloto-entrega">Entrega do equipamento</h2>
    <?php if ($entregaAtual !== null) { ?>
        <?= component('pill-status', ['label' => 'Entrega registrada', 'variant' => 'success']) ?>
        <dl class="trifase-os-dados">
            <div><dt>Retirado em</dt><dd><?= e(date('d/m/Y H:i', strtotime($entregaAtual->entregue_em))) ?></dd></div>
            <div><dt>Recebedor</dt><dd><?= e($entregaAtual->recebedor) ?></dd></div>
            <div><dt>Vínculo</dt><dd><?= e((int) $entregaAtual->terceiro === 1 ? 'Terceiro autorizado' : 'Próprio cliente') ?></dd></div>
        </dl>
        <?= component('link', ['label' => 'Abrir comprovante de entrega', 'href' => site_url('trifase_entregas/comprovante/' . $idEntregaOs . '/' . (int) $entregaAtual->id), 'attrs' => ['target' => '_blank', 'rel' => 'noopener']]) ?>
        <?php if ($permiteEntrega('corrigirEntrega')) { ?>
            <details class="trifase-os-adicionar mt-4">
                <summary>Corrigir registro de entrega</summary>
                <form id="piloto-cancelar-entrega" method="post" action="<?= e(site_url('trifase_entregas/cancelar/' . $idEntregaOs)) ?>" class="grid gap-3 p-3" data-os-acao="entrega">
                    <input type="hidden" name="evento_id" value="<?= e((int) $entregaAtual->id) ?>">
                    <input type="hidden" name="operacao" value="<?= e(bin2hex(random_bytes(16))) ?>">
                    <p class="text-caption text-muted">O registro será cancelado com histórico. Para corrigir os dados, registre outra entrega depois. Pagamentos e garantia permanecem iguais.</p>
                    <?= component('textarea', ['name' => 'motivo', 'id' => 'piloto-entrega-motivo', 'label' => 'Motivo da correção', 'required' => true, 'attrs' => ['minlength' => 5, 'maxlength' => 500, 'rows' => 3]]) ?>
                    <?= component('button', ['label' => 'Revisar correção', 'variant' => 'outline', 'attrs' => ['data-modal-abrir' => 'piloto-confirmar-cancelamento-entrega']]) ?>
                </form>
                <?= component('modal-confirm', ['id' => 'piloto-confirmar-cancelamento-entrega', 'title' => 'Cancelar este registro de entrega?', 'message' => 'O registro original e o motivo da correção serão preservados. Isso não desfaz a retirada física, não altera a OS e não movimenta dinheiro.', 'confirm_label' => 'Cancelar registro', 'confirm_attrs' => ['form' => 'piloto-cancelar-entrega']]) ?>
            </details>
        <?php } ?>
    <?php } else { ?>
        <?= component('pill-status', ['label' => 'Entrega não registrada', 'variant' => 'neutral']) ?>
        <p class="text-muted">A previsão e o status Finalizado não confirmam a retirada.</p>
        <?php if ($permiteEntrega('registrarEntrega')) { ?>
            <details class="trifase-os-adicionar mt-4">
                <summary>Registrar entrega</summary>
                <form method="post" action="<?= e(site_url('trifase_entregas/registrar/' . $idEntregaOs)) ?>" class="grid gap-3 p-3" data-os-acao="entrega" <?= js_module('trifase/entrega') ?>>
                    <input type="hidden" name="operacao" value="<?= e(bin2hex(random_bytes(16))) ?>">
                    <?= component('input', ['name' => 'entregue_em', 'id' => 'piloto-entrega-data', 'label' => 'Data e hora reais da retirada', 'type' => 'datetime-local', 'value' => date('Y-m-d\TH:i'), 'required' => true]) ?>
                    <?= component('input', ['name' => 'recebedor', 'id' => 'piloto-entrega-recebedor', 'label' => 'Nome de quem retirou', 'required' => true, 'attrs' => ['maxlength' => 150]]) ?>
                    <?= component('select', ['name' => 'terceiro', 'id' => 'piloto-entrega-terceiro', 'label' => 'Quem está retirando?', 'selected' => '0', 'options' => ['0' => 'Próprio cliente', '1' => 'Terceiro autorizado'], 'required' => true, 'attrs' => ['data-entrega-terceiro' => '']]) ?>
                    <div data-entrega-autorizacao>
                        <?= component('textarea', ['name' => 'autorizacao', 'id' => 'piloto-entrega-autorizacao', 'label' => 'Como o cliente autorizou o terceiro?', 'help' => 'Obrigatório para terceiro. Registre o canal e a confirmação, sem foto ou número de documento.', 'attrs' => ['maxlength' => 500, 'rows' => 3]]) ?>
                    </div>
                    <?= component('textarea', ['name' => 'itens', 'id' => 'piloto-entrega-itens', 'label' => 'Equipamento e itens entregues', 'required' => true, 'help' => 'Confira placa, acessórios e demais itens que estão sendo devolvidos.', 'attrs' => ['maxlength' => 10000, 'rows' => 3]]) ?>
                    <?= component('textarea', ['name' => 'observacoes', 'id' => 'piloto-entrega-observacoes', 'label' => 'Observações internas da retirada', 'attrs' => ['maxlength' => 10000, 'rows' => 2]]) ?>
                    <?= component('alert', ['variant' => 'warning', 'message' => 'A entrega pode ocorrer com saldo em aberto. Registrar a retirada não quita a OS nem altera a garantia. Confira as condições antes de confirmar.']) ?>
                    <?= component('checkbox', ['name' => 'confirmou_condicoes', 'id' => 'piloto-entrega-confirmacao', 'value' => '1', 'label' => 'Conferi os itens, a autorização de retirada e as condições de eventual saldo pendente.', 'required' => true]) ?>
                    <?= component('button', ['label' => 'Confirmar entrega', 'type' => 'submit']) ?>
                </form>
            </details>
        <?php } ?>
    <?php } ?>
    <p class="trifase-os-ajuda">Entrega, pagamento, conclusão técnica e garantia são registros independentes.</p>
    <?php if (($pilotoEntregasHistorico ?? []) !== []) { ?>
        <details class="trifase-os-adicionar">
            <summary>Histórico de entregas</summary>
            <ol class="grid gap-3">
                <?php foreach ($pilotoEntregasHistorico as $eventoEntrega) { ?>
                    <li class="border-b border-border pb-3 text-caption text-text">
                        <?= e('#' . (int) $eventoEntrega->id . ' · ' . ($eventoEntrega->tipo === 'registrar' ? 'Retirada registrada' : 'Cancelamento do registro #' . (int) $eventoEntrega->referencia_id) . ' · ' . date('d/m/Y H:i', strtotime($eventoEntrega->registrado_em)) . ' · Operador #' . (int) $eventoEntrega->usuario_id) ?>
                        <?php if ($eventoEntrega->motivo) { ?><p><?= e($eventoEntrega->motivo) ?></p><?php } ?>
                        <?php if ($eventoEntrega->tipo === 'registrar') { ?>
                            <p><?= component('link', ['label' => 'Consultar comprovante #' . (int) $eventoEntrega->id, 'href' => site_url('trifase_entregas/comprovante/' . $idEntregaOs . '/' . (int) $eventoEntrega->id)]) ?></p>
                        <?php } ?>
                    </li>
                <?php } ?>
            </ol>
        </details>
    <?php } ?>
</section>
