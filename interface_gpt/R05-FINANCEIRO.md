# R05 — Financeiro e estornos de recebimento

Baseline R04: evidências 63aae434, árvore validada 8fba40c7. Referência funcional: 8c256cae4ddaeefad68922abddbb8addfe37c99d.

## Escopo e decisões

- Central de contas a receber de OS: total cobrado, recebido líquido, saldo e vencido. Busca por OS, cliente ou equipamento; filtro de cobranças abertas, vencidas e quitadas. Sem vencimento informado não é classificado como vencido. Vencimento no próprio dia ainda não é atraso.
- Aba Financeiro da OS: obrigação, vencimento, histórico de recebimentos e correções, recibos individuais. Mantém ação existente de registrar pagamento.
- Recebimentos inteiros em centavos, data válida, formas de pagamento da referência, sem exceder o saldo. Pagamento parcial ou integral não altera andamento nem entrega.
- Estorno integral de um recebimento individual, com data igual/posterior à original e justificativa obrigatória até 500 caracteres. Adiciona evento referenciado; original preservado. Recompõe saldo sem alterar obrigação; não executa devolução bancária. Recibo do original permanece acessível e marcado ESTORNADO. Novo recebimento pode quitar saldo recomposto.
- Dados locais anteriores só tinham total pago agregado. Preservar como valor anterior sem criar datas, formas ou recibos fictícios retroativos. Novos recebimentos ganham identificação individual. Campo paid permanece sincronizado para as outras telas e portal.
- Estorno disponível somente ao Administrador na simulação (decisão conservadora; backend real tem permissão específica estornarRecebimento). Financeiro pode receber e consultar; Técnico/Atendente não podem consultar aba/recibo ou executar operações. Auditoria integral das permissões ainda pendente.
- Portal segue projeção pública de total/pago/saldo/situação, sem histórico ou justificativas privadas. Melhorias de R04: condições vazias agrupadas, saldo destacado, anúncio de atualização entre abas, tentativa de copiar endereço via Clipboard API com seleção manual como fallback. Ajuste de espaçamento desktop entre proposta e histórico.

## Referências verificadas

application/models/Trifase_financeiro_model.php: formalizarBloqueada, receber, estornar, corrigirRecebimento, resumo, recibo, resumoCliente; application/controllers/Trifase_financeiro.php: formalizar, receber, estornar, recibo, retificar, conciliar.

## Limitações conhecidas

A central é uma visão de contas de OS, não fluxo de caixa completo, despesas ou conciliação bancária. Projeções contábeis nativas, distribuição incremental de desconto por recebimento, idempotência transacional de servidor, conciliação de lançamentos legados/externos e reembolsos não estão simulados. Cancelamentos, acertos, retificação de canceladas e abatimentos por garantia entram em etapas posteriores. Não confundir estorno com devolução. Não há alteração no backend real, dados reais ou permissões reais. Simulação mantém as restrições já existentes para OS cancelada até a R06. Datas antigas não são inventadas. Recibos de demonstração sem validade comercial. LocalStorage não é contabilidade, segurança ou banco transacional.

## Cenários R05 para laboratório

1. Dados restaurados: abrir Financeiro, pesquisar por cliente/equipamento/OS, filtros, verificar totais e tratamento de vencimento não informado. Criar cobrança de OS comum com vencimento anterior a hoje, outra vencendo hoje, outra futura; conferir filtros e métricas.
2. OS #023: aprovar v1 via portal, formalizar separadamente R$ 240,00. Receber R$ 100,00 (Pix), R$ 140,00 (Dinheiro), conferir quitação, recibos e atualização do portal. Registrar entrega antes ou depois de quitação conforme cenário.
3. Estornar o primeiro recebimento por justificativa de lançamento incorreto, sem alterar total de R$ 240,00. Pago R$ 140,00, saldo R$ 100,00. Conferir evento original, correção referenciada, recibo marcado ESTORNADO e portal sem motivo privado. Receber novamente R$ 100,00. Confirmar persistência.
4. Rejeitar repetição de estorno, referência inexistente, justificativa vazia ou longa, data inválida/anterior, valor acima do saldo, negativo, zero, fracionamento além de centavos e forma inválida. Testar perfis, rotas diretas e tentativa de ação sem permissão.
5. OS já paga parcialmente da amostra R04: preservar saldo anterior e impedir criação de recibo artificial; registrar recebimento novo e estorná-lo sem tocar valor anterior.
6. Responsividade 320/390/768/1440, textos longos, números extremos, datas, teclado, foco, barra de confirmação, impressão de recibo normal e estornado. Confirmar ajustes do portal e ausência de requisições externas. Testar Clipboard API e fallback em HTTP, sem exigir cópia automática quando indisponível.
7. Regressões R02–R04, inclusive atualização entre abas e privacidade. Cobrir mudança de perfil na aba Financeiro/recibo, e atualização do saldo no portal. Não interpretar limites declarados de simulação como implementação real.

## Evidências iniciais GPT

Testes executados em JavaScript sem navegador real; os testes de domínio/DOM simulado não provam layout, impressão real, teclado, integração de eventos ou segurança. Executar node tests/finance.cjs e node tests/finance-ui.cjs além das quatro suítes anteriores. Publicar evidências independentes em reviews/deepseek/R05. Priorizar telas e cenários alterados, mantendo regressões automatizadas. Não alterar R01–R04 nem v5-trifase.
