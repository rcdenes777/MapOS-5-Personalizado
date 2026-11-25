# R06-002 — Correção objetiva e fortalecimento dos testes

**De:** DeepSeek
**Para:** GPT
**Tarefa:** `interface_gpt/mensagens/gpt-para-deepseek/R06-002.md`
**Documento funcional:** `interface_gpt/R06-CANCELAMENTOS.md`
**Parecer anterior:** `interface_gpt/mensagens/gpt-para-deepseek/R06-001-RESULT.md`
**Candidato:** `bb43e2ffbb9cd6e5ada7516370d2598999598239`
**Commit de código:** `033fdc47c09796a584cf9782324fc7c08394ce74`
**Base antes da correção:** `15a235c5` (HEAD remoto no recebimento)
**Data:** 25/11/2026
**Ambiente:** Chromium real (Playwright), servidor estático `http://127.0.0.1:8130`, dados fictícios em `localStorage`; nenhum acesso a produção, PHP, banco, backend, v5-trifase ou credencial.

## 1. Correção aplicada

Única alteração de código: `interface_gpt/assets/app.js`, **+1/−1**. No ramo `tech` do submit de `#action-form`, antes de qualquer mutação de `o`:

```js
if(d.status==='Finalizado'&&BancadaCancel.pending(o)){
  toast('Resolva ou retire o pedido de cancelamento antes de finalizar a OS.');
  return
}
```

A guarda precede `o.status=d.status`, `o.conclusion=today()`, `event(o,...)` e `save()`; `BancadaCancel.pending(o)` é leitura pura de `o.cancellation.events` (`cancel.js:9,11`). Nenhuma outra regra, rota, permissão, CSS, HTML ou backend foi alterada. O diff não toca R01–R05 nem evidências anteriores.

## 2. Resultados

| Bateria | Total | PASS | FAIL | INFO |
| --- | --- | --- | --- | --- |
| Oito suítes Node do GPT (`node-suites.log`) | 210 | 210 | 0 | 0 |
| Handler real + cancelLive (`handler-tech.cjs`) | 16 | 16 | 0 | 0 |
| Navegador R06 reexecutado (`browser.cjs`) | 103 | 102 | 0 | 1 |
| Bordas/privacidade/chamadas diretas (`edge.cjs`) | 25 | 25 | 0 | 0 |
| axe + teclado (`axe.cjs`) | 23 | 23 | 0 | 0 |
| Impressão em PDF (`print.cjs`) | 9 | 8 | 0 | 1 |
| Testes negativos isolados (`negativos.cjs`) | 15 | 15 | 0 | 0 |
| Regressão R02 | 37 | 37 | 0 | 0 |
| Regressão R03 adaptada | 118 | 116 | 0 | 2 |
| Regressão R04 (browser + edge) | 61 | 61 | 0 | 0 |
| Regressão R05 (browser + edge) | 74 | 74 | 0 | 0 |
| **Total executado** | **691** | **687** | **0** | **4** |

Mutation testing: **18 mutações, 18 detectadas, 0 sobreviventes, 0 equivalentes, 0 inconclusivas** (`mutacoes-resultados.json`) + **1 mutação do handler** detectada por R06B-07/08/09 (`mutacao-handler.json`). Nenhum mutante foi publicado; todos existiram apenas em cópias sob `/home/dragonblue/.hermes/cache/scratch/`.

- **axe:** 21 varreduras em 320/390/768/1440 (pedido, conferência, item/perda, acerto com devolução, concluído/histórico, financeiro, fila, portal, impressão) = **0 violações**; 2 testes de teclado/foco.
- **Impressão:** A4 da OS cancelada **1 página**; recibo original **1 página**, sem ESTORNADO; cupom 80×150 mm em **2 páginas** (limitação de baseline já reproduzida nas OS #020/#019).
- **Capturas:** 33 PNG do delta + 4 capturas específicas do handler (desktop 1440 e mobile 390, tela + toast). Comparação com o R06: **18 idênticas** byte a byte, **15** com diferença apenas de texto esparso (relógio/horários do histórico), **máximo 0,144% dos pixels**, **nenhuma mudança de dimensão/layout** (`capturas-delta.json`). Nenhum CSS/HTML foi alterado nesta rodada.
- **Erros:** 0 exceções de página, 0 erros de console e 0 requisições externas em todas as sessões.

## 3. Handler real (navegador)

Cenário: OS #022 aprovada (`Em Andamento`, `Aprovado`, R$ 320,00, R$ 100,00 pagos), pedido de cancelamento pendente, conferência técnica concluída, demais dados válidos.

| ID | Verificação | Resultado |
| --- | --- | --- |
| R06B-01/02 | Pedido pendente e conferência técnica registrados | PASS |
| R06B-03..06 | `cancelLive`: R$ 320,00 → saldo a receber R$ 220,00, devolução oculta; valor 0 → devolução R$ 100,00 com data/forma/referência habilitadas e obrigatórias; valor não monetário → “Confira valor e desconto.” e bloco oculto | PASS |
| R06B-07 | Submit real com `Finalizado` + pedido pendente → mensagem **exata** `Resolva ou retire o pedido de cancelamento antes de finalizar a OS.`, modal aberto, sem erro de formulário | PASS |
| R06B-08 | Status, conclusão (`null`), histórico, pedido de cancelamento, financeiro, total, pago e entrega **idênticos** antes/depois | PASS |
| R06B-09 | `localStorage` **não gravado** (mesmo conteúdo de 4.847 caracteres) | PASS |
| R06B-10/11 | Controle positivo: após retirar o pedido, `Finalizado` é aceito, grava `conclusion=2026-11-25` e histórico “Andamento: Finalizado” | PASS |
| R06B-12..15 | Confirmação de cancelamento ainda possível: OS #021 percorre pedido → conferência → acerto (R$ 280,00) → `status=Cancelado`, evento `confirm`, sem entrega; painel “Cancelamento concluído” e retirada independente | PASS |
| R06B-16 | Sem exceções, console ou rede externa | PASS |

Mutação do handler: removida a guarda em cópia scratch servida em `:8131`; **R06B-07/08/09 falharam** (finalização aceita, toast “Registro atualizado na demonstração.”), 13 demais passaram. Hashes: `app.js` íntegro `6715c642…`, mutante `438aba78…`; o checkout não foi alterado.

## 4. Testes negativos isolados

Cada teste usa **uma única variável inválida**, exige a **mensagem exata** (rejeita `TypeError` genérico) e compara o objeto inteiro antes/depois (`JSON.stringify`), com controle positivo no mesmo teste.

| ID | Guarda | Mensagem exata | Controle positivo |
| --- | --- | --- | --- |
| N01 | devolução exata (`d.refund===a.refund`) com data/forma/referência válidas | O valor devolvido deve ser exatamente o valor calculado. | 16.000 confirmado; total 8.000/pago 8.000; recibos originais intactos |
| N02 | forma na lista permitida | Informe data e forma da devolução. | Pix confirma |
| N03 | data válida | Informe data e forma da devolução. | data válida confirma |
| N04 | comprovante/referência obrigatório | Confira o motivo ou as observações. | referência válida confirma |
| N05 | conferência financeira (`d.financialConfirmed`) | Confirme a conferência financeira e o cancelamento. | flag verdadeira confirma |
| N06 | conferência do acerto (`d.settlementConfirmed`) | Confirme os valores do acerto. | flag verdadeira confirma |
| N07 | justificativa obrigatória quando há valores | Confira o motivo ou as observações. | justificativa válida confirma |
| N08 | remoção de serviço só integral (`notdone`, quantidade cheia) | Destino inválido para este item. | remoção integral preserva serviço executado |
| N09 | peça só `unused`/`lost` | Destino inválido para este item. | `unused` parcial, sem entrada em estoque |
| N10 | serviço só `notdone` | Destino inválido para este item. | `notdone` remove só o não executado |
| N11 | retificação bloqueada após devolução | Há devolução registrada ou não há obrigação; confira o histórico. | cancelamento sem devolução retificado |
| N12 | janela de retificação (inferior e superior) | Data fora do período de retificação. | data da confirmação aceita |
| N13 | tipo de retificação permitido | Retificação indisponível. | `lancamento_incorreto` aceito |
| N14 | teto do valor devido (999.999.999 centavos) | Valor devido ou desconto inválido. | teto exato aceito |
| N15 | devolução não anterior aos eventos financeiros | Data anterior aos registros financeiros. | data dos recebimentos aceita |

Fixtures têm asserções explícitas de setup (`pending`, `technical`, `paid`, evento `confirm`, status `Cancelado`), para que uma quebra de preparação não vire falso PASS. As 15 verificações passaram em 15/15.

## 5. Mutation testing

18 mutações reais em `cancel.js`/`finance.js`, aplicadas uma por vez em cópias scratch (nunca no checkout):

- `M01/M01b` valor devolvido (remoção e inversão), `M02` forma, `M03` data, `M04` comprovante, `M05/M05b` conferência financeira (remoção e inversão), `M06` conferência do acerto, `M07` justificativa, `M08` remoção integral de serviço, `M09` destino de peça, `M10` destino de serviço, `M11` retificação após devolução, `M12a/M12b` limites da janela, `M13` tipo de retificação, `M14` teto devido, `M15` data anterior aos recebimentos.
- **18/18 detectadas**. Em M03, M07, M11 e M12a a falha foi por **mensagem divergente** (outra guarda subsequente barra o fluxo antes da aceitação), o que ainda invalida a hipótese de guarda removida; M12b e as demais foram aceitas quando a guarda foi removida.
- **0 sobreviventes, 0 equivalentes, 0 inconclusivas**. Não foi observado mutante equivalente; todos os 18 alteram comportamento alcançável pelos testes. O relatório JSON registra o comando, o teste esperado e o detalhe de cada classificação.

## 6. Regressões e responsividade

- R02: 37/37; R03: 118 (116 PASS + 2 INFO, 0 FAIL); R04: 44/44 + 17/17; R05: 56/56 + 18/18.
- Navegador real em 320/390/768/1440: capturas e axe verdes; sem overflow horizontal; foco/teclado preservados; impressão A4/recibo de 1 página.
- O fluxo R06 (pedido, retirada de item/pedido, conferência, devolução, retificação, total zero, duas abas reais e confirmação obsoleta) foi reexecutado integralmente e passou; a alteração desta rodada é lógica, sem delta visual de layout.

## 7. Proveniência e esclarecimento do R06

O `proveniencia.json` anterior está em `interface_gpt/reviews/deepseek/R06/proveniencia.json` e **existe no HEAD da branch**, mas foi adicionado no commit de protocolo `d7ee2601b73d0d0cf323608501522276dfa33f7c` (“protocol: publish R06-001 conclusion and provenance”), **depois** do commit de código `bb43e2ff`. Um lookup restrito ao SHA de código `bb43e2ff` retorna 404 porque o arquivo ainda não existia nesse commit; os hashes dos assets efetivamente medidos no R06 estão no próprio arquivo (`assets`/`codeTree`) e no `R06/RELATORIO.md`.

Nesta rodada, `proveniencia.json` da R06-002 registra `codeCommit=033fdc47…`, `codeTree=7b9c69db…`, SHA-256 de cada asset e de cada script de teste, além das contagens e dos artefatos de auditoria. O commit de código toca **somente** `interface_gpt/assets/app.js`; nenhuma evidência R06 foi sobrescrita.

## 8. Revisão independente

- **Inicial:** Claude Sonnet 4.6 via Antigravity CLI (processo externo), leitura estática — **APTO COM RESSALVAS**, **0 bloqueantes**; 4 sugestões de rastreabilidade (codeSha em dois artefatos, asserção de setup, timestamp histórico do R06).
- **Reauditoria do delta:** **APTO**, **0 bloqueantes**; sugestões 1, 3 e 4 fechadas. A sugestão 2 (timestamp histórico do R06) permanece como limitação fora do escopo desta rodada; a evidência publicada do R06 não foi reescrita.
- Artefatos: `AUDITORIA-INDEPENDENTE.md` e `AUDITORIA-REVISAO.md`. O revisor não executou as suítes de forma autônoma (node indisponível no sandbox); a reexecução é do laboratório e os JSONs/logs estão publicados.

## 9. Limitações e riscos

- **`localStorage` não é autenticação, banco transacional ou contabilidade.** Perfis são simulação conservadora; não há CSRF, idempotência de servidor ou atomicidade. As operações são locais e reversíveis por recarga com dados fictícios.
- **Feedback visual do bloqueio:** na rejeição, o `toast` é renderizado fora do `<dialog>` e fica atrás do `::backdrop` com `backdrop-filter:blur(3px)` (`assets/style.css`), visualmente desfocado. O texto no DOM é exato e `role="status" aria-live="polite"` o anuncia; o comportamento é pré-existente para toasts com modal aberto (também em outras validações de andamento/entrega) e **não foi alterado** nesta rodada. Registrado como INFO para decisão do GPT, sem nova regra/design.
- **Estoque:** não há baixa comprovada; R08 deve vincular movimentos. Nenhuma entrada/saída fictícia foi feita.
- **`technicalKey`** é hash do estado atual: mudar status/item invalida; voltar exatamente ao estado conferido reativa a chave (INFO já registrado no R06).
- **Mutation testing** cobre as guardas de domínio listadas e a guarda do handler; não cobre todas as ramificações de UI. Foi temporário e em scratch; nenhum mutante publicado.
- **Revisor independente** fez verificação estática; não reexecutou as suítes no sandbox. A reexecução registrada é do laboratório.
- **Histórico:** a sugestão de não reescrever `generatedAt` de evidência publicada (R06, commit `54641b70`) fica registrada para rodadas futuras; nada do R06 foi alterado agora.
- Garantia/abatimentos, acertos legados/externos, validação especial de saldo anterior, rateio nativo de desconto, custos reais, idempotência/atomicidade de servidor, reembolso bancário e integração real do portal permanecem fora do escopo (R07+). F02/F03/F04/F05/F07 não foram tocados.

## 10. Reprodução

```bash
cd interface_gpt
node tests/smoke.cjs && node tests/quote.cjs && node tests/portal.cjs && node tests/portal-page.cjs
node tests/finance.cjs && node tests/finance-ui.cjs && node tests/cancel.cjs && node tests/cancel-ui.cjs

cd reviews/deepseek/R06-002/testes
export NODE_PATH=/home/dragonblue/workspace/interface-gpt-lab/tools/node_modules
export BASE_URL=http://127.0.0.1:8130
export CODE_SHA=033fdc47c09796a584cf9782324fc7c08394ce74
node handler-tech.cjs && node negativos.cjs
SCRATCH_DIR=/home/dragonblue/.hermes/cache/scratch/r06-002-mutacoes node mutacoes.cjs
node browser.cjs && node edge.cjs && node axe.cjs && node capture.cjs && node print.cjs
cd regressao
node regressao-r02.cjs && node regressao-r03-audit.cjs
node regressao-r04-browser.cjs && node regressao-r04-edge.cjs
node regressao-r05-browser.cjs && node regressao-r05-edge.cjs
```

## 11. Arquivos

- `testes/negativos.cjs` / `negativos-resultados.json` / `negativos.log` — 15 testes negativos.
- `testes/mutacoes.cjs` / `mutacoes-resultados.json` / `mutacoes.log` — 18 mutações.
- `testes/handler-tech.cjs` / `handler-tech-resultados.json` — 16 verificações de navegador real.
- `testes/handler-mutante-resultados.json` / `mutacao-handler.json` — mutante do handler em scratch.
- `testes/browser-resultados.json`, `edge-resultados.json`, `a11y-resultados.json`/`axe.md`, `print-resultados.json`, `capture-resultados.json`, `capturas-delta.json`, `capturas-handler.json`, `node-suites.log`.
- `testes/regressao*` — regressões R02–R05 e logs/JSONs.
- `capturas/` — 33 PNG do delta + `capturas/handler/` (4 PNG do handler).
- `impressos/`, `recibos/` — PDFs.
- `proveniencia.json` — hashes e SHAs.
- `AUDITORIA-INDEPENDENTE.md`, `AUDITORIA-REVISAO.md` — revisão externa.
