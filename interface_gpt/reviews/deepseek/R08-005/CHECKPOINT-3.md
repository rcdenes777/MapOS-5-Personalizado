# R08-005 — checkpoint 3 (não aprovado)

Código experimental ainda não entregue: `cancel.js` SHA-256 `9a6159d927b92f78a76688b4680280062297d7887f8fc909c270d402979637f3`; diff `experimento-v2.diff`. A investigação independente está em `AUDITORIA-PRELIMINAR.md` (DeepSeek Flash; não é revisão final).

## Execuções adicionais no experimento v2

- Regressões de browser R02: 37 PASS; R03: 116 PASS + 2 INFO; R04: browser 44, bordas 17; R05: browser 56, bordas 18.
- R06: browser 102 PASS + 1 INFO; bordas 25; axe 23 verificações/21 scans; impressão 8 PASS + 1 INFO; handler técnico 16; negativos de domínio 15.
- R07: browser 65; bordas 56; negativos 54; impressão 6; handler verificado. R07-002: browser 74, domínio 30 PASS + 1 INFO, negativos 38, bordas 32, impressão 8. R07-003: browser 64, domínio 33, bordas 30, impressão 5. R08-001 domínio 35, UI 4, N6 browser 8.
- Cada execução e resultado está em `testes/log-*.txt` e nos JSONs correspondentes. Os artefatos de R08-002 e R08-004 continuam intactos. O resultado de domínio R08-001 do checkpoint anterior também foi restaurado; v2 está em `r08-domain-resultados-v2.json`.
- Duas tentativas iniciais não são PASS: R03 não conseguiu gravar resultado porque o diretório de saída não existia (evidência `log-regressao-regressao-r03-audit.cjs.txt`); criou-se o diretório e repetiu-se com sucesso. R06 browser usava a data UTC para calcular ontem e confundiu-a com o dia local após 21h (26/11 local versus 27/11 UTC), causando rejeição esperada incorreta e falhas em cascata; alteraram-se exclusivamente as duas datas do teste copiado para `ago(1)`, a mesma convenção local da aplicação, sem modificar asserções. Falha original e repetição estão registradas separadamente.
- Browser específico de estoque (`testes/estoque-browser.cjs`): 16 PASS, oito capturas distintas, incluindo criação com saldo zero, entrada, vínculo, FormData de ID, cancelamento parcial e controle de estoque, três perfis negados no handler, quatro larguras e axe em 390px. Código efetivamente servido estava na versão v2. Não prova todos os cenários exigidos nem autenticação de servidor.

## Pendente

Mutações direcionadas de todas as regras F03, regressões selecionadas de mutação R08-001, teste completo de cenários de estoque e portal/documentos, estados responsivos e teclado específicos, validação final do código e evidências, revisão independente final e publicação de resultado. Não se declara fechamento F03, autorização de produção ou aprovação pelo executor.
