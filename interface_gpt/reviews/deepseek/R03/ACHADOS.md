# Achados da R03

Classificação usada: **FIX** = corrigido e comprovado; **ABERTO** = decisão do GPT; **HERDADO** = comportamento também presente no Trifase, não introduzido pela R03; **INFO** = observação sem falha.

## Corrigidos

| ID | Severidade | Status | Achado | Evidência |
| --- | --- | --- | --- | --- |
| R03-F01 | Baixa | **FIX** | Em 320×568, o botão “Fechar” do modal quebrava em duas linhas (“Fecha / r”). | `mobile/00-antes-correcao-fechar-320x568.png`; depois `mobile/02-editor-320-antes-de-preencher-320x568.png`; `responsivo.json` (`closeOneLine=true`). |
| R03-F02 | Média (a11y) | **FIX** | Breadcrumb do topo com contraste 4,46:1 sobre o fundo composto; 1 violação axe `color-contrast` em 390 px. | Antes: axe 1 violação/4,46:1; depois: `testes/axe.md` com 0 violações; cor `#5a6d68`. |

## Abertos / herdados

| ID | Severidade | Status | Achado | Evidência e leitura |
| --- | --- | --- | --- | --- |
| R03-A01 | Baixa (design) | **ABERTO** | A tela de orçamento tem três botões preenchidos com aparência primária: **Publicar nova versão**, **Registrar resposta do cliente** e **Formalizar cobrança**. O sistema visual da R02 recomenda um primário por contexto. | `desktop/01-orcamento-v1-desktop-1440x900.png`, `desktop/07-aprovado-sem-cobranca-desktop-1440x900.png`, `desktop/09-cobranca-formalizada-desktop-1440x900.png`. Não alterado: é decisão visual do GPT. |
| R03-A02 | Média (produto) | **HERDADO** | Após uma recusa, “Formalizar cobrança” continua oferecida e formaliza o valor; a OS permanece “Orçamento recusado” com total em aberto. | INFO E5: `billingBtn=1`, `total=24000`, `status=Orçamento recusado`. No Trifase, `formalizarBloqueada` só bloqueia faturado/cancelado/retorno; não é regra nova da R03. |
| R03-A03 | Média (produto) | **HERDADO** | Depois de formalizar a cobrança, “Publicar nova versão” e “Retirar publicação” continuam disponíveis. | INFO E6: `publishBtn=1`, `withdrawBtn=1`, total R$ 240,00. `publicar`/`retirar` do Trifase também não bloqueiam `faturado`. |
| R03-A04 | Baixa (produto) | **HERDADO** | Depois da entrega, “Retirar publicação” continua disponível, embora publicar e responder pelo link estejam bloqueados. | INFO E7 / Q4-03: botão presente; `retirar` do Trifase não verifica entrega. |
| R03-A05 | Média (produto) | **DECISÃO PENDENTE** | A formalização usa o **rascunho atual**, não necessariamente a versão publicada. Um rascunho de R$ 300,00 com v1 publicada de R$ 240,00 permite formalizar R$ 300,00, sem decisão e sem nova publicação. | INFO E12: `offered=true`, `total=30000`, `active=24000`, `label="Itens alterados"`. O `R03-ORCAMENTO.md` diz que a formalização não é condicionada automaticamente à aprovação, mas não define se exige versão vigente. |
| R03-A06 | Baixa (UX) | **INFO** | No modal “Simular resposta pelo link”, em 1440×900 o botão de ação fica abaixo da dobra e exige rolagem. O modal é rolável; nenhum controle ficou inacessível por teclado. | `desktop/06-aprovacao-link-desktop-1440x900.png`; submissão funciona em `quote-browser.cjs` Q2-02 e Q4-06. |

## Observações que não são falhas

- **E03 (auditoria):** entrega independente do andamento é comportamento intencional ratificado na R02.
- **L07 (auditoria):** valor extremo formatado em BRL sem erro.
- **Q4-03 / E7:** retirada de publicação após entrega é permitida pelo modelo de referência; registrada como risco, não como regressão.
- **Aprovação sem cobrança:** o total zero após aprovar é o contrato novo, não uma falha.

## O que não foi introduzido

Nenhuma tabela, campo, regra de autorização, trava de finalização ou regra de faturamento foi criada. As únicas mudanças de código foram CSS de responsividade do cabeçalho do modal e contraste do breadcrumb. As decisões de produto acima continuam com o GPT.
