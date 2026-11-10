<?php
/** Filas operacionais: mesmas contagens e destinos do painel da assistência. */
$cardsFilas = [];
foreach ($resumoFilas['filas'] as $fila => $resumoFila) {
    $cardsFilas[] = ['label' => ['andamento' => 'Abertos', 'orcamentos' => 'Aguardando aprovação do cliente'][$fila] ?? $resumoFila['label'], 'value' => $resumoFila['total'], 'accent' => $fila === 'retirada' ? 'success' : (in_array($fila, ['retornos', 'recusados', 'cancelamentos'], true) ? 'warning' : 'info'), 'href' => site_url('mapos') . listagemQuery(['visao' => 'classica', 'fila' => $fila])];
}
array_splice($cardsFilas, min(2, count($cardsFilas)), 0, [[
    'label' => 'Aguardando peças', 'value' => (int) ($resumoFilas['status']['Aguardando Peças'] ?? 0), 'accent' => 'warning',
    'href' => site_url('mapos') . listagemQuery(['visao' => 'classica', 'status' => 'Aguardando Peças']),
]]);
array_splice($cardsFilas, 1, 0, [[
    'label' => 'Em orçamento', 'value' => (int) ($resumoFilas['status']['Orçamento'] ?? 0), 'accent' => 'info',
    'href' => site_url('mapos') . listagemQuery(['visao' => 'classica', 'status' => 'Orçamento']),
]]);
array_splice($cardsFilas, 3, 0, [[
    'label' => 'Aprovado', 'value' => (int) ($resumoFilas['status']['Aprovado'] ?? 0), 'accent' => 'success',
    'href' => site_url('mapos') . listagemQuery(['visao' => 'classica', 'status' => 'Aprovado']),
]]);
array_splice($cardsFilas, 4, 0, [[
    'label' => 'Em andamento', 'value' => (int) ($resumoFilas['status']['Em Andamento'] ?? 0), 'accent' => 'progress',
    'href' => site_url('mapos') . listagemQuery(['visao' => 'classica', 'status' => 'Em Andamento']),
]]);
$cardsFilas[] = [
    'label' => 'Cancelados', 'value' => (int) ($resumoFilas['status']['Cancelado'] ?? 0), 'accent' => 'neutral',
    'href' => site_url('mapos') . listagemQuery(['visao' => 'classica', 'status' => 'Cancelado']),
];
?>
<section aria-labelledby="painel-filas-titulo">
    <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id="painel-filas-titulo" class="text-heading-md text-text">Ordens de serviço</h2>
        <?= component('button', ['label' => 'Ver OS', 'variant' => 'ghost', 'href' => site_url('os')]) ?>
    </div>
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
        <?php foreach ($cardsFilas as $cardFila) { ?>
            <?php
            $selecionado = isset($lista_painel) && $cardFila['href'] === site_url('mapos') . listagemQuery(['visao' => 'classica'] + $lista_painel['filtros']);
            if ($selecionado) {
                $cardFila['attrs'] = ['aria-current' => 'true'];
                $cardFila['class'] = 'ring-2 ring-primary';
            }
            ?>
            <?= component('kpi-card', $cardFila) ?>
        <?php } ?>
    </div>
    <p class="mt-2 text-caption text-muted">As filas podem incluir a mesma OS. Orçamentos incluem negociação; retirada considera serviço finalizado sem entrega registrada. Recusados considera a versão ativa, até nova publicação, retirada do orçamento ou cancelamento da OS. Cancelamentos em processo acompanha o pedido até a entrega do equipamento.</p>
</section>
