# Testes da R06-002

**Código testado:** `033fdc47c09796a584cf9782324fc7c08394ce74` (correção em `interface_gpt/assets/app.js`, +1/−1 sobre `15a235c5`).
**Candidato:** `bb43e2ffbb9cd6e5ada7516370d2598999598239`.
**Servidor:** `http://127.0.0.1:8130` (estático, dados em `localStorage`).
**Dependências:** `playwright-core`, `axe-core` e Chromium 1248 em `~/.cache/ms-playwright`; `pdftotext`/`pdfinfo`; Node do sistema.
**Data:** 25/11/2026.

## Comandos principais

```bash
cd interface_gpt
node tests/smoke.cjs && node tests/quote.cjs && node tests/portal.cjs && node tests/portal-page.cjs
node tests/finance.cjs && node tests/finance-ui.cjs && node tests/cancel.cjs && node tests/cancel-ui.cjs

cd reviews/deepseek/R06-002/testes
export NODE_PATH=/home/dragonblue/workspace/interface-gpt-lab/tools/node_modules
export BASE_URL=http://127.0.0.1:8130
export CODE_SHA=033fdc47c09796a584cf9782324fc7c08394ce74

node handler-tech.cjs        # handler real + cancelLive + confirmação ainda possível
node negativos.cjs          # 15 testes negativos com mensagem/estado/controle positivo
SCRATCH_DIR=/home/dragonblue/.hermes/cache/scratch/r06-002-mutacoes node mutacoes.cjs
node captura-handler.cjs    # capturas desktop/mobile do bloqueio
node browser.cjs && node edge.cjs && node axe.cjs && node capture.cjs && node print.cjs

cd regressao
node regressao-r02.cjs && node regressao-r03-audit.cjs
node regressao-r04-browser.cjs && node regressao-r04-edge.cjs
node regressao-r05-browser.cjs && node regressao-r05-edge.cjs
```

## Resultados

| Arquivo | Total | PASS | FAIL | INFO |
| --- | --- | --- | --- | --- |
| `handler-tech-resultados.json` | 16 | 16 | 0 | 0 |
| `negativos-resultados.json` | 15 | 15 | 0 | 0 |
| `browser-resultados.json` | 103 | 102 | 0 | 1 |
| `edge-resultados.json` | 25 | 25 | 0 | 0 |
| `a11y-resultados.json` | 23 | 23 | 0 | 0 |
| `print-resultados.json` | 9 | 8 | 0 | 1 |
| `regressao-r02-resultados.json` | 37 | 37 | 0 | 0 |
| `regressao/regressao-r03/testes/regressao-r03-resultados.json` | 118 | 116 | 0 | 2 |
| `regressao-r04-browser-resultados.json` / `regressao-r04-edge-resultados.json` | 61 | 61 | 0 | 0 |
| `regressao-r05-browser-resultados.json` / `regressao-r05-edge-resultados.json` | 74 | 74 | 0 | 0 |

Oito suítes do GPT: **210 PASS**. Mutações: **18/18 detectadas, 0 sobreviventes** (`mutacoes-resultados.json`) + mutante do handler detectado em `mutacao-handler.json`.

## Observações

- Os JSONs gravam `codeSha=033fdc47…`; os hashes SHA-256 dos assets e scripts estão em `../proveniencia.json`.
- `capturas-delta.json` compara as 33 capturas novas com o R06: 18 idênticas, 15 com diferença apenas de texto (relógio/horários), máximo 0,144% dos pixels, nenhuma mudança de dimensão.
- `handler-mutante-resultados.json` refere-se à execução contra a cópia mutada em scratch (porta 8131); não é o resultado do código entregue.
- O `toast` do bloqueio fica sob o `::backdrop` com blur do `<dialog>` (comportamento pré-existente); o texto no DOM é exato e `aria-live` o anuncia. Ver limitação no `../RELATORIO.md`.
- Nenhum mutante foi publicado; as cópias mutadas ficam somente sob `~/.hermes/cache/scratch/`.
