<?php
/** Lista e totais recalculados pelo servidor após operações nativas. */
$verFinanceiro = $this->permission->checkPermission($this->session->userdata('permissao'), 'vLancamento');
$pecasLista = $tipoLista === 'produto';
$itensDaLista = $pecasLista ? $produtos : $servicos;
$tipo = $pecasLista ? 'Peça' : 'Serviço';
?>
                <?php if ((int) $os->faturado === 1) { ?><p class="text-muted">OS faturada · valores protegidos</p><?php } ?>
                <?php if ($itensDaLista === []) { ?>
                    <?= component('empty-state', ['title' => $pecasLista ? 'Nenhuma peça nesta OS' : 'Nenhum serviço nesta OS', 'message' => $pecasLista ? 'As peças adicionadas aparecerão aqui.' : 'Os serviços adicionados aparecerão aqui.', 'icon' => 'package', 'class' => 'border-0']) ?>
                <?php } else { ?>
                    <ul class="trifase-os-itens" aria-label="<?= e($pecasLista ? 'Peças da OS' : 'Serviços da OS') ?>">
                        <?php foreach ($itensDaLista as $item) { ?>
                                <li>
                                    <div class="trifase-os-item-nome"><span><?= e($tipo === 'Peça' ? $item->descricao : $item->nome) ?></span><small><?= e($tipo) ?></small></div>
                                    <div class="trifase-os-item-valores"><span><?= e('Qtd. ' . str_replace('.', ',', (string) (0 + $item->quantidade))) ?></span>
                                        <?php if ($verFinanceiro) { ?>
                                            <span><?= e(dinheiro($item->preco)) ?> / un.</span>
                                            <?php if ((float) ($item->desconto ?? 0) > 0) { ?><span><?= e('Desconto: ' . (($item->tipo_desconto ?? '') === 'porcento' ? (0 + $item->desconto) . '%' : dinheiro($item->desconto))) ?></span><?php } ?>
                                            <strong><?= e(dinheiro($item->subTotal)) ?></strong>
                                        <?php } ?>
                                    </div>
                                    <?php if ($pode['editar']) { ?>
                                        <?= component('button', ['label' => 'Remover ' . ($tipo === 'Peça' ? $item->descricao : $item->nome), 'icon' => 'trash-2', 'icon_only' => true, 'variant' => 'ghost', 'attrs' => ['data-modal-abrir' => $tipo === 'Peça' ? 'excluir-produto' : 'excluir-servico', 'data-valor-id' => (string) ($tipo === 'Peça' ? $item->idProdutos_os : $item->idServicos_os), 'data-valor-nome' => $tipo === 'Peça' ? $item->descricao : $item->nome]]) ?>
                                    <?php } ?>
                                </li>
                        <?php } ?>
                    </ul>
                    <?php if ($verFinanceiro) { ?>
                        <dl class="trifase-os-totais">
                            <div><dt><?= e($pecasLista ? 'Subtotal das peças' : 'Subtotal dos serviços') ?></dt><dd><?= e(dinheiro($totais[$pecasLista ? 'produtos' : 'servicos'])) ?></dd></div>
                        </dl>
                    <?php } ?>
                <?php } ?>
