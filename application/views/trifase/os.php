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
            <?= component('button', ['label' => 'Atualizar andamento', 'variant' => 'outline', 'href' => site_url('os/visualizar/' . $idOs) . '?apresentacao=classica']) ?>
        <?php } ?>
    </section>

    <div class="trifase-os-colunas">
        <div class="trifase-os-principal">
            <section class="trifase-os-painel" aria-labelledby="piloto-equipamento">
                <div class="trifase-os-secao-titulo">
                    <h2 id="piloto-equipamento">Equipamento e atendimento</h2>
                    <?php if ($editarUrl !== null) { ?>
                        <?= component('button', ['label' => 'Editar OS', 'icon' => 'pencil', 'variant' => 'outline', 'href' => $editarUrl]) ?>
                    <?php } ?>
                </div>
                <dl class="trifase-os-relato">
                    <?php foreach ($campos as $rotulo => $valor) { ?>
                        <div><dt><?= e($rotulo) ?></dt><dd class="<?= $valor === null ? 'text-muted' : 'text-text' ?>"><?= $valor === null ? 'Não informado' : componenteConteudo($valor) ?></dd></div>
                    <?php } ?>
                </dl>
            </section>

            <section class="trifase-os-painel" aria-labelledby="piloto-itens">
                <div class="trifase-os-secao-titulo">
                    <h2 id="piloto-itens">Peças e serviços da OS</h2>
                    <?php if ($pode['editar']) { ?>
                        <?= component('button', ['label' => 'Adicionar itens', 'icon' => 'plus', 'variant' => 'outline', 'href' => site_url('os/visualizar/' . $idOs) . '?aba=produtos']) ?>
                    <?php } ?>
                </div>
                <?php if ((int) $os->faturado === 1) { ?><p class="text-muted">OS faturada · valores protegidos</p><?php } ?>
                <?php if ($produtos === [] && $servicos === []) { ?>
                    <?= component('empty-state', ['title' => 'Nenhuma peça ou serviço', 'message' => 'Os itens deste atendimento aparecerão aqui.', 'icon' => 'package', 'class' => 'border-0']) ?>
                <?php } else { ?>
                    <ul class="trifase-os-itens" aria-label="Peças e serviços">
                        <?php foreach (['Peça' => $produtos, 'Serviço' => $servicos] as $tipo => $itens) { ?>
                            <?php foreach ($itens as $item) { ?>
                                <li>
                                    <div class="trifase-os-item-nome"><span><?= e($tipo === 'Peça' ? $item->descricao : $item->nome) ?></span><small><?= e($tipo) ?></small></div>
                                    <div class="trifase-os-item-valores"><span><?= e('Qtd. ' . (0 + $item->quantidade)) ?></span>
                                        <?php if ($verFinanceiro) { ?><span><?= e(dinheiro($item->preco)) ?> / un.</span><strong><?= e(dinheiro($item->subTotal)) ?></strong><?php } ?>
                                    </div>
                                </li>
                            <?php } ?>
                        <?php } ?>
                    </ul>
                    <?php if ($verFinanceiro) { ?>
                        <dl class="trifase-os-totais">
                            <div><dt>Peças</dt><dd><?= e(dinheiro($totais['produtos'])) ?></dd></div>
                            <div><dt>Serviços</dt><dd><?= e(dinheiro($totais['servicos'])) ?></dd></div>
                            <?php if ($totais['desconto'] > 0) { ?><div><dt>Desconto</dt><dd><?= e(dinheiro($totais['desconto'])) ?></dd></div><?php } ?>
                            <div><dt>Total</dt><dd><?= e(dinheiro($totais['total'])) ?></dd></div>
                        </dl>
                    <?php } ?>
                <?php } ?>
                <div class="trifase-os-links-itens">
                    <?= component('link', ['label' => $pode['editar'] ? 'Gerenciar peças' : 'Consultar peças', 'href' => site_url('os/visualizar/' . $idOs) . '?aba=produtos']) ?>
                    <?= component('link', ['label' => $pode['editar'] ? 'Gerenciar serviços' : 'Consultar serviços', 'href' => site_url('os/visualizar/' . $idOs) . '?aba=servicos']) ?>
                </div>
            </section>

            <section class="trifase-os-painel" aria-labelledby="piloto-anexos">
                <div class="trifase-os-secao-titulo">
                    <h2 id="piloto-anexos">Fotos, vídeos e documentos</h2>
                    <?php if ($editarTecnico) { ?>
                        <?= component('button', ['label' => 'Adicionar anexo', 'icon' => 'paperclip', 'variant' => 'outline', 'href' => site_url('os/visualizar/' . $idOs) . '?aba=anexos']) ?>
                    <?php } ?>
                </div>
                <div data-os-parte="anexos"><?php $this->load->view('os/partes/anexos', ['anexosSomenteConsulta' => true]); ?></div>
                <p class="trifase-os-ajuda">Novos anexos são privados. O compartilhamento é definido em Link público.</p>
            </section>
        </div>

        <aside class="trifase-os-lateral" aria-label="Financeiro, compartilhamento e informações da OS">
            <?php if ($verFinanceiro) { ?>
                <section class="trifase-os-painel" aria-labelledby="piloto-financeiro">
                    <h2 id="piloto-financeiro">Financeiro</h2>
                    <?php if ($pilotoFinanceiro !== null) { ?>
                        <?= component('pill-status', ['label' => $pilotoFinanceiro['situacao'], 'variant' => $pilotoFinanceiro['saldo_c'] === 0 ? 'success' : 'warning']) ?>
                        <dl class="trifase-os-financeiro">
                            <div><dt>Total acordado</dt><dd><?= e(dinheiro($pilotoFinanceiro['total_c'] / 100)) ?></dd></div>
                            <div><dt>Recebido</dt><dd><?= e(dinheiro($pilotoFinanceiro['recebido_c'] / 100)) ?></dd></div>
                            <div class="trifase-os-saldo"><dt>Saldo a receber</dt><dd><?= e(dinheiro($pilotoFinanceiro['saldo_c'] / 100)) ?></dd></div>
                        </dl>
                        <?php if ($permite('aLancamento') && $pilotoFinanceiro['saldo_c'] > 0 && $os->status !== 'Cancelado') { ?>
                            <?= component('button', ['label' => 'Registrar recebimento', 'href' => $financeiroUrl]) ?>
                        <?php } ?>
                        <?= component('link', ['label' => 'Ver histórico financeiro', 'href' => $financeiroUrl]) ?>
                    <?php } else { ?>
                        <p class="text-muted">Valores dos itens desta OS</p>
                        <p class="trifase-os-total-nao-formalizado"><?= e(dinheiro($totais['total'])) ?></p>
                        <p class="text-muted"><?= e((int) $os->faturado === 1 ? 'Faturamento anterior: consulte o registro para conferir os pagamentos.' : 'Cobrança ainda não formalizada. Recebimentos e saldo não foram registrados.') ?></p>
                        <?php if (trifaseFinanceiroHabilitado()) { ?>
                            <?= component('button', ['label' => 'Consultar financeiro', 'variant' => 'outline', 'href' => $financeiroUrl]) ?>
                        <?php } ?>
                    <?php } ?>
                </section>
            <?php } ?>

            <?php if ($linkHabilitado) { ?>
                <section class="trifase-os-painel" aria-labelledby="piloto-publico">
                    <h2 id="piloto-publico">Link público desta OS</h2>
                    <?= component('pill-status', ['label' => $pilotoLink !== null ? 'Link ativo' : 'Sem link ativo', 'variant' => $pilotoLink !== null ? 'success' : 'neutral']) ?>
                    <p class="text-muted">Somente esta ordem e os anexos autorizados.</p>
                    <?php if ($pilotoLink !== null) { ?><p><?= e('Válido até ' . date('d/m/Y', (int) $pilotoLink->expira_em)) ?></p><?php } ?>
                    <?= component('button', ['label' => 'Gerenciar link e anexos públicos', 'variant' => 'outline', 'href' => site_url('trifase/gerenciar/' . $idOs)]) ?>
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
