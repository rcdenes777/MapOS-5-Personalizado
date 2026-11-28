# Validação do portal do cliente — candidato 98600544

**Para avaliação pelo GPT Supervisor externo; não é aprovação de merge ou implantação.** Código revisado: `98600544661f08b699486998b5a60a26e94e23e3`; base da branch: `8c256cae4ddaeefad68922abddbb8addfe37c99d`. Este relatório não altera o código nem as capturas. O SHA do commit que o contém é distinto do SHA do código avaliado.

## Correções e verificações

- Uma exclusão de cliente podia confirmar a remoção de OS e vendas antes de falhar na exclusão do cliente. Reproduzido em MySQL sintético: cliente e lançamento permaneceram, mas OS e venda foram removidas. A correção usa uma transação compartilhada nos caminhos administrativo e de API, com bloqueio do cliente e rollback em falhas. No navegador e MySQL, uma restrição no lançamento preservou cliente, OS, venda, lançamento e token; um controle positivo excluiu cliente, OS, venda e token. Testes SQLite simularam falhas na OS, na venda e no cliente e verificaram a preservação dos registros e itens.
- Um painel podia consultar pagamentos com tabela de obrigações presente e tabela de eventos ausente. A disponibilidade financeira agora exige ambas as tabelas no portal de cliente, painel autenticado, link individual de OS e impressão. Os testes de painel e impressão incluem controles de tabela ausente e presente. O link individual passou pelo fluxo normal de navegador; sua condição específica de tabela ausente não teve teste direto.
- Uma exclusão malsucedida exibia sucesso no painel. O fluxo de navegador com cliente inexistente agora mostra erro, sem sucesso falso.
- Em um ensaio MySQL de duas rotações simultâneas, somente um token permaneceu válido. Em outro ensaio, rotação concorrente com exclusão não permitiu reutilizar token antigo após reutilização do identificador. Não são prova exaustiva de todas as interleavings.

## Revisão independente

A revisão DeepSeek anterior foi restrita aos limites registrados em `REVISAO_PORTAL_CLIENTE_1451fa5f.md`. A revisão complementar encontrou a falha de exclusão parcial e caminhos financeiros sem guarda de tabela. Uma revisão independente da correção transacional em `d2502caa280398f165853db2f1ac37e1fc9b4a70` não encontrou bloqueadores, mas apontou que uma exclusão de OS com zero linhas poderia passar como sucesso. Esse caso foi reproduzido com trigger SQLite, corrigido e reavaliado no delta até `98600544661f08b699486998b5a60a26e94e23e3`: parecer independente **passou**, sem bloqueadores no delta. O revisor também executou os dois testes em RED contra o pai e a suíte integral em cópia limpa. Modelo observado: `deepseek-flash`, provedor `deepseek`; esforço efetivo do provedor não comprovado. Parecer técnico não substitui o aceite externo.

A revisão visual Luna e os quatro blobs de captura identificados no relatório anterior permanecem válidos: não houve alteração de interface posterior. Seu alcance continua limitado às capturas, não a todas as interações ou estados.

## Evidência de execução

- PHPUnit em cópia limpa e sem rede do candidato: **2.076 testes, 10.933 asserções, 1 teste ignorado, 1 depreciação**, saída 0. O revisor independente repetiu a suíte com as mesmas contagens de testes/asserções/ignorados.
- Testes focados de atomicidade, disponibilidade financeira e impressão: **10 testes, 39 asserções**, saída 0. O fluxo de navegador sintético passou para isolamento, anexos, permissões, renovação/revogação, painel e exclusão com rollback/controle positivo.
- PHPStan: sem erros; PHP-CS-Fixer sem cache nos arquivos alterados: nenhuma correção necessária. `npm run build` passou em cópia descartável. Os **216 testes JS** passaram antes das últimas alterações exclusivamente PHP/testes; não foram repetidos sem necessidade.
- Uma tentativa de suíte dentro do contêiner do servidor, com flags e montagens do laboratório, falhou com erros de preparação/ambiente. Um comando posterior canalizado por `tail` informou saída 0 apesar de erros do PHPUnit; não é evidência de aprovação. A execução válida da suíte é a cópia limpa acima.

## Riscos e limites para aceite e implantação

- Não houve acesso à produção. O proxy e observabilidade precisam bloquear ou mascarar caminhos com token em logs de acesso, erro, traces e ferramentas de suporte; a configuração nginx versionada não implementa máscara específica para essas rotas. É condição operacional a verificar antes de ativar o acesso público.
- Exclusão direta em banco/importação fora da aplicação pode deixar link órfão; reuso de ID pode religá-lo a outro cliente. Backup/restauração também pode reativar tokens. Os caminhos normais do painel/API fazem limpeza transacional; scripts externos e restauros exigem controle de revogação e reconciliação.
- O revisor identificou, por inspeção, que a listagem de cancelamentos fora do portal ainda pode consultar eventos financeiros ausentes em migração parcial (`Trifase_cancelamento_model::pendentes`). Não foi corrigido nem verificado em execução nesta entrega.
- A rota de exclusão da API usa o mesmo método transacional, mas não houve ensaio HTTP específico da API; o contrato de erro pode passar de 409 para 500. Os drivers exercitados foram MySQL/mysqli e SQLite; outros drivers não foram validados. Bloqueios podem gerar deadlock e falha, sem retry automático.
- O procedimento de migração/reversão e de proxy em `PORTAL_CLIENTE_PUBLICO.md` continua proposto, não autorizado. Não houve merge nem deploy.

## Recursos

Trabalho em laboratório sintético existente, com duas revisões independentes principais e reavaliações incrementais. Tempos registrados das revisões retornadas: 353,82 s, 208,77 s, 238,96 s e 296,02 s, em etapas distintas; esforço efetivo e consumo/custo de tokens não estão disponíveis. Não interpretar esses tempos como custo financeiro.
