<?php if (($pilotoOrcamento ?? null) === null) { ?>
    <p class="text-muted">Nenhum orçamento publicado. Confira os itens e valores antes de compartilhar.</p>
<?php } else { ?>
    <p class="text-label-md"><?= e('Versão ' . (int) $pilotoOrcamento->numero . ' · ' . trifaseOrcamentoSituacao($pilotoOrcamentoDecisao)) ?></p>
    <?php if (! $pilotoOrcamentoValido) { ?><p class="text-warning-ink">Versão indisponível no link: publicação retirada, OS cancelada ou itens alterados. A resposta registrada agora cria uma nova versão com os itens e valores atuais; o histórico anterior permanece preservado.</p><?php } ?>
    <?php if ($pilotoOrcamentoDecisao !== null) {
        $this->load->view('trifase/orcamento-decisao', ['respostaOrcamento' => $pilotoOrcamentoDecisao, 'respostaPrivada' => true]);
    } ?>
    <?php if ($pilotoOrcamentoEntregue ?? false) { ?>
        <p class="mt-3 text-info-ink">Equipamento entregue. O cliente não decide mais pelo link; a equipe ainda pode registrar a resposta com a data informada.</p>
    <?php } ?>
    <?php if ($pilotoOrcamentoDecisao === null && ($pilotoPodeRegistrarResposta ?? false) && ($os->status ?? null) !== 'Cancelado') { ?>
        <details class="trifase-os-adicionar mt-3">
            <summary>Registrar resposta do cliente</summary>
            <form method="post" action="<?= e(site_url('trifase_orcamentos/registrar_resposta/' . (int) $os->idOs)) ?>" class="grid gap-3 p-3" <?= js_module('formulario/padrao') ?>>
                <input type="hidden" name="<?= e($this->security->get_csrf_token_name()) ?>" value="<?= e($this->security->get_csrf_hash()) ?>">
                <input type="hidden" name="versao" value="<?= e((int) $pilotoOrcamento->id) ?>">
                <input type="hidden" name="operacao" value="<?= e(bin2hex(random_bytes(16))) ?>">
                <?php $this->load->view('trifase/orcamento-resposta-campos', ['regularizacaoOrcamento' => false]); ?>
                <?= component('button', ['label' => 'Salvar resposta', 'variant' => 'outline', 'type' => 'submit']) ?>
            </form>
        </details>
    <?php } ?>
<?php } ?>
<?= component('button', ['label' => 'Consultar orçamento e versões', 'variant' => 'outline', 'href' => site_url('trifase_orcamentos/visualizar/' . (int) $os->idOs)]) ?>
