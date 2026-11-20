<?php if (($pilotoOrcamento ?? null) === null) { ?>
    <p class="text-muted">Nenhum orçamento publicado. Confira os itens e valores antes de compartilhar.</p>
<?php } else { ?>
    <p class="text-label-md"><?= e('Versão ' . (int) $pilotoOrcamento->numero . ' · ' . trifaseOrcamentoSituacao($pilotoOrcamentoDecisao)) ?></p>
    <?php if (! $pilotoOrcamentoValido) { ?><p class="text-warning-ink">Versão indisponível no link: publicação retirada, OS cancelada ou itens alterados. O histórico da resposta permanece preservado.</p><?php } ?>
    <?php if ($pilotoOrcamentoDecisao !== null) {
        $this->load->view('trifase/orcamento-decisao', ['respostaOrcamento' => $pilotoOrcamentoDecisao, 'respostaPrivada' => true]);
    } ?>
    <?php if ($pilotoOrcamentoEntregue ?? false) { ?>
        <p class="mt-3 text-info-ink">Equipamento entregue. Este orçamento está disponível somente para consulta.</p>
    <?php } ?>
    <?php if ($pilotoOrcamentoValido && ! ($pilotoOrcamentoEntregue ?? false) && $pilotoOrcamentoDecisao === null && ($pilotoPodeRegistrarResposta ?? false)) { ?>
        <details class="trifase-os-adicionar mt-3">
            <summary>Registrar resposta do cliente</summary>
            <form method="post" action="<?= e(site_url('trifase_orcamentos/registrar_resposta/' . (int) $os->idOs)) ?>" class="grid gap-3 p-3" <?= js_module('formulario/padrao') ?>>
                <input type="hidden" name="<?= e($this->security->get_csrf_token_name()) ?>" value="<?= e($this->security->get_csrf_hash()) ?>">
                <input type="hidden" name="versao" value="<?= e((int) $pilotoOrcamento->id) ?>">
                <input type="hidden" name="operacao" value="<?= e(bin2hex(random_bytes(16))) ?>">
<?= component('select', ['name' => 'decisao', 'label' => 'Resposta', 'placeholder' => 'Selecione', 'required' => true, 'options' => ['aprovar' => 'Aprovou', 'recusar' => 'Recusou']]) ?>
<?= component('select', ['name' => 'canal', 'label' => 'Canal da comunicação', 'placeholder' => 'Selecione', 'required' => true, 'options' => ['telefone' => 'Telefone', 'whatsapp' => 'WhatsApp', 'presencial' => 'Presencial']]) ?>
<?= component('input', ['name' => 'nome', 'label' => 'Nome de quem comunicou a decisão', 'required' => true, 'attrs' => ['minlength' => 3, 'maxlength' => 160]]) ?>
<?= component('input', ['name' => 'comunicado_em', 'label' => 'Data e hora informadas da comunicação', 'type' => 'datetime-local', 'required' => true, 'attrs' => ['max' => date('Y-m-d\TH:i')]]) ?>
<?= component('textarea', ['name' => 'observacao', 'label' => 'Observação ou referência interna', 'help' => 'Não será exibida no link público.', 'attrs' => ['maxlength' => 2000, 'rows' => 3]]) ?>
<?= component('checkbox', ['name' => 'confirmar', 'value' => '1', 'label' => 'Confirmo a decisão comunicada sobre esta versão. Esta informação é declarada e registrada pela equipe.', 'required' => true]) ?>
                <?= component('button', ['label' => 'Salvar resposta', 'variant' => 'outline', 'type' => 'submit']) ?>
            </form>
        </details>
    <?php } ?>

<?php } ?>
<?= component('button', ['label' => 'Consultar orçamento e versões', 'variant' => 'outline', 'href' => site_url('trifase_orcamentos/visualizar/' . (int) $os->idOs)]) ?>
