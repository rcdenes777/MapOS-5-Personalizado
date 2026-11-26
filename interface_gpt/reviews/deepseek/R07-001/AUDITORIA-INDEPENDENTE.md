# R07-001 — Auditoria independente (três rodadas)

**Candidato inicial:** `91a29b799ded6a436312e6ff53c702d7a640b742`
**Código final:** `f46ad182bcb7fb067d68c335369640c82bccba1d`
**Método:** subagente DeepSeek Flash via `delegate_task`, contexto novo e somente leitura, sem acesso a produção/banco/credenciais. Cada rodada leu o código e as evidências, reexecutou testes e reproduziu cenários em Chromium 1248 contra o servidor estático `:8130`. Nenhum revisor alterou o repositório.

## Rodada 1 — candidato `91a29b79`: **NAO APTO**

Dois bloqueantes objetivos, ambos reproduzidos em navegador:

1. **Dois retornos ativos para a mesma unidade.** Após avaliar e finalizar #018, a origem #016 voltava a oferecer “Registrar retorno” em `#retorno/16`; criava-se um irmão #025 com `previous=16`; em seguida a reabertura de #018 era aceita (`Em Andamento`), deixando #018 e #025 ativos para a unidade 16. A guarda `transition` só olhava derivados diretos, e o link da origem não resolvia o retorno finalizado.
2. **Vínculo ao atendimento anterior errado.** O link “Registrar retorno” de #016 criava o novo retorno com `previous=16` em vez de `previous=18`, quebrando a cadeia “origem → atendimento anterior” e habilitando o bloqueante 1.

Ressalvas não bloqueantes da rodada 1: contagem de PASS do relatório (886 vs 889), arquivo de auditoria ausente e lacunas de cobertura (identidade por unidade, status da origem, metades de `derived`, faturamento com versão recusada, portal após troca de avaliação, limites do modal de custo, cupom).

## Correções — commits `39a42126`, `42f1733e`, `5ed6e3fc`

- `BancadaWarranty.lastFinalized(o, orders)` resolve o retorno finalizado mais recente da unidade/cliente (inclusive o próprio `o` quando é o mais recente).
- `newOrder` e `warrantyReturnLink` usam esse atendimento como base: a origem com retorno finalizado aponta para o retorno anterior e grava `previous` correto.
- `BancadaWarranty.transition` recusa reabrir retorno finalizado quando há **irmão ativo** da mesma unidade (`activeSibling`), além de `derived`.
- Testes novos: `R07-S3-10a`, `R07-S3-12a`, `R07N-07b`, `R07N-07c`, `R07N-19b/19c/19d`, `R07N-32b`, `R07N-44/45/46`; mutações `R07M-19/20/21`.

## Rodada 2 — `5ed6e3fc`: **APTO COM RESSALVAS**

Sem bloqueantes. Reproduziu o fluxo corrigido (#016→#018→#025 com `previous=18`, reabertura bloqueada, um único ativo) e confirmou as regressões R02–R06 e as 21 mutações. Achou um furo médio: uma **OS ordinária ativa** da mesma unidade exibia “Registrar retorno” apontando para o retorno finalizado e `#retorno/<ordinária>` abria formulário (base 18), criando um retorno enquanto a OS ordinária seguia ativa. Também apontou hashes desatualizados no relatório, `AUDITORIA-INDEPENDENTE.md` ausente e proveniência parcial.

## Correção final — commit `f46ad182`

Gate mínimo de 2 linhas: `warrantyBase` e `newOrder` só resolvem `lastFinalized` quando a OS de partida está **Finalizada**. OS ordinária ativa da mesma unidade não oferece nem abre retorno; OS ordinária finalizada continua podendo iniciar o atendimento. Testes novos: `R07-S3-10b` (browser), `R07N-47` (teto exato de custo/tempo) e `R07N-48` (cancelado não é último finalizado).

## Rodada 3 — `f46ad182`: **APTO COM RESSALVAS (apenas de documentação/proveniência)**

Sem bloqueantes. Verificou o delta `5ed6e3fc..f46ad182` (somente as duas guardas de status), reproduziu o furo médio contra o código anterior (R07-S3-10b falha com `#retorno/18` e formulário) e contra o código final (passa, sem link e “Retorno indisponível”), confirmou o fluxo normal (#016→#018→#025 `previous=18`, cadeia #018→#025→#026 `previous=25`), a regressão de OS ordinária finalizada, o bloqueio por irmão ativo e a ausência de link em OS ativa de outra unidade. Conferiu **908 checagens, 904 PASS, 0 FAIL, 4 INFO**, com `codeSha=f46ad182` nos JSONs, e o escopo do diff somente em `interface_gpt`.

As três ressalvas da rodada 3 eram de empacotamento, não de código: documento de auditoria ausente, hashes do relatório/proveniência desatualizados e contagens antigas. Todas foram corrigidas nesta publicação (este arquivo, tabela de hashes e `proveniencia.json` regenerados a partir de `f46ad182`), sem qualquer alteração de código após a revisão.

## Veredito final

**APTO no escopo experimental da R07-001.** Nenhum bloqueante permanece. As ressalvas remanescentes são decisões de produto/limites declarados, não defeitos do recorte:

- Troca de avaliação após publicação mantém a versão e o portal ativos (sem cobrança): regra ambígua, decisão pendente do GPT.
- Publicação de nova versão após faturamento continua possível, sem segundo faturamento: limite do protótipo.
- Painel da própria origem repete o número em “Atendimento anterior”: cosmético.
- Sem mutante dedicado ao gate de UI; a sensibilidade foi provada pelo teste `R07-S3-10b` contra o código anterior e por mutação manual do gate.
- `R07-S3-10b` verifica a aba padrão; a aba Garantia foi verificada manualmente sem link. `R07N-47` não tem mutante no conjunto de 21; sensibilidade confirmada por mutação manual do teto.

## Evidências

`interface_gpt/reviews/deepseek/R07-001/` — `RELATORIO.md`, `INDICE.md`, `RESUMO.md`, `proveniencia.json`, `testes/`, `capturas/`, `impressos/` e este arquivo.
