# Cancelamento conferido da OS

## Acesso

Na própria OS, coluna de informações e ações, bloco **Cancelamento da OS** → **Pedido e histórico de cancelamento**. O módulo usa a presença da tabela `trifase_cancelamentos`; a migração é aditiva, sem variável de ambiente nova.

Registrar pedido exige `vOs` + `eOs`. O registro contém solicitante, motivo, operador, horário e retrato privado dos itens e do financeiro. O pedido não muda status, estoque, pagamentos ou link público. Há somente um pedido pendente por OS, protegido pela mesma trava usada nos demais módulos.

O técnico pode registrar/retirar o pedido e devolver peças não utilizadas pelo controle nativo de peças da OS. Não recebe valores financeiros nem o formulário de confirmação. Confirmação exige `vOs`, `eOs`, `vLancamento` e `eLancamento`, no mapa de rotas e no controlador; o nome do cargo não concede acesso. As permissões existentes do administrador do laboratório já atendem a essas condições; nenhum perfil foi ampliado nesta etapa.

## Conferência técnica e financeira em etapas

1. O técnico remove as peças devolvidas pelo controle nativo de peças da OS, que registra a devolução no estoque. Não remover peça utilizada como se fosse uma devolução: esse caso exige conciliação.
2. Com nenhuma peça vinculada, o técnico marca as duas confirmações de peças e serviços e usa **Registrar conferência técnica**. Essa etapa exige `vOs` + `eOs`, aceita observações opcionais e grava responsável, horário e um retrato dos itens. Não registra conferência financeira nem movimenta dinheiro. Um campo financeiro enviado nessa operação é recusado.
3. Somente quem tem `vOs`, `eOs`, `vLancamento` e `eLancamento` vê a conferência financeira e a confirmação final. A caixa financeira fica desabilitada até existirem zero peças vinculadas e uma conferência técnica válida para o pedido e os itens atuais. Depois disso ainda valem os bloqueios financeiros e de encerramento.
4. A confirmação final registra Cancelado e o histórico, sem movimentar estoque ou dinheiro. As devoluções já aconteceram na remoção das peças; não há segunda devolução automática. Observações da conferência financeira são opcionais; sua declaração continua obrigatória.

A validação é executada novamente no servidor sob a trava da OS. Novas peças, alterações nos IDs/quantidades dos itens ou no status invalidam a liberação técnica e exigem nova conferência. Mudanças apenas em preços não transformam a etapa técnica em controle financeiro. A confirmação final guarda o ID da conferência técnica e o responsável, separado de quem confirmou o financeiro. Eventos técnicos não encerram o pedido; retirada e nova solicitação não reaproveitam a liberação de um pedido anterior. Não há alteração dos registros históricos já confirmados pelo fluxo anterior.

Bloqueios efetivos: obrigação financeira formalizada, faturamento/lançamento legado, cobrança associada, eventos financeiros sem obrigação, conclusão técnica, entrega física ativa e retorno derivado/solução de garantia. Peça ainda vinculada também impede a liberação financeira. O cancelamento não estorna, reembolsa, zera ou exclui qualquer valor.

**Limite deliberado:** esta tela não executa a conciliação de uma obrigação formalizada nem libera uma obrigação apenas por estar paga. Esses casos continuam pendentes e exigem tratamento pelo financeiro; não foi criado um atalho para apagar cobranças ou histórico. Também não há pedido anônimo pelo link público.

O pedido pode ser retirado com motivo antes da confirmação, preservando os eventos. Uma OS com histórico de cancelamento não pode ser excluída. Com o módulo instalado, o editor comum deixa de oferecer Cancelado para OS ativa; o servidor bloqueia cancelamento/reabertura diretos, inclusive POST e os caminhos de alteração/exclusão da API. Atendimento cancelado permanece como histórico; outro atendimento usa nova OS.

## Laboratório e evidências

- Migração `20261104010000`, somente no laboratório 8230. Ao conferir, o mecanismo do laboratório já havia aplicado a migração; reexecução idempotente duas vezes preservou por hash 54 tabelas anteriores (excluídas migrações, sessões e logs voláteis).
- OS fictícia **9066**, descrição `QA Cancelamento controlado 20261104`, sem itens, anexos ou financeiro, criada exclusivamente para testar a tela. Pelo navegador: registrar pedido → OS continuou Aberto → abrir conferência pelo bloco da própria OS → confirmar → Cancelado com operador e horário no histórico. Não repetir esse teste na mesma fixture.
- A OS 9058 não foi cancelada nem alterada por esses testes.
- Suíte PHP: 1.883 testes, 8.959 asserções, sem falhas; uma depreciação e um teste ignorado anteriores. PHPStan, escape, formatação e build passaram.
- Testes executam pedido idempotente, devolução de estoque uma só vez, preservação de itens/dados técnicos, pedido de outra OS, conferência antiga, retirada de pedido, bloqueio de peça utilizada/serviço executado, obrigação com recebimento, rollback após falha no histórico e POST de confirmação negado ao técnico. Renderização técnica testa escape e ausência de valores/formulário financeiro.
- O teste de devolução de peças foi executado em SQLite isolado; o ciclo no navegador usou uma fixture sem peças. Concorrência real com múltiplas conexões e pagamentos externos não foi simulada.

## Origem do pedido

O formulário inicia em **Solicitado pelo cliente**, utilizando o cliente vinculado à OS. A alternativa é **Por iniciativa da assistência**. Não há mais digitação livre do solicitante. O servidor aceita somente essas origens e consulta o cliente sob a trava da OS, sem confiar em nome enviado pelo formulário. O retrato do pedido preserva origem, ID e nome completo do cliente; o operador continua em `usuario_id`, separado do solicitante. Registros anteriores são preservados.

Validação da alteração: oito testes de cancelamento/acesso passaram (49 asserções), incluindo origem inválida, cliente ausente, cliente correto e iniciativa da assistência. PHPStan, formatação e build passaram. No navegador, OS 9058 exibiu o cliente “Teste” e a opção de cliente selecionada por padrão; nenhum pedido foi registrado nessa conferência.

As confirmações de peças, serviços e financeiro são preservadas no retrato do evento, mesmo sem observações. Nesse caso o histórico registra que a conferência foi confirmada sem observações adicionais. O motivo original do pedido continua preservado. Validado por oito testes de cancelamento/acesso, com 52 asserções, inclusive confirmação efetiva com o campo vazio.

## Ajuste da separação por responsabilidade

A devolução automática na confirmação, descrita nas evidências iniciais, foi substituída pelas etapas acima. Não é necessária nova migração: a tabela existente recebe eventos `tecnica` separados dos eventos de pedido/retirada/confirmação. Nenhum perfil foi ampliado.

Os testes passaram a executar remoção prévia com evento real do modelo de estoque, registro técnico por usuário distinto, bloqueio financeiro antes de cada etapa, rejeição de campo financeiro forjado no envio técnico, invalidação por mudança nos itens, confirmação idempotente sem segunda devolução e falha no histórico preservando a devolução anterior e a liberação técnica. A renderização verifica caixa financeira ausente para técnico e desabilitada para financeiro até a liberação.

No navegador, consulta da OS 9058 confirmou que os itens já estavam removidos pelo usuário, as duas caixas técnicas estavam disponíveis e a caixa financeira ainda estava desabilitada aguardando o registro técnico. Nenhuma conferência foi registrada nem o cancelamento confirmado nessa consulta.

Validação final desta separação: 1.887 testes, 8.978 asserções, sem falhas; uma depreciação e um teste ignorado anteriores. PHPStan, escape, formatação e build passaram.
