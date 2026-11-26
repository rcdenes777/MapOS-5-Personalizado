# R07-002 — Auditoria independente

**Revisor:** subagente DeepSeek Flash, contexto novo e somente leitura (sem acesso a produção/banco/credenciais; sem alterar o checkout).  
**Objeto:** código candidato `b1dfff0197d81f2ad4cd7a570f5476cd0aa6fc8d` + correção `e04bb4059282197a0ce98e10d1715379433b5084` (código final testado).  
**Data:** 26/11/2026.  
**Método:** leitura integral da tarefa, `R07-GARANTIA.md`, controle e código; comparação estática com `Trifase_garantia_model.php`, `trifase_garantia_helper.php`, `Trifase_financeiro_model.php`, `Trifase_cancelamento_model.php` e `Trifase_retornos.php`; reexecução independente das suítes principais em cópia scratch; prova em navegador real do caso de duas abas para correção (não presente na evidência original, na época).

## Veredito da 1ª rodada

**APTO COM RESSALVAS — 0 bloqueantes.**

> “Sem bloqueantes. O escopo funcional da R07-002 foi verificado no código e reproduzido independentemente: 12 suítes Node (278 PASS), regressão R07-001 (54 negativos, 65 browser, 56 edge, 6 print, 21 mutações: 20 detectadas + 1 equivalente), regressão R06-002 (15 negativos, 103 browser, 25 edge, 16 handler, 18 mutações) e suíte nova R07-002 (30 domínio + 1 INFO, 38 negativos, 73 browser, 32 edge, 8 print, 2 captura, 26 mutações). O exemplo 500/200 -> parcial 50 -> 450/150/300 e total 150/450, as duas ordens de correção (500/200/300), encerramento total com zero dinheiro, legado sem billing, pagamento posterior, estorno bloqueado/reabilitado, F02 (...) e raízes independentes (...) reproduzem. Permissões: Admin registra/corrige, Financeiro consulta, Técnico/Atendente sem valores, comprovante ou motivo; handler direto nega e deixa o estado intacto. Portal, impressão e recibos não expõem comprovante/motivo/valores privados. Nada fora de interface_gpt mudou desde 8c256cae; hashes dos assets conferem; sem rede/credenciais.”

## Achados e tratamento

| # | Severidade | Achado | Tratamento |
| --- | --- | --- | --- |
| 1 | Médio | Matriz F04 exigida não publicada; código só tem comentários `admin only`/`settings`. | **Resolvido**: `MATRIZ-F04.md` publicada com as capacidades nativas por ação, referências de linha no controller e mapeamento conservador da simulação. |
| 2 | Baixo | Após cancelar o retorno (F02), o painel de devolução deixa de mostrar o histórico; dados permanecem em `warranty.operations`/ledger. | **Registrado** como ressalva de UI; sem perda de dados; decisão de exibição fica com o GPT. |
| 3 | Baixo | Prévia do modal usa `Math.round` e aceita 3 casas (ex.: 1.005), enquanto o handler recusa; `step=0.01` barra o envio real. | **Registrado** como cosmético; handler e `step` impedem lançamento inválido. |
| 4 | Baixo | `refund`/`correctRefund` fazem `o.warranty.operations.push` sem garantir array em retorno legado; inalcançável pela UI atual. | **Registrado** como robustez futura; `create`/`assess` sempre inicializam `operations`. |
| 5 | Baixo | `axe.md` rotulado R06 no diretório novo. | **Resolvido**: renomeado para `testes/r06-002/axe-R06-regressao.md`; `testes/axe-r07-002.md` específico (5 varreduras, 0 violações). |
| 6 | Baixo | Proveniência com `v5TrifaseTip` hardcoded e ref local ausente. | **Resolvido**: `proveniencia.py` consulta `git ls-remote origin refs/heads/v5-trifase`, registra `v5TrifaseLocalTrackingRef=null` e `v5TrifaseEqualsReference=true`. |
| 7 | Baixo | Faltava caso de duas abas para **correção** (só havia devolução). | **Resolvido**: R07B-52b adicionado; 74/74 no navegador; uma única correção e envio antigo abortado. |
| 8 | Baixo | D10 dizia “data anterior” mas usava a mesma data; não cobria segunda devolução anterior à primeira. | **Resolvido**: D10 usa 25/11 (anterior à primeira, 26/11) e recusa 24/11 (antes do recibo). |
| 9 | Baixo | IDs de operação e de ledger divergem entre painel do retorno e financeiro. | **Registrado** para decisão de UI/auditoria; ambos os registros são preservados. |

## Qualidade dos testes (parecer do revisor)

> “Qualidade alta e reproduzível. Recontei 278 checagens nas 12 suítes e reexecutei em scratch: 54 negativos R07-001 (54 PASS), 21 mutações (20 DETECTADA + 1 EQUIVALENTE), 18 mutações R06-002 (18/18), 26 mutações R07-002 (26/26), 30 domínio +1 INFO, 38 negativos, 73 browser e 32 edge (73/73 e 32/32 PASS, sem erros de página/console nem requisições externas). As asserções são reais: mensagens exatas, snapshots de estado intacto nos negativos, números em centavos, textos de portal/impressão. As duas adaptações declaradas são justificadas e não enfraqueceram cobertura (...). Não encontrei teste tautológico relevante; o único guard inócuo é o Math.round da prévia.”

## O que o revisor classificou como **não** defeito

- #018 deixar de ser bloqueada e #016 mudar de mensagem: é exatamente o F02; a checagem positiva nova e D19/R07B-53..55 provam o fluxo, sem afrouxar outras asserções.
- `tests/cancel.cjs`: o caso genérico virou retorno com operação `troca`; o bloqueio genérico era o bug F02 e a devolução ativa é coberta por D20/N31.
- Anchors de mutação R07-001 atualizados continuam mirando as guardas certas (edição após entrega/`hasObligation`; último finalizado por raiz/status) e seguem detectados.
- `allowsReverse` checar `warrantyCredits().amount` (não `.credit`) espelha o original; no zero-cash não existe recibo não estornado.
- Devolução com pedido de cancelamento pendente é comportamento exigido; confirmação bloqueada e retirada possível.
- `dateMin=1900-01-01` no #018 é correto porque #016 não tem ledger; o piso por recibo é provado em R07E-X-05 (25/11).
- “Em aberto”/“Pendente” e pagamento com data futura são comportamentos pré-existentes/paritários; o fallback 1900 evita `min>max` e o handler recusa.
- A lista “Atendimentos da unidade” mostrar retornos das duas raízes é visão por unidade; vínculo/link/URL/submit usam a raiz.
- Retorno cancelado não aceitar nova devolução/correção e crédito zero não criar recibo são paritários ao nativo; projeção pública/recibos sem dados privados.

## Limitações da revisão

Protótipo estático (sem backend/transação/atomicidade); PHP comparado estaticamente, sem executar/banco; branch `v5-trifase` não existe como ref local no clone, então a integridade foi inferida por `git diff` vazio fora de `interface_gpt` e confirmada pelo `git ls-remote` na reauditoria; navegador apenas Chromium/Playwright; dados fictícios; nenhum acesso a produção, banco, credenciais ou v5-trifase.

## Reauditoria das correções de evidência/teste

**2ª rodada — veredito: APTO COM RESSALVAS, 0 bloqueantes.** O revisor confirmou o código de produto inalterado em `e04bb405` (`git diff e04bb405..HEAD` vazio; hashes de `warranty-ui.js`/`warranty.js` conferem) e reexecutou o que mudou:

- **F04:** `MATRIZ-F04.md` publicado com as capacidades nativas e referências corretas; não presume direitos por nome de perfil. Duas imprecisões documentais baixas apontadas: a linha do Técnico dizia “Cria/avalia” (Técnico tem `tech`, não `return`; o correto é “Avalia”) e a linha de estorno ordinário incluía `eOs` (o original `Trifase_financeiro.php:89-92` exige `vOs` + `vLancamento` + `estornarRecebimento`; `eOs` vale para corrigir devolução em `Trifase_retornos.php:278-283`).
- **Duas abas de correção:** R07B-52b presente e reexecutado em scratch: **74/74 PASS**, uma única correção, origem 500/200 e toast “Dados alterados em outra aba”.
- **D10:** reexecutado: **30 PASS + 1 INFO**; 25/11 (anterior à primeira, 26/11) aceita e 24/11 recusada. O log antigo ainda tinha os nomes anteriores.
- **axe:** `testes/axe-r07-002.md` com 5 varreduras e 0 violações; artefato R06 movido para `testes/r06-002/axe-R06-regressao.md`.
- **Proveniência:** `git ls-remote` de `v5-trifase` registrado (`8c256cae…`), ref local ausente (`null`) e igualdade com a referência; `outsideInterfaceGptDiff=""`.
- **Documentos/ressalvas:** publicados; as ressalvas baixas restantes estão registradas como limitações, sem bloqueio.

Pendências documentais baixas antes do DONE (nenhuma de produto): corrigir as duas linhas da matriz, regenerar `r07-002-domain.log` e preencher esta seção. **Nenhum bloqueante.**

## Fechamento das pendências documentais

- `MATRIZ-F04.md`: Técnico corrigido para “Avalia retorno; não cria (falta `return`/`aOs`)”; estorno ordinário corrigido para `vOs` + `vLancamento` + `estornarRecebimento`, com a observação de que `eOs` integra a correção de devolução.
- `testes/r07-002-domain.log`: regenerado na execução final (`30 PASS + 1 INFO`, D10/D10i com os nomes atuais).
- Esta seção preenchida com o parecer da 2ª rodada.

**Parecer final consolidado:** **APTO COM RESSALVAS, 0 bloqueantes** no código `e04bb405`; ressalvas baixas de UI/robustez registradas para decisão do GPT (histórico oculto no retorno cancelado, prévia cosmética com 3 casas, `operations` de retorno legado, IDs operação × ledger). A aprovação final da rodada pertence ao GPT Supervisor.
