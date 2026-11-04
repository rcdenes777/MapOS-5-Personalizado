        <?php if ($erroOrcamento !== null) { ?><?= component('alert', ['variant' => 'danger', 'message' => $erroOrcamento, 'title' => 'Confira sua resposta']) ?><?php } ?>
        <?php $this->load->view('trifase/orcamento-atendimento'); ?>
        <section class="rounded-card border border-border bg-surface p-4" aria-labelledby="orcamento-itens">
            <h2 id="orcamento-itens" class="mb-3 text-heading-sm"><?= e('Orçamento · Versão ' . (int) $versaoOrcamento->numero) ?></h2>
            <?php $this->load->view('trifase/orcamento-itens'); ?>
            <p class="mt-4 text-caption text-muted">A decisão se refere somente a esta versão. Aprovação não registra pagamento nem retirada do equipamento.</p>
        </section>
        <section class="rounded-card border border-border bg-surface p-4" aria-labelledby="orcamento-resposta">
            <h2 id="orcamento-resposta" class="text-heading-sm">Sua resposta</h2>
            <?php if ($decisaoOrcamento !== null) { ?>
                <p class="mt-3 text-heading-sm"><?= e(trifaseOrcamentoSituacao($decisaoOrcamento)) ?></p>
                <p class="mt-2 text-body-md"><?= e('Nome informado: ' . $decisaoOrcamento->nome) ?></p>
                <p class="mt-2 text-caption text-muted"><?= e('Registrado em ' . date('d/m/Y H:i', strtotime($decisaoOrcamento->criado_em))) ?></p>
                <p class="mt-3 text-body-md text-muted">Para alterar sua decisão, solicite uma nova versão à assistência.</p>
            <?php } else { ?>
                <form method="post" action="<?= e($responderOrcamentoUrl) ?>" class="mt-4 grid gap-4">
                    <input type="hidden" name="<?= e($this->security->get_csrf_token_name()) ?>" value="<?= e($this->security->get_csrf_hash()) ?>">
                    <input type="hidden" name="versao" value="<?= e((int) $versaoOrcamento->id) ?>">
                    <input type="hidden" name="operacao" value="<?= e(bin2hex(random_bytes(16))) ?>">
                    <?= component('input', ['name' => 'nome', 'id' => 'orcamento-nome', 'label' => 'Seu nome completo', 'required' => true, 'autocomplete' => 'name', 'attrs' => ['minlength' => 3, 'maxlength' => 160]]) ?>
                    <?= component('select', ['name' => 'decisao', 'id' => 'orcamento-decisao', 'label' => 'Decisão sobre este orçamento', 'required' => true, 'options' => ['' => 'Selecione uma opção', 'aprovar' => 'Aprovar orçamento', 'recusar' => 'Recusar orçamento']]) ?>
                    <?= component('checkbox', ['name' => 'confirmar', 'id' => 'orcamento-confirmar', 'value' => '1', 'label' => 'Conferi os itens e o total desta versão e confirmo a decisão selecionada.', 'required' => true]) ?>
                    <?= component('button', ['label' => 'Registrar minha resposta', 'type' => 'submit']) ?>
                </form>
                <p class="mt-3 text-caption text-muted">Este link permite registrar a decisão de quem o possui. Compartilhe apenas com pessoas autorizadas.</p>
            <?php } ?>
        </section>
