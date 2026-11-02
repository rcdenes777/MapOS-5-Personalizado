<?php
/**
 * Tela da OS (#2842), migrada para os componentes da v5.
 *
 * - Cabeçalho com o número, o status (pill-status) e o cliente. "Editar OS"
 *   é a ação principal, na topbar; faturar, impressões, termo de garantia,
 *   WhatsApp, e-mail, cobrança e excluir são secundárias.
 * - Abas por link (?aba=): resumo, produtos, serviços, anexos, anotações e
 *   histórico. Os trechos que mudam ficam em [data-os-parte] e vêm de
 *   views/os/partes/, que os endpoints renderizam de novo.
 * - O módulo os/tela envia os formulários [data-os-acao] sem recarregar a
 *   página (lib/http.js) e troca os trechos devolvidos pelo servidor.
 *
 * @var object      $os
 * @var string      $aba
 * @var array       $totais
 * @var array<string, bool> $pode
 * @var object|null $cobranca
 * @var array|null  $whatsapp
 * @var string|null $garantia_ate
 * @var bool        $controle_estoque
 * @var array<string, string> $gateways
 */
require_once APPPATH . 'helpers/trifase_financeiro_helper.php';
$idOs = (int) $os->idOs;
$fechada = (int) $os->faturado === 1 || $os->status === 'Faturado' || $os->status === 'Cancelado';
$caixa = 'rounded-xl border border-border bg-surface p-4 sm:p-6';
$campos = static fn (array $itens) => array_filter($itens, static fn ($valor) => $valor !== null && $valor !== '');

$dados = $campos([
    'Cliente' => $pode['ver_cliente']
        ? component('link', ['label' => $os->nomeCliente, 'href' => site_url('clientes/visualizar/' . (int) $os->clientes_id)])
        : $os->nomeCliente,
    'Contato' => trim(implode(' · ', array_filter([$os->celular_cliente, $os->telefone_cliente]))),
    'Técnico responsável' => $os->nome,
    'Entrada' => dataBr($os->dataInicial),
    'Previsão de entrega' => dataBr($os->dataFinal),
    'Garantia' => (int) $os->garantia > 0 ? (int) $os->garantia . ' dias' . ($garantia_ate ? ', até ' . dataBr($garantia_ate) : '') : null,
    'Termo de garantia' => $os->refGarantia ?? null,
]);

$texto = static fn ($valor) => trim(strip_tags((string) $valor)) !== '' ? osTextoExibicao($valor) : null;
$textos = [
    'Descrição do produto ou serviço' => $texto($os->descricaoProduto),
    'Defeito' => $texto($os->defeito),
    'Observações' => $texto($os->observacoes),
    'Laudo técnico' => $texto($os->laudoTecnico),
];

?>
<div class="flex flex-col gap-4 pt-2 pb-8" <?= js_module('os/tela') ?> data-os-aba="<?= e($aba) ?>">
    <?php if (trifaseFinanceiroHabilitado() && trifaseFinanceiroOsGerida($this->db, $idOs) && $this->permission->checkPermission($this->session->userdata('permissao'), 'eOs')) { ?>
        <form method="post" action="<?= e(site_url('trifase_financeiro/andamento/' . $idOs)) ?>" class="flex flex-wrap items-end gap-3">
            <input type="hidden" name="<?= e($this->security->get_csrf_token_name()) ?>" value="<?= e($this->security->get_csrf_hash()) ?>">
            <?= component('select', ['name' => 'status', 'label' => 'Andamento do serviço', 'selected' => $os->status, 'options' => ['Aberto' => 'Aberto', 'Em Andamento' => 'Em Andamento', 'Aguardando Peças' => 'Aguardando Peças', 'Finalizado' => 'Finalizado']]) ?>
            <?= component('button', ['label' => 'Atualizar andamento', 'variant' => 'outline', 'type' => 'submit']) ?>
        </form>
    <?php } ?>
    <header class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-3">
                <h1 class="font-display text-heading-xl text-text"><?= e('OS #' . $idOs) ?></h1>
                <?= component('pill-status', osStatusPill($os->status)) ?>
            </div>
            <p class="text-caption [overflow-wrap:anywhere] text-muted"><?= e($os->nomeCliente . ' · Técnico: ' . $os->nome) ?></p>
        </div>
        <div class="flex flex-wrap gap-2">
            <?php $this->load->view('trifase/atalho', ['trifaseOsId' => $idOs]); ?>
            <?php if (trifaseFinanceiroHabilitado() && (trifaseFinanceiroOsGerida($this->db, $idOs) || (int) $os->faturado === 1) && ($pode['editar_tecnico'] ?? false)) { ?>
                <?= component('button', ['label' => 'Editar dados técnicos', 'variant' => 'outline', 'icon' => 'pencil', 'href' => site_url('trifase_financeiro/tecnico/' . $idOs)]) ?>
            <?php } ?>
            <?php if (trifaseFinanceiroHabilitado() && $this->permission->checkPermission($this->session->userdata('permissao'), 'vLancamento')) { ?>
                <?= component('button', ['label' => 'Financeiro da OS', 'variant' => 'outline', 'icon' => 'banknote', 'href' => site_url('trifase_financeiro/visualizar/' . $idOs)]) ?>
            <?php } ?>
            <?php if ($pode['faturar']) { ?>
                <?= component('button', ['label' => 'Faturar', 'icon' => 'circle-dollar-sign', 'variant' => 'outline', 'attrs' => ['data-modal-abrir' => 'faturar-os']]) ?>
            <?php } ?>
            <?= component('button', ['label' => 'Imprimir', 'icon' => 'printer', 'variant' => 'ghost', 'href' => site_url('os/imprimir/' . $idOs), 'attrs' => ['target' => '_blank', 'rel' => 'noopener']]) ?>
            <?= component('button', ['label' => 'Cupom 80mm', 'icon' => 'receipt', 'variant' => 'ghost', 'href' => site_url('os/imprimirTermica/' . $idOs), 'attrs' => ['target' => '_blank', 'rel' => 'noopener']]) ?>
            <?php if ($os->garantias_id) { ?>
                <?= component('button', ['label' => 'Termo de garantia', 'icon' => 'file-text', 'variant' => 'ghost', 'href' => site_url('garantias/imprimirGarantiaOs/' . $idOs), 'attrs' => ['target' => '_blank', 'rel' => 'noopener']]) ?>
            <?php } ?>
            <?php if ($whatsapp !== null) { ?>
                <?= component('button', [
                    'label' => 'WhatsApp',
                    'icon' => 'message-circle',
                    'variant' => 'ghost',
                    'href' => 'https://wa.me/' . $whatsapp['telefone'] . '?text=' . rawurlencode($whatsapp['texto']),
                    'attrs' => ['target' => '_blank', 'rel' => 'noopener'],
                ]) ?>
            <?php } ?>
            <form method="post" action="<?= e(site_url('os/enviar_email/' . $idOs)) ?>" class="inline">
                <input type="hidden" name="<?= e($this->security->get_csrf_token_name()) ?>" value="<?= e($this->security->get_csrf_hash()) ?>">
                <?= component('button', ['label' => 'E-mail', 'icon' => 'mail', 'variant' => 'ghost', 'type' => 'submit']) ?>
            </form>
            <?php if ($pode['cobrar'] && $gateways !== []) { ?>
                <?= component('button', ['label' => 'Gerar cobrança', 'icon' => 'banknote', 'variant' => 'ghost', 'attrs' => ['data-modal-abrir' => 'gerar-cobranca']]) ?>
            <?php } elseif ($cobranca !== null && $pode['ver_cobranca']) { ?>
                <?= component('button', ['label' => 'Ver cobrança', 'icon' => 'banknote', 'variant' => 'ghost', 'href' => site_url('cobrancas/visualizar/' . (int) $cobranca->idCobranca)]) ?>
            <?php } ?>
            <?php if ($pode['excluir']) { ?>
                <?= component('button', ['label' => 'Excluir', 'icon' => 'trash-2', 'variant' => 'ghost', 'class' => 'hover:text-danger-ink', 'attrs' => ['data-modal-abrir' => 'excluir-os']]) ?>
            <?php } ?>
        </div>
    </header>

    <?php if ($fechada && ! $pode['editar']) { ?>
        <?= component('alert', ['variant' => 'info', 'message' => (($pode['editar_tecnico'] ?? false) ? 'O faturamento protege produtos, serviços e descontos. Dados técnicos, anexos e anotações continuam editáveis com sua permissão.' : 'Esta OS está ' . ($os->status === 'Cancelado' ? 'cancelada' : 'faturada') . ': seus dados não podem mais ser alterados.')]) ?>
    <?php } ?>

    <div data-os-parte="abas"><?php $this->load->view('os/partes/abas'); ?></div>

    <?php if ($aba === 'resumo') { ?>
        <div data-os-parte="totais"><?php $this->load->view('os/partes/totais'); ?></div>

        <div class="grid gap-4 lg:grid-cols-3">
            <section class="<?= e($caixa) ?>" aria-labelledby="secao-dados">
                <h2 id="secao-dados" class="text-heading-sm text-text">Dados da OS</h2>
                <dl class="mt-3 flex flex-col gap-3">
                    <?php foreach ($dados as $rotulo => $valor) { ?>
                        <div>
                            <dt class="text-caption text-muted"><?= e($rotulo) ?></dt>
                            <dd class="text-body-md [overflow-wrap:anywhere] text-text"><?= componenteConteudo($valor) ?></dd>
                        </div>
                    <?php } ?>
                </dl>
            </section>
            <section class="<?= e($caixa) ?> lg:col-span-2" aria-labelledby="secao-equipamento">
                <div class="flex flex-wrap items-center justify-between gap-2">
                    <h2 id="secao-equipamento" class="text-heading-sm text-text">Equipamento e serviço</h2>
                    <?php if ($pode['editar']) { ?>
                        <?= component('button', ['label' => 'Editar', 'icon' => 'pencil', 'variant' => 'outline', 'href' => site_url('os/editar/' . $idOs)]) ?>
                    <?php } ?>
                </div>
                <dl class="mt-3 grid gap-4 sm:grid-cols-2">
                    <?php foreach ($textos as $rotulo => $valor) { ?>
                        <div>
                            <dt class="text-caption text-muted"><?= e($rotulo) ?></dt>
                            <dd class="text-body-md [overflow-wrap:anywhere] <?= $valor === null ? 'text-muted' : 'text-text' ?>"><?= $valor === null ? 'Não informado' : componenteConteudo($valor) ?></dd>
                        </div>
                    <?php } ?>
                </dl>
            </section>
        </div>

        <div data-os-parte="desconto"><?php $this->load->view('os/partes/desconto'); ?></div>
        <div data-os-parte="pix"><?php $this->load->view('os/partes/pix'); ?></div>
    <?php } elseif ($aba === 'produtos' || $aba === 'servicos') { ?>
        <?php $produto = $aba === 'produtos'; ?>
        <?php if ($pode['editar']) { ?>
            <section class="<?= e($caixa) ?>" aria-labelledby="secao-adicionar-item">
                <h2 id="secao-adicionar-item" class="text-heading-sm text-text"><?= e($produto ? 'Adicionar produto' : 'Adicionar serviço') ?></h2>
                <?php $this->load->view('os/partes/formulario-item', ['tipoItem' => $produto ? 'produto' : 'servico', 'prefixoItem' => 'item']); ?>
            </section>
        <?php } ?>
        <div data-os-parte="<?= e($aba) ?>"><?php $this->load->view('os/partes/' . $aba); ?></div>
    <?php } elseif ($aba === 'anexos') { ?>
        <?php if (($pode['editar_tecnico'] ?? $pode['editar'])) { ?>
            <section class="<?= e($caixa) ?>" aria-labelledby="secao-anexar">
                <h2 id="secao-anexar" class="text-heading-sm text-text">Anexar arquivos</h2>
                <form method="post" action="<?= e(site_url('os/anexar')) ?>" enctype="multipart/form-data" novalidate
                      class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start" data-os-acao="anexo" data-os-limpar>
                    <input type="hidden" name="idOs" value="<?= e($idOs) ?>">
                    <div class="flex min-w-0 flex-1 flex-col gap-1.5">
                        <label for="anexo-arquivos" class="text-label-md text-text">Arquivos <span class="text-danger-ink" aria-hidden="true">*</span></label>
                        <input type="file" id="anexo-arquivos" name="userfile[]" multiple required
                               accept=".jpg,.jpeg,.png,.gif,.pdf,.cdr,.docx,.txt,.mp4,.webm"
                               aria-describedby="anexo-arquivos-ajuda"
                               data-msg-vazio="Escolha ao menos um arquivo."
                               class="block w-full rounded-sm border border-input bg-field px-3 py-2 text-body-md text-text file:mr-3 file:rounded-sm file:border-0 file:bg-surface-subtle file:px-3 file:py-1 file:text-label-md file:text-text focus:outline-3 focus:outline-offset-0 focus:outline-ring">
                        <p id="anexo-arquivos-ajuda" class="text-caption text-muted"><?= e('Imagens (JPG, PNG, GIF), vídeos (MP4, WebM), PDF, DOCX, CDR ou TXT. Até ' . (int) (armazenamentoLimiteKb() / 1024) . ' MB por arquivo. O envio inteiro deve caber no limite do servidor.') ?></p>
                    </div>
                    <div class="sm:pt-7">
                        <?= component('button', ['label' => 'Enviar', 'icon' => 'upload', 'variant' => 'outline', 'type' => 'submit', 'attrs' => ['data-rotulo-carregando' => 'Enviando…']]) ?>
                    </div>
                </form>
            </section>
        <?php } ?>
        <div data-os-parte="anexos"><?php $this->load->view('os/partes/anexos'); ?></div>
    <?php } elseif ($aba === 'anotacoes') { ?>
        <?php if (($pode['editar_tecnico'] ?? $pode['editar'])) { ?>
            <section class="<?= e($caixa) ?>" aria-labelledby="secao-anotar">
                <h2 id="secao-anotar" class="text-heading-sm text-text">Nova anotação</h2>
                <form method="post" action="<?= e(site_url('os/adicionarAnotacao')) ?>" novalidate class="mt-4 flex flex-col gap-3" data-os-acao="anotacao" data-os-limpar>
                    <input type="hidden" name="idOs" value="<?= e($idOs) ?>">
                    <?= component('textarea', [
                        'name' => 'anotacao',
                        'id' => 'anotacao-texto',
                        'label' => 'Anotação',
                        'rows' => 3,
                        'required' => true,
                        'help' => 'Interna: o cliente não vê. Fica registrada com o seu nome e a data.',
                        'attrs' => ['maxlength' => '200', 'data-msg-vazio' => 'Escreva a anotação.'],
                    ]) ?>
                    <div>
                        <?= component('button', ['label' => 'Adicionar anotação', 'icon' => 'plus', 'variant' => 'outline', 'type' => 'submit', 'attrs' => ['data-rotulo-carregando' => 'Salvando…']]) ?>
                    </div>
                </form>
            </section>
        <?php } ?>
        <div data-os-parte="anotacoes"><?php $this->load->view('os/partes/anotacoes'); ?></div>
    <?php } else { ?>
        <section class="<?= e($caixa) ?>" aria-labelledby="secao-historico">
            <h2 id="secao-historico" class="text-heading-sm text-text">Histórico de status</h2>
            <div class="mt-4" data-os-parte="historico"><?php $this->load->view('os/partes/historico'); ?></div>
        </section>
    <?php } ?>
</div>

<?php
// Exclusões: um modal-confirm por tipo, preenchido pelo botão da linha
// (data-valor-id, data-valor-nome), e um formulário oculto que o módulo
// os/tela envia sem recarregar.
$exclusoes = [];
if (($pode['editar_tecnico'] ?? $pode['editar'])) {
    $exclusoes = [
        'produto' => ['os/excluirProduto', 'Excluir produto?', ' sai da OS.' . ($controle_estoque ? ' A quantidade volta ao estoque.' : '') . ' O desconto da OS, se houver, é removido.'],
        'servico' => ['os/excluirServico', 'Excluir serviço?', ' sai da OS. O desconto da OS, se houver, é removido.'],
        'anexo' => ['os/excluirAnexo', 'Excluir anexo?', ' será apagado do servidor. Essa ação não pode ser desfeita.'],
        'anotacao' => ['os/excluirAnotacao', 'Excluir anotação?', ' será removida da OS. Essa ação não pode ser desfeita.'],
    ];
}
if (! $pode['editar']) {
    unset($exclusoes['produto'], $exclusoes['servico']);
}
foreach ($exclusoes as $tipo => [$rota, $titulo, $consequencia]) { ?>
    <form id="<?= e('form-excluir-' . $tipo) ?>" method="post" action="<?= e(site_url($rota)) ?>" hidden data-os-acao="<?= e($tipo) ?>">
        <input type="hidden" name="idOs" value="<?= e($idOs) ?>">
        <input type="hidden" name="idItem" value="" data-modal-de="<?= e('excluir-' . $tipo) ?>" data-modal-valor="id">
    </form>
    <?= component('modal-confirm', [
        'id' => 'excluir-' . $tipo,
        'title' => $titulo,
        // Marcação estática; o nome entra por textContent (modules/componentes/modal.js).
        'message' => [new HtmlSeguro('<strong class="font-semibold text-text" data-modal-valor="nome"></strong>'), $consequencia],
        'confirm_label' => 'Excluir',
        'confirm_attrs' => ['form' => 'form-excluir-' . $tipo],
    ]) ?>
<?php } ?>

<?php if ($pode['editar'] && ($aba === 'produtos' || $aba === 'servicos')) {
    $this->load->view('os/partes/desconto-item-modal', [
        'tipo' => $aba === 'produtos' ? 'produto' : 'servico',
        'rota' => $aba === 'produtos' ? 'os/descontoProduto' : 'os/descontoServico',
        'campoRegistro' => 'idOs',
        'idRegistro' => $idOs,
        'rotuloRegistro' => 'OS',
    ]);
} ?>

<?php if ($pode['excluir']) { ?>
    <form id="form-excluir-os" method="post" action="<?= e(site_url('os/excluir')) ?>" hidden>
        <input type="hidden" name="<?= e($this->security->get_csrf_token_name()) ?>" value="<?= e($this->security->get_csrf_hash()) ?>">
        <input type="hidden" name="id" value="<?= e($idOs) ?>">
    </form>
    <?= component('modal-confirm', [
        'id' => 'excluir-os',
        'title' => 'Excluir OS #' . $idOs . '?',
        'message' => 'Produtos, serviços, anexos (inclusive os arquivos), anotações e o histórico da OS serão removidos.' . ((int) $os->faturado === 1 ? ' O lançamento da fatura também sai do financeiro.' : '') . ' Essa ação não pode ser desfeita.',
        'confirm_label' => 'Excluir OS',
        'confirm_attrs' => ['form' => 'form-excluir-os'],
    ]) ?>
<?php } ?>

<?php if ($pode['faturar']) { ?>
    <form id="form-faturar" method="post" action="<?= e(site_url('os/faturar')) ?>" novalidate hidden data-os-acao="faturar">
        <input type="hidden" name="idOs" value="<?= e($idOs) ?>">
    </form>
    <?= component('modal', [
        'id' => 'faturar-os',
        'title' => 'Faturar OS #' . $idOs,
        'body' => [
            component('alert', [
                'variant' => $totais['total'] > 0 ? 'info' : 'warning',
                'message' => $totais['total'] > 0
                    ? 'Será lançada uma receita de ' . dinheiro($totais['total']) . ($totais['desconto'] > 0 ? ' (' . dinheiro($totais['bruto']) . ' menos ' . dinheiro($totais['desconto']) . ' de desconto)' : '') . ' para ' . $os->nomeCliente . '. A OS passa a Faturado e não pode mais ser alterada.'
                    : 'Adicione produtos ou serviços antes de faturar.',
            ]),
            new HtmlSeguro('<div class="mt-4 grid gap-4 sm:grid-cols-2">'),
            new HtmlSeguro('<div class="sm:col-span-2">'),
            component('input', ['name' => 'descricao', 'id' => 'fatura-descricao', 'label' => 'Descrição', 'value' => 'Fatura de OS Nº: ' . $idOs, 'required' => true, 'attrs' => ['form' => 'form-faturar', 'maxlength' => '255', 'data-msg-vazio' => 'Informe a descrição do lançamento.']]),
            new HtmlSeguro('</div>'),
            component('input', ['name' => 'vencimento', 'id' => 'fatura-vencimento', 'label' => 'Vencimento', 'type' => 'date', 'value' => date('Y-m-d'), 'required' => true, 'attrs' => ['form' => 'form-faturar', 'data-msg-vazio' => 'Informe o vencimento.']]),
            component('select', ['name' => 'formaPgto', 'id' => 'fatura-forma', 'label' => 'Forma de pagamento', 'options' => array_combine(OS_FORMAS_PAGAMENTO, OS_FORMAS_PAGAMENTO), 'placeholder' => 'Escolha', 'required' => true, 'attrs' => ['form' => 'form-faturar', 'data-msg-vazio' => 'Escolha a forma de pagamento.']]),
            component('checkbox', ['name' => 'recebido', 'id' => 'fatura-recebido', 'label' => 'Já foi recebido', 'help' => 'Marca o lançamento como pago.', 'attrs' => ['form' => 'form-faturar', 'data-os-recebido' => 'fatura-recebimento']]),
            component('input', ['name' => 'recebimento', 'id' => 'fatura-recebimento', 'label' => 'Data do recebimento', 'type' => 'date', 'value' => date('Y-m-d'), 'disabled' => true, 'help' => 'Habilitada ao marcar "Já foi recebido".', 'attrs' => ['form' => 'form-faturar', 'data-msg-vazio' => 'Informe a data do recebimento.']]),
            new HtmlSeguro('<div class="sm:col-span-2">'),
            component('textarea', ['name' => 'observacoes', 'id' => 'fatura-observacoes', 'label' => 'Observações', 'rows' => 2, 'attrs' => ['form' => 'form-faturar']]),
            new HtmlSeguro('</div></div>'),
        ],
        'footer' => [
            component('button', ['label' => 'Cancelar', 'variant' => 'ghost', 'attrs' => ['data-modal-fechar' => true]]),
            component('button', ['label' => 'Faturar', 'icon' => 'circle-dollar-sign', 'type' => 'submit', 'disabled' => $totais['total'] <= 0, 'attrs' => ['form' => 'form-faturar', 'data-rotulo-carregando' => 'Faturando…']]),
        ],
    ]) ?>
<?php } ?>

<?php if ($pode['cobrar'] && $gateways !== []) { ?>
    <form id="form-cobranca" method="post" action="<?= e(site_url('cobrancas/adicionar')) ?>" novalidate hidden data-os-acao="cobranca">
        <input type="hidden" name="id" value="<?= e($idOs) ?>">
        <input type="hidden" name="tipo" value="os">
        <input type="hidden" name="gateway_de_pagamento" value="">
        <input type="hidden" name="forma_pagamento" value="">
    </form>
    <?= component('modal', [
        'id' => 'gerar-cobranca',
        'title' => 'Gerar cobrança da OS #' . $idOs,
        'size' => 'sm',
        'body' => [
            component('select', [
                'name' => 'cobranca',
                'id' => 'cobranca-forma',
                'label' => 'Gateway e forma de pagamento',
                'options' => $gateways,
                'placeholder' => 'Escolha',
                'required' => true,
                'help' => 'A cobrança de ' . dinheiro($totais['total']) . ' é criada no gateway escolhido.',
                'attrs' => ['form' => 'form-cobranca', 'data-msg-vazio' => 'Escolha o gateway e a forma de pagamento.'],
            ]),
        ],
        'footer' => [
            component('button', ['label' => 'Cancelar', 'variant' => 'ghost', 'attrs' => ['data-modal-fechar' => true]]),
            component('button', ['label' => 'Gerar cobrança', 'icon' => 'banknote', 'type' => 'submit', 'attrs' => ['form' => 'form-cobranca', 'data-rotulo-carregando' => 'Gerando…']]),
        ],
    ]) ?>
<?php } ?>

<?php
if (function_exists('trifasePublicoHabilitado') && trifasePublicoHabilitado() && $this->permission->checkPermission($this->session->userdata('permissao'), 'eOs')) {
    $this->load->view('trifase/video');
    $this->load->view('trifase/galeria');
}
?>
