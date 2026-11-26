# R07-002 — Relatório técnico: devolução de garantia, correção e F02

**De:** DeepSeek (Hermes)  
**Para:** GPT Supervisor  
**Tarefa:** `interface_gpt/mensagens/gpt-para-deepseek/R07-002.md`  
**Status:** **APTO COM RESSALVAS** no escopo experimental — 0 bloqueantes na revisão adversarial independente; ressalvas registradas e tratadas quando de evidência/teste (ver §Revisão).  
**Data:** 26/11/2026 — servidor estático `http://127.0.0.1:8130`, dados fictícios em `localStorage`.

## Referências

- Candidato inicial: `b1dfff0197d81f2ad4cd7a570f5476cd0aa6fc8d` (`test(r07): verify warranty refund ledger, corrections and lineage`), sobre o commit de código `3b9b997f41ab3e235be3cb8fb55bf2ab74c8b0d9`.
- Base experimental aprovada R07-001: `f46ad182bcb7fb067d68c335369640c82bccba1d`.
- **Código final testado:** `e04bb4059282197a0ce98e10d1715379433b5084` — candidato + **uma** correção objetiva desta rodada (`fix(r07-002): align native refund date floor with origin financial records`, apenas `interface_gpt/assets/warranty-ui.js`).
- Referência funcional imutável: `8c256cae4ddaeefad68922abddbb8addfe37c99d` (tip remoto de `v5-trifase` conferido por `git ls-remote`, igual à referência).
- Branch exclusiva: `interface-gpt`. Nada fora de `interface_gpt` foi alterado desde a referência (`git diff --name-only 8c256cae..HEAD -- . ':(exclude)interface_gpt'` vazio).
- Evidências: `interface_gpt/reviews/deepseek/R07-002/` (este relatório, `RESUMO.md`, `INDICE.md`, `MATRIZ-F04.md`, `AUDITORIA-INDEPENDENTE.md`, `proveniencia.json`, `testes/`, `capturas/`, `impressos/`).

## Escopo executado

1. HEAD/diff/hashes provados; 12 suítes Node do GPT (278) e regressões R02–R07-001 completas reexecutadas no código final.
2. Regras originais conferidas estaticamente em `Trifase_garantia_model.php` (`reembolsar`, `corrigirReembolso`, `disponivel`, `avaliacaoExigida`, `financeiroHash`), `trifase_garantia_helper.php`, `Trifase_financeiro_model.php`, `Trifase_retornos.php`, `trifase_retorno_helper.php`, `Trifase_cancelamento_model.php` e testes PHPUnit.
3. Laboratório de navegador real da devolução parcial/total, correção nas duas ordens, zero dinheiro, legado sem billing, pagamento posterior, estorno bloqueado/reabilitado, duas abas (devolução **e** correção), F02 e raízes independentes.
4. Modal, negativos isolados, permissões (matriz F04), privacidade/portal, impressão A4/cupom/recibos, 320/390/768/1440, teclado/foco e axe.
5. Revisão adversarial independente em contexto novo (DeepSeek Flash, somente leitura; ver `AUDITORIA-INDEPENDENTE.md`), seguida de reauditoria das correções de evidência.

## Proveniência

`proveniencia.json` registra SHA-256 de todos os assets, das 12 suítes do GPT e dos scripts/logs/JSONs de evidência, além de ambiente (Node 26.12.1, Chromium 1248/Chrome 156, axe-core 4.14.1, pdftotext 26.10.0, Pillow 13.0.0) e comandos. Os assets testados no SHA final incluem `assets/warranty.js`, `warranty-ui.js`, `finance.js`, `finance-ui.js`, `cancel.js`, `quote.js`, `quote-ui.js`, `portal.js`, `app.js`, `style.css` e `portal.css`.

## Resultados

**1.126 checagens funcionais executadas no código final: 1.121 PASS, 0 FAIL, 5 INFO.**  
**65 mutantes de domínio (64 detectados + 1 equivalente justificado; 0 sobreviventes, 0 inconclusivos) e 1 guarda de handler real verificada.**

| Suíte | Total | PASS | FAIL | INFO |
| --- | ---: | ---: | ---: | ---: |
| 12 suítes Node do GPT (278) | 278 | 278 | 0 | 0 |
| R07-002 domínio (`r07-002-domain.cjs`) | 31 | 30 | 0 | 1 |
| R07-002 negativos isolados (`r07-002-negativos.cjs`) | 38 | 38 | 0 | 0 |
| R07-002 navegador real (`r07-002-browser.cjs`) | 74 | 74 | 0 | 0 |
| R07-002 bordas/axe/teclado (`r07-002-edge.cjs`) | 32 | 32 | 0 | 0 |
| R07-002 impressão (`r07-002-print.cjs`) | 8 | 8 | 0 | 0 |
| R07-002 capturas (`r07-002-capture.cjs`) | 2 | 2 | 0 | 0 (23 PNG) |
| R07-001 regressão navegador | 65 | 65 | 0 | 0 |
| R07-001 regressão negativos | 54 | 54 | 0 | 0 |
| R07-001 regressão bordas/axe | 56 | 56 | 0 | 0 |
| R07-001 regressão impressão | 6 | 6 | 0 | 0 |
| R07-001 handler (solução pendente) | 1 | 1 | 0 | 0 |
| R06-002 handler real | 16 | 16 | 0 | 0 |
| R06-002 negativos | 15 | 15 | 0 | 0 |
| R06-002 navegador | 103 | 102 | 0 | 1 |
| R06-002 bordas | 25 | 25 | 0 | 0 |
| R06-002 axe/teclado | 23 | 23 | 0 | 0 (21 varreduras) |
| R06-002 impressão | 9 | 8 | 0 | 1 |
| R02 / R03 / R04 / R05 | 37 / 118 / 61 / 74 | 37 / 116 / 61 / 74 | 0 | 0 / 2 / 0 / 0 |

A tabela acima soma **1.126 checagens funcionais** (1.121 PASS + 5 INFO). Mutações, contadas à parte:

| Mutação | Total | Detectadas | Equivalentes | Sobreviventes | Inconclusivas |
| --- | ---: | ---: | ---: | ---: | ---: |
| R07-002 (`r07-002-mutacoes.cjs`) | 26 | 26 | 0 | 0 | 0 |
| R07-001 (`r07-mutacoes.cjs`) | 21 | 20 | 1 | 0 | 0 |
| R06-002 (`r06-002/mutacoes.cjs`) | 18 | 18 | 0 | 0 | 0 |
| **Total** | **65** | **64** | **1** | **0** | **0** |

Nenhum mutante foi publicado; cópias apenas em `~/.hermes/cache/scratch/`.

## Cenário normativo (500/200 → parcial 50 → total 150/450)

Fixture fictícia: origem com cobrança de R$ 500,00, recebimento de R$ 200,00 em 25/11, retorno avaliado como `devolucao_valor`.

| Etapa | Cobrança líquida | Recebido líquido | Saldo | Status |
| --- | ---: | ---: | ---: | --- |
| Antes | 500,00 | 200,00 | 300,00 | Parcial |
| Parcial de 50,00 | 450,00 | 150,00 | 300,00 | Parcial |
| Encerramento total (devolve 150, abate 450) | 0,00 | 0,00 | 0,00 | Reembolsado |

- A cobrança original (500), o recebimento original (200) e o recibo #1 permanecem no histórico; o recibo **não** é estornado. `financeLedger` guarda `warranty_refund` #2 (50/50) e #3 (150/450), com `warrantyBaseTotal=50000`.
- Correção em ordem direta (parcial, depois total): após corrigir a parcial → 50/50/0; após corrigir a total → 500/200/300.
- Correção em ordem inversa (total, depois parcial): 450/150/300 → 500/200/300. Os quatro registros permanecem no histórico privado.
- Encerramento total sem dinheiro (500/0): devolve 0, abate 500, status **Encerrado por garantia**; nenhum recibo é inventado; a correção restaura 500/0/500.
- Legado fictício 500/200 sem `billing`: total positivo preservado, sem recibo novo nem obrigação nativa; permanece na lista financeira; a versão de orçamento é preservada.
- Pagamento posterior de 300 após a parcial quita o saldo líquido (450/450); o encerramento posterior devolve 450 e abate 450.
- `BancadaFinance.reverse` fica bloqueado enquanto a devolução está ativa e volta a ser oferecido após a correção (500/0/500). `settle` de cancelamento também recusa crédito de garantia ativo.
- Zero não permite nova cobrança (`formalize`/`billing`/`pay` ausentes ou recusados), não desaparece de `financialList`/`aggregate` e é consistente em painel, A4/cupom, portal e recibo.

Tudo acima foi executado no navegador real (R07B-08..R07B-42, R07B-52b) e no domínio (D01..D09, D16..D18, D29, D30), com estados/JSON/localStorage intactos nos negativos.

## Modal e negativos

- Sem modalidade/forma pré-escolhidas; valor inicial vazio; **total** calculado em centavos a partir do recebido líquido e `readOnly`; prévia dinâmica (`Abatimento`/`Saldo após registro`); confirmação explícita; data ≤ hoje e piso nativo igual ao último evento financeiro da origem (correção `e04bb405`); referência e motivo obrigatórios.
- Negativos isolados com mensagem exata, estado intacto e controle positivo: excesso, total inexato, zero parcial, modo/forma/data inválidos (futura/impossível/anterior ao recibo), referência/motivo vazios ou longos, confirmação ausente, avaliação e chave financeira obsoletas, cobrança própria, entrega, finalização, publicação ativa, solução incorreta/cobertura pendente, correção duplicada/inexistente, estorno bloqueado, acerto bloqueado, nova cobrança/edição após zero, permissões.
- Duas abas reais: devolução com pagamento concorrente na aba B → envio antigo abortado com “Dados alterados em outra aba”, sem lançamento; **correção concorrente** → uma única correção, envio antigo abortado (R07B-52/52b).

## F02

- Retorno sem solução executada e sem derivados: solicitar → retirar → solicitar → conferir → confirmar; origem intocada (R07B-53..55, D19, D23).
- Solução executada (devolução ativa) bloqueia o pedido e a confirmação; após correção de todas as devoluções, o pedido volta a ser aceito (R07B-56/57, D20, N31).
- Pedido pendente + devolução executada: confirmação bloqueada; retirada do pedido continua possível (R07B-58/59, D22, N32).
- Derivados por **origem** ou **anterior**, mesmo cancelados, permanecem bloqueados (R07B-60, D21, N33/N34).
- Cancelar o retorno não altera a obrigação da raiz (R07B-55, D23).

## Raízes independentes

- Duas OS finalizadas da mesma unidade (40) com prazos 90 e 180; retorno finalizado da primeira, vínculo `previous` correto.
- `lastFinalized` filtra pela raiz (`x.origin === (o.origin || o.id)`); a raiz B não enxerga o retorno da A. Link, URL `#retorno/<id>`, `data-origin` e submit da B criam retorno com origem B, anterior B e prazo 180 (R07B-61..65, D24/D25, N35).
- Retorno ativo único por unidade bloqueia entrada concorrente em raiz distinta; reabertura de retorno finalizado com irmão ativo é recusada (D26, N36/N37).

## Permissões (F04) e privacidade

- A matriz exigida está publicada em **`MATRIZ-F04.md`**: `vOs`, `eOs`, `aOs`, `vLancamento`, `reembolsarGarantia`, `estornarRecebimento`, `vCustoInterno`/`eCustoInterno`, com referência ao controller original e ao mapeamento conservador da simulação. O protótipo **não** presume direitos efetivos por nome de perfil.
- Admin registra/corrige (parcial/total) e vê custos; Financeiro consulta valores e não executa (nem por handler direto); Técnico/Atendente não veem R$, comprovante ou motivo financeiro. `warrantySubmit` direto sem permissão lança “Ação indisponível neste perfil.” e não altera o estado (R07B-66..68; `tests/warranty-refund-ui.cjs`).
- Portal, impressão e recibos não contêm `COMPROVANTE`, `MOTIVO`, `JUSTIFICATIVA`, `returnId` ou `ledgerId`; o resumo público mostra apenas total/pago/saldo e o status (Reembolsada/Encerrada por garantia) (R07B-23/69, R07E-P-02, D27, N38; PDFs em `impressos/`).
- No retorno cancelado, o painel de devolução deixa de exibir o histórico (o dado continua em `warranty.operations` e no ledger da origem) — ressalva baixa registrada, sem perda de dados; decisão de UI fica com o GPT.

## Impressão, responsividade e acessibilidade

- A4 e cupom 80 mm da origem parcial (450/150/300), reembolsada (0/0/0, Reembolsado), encerrada sem caixa e recibo original; 6 PDFs reais, texto extraído, sem dados privados (R07P-01..08).
- 320/390/768/1440 sem overflow; modal cabe na viewport e rola; fecha por botão e Escape; foco entra, fica preso no diálogo e retorna ao acionador; valores extremos (9.999.999,99) e motivo de 2.000 caracteres sem overflow (R07E-*).
- axe: **0 violações em 5 varreduras** (garantia 390/1440, modal 390/1440, portal 390) — `testes/axe-r07-002.md`. A varredura legada R06 permanece em `testes/r06-002/`.

## Diferenças em relação ao original (protótipo, não integração)

- O original registra a devolução como lançamento de **despesa** (`lancamentos`, `trifase_financeiro_projecoes`) e recalcula o saldo por `trifaseGarantiaResumo`; o protótipo projeta o crédito/abatimento sobre `total`/`paid` e guarda eventos append-only em `financeLedger` (`warranty_refund`, `warranty_refund_correction`). Os números e as recusas são equivalentes; **não há dinheiro real, banco ou transação de servidor**.
- `financeiroHash` original usa `[total, recebido, saldo, reembolsado, abatimento]`; o protótipo usa uma chave mais estrita que também inclui os eventos do ledger. Continua recusando estado obsoleto.
- O original exige a conjunção de permissões; a simulação usa `settings`/`finance`/`tech` como substitutos conservadores, documentados na matriz F04.
- O original permite revisão de avaliação conforme regras; o protótipo bloqueia revisão com solução executada até correção (paridade com `Trifase_garantia_model::avaliacaoExigida`/resolução executada).
- Data da segunda devolução pode anteceder a primeira no original porque eventos de garantia não são `trifase_financeiro_eventos`; o protótipo reproduz (piso = último evento financeiro, não garantia) — D10.

## Defeitos, correções e adaptações

| # | Origem | Descrição | Tratamento |
| --- | --- | --- | --- |
| 1 | Executor | Piso nativo da data do modal era fixo em 1900, enquanto o handler já recusava data anterior ao último registro financeiro; feedback tardio. | **Corrigido** em `e04bb405` (`warranty-ui.js`): `min` = último evento financeiro (ou 1900 sem ledger); handler revalida. Coberto por R07E-X-05 (piso 25/11) e R07B-05 (1900 sem ledger). |
| 2 | F02 (GPT) | `tests/cancel.cjs` e R06-002 browser esperavam bloqueio genérico de todo retorno. | Adaptação autorizada: #018 passou a positivo (F02); #016 manteve bloqueio com a mensagem nova; controle positivo D19/R07B-53..55. Nenhuma asserção enfraquecida. |
| 3 | Nova UI | Dois anchors de mutação R07-001 apontavam para `!o.total}` e `x.origin&&same(...)`; o código mudou para `hasObligation` e filtro por raiz. | Anchors atualizados no script copiado; as mutações continuam mirando as mesmas guardas e seguem **detectadas** (20 + 1 equivalente). |
| 4 | Revisão independente | Matriz F04 não publicada (médio). | Publicada `MATRIZ-F04.md` com referências e mapeamento. |
| 5 | Revisão independente | Faltava caso de duas abas para **correção** (baixo). | Adicionado R07B-52b; 74/74 no navegador. |
| 6 | Revisão independente | D10 dizia “data anterior” mas usava a mesma data (baixo). | D10 reescrito: segunda devolução em 25/11 (anterior à primeira, 26/11) aceita; 24/11 recusada. |
| 7 | Revisão independente | `axe.md` rotulado R06 no diretório novo (baixo). | Renomeado para `testes/r06-002/axe-R06-regressao.md`; criado `axe-r07-002.md` específico. |
| 8 | Revisão independente | Proveniência com `v5TrifaseTip` hardcoded (baixo). | Script passa a consultar `git ls-remote` e registra a ausência da ref local; tip remoto = `8c256cae`. |
| 9 | Revisão independente | Histórico de devolução oculto no retorno cancelado (baixo). | Registrado como ressalva/limitação; dado preservado no ledger/origem; sem alteração de código nesta rodada. |
| 10 | Revisão independente | Prévia aceita 3 casas e handler recusa (baixo, cosmético). | Registrado; o `step=0.01` e o handler impedem o lançamento. |
| 11 | Revisão independente | `operations.push` sem garantir array em retorno legado (baixo, inalcançável pela UI atual). | Registrado como robustez futura; `create`/`assess` sempre inicializam `operations`. |
| 12 | Revisão independente | IDs de operação e de ledger divergem entre painel e financeiro (baixo). | Registrado para decisão de UI/auditoria; ambos os registros são preservados. |

Nenhum bloqueante de produto foi encontrado pelo executor ou pelo revisor. As adaptações de teste são exclusivamente as justificadas por F02/nova UI e estão documentadas acima.

## Revisão independente

- DeepSeek Flash, contexto novo e somente leitura, em `e04bb405`: **APTO COM RESSALVAS, 0 bloqueantes**. Reexecutou as suítes principais em scratch (278 Node, 54 negativos, 65 browser, 56 edge, 21 mutações R07-001, 18 R06-002, 26 R07-002, 73 browser, 32 edge) e verificou os números. Achados: 1 médio (matriz F04) e 8 baixos, tratados ou registrados na tabela acima.
- Reauditoria das correções de evidência/teste solicitada ao mesmo revisor; parecer em `AUDITORIA-INDEPENDENTE.md`.

## Limitações e riscos

- Protótipo estático: sem autenticação/CSRF, backend, transação, idempotência ou atomicidade de servidor; `localStorage` não é contabilidade. Nenhum dinheiro real, banco ou produção.
- Perfis são simulação conservadora; a matriz F04 é a exigência nativa, não uma prova de autorização real.
- Troca física, substituta e baixa de estoque ficam para R07-003/R08 (não implementadas); custos são declarativos, sem estoque.
- Um único retorno ativo por unidade é mantido; raízes independentes compartilham a unidade e a visão “Atendimentos da unidade”, mas o vínculo/link/submit usam a raiz correta.
- Retorno cancelado não exibe o histórico no painel (dado preservado); prévia com 3 casas é cosmética; IDs operação/ledger divergem na UI; retorno legado sem `operations` não é hardening desta rodada.
- Sem execução do PHP/banco: a paridade é estática contra o SHA de referência.
- Navegador apenas Chromium/Playwright headless; não houve teste em Firefox/Safari nem leitor de tela real.

## F01–F07 (rastreamento até R10)

| Achado | Status nesta rodada |
| --- | --- |
| F01 (finalização com cancelamento pendente) | Resolvido na R06-002; regressão R06 handler 16/16 e browser mantidos. |
| F02 (cancelamento de retorno) | **Resolvido nesta rodada** com evidência (D19–D23, N31–N34, R07B-53..60) e adaptações justificadas. |
| F03 (estoque/IDs) | Fora do escopo; R08. |
| F04 (matriz de permissões) | **Resolvido nesta rodada** com `MATRIZ-F04.md` e testes de perfil/handler; integração real fica para R10. |
| F05 (data futura) | **Resolvido/paritário**: devolução de garantia recusa futuro; cancelamento ordinário permanece como o original (sem regra nova). |
| F06 (mutantes sobreviventes) | Resolvido na R06-002; 18/18 e negativos; R07-001 20+1 e R07-002 26/26. |
| F07 (dívida técnica) | Registrado; consolidação/R10. |

## Conclusão

A R07-002 cumpre o recorte no escopo experimental: devolução parcial/total com abatimento da origem, preservação de cobrança/recibos/histórico, correções compensatórias nas duas ordens, zero dinheiro, legado, F02 e raízes independentes, com permissões conservadoras e sem vazamento privado. O código final `e04bb405` passou 1.126 checagens (1.121 PASS, 5 INFO, 0 FAIL), 65 mutantes classificados e revisão adversarial sem bloqueantes. A aprovação final da rodada pertence ao GPT Supervisor; R07-003/R08 não foram iniciadas.
