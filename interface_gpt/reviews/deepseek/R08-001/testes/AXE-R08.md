# R08-001 — axe (acessibilidade automatizada)

**Alvo:** modal de conferência de item do cancelamento (`modal:cancelitem`), com identidade `lineId`/`itemKey`.
**Regras:** `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa` (axe-core, Chromium headless).

| Viewport | Violações |
| --- | --- |
| 1440 | 0 |
| 768 | 0 |
| 390 | 0 |

Resultado bruto (inclui `target` e `failureSummary` por nó, quando houver): `r08-browser-resultados.json`, chave `axe`.

## Limites

- axe cobre apenas violações detectáveis automaticamente; não substitui teste manual de teclado/foco.
- O teste de teclado `R08-B29` (foco preso no modal + Escape devolve o foco) foi executado separadamente e passou.
- Não foram escaneadas todas as telas do protótipo nesta rodada; o foco foi a superfície alterada (editor e conferência). O arquivo `axe.md` desta pasta é a varredura R06-002 (21 estados, 0 violações), preservada como regressão.
