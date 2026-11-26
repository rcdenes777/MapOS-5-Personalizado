# R08-001 — Resumo

**Status:** concluído no escopo experimental; **APTO COM RESSALVAS** (0 bloqueantes após correções e três rodadas de revisão independente).
**Código final testado:** `dd0175eff11f9758ba430a37052af0f12bafe997` (tree `ee7a91bbebb01cb08081b04d9d97db04ea952728`).
**Candidato inicial:** `3a2a80c8abf436414528d2061f68652942da6ac4`; corretivo intermediário `93dc628d`.
**Referência funcional:** `8c256cae4ddaeefad68922abddbb8addfe37c99d` (intacta); base R07-003 `cc738622`.

## Números (código final)

- 16 suítes do projeto: **327 checagens, 0 falhas**.
- Laboratório R08: domínio **35/35**, UI **4/4**, N6 navegador **8/8**, browser **40/40** (3 scans axe, 0 violações).
- Mutações R08: **25/25 detectadas**, 0 sobreviventes, 0 inconclusivas.
- Regressões R02–R07-003: R06-002 (103 browser + 15 negativos + 25 bordas + 18/18 mutações + 23 axe + impressão + 16 handler), R07 (65/54/56/21/6), R07-002 (74/31/38/32/26/8), R07-003 (64/33/30/26/5) — todas verdes.

## Defeitos encontrados e corrigidos

1. **N6** — bloqueio de selo duplicado era contornável com `mode='later'`/omitido → guarda passou a valer para todo modo não-`existing`.
2. **Conferência técnica** — segunda conferência do mesmo pedido era aceita → rejeitada com mensagem exata.
3. **N2** — rota direta `#retorno/:id` não identificava retorno de outra origem → texto/link explícitos.
4. **Chave financeira** — não incluía pedido/OS → passou a incluir ambos; acerto obsoleto entre pedidos/OS é rejeitado.

## Evidências

- Relatório: `RELATORIO.md`; matriz: `MATRIZ-F03.md`; auditoria: `AUDITORIA-INDEPENDENTE.md`; índice visual: `INDICE.md`.
- Máquina: `proveniencia.json`, `testes/*.json`, `capturas/manifesto.json`.
- Correções de código: `93dc628d` (N6/conferência/N2) e `dd0175ef` (OS na chave financeira).

## Limitações principais

Protótipo estático (sem fronteira de servidor); F03 só fecha após R08-002 (produto/linha e estoque); `mode='existing'` e N2 com dados legados duplicados ficam para R10; devolução com data futura é dívida pré-existente de R06; browser não cobre o modal `cancelconfirm`. A aprovação final é do GPT Supervisor; homologação humana.
