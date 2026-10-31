# Trifase: financeiro separado do andamento da OS

Extensão desenvolvida e testada na branch `lab/trifase-financeiro`, a partir de
`47988e4` da `v5-trifase`. A entrega é destinada à prévia local 8200; produção,
MapOS 4.55.2, master e trabalho permanecem fora do escopo. Sem push.

## Funcionamento

Na OS, **Financeiro da OS** registra a cobrança calculada pelos itens e descontos
atuais do servidor. Recebimentos parciais geram saldo e situação próprios:
Pendente, Parcialmente pago ou Quitado. Nenhum recebimento ou faturamento muda o
andamento do serviço. Finalizado pode ter saldo; Quitado pode estar Em Andamento.

O lançamento original representa o saldo pendente; recebimentos representam a
parte paga no financeiro nativo. Não somar eventos a lançamentos como duas receitas.
Dinheiro é tratado em centavos e o desconto é distribuído incrementalmente,
incluindo o resíduo no último recebimento. Projeções quitadas/estornadas ficam
inativas e zeradas, com IDs preservados. Listagens nativas omitem linhas inativas.

Reenvios idênticos são idempotentes; chaves com conteúdo diferente são recusadas.
O estorno corrige integralmente um registro, recompõe o saldo e cria evento
compensatório com motivo, data e autor. Não apaga o evento original nem devolve
recursos por banco ou gateway.

**Editar dados técnicos** permite equipamento, defeito, laudo, observações e
previsão após o faturamento. Anexos e anotações permanecem disponíveis para quem
pode editar OS. Novos anexos continuam privados até autorização no Link público.
A tela técnica recusa campos financeiros, cliente, técnico responsável e status.
Produtos, serviços e descontos faturados ficam protegidos, mesmo com
control_editos ligado. Os caminhos antigos e a API respeitam essas barreiras.

## Garantia e legado

Para OS geridas pelo módulo, a primeira mudança dedicada para Finalizado registra
a conclusão de hoje. A garantia usa essa data, não o vencimento financeiro nem a
previsão de entrega. Reabertura, nova previsão e pagamentos não reiniciam a garantia.
Se a OS já estava finalizada ao ser formalizada/conciliada, exige informar sua data
real de conclusão; nenhuma data passada é adivinhada. A data registrada é preservada.
Painel, área do cliente e impressões usam a mesma referência.

Nada é convertido automaticamente. OS antigas mantêm status, valores, vínculo e
datas. Mesmo sem conciliação, podem receber laudo, observações, anexos e anotações;
sua data final fica protegida porque ainda referencia a garantia antiga.

**Conferir faturamento antigo** oferece conciliação individual apenas quando há
um lançamento de receita explicitamente vinculado, exclusivo da OS, do mesmo
cliente, pendente, com valores consistentes, sem venda/cobrança externa ou possível
duplicidade. Exige confirmação e escolha do andamento real. Reutiliza o ID, valores
e vencimento originais sem criar outra receita. Não transforma Faturado em Finalizado
em lote. Pagamento antigo, vínculo ausente ou ambiguidade exigem revisão manual;
não há importação automática de pagamentos.

## Concorrência e integridade

Edição monetária nativa, API, faturamento e operações financeiras compartilham
transação e trava de linha da OS no MySQL. O faturamento calcula os itens depois de
obter a trava. Edição/exclusão genérica do lançamento legado também trava a OS
antes da conciliação. Sete foreign keys RESTRICT protegem vínculos da extensão.
Não há cascata que apague o histórico financeiro.

## Instalação e permissões

`TRIFASE_FINANCEIRO_ENABLED=false` por padrão. Ativação é por instalação. Aplicar
as migrações aditivas 20261031120000, 20261031130000 e 20261031140000 antes de ativar.
O nome histórico da primeira migração conserva o sufixo `_lab`; não renomeá-la.
Elas não reescrevem OS existentes. A reversão destrutiva automática é recusada.
Desligar o módulo oculta as rotas, mas mantém a proteção dos registros geridos;
não desfaz recebimentos nem substitui uma restauração.

Permissões conferidas no servidor e no mapa de rotas:

| Ação | Permissões |
| --- | --- |
| Consultar financeiro | vOs + vLancamento |
| Formalizar | vOs + vLancamento + eOs + aLancamento |
| Receber | vOs + vLancamento + aLancamento |
| Estornar | vOs + vLancamento + estornarRecebimento |
| Dados técnicos, conclusão e andamento | vOs + eOs |
| Conciliar legado | vOs + vLancamento + eOs + eLancamento |

EstornarRecebimento não é concedida automaticamente a grupos existentes. Mutações
do painel exigem POST e CSRF. A API existente permite anotações técnicas autorizadas,
mas não implementa novos endpoints de recebimento. Cobranças externas de OS são
bloqueadas enquanto o módulo está ativo; cobrança existente impede formalização.

## Evidências da entrega

- PHPUnit: 1667 testes, 7788 asserções; uma depreciação preexistente, sem falhas.
- PHPStan: sem erros, sem ampliar baseline. Build e 23 testes JS aprovados.
- 23 cenários HTTP financeiros, 25 técnicos/garantia/legado, quatro proteções
  adicionais e quatro verificações autenticadas da API, somente fixtures em 8210.
- Disputa real com dois usuários, quatro workers PHP e MySQL/InnoDB: edição
  iniciada depois do faturamento espera e é recusada; faturamento iniciado depois
  da edição espera e inclui o novo item. Quatro verificações aprovadas.
- Prova anterior MySQL de 25 verificações: centavos, descontos, relatórios nativos,
  rollback induzido e dois recebimentos concorrentes sem exceder o saldo.
- Backup integral privado da prévia, restauração de 3639 arquivos com comparação
  de conteúdo e banco idêntico. Migrações repetidas na cópia restaurada, preservando
  todas as tabelas antigas exceto a versão de migrations; nenhuma OS convertida.

Os relatórios detalhados ficam em outputs no workspace. Credenciais, ambientes,
bancos e backups privados ficam fora do Git. Os testes destrutivos usam somente
banco temporário; nunca executar fixtures contra a prévia ou produção.

## Atualizações e limites

Regras, telas e tabelas próprias ficam sob prefixo Trifase. Há pequenos pontos de
integração nos controllers/modelos nativos para proteger valores, mostrar atalhos,
filtrar projeções e calcular garantia. Não é um plugin independente de versão:
na atualização upstream, revisar esses pontos e repetir a suíte. Preservar o
APP_ENCRYPTION_KEY e armazenamento, pois protegem links e arquivos existentes.

Sem ajuste do total após faturar, desfaturamento, cancelamento financeiro, estorno
parcial, reembolso bancário, juros, excedente ou fechamento de caixa. Gateways reais,
importação de pagamentos antigos e adoção em produção continuam fora da entrega.
Rollback de código isolado é insuficiente após novos recebimentos; conciliar antes
ou restaurar arquivos e banco do mesmo ponto, sem perder operações posteriores.
Penpot e modernização visual ficam para depois da validação funcional pelo usuário.
