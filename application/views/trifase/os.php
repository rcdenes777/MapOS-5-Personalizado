<?php
/** Piloto visual: leitura dos mesmos registros e navegação para ações existentes. */
$idOs = (int) $os->idOs;
$permite = fn (string $permissao): bool => $this->permission->checkPermission($this->session->userdata('permissao'), $permissao);
$verFinanceiro = $permite('vLancamento');
$editarTecnico = $pode['editar_tecnico'] ?? false;
$editarUrl = $pode['editar'] ? site_url('os/editar/' . $idOs)
    : ($editarTecnico && trifaseFinanceiroHabilitado() ? site_url('trifase_financeiro/tecnico/' . $idOs) : null);
$financeiroUrl = site_url('trifase_financeiro/visualizar/' . $idOs);
$linkHabilitado = trifasePublicoHabilitado() && $permite('eOs');
$texto = static fn ($valor) => trim(strip_tags((string) $valor)) !== '' ? osTextoExibicao($valor) : null;
$campos = [
    'Equipamento' => $texto($os->descricaoProduto),
    'Defeito relatado' => $texto($os->defeito),
    'Observações' => $texto($os->observacoes),
    'Laudo técnico' => $texto($os->laudoTecnico),
];
?>
<div class="trifase-os" <?= js_module('os/tela') ?> data-os-aba="resumo">
    <header class="trifase-os-cabecalho">
        <div>
            <a class="trifase-os-voltar" href="<?= e(site_url('os')) ?>"><?= icon('chevron-left', ['class' => 'size-4']) ?>Ordens de serviço</a>
            <h1><?= e('Ordem de serviço #' . str_pad((string) $idOs, 3, '0', STR_PAD_LEFT)) ?></h1>
            <p class="text-muted"><?= e($os->nomeCliente . ' · Entrada em ' . dataBr($os->dataInicial)) ?></p>
        </div>
        <div class="trifase-os-acoes">
            <?= component('button', ['label' => 'Imprimir OS', 'icon' => 'printer', 'variant' => 'outline', 'href' => site_url('os/imprimir/' . $idOs), 'attrs' => ['target' => '_blank', 'rel' => 'noopener']]) ?>
            <?= component('button', ['label' => 'Mais ações', 'variant' => 'outline', 'href' => site_url('os/visualizar/' . $idOs) . '?apresentacao=classica', 'attrs' => ['title' => 'Abrir todas as ações na apresentação atual']]) ?>
        </div>
    </header>

    <section class="trifase-os-andamento" aria-label="Andamento do atendimento">
        <div><h2>Andamento do serviço</h2><?= component('pill-status', osStatusPill($os->status)) ?></div>
        <dl class="trifase-os-datas">
            <div><dt>Entrada</dt><dd><?= e(dataBr($os->dataInicial)) ?></dd></div>
            <div><dt>Previsão de entrega</dt><dd><?= e(dataBr($os->dataFinal) ?: 'Não informada') ?></dd></div>
            <div><dt>Técnico responsável</dt><dd><?= e($os->nome) ?></dd></div>
        </dl>
        <?php if (trifaseFinanceiroHabilitado() && trifaseFinanceiroOsGerida($this->db, $idOs) && $permite('eOs')) { ?>
            <details class="trifase-os-adicionar">
                <summary>Atualizar andamento</summary>
                <form method="post" action="<?= e(site_url('trifase_financeiro/andamento/' . $idOs)) ?>" class="grid gap-3 p-3" <?= js_module('formulario/padrao') ?>>
                    <input type="hidden" name="<?= e($this->security->get_csrf_token_name()) ?>" value="<?= e($this->security->get_csrf_hash()) ?>">
                    <?= component('select', ['name' => 'status', 'id' => 'piloto-andamento', 'label' => 'Andamento do serviço', 'selected' => $os->status, 'options' => ['Aberto' => 'Aberto', 'Em Andamento' => 'Em Andamento', 'Aguardando Peças' => 'Aguardando Peças', 'Finalizado' => 'Finalizado']]) ?>
                    <p class="text-caption text-muted">Finalizar registra a conclusão e a referência de garantia; os pagamentos são preservados.</p>
                    <?= component('button', ['label' => 'Salvar andamento', 'type' => 'submit']) ?>
                </form>
            </details>
        <?php } ?>
    </section>

    <div class="trifase-os-colunas">
        <div class="trifase-os-principal">
            <section class="trifase-os-painel" aria-labelledby="piloto-equipamento">
                <div class="trifase-os-secao-titulo">
                    <h2 id="piloto-equipamento">Equipamento e atendimento</h2>
                    <?php if ($editarUrl !== null && ($pilotoTecnico ?? null) === null) { ?>
                        <?= component('button', ['label' => 'Editar OS', 'icon' => 'pencil', 'variant' => 'outline', 'href' => $editarUrl]) ?>
                    <?php } ?>
                </div>
                <dl class="trifase-os-relato">
                    <?php foreach ($campos as $rotulo => $valor) { ?>
                        <div><dt><?= e($rotulo) ?></dt><dd class="<?= $valor === null ? 'text-muted' : 'text-text' ?>"><?= $valor === null ? 'Não informado' : componenteConteudo($valor) ?></dd></div>
                    <?php } ?>
                </dl>
                <?php if ($editarTecnico && ($pilotoTecnico ?? null) !== null) { ?>
                    <details class="trifase-os-adicionar mt-4">
                        <summary>Editar OS</summary>
                        <p class="text-muted">Produtos, serviços, pagamentos e conclusão são preservados.</p>
                        <?php $this->load->view('trifase/formulario-tecnico', ['osTecnica' => $os, 'metaTecnica' => $pilotoTecnico, 'tecnicoIntegrado' => true]); ?>
                    </details>
                <?php } ?>
            </section>

            <section class="trifase-os-painel" aria-labelledby="piloto-itens">
                <div class="trifase-os-secao-titulo">
                    <h2 id="piloto-itens">Peças e serviços da OS</h2>
                    <?php if ($pode['editar'] && $verFinanceiro) { ?>
                        <?= component('button', ['label' => 'Adicionar itens', 'icon' => 'plus', 'variant' => 'outline', 'href' => '#piloto-formularios-itens']) ?>
                    <?php } ?>
                </div>
                <div data-os-parte="pilotoitens"><?php $this->load->view('trifase/itens'); ?></div>
                <?php if ($pode['editar'] && $verFinanceiro) { ?>
                    <div id="piloto-formularios-itens" class="trifase-os-formularios">
                        <?php foreach (['produto' => 'Adicionar peça', 'servico' => 'Adicionar serviço'] as $tipoItem => $tituloItem) { ?>
                            <details class="trifase-os-adicionar">
                                <summary><?= e($tituloItem) ?></summary>
                                <?php $this->load->view('os/partes/formulario-item', ['tipoItem' => $tipoItem, 'prefixoItem' => 'piloto-' . $tipoItem]); ?>
                            </details>
                        <?php } ?>
                    </div>
                <?php } ?>
                <div class="trifase-os-links-itens">
                    <?= component('link', ['label' => $pode['editar'] ? 'Gerenciar peças' : 'Consultar peças', 'href' => site_url('os/visualizar/' . $idOs) . '?aba=produtos']) ?>
                    <?= component('link', ['label' => $pode['editar'] ? 'Gerenciar serviços' : 'Consultar serviços', 'href' => site_url('os/visualizar/' . $idOs) . '?aba=servicos']) ?>
                </div>
            </section>

            <section class="trifase-os-painel" aria-labelledby="piloto-anexos" <?= js_module('trifase/anexos') ?>>
                <div class="trifase-os-secao-titulo"><h2 id="piloto-anexos">Fotos, vídeos e documentos</h2></div>
                <?php if ($editarTecnico) { ?>
                    <details class="trifase-os-adicionar mb-4">
                        <summary>Adicionar anexo</summary>
                        <?php $this->load->view('os/partes/formulario-anexo', ['prefixoAnexo' => 'piloto-anexo']); ?>
                    </details>
                <?php } ?>
                <div data-os-parte="pilotoanexos"><?php $this->load->view('os/partes/anexos', ['anexosSomenteConsulta' => ! $editarTecnico, 'publicacaoIntegrada' => true, 'anexosPublicosIds' => $pilotoPublicados ?? []]); ?></div>
                <p class="trifase-os-ajuda">Novos anexos são privados. Marque Público para permitir sua visualização pelo link desta OS.</p>
            </section>
        </div>

        <aside class="trifase-os-lateral" aria-label="Financeiro, compartilhamento e informações da OS">
            <?php if ($verFinanceiro) { ?>
                <section class="trifase-os-painel" aria-labelledby="piloto-financeiro">
                    <div data-os-parte="pilotofinanceiro"><?php $this->load->view('trifase/resumo-financeiro'); ?></div>
                    <?php if ($pilotoFinanceiro !== null && $permite('aLancamento') && $pilotoFinanceiro['saldo_c'] > 0 && $os->status !== 'Cancelado') { ?>
                        <details id="piloto-registrar-recebimento" class="trifase-os-adicionar mt-4">
                            <summary>Registrar recebimento</summary>
                            <?php $this->load->view('trifase/formulario-recebimento', ['osFinanceira' => $os, 'financeiroChave' => $pilotoOperacao, 'financeiroValores' => ['valor' => '', 'data' => date('Y-m-d'), 'forma' => 'Pix'], 'recebimentoIntegrado' => true]); ?>
                        </details>
                    <?php } elseif ($pilotoFinanceiro === null && (int) $os->faturado !== 1 && $permite('aLancamento') && $permite('eOs') && trifaseFinanceiroHabilitado() && $os->status !== 'Cancelado') { ?>
                        <details class="trifase-os-adicionar mt-4">
                            <summary>Registrar cobrança</summary>
                            <form method="post" action="<?= e(site_url('trifase_financeiro/formalizar/' . $idOs)) ?>" class="grid gap-3 p-3" data-os-acao="financeiro">
                                <p class="text-muted">Confirme os itens antes de registrar. Após a cobrança, os valores ficam protegidos.</p>
                                <?= component('input', ['name' => 'vencimento', 'id' => 'piloto-vencimento', 'label' => 'Vencimento', 'type' => 'date', 'value' => date('Y-m-d'), 'required' => true]) ?>
                                <?= component('button', ['label' => 'Confirmar cobrança', 'type' => 'submit']) ?>
                            </form>
                        </details>
                    <?php } ?>
                </section>
            <?php } ?>

            <?php if ($linkHabilitado) { ?>
                <section class="trifase-os-painel" aria-labelledby="piloto-publico">
                    <h2 id="piloto-publico">Link público desta OS</h2>
                    <?= component('pill-status', ['label' => $pilotoLink !== null ? 'Link ativo' : 'Sem link ativo', 'variant' => $pilotoLink !== null ? 'success' : 'neutral']) ?>
                    <p class="text-muted">Somente esta ordem e os anexos autorizados.</p>
                    <?php if ($pilotoLink !== null) { ?><p><?= e('Válido até ' . date('d/m/Y', (int) $pilotoLink->expira_em)) ?></p><?php } ?>
                    <?php if (($pilotoUrlPublica ?? null) !== null) { ?>
                        <label for="piloto-link-publico" class="text-label-md text-text">Endereço para o cliente</label>
                        <input id="piloto-link-publico" readonly value="<?= e($pilotoUrlPublica) ?>" class="w-full min-w-0 rounded-sm border border-input bg-field p-3 text-body-md text-text">
                        <div class="trifase-os-links-itens">
                            <?= component('button', ['label' => 'Copiar link', 'icon' => 'copy', 'variant' => 'outline', 'attrs' => ['data-copiar' => 'piloto-link-publico', 'data-copiar-mensagem' => 'Link copiado.']]) ?>
                            <?= component('link', ['label' => 'Abrir link', 'href' => $pilotoUrlPublica, 'attrs' => ['target' => '_blank', 'rel' => 'noopener noreferrer']]) ?>
                        </div>
                    <?php } elseif ($pilotoLink !== null) { ?>
                        <p class="text-muted">Este link antigo não pode ser recuperado. Gere outro se não tiver guardado o endereço.</p>
                    <?php } ?>
                    <div class="trifase-os-links-itens">
                        <?php foreach (($pilotoLink !== null ? ['renovar' => 'Renovar validade', 'revogar' => 'Revogar link'] : ['gerar' => 'Gerar link público']) as $acaoLink => $rotuloLink) { ?>
                            <form id="<?= e('piloto-link-' . $acaoLink) ?>" method="post" action="<?= e(site_url('trifase/' . $acaoLink . '/' . $idOs)) ?>">
                                <input type="hidden" name="<?= e($this->security->get_csrf_token_name()) ?>" value="<?= e($this->security->get_csrf_hash()) ?>">
                                <input type="hidden" name="voltar" value="resumo">
                                <?= component('button', ['label' => $rotuloLink, 'variant' => 'outline', 'type' => $acaoLink === 'revogar' ? 'button' : 'submit', 'attrs' => $acaoLink === 'revogar' ? ['data-modal-abrir' => 'piloto-revogar-link'] : []]) ?>
                            </form>
                        <?php } ?>
                    </div>
                    <?= component('link', ['label' => 'Mais opções de compartilhamento', 'href' => site_url('trifase/gerenciar/' . $idOs)]) ?>
                    <?php if ($pilotoLink !== null) { ?>
                        <?= component('modal-confirm', ['id' => 'piloto-revogar-link', 'title' => 'Revogar link público?', 'message' => 'O endereço enviado ao cliente deixará de funcionar. Os anexos continuam guardados na OS.', 'confirm_label' => 'Revogar link', 'confirm_attrs' => ['form' => 'piloto-link-revogar']]) ?>
                    <?php } ?>
                </section>
            <?php } ?>

            <section class="trifase-os-painel" aria-labelledby="piloto-atendimento">
                <h2 id="piloto-atendimento">Dados do atendimento</h2>
                <dl class="trifase-os-dados">
                    <div><dt>Cliente</dt><dd><?php if ($pode['ver_cliente']) { ?><?= component('link', ['label' => $os->nomeCliente, 'href' => site_url('clientes/visualizar/' . (int) $os->clientes_id)]) ?><?php } else { ?><?= e($os->nomeCliente) ?><?php } ?></dd></div>
                    <div><dt>Contato</dt><dd><?= e(trim(implode(' · ', array_filter([$os->celular_cliente, $os->telefone_cliente]))) ?: 'Não informado') ?></dd></div>
                    <div><dt>Garantia concedida</dt><dd><?= e((int) $os->garantia > 0 ? (int) $os->garantia . ' dias' . ($garantia_ate ? ' · até ' . dataBr($garantia_ate) : '') : 'Não informada') ?></dd></div>
                </dl>
                <div class="trifase-os-links-itens">
                    <?= component('link', ['label' => 'Anotações internas', 'href' => site_url('os/visualizar/' . $idOs) . '?aba=anotacoes']) ?>
                    <?= component('link', ['label' => 'Histórico do atendimento', 'href' => site_url('os/visualizar/' . $idOs) . '?aba=historico']) ?>
                </div>
            </section>
        </aside>
    </div>
</div>
<?php if ($linkHabilitado) {
    $this->load->view('trifase/video');
    $this->load->view('trifase/galeria');
} ?>

<?php if ($pode['editar'] && $verFinanceiro) { ?>
    <?php foreach (['produto' => 'peça', 'servico' => 'serviço'] as $tipo => $rotulo) { ?>
        <form id="<?= e('form-excluir-' . $tipo) ?>" method="post" action="<?= e(site_url($tipo === 'produto' ? 'os/excluirProduto' : 'os/excluirServico')) ?>" hidden data-os-acao="<?= e($tipo) ?>">
            <input type="hidden" name="idOs" value="<?= e($idOs) ?>">
            <input type="hidden" name="idItem" value="" data-modal-de="<?= e('excluir-' . $tipo) ?>" data-modal-valor="id">
        </form>
        <?= component('modal-confirm', ['id' => 'excluir-' . $tipo, 'title' => 'Remover ' . $rotulo . ' da OS?', 'message' => [new HtmlSeguro('<strong data-modal-valor="nome"></strong>'), ' sairá desta OS.' . ($tipo === 'produto' && $controle_estoque ? ' A quantidade voltará ao estoque.' : '') . ' O desconto geral, se houver, será removido porque o total muda.'], 'confirm_label' => 'Remover', 'confirm_attrs' => ['form' => 'form-excluir-' . $tipo]]) ?>
    <?php } ?>
<?php } ?>

<?php if ($editarTecnico) { ?>
    <form id="form-excluir-anexo" method="post" action="<?= e(site_url('os/excluirAnexo')) ?>" hidden data-os-acao="anexo">
        <input type="hidden" name="idOs" value="<?= e($idOs) ?>">
        <input type="hidden" name="idItem" value="" data-modal-de="excluir-anexo" data-modal-valor="id">
    </form>
    <?= component('modal-confirm', ['id' => 'excluir-anexo', 'title' => 'Excluir anexo?', 'message' => [new HtmlSeguro('<strong data-modal-valor="nome"></strong>'), ' será apagado do servidor. Essa ação não pode ser desfeita.'], 'confirm_label' => 'Excluir', 'confirm_attrs' => ['form' => 'form-excluir-anexo']]) ?>
<?php } ?>
