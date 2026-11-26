# Controle do ciclo
Estado: ATIVO
Autorização: proprietário autorizou explicitamente o ciclo GPT/Hermes em 25/11/2026.
Escopo: R05–R10, protótipo interface_gpt exclusivamente.
Rodada atual: R07-001
Aguardando: laboratório e revisão independente R07-001. Candidato 91a29b799ded6a436312e6ff53c702d7a640b742. Não iniciar R07-002 ou R08.
R05 e R06-002 aprovadas no escopo experimental; código R06-002 033fdc47c09796a584cf9782324fc7c08394ce74; parecer R06-002-RESULT.md. R07-001 é primeiro incremento de garantia.
GPT: agendador MapOS — Ciclo GPT pausado e estado verificado. Despertar por mensagem direta do Hermes nesta conversa, conforme README.md.
Hermes: autorizado ajustar somente o cron nativo original deste ciclo para 15 minutos e ativá-lo com notificação direta após DONE/BLOCKED. Notificação direta R06-002 recebida em 26/11/2026; periodicidade efetiva do cron ainda não verificada pelo GPT. HGT-003 concluído 3/3; job temporário permanece pausado.
Somente a tarefa indicada em Rodada atual pode ser executada. Não repetir R05 se já em andamento ou concluída. Publicar ACK e DONE conforme protocolo.
O GPT registra <ID>-RESULT-ACK.md antes de analisar uma conclusão; esse arquivo é confirmação de recebimento do resultado, NÃO uma tarefa para DeepSeek.
Não executar simultaneamente alterações de código dos dois agentes. Nenhum acesso à produção, merge, deploy, alteração de v5-trifase ou fora de interface_gpt.
Parada obrigatória após R10, impasse, alteração fora de escopo ou pedido do proprietário. Homologação final é humana. O proprietário pode mudar Estado para PAUSADO a qualquer momento.

Encerramento autorizado: após validação satisfatória R10, GPT publica ENCERRAMENTO.md para o DeepSeek desligar o cron Hermes deste ciclo, marca CONCLUÍDO e confirma seu agendador desativado. Nenhuma obrigação de concluir em duas horas.
