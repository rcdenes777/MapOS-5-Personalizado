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

## Fila no Financeiro, acerto financeiro e classificação interna do cliente

1. **Aviso e Fila de Cancelamentos pendentes (`Financeiro → Ordens`):**
   - Enquanto houver pedido de cancelamento ativo (`solicitar`), a OS exibe **Cancelamento solicitado — aguardando análise financeira** (na própria OS, na listagem financeira e no financeiro da OS). A OS só passa para `Cancelado` após a confirmação final.
   - Em `financeiro/ordens`, o bloco **Cancelamentos pendentes** (e o filtro `Situação financeira → Cancelamentos pendentes`) lista nº da OS, cliente, situação da conferência técnica (*Concluída* ou *Pendente*), total, recebido, já devolvido, saldo e a ação direta **Analisar cancelamento**.
2. **Acerto financeiro do cancelamento (cálculo automático + decisão manual):**
   - Na confirmação financeira (`vOs` + `eOs` + `vLancamento` + `eLancamento`), o financeiro informa o **Valor devido pelo trabalho ou diagnóstico (R$)** e o **Desconto negociado (R$)**, podendo simular o cálculo antes de confirmar.
   - O sistema cruza o total final devido (`valor devido - desconto`) com os recebimentos e devoluções já registrados na OS e calcula automaticamente um dos três resultados:
     - **Sem valores a acertar** (ex.: R$ 50,00 de diagnóstico com R$ 50,00 de desconto → R$ 0,00; ou valor pago igual ao valor devido);
     - **Valor a devolver ao cliente** (ex.: cliente pagou R$ 200,00 e ficou combinado R$ 50,00 de diagnóstico → calcula R$ 150,00 a devolver, exigindo valor, data, forma e comprovante/referência da devolução antes de concluir);
     - **Valor a receber do cliente** (quando o valor líquido devido pelo trabalho/diagnóstico supera o recebido líquido, ajustando a obrigação para permitir a baixa do saldo residual).
   - O motivo interno / justificativa e a confirmação explícita do acerto são obrigatórios sempre que houver obrigação financeira ou valores/desconto informados.
3. **Classificação interna do cliente pelo Financeiro e Administrador:**
   - Tanto o **Administrador** (`vCliente` + `eCliente`) quanto o **Financeiro** (`vCliente` + `vLancamento` + `eLancamento`, mesmo com `eCliente=0`) podem atualizar a **Categoria interna** (*Não classificado, Bronze, Prata, Ouro*) e as **Orientações de atendimento** em `trifase_cadastros/cliente/<id>` e na aba Dados de `clientes/visualizar/<id>`, sem liberar a edição do cadastro completo do cliente (`clientes/editar/<id>` continua exigindo `eCliente`).
   - Conceder desconto no cancelamento nunca altera a categoria do cliente automaticamente; a tela de cancelamento oferece o atalho **Classificação e orientações internas do cliente** para registro manual e separado.

## Conferência da retomada — 09/11/2026

Os três incrementos já estavam nos commits `c092199`, `c1a625c`, `a351189` e `fe1d43a`. A retomada preservou a implementação e acrescentou regressão executável para o acerto com devolução: repetir a mesma confirmação não duplica despesa/evento, `resumo()` e `resumos()` concordam, a OS sai da fila pendente e o estorno do recebimento original é recusado após a devolução, preservando integralmente lançamentos, obrigação, projeções e eventos.

Validação: suíte completa com 1.892 testes e 9.029 asserções, sem falhas (uma depreciação e um teste ignorado anteriores); após ampliar a regressão, 19 testes focados passaram com 127 asserções. PHPStan e formatação passaram. No navegador, login com o perfil Financeiro de teste confirmou acesso à classificação/orientações internas e bloqueio da edição completa de cliente. A listagem financeira oferece o filtro Cancelamentos pendentes; na consulta atual não havia pedidos pendentes e a OS 9058 já constava como Cancelado. Nenhuma OS ou classificação existente foi alterada por essa conferência. O laboratório 8230 foi religado; os demais ambientes não foram modificados.

## Acerto na listagem e ensaio pelos dois perfis — 09/11/2026

A coluna **Acerto financeiro** apresenta `A receber: R$ …`, `A devolver: R$ …` ou `Sem pendência: R$ 0,00`. Um pedido de cancelamento aberto mostra `Aguardando conferência`, pois o valor devido depende da análise do financeiro. Um cancelamento confirmado sem obrigação usa o retrato auditável para reconhecer saldo zero; OS apenas marcada Cancelado, sem confirmação financeira preservada, continua sem apuração. Em obrigações existentes prevalece o saldo atual, incluindo baixas posteriores. Devolução já registrada não volta a aparecer como valor ainda a devolver.

A obrigação zerada por desconto integral passa a Quitado também no detalhe e nos filtros. A simulação do acerto usa POST com CSRF e as mesmas permissões da confirmação, sem gravar eventos, evitando enviar valores, justificativa e token no endereço da página.

Ensaio no navegador, exclusivamente com novas fixtures identificadas `QA Acerto 20261109`:

- **9067:** recebido fictício de R$ 200,00; diagnóstico combinado de R$ 50,00; simulação calculou R$ 150,00 a devolver; confirmação registrou despesa/devolução fictícia com referência e manteve R$ 50,00 líquidos, sem pendência.
- **9068:** técnico removeu uma peça não utilizada, com devolução pelo controle da OS; financeiro combinou R$ 80,00 com desconto de R$ 30,00; cancelamento confirmado manteve **R$ 50,00 a receber**.
- **9069:** técnico devolveu a peça e liberou a conferência; financeiro informou R$ 50,00 de diagnóstico e R$ 50,00 de desconto; encerramento sem pendência, sem recebimento ou devolução monetária.

Os pedidos e conferências técnicas ficaram com o usuário 9005; confirmações financeiras, com o 9007. O técnico não recebeu valores nem formulário financeiro. As fixtures foram preparadas com dados fictícios; as duas peças iniciais tiveram baixa de preparação e retorno pela UI. As OS existentes não foram modificadas. Não houve transferência de dinheiro nem envio de links ao cliente. As três fixtures permaneceram no laboratório para consulta; a fila saiu de três pendentes para zero.

Validação final: **1.894 testes / 9.050 asserções**, sem falhas; uma depreciação e um teste ignorado anteriores. PHPStan, formatação, escape, restrição de scripts inline e build passaram. Cobertura adicional: cancelamento sem obrigação exige evento confirmado, saldo atual prevalece sobre o retrato, devolução pendente difere de devolução executada e total zero não aparece como pagamento pendente. Os testes não simulam transferências bancárias externas nem concorrência real de múltiplos operadores.
