# Testes da R06

**Árvore de origem:** `f65305f31c5d6d61a69c7729a7c0634199704797` (candidato R06 `a8639c6d`) + correções técnicas R06 no worktree (commit registrado em `../R06-001-DONE.md`).
**Servidor:** `http://127.0.0.1:8130` (estático, dados em `localStorage`).
**Dependências:** `playwright-core` e `axe-core` em `interface-gpt-lab/tools/node_modules`; Chromium em `~/.cache/ms-playwright/chromium-1248/`; `pdftotext`/`pdfinfo`.
**Data:** 25/11/2026.

## Comandos

```bash
cd interface_gpt
node tests/smoke.cjs
node tests/quote.cjs
node tests/portal.cjs
node tests/portal-page.cjs
node tests/finance.cjs
node tests/finance-ui.cjs
node tests/cancel.cjs
node tests/cancel-ui.cjs

cd reviews/deepseek/R06/testes
export NODE_PATH=/home/dragonblue/workspace/interface-gpt-lab/tools/node_modules
export CODE_SHA=f65305f31c5d6d61a69c7729a7c0634199704797
export INCREMENT_SHA=a8639c6dd3d0048d3f77a5d88761f9a664f998de
node browser.cjs
node edge.cjs
node axe.cjs
node capture.cjs
node print.cjs

cd regressao
mkdir -p regressao-r03/testes
node regressao-r02.cjs
node regressao-r03-audit.cjs
node regressao-r04-browser.cjs
node regressao-r04-edge.cjs
node regressao-r05-browser.cjs
node regressao-r05-edge.cjs
```

## Resultados

| Arquivo | Total | PASS | FAIL | INFO |
| --- | --- | --- | --- | --- |
| `browser-resultados.json` | 103 | 102 | 0 | 1 |
| `edge-resultados.json` | 25 | 25 | 0 | 0 |
| `a11y-resultados.json` | 23 | 23 | 0 | 0 |
| `print-resultados.json` | 9 | 8 | 0 | 1 |
| `regressao-r02-resultados.json` | 37 | 37 | 0 | 0 |
| `regressao/regressao-r03/testes/regressao-r03-resultados.json` | 118 | 116 | 0 | 2 |
| `regressao-r04-browser-resultados.json` | 44 | 44 | 0 | 0 |
| `regressao-r04-edge-resultados.json` | 17 | 17 | 0 | 0 |
| `regressao-r05-browser-resultados.json` | 56 | 56 | 0 | 0 |
| `regressao-r05-edge-resultados.json` | 18 | 18 | 0 | 0 |

As oito suítes do GPT somam **210 PASS** (`node-suites.log`).

## Evidências

- `capturas.json` — 33 PNG, 33 hashes únicos, 0 duplicatas; índice em `../INDICE.md`.
- `a11y-resultados.json` / `axe.md` — 21 varreduras axe + 2 testes de teclado.
- `impressos/` — A4, cupom, recibo original, cupons históricos #020/#019; `print-resultados.json`.
- `proveniencia.json` — SHAs/hashes dos assets e do commit.
- `auditoria-externa/` — primeira auditoria e reauditoria independentes.

## Observações de execução

- `goto()` fecha qualquer `<dialog>` aberto antes de navegar, para não herdar modal de uma falha anterior; isso não altera o protótipo.
- O `codeSha` gravado nos JSONs é a árvore de origem `f65305f3`; as quatro correções R06 estavam no worktree e foram commitadas em seguida. O hash de cada asset corrigido está em `proveniencia.json`.
- As capturas são `fullPage`; o cabeçalho fixo e a navegação inferior podem aparecer no meio do quadro. Overflows são medidos por `scrollWidth`/`clientWidth`, não pela imagem.
- O cupom de 80×150 mm ocupa 2 páginas; confirmado também em #020/#019 antes do R06.
