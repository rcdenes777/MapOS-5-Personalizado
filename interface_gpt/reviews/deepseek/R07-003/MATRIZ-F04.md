# R07-003 — Matriz F04 ampliada (troca, estoque e equipamentos)

**Fonte:** `application/controllers/Trifase_retornos.php` (`trocar`), `application/models/Trifase_garantia_model.php::trocar`, `application/models/Trifase_estoque_model.php::movimentar`, `application/models/Trifase_equipamento_model.php`, `application/config/permissions_map.php` no SHA de referência `8c256cae4ddaeefad68922abddbb8addfe37c99d` (`v5-trifase`). Conferência estática; nenhum backend/PHP/banco foi executado nesta rodada.

**Regra:** o protótipo **não** presume direitos efetivos pelo nome do perfil. Cada ação da demonstração usa uma capacidade simulada (`can(...)`) como substituto conservador da conjunção nativa; a produção deve continuar exigindo as capacidades reais listadas.

## Capacidades nativas por ação (código original)

| Ação | Capacidades exigidas no original | Referência |
| --- | --- | --- |
| Abrir/consultar retorno e garantia | `vOs` | `Trifase_retornos.php:81` |
| Criar novo retorno | `vOs` + `aOs` + `eOs` | `Trifase_retornos.php:23-25` |
| Avaliar cobertura/solução | `vOs` + `eOs` | `Trifase_retornos.php:139-141` |
| Registrar/corrigir custo interno | `vOs` + `eOs` + `vCustoInterno` + `eCustoInterno` | `Trifase_retornos.php:164-196` |
| Ver valores financeiros do retorno | `vOs` + `vLancamento` | `Trifase_retornos.php:92` |
| Registrar devolução de garantia | `vOs` + `eOs` + `vLancamento` + `reembolsarGarantia` | `Trifase_retornos.php:247-250` |
| Corrigir devolução de garantia | `vOs` + `eOs` + `vLancamento` + `reembolsarGarantia` + `estornarRecebimento` | `Trifase_retornos.php:278-283` |
| **Executar troca física (estoque ou externa)** | `vOs` + `eOs` + `vProduto` + `trocarGarantia` | `Trifase_retornos.php:213-219`; `permissions_map.php:47` |
| **Informar custo externo da substituta** | `vCustoInterno` + `eCustoInterno` (além das anteriores) | `Trifase_retornos.php:221-224` |
| **Dar baixa de 1 unidade do estoque na troca** | `vProduto` (a mesma capacidade da consulta/movimento de produto) + `trocarGarantia` | `Trifase_retornos.php:217-218`; `Trifase_estoque_model.php:36-105` |
| **Selecionar modelo/unidade existente da substituta** | `vProduto` + `eOs` | `Trifase_garantia_model.php:74-86` |
| Exibir o botão “Trocar” na tela do retorno | `eOs` + `trocarGarantia` + `vProduto` | `Trifase_retornos.php:129` |
| Ver/operar a OS de origem | `vOs` (consulta) e `eOs` (edição) | `Trifase_retornos.php:23-25, 81, 139` |
| Estornar recebimento ordinário | `vOs` + `vLancamento` + `estornarRecebimento` | `Trifase_financeiro.php:89-92` |

Observações nativas:

- O controller aceita `custo_externo` vazio quando a origem é estoque; o custo vem de `produtos.precoCompra` e pode ser `null` (desconhecido), sem inventar valor.
- A baixa de estoque é `movimentar($produto,'troca_saida',1,$custo,...)`; a autorização é a do controller (`vProduto`/`trocarGarantia`), não um direito implícito pelo nome do perfil.
- A unidade antiga não é apagada; a substituta é um novo registro em `trifase_equipamentos` e a troca guarda `antiga_id`/`nova_id` em `trifase_garantia_trocas`.

## Simulação do protótipo (demonstração)

`roleCaps` em `interface_gpt/assets/app.js` (inalterado nesta rodada):

| Perfil | Capacidades simuladas | Consequência para a troca |
| --- | --- | --- |
| Administrador | `create, tech, finance, deliver, return, client, settings` | Registra a troca, vê o custo privado e o motivo; executa a baixa fictícia |
| Financeiro | `finance` | Consulta o painel e valores; **não** vê custo interno nem executa troca |
| Técnico | `tech` | Avalia retorno; **não** executa troca nem vê custo |
| Atendente | `create, deliver, return, client` | Cria retorno/entrega; **não** executa troca nem vê custo |

Mapeamento conservador:

- `warrantySwap` → `can('settings')`, no lugar de `eOs + trocarGarantia + vProduto` (e `vCustoInterno`/`eCustoInterno` quando há custo externo). `settings` é o marcador de Admin na simulação; **não** é inferência de que o perfil real “Administrador” possua essas permissões.
- `warrantyCostAllowed()` → `can('settings')`, no lugar de `vCustoInterno`; custo oculto para Financeiro/Técnico/Atendente.
- O protótipo não tem tabela de produtos/equipamentos nem autenticação; `db.stock` é uma lista fictícia com `sku`, `quantity`, `cost` e `movements`. A baixa é local e explícita de **1** unidade, sem generalizar estoque (R08).
- Nenhuma permissão foi ampliada: as rotas/funções existentes continuam iguais; a ação de troca é adicional e restrita a Admin na simulação.

## Evidências de comportamento (não de autorização real)

| Verificação | Evidência |
| --- | --- |
| Admin registra troca externa e de estoque | `testes/r07-003-browser.log` R07-003-B10/B18; `testes/r07-003-domain.log` D01/D02 |
| Financeiro, Técnico e Atendente não executam (nem por handler direto) e não veem custo | R07-003-B55-Financeiro/Técnico/Atendente; R07-003-B56; `r07-003-edge.log` R07E3-P-03 |
| Handler direto não autorizado deixa o estado intacto | R07-003-B55-*; `tests/warranty-swap-ui.cjs` (suíte do GPT) |
| Custo interno só para Admin | R07-003-B11 (Admin), R07-003-B55-* (demais) |
| Portal público sem selo, motivo, custo ou IDs | R07-003-B16; R07E3-P-01; D21 |
| Estoque: baixa exata de 1, movimento vinculado, outro produto intacto | R07-003-B18/B19; D02/D03 |

## Limitações

- A simulação não tem autenticação, sessão, CSRF ou backend; os perfis são um seletor de demonstração.
- A matriz é a **exigência** nativa; a correspondência 1:1 com a futura implementação fica para a integração (R10/homologação).
- `vProduto` cobre tanto a consulta quanto a movimentação no original; R08 deverá separar catálogo, IDs estáveis, movimentos, consumo e devolução.
- Nenhum teste desta rodada executa o backend PHP ou o banco; a comparação com o original é estática, no SHA de referência.
