<?php
// Compartilhado entre resumo, histórico e página pública. Notas e operador são privados.
$decisaoExibida = $respostaOrcamento;
$internaOrcamento = ! empty($decisaoExibida->usuario_id);
$canalOrcamento = match ($decisaoExibida->canal ?? '') {
    'telefone' => ' por telefone', 'whatsapp' => ' por WhatsApp', 'presencial' => ' presencialmente', default => '',
};
?>
<?php if (! empty($decisaoExibida->regularizacao_tardia)) { ?>
    <?php $temJustificativa = trim((string) ($decisaoExibida->justificativa ?? '')) !== ''; ?>
    <p class="mt-2 text-caption text-info-ink"><?= e($temJustificativa
        ? 'Regularização administrativa tardia — informação declarada pela equipe, registrada após a entrega.'
        : 'Registro após a entrega — informação declarada pela equipe.') ?></p>
    <?php if (($respostaPrivada ?? false) && ($temJustificativa || (int) ($decisaoExibida->entrega_id ?? 0) > 0)) { ?>
        <pre class="mt-2 whitespace-pre-wrap break-words font-sans text-caption text-muted"><?= e($temJustificativa
            ? 'Justificativa: ' . $decisaoExibida->justificativa . ' · Entrega #' . (int) $decisaoExibida->entrega_id
            : 'Entrega #' . (int) $decisaoExibida->entrega_id) ?></pre>
    <?php } ?>
<?php } ?>
<p class="mt-2 break-words text-caption text-muted"><?= e($internaOrcamento ? 'Resposta registrada pela equipe' . $canalOrcamento . '. Informação declarada pela equipe.' : 'Resposta enviada pelo link.') ?></p>
<p class="mt-2 break-words text-caption text-muted"><?= e(($internaOrcamento ? 'Pessoa que comunicou: ' : 'Nome informado pelo link: ') . $decisaoExibida->nome) ?></p>
<?php if ($internaOrcamento && (! empty($decisaoExibida->comunicado_data) || ! empty($decisaoExibida->comunicado_em))) { ?>
    <p class="mt-2 text-caption text-muted"><?= e('Comunicação informada pela equipe: ' . (! empty($decisaoExibida->comunicado_data)
        ? date('d/m/Y', strtotime($decisaoExibida->comunicado_data))
        : date('d/m/Y H:i', strtotime($decisaoExibida->comunicado_em)))) ?></p>
<?php } ?>
<p class="mt-2 text-caption text-muted"><?= e('Registrado em ' . date('d/m/Y H:i', strtotime($decisaoExibida->criado_em)) . (($respostaPrivada ?? false) && $internaOrcamento ? ' · Operador #' . (int) $decisaoExibida->usuario_id : '')) ?></p>
<?php if (($respostaPrivada ?? false) && ! empty($decisaoExibida->observacao)) { ?>
    <pre class="mt-2 whitespace-pre-wrap break-words font-sans text-caption text-muted"><?= e('Observação interna: ' . $decisaoExibida->observacao) ?></pre>
<?php } ?>
