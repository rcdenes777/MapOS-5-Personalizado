# R08-001 — Matriz F03 e ressalvas N1/N2/N5/N6

**Código final testado:** `dd0175eff11f9758ba430a37052af0f12bafe997`.
**Referência funcional:** `8c256cae4ddaeefad68922abddbb8addfe37c99d` (`v5-trifase`).
**Base R07-003:** `cc738622436d3df1224df700916970570eb0bd40`.
**Legenda de status:** `proved` = teste falha se a regra for removida (controle negativo/mutante); `executed-only` = caminho executado sem oracle específico; `limitation` = fora do alcance desta rodada.

## F03 — identidade de linhas

| ID | Regra | Fonte | Oracle | Testes | Status |
| --- | --- | --- | --- | --- | --- |
| F03-01 | Duas linhas idênticas recebem IDs distintos, inteiros positivos | Tarefa R08-001 §1 | conjunto de `lineId` com 3 elementos | D01, B01, `line-identity` 1 | proved |
| F03-02 | Editar quantidade/preço/nome da mesma linha e tipo preserva o ID | Tarefa §1 | `lineId` igual antes/depois | D02, D06, B03, `line-identity` 2, R08M-01 | proved |
| F03-03 | Reordenar preserva IDs por identidade, não por índice | Tarefa §1 | sequência de IDs acompanha a sequência de nomes | D03, B16, `line-identity` 2, R08M-12 | proved |
| F03-04 | Inclusão posterior não recicla o ID de linha excluída | Tarefa §1 | novo ID > removido; ID removido ausente | D04, D31, D32, B04, R08M-03, R08M-04 | proved |
| F03-05 | Trocar o tipo aloca novo ID (mesmo nome/valores) | Tarefa §1 | novo `lineId` ≠ anterior e antigo não reutilizado | D05, B05, R08M-02 | proved |
| F03-06 | ID forjado/duplicado no payload é rejeitado com mensagem exata e estado intacto | Tarefa §1 | `'O item mudou ou não pertence a esta OS. Reabra o orçamento.'` + JSON igual | D06, D07, B06, `line-identity` 2, R08M-06 | proved |
| F03-07 | `null`/ausente é inclusão nova, não identidade forjada | Editor (`itemId` vazio) | novo ID monotônico | D06, D08, `line-identity` 5 | proved |
| F03-08 | Snapshot publicado permanece byte a byte imutável | Tarefa §1 | JSON da versão igual após editar rascunho | D09, B07 | proved |
| F03-09 | Nova publicação compara identidade mesmo com valores públicos iguais | Tarefa §1 | `vigente()===null` e rótulo `Itens alterados` | D10, B07, R08M-07 | proved |
| F03-10 | Snapshot legado sem IDs mantém comparação de conteúdo | Tarefa §1 | `vigente()` devolve v1 | D11, B21, R08M-08 | proved |
| F03-11 | Migração perezosa em `init` não reescreve versões nem cobrança legadas | Tarefa §3 | JSON de `versions`/`billing` igual; sem `lineId` neles | D12, B21 | proved |
| F03-12 | Portal não expõe `lineId`/`nextLineId` | AGENTS/segurança | projeção JSON sem IDs privados | D13, B21 | proved |
| F03-13 | `nextLineId` monotônico após serialização/exclusão | Tarefa §1 | novo ID > máximo anterior | D14, D32, R08M-04 | proved |
| F03-14 | ID duplicado em rascunho corrompido é reparado só no rascunho | Tarefa §3 | dois IDs distintos após um `init`; snapshot intocado | D15, R08M-04, R08M-05 | proved |
| F03-15 | `itemKey` incorpora OS, pedido, `lineId`, tipo, nome, quantidade e valor | Tarefa §4 | chaves distintas para cada variação; duas linhas idênticas | D26, R08M-09/10/19/24 | proved |
| F03-16 | Retirada usa `lineId` + chave; inexistente/forjada/ausente é rejeitada | Tarefa §4 | `'Item não encontrado.'` / `'O item ou pedido mudou. Reabra a conferência.'` | D16, D21, B13, R08M-11 | proved |
| F03-17 | Modal stale de A, com B no índice original, não atinge B | Tarefa §4 | rejeição + B intacta | D18, B13, R08M-12 | proved |
| F03-18 | Retirada parcial preserva o ID; replay da chave antiga é rejeitado; nova chave permite | Tarefa §4 | ID e quantidade; mensagem exata; evento não duplicado | D17, D22, B14, B15, R08M-13 | proved |
| F03-19 | Chave de outra OS/pedido é rejeitada | Tarefa §4 | `'O item ou pedido mudou...'` + estado intacto | D20, D26, B17, R08M-09/10 | proved |
| F03-20 | Conferência técnica incorpora identidade/quantidade e não pode ser duplicada | Tarefa §4 | `technical()` falso após mudança; duplicata rejeitada | D23, D35, U02, R08M-14/21/25 | proved |
| F03-21 | Chave financeira incorpora OS, pedido, identidade e estado; chave antiga rejeitada no `confirm` | Tarefa §4 | `'A OS mudou. Reabra o acerto.'` + estado intacto | D24, D33, D34, R08M-20/23 | proved (domínio/UI); browser `cancelconfirm` é limitação |
| F03-22 | Nenhuma operação rejeitada movimenta estoque ou financeiro | Tarefa §4/§6 | `stockReturned:0`, total/paid/billing/ledger iguais | D27, D30, B24, R07-003-B18b | proved |
| F03-23 | Cobrança formalizada carrega `lineId` e é imutável após obrigação | Tarefa §3 | itens da cobrança com IDs; `saveDraft` bloqueado | D25, B10 | proved |

## N1 — fallback temporal só em raiz finalizada

| Regra | Oracle | Testes | Status |
| --- | --- | --- | --- |
| Raiz aberta/cancelada com conclusão preenchida não exibe prazo de garantia | `warrantyOriginRef` nulo e ausência de "Dentro do prazo/Prazo expirado" | U04, B22 | proved |
| Raiz finalizada conserva conclusão/prazo, mesmo com unidade substituída | referência e período exibidos | B22, R07-003-B12, R07-003-D06, R07M-18 | proved |
| Data de conclusão inválida não gera fallback | `warrantyOriginRef` nulo | U04 | proved |

## N2 — retorno ativo de outra raiz sem misturar garantias

| Regra | Oracle | Testes | Status |
| --- | --- | --- | --- |
| Link do painel identifica retorno ativo de outra origem | texto `outra origem` + `href` `#os/90/garantia` | B23 | proved |
| Rota direta `#retorno/:id` identifica a outra origem | título `Retorno em andamento · outra origem` | B23 | proved |
| Retorno da mesma origem mantém texto normal | ausência de `outra origem` | B23 (negativo) | proved |
| Bloqueio por unidade (segunda abertura) permanece | `active()` bloqueia nova abertura | R07-003-B13/B14, R07-B… | proved |
| Vários ativos legados da mesma unidade | rótulo pode depender da ordem do array | — | limitation (R10) |

## N5 — produto zerado fora do seletor e guarda no handler

| Regra | Oracle | Testes | Status |
| --- | --- | --- | --- |
| Seletor de troca não oferece produto com quantidade 0 | `option[value=P-002]` ausente; P-001 presente | U03, B24, R07-003-B18b | proved |
| Página stale que injeta o SKU zerado é recusada | `'Produto inexistente ou sem estoque disponível.'` + estoque/operações intactos | B24, R07-003-B18b, R08M-17 | proved |
| Estoque fracionário corrompido | seletor oferece, handler recusa | — | limitation (R10, UI) |

## N6 — selo normalizado único

| Regra | Oracle | Testes | Status |
| --- | --- | --- | --- |
| Selo normalizado (caixa/espaços) duplicado é recusado no modo novo | `'Selo já cadastrado...'` + nenhuma OS criada | N6-02, B25, `line-identity` 14 | proved |
| Bypass por `mode='later'` ou modo omitido é recusado | mesma mensagem + `localStorage` intacto | N6-03, N6-04, B25b, R08M-22 | proved |
| Selo de outro cliente é recusado | mesma mensagem + contagem intacta | N6-05, B25b | proved |
| Selo de substituta em garantia é recusado | mesma mensagem + contagem intacta | N6-06, B25b, D28, R08M-15/16 | proved |
| Selecionar a própria unidade existente não é bloqueada e copia unidade/selo | nova OS com `unit`/`seal`/marca/modelo da unidade | N6-07, B25 | proved |
| Campos do formulário preservados na rejeição | valores de marca/modelo/selo iguais | N6-02, B25b | proved |
| `mode='existing'` valida só cliente (UI exige marca/modelo) | duas definições de "unidade válida" | — | limitation (R10) |

## Contagem de provas

- Regras F03: 23 — todas `proved`, com a limitação declarada em F03-21 (browser `cancelconfirm`).
- N1: 3 proved. N2: 4 proved + 1 limitation. N5: 2 proved + 1 limitation. N6: 6 proved + 1 limitation.
- Mutações: 25/25 detectadas, 0 sobreviventes, 0 inconclusivas, 0 fora do alvo.
