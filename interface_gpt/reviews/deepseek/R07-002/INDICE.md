# R07-002 — Índice de evidências

**Candidato inicial:** `b1dfff0197d81f2ad4cd7a570f5476cd0aa6fc8d`  
**Código final testado:** `e04bb4059282197a0ce98e10d1715379433b5084` (candidato + correção `e04bb405`)  
**Servidor:** `http://127.0.0.1:8130` — protótipo estático, dados fictícios em `localStorage`.  
**Data:** 26/11/2026.

## Capturas novas (23 PNG)

| # | Arquivo | Largura | Dimensões | SHA-256 (12) | Bytes |
| --- | --- | ---: | --- | --- | ---: |
| 1 | `capturas/desktop/01-os18-garantia-1440.png` | 1440 | 1440×1962 | `114947628d38` | 234293 |
| 2 | `capturas/mobile/13-os18-garantia-390.png` | 390 | 390×2898 | `dc9f5d186a8d` | 194442 |
| 3 | `capturas/desktop/02-modal-devolucao-vazio-1440.png` | 1440 | 1440×1953 | `85aa68aaf844` | 265231 |
| 4 | `capturas/mobile/14-modal-devolucao-vazio-390.png` | 390 | 390×2826 | `b4708ff64be1` | 174967 |
| 5 | `capturas/desktop/03-modal-devolucao-total-1440.png` | 1440 | 1440×1953 | `4baf73b85a87` | 268971 |
| 6 | `capturas/mobile/15-modal-devolucao-total-390.png` | 390 | 390×2826 | `f0ea4d97a949` | 178306 |
| 7 | `capturas/mobile320/16-modal-devolucao-total-320.png` | 320 | 320×3158 | `7d921f0b4223` | 190348 |
| 8 | `capturas/desktop/04-financeiro-parcial-1440.png` | 1440 | 1440×926 | `6cf97a5b6a2f` | 157434 |
| 9 | `capturas/mobile/17-financeiro-parcial-390.png` | 390 | 390×1777 | `4607414fba6b` | 124727 |
| 10 | `capturas/desktop/05-modal-correcao-1440.png` | 1440 | 1440×2262 | `b0f175fc396d` | 297102 |
| 11 | `capturas/desktop/06-financeiro-reembolsado-1440.png` | 1440 | 1440×1127 | `5b6c823efba7` | 174065 |
| 12 | `capturas/mobile/18-financeiro-reembolsado-390.png` | 390 | 390×2007 | `7616b253638a` | 139223 |
| 13 | `capturas/tablet/19-financeiro-reembolsado-768.png` | 768 | 768×1765 | `39f989782029` | 137039 |
| 14 | `capturas/desktop/07-lista-financeira-1440.png` | 1440 | 1440×1832 | `3388f5bba10d` | 228055 |
| 15 | `capturas/mobile320/20-lista-financeira-320.png` | 320 | 320×2955 | `d16d4ae2e294` | 187553 |
| 16 | `capturas/desktop/08-impressao-reembolsado-1440.png` | 1440 | 1440×900 | `3bd9ab35c545` | 100538 |
| 17 | `capturas/desktop/09-portal-reembolsada-1440.png` | 1440 | 1440×1381 | `2e0158b21298` | 118814 |
| 18 | `capturas/mobile/20-portal-reembolsada-390.png` | 390 | 390×1502 | `41124529a306` | 106915 |
| 19 | `capturas/desktop/10-modal-erro-excesso-1440.png` | 1440 | 1440×1953 | `519ad4627e3a` | 276506 |
| 20 | `capturas/mobile320/21-modal-erro-excesso-320.png` | 320 | 320×3158 | `174989dcdf19` | 182839 |
| 21 | `capturas/desktop/11-cancelamento-f02-elegivel-1440.png` | 1440 | 1440×900 | `a0592a858e15` | 103878 |
| 22 | `capturas/desktop/12-raiz-b-garantia-1440.png` | 1440 | 1440×900 | `09cf0bfafa65` | 129557 |
| 23 | `capturas/tablet/22-raiz-b-garantia-768.png` | 768 | 768×1155 | `707d4c58e176` | 95673 |

Manifesto completo com SHA-256 e bytes: `testes/r07-002-capturas.json`.

**Delta contra a R07-001:** duas capturas homônimas (`01-os18-garantia-1440`, `13-os18-garantia-390`) mudaram de dimensão (+81 px em ambas) pela substituição do aviso genérico pelo painel real de devolução; nenhuma comparação de pixels é possível sem recorte. Detalhe em `testes/capturas-delta.json`.

## Testes e resultados (código final)

| Arquivo | Conteúdo |
| --- | --- |
| `testes/r07-002-domain.cjs` / `r07-002-domain-resultados.json` | 30 PASS + 1 INFO: cenário 500/200, correções nas duas ordens, zero, legado, pagamento posterior, F02, raízes, extremos. |
| `testes/r07-002-browser.cjs` / `r07-002-browser-resultados.json` | 74 checagens em navegador real; inclui duas abas de devolução e correção. |
| `testes/r07-002-negativos.cjs` / `r07-002-negativos-resultados.json` | 38 negativos isolados com mensagem exata, estado intacto e positivo. |
| `testes/r07-002-edge.cjs` / `r07-002-edge-resultados.json` | 32 checagens de 320/390/768/1440, teclado/foco, valores extremos, modal e 5 varreduras axe. |
| `testes/r07-002-print.cjs` / `r07-002-print-resultados.json` | 8 checagens de impressão; PDFs em `impressos/`. |
| `testes/r07-002-capture.cjs` / `r07-002-capturas.json` | 2 checagens + 23 capturas. |
| `testes/r07-002-mutacoes.cjs` / `r07-002-mutacoes-resultados.json` | 26 mutações, 26 detectadas, 0 sobreviventes. |
| `testes/r07-browser.cjs` / `r07-browser-resultados.json` | Regressão R07-001: 65/65. |
| `testes/r07-negativos.cjs` / `r07-negativos-resultados.json` | Regressão R07-001: 54/54. |
| `testes/r07-edge.cjs` / `r07-edge-resultados.json` | Regressão R07-001: 56/56. |
| `testes/r07-print.cjs` / `r07-print-resultados.json` | Regressão R07-001: 6/6. |
| `testes/r07-mutacoes.cjs` / `r07-mutacoes-resultados.json` | Regressão R07-001: 20 detectadas + 1 equivalente. |
| `testes/r07-handler-check.cjs` / `r07-handler-solucao.json` | Guarda de solução pendente no handler real. |
| `testes/r06-002/*` | Regressão R06-002: handler 16/16, negativos 15/15, mutações 18/18, navegador 103, bordas 25, axe 23, impressão 9. |
| `testes/regressao/*` | R02 37/37; R03 118 (116+2 INFO); R04 61/61; R05 74/74. |
| `testes/axe-r07-002.md` | 0 violações em 5 varreduras da garantia/modal/portal. |

## Impressos (6 PDFs)

`impressos/origem-parcial-a4.pdf`, `origem-parcial-cupom.pdf`, `retorno-a4.pdf`, `origem-reembolsada-a4.pdf`, `recibo-original.pdf`, `origem-encerrada-cupom.pdf`.

## Outros documentos

- `RELATORIO.md` — narrativa técnica completa, diferenças vs. original, limitações e rastreamento F01–F07.
- `RESUMO.md` — síntese para decisão.
- `MATRIZ-F04.md` — matriz de capacidades nativas × simulação.
- `AUDITORIA-INDEPENDENTE.md` — parecer adversarial e reauditoria.
- `proveniencia.json` — SHAs/hashes de assets, suítes e evidências.
