# R07-002 — Resumo

**Status:** **APTO COM RESSALVAS** no escopo experimental, após revisão adversarial independente sem bloqueantes.  
**Candidato inicial:** `b1dfff0197d81f2ad4cd7a570f5476cd0aa6fc8d`.  
**Código final testado:** `e04bb4059282197a0ce98e10d1715379433b5084` (candidato + correção do piso nativo da data do modal).  
**Base:** R07-001 `f46ad182bcb7fb067d68c335369640c82bccba1d`; referência funcional `8c256cae` (`v5-trifase` confirmada no remoto).  
**Data:** 26/11/2026 — servidor estático `:8130`, dados fictícios; nenhum backend/produção.

## Números

- **1.126 checagens funcionais: 1.121 PASS, 0 FAIL, 5 INFO.**
- 12 suítes Node do GPT: **278 PASS**. R07-002: domínio **30+1 INFO**, negativos **38**, navegador **74**, bordas/axe **32** (5 varreduras, 0 violações), impressão **8**, capturas **23 PNG**.
- Regressões: R07-001 **65/65, 54/54, 56/56, 6/6**; R06-002 **16/16, 15/15, 103, 25, 23, 9**; R02 **37/37**, R03 **118 (116+2)**, R04 **61/61**, R05 **74/74**.
- Mutações: R07-002 **26/26 detectadas**; R07-001 **20 detectadas + 1 equivalente**; R06-002 **18/18**. Nenhum mutante publicado.

## O que ficou provado

- **Cenário normativo 500/200:** parcial de 50 → 450/150/300; total posterior devolve 150 e abate 450 → 0/0/0, status Reembolsado, histórico 200 devolvido / 500 abatido.
- **Correções** nas duas ordens recompõem 50/50/0 e 500/200/300; originais preservados; correção duplicada recusada.
- **Zero dinheiro** (500/0) encerra sem recibo, status Encerrado por garantia; **legado sem billing** preserva 500/200 sem inventar recibo/obrigação.
- **Pagamento posterior** após parcial quita 450/450; **estorno** de recebimento bloqueado com devolução ativa e reabilitado após correção.
- **Duas abas reais**: devolução e correção concorrentes abortam o envio antigo (“Dados alterados em outra aba”), mantendo um único registro.
- **F02**: retorno sem solução executada percorre solicitar/retirar/conferir/confirmar sem tocar a origem; solução ativa bloqueia; derivados por origem ou anterior, mesmo cancelados, bloqueiam; devolução com pedido pendente impede confirmação, retirada continua possível.
- **Raízes independentes** da mesma unidade: link/URL/submit da segunda usam a raiz certa (prazo 180), retorno ativo único, reabertura bloqueada.
- **Permissões**: Admin registra/corrige; Financeiro consulta; Técnico/Atendente sem valores, comprovante ou motivo; handler direto nega. Matriz F04 publicada.
- **Privacidade**: portal, impressão e recibos sem comprovante/motivo/returnId/ledgerId; valores e status líquidos consistentes.
- **Modal**: sem pré-seleção, total em centavos readOnly, prévia dinâmica, data ≤ hoje com piso no último evento financeiro, confirmação/referência/motivo.
- **320/390/768/1440**, teclado/foco, Escape, scroll, extremos 9.999.999,99 e axe 0 violações.

## Correções e ressalvas

- Corrigido nesta rodada: piso nativo da data do modal (`e04bb405`), antes fixo em 1900 e agora no último evento financeiro; handler revalida.
- Adaptações de teste justificadas: F02 em `tests/cancel.cjs`/R06-002 browser; dois anchors de mutação R07-001 por `hasObligation`/filtro por raiz. Cobertura mantida.
- Ressalvas baixas registradas: histórico de devolução não renderizado no retorno cancelado (dado preservado); prévia cosmética com 3 casas; `operations` de retorno legado sem hardening; IDs operação × ledger divergentes na UI; apenas Chromium headless. Nenhuma bloqueia o recorte.

## Evidências

`interface_gpt/reviews/deepseek/R07-002/` — `RELATORIO.md`, `RESUMO.md`, `INDICE.md`, `MATRIZ-F04.md`, `AUDITORIA-INDEPENDENTE.md`, `proveniencia.json`, `testes/`, `capturas/`, `impressos/`.
