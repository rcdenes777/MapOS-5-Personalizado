<?php if (! empty($os->trifase_garantia_inicio)) { ?>
    <p class="text-caption text-muted"><?= e('Conclusão técnica registrada em ' . dataBr($os->trifase_garantia_inicio)) ?></p>
<?php } ?>
<details class="trifase-os-adicionar">
    <summary>Atualizar andamento</summary>
    <form method="post" action="<?= e(site_url('trifase_atendimentos/andamento/' . (int) $os->idOs)) ?>" class="grid gap-3 p-3" <?= js_module('formulario/padrao') ?>>
        <input type="hidden" name="<?= e($this->security->get_csrf_token_name()) ?>" value="<?= e($this->security->get_csrf_hash()) ?>">
        <?= component('select', ['name' => 'status', 'id' => 'piloto-andamento-tecnico', 'label' => 'Andamento do serviço', 'selected' => $os->status, 'options' => ['Orçamento' => 'Orçamento', 'Negociação' => 'Negociação', 'Orçamento recusado' => 'Orçamento recusado', 'Aberto' => 'Aberto', 'Aprovado' => 'Aprovado', 'Em Andamento' => 'Em Andamento', 'Aguardando Peças' => 'Aguardando Peças', 'Finalizado' => 'Finalizado']]) ?>
        <p class="text-caption text-muted">Ao finalizar pela primeira vez, a conclusão será registrada na data de hoje, com o prazo concedido nesta OS. Uma conclusão já conhecida mantém sua referência. Cobrança e retirada são independentes.</p>
        <?= component('checkbox', ['name' => 'confirmar', 'id' => 'confirmar-andamento-tecnico', 'value' => '1', 'label' => 'Conferi o andamento e confirmo a alteração.', 'required' => true]) ?>
        <?= component('button', ['label' => 'Salvar andamento', 'type' => 'submit']) ?>
    </form>
</details>
<?php if ($os->status === 'Finalizado' && empty($os->trifase_garantia_inicio)) { ?>
    <details class="trifase-os-adicionar mt-3">
        <summary>Registrar conclusão real ainda não informada</summary>
        <form method="post" action="<?= e(site_url('trifase_atendimentos/conclusao/' . (int) $os->idOs)) ?>" class="grid gap-3 p-3" <?= js_module('formulario/padrao') ?>>
            <input type="hidden" name="<?= e($this->security->get_csrf_token_name()) ?>" value="<?= e($this->security->get_csrf_hash()) ?>">
            <?= component('input', ['name' => 'conclusao', 'id' => 'conclusao-real', 'label' => 'Data real da conclusão', 'type' => 'date', 'required' => true, 'attrs' => ['min' => $os->dataInicial, 'max' => date('Y-m-d')]]) ?>
            <?= component('checkbox', ['name' => 'confirmar', 'id' => 'confirmar-conclusao-real', 'value' => '1', 'label' => 'Conferi a data real: ela passará a ser a referência da garantia deste atendimento.', 'required' => true]) ?>
            <?= component('button', ['label' => 'Registrar conclusão', 'type' => 'submit', 'variant' => 'outline']) ?>
        </form>
    </details>
<?php } ?>
