<?php if (($pilotoOrcamento ?? null) === null) { ?>
    <p class="text-muted">Nenhum orçamento publicado. Confira os itens e valores antes de compartilhar.</p>
<?php } else { ?>
    <p class="text-label-md"><?= e('Versão ' . (int) $pilotoOrcamento->numero . ' · ' . trifaseOrcamentoSituacao($pilotoOrcamentoDecisao)) ?></p>
    <?php $orcamentoEntregue = $pilotoOrcamentoEntregue ?? false;
    $podeRegistrar = $pilotoOrcamentoDecisao === null && ($pilotoPodeRegistrarResposta ?? false)
        && ($os->status ?? null) !== 'Cancelado' && isset($pilotoRetratoOrcamento, $pilotoHashOrcamento); ?>
    <?php if (! $pilotoOrcamentoValido) { ?><p class="text-warning-ink"><?= e($orcamentoEntregue
        ? 'Versão indisponível no link: publicação retirada, OS cancelada ou itens alterados. Como o equipamento já foi entregue, não será criada nova versão comercial; uma resposta anterior à entrega só pode ser documentada por regularização tardia sobre a versão histórica, quando autorizada.'
        : 'Versão indisponível no link: publicação retirada, OS cancelada ou itens alterados. A resposta registrada agora cria uma nova versão com os itens e valores atuais; o histórico anterior permanece preservado.') ?></p><?php } ?>
    <?php if ($pilotoOrcamentoDecisao !== null) {
        $this->load->view('trifase/orcamento-decisao', ['respostaOrcamento' => $pilotoOrcamentoDecisao, 'respostaPrivada' => true]);
    } ?>
    <?php if ($orcamentoEntregue) { ?>
        <p class="mt-3 text-info-ink">Equipamento entregue. O orçamento está disponível somente para consulta pelo link; a equipe ainda pode registrar a resposta informada antes da entrega; após a entrega não é criada nova versão comercial.</p>
    <?php } ?>
    <?php if ($podeRegistrar && (! $orcamentoEntregue || $pilotoOrcamentoValido)) { ?>
        <details class="trifase-os-adicionar mt-3">
            <summary>Registrar resposta do cliente</summary>
            <form method="post" action="<?= e(site_url('trifase_orcamentos/registrar_resposta/' . (int) $os->idOs)) ?>" class="grid gap-3 p-3" <?= js_module('formulario/padrao') ?>>
                <input type="hidden" name="<?= e($this->security->get_csrf_token_name()) ?>" value="<?= e($this->security->get_csrf_hash()) ?>">
                <input type="hidden" name="versao" value="<?= e((int) $pilotoOrcamento->id) ?>">
                <input type="hidden" name="operacao" value="<?= e(bin2hex(random_bytes(16))) ?>">
                <h3 class="text-label-md">Valores exatos desta resposta</h3>
                <?php $this->load->view('trifase/orcamento-itens', ['retratoOrcamento' => $pilotoRetratoOrcamento]); ?>
                <p class="break-all text-caption">Identificador da prévia: <?= e($pilotoHashOrcamento) ?></p>
                <input type="hidden" name="retrato_hash" value="<?= e($pilotoHashOrcamento) ?>">
                <label><input type="checkbox" name="confirmar_retrato" value="1" required> Confirmei que a resposta já informada pelo cliente se refere exatamente aos itens e valores acima; este registro não é assinatura nem consentimento digital do cliente.</label>
                <?php $this->load->view('trifase/orcamento-resposta-campos', ['regularizacaoOrcamento' => false]); ?>
                <?= component('button', ['label' => 'Salvar resposta', 'variant' => 'outline', 'type' => 'submit']) ?>
            </form>
        </details>
    <?php } elseif ($podeRegistrar && $orcamentoEntregue && ! $pilotoOrcamentoValido && ($pilotoPodeRegularizarOrcamento ?? false) && (int) ($pilotoOrcamento->ativo ?? 0) === 1) { ?>
        <details class="trifase-os-adicionar mt-3">
            <summary>Regularização administrativa tardia</summary>
            <p class="mt-2 text-caption text-muted">A resposta será vinculada à versão histórica documentada, não aos valores atuais. A entrega e o histórico técnico são preservados.</p>
            <form method="post" action="<?= e(site_url('trifase_orcamentos/regularizar_resposta/' . (int) $os->idOs)) ?>" class="grid gap-3 p-3" <?= js_module('formulario/padrao') ?>>
                <input type="hidden" name="<?= e($this->security->get_csrf_token_name()) ?>" value="<?= e($this->security->get_csrf_hash()) ?>">
                <input type="hidden" name="versao" value="<?= e((int) $pilotoOrcamento->id) ?>">
                <input type="hidden" name="operacao" value="<?= e(bin2hex(random_bytes(16))) ?>">
                <?php $this->load->view('trifase/orcamento-resposta-campos', ['regularizacaoOrcamento' => true]); ?>
                <?= component('button', ['label' => 'Registrar regularização tardia', 'variant' => 'outline', 'type' => 'submit']) ?>
            </form>
        </details>
    <?php } elseif ($podeRegistrar && $orcamentoEntregue && ! $pilotoOrcamentoValido) { ?>
        <p class="mt-3 text-muted"><?= e((int) ($pilotoOrcamento->ativo ?? 0) === 1
            ? 'A resposta não pode ser registrada nesta tela: após a entrega, somente uma regularização tardia sobre a versão histórica, com permissão específica, pode documentá-la.'
            : 'A publicação desta versão foi retirada do link. Publique uma versão ativa ou use a regularização tardia autorizada antes de documentar a resposta.') ?></p>
    <?php } ?>
<?php } ?>
<?= component('button', ['label' => 'Consultar orçamento e versões', 'variant' => 'outline', 'href' => site_url('trifase_orcamentos/visualizar/' . (int) $os->idOs)]) ?>
