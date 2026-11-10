<?php
/** Filas operacionais: mesmas contagens e destinos do painel da assistência. */
$cardsFilas = [[
    'label' => 'Abertos', 'value' => (int) ($resumoFilas['status']['Aberto'] ?? 0), 'accent' => 'info',
    'href' => site_url('mapos') . listagemQuery(['visao' => 'classica', 'status' => 'Aberto']),
]];
foreach ($resumoFilas['filas'] as $fila => $resumoFila) {
    if ($fila === 'andamento') {
        continue;
    }
    if ($fila === 'orcamentos') {
        $cardsFilas[] = ['label' => 'Aguardando aprovação do cliente', 'value' => (int) ($resumoFilas['status']['Negociação'] ?? 0), 'accent' => 'info', 'href' => site_url('mapos') . listagemQuery(['visao' => 'classica', 'status' => 'Negociação'])];
        continue;
    }
    $cardsFilas[] = ['label' => $resumoFila['label'], 'value' => $resumoFila['total'], 'accent' => $fila === 'retirada' ? 'success' : 'warning', 'href' => site_url('mapos') . listagemQuery(['visao' => 'classica', 'fila' => $fila])];
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
    <p class="mt-2 text-caption text-muted">Clique em um indicador para ver a lista no lugar da agenda. Retornos e cancelamentos podem incluir OS dos demais indicadores.</p>
</section>
