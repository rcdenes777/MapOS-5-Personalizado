# Prova de integração financeira — laboratório

Base: 47988e4. Branch local lab/trifase-financeiro. Não aplicada à v5-trifase,
à prévia 8200 nem à produção. Não há rotas ou telas novas acessíveis pelo usuário.

## O que foi executado

- Modelo Trifase com formalização de obrigação, recebimentos e estorno total de
  registro. Nenhuma dessas operações altera os.status.
- Migração aditiva das obrigações, eventos e vínculos de projeção; executada duas
  vezes nos testes para verificar reexecução. Nenhum legado convertido.
- Dinheiro em centavos; distribuição incremental do desconto restante. O último
  recebimento recebe o resíduo, sem recalcular parcelas de desconto anteriores.
- Um evento original de recebimento nunca é editado ou apagado ao estornar.
  Estorno cria outro evento com referência, motivo, autor e data.
- Chave única por operação; conteúdo conflitante é rejeitado. Repetição idêntica
  devolve o mesmo ID do evento e o resumo ATUAL, sem reproduzir saldo antigo.
- Os lançamentos nativos representam recebidos e saldo. A obrigação guarda os
  totais originais. Não somar eventos e lançamentos como duas receitas.
- A identidade de os.lancamento é preservada como saldo principal. Quitação torna
  sua projeção inativa; não a exclui. Estorno preserva também o ID da projeção do
  recebimento, zerando seus valores e inativando-a. O histórico original permanece
  no evento, não nos valores mutáveis da projeção.
- Financeiro_model e listagens financeiras de Relatorios_model omitem projeções
  inativas. Os agregados nativos conferidos não duplicam receita nem desconto.
- Atualização e exclusão pelo Financeiro_model rejeitam projeções geridas.
- Gravações transacionais com trava da OS no MySQL. Dois processos com conexões
  separadas disputaram o mesmo saldo: apenas um recebeu quando ambos o excederiam.

## Evidência

- Suíte completa: 1657 testes / 7725 asserções, sem falhas, uma depreciação
  preexistente. Onze testes financeiros no SQLite.
- PHPStan sem erros, usando configuração do projeto sem ampliar baseline.
- Integração MySQL 8.4/InnoDB com esquema original de banco.sql, somente dados
  fictícios: 25 verificações, incluindo rollback por trigger e concorrência real.
- Os testes executam os modelos nativos de financeiro/relatórios. No SQLite,
  verificam também o mês do pagamento separadamente do mês de vencimento.
- Não houve alteração de views, CSS ou JS; build de frontend não se aplica.

Teste unitário: tests/Unit/TrifaseFinanceiroLabTest.php.
Teste MySQL: tests/Integration/TrifaseFinanceiroMysql.php. Este último exige banco
TEMPORÁRIO previamente preparado com banco.sql, variáveis MYSQL_ROOT_PASSWORD e
MYSQL_DATABASE e saída /lab gravável. Não apontar para bancos reais: ele cria
fixtures de OS e um trigger de falha. Sua execução foi isolada em contêiner sem
portas publicadas; credenciais não fazem parte do código nem dos relatórios.

## Segunda etapa: jornada HTTP disponível

A aplicação fictícia em http://127.0.0.1:8210/index.php/trifase_financeiro/visualizar/1
agora permite formalizar, receber, corrigir recebimento e consultar histórico.
A tela da OS contém atalho e ação dedicada para mudar somente o andamento.
TRIFASE_FINANCEIRO_ENABLED é false por padrão; somente o laboratório usa true.
O recurso não depende de TRIFASE_PUBLICO_ENABLED nem expõe valores ao cliente.

Permissões no servidor e no mapa de rotas:
- Consultar: vOs + vLancamento.
- Formalizar: vOs + vLancamento + eOs + aLancamento; totais calculados pelo servidor.
- Receber: vOs + vLancamento + aLancamento.
- Estornar: vOs + vLancamento + estornarRecebimento. A nova permissão não é
  concedida automaticamente a grupos existentes; foi dada só ao operador fictício.
- Andamento dedicado: vOs + eOs. Preserva valores e grava os_historico na mesma transação.

Mutações requerem POST e CSRF do painel. O estorno usa modal-confirm e motivo;
não movimenta banco/gateway. Reenvio de recebimento é idempotente. O histórico
indica registros estornados sem apagá-los. Campos e mensagens usam componentes v5.

Proteções de compatibilidade desta etapa:
- Faturar antigo é bloqueado quando o experimento está ativo; interface encaminha
  ao financeiro dedicado, sem gerar status Faturado por faturamento do módulo.
- OS gerida não pode ser excluída, ter itens/valores editados ou usar edição geral
  antiga, mesmo com control_editos ligado. Atualização operacional é pela ação dedicada.
- API PUT/DELETE da OS gerida é bloqueada; alteração de itens usa a barreira
  isEditable. Não é uma API nova de recebimentos e ainda não há edição técnica geral.
- Edição/exclusão genéricas de lançamentos geridos respondem 409.
- Criação de cobrança externa para OS gerida responde 409 antes de chamar gateway.
  Formalização recusa OS com cobrança externa existente.
- Desligar o módulo oculta suas rotas, mas não retira as proteções dos registros
  já geridos nem desfaz recebimentos. Desativação não é rollback.

Validações adicionais: 23 cenários HTTP da jornada, quatro de proteções adicionais
(incluindo módulo desligado) e três negações autenticadas pela API. Login da API
usou configuração temporária própria de laboratório e foi desligado ao terminar.
No navegador foram verificados resumo, histórico, rótulos e modal de estorno;
a confirmação foi cancelada na inspeção visual, sem gerar outra operação.
Build completo e 23 testes JS aprovados. PHPUnit e PHPStan constam nos relatórios
atualizados da entrega. A depreciação preexistente da suíte não foi ampliada.

## Limites: ainda não promover para bases reais

- A nova jornada opera somente em OS formalizadas pelo módulo. O legado não foi
  convertido; seu vocabulário, relatórios históricos e garantias não foram reescritos.
- Ainda não há desfaturamento, ajuste de total após receber, cancelamento financeiro,
  reembolso bancário, estorno parcial, juros ou crédito excedente.
- A edição técnica oferecida nesta etapa é somente andamento; campos, anexos e
  anotações continuam sujeitos aos bloqueios antigos. Precisam ser separados dos
  itens que alteram valores antes de adoção completa.
- O módulo não permite o status Faturado como novo andamento. Formulários de OS
  legadas e filtros globais ainda conservam esse estado para compatibilidade.
- A garantia continua pelas regras legadas; como formalizar não muda o andamento,
  não começa apenas por faturar. Início na conclusão ou entrega exige regra comercial.
- Não foram exercitados gateways reais, estoque, devolução ou migração do legado.
- Estorno significa correção de registro; caixa de período encerrado e devolução
  efetiva de dinheiro precisam de tratamento próprio antes de uso real.
- As tabelas novas ainda precisam de desenho final de foreign keys, arquivamento
  e política de exclusão. O down da migração recusa reversão destrutiva implícita.
- É necessário endurecer a concorrência entre formalização e edição nativa dos
  itens ainda não faturados, fechando o cálculo do total sob o mesmo bloqueio.
  A prova anterior cobre concorrência entre recebimentos já formalizados.

## Isolamento e próxima entrega

O checkout de laboratório permanece em lab/trifase-financeiro; a branch v5-trifase,
a prévia 8200 e os ambientes antigos não receberam estas alterações. Sem push.
O servidor 8210 e seu MySQL próprio permanecem para inspeção, somente dados fictícios.
Credenciais e arquivos de ambiente estão fora do Git. O banco de laboratório usa
tmpfs: recriar/parar o contêiner pode exigir reconstruir fixtures.

Próxima etapa: separar edição técnica completa de edição dos valores, fechar
concorrência de formalização e avaliar migração/garantias. Só depois preparar
aplicação controlada na prévia. Não usar esta branch como atualização pronta.
