# Condições rápidas do orçamento

Implementado no laboratório 8230 em 10/11/2026, na tela de orçamento da OS.

- Pagamento: À vista e Parcelado no cartão de crédito selecionados inicialmente; máximo inicial de 3 parcelas, ajustável de 2 a 24. Podem ser desmarcados e há uma condição adicional/personalizada.
- Execução: lista de dias úteis (1, 2, 3, 5, 7, 10, 15, 20, 30), opção de não informar ou prazo personalizado. Importação e espera de peça podem coexistir. Ao selecionar dias e uma dessas opções, a contagem começa após a chegada da peça.
- Garantia: 30, 60, 90 (padrão) ou 120 dias, texto personalizado e seleção de um termo existente em Termos de Garantias.
- A prévia acompanha as escolhas. O servidor recompõe e valida os textos, inclusive sem JavaScript. Selecionar opções não publica: a confirmação existente continua obrigatória.
- Condições viram textos na versão imutável do orçamento. Alterar o cadastro do termo não altera versões já publicadas. Ao reabrir uma versão cujo termo mudou, o texto anterior permanece na opção personalizada.
- Textos legados são reaproveitados sem exigir conversão. A garantia deste orçamento não altera automaticamente o cadastro técnico da OS.

## Validação

Testes PHP de composição, limites, entradas inválidas, preservação de condições antigas, reabertura e publicação pelo modelo. Teste JavaScript da prévia. Suíte completa sem falhas (1 depreciação e 1 teste ignorado já existentes); PHPStan, verificação de escape, scripts inline e build aprovados.

Conferência no navegador da OS 9065: padrões, seleção de dias, importação/espera e garantia de 120 dias refletidos na prévia. Nenhuma nova versão publicada nessa OS durante a conferência. A seleção com termos cadastrados foi coberta por testes automatizados; o laboratório não possuía termos para seleção visual.
