# Navegação financeira

O menu lateral Financeiro oferece quatro áreas, sem criar tabelas ou registros duplicados:

- Financeiro das OS: `financeiro/ordens`, com as permissões vLancamento e vOs já existentes.
- Contas a receber: `financeiro/receber`, receitas pendentes, incluindo parciais e vencidas.
- Contas a pagar: `financeiro/pagar`, despesas pendentes.
- Movimentações: `financeiro/movimentacoes`, somente lançamentos baixados, por data de pagamento.

Os três últimos acessos reutilizam a listagem e os mesmos lançamentos. O parâmetro area é validado e preservado nos filtros, na paginação e nos retornos dos formulários; as contas fixam tipo/situação coerentes e permitem restringir às vencidas. A área Movimentações fixa pago e permite escolher entrada ou saída. Pendências abrem em Todo o período para não ocultar débitos de meses anteriores; movimentações abrem no mês atual, com filtro de período disponível.

O filtro de data das contas usa vencimento; nas movimentações usa pagamento, inclusive em contagem e totalização. Limpar filtros mantém a área. Ao salvar um lançamento de outro tipo, o retorno deixa a área incompatível, preservando o comportamento anterior da listagem.

Os acessos novos usam vLancamento, sem conceder permissões a perfis. O acesso anterior financeiro/lancamentos continua válido para consultas gerais e links existentes. As abas Lançamentos / OS e recebimentos foram removidas; o atalho do detalhe da OS agora diz Financeiro das OS. Cobranças online identifica o módulo de cobranças já existente, separado das contas.

Validação: menus com e sem permissões, parâmetros contraditórios, pendências fora do mês, pagamento em mês diferente do vencimento, renderização dos filtros, paginação e retorno. Navegador conferido no laboratório 8230 com a conta administradora de teste; nenhuma operação financeira executada para validar a navegação.
