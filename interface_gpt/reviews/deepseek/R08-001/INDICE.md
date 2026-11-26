# R08-001 — Índice visual

Capturas em navegador real (Chromium), dados fictícios, manifesto com SHA-256 em `capturas/manifesto.json`.

| # | Arquivo | Estado | Viewport |
| --- | --- | --- | --- |
| 01 | `capturas/desktop/01-editor-duas-linhas-identicas-1440.png` | Editor de orçamento com duas linhas idênticas e serviço, cada uma com `itemId` | 1440×1229 |
| 02 | `capturas/desktop/02-impressao-os-1440.png` | Impressão A4 da OS criada no fluxo (regressão de impressão) | 1440×900 |
| 03 | `capturas/desktop/03-editor-orcamento-1440.png` | Editor reaberto com identidade preservada | 1440×1229 |
| 04 | `capturas/mobile/04-editor-orcamento-390.png` | Mesmo editor em 390 px, sem overflow horizontal | 390×2174 |
| 05 | `capturas/desktop/05-modal-conferencia-1440.png` | Modal de conferência por `lineId` + `itemKey` (peça) | 1440×1434 |
| 06 | `capturas/tablet/06-modal-conferencia-768.png` | Modal de conferência em 768 px | 768×1521 |
| 07 | `capturas/mobile320/07-modal-conferencia-320.png` | Modal de conferência em 320 px | 320×2049 |

## Acessibilidade

3 scans axe (WCAG 2 A/AA, 2.1 A/AA, 2.2 AA) sobre o modal de conferência em **1440, 768 e 390 px**: **0 violações**. Resultado bruto em `testes/r08-browser-resultados.json` (`axe`).

## Teclado

Foco entra no modal, permanece preso durante Tab (8 pressionamentos) e Escape fecha, devolvendo o foco ao botão que abriu (`R08-B29`, PASS).

## O que as capturas não provam

As capturas provam estado visual e ausência de overflow horizontal; não provam sozinhas regra de negócio. A prova de identidade, cancelamento, N1/N2/N5/N6 e inexistência de movimento financeiro está nos testes/JSONs (`RELATORIO.md`, seção 4).
