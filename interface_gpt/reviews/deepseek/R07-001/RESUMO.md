# R07-001 — Resumo

**Status:** APTO no escopo experimental após três revisões independentes: dois bloqueantes e um furo médio corrigidos; nenhum bloqueante remanescente.
**Candidato inicial:** `91a29b799ded6a436312e6ff53c702d7a640b742`.
**Código final testado:** `f46ad182bcb7fb067d68c335369640c82bccba1d` (correções `39a42126`, `42f1733e`, `5ed6e3fc`, `f46ad182`).
**Base:** R06-002 `033fdc47c09796a584cf9782324fc7c08394ce74`; referência funcional `8c256cae`.
**Data:** 26/11/2026 — servidor estático `:8130`, dados fictícios.

## Números

- **908 checagens executadas: 904 PASS, 0 FAIL, 4 INFO.**
- Dez suítes Node: **241 PASS**.
- R07: navegador **65/65**; bordas/axe **56/56** (11 varreduras, 0 violações); negativos **54/54**; impressão **6/6**; capturas **21 PNG**.
- Regressões: R02 **37/37**; R03 **118 (116 PASS + 2 INFO)**; R04 **61/61**; R05 **74/74**; R06-002 handler **16/16**, negativos **15/15**, navegador **103 (102 PASS + 1 INFO)**, bordas **25/25**, axe **23/23**, impressão **9 (8 PASS + 1 INFO)**.
- Mutações: domínio **20 detectadas + 1 equivalente** (0 sobreviventes); R06-002 **18/18**; handler R06 **detectada**; handler R07 (transição) **detectada**.
- Delta de 33 capturas: **0 mudanças de dimensão**, máximo **1,634%** de pixels (nova aba Garantia).

## Correções desta rodada

- Retorno finalizado com irmão ativo não reabre (um único retorno ativo por unidade).
- OS ordinária ativa da mesma unidade não oferece nem abre retorno; só OS finalizada inicia atendimento.
- Origem/retorno finalizado aponta “Registrar retorno” para o atendimento anterior, gravando `previous` correto.

## O que ficou provado

- Retorno por unidade/cliente sem copiar laudo, financeiro, anexos, token ou orçamento; origem intocada.
- Duplicidade, duas abas, unidade sem identificação, origem sem conclusão e URL inválida bloqueadas com mensagem específica.
- Prazo vencido/desconhecido sem cobertura presumida; segundo retorno herda raiz e prazo original.
- Avaliação versionada com histórico imutável; stale e duas abas recusados; cobertura não muda andamento/cobrança/entrega.
- Troca/devolução pendentes bloqueiam conclusão; reparo sem cobrança conclui sem nova garantia; origem com derivado não reabre.
- Custos privados só Admin, com teto, correção única e sem caixa/estoque; perfis restritos sem acesso nem por handler direto.
- Novo orçamento só após decisão; faturamento só com versão vigente aprovada e itens/valores idênticos; decisão pública/interna não fatura; nenhuma mutação financeira da origem.
- Portal sem garantia/origem/avaliação/custo/laudo; impressão A4/cupom sem dados privados.

## Limites registrados

F02 (cancelamento do retorno) para R07-002; F03 (estoque) para R08; F04 permissões são simulação; F05/F07 limites. Sem backend, autenticação real, atomicidade de servidor ou execução de troca/reembolso. Publicação de nova versão após faturamento continua possível, sem segundo faturamento (observação para R07-002). Troca de avaliação após publicação mantém a versão e o portal ativos (sem cobrança); decisão de regra pendente do GPT. Painel da própria origem repete o número em “Atendimento anterior” (cosmético).

## Evidências

`interface_gpt/reviews/deepseek/R07-001/` — `RELATORIO.md`, `INDICE.md`, `proveniencia.json`, `AUDITORIA-INDEPENDENTE.md`, `testes/`, `capturas/`, `impressos/`.
