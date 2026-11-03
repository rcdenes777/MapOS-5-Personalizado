<?php
/** Filas operacionais: mesmas contagens e destinos do painel da assistência. */
$cardsFilas = [];
foreach ($resumoFilas['filas'] as $fila => $resumoFila) {
    $cardsFilas[] = ['label' => ['andamento' => 'Abertos', 'orcamentos' => 'Aguardando aprovação do cliente'][$fila] ?? $resumoFila['label'], 'value' => $resumoFila['total'], 'accent' => $fila === 'retirada' ? 'success' : ($fila === 'retornos' ? 'warning' : 'info'), 'href' => site_url('os') . listagemQuery(['fila' => $fila])];
}
array_splice($cardsFilas, min(2, count($cardsFilas)), 0, [[
    'label' => 'Aguardando peças', 'value' => (int) ($resumoFilas['status']['Aguardando Peças'] ?? 0), 'accent' => 'warning',
    'href' => site_url('os') . listagemQuery(['status' => 'Aguardando Peças']),
]]);
?>
<section aria-labelledby="painel-filas-titulo">
    <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id="painel-filas-titulo" class="text-heading-md text-text">Ordens de serviço</h2>
        <?= component('button', ['label' => 'Ver OS', 'variant' => 'ghost', 'href' => site_url('os')]) ?>
    </div>
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
        <?php foreach ($cardsFilas as $cardFila) { ?>
            <?= component('kpi-card', $cardFila) ?>
        <?php } ?>
    </div>
    <p class="mt-2 text-caption text-muted">As filas podem incluir a mesma OS. Orçamentos incluem negociação; retirada considera serviço finalizado sem entrega registrada.</p>
</section>
