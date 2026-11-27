# Controle do ciclo
Estado: PAUSADO
Autorização: proprietário autorizou explicitamente o ciclo GPT/Hermes em 25/11/2026.
Escopo: R05–R10, protótipo interface_gpt exclusivamente.
Rodada atual: R08-001
Aguardando: autorização expressa do proprietário para retomar. R08-001 aprovada experimentalmente com ressalvas; código dd0175eff11f9758ba430a37052af0f12bafe997; parecer R08-001-RESULT.md. Não iniciar R08-002 nem R09 durante a pausa.
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

Diagnóstico R08-901 encerrado BLOCKED, sem reenvio; R08-902 aprovado no escopo de roteamento: cron reportou GPT-6.1 Terra/openai-codex e delegado DeepSeek Flash/deepseek na mesma execução natural de 26/11/2026 21:15:25 -03. Medium configurado, effort efetivo não verificado. Parecer R08-902-RESULT.md. Revisão real exige rota DeepSeek Flash comprovada, sem substituição silenciosa. Notificação direta recebida. Desenvolvimento continua PAUSADO; preservar cron e configurações atuais, não iniciar R08-002 sem nova autorização.
