# Filtros de OS e recebimentos

Na área financeira, os filtros principais são busca, situação financeira, pendência e intervalo de vencimento da cobrança. Andamento técnico fica em Mais filtros. Fila operacional e datas de entrada/previsão permanecem somente na listagem operacional de OS.

Pendência distingue A receber, A devolver, Cancelamento aguardando análise e Sem pendência. Cancelamentos com pedido ativo ficam na fila de análise, antes de classificar o resultado financeiro. Os valores usam a projeção existente: cobrança menos créditos, recebimentos menos estornos e reembolsos. Sem cobrança e sem confirmação de cancelamento não se presume ausência de pendências; faturamento anterior também permanece não apurado. Cancelamento confirmado sem cobrança e sem faturamento anterior entra como Sem pendência.

Datas filtram o vencimento de cobranças registradas antes de contar e paginar. OS sem cobrança registrada não entram em intervalos de vencimento. Parâmetros antigos de entrada/previsão não são reinterpretados como vencimento. Links antigos com saldo pendente ou cancelamento pendente são convertidos para Pendência.

Validação: testes de filtros permitidos, datas inválidas, projeção para receber/devolver/sem pendência/cancelamento, intervalo de vencimento, renderização e permissões. Suíte completa sem falhas (uma depreciação e um teste ignorado preexistentes). Navegador conferido no laboratório 8230.
