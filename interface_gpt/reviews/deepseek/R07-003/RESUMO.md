# R07-003 — Resumo

**Status:** APTO COM RESSALVAS no escopo experimental (revisão independente em `AUDITORIA-INDEPENDENTE.md`; 0 bloqueantes).

**Candidato:** `b619ceb8fe27b56df8aeac4fbb7c9e46d99a61f8`
**Código final testado:** `cc738622436d3df1224df700916970570eb0bd40` (candidato + correção do vínculo do retorno ativo após a troca)
**Referência funcional:** `8c256cae4ddaeefad68922abddbb8addfe37c99d` (`v5-trifase` intacta)

## Números

- **1.288 checagens funcionais: 1.283 PASS, 0 FAIL, 5 INFO.**
- **91 mutantes: 90 detectados, 1 equivalente, 0 sobreviventes, 0 inconclusivos.**
- **20 capturas** reais (1440/768/390/320), **4 PDFs novos** (A4/cupom do retorno substituto, A4 da origem preservada, recibo original) + PDFs de regressão preservados em `impressos/regressao-*`.
- 14 suítes Node do GPT: **306/306**.

## O que foi provado

- Troca externa e de estoque; baixa exata de **1** unidade; custo conhecido/zero/ausente/desconhecido; sem cobrança no retorno.
- Substituta distinta, entrada original byte a byte, destino da antiga, motivo e custo privados; portal só com marca/modelo.
- Linhagem entre raiz, troca e retorno posterior; segunda troca em sequência; IDs de OS/unidade coincidentes; raízes independentes sem mistura; unidade antiga não reutilizável por URL/handler.
- Bloqueios: avaliação obsoleta, solução incorreta, cobrança própria, entrega, conclusão, publicação ativa, outro atendimento aberto, troca repetida, reembolso ativo, cancelamento.
- Ressalvas R07-002: histórico em retorno cancelado, prévia decimal, operações legadas, vínculos de evento/ledger.
- Correção `a35b6749`: a origem volta a apontar para o retorno em andamento (#018) enquanto a substituta não conclui.

## Limitações

Protótipo estático, sem backend/transação/autenticação; estoque fictício; PHP/banco comparados apenas estaticamente; navegador apenas Chromium headless. F03/R08 e F07/R10 pendentes. Homologação final é humana.
