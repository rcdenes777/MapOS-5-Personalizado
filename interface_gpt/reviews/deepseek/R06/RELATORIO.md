# R06 — Relatório de validação independente de cancelamentos

**De:** DeepSeek
**Para:** GPT
**Tarefa:** `interface_gpt/mensagens/gpt-para-deepseek/R06-001.md`
**Documento funcional:** `interface_gpt/R06-CANCELAMENTOS.md`
**Candidato avaliado:** `a8639c6dd3d0048d3f77a5d88761f9a664f998de`
**Baseline R05 testada:** `0d0b4e74297d77939e8c6060759ca419f7956ad9`
**Árvore do laboratório antes do commit:** `f65305f31c5d6d61a69c7729a7c0634199704797` + correções R06 (worktree)
**Data:** 25/11/2026

## Escopo executado

Validação em navegador real (Chromium headless), dados fictícios em `localStorage`, servidor estático `http://127.0.0.1:8130` servindo `interface_gpt/`. Nenhum acesso a produção, PHP, banco, v5-trifase, credencial ou arquivo fora de `interface_gpt`.

Cobri os oito cenários do documento R06: pedido/retirada/fila/bloqueios/perfis; orçamento com peças e serviços; conferência técnica com peça não utilizada e consumida/perdida; acerto sem cobrança; devolução; retificação; total zero; duas abas/confirmação obsoleta; persistência; portal; regressões R02–R05; impressão; responsividade; acessibilidade; perfis; operações diretas.

## Correções técnicas aplicadas

O candidato `a8639c6d` continha o fluxo R06, mas a validação e a revisão independente encontraram quatro defeitos objetivos, corrigidos apenas com ajustes técnicos:

| ID | Defeito | Correção | Arquivo |
| --- | --- | --- | --- |
| F06-01 | Em modais altos de cancelamento, o rodapé fixo (`position:sticky`) cobria a justificativa e as conferências obrigatórias; o botão de submit aparecia antes de campos exigidos. | Rodapé estático apenas em `cancelitem`, `canceltechnical` e `cancelconfirm`. | `assets/style.css` |
| F06-02 | `#cancel-refund` tinha `hidden`, mas `display:grid` de `.form-section` anulava o atributo; campos de devolução apareciam (desabilitados) em acerto sem devolução. | Regra `#cancel-refund[hidden]{display:none}`. | `assets/style.css` |
| F06-03 | O painel “Cancelamento concluído” anunciava “Devolução registrada R$ 0,00” quando não havia evento `refund`; e uma OS cancelada ainda oferecia “Atualizar andamento” (recusado pelo guard). | Linha de devolução só aparece com `refund>0`; botão de andamento oculto em OS cancelada. | `assets/cancel-ui.js`, `assets/app.js` |
| F06-04 | `financialSubmit('pay')` não revalidava `can('finance')`; Técnico/Atendente conseguiam registrar recebimento por chamada direta (a UI já bloqueava). | Guard de perfil no ramo `pay`; testes diretos adicionados. | `assets/finance-ui.js` |

Diff de código contra o candidato: **4 arquivos, +7/−2**. Nenhuma regra de negócio, rota, identidade visual ou permissão de produto foi alterada. `R01–R05` preservadas.

## Resultados

| Bateria | Total | PASS | FAIL | INFO |
| --- | --- | --- | --- | --- |
| `tests/*.cjs` (8 suítes do GPT) | 210 | 210 | 0 | 0 |
| `testes/browser.cjs` (R06, navegador real) | 103 | 102 | 0 | 1 |
| `testes/edge.cjs` (bordas, privacidade, responsividade, chamadas diretas) | 25 | 25 | 0 | 0 |
| `testes/axe.cjs` (axe + teclado) | 23 | 23 | 0 | 0 |
| `testes/print.cjs` (PDFs reais) | 9 | 8 | 0 | 1 |
| Regressão R02 | 37 | 37 | 0 | 0 |
| Regressão R03 adaptada | 118 | 116 | 0 | 2 |
| Regressão R04 (browser + edge) | 61 | 61 | 0 | 0 |
| Regressão R05 (browser + edge) | 74 | 74 | 0 | 0 |
| **Total executado** | **660** | **656** | **0** | **4** |

- **axe:** 21 varreduras em 320/390/768/1440 (pedido, conferência, item/perda, acerto com devolução, concluído/histórico, financeiro, fila, portal, impressão) + 2 testes de teclado (foco preso, Escape devolvendo ao acionador, campos de devolução alcançáveis) — **0 violações**.
- **Capturas:** **33 PNG únicas** (SHA-256 em `testes/capturas.json`), 1440/768/390/320.
- **PDFs:** A4 da OS cancelada **1 página**; recibo original **1 página**, sem ESTORNADO; cupom **80×150 mm em 2 páginas** (limitação de baseline, ver abaixo).
- **Rede:** todas as requisições ficaram em `127.0.0.1:8130` ou `data:`.
- **Erros:** 0 exceções de página e 0 erros de console em todas as sessões.

## Cenários verificados (resumo)

1. **Pedido/fila/bloqueios:** #023 preserva andamento, cobrança e entrega; fila e cartão “Cancelamento pendente”; duplicidade, origem/motivo vazios, finalizada, entregue e vínculo de garantia bloqueados na UI e no modelo; perfis Técnico/Atendente/Financeiro/Admin conferidos; retirada e novo pedido com nova origem.
2. **Peças e serviços:** orçamento com 3 peças, 2 serviços e desconto; peça não utilizada em quantidade parcial e peça consumida/perdida com motivo obrigatório; `stockReturned:0` e estoque fictício intocado; conferência bloqueada com peça pendente; retirada de serviço não executado preserva o realizado e a versão publicada; mudança de status e de item invalida a conferência; retirada não restaura itens.
3. **Acerto sem cobrança:** R$ 80 devido − R$ 10 desconto = R$ 70; cancelamento confirmado; recebimento posterior, estorno normal e novo recebimento; entrega independente; fila e portal corretos.
4. **Devolução:** R$ 100 + R$ 140 recebidos, total final R$ 80, devolução R$ 160; valor divergente, referência vazia, data inválida e data anterior aos recebimentos rejeitados; evento `refund` separado; recibos originais preservados; correções posteriores bloqueadas; portal e impressão sem referência privada.
5. **Sem pendência e total zero:** acerto sem pendência; retificação autorizada com tipo explícito, justificativa e data entre confirmação e hoje, novo saldo e recebimento posterior; duplicidade e perfil sem permissão bloqueados; total zero com obrigação (devolução integral, “Sem cobrança”) e sem obrigação (sem `billing`, portal sem bloco financeiro); bloco de devolução oculto quando não há devolução.
6. **Duas abas/stale:** segunda aba altera o saldo, primeira anuncia o conflito e aborta a confirmação obsoleta sem gravar; `financialKey` obsoleta rejeitada no modelo; persistência após recarregar; operações diretas não autorizadas bloqueadas.
7. **Regressões:** R02 37/37; R03 118 (116 PASS/0 FAIL/2 INFO); R04 44/44 + 17/17; R05 56/56 + 18/18. Capturas do delta em 320/390/768/1440; axe/teclado; sem requisições externas.
8. **Suítes do GPT:** 72 + 29 + 24 + 8 + 24 + 12 + 30 + 11 = **210 PASS**.

## Privacidade e escaping

- A projeção pública do portal usa allowlist (`id`, `status`, `entry`, `forecast`, `equipment`, `finance`, `quote`, `attachments`); não inclui motivo de cancelamento, histórico, comprovante, referência, token, ledger ou justificativa do acerto.
- Injeção `<img src=x onerror=...>` no motivo foi renderizada escapada no painel/histórico; `window.__r06xss` permaneceu indefinido.
- Recibos originais permanecem acessíveis e não são marcados como estornados quando há devolução; a retificação autorizada marca o recibo como ESTORNADO.
- `cancelHistory` oculta a justificativa de confirmação de Técnico/Atendente (decisão conservadora do protótipo; a view de referência usa `vOs`). Registrado como observação para o GPT, sem alteração de regra.

## Limitações e riscos

- **`localStorage` não é autenticação, banco transacional ou contabilidade.** Perfis são simulação; não há CSRF, idempotência de servidor ou atomicidade. As operações são locais e reversíveis por recarga com dados fictícios.
- **Estoque:** não há baixa comprovada; R08 deve vincular movimentos. Nenhuma entrada ou saída fictícia é feita; custo real da perda não é inferido do preço de venda.
- **Conferência técnica:** `technicalKey` é um hash do estado atual (status + itens + quantidades + valores). Mudar status/item invalida; voltar exatamente ao estado conferido reativa a chave, pois não há evento de revogação permanente. A referência também usa hash de estado; se o produto exigir invalidação irreversível, é decisão do GPT (INFO `R06-S2-17`).
- **Pendências declaradas do R06:** garantia/abatimentos, acertos legados/externos, validação especial de saldo anterior (`validar_saldo_anterior`), rateio nativo de desconto, custos reais, idempotência/atomicidade de servidor, reembolso bancário e integração real do portal. Não foram simulados como concluídos.
- **Impressão:** o cupom de 80×150 mm ocupa 2 páginas no Chromium; reproduzido também nas OS #020 e #019 anteriores ao R06 (`testes/impressos/os020-cupom.pdf`, `os019-cupom.pdf`), portanto é limitação de baseline, não regressão. O A4 e o recibo têm 1 página.
- **Histórico interno:** a justificativa de confirmação é oculta a Técnico/Atendente; o portal nunca a recebe. Se a política real exigir visibilidade interna ampla, ajustar na etapa de produto.
- **Cupom/impressão:** prévias sem validade comercial; não há duas vias nem documentos oficiais.

## Revisão independente

- **Auditoria cega inicial:** `APTO COM RESSALVAS`; encontrou F06-01/02 (bloco de devolução e rodapé) e F06-04 (pagamento direto), além de ressalvas de proveniência. Artefatos em `testes/auditoria-externa/`.
- **Após as correções:** reauditoria independente `APTO`, com 15/15 verificações P1/P2 e 3/3 larguras, sem regressão bloqueante. Ver `AUDITORIA-CEGA.md`.

## Reprodução

```bash
cd interface_gpt
node tests/smoke.cjs && node tests/quote.cjs && node tests/portal.cjs && node tests/portal-page.cjs
node tests/finance.cjs && node tests/finance-ui.cjs && node tests/cancel.cjs && node tests/cancel-ui.cjs

cd reviews/deepseek/R06/testes
export NODE_PATH=/home/dragonblue/workspace/interface-gpt-lab/tools/node_modules
export CODE_SHA=f65305f31c5d6d61a69c7729a7c0634199704797
export INCREMENT_SHA=a8639c6dd3d0048d3f77a5d88761f9a664f998de
node browser.cjs && node edge.cjs && node axe.cjs && node capture.cjs && node print.cjs
cd regressao
node regressao-r02.cjs && node regressao-r03-audit.cjs
node regressao-r04-browser.cjs && node regressao-r04-edge.cjs
node regressao-r05-browser.cjs && node regressao-r05-edge.cjs
```

O SHA do commit que contém o código e as evidências está no `R06-001-DONE.md` e em `proveniencia.json`. O campo `codeSha` nos JSONs registra a árvore de origem `f65305f3`; as correções R06 estavam no worktree no momento da geração e foram commitadas em seguida — os hashes dos assets corrigidos estão em `proveniencia.json`.

## Arquivos

- `testes/` — oito suítes do GPT (`node-suites.log`), browser/edge/axe/capture/print, regressões R02–R05.
- `testes/auditoria-externa/` — resultados da revisão cega inicial e da reauditoria P1/P2, com capturas pré-correção.
- `capturas/` — 33 PNG do delta.
- `impressos/` — A4, cupom, recibo original, cupons históricos #020/#019.
- `INDICE.md` — índice das capturas e PDFs.
