# Índice de evidências visuais — R05

**Total do delta R05:** **37 PNG únicas** — 15 desktop, 19 celular, 3 tablet; **0 duplicatas por SHA-256**. O pacote contém ainda 8 PNG auxiliares da regressão R03 em `testes/regressao-r03/desktop/`.
**Impressão:** 2 PDFs do recibo #023 em [`recibos/`](recibos/); os PDFs #020 ficam como auxiliares (`*-os20.pdf`).
**Todos os dados são fictícios** e vivem em `localStorage`; não há informação de cliente real.

## Desktop — 1440

| Arquivo | Estado |
| --- | --- |
| [`central-1440.png`](desktop/central-1440.png) | Central com vencida, vencendo hoje e futura |
| [`central-valor-extremo-1440.png`](desktop/central-valor-extremo-1440.png) | Valor extremo sem overflow |
| [`os20-legado-1440.png`](desktop/os20-legado-1440.png) | Valor anterior da OS #020, sem recibo fictício |
| [`os23-parcial-1440.png`](desktop/os23-parcial-1440.png) | OS #023 com recebimento parcial |
| [`os23-quitado-1440.png`](desktop/os23-quitado-1440.png) | OS #023 quitada |
| [`os23-estornado-1440.png`](desktop/os23-estornado-1440.png) | Estorno com original preservado, após F05-01 |
| [`os23-recomposto-1440.png`](desktop/os23-recomposto-1440.png) | Saldo recomposto após novo recebimento |
| [`pagamento-1440.png`](desktop/pagamento-1440.png) | Modal de pagamento |
| [`estorno-1440.png`](desktop/estorno-1440.png) | Modal de estorno |
| [`recibo-normal-1440.png`](desktop/recibo-normal-1440.png) | Recibo normal |
| [`recibo-estornado-1440.png`](desktop/recibo-estornado-1440.png) | Recibo marcado ESTORNADO |
| [`portal-parcial-1440.png`](desktop/portal-parcial-1440.png) | Portal com saldo parcial e condições agrupadas |
| [`portal-recomposto-1440.png`](desktop/portal-recomposto-1440.png) | Portal quitado após recomposição |
| [`orcamento-refinamentos-1440.png`](desktop/orcamento-refinamentos-1440.png) | Espaçamento e hierarquia do orçamento |
| [`00-antes-gap-resumo-1440.png`](desktop/00-antes-gap-resumo-1440.png) | **Antes** de F05-01: vão no resumo |

## Celular — 390 e 320

| Arquivo | Estado |
| --- | --- |
| [`central-390.png`](mobile/central-390.png) | Central em 390 |
| [`central-320.png`](mobile/central-320.png) | Central em 320 |
| [`central-valor-extremo-320.png`](mobile/central-valor-extremo-320.png) | Valor extremo após F05-02 |
| [`00-antes-valor-extremo-320.png`](mobile/00-antes-valor-extremo-320.png) | **Antes** de F05-02: valor quebrado |
| [`os20-legado-390.png`](mobile/os20-legado-390.png) | Legado da OS #020 em 390 |
| [`os20-legado-320.png`](mobile/os20-legado-320.png) | Legado da OS #020 em 320 |
| [`os23-parcial-390.png`](mobile/os23-parcial-390.png) | OS #023 parcial/estornada em 390 |
| [`os23-recomposto-390.png`](mobile/os23-recomposto-390.png) | OS #023 recomposta em 390 |
| [`os23-recomposto-320.png`](mobile/os23-recomposto-320.png) | OS #023 recomposta em 320 |
| [`pagamento-390.png`](mobile/pagamento-390.png) | Modal de pagamento em 390 |
| [`estorno-390.png`](mobile/estorno-390.png) | Modal de estorno em 390 |
| [`estorno-320.png`](mobile/estorno-320.png) | Modal de estorno em 320 |
| [`estorno-motivo-500-390.png`](mobile/estorno-motivo-500-390.png) | Justificativa de 500 caracteres |
| [`recibo-normal-390.png`](mobile/recibo-normal-390.png) | Recibo normal em 390 |
| [`recibo-estornado-390.png`](mobile/recibo-estornado-390.png) | Recibo estornado em 390 |
| [`portal-parcial-390.png`](mobile/portal-parcial-390.png) | Portal parcial em 390 |
| [`portal-recomposto-390.png`](mobile/portal-recomposto-390.png) | Portal quitado em 390 |
| [`portal-recomposto-320.png`](mobile/portal-recomposto-320.png) | Portal quitado em 320 |
| [`orcamento-refinamentos-390.png`](mobile/orcamento-refinamentos-390.png) | Refinamentos do orçamento em 390 |

## Tablet — 768

| Arquivo | Estado |
| --- | --- |
| [`central-768.png`](tablet/central-768.png) | Central |
| [`os20-legado-768.png`](tablet/os20-legado-768.png) | Valor anterior |
| [`os23-recomposto-768.png`](tablet/os23-recomposto-768.png) | OS #023 recomposta |

## Impressão

| Arquivo | Estado |
| --- | --- |
| [`recibos/recibo-normal.pdf`](recibos/recibo-normal.pdf) | Recibo #023 normal em A4 |
| [`recibos/recibo-estornado.pdf`](recibos/recibo-estornado.pdf) | Recibo #023 ESTORNADO em A4 |

## Critérios

- Capturas focadas no delta R05; telas R04 inalteradas não foram repetidas em massa.
- Cada captura foi feita após o estado correspondente; o “antes” é a árvore `0d0b4e74` antes da correção CSS, mantendo o arquivo para comparação.
- A contagem e a ausência de duplicatas foram verificadas por SHA-256; ver [`testes/README.md`](testes/README.md).
