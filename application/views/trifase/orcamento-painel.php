<div class="mx-auto flex max-w-4xl flex-col gap-5 py-4">
    <header><h1 class="text-heading-xl text-text"><?= e('Orçamento da OS #' . (int) $ordemOrcamento->idOs) ?></h1><p class="mt-2 text-body-md text-muted">Confira a prévia antes de publicar. Somente a versão publicada estará disponível pelo link ativo desta OS.</p></header>
    <?= component('link', ['label' => 'Voltar à OS', 'href' => site_url('os/visualizar/' . (int) $ordemOrcamento->idOs)]) ?>
    <?php if ($orcamentoEntregue ?? false) { ?>
        <?= component('alert', ['variant' => 'info', 'message' => 'Equipamento entregue. Novas publicações e a decisão pelo link estão bloqueadas; a equipe ainda pode registrar a resposta do cliente. Orçamento e histórico permanecem disponíveis para consulta.']) ?>
    <?php } ?>
    <?php if ($orcamentoAtual !== null) { ?>
        <section class="rounded-card border border-border bg-surface p-4">
            <h2 class="text-heading-sm text-text"><?= e('Versão ' . (int) $orcamentoAtual->numero . ($orcamentoAtual->ativo ? ' publicada' : ' retirada do link')) ?></h2>
            <?php if ($aguardaDecisaoOrcamento ?? false) { ?><p class="mt-2 text-body-md text-muted">Esta versão aguarda decisão comercial do cliente. O andamento técnico permanece independente.</p><?php } ?>
            <?php if ($orcamentoAtual->ativo && ! hash_equals($orcamentoAtual->conteudo_hash, $hashOrcamento)) { ?><p class="mt-3 text-danger-ink">Os dados da OS mudaram. Esta versão deixou de aparecer ao cliente; registre a resposta na tela da OS para criar uma versão com os itens atuais (antes da entrega, também é possível publicar uma nova versão).</p><?php } ?>
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
    <?php if ($podePublicarOrcamento && $orcamentoAtual !== null && $orcamentoAtual->ativo && ! ($orcamentoEntregue ?? false) && ! ($negociacaoDisponivel ?? false)) { ?>
        <?= component('alert', ['variant' => 'info', 'message' => $negociacaoMotivo ?? 'A negociação do orçamento exige os módulos financeiro e de entregas ativos e o banco de dados atualizado.']) ?>
    <?php } ?>
    <?php if ($podePublicarOrcamento && $orcamentoAtual !== null && $orcamentoAtual->ativo && ($orcamentoVigente ?? false) && ($negociacaoDisponivel ?? false) && ! ($orcamentoEntregue ?? false)) { ?>
        <section class="rounded-card border border-border bg-surface p-4" aria-labelledby="negociacao-titulo">
            <h2 id="negociacao-titulo" class="text-heading-sm text-text">Negociar desconto</h2>
            <p class="mt-2 text-body-md text-muted">O desconto informado substitui o desconto geral atual; zero o remove. A nova versão substituirá a atual e aguardará nova decisão comercial, sem reiniciar o trabalho técnico.</p>
            <?php if ($linkPublicoAtivo ?? null) { ?>
                <?= component('input', ['name' => 'link_publico_atual', 'label' => 'Link atual do cliente', 'value' => $linkPublicoAtivo, 'readonly' => true, 'help' => 'O mesmo link será mantido; não é necessário enviar outro.']) ?>
            <?php } else { ?><p class="mt-2 text-muted">O link atual não está disponível nesta tela.</p><?php } ?>
            <h3 class="mt-4 text-label-md">Valores atuais</h3>
            <dl class="mt-2 grid gap-2 text-body-md">
                <div class="flex flex-wrap justify-between gap-2"><dt>Subtotal de peças e serviços</dt><dd><?= e(dinheiro(($retratoOrcamento['pecas_c'] + $retratoOrcamento['servicos_c']) / 100)) ?></dd></div>
                <div class="flex flex-wrap justify-between gap-2"><dt>Desconto geral atual</dt><dd><?= e(dinheiro($retratoOrcamento['desconto_c'] / 100)) ?></dd></div>
                <div class="flex flex-wrap justify-between gap-2"><dt>Total atual</dt><dd><?= e(dinheiro($retratoOrcamento['total_c'] / 100)) ?></dd></div>
            </dl>
            <?php if ($previaNegociacao ?? null) { ?>
                <h3 class="mt-4 text-label-md">Prévia calculada pelo servidor</h3>
                <dl class="mt-2 grid gap-2 text-body-md">
                    <div class="flex flex-wrap justify-between gap-2"><dt>Subtotal proposto</dt><dd><?= e(dinheiro(($previaNegociacao['retrato']['pecas_c'] + $previaNegociacao['retrato']['servicos_c']) / 100)) ?></dd></div>
                    <div class="flex flex-wrap justify-between gap-2"><dt>Desconto geral proposto</dt><dd><?= e(dinheiro($previaNegociacao['retrato']['desconto_c'] / 100)) ?></dd></div>
                    <div class="flex flex-wrap justify-between gap-2"><dt>Total proposto</dt><dd><?= e(dinheiro($previaNegociacao['retrato']['total_c'] / 100)) ?></dd></div>
                </dl>
                <p class="mt-3 break-words text-body-md"><?= e('Desconto solicitado: ' . $previaNegociacao['valor'] . ($previaNegociacao['tipo'] === 'real' ? ' em reais' : '%')) ?></p>
                <p class="mt-2 break-words text-body-md"><?= e('Motivo interno: ' . $previaNegociacao['motivo']) ?></p>
                <h3 class="mt-4 text-label-md">Textos e condições publicados que serão preservados</h3>
                <?php foreach (['equipamento' => 'Equipamento', 'defeito' => 'Defeito', 'diagnostico' => 'Diagnóstico', 'pagamento' => 'Pagamento', 'prazo' => 'Prazo', 'garantia' => 'Garantia'] as $campo => $rotulo) { ?>
                    <p class="mt-2 break-words text-body-md"><?= e($rotulo . ': ' . (($apresentacaoPublicada[$campo] ?? '') ?: 'Não informado')) ?></p>
                <?php } ?>
                <form method="post" action="<?= e(site_url('trifase_orcamentos/negociar_desconto/' . (int) $ordemOrcamento->idOs)) ?>" class="mt-4 grid gap-3">
                    <input type="hidden" name="<?= e($this->security->get_csrf_token_name()) ?>" value="<?= e($this->security->get_csrf_hash()) ?>">
                    <?php foreach (['versao', 'hash_anterior', 'hash_proposto', 'operacao', 'tipo'] as $campo) { ?><input type="hidden" name="<?= e($campo) ?>" value="<?= e($previaNegociacao[$campo]) ?>"><?php } ?>
                    <input type="hidden" name="valor_codificado" value="<?= e(base64_encode($previaNegociacao['valor'])) ?>">
                    <input type="hidden" name="motivo_codificado" value="<?= e(base64_encode($previaNegociacao['motivo'])) ?>">
                    <?= component('checkbox', ['name' => 'confirmar', 'id' => 'confirmar-negociacao', 'value' => '1', 'label' => 'Conferi a prévia e autorizo divulgar a nova versão pelo mesmo link.', 'required' => true]) ?>
                    <?= component('button', ['label' => 'Aplicar desconto e publicar nova versão', 'type' => 'submit', 'variant' => 'outline']) ?>
                    <?= component('link', ['label' => 'Alterar proposta', 'href' => site_url('trifase_orcamentos/visualizar/' . (int) $ordemOrcamento->idOs)]) ?>
                </form>
            <?php } else { ?>
                <form method="post" action="<?= e(site_url('trifase_orcamentos/prever_desconto/' . (int) $ordemOrcamento->idOs)) ?>" class="mt-4 grid gap-3">
                    <input type="hidden" name="<?= e($this->security->get_csrf_token_name()) ?>" value="<?= e($this->security->get_csrf_hash()) ?>">
                    <input type="hidden" name="versao" value="<?= e((int) $orcamentoAtual->id) ?>">
                    <input type="hidden" name="hash_anterior" value="<?= e($orcamentoAtual->conteudo_hash) ?>">
                    <?= component('select', ['name' => 'tipo', 'label' => 'Tipo de desconto', 'options' => ['real' => 'Valor em reais', 'porcento' => 'Porcentagem'], 'required' => true]) ?>
                    <?= component('input', ['name' => 'valor', 'label' => 'Desconto geral proposto', 'required' => true, 'attrs' => ['inputmode' => 'decimal'], 'help' => 'Informe o valor total do desconto, não um desconto adicional.']) ?>
                    <?= component('textarea', ['name' => 'motivo', 'label' => 'Motivo interno', 'required' => true, 'help' => 'Obrigatório e privado; não aparece para o cliente.']) ?>
                    <?= component('button', ['label' => 'Calcular prévia', 'type' => 'submit', 'variant' => 'outline']) ?>
                </form>
            <?php } ?>
        </section>
    <?php } ?>
    <section class="rounded-card border border-border bg-surface p-4" aria-labelledby="orcamento-previa">
        <h2 id="orcamento-previa" class="mb-3 text-heading-sm text-text">Prévia dos itens atuais</h2>
        <?php if ($retratoOrcamento['itens'] === []) { ?><p class="text-muted">Adicione peças ou serviços à OS antes de publicar.</p><?php } else { ?>
            <?php $this->load->view('trifase/orcamento-itens'); ?>
            <?php if ($podePublicarOrcamento && $ordemOrcamento->status !== 'Cancelado' && ! ($orcamentoEntregue ?? false)) { ?>
                <form method="post" action="<?= e(site_url('trifase_orcamentos/publicar/' . (int) $ordemOrcamento->idOs)) ?>" class="mt-5 grid gap-3">
                    <input type="hidden" name="<?= e($this->security->get_csrf_token_name()) ?>" value="<?= e($this->security->get_csrf_hash()) ?>">
                    <input type="hidden" name="retrato_hash" value="<?= e($hashOrcamento) ?>"><input type="hidden" name="operacao" value="<?= e(bin2hex(random_bytes(16))) ?>">
                    <h3 class="text-heading-sm">Informações para o cliente</h3>
                    <p class="text-body-md text-muted">Revise o diagnóstico e os demais textos antes de publicar. Eles ficarão gravados nesta versão; anotações internas e alterações futuras da OS não serão compartilhadas automaticamente.</p>
                    <?php foreach (['equipamento' => ['Equipamento', 500], 'defeito' => ['Defeito relatado', 4000], 'diagnostico' => ['Diagnóstico para o cliente', 4000]] as $campoPublico => [$rotuloPublico, $limitePublico]) { ?>
                        <?= component('textarea', ['name' => 'publico_' . $campoPublico, 'id' => 'publico-' . $campoPublico, 'label' => $rotuloPublico, 'value' => $apresentacaoOrcamento[$campoPublico], 'attrs' => ['maxlength' => $limitePublico], 'help' => 'Texto que será exibido ao cliente.']) ?>
                    <?php } ?>
                    <?php $this->load->view('trifase/orcamento-condicoes'); ?>
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
                            'publicar' => 'Publicada', 'retirar' => 'Retirada do link', 'aprovar' => 'Aprovada', 'recusar' => 'Recusada', default => 'Evento'
                        } . ' · ' . date('d/m/Y H:i', strtotime($eventoOrcamento->criado_em))) ?></p>
                        <?php $auditoriaNegociacao = isset($eventoOrcamento->negociacao) ? json_decode((string) $eventoOrcamento->negociacao, true) : null; ?>
                        <?php if (is_array($auditoriaNegociacao) && isset($auditoriaNegociacao['motivo'], $auditoriaNegociacao['tipo'], $auditoriaNegociacao['solicitado'], $auditoriaNegociacao['anterior_c'], $auditoriaNegociacao['novo_c'])) { ?>
                            <div class="mt-2 break-words text-caption text-muted">
                                <p><?= e('Operador #' . (int) $eventoOrcamento->usuario_id . ' · Negociação interna') ?></p>
                                <p><?= e('Total anterior: ' . dinheiro((int) $auditoriaNegociacao['anterior_c'] / 100) . ' · Novo total: ' . dinheiro((int) $auditoriaNegociacao['novo_c'] / 100)) ?></p>
                                <p><?= e('Desconto solicitado: ' . $auditoriaNegociacao['solicitado'] . ($auditoriaNegociacao['tipo'] === 'porcento' ? '%' : ' em reais')) ?></p>
                                <p><?= e('Motivo interno: ' . $auditoriaNegociacao['motivo']) ?></p>
                            </div>
                        <?php } ?>
                        <?php if (in_array($eventoOrcamento->tipo, ['aprovar', 'recusar'], true)) {
                            $this->load->view('trifase/orcamento-decisao', ['respostaOrcamento' => $eventoOrcamento, 'respostaPrivada' => true]);
                        } ?>
                    <?php } ?>
                </li>
            <?php } ?>
        </ol>
    </section>
</div>
