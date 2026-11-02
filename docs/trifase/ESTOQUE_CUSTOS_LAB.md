# Estoque auditável e custos registrados na OS

Implementado no laboratório8230 em02/11/2026. Flag `TRIFASE_ESTOQUE_ENABLED=false` por padrão. Migração20261102060000 adiciona `trifase_estoque_eventos`, `trifase_os_custos` e `trifase_servico_custos`; sem modificar saldos ou inferir custos antigos.

## Movimentação

A ficha do produto abre **Movimentar estoque e consultar histórico**. Entrada exige quantidade positiva, custo unitário, data até hoje, motivo e confirmação. Atualiza saldo e custo de referência de compra para os próximos usos, preservando preço de venda e custos anteriores. Não é média ponderada, FIFO ou rastreamento por lote; custo de referência pode ser corrigido explicitamente por item da OS quando se conhece o custo daquele uso.

Saída manual exige quantidade positiva e motivo; saldo insuficiente é recusado. Na contagem, o usuário informa o saldo físico, inclusive zero. O servidor compara o saldo visto com o atual sob trava; havendo diferença concorrente, pede nova conferência em vez de sobrescrever o saldo. Registro repetido com mesma chave/payload é idempotente; payload diferente é recusado.

Histórico registra saldo antes/depois, diferença, tipo, origem, data informada e horário real de registro, motivo e operador. Filtros por período/tipo e páginas de50 registros. Datas retroativas não reordenam saldos: a ordem é a gravação. Saldos legados não geram movimentos antigos fictícios. Produto criado pelo formulário nativo grava o saldo inicial na mesma transação; não é uma compra inferida.

A edição comum de produto não altera estoque: usa a quantidade do servidor para validar e descarta o campo no UPDATE, evitando contagem antiga sobre uma baixa concorrente. O atalho anterior de ajuste orienta para a movimentação com motivo. Produtos com histórico não são excluídos; para movimentá-los após desligar a flag, reativar o módulo. Não apagar tabelas para desativar a apresentação.

## Custos separados de preço e caixa

Ao incluir produto na OS, guarda quantidade e custo de compra vigente sob trava. Ao incluir serviço, guarda o custo interno de referência explicitamente cadastrado em **Custo interno e histórico deste serviço**. Não usa preço de venda como custo de mão de obra. Serviço sem referência fica desconhecido; zero só é custo conhecido quando informado como tal.

A OS oferece **Consultar peças, serviços e custos registrados**. Mostra composição, itens desconhecidos e versões. Custos antigos sem registro continuam desconhecidos, nunca preenchidos com preço atual. Pode informar ou corrigir custo unitário específico com referência/motivo, confirmação, controle de versão e idempotência; versões anteriores permanecem. O título do item conserva a identificação capturada, separado do motivo da correção.

Remover item tira seu custo da composição atual, conserva o histórico e devolve a quantidade efetivamente gravada ao estoque quando o controle nativo está ligado. OS cancelada não soma os custos dos itens; registros permanecem. No retorno, peças/serviços e custos adicionais declarados pela equipe aparecem separados, com acesso à composição. Evitar registrar o mesmo custo como item e como custo adicional. Custos desconhecidos e trabalho não informado tornam a composição incompleta; o total não é lucro líquido, despesa paga ou cálculo fiscal.

A adição nativa de item, sua captura de custo e baixa usam uma transação comum e trava de produto, além da trava de OS. Uma disputa pelo último saldo confirma uma inclusão e reverte a outra integralmente. Cancelamento/reativação/exclusão da OS reutilizam os movimentos nativos auditados. Vendas nativas compartilham o estoque e passam a travar a venda/transacionar seus itens e movimentos; não foram implementados cancelamento financeiro, estorno ou custo histórico de vendas.

## Permissões e limites

Consultar estoque exige `vProduto`; movimentar também `eProduto`. Consulta de custos da OS exige `vOs+vLancamento`, e informar/corrigir também `eOs`. Custo de serviço exige `vServico+vLancamento`; edição também `eServico`. Rotas recusam POST sem CSRF. Valores de custo são filtrados no servidor; não entram no link público, área do cliente ou impressões existentes. Sem novas concessões além das seis permissões nativas explicitamente autorizadas no laboratório.

API permanece desligada no laboratório. Com a flag de estoque ligada, escritas da API de produtos/OS são recusadas com orientação para o painel até existir contrato auditável equivalente; leituras mantêm o comportamento existente. Exclusão de OS/cadastro com histórico é protegida mesmo após desligar a flag. Não houve ensaio HTTP da API nem migração de saldos de produção.

## Verificação e recuperação

Backup privado do8230 salvo antes das duas migrações. Migrações aplicadas duas vezes, preservando registros de21 tabelas por chaves/hashes, incluindo OS3 do usuário. Fixtures novas9040–9043 e produto9042, sem redefinir as antigas.49 checks HTTP (35 básicos+14 complementares), entrada real pelo navegador, concorrência em dois processos PHP/MySQL (uma baixa confirmada, outra recusada e sem órfãos), snapshots de custos e testes unitários. Capturas cliente/estoque/custos em largura CSS efetiva360, sem rolagem horizontal; não equivale a celular físico ou QA completo.

O ambiente mantém arquivos/configuração/dumps fora do Git. Reversão operacional requer banco/arquivos coerentes e reconciliação dos movimentos; não desfazer uma baixa apenas trocando branch ou editando saldo diretamente. Flag desligada não remove o histórico nem libera exclusões destrutivas.
