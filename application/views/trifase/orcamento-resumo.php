<?php if (($pilotoOrcamento ?? null) === null) { ?>
    <p class="text-muted">Nenhum orçamento publicado. Confira os itens e valores antes de compartilhar.</p>
<?php } else { ?>
    <p class="text-label-md"><?= e('Versão ' . (int) $pilotoOrcamento->numero . ' · ' . trifaseOrcamentoSituacao($pilotoOrcamentoDecisao)) ?></p>
    <?php if (! $pilotoOrcamentoValido) { ?><p class="text-warning-ink">Versão indisponível no link: publicação retirada, OS cancelada ou itens alterados. O histórico da resposta permanece preservado.</p><?php } ?>
    <?php if ($pilotoOrcamentoDecisao !== null) { ?><p class="break-words text-caption text-muted"><?= e((empty($pilotoOrcamentoDecisao->usuario_id) ? 'Nome informado pelo link: ' : 'Registrada pela equipe em nome de ') . $pilotoOrcamentoDecisao->nome . ' · ' . date('d/m/Y H:i', strtotime($pilotoOrcamentoDecisao->criado_em))) ?></p><?php } ?>
    <?php if ($pilotoOrcamentoValido && $pilotoOrcamentoDecisao === null && ($pilotoPodeRegistrarResposta ?? false)) { ?>
        <details class="trifase-os-adicionar mt-3">
            <summary>Registrar resposta do cliente</summary>
            <form method="post" action="<?= e(site_url('trifase_orcamentos/registrar_resposta/' . (int) $os->idOs)) ?>" class="grid gap-3 p-3" <?= js_module('formulario/padrao') ?>>
                <input type="hidden" name="<?= e($this->security->get_csrf_token_name()) ?>" value="<?= e($this->security->get_csrf_hash()) ?>">
                <input type="hidden" name="versao" value="<?= e((int) $pilotoOrcamento->id) ?>">
                <input type="hidden" name="operacao" value="<?= e(bin2hex(random_bytes(16))) ?>">
                <?= component('select', ['name' => 'decisao', 'label' => 'Resposta', 'placeholder' => 'Selecione', 'required' => true, 'options' => ['aprovar' => 'Aprovou', 'recusar' => 'Recusou']]) ?>
                <?= component('input', ['name' => 'nome', 'label' => 'Nome de quem respondeu', 'required' => true, 'attrs' => ['minlength' => 3, 'maxlength' => 160]]) ?>
                <?= component('checkbox', ['name' => 'confirmar', 'value' => '1', 'label' => 'Confirmo que o cliente respondeu a esta versão do orçamento.', 'required' => true]) ?>
                <?= component('button', ['label' => 'Salvar resposta', 'variant' => 'outline', 'type' => 'submit']) ?>
            </form>
        </details>
    <?php } ?>
<?php } ?>
<?= component('button', ['label' => 'Consultar orçamento e versões', 'variant' => 'outline', 'href' => site_url('trifase_orcamentos/visualizar/' . (int) $os->idOs)]) ?>
