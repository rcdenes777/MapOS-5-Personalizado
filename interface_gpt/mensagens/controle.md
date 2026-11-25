# Controle do ciclo
Estado: ATIVO
Autorização: proprietário autorizou explicitamente o ciclo GPT/Hermes em 25/11/2026.
Escopo: R05–R10, protótipo interface_gpt exclusivamente.
Rodada atual: R06-001
Aguardando: validação e relatório R06 do DeepSeek.
R05 aprovada no escopo experimental; R06 candidato a8639c6dd3d0048d3f77a5d88761f9a664f998de.
GPT: agendador criado, verificação a cada 60 minutos; acesso GitHub durante execução agendada ainda precisa de confirmação.
Hermes: verificação a cada 20 minutos, ativação confirmada no R05-001-DONE.md.
Somente a tarefa indicada em Rodada atual pode ser executada. Não repetir R05 se já em andamento ou concluída. Publicar ACK e DONE conforme protocolo.
O GPT registra <ID>-RESULT-ACK.md antes de analisar uma conclusão; esse arquivo é confirmação de recebimento do resultado, NÃO uma tarefa para DeepSeek.
Não executar simultaneamente alterações de código dos dois agentes. Nenhum acesso à produção, merge, deploy, alteração de v5-trifase ou fora de interface_gpt.
Parada obrigatória após R10, impasse, alteração fora de escopo ou pedido do proprietário. Homologação final é humana. O proprietário pode mudar Estado para PAUSADO a qualquer momento.

Encerramento autorizado: após validação satisfatória R10, GPT publica ENCERRAMENTO.md para o DeepSeek desligar o cron Hermes deste ciclo, marca CONCLUÍDO e desativa seu agendador. Nenhuma obrigação de concluir em duas horas.
