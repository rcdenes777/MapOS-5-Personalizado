<?php
/** Formulário compartilhado entre a aba nativa e o resumo Trifase. */
$verValoresItem = $pode['ver_financeiro'] ?? true;
$produto = $tipoItem === 'produto';
$idOs = (int) $os->idOs;
?>
                <form method="post" action="<?= e(site_url($produto ? 'os/adicionarProduto' : 'os/adicionarServico')) ?>" novalidate
                      class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_7rem_9rem_auto] lg:items-start"
                      data-os-acao="<?= e($produto ? 'produto' : 'servico') ?>" data-os-limpar>
                    <input type="hidden" name="idOs" value="<?= e($idOs) ?>">
                    <div class="relative sm:col-span-2 lg:col-span-1"<?= componenteAtributos([
                        'data-autocomplete' => site_url($produto ? 'os/autoCompleteProduto' : 'os/autoCompleteServico'),
                        'data-autocomplete-alvo' => $prefixoItem . '-id',
                        'data-autocomplete-listar' => '',
                        'data-os-preco' => $verValoresItem ? $prefixoItem . '-preco' : null,
                        'data-os-estoque' => $produto && $controle_estoque ? $prefixoItem . '-estoque' : null,
                    ]) ?>>
                        <?= component('input', [
                            'name' => $produto ? 'produto' : 'servico',
                            'id' => $prefixoItem . '-nome',
                            'label' => $produto ? 'Produto' : 'Serviço',
                            'required' => true,
                            'autocomplete' => 'off',
                            'placeholder' => $produto ? 'Descrição ou código de barras' : 'Nome do serviço',
                            'help' => $produto && $controle_estoque ? 'O produto sai do estoque ao ser adicionado.' : null,
                            'attrs' => [
                                'data-msg-vazio' => $produto ? 'Escolha o produto.' : 'Escolha o serviço.',
                                'data-msg-invalido' => $produto ? 'Escolha um produto da lista.' : 'Escolha um serviço da lista.',
                            ],
                        ]) ?>
                        <input type="hidden" id="<?= e($prefixoItem . '-id') ?>" name="<?= e($produto ? 'idProduto' : 'idServico') ?>" value="">
                        <p id="<?= e($prefixoItem . '-estoque') ?>" class="mt-1 text-caption text-muted" aria-live="polite"></p>
                    </div>
                    <?= component('input', [
                        'name' => 'quantidade',
                        'id' => $prefixoItem . '-quantidade',
                        'label' => 'Quantidade',
                        'type' => 'number',
                        'value' => '1',
                        'required' => true,
                        'attrs' => array_filter([
                            'min' => $produto ? '1' : '0.01',
                            'step' => $produto ? '1' : '0.01',
                            'inputmode' => $produto ? 'numeric' : 'decimal',
                            'data-msg-vazio' => 'Informe a quantidade.',
                            'data-msg-invalido' => $produto ? 'Informe um número inteiro maior que zero.' : 'Informe uma quantidade maior que zero.',
                        ]),
                    ]) ?>
                    <?php if ($verValoresItem) { ?>
                    <?= component('input', [
                        'name' => 'preco',
                        'id' => $prefixoItem . '-preco',
                        'label' => 'Preço (R$)',
                        'required' => true,
                        'placeholder' => '0,00',
                        'help' => 'Sugerido pelo cadastro; pode ser alterado.',
                        'attrs' => [
                            'inputmode' => 'numeric',
                            'data-mascara' => 'dinheiro',
                            'data-msg-vazio' => 'Informe o preço.',
                        ],
                    ]) ?>
                    <?php } else { ?>
                        <p class="text-caption text-muted">O preço do cadastro será aplicado. Preços e descontos são controlados pelo financeiro.</p>
                    <?php } ?>
                    <div class="lg:pt-7" data-item-enviar>
                        <?= component('button', ['label' => 'Adicionar', 'icon' => 'plus', 'variant' => 'outline', 'type' => 'submit', 'attrs' => ['data-rotulo-carregando' => 'Adicionando…']]) ?>
                    </div>
                    <?php if ($verValoresItem) {
                        $this->load->view('os/partes/desconto-item-campos', ['prefixoDesconto' => $prefixoItem]);
                    } ?>
                </form>
