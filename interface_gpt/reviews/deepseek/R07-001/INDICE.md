# R07-001 — Índice de evidências

**Candidato inicial:** `91a29b799ded6a436312e6ff53c702d7a640b742`
**Código final testado:** `f46ad182bcb7fb067d68c335369640c82bccba1d` (correções `39a42126`, `42f1733e`, `5ed6e3fc`, `f46ad182`)
**Servidor:** `http://127.0.0.1:8130` — protótipo estático, dados fictícios em `localStorage`.
**Data:** 26/11/2026

## Capturas novas (21 PNG)

| # | Arquivo | Tela/estado | Largura | Dimensões | SHA-256 (12) |
| --- | --- | --- | ---: | --- | --- |
| 1 | `capturas/desktop/01-os18-garantia-1440.png` | Garantia do retorno #018 (avaliação, custo, histórico) | 1440 | 1440×1885 | `7d140af5ec2d` |
| 2 | `capturas/desktop/02-os16-origem-1440.png` | Origem #016 com vínculo ao atendimento anterior | 1440 | 1440×975 | `59178baa2131` |
| 3 | `capturas/desktop/03-retorno20-bloqueado-1440.png` | Segunda entrada bloqueada na origem #020 | 1440 | 1440×900 | `fc4c3e1e40cb` |
| 4 | `capturas/desktop/04-os18-orcamento-1440.png` | Orçamento próprio do retorno #018 | 1440 | 1440×1234 | `18a4d6e9f568` |
| 5 | `capturas/desktop/05-retorno-novo-garantia-1440.png` | Retorno novo #025 sem avaliação (estado vazio) | 1440 | 1440×1473 | `72dd06d30b81` |
| 6 | `capturas/desktop/06-fila-retornos-1440.png` | Lista de OS com a aba/fila de garantia | 1440 | 1440×1174 | `f083353e7a74` |
| 7 | `capturas/desktop/07-fila-retornos-filtrada-1440.png` | Fila “Retornos em avaliação” filtrada | 1440 | 1440×900 | `e56c21223148` |
| 8 | `capturas/desktop/08-modal-avaliacao-1440.png` | Modal de avaliação (cobertura/solução/diagnóstico) | 1440 | 1440×900 | `9e1e91b32631` |
| 9 | `capturas/desktop/09-modal-custo-1440.png` | Modal de custo interno (Admin) | 1440 | 1440×900 | `a599f33000dc` |
| 10 | `capturas/desktop/10-portal-retorno-1440.png` | Portal do orçamento do retorno (link fictício) | 1440 | 1440×1379 | `0a916fa0e0e5` |
| 11 | `capturas/tablet/11-os18-garantia-768.png` | Garantia do retorno #018 | 768 | 768×2312 | `721f92ac94ba` |
| 12 | `capturas/tablet/12-retorno20-bloqueado-768.png` | Entrada bloqueada na origem #020 | 768 | 768×1024 | `56cabb85ec44` |
| 13 | `capturas/mobile/13-os18-garantia-390.png` | Garantia do retorno #018 | 390 | 390×2817 | `418692f083fe` |
| 14 | `capturas/mobile/14-retorno-novo-garantia-390.png` | Retorno novo #025 sem avaliação | 390 | 390×2223 | `fef0c0cd02b2` |
| 15 | `capturas/mobile/15-retorno20-bloqueado-390.png` | Entrada bloqueada na origem #020 | 390 | 390×844 | `d8813810ee5b` |
| 16 | `capturas/mobile/16-os18-orcamento-390.png` | Orçamento do retorno #018 | 390 | 390×2178 | `c688ae6f0f0b` |
| 17 | `capturas/mobile/17-modal-avaliacao-390.png` | Modal de avaliação | 390 | 390×844 | `b5422b47f3bc` |
| 18 | `capturas/mobile/18-modal-custo-390.png` | Modal de custo | 390 | 390×844 | `fffd72b55a74` |
| 19 | `capturas/mobile320/19-os18-garantia-320.png` | Garantia do retorno #018 | 320 | 320×3079 | `0413a8aee5b4` |
| 20 | `capturas/mobile320/20-retorno20-bloqueado-320.png` | Entrada bloqueada na origem #020 | 320 | 320×568 | `864a788f7701` |
| 21 | `capturas/mobile320/21-modal-avaliacao-320.png` | Modal de avaliação | 320 | 320×568 | `ecc61a919fee` |

Manifesto completo com SHA-256 e bytes: `testes/r07-capturas.json`.

## Capturas de regressão R06 (33 PNG)

Reexecutadas em `capturas/desktop|mobile|tablet/` com os mesmos nomes da R06-002; manifesto em `testes/capturas.json` (33 únicas). Delta em `testes/capturas-delta.json`:

- 1 idêntica; 27 com diferença ≤ 1%; 5 entre 1% e 1,634%; 0 mudanças de dimensão.
- As diferenças concentram-se na faixa de abas (nova aba “Garantia” entre “Histórico” e “Cancelamento”), deslocando o conteúdo; nenhum overflow ou mudança de tamanho.

## Testes e resultados (código final)

| Arquivo | Conteúdo |
| --- | --- |
| `testes/r07-browser.cjs` / `r07-browser-resultados.json` | 65 checagens funcionais em navegador real (entrada, avaliação, custos, permissões, orçamento, portal e correção de irmão ativo). |
| `testes/r07-edge.cjs` / `r07-edge-resultados.json` | 56 checagens de 320/390/768/1440, teclado/foco, axe (10 varreduras), textos extremos, portal. |
| `testes/r07-negativos.cjs` / `r07-negativos-resultados.json` | 54 negativos isolados com mensagem exata, estado intacto e controle positivo. |
| `testes/r07-mutacoes.cjs` / `r07-mutacoes-resultados.json` | 21 mutações (20 detectadas + 1 equivalente). |
| `testes/r07-handler-check.cjs` / `r07-handler-solucao*.json` | Guarda de solução pendente no handler real (código e mutante). |
| `testes/r07-print.cjs` / `r07-print-resultados.json` | 6 checagens de impressão A4/cupom. |
| `testes/r07-capture.cjs` / `r07-capturas.json` | 2 checagens + 21 capturas. |
| `testes/handler-tech*.json` | Regressão do handler R06-002 (16/16) e mutante (13/16). |
| `testes/negativos-resultados.json` | Regressão dos 15 negativos R06-002. |
| `testes/mutacoes-resultados.json` | Regressão das 18 mutações R06-002. |
| `testes/browser-resultados.json` | Regressão R06-002 (103 = 102 PASS + 1 INFO). |
| `testes/edge-resultados.json` | Regressão R06-002 (25/25). |
| `testes/a11y-resultados.json` | axe/teclado R06-002 (23/23, 21 varreduras). |
| `testes/print-resultados.json` | Impressão R06-002 (9 = 8 PASS + 1 INFO). |
| `testes/regressao-r02-resultados.json` | R02 37/37. |
| `testes/regressao/regressao-r03/testes/regressao-r03-resultados.json` | R03 118 = 116 PASS + 2 INFO. |
| `testes/regressao-r04-*.json` | R04 44 + 17. |
| `testes/regressao-r05-*.json` | R05 56 + 18. |
| `testes/r07-browser.log`, `r07-edge.log`, `r07-negativos.log`, `r07-mutacoes.log`, `r07-print.log`, `r07-capture.log` | Logs de execução. |

## Impressos

| Arquivo | Conteúdo |
| --- | --- |
| `impressos/retorno-garantia-a4.pdf` | OS de retorno em A4, 1 página, sem dados privados. |
| `impressos/retorno-garantia-cupom.pdf` | Cupom 80 mm, 1 página. |
| `impressos/origem-garantia-a4.pdf` | OS de origem #016 em A4 (regressão). |
| `impressos/os-cancelada-a4.pdf`, `os-cancelada-cupom.pdf`, `os019-cupom.pdf`, `os020-cupom.pdf` | Regressão de impressão R06-002. |
| `recibos/recibo-normal-os20.pdf`, `recibo-estornado-os20.pdf` | Regressão de recibos R05. |
