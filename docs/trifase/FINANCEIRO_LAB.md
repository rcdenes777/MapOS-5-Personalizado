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

- Suíte completa: 1645 testes / 7675 asserções, sem falhas, uma depreciação
  preexistente. Nove testes novos no SQLite.
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

## Limites: não promover diretamente

Isto comprova o núcleo e a integração dos totais, não a aplicação completa:
- O faturamento original de Os.php e a exclusão original continuam com o
  comportamento anterior. A prova chama o novo modelo diretamente.
- Não foram adicionados controller, autenticação/autorização por operação, CSRF,
  formulários, permissão de estorno ou proteção de todas as entradas da API.
- O modelo exige totais já calculados no servidor; um futuro controller não pode
  aceitar bruto/desconto livres do navegador.
- Ainda é necessário bloquear ou encaminhar caminhos que editam lançamentos
  diretamente, sem Financeiro_model, e tratar a mensagem de bloqueio na interface.
- Não há desfaturamento, mudança de valor após receber, cancelamento financeiro,
  reembolso bancário, estorno parcial, juros ou créditos excedentes.
- O estorno demonstrado é correção de registro, não devolução efetiva de dinheiro
  ou fechamento de caixa de período anterior. Estes precisam de regras próprias.
- A migração não foi validada em bases legadas. O down nega reversão destrutiva;
  desligar o módulo não é um rollback financeiro.
- Garantia, estoque, gateways, importação de legado e apresentação dos estados
  ainda não foram alterados nem certificados por esta prova.
- No laboratório, chaves de entidade não têm foreign keys adicionais nas tabelas
  novas; antes da adoção, definir integridade referencial e exclusão/arquivamento.

## Próxima entrega

Integrar uma jornada pela tela da OS, com permissões separadas, CSRF e regras de
edição técnica versus financeira. Impedir todos os caminhos antigos de contornar
as regras, revisar os testes de faturamento/status e validar em laboratório HTTP.
Apenas depois decidir migração do legado e aplicação na prévia. Sem push implícito.
