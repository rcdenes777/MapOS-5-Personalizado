<?php if (! empty($retratoOrcamento['apresentacao'])) { ?>
    <section class="rounded-card border border-border bg-surface p-4" aria-labelledby="orcamento-atendimento">
        <h2 id="orcamento-atendimento" class="text-heading-sm">Informações do orçamento</h2>
        <dl class="mt-4 grid gap-4">
            <?php foreach (['equipamento' => 'Equipamento', 'defeito' => 'Defeito relatado', 'diagnostico' => 'Diagnóstico', 'pagamento' => 'Condições de pagamento', 'prazo' => 'Prazo estimado de execução', 'garantia' => 'Garantia do serviço'] as $campoPublico => $rotuloPublico) { ?>
                <div><dt class="text-label-md"><?= e($rotuloPublico) ?></dt><dd class="mt-1 whitespace-pre-wrap break-words text-body-md"><?= e(($retratoOrcamento['apresentacao'][$campoPublico] ?? '') !== '' ? $retratoOrcamento['apresentacao'][$campoPublico] : 'A confirmar com a assistência') ?></dd></div>
            <?php } ?>
        </dl>
    </section>
<?php } ?>
