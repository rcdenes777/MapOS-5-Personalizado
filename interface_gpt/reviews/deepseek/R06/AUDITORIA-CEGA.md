# Auditoria independente — R06

**Papel:** revisor independente (subagente cego), sem acesso às conclusões do executor antes da própria bateria. Não alterou o repositório, não fez commit/push e não tocou produção, backend, banco ou v5-trifase.

## Primeira auditoria

Veredito inicial: **APTO COM RESSALVAS**.

O revisor reexecutou as oito suítes Node (210 PASS), escreveu bateria própria em navegador real (`redteam-domain.cjs` 85 verificações; `redteam-ui.cjs` 21), inspecionou capturas/PDFs/hashes e confrontou o contrato R06. Encontrou dois defeitos objetivos:

### P1 — Bloco de devolução visível sem devolução (média)

- `#cancel-refund` nasce com `hidden`, mas `.form-section{display:grid}` vence o `[hidden]` do navegador. Em 320/390/768/1440 o bloco permanecia com `display:grid` e altura 411–452 px, com campos desabilitados, mesmo quando o cálculo dizia “Sem valores a acertar”.
- O painel “Cancelamento concluído” também exibia “Devolução registrada R$ 0,00” sem evento `refund`.
- Evidência pré-correção: `testes/auditoria-externa/probe-hidden-320.png`, `probe-hidden-1440.png`, `rt-1440-done-norefund.png`; resultado `redteam-ui-resultados.json` (FAIL).
- Sem efeito financeiro (campos desabilitados), mas informação enganosa e modal mais alto.

### P2 — Pagamento direto sem perfil (média/baixa)

- `financialSubmit('pay')` validava valor e chamava `BancadaFinance.receive`, mas não revalidava `can('finance')`; a UI já bloqueava em `openModal`/submit, porém a chamada direta de Técnico/Atendente gravava recebimento no ledger.
- Reprodução registrada em `redteam-domain-resultados.json` (FAIL). Impacto restrito ao protótipo (sem autenticação real), mas incoerente com a matriz simulada e com o cenário 6.

## Correções e reauditoria

| Achado | Correção aplicada | Verificação independente |
| --- | --- | --- |
| P1 | `#cancel-refund[hidden]{display:none}`; linha de devolução só com `refund>0`; “Atualizar andamento” oculto em cancelada | `display:none`, altura 0 em 320/390/768/1440; bloco visível com devolução real; painel sem a linha falsa — `p1-widths-resultados.json` 3/3 e `p1p2-resultados.json` 15/15 |
| P2 | Guard `can('finance')` no ramo `pay` | Financeiro/Admin recebem; Técnico/Atendente rejeitados sem alterar ledger; `openModal('pay')` não abre — `p1p2-resultados.json` |
| F06-01 (rodapé) | Rodapé estático nos três modais altos | revisor confirmou que o último checkbox não é coberto e o submit fica após as conferências |
| F06-03 (andamento) | Botão oculto em OS cancelada | revisor confirmou presente em OS ativa e ausente em cancelada nas quatro larguras |

**Reauditoria final: APTO.** O revisor reexecutou as oito suítes (210 PASS), uma cópia independente de `browser.cjs` (103 = 102 PASS + 1 INFO), `edge.cjs` (25), `axe.cjs` (23 PASS, 21 varreduras, 0 violações), `print.cjs` (9 = 8 PASS + 1 INFO) e as regressões R02–R05 (290 verificações; 0 FAIL). Confirmou 33 capturas únicas com SHA-256, PDFs A4/recibo de 1 página, cupom de 2 páginas também em #020/#019, e que o delta ficou restrito a `interface_gpt` (4 assets, +7/−2).

## Ressalvas finais (não bloqueantes)

- **Proveniência:** os JSONs registram `codeSha=f65305f3` (árvore de origem) e foram gerados com as correções ainda no worktree; o commit e os hashes dos assets estão em `proveniencia.json` e no `R06-001-DONE.md`.
- **`technicalKey`:** a conferência é vinculada ao estado atual; mudar e voltar exatamente ao mesmo estado reativa a chave. Comportamento informado como INFO `R06-S2-17`; se o produto exigir invalidação permanente, é decisão do GPT.
- **Visibilidade interna:** `cancelHistory` oculta a justificativa de confirmação de Técnico/Atendente; o portal nunca a recebe. Registrado para decisão de produto; não altera o fluxo financeiro.
- **Cupom 80×150 mm:** 2 páginas no Chromium também nas OS #020/#019 anteriores ao R06; limitação de baseline, não regressão.

## Artefatos

- `testes/auditoria-externa/redteam-domain-resultados.json` — 85 verificações da primeira auditoria (82 PASS, 1 FAIL [P2], 2 INFO).
- `testes/auditoria-externa/redteam-ui-resultados.json` — 21 verificações (20 PASS, 1 FAIL [P1]).
- `testes/auditoria-externa/p1p2-resultados.json` — 15/15 PASS após correções.
- `testes/auditoria-externa/p1-widths-resultados.json` — 3/3 PASS após correções.
- `testes/auditoria-externa/probe-hidden-320.png`, `probe-hidden-1440.png`, `rt-1440-done-norefund.png` — evidência pré-correção dos achados.
- Scripts do revisor: `redteam-domain.cjs`, `redteam-ui.cjs`, `p1p2-check.cjs`, `p1-widths.cjs` (executáveis em scratch; não alteram o protótipo).
