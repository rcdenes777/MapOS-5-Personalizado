# Filtros financeiros na listagem de OS — laboratório 8230

**Localização atual:** por solicitação do usuário, filtros e colunas de cobrança ficam em **Financeiro → OS e recebimentos** (`financeiro/ordens`). A listagem técnica de Ordens de serviço não os exibe, inclusive para administrador. As regras de cálculo abaixo continuam válidas. Links antigos filtrados são encaminhados à área financeira, com as mesmas permissões. Consulte `SEPARACAO_OS_FINANCEIRO_LAB.md`.

Etapa de 03/11/2026, sobre `247e33a`, branch `v5-trifase`.

A listagem permite combinar andamento do serviço, situação financeira, saldo a receber, pesquisa e datas. A situação financeira oferece não faturada, em aberto, parcialmente paga, quitada, faturamento anterior, reembolsada e encerrada por garantia. A coluna Saldo a receber usa o resumo canônico em centavos; sem obrigação registrada mostra **Não apurado**, sem inventar saldo zero para faturas antigas.

## Regras

- Os filtros são GET (`financeiro` e `saldo`), validados por lista de valores aceitos e preservados na paginação. Contagem e página usam a mesma consulta, antes do limite/offset.
- `Trifase_financeiro_busca` agrega eventos por OS e créditos ativos por origem, sem multiplicar linhas nem consultar cada OS. A classificação SQL é testada contra `Trifase_financeiro_model::resumos()`: estornos diminuem o recebido, reembolsos diminuem o caixa retido, créditos diminuem a obrigação e correções canceladas são ignoradas. Não recalcula o valor da obrigação a partir dos itens.
- Os filtros financeiros pesquisam todos os andamentos; a seleção explícita de andamento continua restringindo os resultados. Sem filtro financeiro, a configuração original de status visíveis permanece.
- Exige interface piloto, módulo financeiro e `vLancamento`. Sem permissão, controles/coluna não aparecem e a URL com filtro financeiro válido responde 403 antes da consulta. Com flags desligadas, esses parâmetros são descartados e a listagem nativa continua funcionando.
- Sem obrigação, `faturado=1` fica em Faturamento anterior. As demais ficam em Não faturada. Faturas antigas não entram em Somente com saldo, pois sua pendência não foi apurada pelo módulo.
- Nenhuma gravação de negócio, rota nova, migração, variável de ambiente ou concessão de permissão.

## Apresentação e validação

Usa select, button e data-table existentes, com os tokens do tema. No piloto financeiro a tabela fica compacta, o cabeçalho usa Andamento e o responsável permanece no detalhe da OS. Equipamento e datas aparecem na tabela a partir de 2xl e continuam nos cartões do celular. Saldo, pagamento e ações foram conferidos em 1280, 1440 e 1536 pixels; cartões em 360 pixels. Não houve alteração no Penpot.

- Suíte completa: 1836 testes PHP / 8612 asserções, sem falhas ou erros; depreciação antiga de tema e um teste ignorado. Versão final da apresentação: 35 testes focados / 136 asserções aprovados.
- JavaScript: 209 casos aprovados; execução isolada padrão aprovada. Build, PHPStan e escape aprovados. Detector Impeccable sem achados.
- Playwright: 25 checks, cobrindo formulário real, categorias existentes e vazias, valores esperados do resumo canônico do MySQL, paginação, filtros combinados, limpeza, perfil sem financeiro e acesso direto negado. Nenhuma fixture nova.
- Hashes dos registros de 37 tabelas com dados antes/depois idênticos; somente sessões e logs foram excluídos da comparação por serem efeitos normais da navegação.

Evidências em `outputs/filtros-financeiros/` na pasta canônica do projeto. A verificação foi somente no laboratório 8230, sem push, produção, 8200 ou alterações nos três documentos preexistentes. Mobile físico, carga de banco em escala e regressão integrada para produção continuam fora desta etapa.
