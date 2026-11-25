# Achados da R05

## Corrigido e comprovado

| ID | Severidade | Status | Achado | Evidência |
| --- | --- | --- | --- | --- |
| R05-F01 | Baixa (visual) | **FIX** | O painel “Resumo da cobrança” esticava o `<h2>` na grade e abria um vão grande antes do selo. | `desktop/00-antes-gap-resumo-1440.png`; depois `desktop/os23-estornado-1440.png`; `h2` de 90,8 px para 38,6 px; commit `0d0b4e74`. |
| R05-F02 | Baixa (responsividade) | **FIX** | Em 320 px, `R$ 9.999.999,99` quebrava o último dígito e métricas extremas quebravam em duas linhas. | `mobile/00-antes-valor-extremo-320.png`; depois `mobile/central-valor-extremo-320.png`; `scrollWidth=clientWidth`; commit `0d0b4e74`. |

## Observações e limites declarados

| ID | Severidade | Status | Achado | Evidência/decisão |
| --- | --- | --- | --- | --- |
| R05-A01 | Alta (fora do escopo) | **LIMITE** | O protótipo usa `localStorage`; não há autenticação, CSRF, idempotência transacional, isolamento entre usuários ou contabilidade real. | Declarado em `R05-FINANCEIRO.md`; não é tratado como falha da demonstração. |
| R05-A02 | Baixa | **LIMITE** | Cancelamentos, acertos, retificação de canceladas e abatimentos por garantia ficam para etapa posterior; OS cancelada bloqueia recebimento e estorno. | `edge.cjs` X11; contrato R05. |
| R05-A03 | Informativo | **CONTRATO** | Estorno corrige o lançamento e recompõe o saldo; não devolve dinheiro nem executa transferência bancária. | `browser.cjs` B11–B21; recibos normal e estornado. |
| R05-A04 | Baixa (UX) | **OBSERVAÇÃO** | A rota direta `#os/<id>/financeiro` de Técnico/Atendente permanece na OS e mostra “Acesso restrito”, em vez de redirecionar. Nenhum valor ou ação é exposto. | `browser.cjs` P07; `edge.cjs` X12–X13. |
| R05-A05 | Baixa | **LIMITE** | Recibos são prévias de demonstração sem validade comercial; PDFs não comprovam movimentação bancária. | Rodapé do recibo; `recibos/*.pdf`. |
| R05-A06 | Baixa (histórico) | **HISTÓRICO** | Scripts antigos da R03 que usavam `publicresponse` permanecem como evidência daquela árvore; a R04/R05 usam `portal.html`. | `R03/testes/`; R05 `testes/README.md`. |

## O que não foi tratado como falha

- **Aprovação sem cobrança:** comportamento central herdado da R03/R04, confirmado em B02–B04.
- **Pagamento parcial sem alterar andamento/entrega:** independência exigida; B08 e cenário de legado.
- **Valor legado sem recibo retroativo:** decisão explícita do contrato R05; L01–L05.
- **Recibo original após estorno:** continua acessível e marcado ESTORNADO; B15.
- **Condições vazias no portal:** agrupadas em uma única mensagem; R03.
- **Rota financeira restrita:** mostra “Acesso restrito” sem valores; P06/X12.

## O que não foi testado

- Devolução bancária, conciliação, despesas, fluxo de caixa completo e idempotência transacional de servidor — fora do escopo declarado.
- Cancelamentos e acertos — etapa posterior.
- Leitor de tela real; axe e teclado foram usados, sem teste com usuário assistivo.
- Validade comercial dos recibos — explicitamente inexistente.
