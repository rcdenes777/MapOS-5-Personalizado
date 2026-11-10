# Início operacional simplificado

Atualização no laboratório 8230 em 10/11/2026.

O início concentra indicadores de OS, agenda/lista filtrada e avisos curtos. Foram retirados saldo do mês, gráfico de balanço anual, indicador/tabela de vendas em aberto, tabela de lançamentos a vencer e tabela de estoque baixo. As áreas Financeiro, Vendas, Produtos e Relatórios continuam disponíveis; não houve exclusão de dados.

Abertos conta somente o status Aberto e abre a lista com esse status. Aguardando aprovação do cliente conta Negociação, sem somar Em orçamento. Cancelados saiu dos destaques; Cancelamentos em processo permanece até a entrega. Retornos e cancelamentos podem incluir OS dos demais indicadores.

Precisa de atenção aparece somente com pendências: conta todos os lançamentos não baixados vencidos ou vencendo hoje, com acesso à lista no mesmo período, e produtos no mínimo ou abaixo, com acesso ao estoque filtrado. A contagem usa as consultas existentes de listagem, sem limite arbitrário de oito registros. Cada aviso depende da permissão do módulo; o técnico sem financeiro não recebe aviso de lançamentos. Se não há avisos autorizados, o bloco não aparece. Avisos administrativos de instalação/manutenção ficam recolhidos.

O controlador deixou de carregar balanços anuais, séries e tabelas detalhadas para o início. O módulo JavaScript continua responsável pela agenda e seu modal, sem dados de gráfico anual nesta página.

Validação: 1908 testes PHP/9164 assertivas sem falhas (uma depreciação e um teste ignorado preexistentes), PHPStan e verificações de escape/scripts aprovados. Testes verificam contagem exata de Abertos/Negociação, ausência de Cancelados nos cartões, contagem de vencimentos sem limite de lista, avisos vazios e permissões. Navegador: Abertos 19 abriu 19 OS; aviso de 7 lançamentos abriu os mesmos 7; desktop e largura de celular conferidos.
