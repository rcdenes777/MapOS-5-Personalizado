# Homologação do MapOS 5 Personalizado

Ambiente: laboratório local 8230, banco mapos_ui_piloto, branch v5-trifase. Identifique o commit testado em cada etapa. Use dados fictícios com prefixo HOMOLOG e anote os números das OS. Use os perfis técnico, financeiro e administrador em sessões identificadas. Preserve os registros de teste como evidência. Teste o link público em uma sessão anônima local. Use arquivos fictícios e registre pagamentos simulados no sistema, sem envio de mensagens ou transferência de dinheiro.

Execute as etapas em sequência e registre cada resultado. Pause quando o usuário avisar que a cota chegou a 10%. Registre ambiente, commit, perfil, OS, resultado esperado e observado. Use PASS, FAIL, BLOQUEADO ou NÃO EXECUTADO. Em uma falha, registre como reproduzir e o efeito, sem guardar senhas, links com token ou dados pessoais. Bloqueie as etapas dependentes se houver risco para estoque, caixa ou permissões.

| Etapa | Ações | Critérios de aceite |
| --- | --- | --- |
| 0. Preparação | Confirmar versão, portas, web e banco do laboratório, acesso inicial e perfis disponíveis. Registrar o ponto de partida. | Aplicação 8230 acessível, banco isolado confirmado e dados do teste identificáveis. Conferir login e permissões no início da etapa 1. |
| 1. Acesso e cadastros | Entrar com cada perfil. Abrir painel, OS, cadastros e financeiro. No técnico, buscar cliente digitando uma letra, cadastrar cliente fictício pela Nova OS e confirmar o retorno ao formulário. Criar produto com estoque e serviço com valores conhecidos no perfil autorizado. Criar unidade sem selo e reutilizá-la em outra entrada do mesmo cliente. | Busca filtra a lista, cadastro rápido mantém os dados do formulário, unidade fica no cliente correto, valores e rotas financeiras são protegidos para o técnico. |
| 2. Atendimento normal | Criar OS fictícia. Registrar defeito e laudo, incluir peça e serviço, publicar o orçamento e aprovar pelo link. Formalizar a cobrança, registrar dois pagamentos em momentos distintos, finalizar e entregar. | Versão aprovada no histórico, estoque baixa na quantidade certa, saldo diminui e zera, recebimento não muda o andamento. A OS entra em Aguardando retirada ao finalizar e sai ao entregar. Filtro Entregues mostra data e hora. |
| 3. Recusa e revisão | Em outra OS, publicar versão 1 e recusar pelo link. Revisar itens, publicar versão 2 e registrar a resposta recebida por telefone com a equipe autorizada. Tentar registrar outra resposta na versão antiga e conferir as opções de Editar OS. | Recusa vinculada à versão 1 e exibida na fila enquanto vigente. Versão 2 volta à negociação, a resposta interna identifica o operador, histórico preservado, versão antiga rejeitada e recusa manual indisponível. |
| 4. Cancelamento com peça e pagamento | Em uma terceira OS, incluir peça e serviço e registrar pagamento parcial. Solicitar cancelamento, tentar finalizar, devolver peça não usada como técnico e conferir a etapa financeira como usuário autorizado. Apurar o valor e registrar o acerto simulado. Confirmar o cancelamento e a retirada. | O técnico consegue devolver a peça, com estoque recomposto uma vez, e não consegue confirmar acerto financeiro. A finalização é bloqueada durante o pedido. O saldo e a devolução batem com o cálculo. Depois da confirmação, a OS sai de Cancelamentos pendentes e fica em Aguardando retirada até a entrega. |
| 5. Entrega, garantia e histórico | Testar retirada por terceiro, com nome e autorização, e entrega com saldo em aberto após confirmação. Corrigir um comprovante de teste. Buscar uma entrega pelo selo e abrir retorno vinculado. Conferir as opções de reparo, troca, novo orçamento e reembolso com dados de teste. | Comprovante e correção auditáveis, saldo preservado na entrega, retorno vinculado à OS original e ao histórico. Troca e devolução só mudam estoque e caixa conforme o fluxo escolhido e as permissões. |
| 6. Anexos e link público | Anexar imagem, vídeo e PDF. Abrir imagem e vídeo no visualizador. Publicar só um anexo, testar anônimo e tentar acessar outro pelo endereço direto. Despublicar e revogar o link. Conferir tela pequena e, se viável, o limite de 200 MiB pelo navegador. | Miniaturas e visualização funcionam, anexos privados continuam inacessíveis ao público, despublicação e revogação funcionam. Se o upload de fronteira ou aparelho físico não puder ser testado, registrar o limite da evidência. |
| 7. Fechamento | Conferir filas e filtros com as OS criadas, contas a receber/pagar e movimentações. Comparar estoque, saldo e histórico com os valores anotados. Rodar regressão adequada ao commit final. Listar os achados por gravidade. | Nenhuma divergência de estoque, caixa, privacidade ou permissões em aberto para liberar uso acompanhado. Pendências visuais têm registro e prioridade. Para eventual entrada em produção, verificar backup e restauração em cópia isolada antes de migrar. |

## Registro

| Etapa | Commit | Resultado | Evidência e próximo passo |
| --- | --- | --- | --- |
| 0 | fb5a2d3 | PASS | Web e banco ativos. Login em 127.0.0.1:8230 respondeu HTTP 200. Consulta de leitura confirmou o banco mapos_ui_piloto no serviço mapos5-ui-piloto-db. Login por perfil fica para a etapa 1. |
| 1 | fb5a2d3 | PASS | Concluída em 11/11/2026 no laboratório 8230. Evidências abaixo. |
| 2 | fb5a2d3 | PASS funcional, com falha de atualização | OS 9072, aprovada, quitada, finalizada e entregue. Ver evidências abaixo. |
| 3 | fb5a2d3 | PASS nos fluxos de interface | OS 9071. Recusa pelo link, revisão e aprovação interna registradas. |
| 4 | fb5a2d3 | FAIL / BLOQUEADO | OS 9073. Devolução de peça bloqueada depois da cobrança formalizada. |
| 5 | fb5a2d3 | PASS com cobertura mista | Entrega, saldo, busca por selo e retorno conferidos no navegador. Troca, reembolso e regras do novo orçamento cobertos na suíte automatizada. |
| 6 | fb5a2d3 | PASS | Upload, visualização, privacidade, revogação e fronteira de 200 MiB confirmados no navegador. |
| 7 | fb5a2d3 | BLOQUEADO para liberar uso | Regressão sem falhas. Corrigir e repetir o cancelamento faturado da OS 9073 antes de liberar. |

### Etapa 1 — evidências e dados para a próxima etapa

- **Técnico.** Login no painel confirmado. Em Nova OS, a busca de cliente abriu com 10 sugestões e passou a 5 ao digitar uma letra. A busca sem resultado abriu o cadastro rápido. O cliente fictício foi selecionado após salvar e o defeito digitado permaneceu no formulário. O acesso direto a Financeiro das OS retornou ao painel com mensagem de permissão negada. A OS 9064 mostrou peças e serviços sem preços nem subtotais para esse perfil.
- **Equipamento.** A OS 9071 registrou a unidade HOMOLOG · Placa Etapa 1 sem selo. A OS 9072 reutilizou o mesmo cliente e unidade, com novos itens recebidos, estado de entrada e defeito. O histórico do equipamento exibiu as duas OS.
- **Financeiro.** Login confirmado e tela Financeiro das OS aberta pelo menu.
- **Administrador.** Login confirmado, menus de configurações e financeiro presentes e cadastros realizados pelo catálogo.
- **Peça de teste 9051.** HOMOLOG Peça Etapa 1 20261111. Estoque inicial 10 unidades, compra R$ 20,00 e venda R$ 50,00.
- **Serviço de teste 9051.** HOMOLOG Serviço Etapa 1 20261111, R$ 100,00. Os identificadores de produto e serviço pertencem a cadastros separados.

O laboratório estava desligado no início da retomada. Os dois serviços existentes foram religados e o login foi confirmado antes de gravar novos dados. A etapa 2 pode usar a OS 9072, a peça e o serviço fictícios, com total esperado de R$ 150,00 para uma unidade de cada, antes de descontos.


### Etapa 2 — atendimento normal, 11/11/2026

- Técnico incluiu uma peça de R$ 50,00 e um serviço de R$ 100,00 na OS 9072. Estoque da peça 9051 passou de 10 para 9. Administrador publicou a versão 1, com total de R$ 150,00. Sessão anônima local aprovou a proposta e a OS passou a Aprovado.
- Financeiro formalizou a cobrança e registrou recebimentos fictícios de R$ 60,00 e R$ 90,00, eventos 10 e 11. Saldos verificados: R$ 150,00 → R$ 90,00 → R$ 0,00. Andamento permaneceu Aprovado. Tentativa acima do saldo foi recusada sem gravar recebimento.
- Técnico finalizou a OS. A fila de retirada exibiu 9072 como Finalizado e Aguardando retirada. A ação de registrar entrega não aparecia para o técnico. Administrador registrou a retirada, comprovante 10, em 11/11/2026 às 10:07. A OS saiu da fila e apareceu em Entregues com data e hora.
- **Falha visual reproduzida:** ao confirmar a entrega a partir da aba Entrega, o servidor grava o comprovante, mas a tela continua mostrando “Entrega não registrada” até recarregar. Após recarregar, mostrou entrega registrada e comprovante. A repetição com a mesma operação não duplicou o registro observado. Investigar a navegação para a mesma URL com fragmento, usada no retorno da entrega.


### Etapa 3 — recusa e revisão, 11/11/2026

- Na OS 9071, a versão 1 (R$ 100,00) foi recusada em sessão anônima local. A fila Orçamentos recusados passou a exibir a OS.
- Adicionar uma peça à OS retirou a recusa antiga da fila. A versão 2 (R$ 150,00) voltou a Negociação com resposta pendente.
- A aprovação simulada por telefone foi registrada pelo administrador na versão 2. A OS passou a Aprovado. O histórico mostrou a recusa da versão 1 pelo link e a aprovação da versão 2 registrada pela equipe.
- O envio forjado contra a versão anterior não foi feito pela interface nesta rodada. O cenário é coberto por TrifaseOrcamentoTest no código.


### Etapa 4 — cancelamento com peça e pagamento, 11/11/2026

- OS fictícia 9073 com uma peça de R$ 50,00 e um serviço de R$ 100,00. Financeiro formalizou cobrança de R$ 150,00 e recebeu R$ 60,00 fictícios (evento 12), saldo R$ 90,00.
- Técnico registrou desistência do cliente e tentou finalizar a OS. O sistema bloqueou a finalização e orientou resolver ou retirar o pedido. A ação de confirmação financeira não foi oferecida ao técnico.
- **Bloqueio de fluxo:** no pedido pendente, abrir Devolver peça não utilizada, marcar que a peça está apta e confirmar. A tela responde “Valores de OS faturada ou cancelada não podem ser alterados”. A peça permanece vinculada e Concluir conferência técnica continua indisponível. O financeiro não pode avançar ao acerto; a OS ficou pendente. Reproduzido no navegador, sem alteração de dados por fora do fluxo. O controle de edição de itens em Os::osParaAlterar rejeita OS faturada antes de tratar a devolução dentro do cancelamento.


### Etapa 5 — entrega e garantia, 11/11/2026

- OS 9071 formalizada em R$ 150,00 e recebimento fictício de R$ 60,00 (evento 13). Entrega por terceiro identificado, com autorização de teste, gerou comprovante 11. Após a entrega, financeiro mostrou Finalizado, Parcialmente pago e saldo R$ 90,00.
- Corrigido o comprovante 11 com justificativa fictícia. A tela passou a mostrar Entrega não registrada após recarregar, e o histórico preservou o registro e a justificativa.
- Na OS 9072, associou-se o selo fictício HOMOLOG-9072. O retorno 9074 foi aberto em avaliação, com link para a origem 9072 e referência à garantia original de 90 dias. O formulário mostrou Reparo sem cobrança, Novo orçamento, Troca e Devolução de dinheiro.
- Na Nova OS, após selecionar o cliente fictício, a busca por HOMOLOG-9072 encontrou a unidade 15. No retorno 9074, foi registrada a avaliação Coberto e Reparo sem cobrança. A interface confirmou que a avaliação não gerou pagamento, orçamento ou estorno.
- Troca com baixa de estoque, troca externa, reembolsos parcial e total, correções, idempotência e exigência de aprovação para novo orçamento foram verificados pelos casos da suíte TrifaseGarantiaOperacoesTest. Esses desfechos não foram executados pelo navegador nesta rodada.


### Etapa 6 — anexos e link público, 11/11/2026

- Na OS 9072, envio pelo seletor de arquivo aceitou PNG, MP4 e PDF. A imagem abriu no modal com zoom. O MP4 abriu no modal com controles e mídia carregada. Os três anexos começaram privados.
- Publicada só a imagem 25. Sessão anônima local mostrou somente essa imagem. Tentativa direta de baixar o MP4 privado 26 pelo mesmo link retornou 404. Despublicar a imagem deixou a seção sem arquivos compartilhados. Revogar o link fez a abertura anônima retornar 404. Os anexos permanecem privados na OS.
- A tela, recarregada em largura emulada de 390 px, coube na janela. Aparelho físico não testado. O MP4 de 209.715.200 bytes foi aceito pelo seletor e apareceu como quarto anexo privado. O de 209.715.201 bytes foi rejeitado pelo limite de upload do PHP e não criou outro anexo.

### Etapa 7 — fechamento, 11/11/2026

- Conferidas as áreas Contas a receber, Contas a pagar e Movimentações. Estoque final da peça 9051: 7 unidades, coerente com 10 iniciais e três inclusões nas OS 9072, 9071 e 9073. A devolução na 9073 foi bloqueada, portanto a unidade permanece vinculada.
- OS 9072 quitada e entregue. OS 9071 com saldo R$ 90,00 após a retirada e correção auditável. OS 9073 ainda na fila de cancelamento, com saldo R$ 90,00. Retorno 9074 vinculado à 9072 e avaliado como coberto.
- Regressão do commit fb5a2d3 no ambiente isolado: 1.924 testes, 9.271 asserções, zero falhas, uma depreciação e um teste ignorado.
- **Bloqueador para liberar:** implementar devolução auditável de peça no cancelamento faturado, com proteção para alterações avulsas e preservação do valor original cobrado. Reexecutar a etapa 4 do bloqueio até o acerto e a retirada.
- **Falha de interface:** atualizar a aba Entrega imediatamente após gravar ou corrigir o comprovante. Reexecutar os dois caminhos no navegador.
- Nenhuma mudança de código, permissão ou produção foi feita durante esta rodada. As OS e anexos fictícios ficaram no laboratório para reprodução.

### Revalidação após as correções — 11/11/2026

| Etapa | Commit | Resultado | Evidência |
| --- | --- | --- | --- |
| 4 | eb30ad5 | PASS | Técnico devolveu uma peça não utilizada e retirou o serviço não executado na OS 9073. A conferência técnica liberou o acerto, disponível ao perfil financeiro. O estoque da peça 9051 passou de 7 para 8, com um movimento de devolução vinculado ao pedido 24. |
| 4 | eb30ad5 | PASS | O financeiro conferiu a cobrança original de R$ 150,00, o recebimento fictício de R$ 60,00 e o saldo original de R$ 90,00. Com valor devido zero, o cálculo mostrou R$ 60,00 a devolver. O evento financeiro 14 registrou a devolução fictícia, o saldo ficou zerado e a OS ficou cancelada. |
| 2, 4 e 5 | 1ec30be | PASS na atualização de entrega | Administrador registrou a retirada da OS 9073, corrigiu o comprovante 13 (evento 14) e registrou novamente (comprovante 15). A aba mudou de estado após cada confirmação, sem atualização manual. A lista filtrada por Entregues mostrou a OS e o horário da retirada. |
| 7 | 1ec30be | PASS para os casos revalidados no laboratório | Suíte PHP com 1.926 casos reportados, sem falhas, com um ignorado e um aviso de depreciação. Suíte JavaScript com 28 casos aprovados. Verificações de formatação e de escape concluídas. |

Os registros de estoque, recebimento e devolução acima são do laboratório 8230. A execução de troca, novo orçamento e reembolso de garantia continua com cobertura automatizada na homologação atual. Migração e restauração em uma cópia da base real são etapas futuras para eventual entrada em produção.
