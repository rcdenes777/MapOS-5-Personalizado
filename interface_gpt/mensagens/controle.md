# Controle do ciclo
Estado: ATIVO
Autorização: proprietário autorizou explicitamente o ciclo GPT/Hermes em 25/11/2026.
Escopo vigente: R08-007 — validação focal somente leitura do candidato nativo experimental no laboratório sintético existente; escrita remota apenas mensagens e evidências desta rodada em interface_gpt/.
Rodada atual: R08-007
Aguardando: ACK e DONE/BLOCKED de R08-007; após publicação, notificar GPT nesta conversa uma única vez. Não iniciar outra tarefa.
R05 e R06-002 aprovadas no escopo experimental; código R06-002 033fdc47c09796a584cf9782324fc7c08394ce74; parecer R06-002-RESULT.md. R07-001 aprovada no escopo experimental; código f46ad182bcb7fb067d68c335369640c82bccba1d, parecer R07-001-RESULT.md. R07-002 aprovada no escopo experimental; código e04bb4059282197a0ce98e10d1715379433b5084, parecer R07-002-RESULT.md. R07-003 aprovada no escopo experimental com ressalvas; código cc738622436d3df1224df700916970570eb0bd40, parecer R07-003-RESULT.md. R08-001 aprovada experimentalmente com ressalvas; identidade estável de linhas; F03 integral pendente de R08-002 (estoque e vínculo produto/linha). Pausa solicitada pelo proprietário após R08-001 em 26/11/2026; retomada somente mediante autorização expressa. R10 deve resolver ou justificar F01–F07.
GPT: agendador MapOS — Ciclo GPT pausado e estado verificado. Despertar por mensagem direta do Hermes nesta conversa, conforme README.md.
Hermes: autorizado ajustar somente o cron nativo original deste ciclo para 15 minutos e ativá-lo com notificação direta após DONE/BLOCKED. Notificações diretas R06-002, R07-001, R07-002, R07-003 e R08-001 recebidas em 26/11/2026; periodicidade efetiva do cron ainda não verificada pelo GPT. HGT-003 concluído 3/3; job temporário permanece pausado.
Somente a tarefa indicada em Rodada atual pode ser executada. Não repetir R05 se já em andamento ou concluída. Publicar ACK e DONE conforme protocolo.
O GPT registra <ID>-RESULT-ACK.md antes de analisar uma conclusão; esse arquivo é confirmação de recebimento do resultado, NÃO uma tarefa para DeepSeek.
Não executar simultaneamente alterações de código dos dois agentes. Nenhum acesso à produção, merge, deploy, alteração de v5-trifase ou fora de interface_gpt.
Parada obrigatória após R10, impasse, alteração fora de escopo ou pedido do proprietário. Homologação final é humana. O proprietário pode mudar Estado para PAUSADO a qualquer momento.

Encerramento autorizado: após validação satisfatória R10, GPT publica ENCERRAMENTO.md para o DeepSeek desligar o cron Hermes deste ciclo, marca CONCLUÍDO e confirma seu agendador desativado. Nenhuma obrigação de concluir em duas horas.

Durante PAUSADO, monitor Hermes encerra silenciosamente, sem executar nova tarefa, repetir notificações ou fazer commits. Não é encerramento definitivo do ciclo; preservar configuração existente.

Diagnóstico R08-900 concluído: cron reportou DeepSeek Flash, não Terra; parecer R08-900-RESULT.md. Nenhuma alteração de configuração autorizada por esse diagnóstico. Desenvolvimento permanece PAUSADO.

Diagnóstico R08-901 encerrado BLOCKED, sem reenvio; R08-902 aprovado no escopo de roteamento: cron reportou GPT-6.1 Terra/openai-codex e delegado DeepSeek Flash/deepseek na mesma execução natural de 26/11/2026 21:15:25 -03. Medium configurado, effort efetivo não verificado. Parecer R08-902-RESULT.md. Revisão real exige rota DeepSeek Flash comprovada, sem substituição silenciosa. Notificação direta recebida. Diagnóstico encerrado; autorização posterior do proprietário retomou o desenvolvimento na R08-002. Preservar cron e configurações atuais.

R08-002: GPT publicou candidato 647dec727fbbc6673fa713d517476f4336fb3314 e tarefa R08-002.md, 355 verificações PASS em ambiente JS simulado. Hermes principal Terra, delegado DeepSeek Flash; aplicar revisão otimizada, comprovar rota e bloquear aprovação se indisponível ou não verificada. Sem aprovação antecipada. Autorização vigente R05–R10, parar se proprietário solicitar ou condição de parada ocorrer.

R08-002 BLOCKED (parecer R08-002-RESULT.md). R08-004 é apenas recuperação do laboratório, não novo incremento; ID distinto preserva R08-003 condicional. Não repetir R08-002. Se R08-004 BLOCKED, não abrir nova tentativa automática sem decisão explícita sobre a causa. F03 ainda aberta.

R08-004 BLOCKED: experimento revertido por quebra de identidade de referência; causa operacional da interrupção anterior não comprovada. Controle PAUSADO por regra de parada após segundo bloqueio. Nenhuma nova tentativa automática; cron original preservado, monitor deve encerrar silenciosamente. Aguardar decisão explícita.

Autorização posterior do proprietário: R08-005, tentativa única com Terra no máximo; configuração local pelo proprietário, ainda não verificada pelo GPT. Preservar evidências e critérios de aceite. Caso BLOCKED, retornar PAUSADO, sem nova tentativa automática.

R08-005 BLOCKED: Terra Max apresentou avanço material e correção experimental focal, mas M01 sobrevivente, cobertura incompleta e revisão final ausente. Tentativa única encerrada; controle PAUSADO; monitor original silencioso, sem mudanças de cron/config. Aguardar decisão explícita sobre continuidade ou mudança de estratégia (backend/banco isolados somente após autorização de escopo). Sem nova tentativa automática.

Autorização posterior do proprietário: prosseguir com laboratório nativo e integração gradual conforme R08-NATIVE-LAB.md. Somente R08-006 nesta etapa. A exceção de backend local substitui a proibição anterior exclusivamente para preparar e testar cópia nativa isolada, sem alteração do código nativo, sem dados/credenciais/serviços produtivos. Não aperfeiçoar o simulador. F03 ainda aberta, preservar evidências. Se BLOCKED, aguardar decisão GPT, sem nova tentativa automática. Cron e modelos preservados.

R08-006 BLOCKED: guardas do cron impediram ciclo de limpeza do contêiner de prova; isolamento integral e banco/app/testes não executados. Parecer R08-006-RESULT.md. Não afrouxar proteção global nem contornar aprovação. Aguardar decisão sobre laboratório; coleta documental manual não reativa o cron. Sem acesso aos dados reais, deploy, alterações funcionais ou outros projetos.


## Retomada controlada — 27/11/2026
Proprietário autorizou publicar uma nova tarefa para testar o ciclo restaurado, utilizando DeepSeek enquanto Codex estiver sem cota. Somente R08-007 está autorizada; substitui a pausa anterior apenas para esta rodada. Candidato 86f4c552ac111cec65460768b7023d207824a1b7. Coordenador conforme modelo DeepSeek configurado pelo proprietário; revisão independente DeepSeek Flash, sem Codex/Luna nesta rodada. Capturas Playwright para inspeção pelo GPT. Manter cron de 15 minutos, skills e ai-memory existentes, sem mudanças globais. Não retomar IDs anteriores. Ao concluir ou bloquear, publicar resultado e notificar uma vez, aguardar decisão GPT sem repetir. Integração experimental somente em laboratório; nenhuma produção, merge, deploy, modificação de código nativo, alteração de dados de negócio ou outro projeto. As entradas anteriores são histórico, não tarefas ativas.
