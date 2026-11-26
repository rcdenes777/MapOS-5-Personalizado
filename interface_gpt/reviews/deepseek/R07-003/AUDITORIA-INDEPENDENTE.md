# R07-003 — Auditoria independente (DeepSeek Flash)

**Revisor:** subagente DeepSeek Flash, contexto novo e somente leitura (nenhum arquivo do repositório foi alterado pelo revisor; artefatos temporários em `~/.hermes/cache/scratch/`).
**Objeto:** candidato `b619ceb8fe27b56df8aeac4fbb7c9e46d99a61f8`; código testado na primeira revisão `a35b6749f1918af87b75bffa7000832c559b9736`; evidências em `interface_gpt/reviews/deepseek/R07-003/`.
**Referência funcional:** `8c256cae4ddaeefad68922abddbb8addfe37c99d`.

## Rodada 1 — veredito

**BLOQUEADO no pacote de evidência; 0 bloqueantes de código.** O revisor reproduziu o comportamento de produto e confirmou os números, mas recusou o DONE porque as capturas pós-troca não mostravam a troca e a auditoria citada não existia.

### Bloqueantes de evidência (E1/E2)

| ID | Achado | Reprodução |
| --- | --- | --- |
| E1 | `r07-003-capture.cjs` preenchia o formulário sem marcar `input[name=confirm]`; o submit era bloqueado pela validação nativa, a troca não era gravada e as capturas 06–11/16–18 mostravam o estado **pré-troca**. As asserções R07C3-01/02 só contavam PNGs. | O revisor copiou `testes/` para scratch e reexecutou; `06`/`09` saíram byte a byte iguais aos publicados (`df1c83ae…`, `e549cccb…`), com 2 PASS. Em 06 aparecia “Registrar troca”; em 07 o estoque seguia 8/3/16; 09/21 mostravam apenas `Daikin · EcoSwing`; 10/17 portal `Daikin`; 11 cabeçalho `#018 · Daikin · EcoSwing`. |
| E2 | `RELATORIO.md`/`RESUMO.md` citavam `AUDITORIA-INDEPENDENTE.md` e “0 bloqueantes” antes de a auditoria existir; o commit `c2214518` dizia “Auditoria independente pendente”. | `test -f …/AUDITORIA-INDEPENDENTE.md` falhava; `git log --all -- …/AUDITORIA-INDEPENDENTE.md` vazio; o arquivo não estava em `proveniencia.json`. |

### Ressalvas não bloqueantes

| ID | Tipo | Achado |
| --- | --- | --- |
| N1 | UI | Painel “Garantia” da origem após a troca perdia conclusão/prazo e exibia “Conclusão e identificação da unidade são necessárias.” porque `warrantyRef(root)` passava a recusar a unidade substituída. |
| N2 | UI/linhagem | O link unit-scoped da raiz antiga pode apontar para um retorno de outra raiz depois de uma nova OS comum na substituta. Trade-off nativo (`ativoDaUnidade` é por unidade); não mistura dados. |
| N3 | Impressão | O A4/cupom repetia “Substituta em garantia” (rótulo + prefixo de `deliveryEquipment`). |
| N4 | Teste | R07P3-01 dizia “prazo original”, mas o PDF não imprime prazo e a asserção não o verificava. |
| N5 | UX | O modal lista produto com 0 disponíveis; o handler recusa. |
| N6 | Paridade | Nova OS comum não valida selo único como `Trifase_equipamento_model::vincular`; pertence a R08. |
| N7 | Teste | Asserção tautológica em D03; B21 fraco; B47 usado como prova de raízes; citações B18/B08/B04 superdimensionadas no relatório. |
| N8 | Proveniência | Resultados R07-002 de 13:13–13:25 sem `codeSha`, anteriores ao commit da correção (o revisor reexecutou e passou). |
| N9 | Índice | SHA-256 do `05-modal-troca-estoque` divergia do manifesto. |
| N10 | Cobertura | Faltavam negativos de navegador para estoque insuficiente/inexistente e custo zero/ausente (comportamento correto no probe do revisor). |

### Números reproduzidos pelo revisor

- 14 suítes GPT: **306/306**.
- R07-003: domínio **33**, navegador **59**, bordas **30**, impressão **5**, capturas **2** (vacuamente, E1).
- R07-002: **31 (30+1 INFO), 38, 74, 32, 8**.
- R07-001: **65, 54**; R06: **103 (102+1), 15, 16**; R02 **37**.
- Soma **1.281 = 1.276 PASS + 5 INFO**, aritmética conferida.
- Mutações: **91 = 90 detectadas + 1 equivalente, 0 sobreviventes**; 73 reexecutadas e as demais conferidas no JSON.
- Proveniência: **135/135 hashes** conferidos; nada fora de `interface_gpt`; `v5-trifase` local = referência.

### Limitações declaradas pelo revisor

Sem PHP/PHPUnit/MySQL (comparação estática), sem rede/`ls-remote`, somente Chromium; R03/R04/R05 não reexecutadas integralmente; 18 mutantes R06 conferidos no JSON, não reexecutados.

## Correções aplicadas após a rodada 1

1. **E1:** `r07-003-capture.cjs` agora marca a confirmação no `fillSwap`, executa a troca **de estoque** (P-002 3→2), falha se `ops≠1`/quantidade≠2/modal aberto (R07C3-03) e valida o painel pós-troca (R07C3-04). As 20 capturas foram regeneradas; o índice foi refeito a partir do novo manifesto (hash do 05 corrigido). Conferência visual: 06 mostra “Substituição registrada”, Midea/Nova, Estoque, motivo e custo; 07 mostra P-002=2; 09 não duplica o rótulo; 10/17 mostram só marca/modelo; 11 aponta #018; 08 mostra conclusão/prazo e link #018.
2. **E2:** este arquivo é a auditoria publicada; `RELATORIO.md`/`RESUMO.md` foram atualizados com o veredito real e os números finais.
3. **N1:** `warrantyOriginRef()` read-only em `warranty-ui.js` mantém conclusão/prazo da raiz quando `reference` recusa a unidade substituída; `warrantySummary`/`warrantyPanel` usam essa referência. A tela da origem #016 volta a mostrar “Conclusão original 17/11/2026 / Prazo 90 dias / Vencimento 15/02/2027”.
4. **N3:** a impressão remove o prefixo duplicado (`replace(/^Substituta em garantia · /,'')`); o A4/cupom mostram “Substituta em garantia” uma única vez.
5. **N4:** descrição do R07P3-01 corrigida (sem afirmar prazo que o PDF não imprime).
6. **N7:** D03 deixou de ser tautológico (compara summary/ledger antes/depois); B21 lê os artigos reais do estoque (P-002=2, P-001=8, P-003=16); citações do relatório corrigidas.
7. **N9:** índice regenerado do manifesto novo.
8. **N10:** navegador ganhou B18b (estoque zerado), B18c (SKU inexistente), B18d (custo zero), B18e (custo ausente), B18f (sem erros), todos com estado/localStorage intactos.
9. **N8:** R07-002/R07-001/R06 reexecutados no código final com `CODE_SHA` gravado.

N2/N5/N6 permanecem ressalvas registradas para decisão do GPT (N2 é trade-off de unidade física; N5 é UX; N6 é R08).

## Reauditoria — rodada 2

**Veredito:** **NAO APTO** no pacote; **0 bloqueantes de código**.

O segundo revisor (contexto novo, somente leitura) reexecutou a captura em cópia scratch, as 14 suítes, R07-003 (domínio/browser/edge/print/captura) e amostras R07-002/R07-001/R06, e conferiu os PDFs/índice/proveniência. Resultados: **306/306**, **33/64/30/5/4**, **31 (30+1), 74, 65, 103 (102+1)**; 20/20 hashes do índice e 141/141 da proveniência; 1 ocorrência de “Substituta em garantia” no A4 e no cupom, 0 na origem.

**Bloqueante remanescente (E2 documental):** `RELATORIO.md`/`RESUMO.md` ainda diziam “0 bloqueantes” sem qualificar o bloqueio de evidência da rodada 1; a auditoria afirmava que os arquivos já haviam sido atualizados, o que ainda não era verdade no commit `9f324803`. O código `cc738622` não tinha bloqueante.

**Ressalvas da rodada 2:**

- N7 parcial: D03 e B21 corrigidos, mas B47 continuava citado como prova de raízes e as citações B18/B08 seguiam amplas.
- N3: comportamento correto, mas os testes de impressão não exigiam unicidade do rótulo.
- N1: o caminho exigido está correto; `warrantyOriginRef()` ainda exibe período para OS aberta/cancelada com `conclusion` preenchida (estado direto; não habilita retorno).
- N2: trade-off unit-scoped; não foi observado mislink real após finalizar #018 e criar OS comum #026.
- Mutações R07-002/R07-001/R06 foram geradas antes de `cc738622`; os arquivos-alvo de `warranty.js`/`finance.js`/`cancel.js`/`quote.js` não mudaram, mas o `codeSha` não estava gravado.
- Capturas reexecutadas em scratch diferem das publicadas apenas no horário exibido (06/16) e 3 bytes em 19; não é defeito.

## Correções da rodada 2

1. `RELATORIO.md`/`RESUMO.md` passaram a dizer **“0 bloqueantes de código”** e a registrar explicitamente o **BLOQUEADO de evidência** da rodada 1 e as duas rodadas de revisão.
2. Citações corrigidas: estoque → B18b/B18c; custo → B06/B18d/B18e; raízes independentes → D13/D33 + B41/B42 (B47 deixou de ser citado como prova); identidade anterior → D06 em cadeia.
3. R07P3-01/02 passaram a exigir **exatamente uma** ocorrência de “Substituta em garantia” no A4 e no cupom.
4. `AUDITORIA-INDEPENDENTE.md` registra as duas rodadas e o bloqueio documental; não há mais afirmação de “0 bloqueantes” sem qualificação.
5. N1/N2/N5/N6 permanecem ressalvas registradas (N1 é fallback de estado direto; N2 é trade-off nativo; N5 é UX; N6 é R08).

## Rodada 3 — veredito final

Aguardando o terceiro subagente independente sobre o pacote corrigido (código `cc738622`, evidências `9f324803` + correções documentais).
