# R07-003 — Índice visual

Capturas reais em Chromium (Playwright), dados fictícios, viewports 1440/768/390/320. Manifesto completo com SHA-256 em `testes/r07-003-capturas.json`.

As capturas 06–11 e 16–18 foram geradas **depois** da troca de estoque real (P-002 3→2, operação `troca`), com asserções R07C3-03/04 no próprio script (não apenas contagem de arquivos).

| Arquivo | Conteúdo | Viewport | Bytes | SHA-256 (início) |
| --- | --- | ---: | ---: | --- |
| `capturas/desktop/01-os18-garantia-avaliacao-troca-1440.png` | Retorno #018 avaliado como troca; painel sem execução automática. | 1440 | 211595 | `239d37e80305c28f…` |
| `capturas/mobile/13-os18-garantia-avaliacao-troca-390.png` | Garantia #018 em 390px. | 390 | 175221 | `a62979df7fa2781e…` |
| `capturas/desktop/02-modal-troca-vazio-1440.png` | Modal de troca sem origem/destino pré-selecionados. | 1440 | 243692 | `cabd29a6722fdaab…` |
| `capturas/mobile/14-modal-troca-vazio-390.png` | Modal de troca em 390px. | 390 | 155928 | `0d2f5b0e31e2d074…` |
| `capturas/mobile320/19-modal-troca-vazio-320.png` | Modal de troca em 320px (rolagem). | 320 | 167858 | `589c050ec65cab5c…` |
| `capturas/desktop/03-modal-troca-preenchido-1440.png` | Troca externa preenchida (substituta, selo, destino, motivo, custo). | 1440 | 246853 | `3fa3fd011f435839…` |
| `capturas/desktop/04-modal-troca-erro-selo-1440.png` | Erro de selo duplicado normalizado, sem gravar. | 1440 | 250621 | `40f0015790cb81af…` |
| `capturas/mobile/15-modal-troca-erro-selo-390.png` | Erro de selo em 390px. | 390 | 156006 | `a003eefff0eb7156…` |
| `capturas/desktop/05-modal-troca-estoque-1440.png` | Origem estoque: produto e campos condicionais. | 1440 | 246855 | `089f5db71b1dfcb1…` |
| `capturas/desktop/06-garantia-substituicao-registrada-1440.png` | Painel após a troca real de estoque: substituta, destino, motivo e custo (Admin). | 1440 | 241889 | `0077354e9da2e6bc…` |
| `capturas/mobile/16-garantia-substituicao-registrada-390.png` | Troca registrada em 390px. | 390 | 199129 | `45c0a7f5fef5918c…` |
| `capturas/desktop/07-estoque-apos-baixa-1440.png` | Estoque após a baixa de 1 unidade (P-002 3→2). | 1440 | 81729 | `2a1d4af206621ceb…` |
| `capturas/desktop/08-origem-link-retorno-ativo-1440.png` | Origem #016 com conclusão/prazo preservados e link para o retorno #018. | 1440 | 134242 | `74f0ccd8359c0390…` |
| `capturas/desktop/09-impressao-substituta-a4-1440.png` | Impressão A4 do retorno com a substituta (rótulo único). | 1440 | 108965 | `ae612020a3763c18…` |
| `capturas/tablet/21-impressao-substituta-a4-768.png` | Impressão A4 em 768px. | 768 | 75540 | `e0e774795c5944bf…` |
| `capturas/desktop/10-portal-substituta-1440.png` | Portal público: marca/modelo da substituta, sem dados privados. | 1440 | 62099 | `ce16b65337805409…` |
| `capturas/mobile/17-portal-substituta-390.png` | Portal da substituta em 390px. | 390 | 54259 | `f6d45207b34bbe46…` |
| `capturas/desktop/11-retorno-substituto-form-1440.png` | Formulário de retorno posterior apontando para #018. | 1440 | 97472 | `5249aa15cd2b1253…` |
| `capturas/mobile/18-retorno-substituto-form-390.png` | Retorno da substituta em 390px. | 390 | 57093 | `26f3a3ac94071d1d…` |
| `capturas/desktop/12-garantia-sem-troca-1440.png` | Solução reparo: sem ação de troca. | 1440 | 191627 | `993fb452e58f0166…` |

Total: 20 PNG (4 PASS no script de captura). Nenhuma captura contém dados reais.
