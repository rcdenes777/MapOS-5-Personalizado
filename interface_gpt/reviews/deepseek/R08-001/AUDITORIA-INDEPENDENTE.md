# R08-001 — Auditoria independente (DeepSeek Flash)

**Modelo:** subagente DeepSeek Flash via `delegate_task`, contexto novo, somente leitura (sem edição, commit, push, banco ou produção).
**Escopo:** código do protótipo `interface_gpt/`, testes e evidências do R08-001.
**Regra:** o parecer é um controle independente; as afirmações foram conferidas contra o código/JSONs e as mutações foram reexecutadas pelo executor.

## Rodada 1 — candidato `3a2a80c8`

**Veredito: REPROVADO (`passed=false`) — 3 bloqueantes.**

| # | Arquivo/local | Defeito | Efeito |
| --- | --- | --- | --- |
| 1 | `assets/app.js`, handler `new-form` | N6 condicionado a `d.mode==='new'`; `mode='later'`/omitido com selo injetado gravava duplicado | Selo deixa de ser identificador único; linhagem/N2 futuros ficam frágeis |
| 2 | `assets/cancel.js::confer` | Segunda conferência técnica do mesmo pedido aceita, duplicando evento | Histórico de auditoria duplicado; duplo envio não bloqueado |
| 3 | `assets/app.js::newOrder` | Rota direta `#retorno/:id` com texto genérico para retorno de outra origem | N2 parcialmente atendido; origem não explícita ao usuário |

Sugestões relevantes da mesma rodada: `itemKey` sem `lineId` não era detectado pela suíte (mutante sobrevivente); D30 comparava estoque tautológico; `conferPiece` ainda aceitava índice; cobertura N6/N1/N2 estreita; `codeSha` vazio nos JSONs.

**Correções do executor:** `93dc628d` (3 bloqueantes) + testes D23/D24/D26/D30/D33 e mutações M19–M22; reforço de B20/B22/B23/B25; remoção do fallback por índice; `CODE_SHA` nos resultados.

## Rodada 2 — candidato `93dc628d`

**Veredito: APROVADO (`passed=true`) — 0 bloqueantes.**

Confirmação do revisor (probes próprios em Node VM e Chromium no servidor local):

- N6 recusa selo duplicado em `new`, `later` e modo omitido, inclusive outro cliente e substituta; `existing` continua aceito.
- `confer` recusa a segunda conferência idêntica e aceita conferência legítima após mudança de identidade, retirada parcial e `withdraw` + novo pedido.
- N2 mostra `Retorno em andamento · outra origem` no painel e na rota direta, mantendo texto normal para a mesma origem.
- Mutações 22/22; 16 suítes (327), domínio/UI/N6/browser (33/4/8/40) e regressões principais verdes.

Sugestões não bloqueantes: `financialKey` sem `o.id`; `mode='existing'` valida só cliente; `active()` com múltiplos ativos legados; asserções de N6/N2 ainda amplas.

**Correção do executor:** `dd0175ef` — `financialKey` passa a incluir `o.id`; testes D34/D35, mutações M23–M25; N6-04/N6-07 e B23 reforçados; resumo no JSON do browser.

## Rodada 3 — candidato final `dd0175ef`

**Veredito: APROVADO (`passed=true`) — 0 bloqueantes.**

O revisor confirmou que o diff é exatamente uma linha em `assets/cancel.js` (`financialKey` com `o.id`), reproduziu que duas OS com mesmos itens/pedido não colidem, que a chave da outra OS é rejeitada com `'A OS mudou. Reabra o acerto.'` e estado intacto, e que o fluxo válido confirma no domínio e no modal real. Reexecutou 35/35 domínio, 25/25 mutações (`R08M-23` falha D34), 8/8 N6, 40/40 browser e 16 suítes/327; os três bloqueantes originais seguem fechados. Sem bloqueantes.

Sugestões remanescentes (registradas para R10/rodada seguinte, não bloqueiam):

- Browser R08 não cobre o modal `cancelconfirm`/`financialKey`.
- Rótulo de N2 no painel é verificado por `includes('outra origem')`; a rota direta usa a frase exata.
- Não há mutante para o ramo N2.
- D34 não executa o controle positivo com a própria chave após a rejeição cruzada.
- Versionar o pacote de testes/evidências (feito neste commit de evidências).

## Limites dos pareceres

- Revisão do protótipo estático; sem backend, MySQL, produção ou paridade nativa executada.
- O revisor usou probes em scratch; nem todas as suítes browser R07 foram reexecutadas por ele (JSONs registrados foram lidos).
- As capturas não foram inspecionadas visualmente em todas as rodadas.
- Os pareceres são autoconsistentes com os hashes registrados em `proveniencia.json`; a aprovação final da rodada continua sendo do GPT Supervisor.
