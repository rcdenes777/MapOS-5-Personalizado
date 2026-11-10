<?php
$cancelamentosNaLista = ($lista['filtros']['fila'] ?? '') === 'cancelamentos';
$rotulos = ['cancelamentos' => 'Cancelamentos em processo', 'recusados' => 'Orçamentos recusados', 'Aberto' => 'Abertos', 'Negociação' => 'Aguardando aprovação do cliente', 'andamento' => 'Em atendimento', 'orcamentos' => 'Aguardando aprovação do cliente', 'retirada' => 'Prontas para retirada', 'retornos' => 'Retornos em avaliação', 'Orçamento' => 'Em orçamento', 'Aprovado' => 'Aprovado', 'Em Andamento' => 'Em andamento', 'Aguardando Peças' => 'Aguardando peças', 'Cancelado' => 'Cancelados'];
$titulo = $rotulos[$lista['filtros']['fila'] ?? $lista['filtros']['status']] ?? 'Ordens de serviço';
?>
<section id="lista-painel" class="rounded-xl border border-border bg-surface p-4 sm:p-6 min-w-0 xl:col-span-2" aria-labelledby="titulo-lista-painel">
    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
            <h2 id="titulo-lista-painel" class="text-heading-sm text-text"><?= e($titulo) ?></h2>
            <p class="text-caption text-muted"><?= e((string) $lista['total']) ?> OS nesta lista. Clique no número para abrir.</p>
        </div>
        <?= component('button', ['label' => 'Voltar ao calendário', 'variant' => 'outline', 'href' => site_url('mapos') . '?visao=classica']) ?>
    </div>
    <?= component('data-table', [
        'caption' => $titulo,
        'dense' => true,
        'rows' => $lista['rows'],
        'columns' => [
            ['label' => 'Nº', 'nowrap' => true, 'render' => fn ($o) => component('link', ['label' => (string) $o->idOs, 'href' => site_url(($cancelamentosNaLista ? 'trifase_cancelamentos/visualizar/' : 'os/visualizar/') . (int) $o->idOs)])],
            ['label' => 'Cliente', 'class' => 'min-w-32 [overflow-wrap:anywhere]', 'render' => fn ($o) => (string) ($o->nomeCliente ?? 'Cliente removido')],
            ['label' => 'Entrega', 'nowrap' => true, 'render' => fn ($o) => $o->dataFinal ? dataBr($o->dataFinal) : '—'],
            ['label' => 'Status', 'nowrap' => true, 'render' => fn ($o) => component('pill-status', osStatusPill($o->status))],
            ...($cancelamentosNaLista ? [['label' => 'Próxima ação', 'render' => fn ($o) => component('link', ['label' => $o->status === 'Cancelado' ? 'Registrar entrega' : 'Continuar conferência', 'href' => site_url('trifase_cancelamentos/visualizar/' . (int) $o->idOs)])]] : []),
        ],
        'empty' => component('empty-state', ['title' => 'Nenhuma OS nesta lista', 'message' => 'Selecione outro indicador ou volte ao calendário.', 'icon' => 'wrench', 'class' => 'border-0']),
    ]) ?>
    <?= component('pagination', $lista['paginacao']) ?>
</section>
