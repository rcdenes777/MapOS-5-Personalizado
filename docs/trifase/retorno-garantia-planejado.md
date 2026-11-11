# Retorno em garantia por equipamento

Status: decisão aprovada em 01/11/2026; implementação pendente. Protótipo visual não altera o MapOS.

## Decisão
Criar uma nova OS de retorno em garantia vinculada à unidade física (selo de garantia) e à OS original. Preservar cada atendimento encerrado. Reabertura da OS original fica reservada à correção de encerramento indevido antes da entrega, sujeita às permissões e auditoria.

## Fluxo e dados
Consultar por selo, série/IMEI ou OS anterior. Exibir marca/modelo, cliente, reparo original, datas, prazo concedido e histórico de retornos. Registrar relato novo e diagnóstico, responsável, data e justificativa da cobertura: em avaliação, coberto ou não coberto. Estar dentro do prazo é indicação temporal, não confirmação automática de cobertura.
Registrar solução: reparo sem cobrança, novo orçamento, troca ou devolução do valor. Decisão humana, com justificativa e permissões. Não executar estorno ao selecionar uma solução: eventual devolução usa o fluxo financeiro próprio, auditável e protegido contra duplicação.
Reutilizar somente identificação; defeito, itens recebidos e estado de entrada devem ser registrados novamente. Mostrar quantidade de retornos, peças aplicadas, tempo de trabalho e custos internos acumulados, distinguindo custo de preço cobrado. Custos e anotações internas não aparecem no link público.
Tipo de atendimento, cobertura, andamento técnico e financeiro são dimensões independentes. Sem cobrança não equivale a lançamento quitado. Uma OS sem cobrança não deve gerar recebimento fictício, alterar saldo da original nem duplicar estoque.
Preservar o prazo original. Não reiniciar, encurtar ou estender automaticamente: política de prazo após retrabalho/troca/devolução depende de definição e validação jurídica antes da implementação. Exibir extensões explícitas com motivo, autor e datas.

## Integração e validação futura
Implementar preferencialmente no módulo Trifase, com tabelas próprias e referências às OS/unidades, migração aditiva, sem modificar registros legados automaticamente. Rastrear o cálculo atual de garantia antes de integrar. Validar vínculos no servidor, permissões existentes, proteção contra submissão duplicada e ciclos de referências. Histórico com eventos auditáveis; não permitir exclusão silenciosa de decisões/custos. Dados antigos sem prazo/data devem aparecer como não informados, sem inferir cobertura.
Testar prazo no limite e expirado; retorno dentro do prazo mas fora da cobertura; vários retornos ligados à mesma origem; nenhuma alteração na OS original; isolamento de clientes e anexos; custos privados; retorno sem cobrança; orçamento separado; devolução parcial/total sem duplicidade; extensão registrada. Validar em laboratório antes do preview. Não alterar produção, master, trabalho ou instalação antiga; push exige autorização específica.

## Próximas etapas
Revisar o protótipo; definir política de prazos e custos de mão de obra; mapear entidades atuais de unidade/garantia/financeiro; detalhar migrações e endpoints; implementar em etapas pequenas com testes e commits. Nenhuma migração ou código funcional foi autorizado nesta etapa visual.

## Entrega compartilhada
O registro de retirada deve ser comum às OS normais e aos retornos: [planejamento de entrega](entrega-equipamento-planejada.md). Não criar implementação exclusiva de garantia.
