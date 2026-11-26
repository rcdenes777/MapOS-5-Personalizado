# R08-001 — Relatório técnico

**Tarefa:** `interface_gpt/mensagens/gpt-para-deepseek/R08-001.md`
**Status:** concluído no escopo experimental — **APTO COM RESSALVAS** (0 bloqueantes de código após correções e reauditoria).
**Data:** 26/11/2026
**Referência funcional imutável:** `8c256cae4ddaeefad68922abddbb8addfe37c99d` (`v5-trifase`, conferida em `origin`).
**Base experimental R07-003:** `cc738622436d3df1224df700916970570eb0bd40`.

## 1. Referências e proveniência

| Item | SHA |
| --- | --- |
| Candidato inicial (GPT) | `3a2a80c8abf436414528d2061f68652942da6ac4` (tree `2f29b141d1a418ca5a8868d6c619fec53eb81ee0`) |
| Candidato corretivo 1 | `93dc628dbc47c890c2700ee246318585d10820a5` (N6, conferência duplicada, N2 rota direta) |
| **Código final testado** | **`dd0175eff11f9758ba430a37052af0f12bafe997`** (tree `ee7a91bbebb01cb08081b04d9d97db04ea952728`) |
| ACK R08-001 | `06cdb1c7` |
| HEAD remoto no recebimento | `8e14333ab70436d0ba5e7d6d49b5a2e92667868b` |
| Evidências | pasta `interface_gpt/reviews/deepseek/R08-001/` |

`proveniencia.json` registra o SHA-256 de trabalho e o gravado no commit para os 13 arquivos de produto; **todos batem byte a byte** com `dd0175ef`. Nada fora de `interface_gpt/` foi alterado em `8c256cae..dd0175ef` (verificado por `git diff --name-only`), e `v5-trifase` permanece `8c256cae`.

## 2. Recorte executado

F03 — identidade monotônica local à OS para linhas de peça/serviço, persistida apenas no rascunho; snapshots publicados, cobranças e histórico nunca reescritos. Nova publicação compara identidade; versão legada sem IDs mantém a comparação de conteúdo. Edição de mesma linha/tipo preserva ID; troca de tipo e inclusão alocam novo; exclusão não recicla. Cancelamento usa `lineId` + chave do retrato (OS, pedido, linha, valores), não índice. Conferência técnica e chave financeira incorporam identidade. Ressalvas N1 (fallback só em raiz finalizada), N2 (retorno ativo de outra origem identificado), N5 (produto zerado fora do seletor e recusado no handler), N6 (selo normalizado único, inclusive substituta e outros clientes). Sem antecipar estoque/equipamentos de R08-002.

## 3. Defeitos encontrados e correções

A primeira revisão adversarial (DeepSeek Flash, contexto novo, somente leitura) reprovou o candidato `3a2a80c8` com três bloqueantes concretos:

| # | Defeito | Correção | Prova |
| --- | --- | --- | --- |
| B1 | N6 só bloqueava selo duplicado quando `mode==='new'`; payload `mode='later'` ou omitido gravava selo duplicado | `if(d.mode!=='existing'&&BancadaWarranty.sealInUse(...))` — modo existente continua permitido | `R08-N6-03/04`, `B25b`, mutante `R08M-22` |
| B2 | Segunda conferência técnica do mesmo pedido era aceita e duplicava evento | `ensure(!technical(o),'Conferência técnica já registrada para este pedido.')` | `D23`, mutante `R08M-21` |
| B3 | Rota direta `#retorno/:id` mostrava texto genérico para retorno ativo de outra origem | Título/texto `Retorno em andamento · outra origem` e link explícito | `B23` (aba Garantia + rota direta + negativo de mesma origem) |

Além disso, a composição da chave financeira foi corrigida para incluir o pedido (`state(o)?.id`) e a OS (`o.id`), fechando reapresentação de acerto entre pedidos/OS distintos (`D33`, `D34`, mutantes `R08M-20`, `R08M-23`).

Revisões: 1ª em `3a2a80c8` → `passed=false` (3 bloqueantes); 2ª em `93dc628d` → `passed=true`, 0 bloqueantes; 3ª em `dd0175ef` → `passed=true`, 0 bloqueantes. Pareceres em `AUDITORIA-INDEPENDENTE.md`.

## 4. O que foi realmente executado (no código final `dd0175ef`)

### 4.1 Suítes do projeto (Node, VM isolada)

16 suítes, **327 checagens, 0 falhas** (`testes/r08-node-suites.json`), incluindo as 15 novas do candidato (`line-identity.cjs` 15 + `line-identity-ui.cjs` 6).

### 4.2 Laboratório R08 (novas suítes)

| Suíte | Resultado |
| --- | --- |
| `r08-domain.cjs` — identidade, snapshots, cancelamento, chaves, N6/selo no domínio | **35/35 PASS** |
| `r08-ui.cjs` — editor, modal por `lineId`, N1/N5 em stub DOM | **4/4 PASS** |
| `r08-n6.cjs` — navegador: modo novo, `later` injetado, modo omitido, outro cliente, substituta, unidade existente | **8/8 PASS** |
| `r08-browser.cjs` — navegador real, FormData, duas abas, N1/N2/N5/N6, 320/390/768/1440, teclado, axe, impressão | **40/40 PASS**, 3 scans axe, 0 violações |
| `r08-mutacoes.cjs` — 25 mutações nas guardas de F03/N1/N5/N6 | **25 DETECTADA, 0 sobrevivente, 0 inconclusiva, 0 fora do alvo** |

### 4.3 Regressões acumuladas R02–R07-003

| Rodada | Resultado |
| --- | --- |
| R02 | 37/37 (`regressao-r02.r08.log`) |
| R03 | 118 (116 PASS + 2 INFO) (`regressao-r03-audit.r08.log`) |
| R04 | browser 44; bordas 17 |
| R05 | browser 56; bordas 18 |
| R06-002 | browser 103 (102 PASS + 1 INFO); negativos 15; bordas 25; mutações 18/18; axe 23 (21 scans); impressão 9 (8 PASS + 1 INFO); handler técnico 16 |
| R07 | browser 65; negativos 54; bordas 56; mutações 21 (20 detectadas + 1 equivalente pré-existente); impressão 6; handler-check com guarda presente |
| R07-002 | browser 74; domínio 31 (30 + 1 INFO); negativos 38; bordas 32; mutações 26/26; impressão 8 |
| R07-003 | browser 64; domínio 33; bordas 30; mutações 26 (24 detectadas + 2 fora do alvo, pré-existentes); impressão 5 |

Adaptações de teste permitidas pela tarefa (sem enfraquecer asserções): `conferPiece` passou a resolver o `lineId` da linha no instante da abertura (sem fallback por índice); chamadas R06 que usavam índice foram convertidas para `lineIdAt`/`lineIdByName`; o teste de SKU zerado foi retargetado para "opção não oferecida + injeção direta recusada"; a mutação do selo foi apontada para `sealInUse`.

## 5. Paridade com o original (conferência estática em `8c256cae`)

| Regra nativa | Fonte | Protótipo | Situação |
| --- | --- | --- | --- |
| Retirada por id de linha + pedido + tipo | `Trifase_cancelamento_model::retirarItem` | `remove(o,lineId,...,expected)` com `itemKey` = OS, pedido, `lineId`, tipo, nome, qtd, valor | Paridade; protótipo mais estrito (nome/valor) |
| Hash técnico com ids e quantidades | `::hashTecnico` | `technicalKey` com `lineId`, tipo, nome, qtd, valor | Paridade; protótipo mais estrito |
| Conferência bloqueia encerrado/financeiro | `::conferencia` | `blockers` (status, conclusão, entrega, garantia) | Paridade funcional no escopo do protótipo |
| Retrato publicado carrega id nativo do item | `Trifase_orcamento_model::retrato` | versão publicada carrega `lineId` | Paridade |
| Vigência compara conteúdo/ids | `::versaoVigente` | ids para snapshots novos; conteúdo para legado | Paridade, com exceção legada documentada |
| Selo único normalizado | `Trifase_equipamento_model::vincular` (`selo_chave` = hash de maiúsculas sem espaços) | `sealInUse` (uppercase + sem espaços, OS e substituta) | Paridade (protótipo não usa hash) |
| Baixa de estoque vinculada à linha | `Trifase_estoque_model::movimentar`/`saldoBaixaDaLinha` (`os_item_id`) | nenhum movimento; `stockReturned:0` e nota explícita | Simulação; débito real é R08-002 |
| N1 referência exige raiz finalizada | `Trifase_garantia_model::reference` | `warrantyOriginRef` exige `status==='Finalizado'` e conclusão válida | Paridade |
| N5 disponibilidade > 0 | `Trifase_garantia_model::trocar` | seletor filtra `quantity>0`; handler rejeita zero/inexistente | Paridade |

Nenhum backend, banco, produção ou migração foi executado. A paridade é **estática**, não executada contra MySQL nativo.

## 6. Revisão independente

- Modelo: subagente DeepSeek Flash (`delegate_task`), contexto novo, somente leitura, sem edição/commit/push.
- 1ª rodada: `passed=false` — 3 bloqueantes (acima), todos reproduzidos pelo revisor em probes próprios.
- 2ª rodada (após `93dc628d`): `passed=true`, 0 bloqueantes; 3 sugestões não bloqueantes; mutações reexecutadas 22/22.
- 3ª rodada (após `dd0175ef`): `passed=true`, 0 bloqueantes; confirmou a mudança de 1 linha, 25/25 mutações, 327 checks e os 3 vetores fechados.
- As sugestões restantes são de cobertura/rastreabilidade (caso de `cancelconfirm` no browser, mutante do ramo N2, controle positivo no D34, versionamento do pacote de testes) e estão registradas para R10/rodada seguinte.

## 7. Limitações, riscos e pendências

1. **Protótipo estático**: toda a autorização e persistência são client-side (`localStorage`); não há fronteira de servidor. As provas valem para o protótipo, não para o MapOS real.
2. **F03 não fecha integralmente**: vínculo produto/linha e conciliação de estoque dependem de R08-002; F07 fica para R10. Nenhum movimento de estoque foi inventado.
3. **N6 modo `existing`**: o handler valida apenas `client` e `!replaced`, enquanto a UI também exige marca/modelo. Um payload forjado pode escolher pedido sem identificação do mesmo cliente; não há criação de selo duplicado no estado testado. Registrado para R10 (definir "unidade válida" em um único lugar).
4. **N2 com dados legados corrompidos**: `active()` devolve o primeiro retorno ativo; dois retornos ativos da mesma unidade (um de origem estrangeira) tornam o rótulo dependente da ordem. `create()` impede novos duplicados. R10.
5. **Devolução com data futura** (pré-existente R06): valida formato e não-anterioridade a eventos, mas não `<= hoje`. Fora do recorte R08; registrado para R10.
6. **N5 com estoque fracionário corrompido**: o seletor oferece `quantity>0` fracionário; o handler exige inteiro e recusa. Ajuste de UI/UX para R10.
7. **Toast sobre o modal**: mensagem de sucesso anterior pode coexistir com erro novo; já é ressalva de usabilidade de R10.
8. **Rastreabilidade**: os JSONs do pacote de revisão são publicados neste commit de evidências; o commit de código `dd0175ef` contém apenas `cancel.js`. Hashes em `proveniencia.json`.
9. **Mutação**: 2 resultados "fora do alvo" em R07-003 e 1 "equivalente" em R07 são pré-existentes e foram preservados, não reclassificados.
10. **Cobertura de browser**: o modal `cancelconfirm` é coberto em domínio e no teste `tests/cancel-ui.cjs`, não na suíte de browser R08; axe cobre o modal de conferência em 1440/768/390, não todas as telas.

## 8. Ressalvas de usabilidade registradas para R10 (sem redesign nesta rodada)

Nove abas na OS; modal extenso no celular; toast sobre controles; hierarquia densa; mensagem genérica de erro em alguns handlers. Nenhuma foi alterada em R08-001.

## 9. Conclusão

O candidato final `dd0175ef` cumpre o recorte de F03 no protótipo (identidade estável, snapshots imutáveis, cancelamento por linha/chave, conferência/chave financeira vinculadas) e as ressalvas N1/N2/N5/N6, com 0 bloqueantes após três rodadas de revisão independente. Permanece **APTO COM RESSALVAS**: F03 só fecha integralmente após R08-002, e os itens da seção 7 exigem decisão/registro em R10. A aprovação final da rodada pertence ao GPT Supervisor; homologação final é humana.
