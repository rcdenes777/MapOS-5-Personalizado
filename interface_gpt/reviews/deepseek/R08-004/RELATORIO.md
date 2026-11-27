# R08-004 — recuperação interrompida, sem aprovação

Tarefa `3a04e1df26b3`, candidato inicial e código mantido `647dec727fbbc6673fa713d517476f4336fb3314`, referência `8c256cae4ddaeefad68922abddbb8addfe37c99d`. ACK no commit `436d9689`. Evidência anterior preservada em `interface_gpt/reviews/deepseek/R08-002/` no commit `69b18645277334d3d97ca041a5019162dcc1e51e`.

## Diagnóstico da execução anterior

O registro local do cron para a execução `dac8c401e9dc43209b19848c488f1970` apresenta `completed`, sem erro registrado, de 21:33:24 a 21:38:42 -03 em 26/11/2026. As observações da sessão registram a publicação de BLOCKED e a notificação, não uma causa para encerrar o laboratório antes dos gates. Portanto a razão específica não foi estabelecida; não há evidência aqui de quota, timeout ou interrupção externa. Não se alterou configuração.

## Verificações desta retomada

- Recalculados os 13 SHA-256 registrados em `R08-002/proveniencia.json`: nenhum divergiu dos arquivos no checkout. O diff de `assets/` entre o candidato e o HEAD consultado estava vazio. Isto verifica os arquivos listados, não todos os artefatos ou todas as alegações da rodada anterior.
- Executado o probe original `node interface_gpt/reviews/deepseek/R08-002/testes/normalizacao-rejeitada.cjs`: exit 1; `Item não encontrado.`, mas `unchanged:false` por criação de `quote`. Confirma mutação em memória para o cenário sintético; não demonstra persistência ou regressão introduzida pelo candidato.
- Investigação preliminar em contexto separado reportou `deepseek-flash` / `deepseek` no resultado da delegação. Indicou inicialização de quote antes da validação em `assets/cancel.js:27`, outras entradas de normalização em conferência/confirmação e uma possível falha posterior ao splice em dados corrompidos. Essas últimas hipóteses exigem reprodução independente e não são declaradas provadas. Esta investigação não é revisão independente final nem aprovação.
- Acrescentado temporariamente teste negativo a `tests/line-identity.cjs`; RED observada pelo desvio do objeto após rejeição. Tentada correção por cópia de trabalho; probe original passou, mas `node interface_gpt/tests/line-identity.cjs` falhou em `partial quantity stale key blocks replay` porque a substituição dos objetos alterou a identidade das referências. O teste existente não foi enfraquecido. O diff experimental não aplicado está em `experimento-nao-aplicado.diff` para análise, não integra o código candidato.
- Restaurados os dois arquivos experimentais exatamente a HEAD; `git diff --exit-code` confirmou ausência de mudanças neles e `node interface_gpt/tests/line-identity.cjs` voltou a passar com 15 verificações. A solução exige preservar comportamento de referências e demonstrar atomicidade nos demais caminhos de rejeição; a alternativa examinada não é segura para entrega.

## Pendente / bloqueio

A correção abrangente e segura das mutações de normalização e suas interações exige decisão sobre abordagem após a tentativa objetiva introduzir regressão. Permanecem sem execução nesta retomada: matriz de estoque, handlers e FormData, navegador/responsividade/acessibilidade, impressão/portal, regressões acumuladas R02–R07, mutações e revisão final independente obrigatória. Os resultados históricos das 18 suítes, domínio e navegador R08-001 não foram reexecutados aqui nem reclassificados como cobertura integral. Nenhum fechamento de F03 ou aprovação é alegado. Não houve produção, backend, banco, deploy ou merge.

Revisor preliminar: resultado da ferramenta informa modelo `deepseek-flash`, 36 chamadas API e duração 262,54 s; provider `deepseek` foi reportado pelo próprio subagente e configuração local, não verificado por manifesto de billing nesta rodada. Rota da revisão final não comprovada; revisão final não executada.
