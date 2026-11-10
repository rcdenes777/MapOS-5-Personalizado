# OS e recebimentos: pendências de trabalho

A lista padrão mostra apenas casos que exigem ação, usando um único seletor:

- Todas as pendências.
- A receber: saldo positivo, sem pagamento, parcial ou vencido.
- A devolver: recebido líquido maior que a cobrança atual.
- Aguardando análise: pedido ativo de cancelamento, antes da classificação do acerto.
- Não apurado: sem cobrança registrada ou faturamento antigo que requer conferência.

Casos quitados, reembolsados ou encerrados sem saldo ficam em **Ver histórico**, com retorno às pendências. Sem cobrança não se presume quitação; cancelamento confirmado sem cobrança e sem faturamento anterior é resolvido. O histórico só reúne saldo zero ou esse encerramento confirmado.

A busca e o intervalo de vencimento continuam disponíveis. As datas usam a cobrança registrada, antes de contar/paginar; não usam entrada ou previsão da OS. Andamento permanece na linha e no detalhe, sem filtro operacional nesta tela. Permissões financeiras permanecem obrigatórias.

Links antigos de em aberto/parcial vão a A receber; quitadas/reembolsadas/encerradas vão ao histórico. Seleções inválidas voltam a Todas as pendências. Datas antigas de entrada/previsão não são reinterpretadas como vencimento.

Validação: projeção de recebimentos, estornos e créditos reutilizada; testes de contagem por pendência, exclusão de resolvidos, histórico, vencimento, parâmetros antigos/inválidos e permissões. Fluxo de histórico e retorno conferido no navegador do laboratório 8230.
