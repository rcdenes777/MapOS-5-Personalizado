<div class="mx-auto flex max-w-4xl flex-col gap-5 py-4">
    <header><h1 class="text-heading-xl text-text"><?= e('Orçamento da OS #' . (int) $ordemOrcamento->idOs) ?></h1><p class="mt-2 text-body-md text-muted">Confira a prévia antes de publicar. Somente a versão publicada estará disponível pelo link ativo desta OS.</p></header>
    <?= component('link', ['label' => 'Voltar à OS', 'href' => site_url('os/visualizar/' . (int) $ordemOrcamento->idOs)]) ?>
    <?php if ($orcamentoAtual !== null) { ?>
        <section class="rounded-card border border-border bg-surface p-4">
            <h2 class="text-heading-sm text-text"><?= e('Versão ' . (int) $orcamentoAtual->numero . ($orcamentoAtual->ativo ? ' publicada' : ' retirada do link')) ?></h2>
            <?php if ($orcamentoAtual->ativo && ! hash_equals($orcamentoAtual->conteudo_hash, $hashOrcamento)) { ?><p class="mt-3 text-danger-ink">Os dados da OS mudaram. Esta versão deixou de aparecer ao cliente; publique uma nova após conferir.</p><?php } ?>
            <?php if ($orcamentoAtual->ativo && $podePublicarOrcamento) { ?>
                <details class="mt-3"><summary>Retirar orçamento do link</summary>
                    <form method="post" action="<?= e(site_url('trifase_orcamentos/retirar/' . (int) $ordemOrcamento->idOs)) ?>" class="mt-3 grid gap-3">
                        <input type="hidden" name="<?= e($this->security->get_csrf_token_name()) ?>" value="<?= e($this->security->get_csrf_hash()) ?>">
                        <input type="hidden" name="versao" value="<?= e((int) $orcamentoAtual->id) ?>"><input type="hidden" name="operacao" value="<?= e(bin2hex(random_bytes(16))) ?>">
                        <?= component('checkbox', ['name' => 'confirmar', 'id' => 'retirar-orcamento', 'value' => '1', 'label' => 'Retirar a publicação e preservar versões e respostas no histórico.', 'required' => true]) ?>
                        <?= component('button', ['label' => 'Retirar publicação', 'type' => 'submit', 'variant' => 'outline']) ?>
                    </form>
                </details>
            <?php } ?>
        </section>
    <?php } ?>
    <section class="rounded-card border border-border bg-surface p-4" aria-labelledby="orcamento-previa">
        <h2 id="orcamento-previa" class="mb-3 text-heading-sm text-text">Prévia dos itens atuais</h2>
        <?php if ($retratoOrcamento['itens'] === []) { ?><p class="text-muted">Adicione peças ou serviços à OS antes de publicar.</p><?php } else { ?>
            <?php $this->load->view('trifase/orcamento-itens'); ?>
            <?php if ($podePublicarOrcamento && $ordemOrcamento->status !== 'Cancelado') { ?>
                <form method="post" action="<?= e(site_url('trifase_orcamentos/publicar/' . (int) $ordemOrcamento->idOs)) ?>" class="mt-5 grid gap-3">
                    <input type="hidden" name="<?= e($this->security->get_csrf_token_name()) ?>" value="<?= e($this->security->get_csrf_hash()) ?>">
                    <input type="hidden" name="retrato_hash" value="<?= e($hashOrcamento) ?>"><input type="hidden" name="operacao" value="<?= e(bin2hex(random_bytes(16))) ?>">
                    <h3 class="text-heading-sm">Informações para o cliente</h3>
                    <p class="text-body-md text-muted">Revise o diagnóstico e os demais textos antes de publicar. Eles ficarão gravados nesta versão; anotações internas e alterações futuras da OS não serão compartilhadas automaticamente.</p>
                    <?php foreach (['equipamento' => ['Equipamento', 500], 'defeito' => ['Defeito relatado', 4000], 'diagnostico' => ['Diagnóstico para o cliente', 4000], 'pagamento' => ['Condições de pagamento', 1000], 'prazo' => ['Prazo estimado de execução', 500], 'garantia' => ['Garantia do serviço', 1000]] as $campoPublico => [$rotuloPublico, $limitePublico]) { ?>
                        <?= component('textarea', ['name' => 'publico_' . $campoPublico, 'id' => 'publico-' . $campoPublico, 'label' => $rotuloPublico, 'value' => $apresentacaoOrcamento[$campoPublico], 'attrs' => ['maxlength' => $limitePublico], 'help' => 'Texto que será exibido ao cliente.']) ?>
                    <?php } ?>
                    <?= component('checkbox', ['name' => 'confirmar', 'id' => 'publicar-orcamento', 'value' => '1', 'label' => 'Conferi os textos, itens e valores e autorizo mostrar este orçamento a quem tiver o link desta OS.', 'required' => true]) ?>
                    <?= component('button', ['label' => 'Publicar nova versão', 'type' => 'submit']) ?>
                </form>
            <?php } ?>
        <?php } ?>
    </section>
    <section class="rounded-card border border-border bg-surface p-4">
        <h2 class="mb-3 text-heading-sm text-text">Versões e respostas</h2>
        <?php if ($versoesOrcamento === []) { ?><p class="text-muted">Nenhuma versão publicada.</p><?php } ?>
        <ol class="grid gap-3">
            <?php foreach ($versoesOrcamento as $versaoHistorica) { ?>
                <li class="rounded-sm border border-border p-3">
                    <details><summary class="text-label-md text-text"><?= e('Versão ' . (int) $versaoHistorica->numero . ' · ' . date('d/m/Y H:i', strtotime($versaoHistorica->criado_em))) ?></summary>
                        <div class="mt-3"><?php $historicoRetrato = json_decode($versaoHistorica->conteudo, true, 32, JSON_THROW_ON_ERROR);
                $this->load->view('trifase/orcamento-atendimento', ['retratoOrcamento' => $historicoRetrato]);
                $this->load->view('trifase/orcamento-itens', ['retratoOrcamento' => $historicoRetrato]); ?></div>
                    </details>
                    <?php foreach ($eventosOrcamento as $eventoOrcamento) {
                        if ((int) $eventoOrcamento->versao_id !== (int) $versaoHistorica->id) {
                            continue;
                        } ?>
                        <p class="mt-2 break-words text-caption text-muted"><?= e(match ($eventoOrcamento->tipo) {
                            'publicar' => 'Publicada', 'retirar' => 'Retirada do link', 'aprovar' => 'Aprovada por ' . $eventoOrcamento->nome . ' (nome informado pelo link)', 'recusar' => 'Recusada por ' . $eventoOrcamento->nome . ' (nome informado pelo link)', default => 'Evento'
                        } . ' · ' . date('d/m/Y H:i', strtotime($eventoOrcamento->criado_em))) ?></p>
                    <?php } ?>
                </li>
            <?php } ?>
        </ol>
    </section>
</div>
