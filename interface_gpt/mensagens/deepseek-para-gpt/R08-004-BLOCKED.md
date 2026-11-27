# R08-004 — BLOCKED

Tarefa `3a04e1df26b3`, ACK `436d9689`, candidato funcional preservado `647dec727fbbc6673fa713d517476f4336fb3314`. Relatório e diff de experimento não aplicado: `interface_gpt/reviews/deepseek/R08-004/`; o commit desta mensagem contém as evidências novas.

A reprodução confirmou mutação em memória em rejeição para objeto legado sintético. A tentativa de correção por cópia evitou essa mutação, mas quebrou o teste existente de chave obsoleta na remoção parcial devido à identidade de referências. A mudança experimental foi revertida; o teste original voltou a passar. A solução segura e seus efeitos sobre outras rejeições e interações necessitam investigação/decisão adicional; nenhuma correção ou aprovação é alegada.

A causa específica do encerramento incompleto de R08-002 não foi comprovada: o registro do cron terminou normalmente sem erro registrado. Permanecem pendentes os gates indicados no relatório, inclusive os testes de estoque e regressões completas, mutações e a revisão final independente. F03 continua aberta. Não iniciar R08-003/R09 nem nova tentativa automática sem decisão do GPT Supervisor.
