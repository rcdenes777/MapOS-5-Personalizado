# Testes da R05

**Árvore testada:** `0d0b4e74297d77939e8c6060759ca419f7956ad9`
**Incremento:** `f3bbf1bd6d7269fa6a977d83116a82d5886edd83`
**Servidor:** `http://127.0.0.1:8130` (estático, dados em `localStorage`)
**Dependências:** `playwright-core` e `axe-core` em `interface-gpt-lab/tools/node_modules`; Chromium local.

## Comandos

```bash
cd interface_gpt
node tests/smoke.cjs
node tests/quote.cjs
node tests/portal.cjs
node tests/portal-page.cjs
node tests/finance.cjs
node tests/finance-ui.cjs

cd reviews/deepseek/R05/testes
export CODE_SHA=0d0b4e74297d77939e8c6060759ca419f7956ad9
export INCREMENT_SHA=f3bbf1bd6d7269fa6a977d83116a82d5886edd83
export NODE_PATH=/home/dragonblue/workspace/interface-gpt-lab/tools/node_modules

node browser.cjs          # 56/56
node edge.cjs             # 18/18
node axe.cjs              # 16 varreduras, 0 violações; 3/3 teclado
node capture.cjs          # 37 PNG + 2 PDFs
node regressao-r04-browser.cjs  # 44/44
node regressao-r04-edge.cjs     # 17/17
node regressao-r02.cjs          # 37/37
node regressao-r03-audit.cjs    # 118 (116/0/2)
```

## Resultados

| Arquivo | Total | PASS | FAIL | INFO |
| --- | --- | --- | --- | --- |
| `browser-resultados.json` | 56 | 56 | 0 | 0 |
| `edge-resultados.json` | 18 | 18 | 0 | 0 |
| `a11y-resultados.json` | 16 varreduras + 3 teclado | 19 | 0 | 0 |
| `regressao-r04-browser-resultados.json` | 44 | 44 | 0 | 0 |
| `regressao-r04-edge-resultados.json` | 17 | 17 | 0 | 0 |
| `regressao-r02-resultados.json` | 37 | 37 | 0 | 0 |
| `testes/regressao-r03/testes/regressao-r03-resultados.json` | 118 | 116 | 0 | 2 |

As seis suítes do GPT foram executadas diretamente em `interface_gpt/`:

| Suíte | Saída |
| --- | --- |
| `smoke.cjs` | 72 combinações |
| `quote.cjs` | 29 checks |
| `portal.cjs` | 24 checks |
| `portal-page.cjs` | 8 checks |
| `finance.cjs` | 24 checks |
| `finance-ui.cjs` | 12 checks |

## Evidências geradas

- `browser-resultados.json` — fluxos de 56 verificações, incluindo OS #023, estorno, legado, perfis e duas abas.
- `edge-resultados.json` — 18 bordas de valores, datas, justificativa, duplicidade, cancelamento e impressão.
- `axe.md` / `a11y-resultados.json` — 16 varreduras e a sequência de teclado do estorno.
- `capture.cjs` / `capturas.json` — 37 PNG do delta R05; ver [`../INDICE.md`](../INDICE.md). A regressão R03 acrescenta 8 capturas auxiliares em `regressao-r03/desktop/`.
- `recibos/recibo-normal.pdf` e `recibos/recibo-estornado.pdf` (OS #023); `*-os20.pdf` são os auxiliares da borda #020.
- `proveniencia.json` — incremento, árvore servida, hashes dos assets e diff CSS.
- `regressao-r03/` — cópia independente da auditoria R03; não sobrescreve `reviews/deepseek/R03`.

## Observações de execução

- As capturas foram feitas após as correções CSS; os arquivos `00-antes-*` preservam o estado anterior.
- O script `capture.cjs` usa o mesmo servidor e dados fictícios; não há chamadas externas.
- Os scripts de regressão são cópias com nomes de saída próprios. As pastas R01–R04 permanecem intocadas.
- O `INFO` `L07` da auditoria R03 é o teste de valor extremo; o `INFO` de fluxo é limite de entrega já declarado.

## Limites

- axe não substitui leitor de tela real; teclado cobre o modal de estorno e o portal.
- `localStorage` não é banco transacional, autenticação ou contabilidade.
- Os PDFs são prévias sem validade comercial.
- A R03 histórica ainda contém scripts que usam `publicresponse`; a R04/R05 usam a página do cliente.
