<?php if (($pilotoOrcamento ?? null) === null) { ?>
    <p class="text-muted">Nenhum orçamento publicado. Confira os itens e valores antes de compartilhar.</p>
<?php } else { ?>
    <p class="text-label-md"><?= e('Versão ' . (int) $pilotoOrcamento->numero . ' · ' . trifaseOrcamentoSituacao($pilotoOrcamentoDecisao)) ?></p>
    <?php if (! $pilotoOrcamentoValido) { ?><p class="text-warning-ink">Versão indisponível no link: publicação retirada, OS cancelada ou itens alterados. O histórico da resposta permanece preservado.</p><?php } ?>
    <?php if ($pilotoOrcamentoDecisao !== null) { ?><p class="break-words text-caption text-muted"><?= e('Nome informado pelo link: ' . $pilotoOrcamentoDecisao->nome . ' · ' . date('d/m/Y H:i', strtotime($pilotoOrcamentoDecisao->criado_em))) ?></p><?php } ?>
<?php } ?>
<?= component('button', ['label' => 'Consultar orçamento e versões', 'variant' => 'outline', 'href' => site_url('trifase_orcamentos/visualizar/' . (int) $os->idOs)]) ?>
