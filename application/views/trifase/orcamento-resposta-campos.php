<?= component('select', ['name' => 'decisao', 'label' => 'Resposta', 'placeholder' => 'Selecione', 'required' => true, 'options' => ['aprovar' => 'Aprovou', 'recusar' => 'Recusou']]) ?>
<?= component('select', ['name' => 'canal', 'label' => 'Canal da comunicação', 'placeholder' => 'Selecione', 'required' => true, 'options' => ['telefone' => 'Telefone', 'whatsapp' => 'WhatsApp', 'presencial' => 'Presencial']]) ?>
<?= component('input', ['name' => 'nome', 'label' => 'Nome de quem comunicou a decisão', 'required' => true, 'attrs' => ['minlength' => 3, 'maxlength' => 160]]) ?>
<?= component('input', ['name' => 'comunicado_em', 'label' => 'Data e hora informadas da comunicação', 'type' => 'datetime-local', 'required' => true, 'attrs' => ['max' => date('Y-m-d\TH:i')]]) ?>
<?= component('textarea', ['name' => 'observacao', 'label' => 'Observação ou referência interna', 'help' => 'Não será exibida no link público.', 'attrs' => ['maxlength' => 2000, 'rows' => 3]]) ?>
<?php if ($regularizacaoOrcamento ?? false) { ?>
    <?= component('textarea', ['name' => 'justificativa', 'label' => 'Justificativa da regularização tardia', 'help' => 'Explique a origem da informação e por que não foi registrada antes. Uso administrativo interno.', 'required' => true, 'attrs' => ['minlength' => 5, 'maxlength' => 2000, 'rows' => 3]]) ?>
<?php } ?>
<?= component('checkbox', ['name' => 'confirmar', 'value' => '1', 'label' => ($regularizacaoOrcamento ?? false)
    ? 'Confirmo a regularização administrativa tardia desta informação declarada pela equipe, sem alterar a data real do registro ou a entrega.'
    : 'Confirmo a decisão comunicada sobre esta versão. Esta informação é declarada e registrada pela equipe.', 'required' => true]) ?>
