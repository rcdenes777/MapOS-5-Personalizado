# Execução das soluções de garantia — laboratório 8230

Etapa implementada sobre `v5-trifase`. Somente o laboratório 8230 recebeu a migração, a flag e as duas permissões novas. Não houve push, alteração de produção ou mudança do protótipo Penpot.

## Fluxos

- **Novo orçamento:** utiliza a própria OS de retorno, seus itens e o publicador existente. Registra a versão publicada no histórico de operações. Exige versão vigente, aprovada pelo cliente e ainda correspondente aos itens e valores para faturar. Aprovação não fatura automaticamente. Nova versão permite recusa/revisão pelo fluxo existente.
- **Troca do estoque:** identifica outra unidade física e retira exatamente uma unidade do produto escolhido, sob transação e trava de estoque. Captura o custo conhecido; não cobra a substituta do cliente. O produto do estoque e o modelo físico são seleções independentes e devem ser conferidos pelo operador.
- **Troca externa:** cadastra outra unidade sem alterar estoque; custo declarado é opcional, sem inferir despesa paga. Ambas as modalidades exigem selo, série ou IMEI da substituta, destino da antiga, motivo e confirmação.
- **Devolução parcial:** registra dinheiro já devolvido, gera despesa paga e abate o mesmo valor na obrigação original. Exemplo: total 500, recebido 200 e saldo 300; devolver 50 resulta em total 450, recebido líquido 150 e saldo 300.
- **Encerramento total:** exige devolver exatamente todo o recebido líquido e abate também o saldo restante. No exemplo anterior, devolver os 150 restantes abate 450 e zera obrigação, recebido líquido e saldo. Se já não houver recebido líquido, permite encerramento de saldo com valor zero; a projeção sem movimento de caixa fica inativa.
- **Correção de devolução lançada por engano:** exige também `estornarRecebimento`, motivo e confirmação de que não houve transferência. Preserva o evento e a despesa anteriores, registra cancelamento e recompõe o financeiro. Não executa transferência inversa. A consistência é revalidada na mesma transação.

## Históricos e limites

A identificação recebida na OS permanece imutável. A unidade antiga não aparece como opção para novos vínculos e permanece acessível no histórico, ligado à substituta. A entrega usa a identificação da substituta no comprovante. Novo retorno iniciado a partir da troca concluída usa a substituta e mantém a origem e o prazo anteriores; não concede automaticamente outra garantia.

Troca/devolução não mudam automaticamente andamento ou entrega. Não se conclui uma solução de troca/devolução ainda não executada. A avaliação fica protegida depois da execução. Antes de executar troca/devolução, a OS de retorno não pode ter cobrança própria, entrega ativa ou orçamento publicado ativo. A troca registrada não tem desfazer automático: uma correção física exige conciliação específica; não apague registros.

Não há integração bancária, transferência Pix automática nem reembolso automático na adquirente do cartão. Referência do comprovante e motivo ficam no painel financeiro; não são publicados ao cliente. O financeiro legado exige conciliação antes do reembolso. Os custos declarados da substituta e os custos adicionais do retorno são separados para evitar dupla contagem.

## Ativação controlada

1. Backup coerente do banco/arquivos e conferência do isolamento.
2. Aplicar migrações até `20261102070000`; cria `trifase_garantia_operacoes`, `trifase_garantia_trocas` e `trifase_garantia_reembolsos`, com vínculos protegidos.
3. Manter os módulos de equipamentos, atendimentos, retornos, orçamento e financeiro habilitados; a troca com estoque utiliza também seu registro de movimentos.
4. Definir `TRIFASE_GARANTIA_OPERACOES_ENABLED=true` somente na instalação autorizada. Padrão: `false`.
5. Conceder explicitamente `trocarGarantia` e/ou `reembolsarGarantia` aos perfis adequados. Nenhum perfil é promovido pela migração. Consulta de dinheiro exige `vLancamento`; editar OS não concede reembolso.

Desligar a flag esconde as novas operações, mas preserva seus efeitos financeiros, bloqueios e histórico. Não remova tabelas para voltar atrás. A migração não oferece rollback destrutivo; restauração exige reconciliação conjunta.

## Validação desta etapa

- 15 testes comportamentais novos, cobrindo idempotência, excesso, prévia financeira antiga, identidade, falta de estoque, correção, encerramento zero, conclusão pendente e orçamento aprovado com itens iguais.
- Suíte completa: **1801 testes, 8457 assertivas**, sem falhas/erros; uma depreciação e um skip já existentes. PHPStan sem erros, 23 testes JS aprovados, build e escape aprovados; baselines não foram ampliados.
- Playwright real no laboratório: duas trocas, parcial/total, correção preservando cancelado, três negativas de permissão, privacidade financeira, autocomplete de produto/modelo, aprovação pública e faturamento posterior. Comprovante real da entrega identifica a substituta; formulário de outro retorno referencia essa unidade.
- Duas conexões PHP/MySQL simultâneas para o mesmo saldo: uma confirmação, uma rejeição por mudança do financeiro.
- Auditoria de todas as linhas anteriores em 50 tabelas (permissões tratadas separadamente por autorização), incluindo OS3, sem perda ou alteração. Novos dados de ensaio ficam em cliente/produto/serviço 9050 e OS 9050–9057.
- Capturas desktop e 360 px verificadas; não substituem a futura bateria completa de regressão e aparelho físico.

### Registros disponíveis para revisão

- Retorno 9054: troca externa concluída e entregue; comprovante da substituta.
- Retorno 9055: troca com saída de uma unidade do produto 9050.
- Retorno 9056: parcial, total cancelado por correção e novo total confirmado no ensaio concorrente. Origem 9052 encerrada financeiramente, eventos preservados.
- Retorno 9057: serviço selecionado pelo navegador, orçamento aprovado pelo cliente fictício e cobrança própria pelo total efetivamente publicado (400 reais), sem pagamento automático.

Evidências detalhadas estão no diretório local `outputs/ui-piloto/garantia-*`, fora do repositório. Backups, credenciais e token de ensaio permanecem em arquivos privados do laboratório e não entram em commits.
