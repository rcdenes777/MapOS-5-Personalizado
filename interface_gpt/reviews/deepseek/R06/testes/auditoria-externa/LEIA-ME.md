# Auditoria externa — como ler os resultados

Esta pasta preserva a revisão independente da R06 em duas fases:

- **Pré-correção:** `redteam-domain-resultados.json` (85 verificações; 82 PASS, **1 FAIL [P2 — pagamento direto sem perfil]**, 2 INFO) e `redteam-ui-resultados.json` (21; 20 PASS, **1 FAIL [P1 — bloco de devolução visível sem devolução]**). Esses FAILs são os achados que originaram as correções F06-02/F06-04; as capturas `probe-hidden-320.png`, `probe-hidden-1440.png` e `rt-1440-done-norefund.png` mostram o estado anterior.
- **Pós-correção:** `p1p2-resultados.json` (15/15 PASS) e `p1-widths-resultados.json` (3/3 PASS) confirmam o bloco de devolução oculto, o painel sem a linha falsa e o bloqueio de pagamento direto em 320/390/768/1440.

O veredito final da reauditoria é **APTO**. Ver `../../AUDITORIA-CEGA.md`. Os scripts `*.cjs` são cópias dos usados pelo revisor; podem ser executados a partir de um scratch, mas não alteram o protótipo nem o repositório.
