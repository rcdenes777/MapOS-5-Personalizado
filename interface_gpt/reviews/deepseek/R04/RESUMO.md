# Resumo R04 — Portal do cliente

**Incremento:** `431c428270e2ca98fece34c8ebc58624320b8628`
**Árvore de código testada:** `df925de31c09b2cc116abb025e9fdca5d39f5183` (incremento + correção CSS do selo em 320)
**Branch:** `interface-gpt`
**Relatório:** [`RELATORIO.md`](RELATORIO.md) · **Achados:** [`ACHADOS.md`](ACHADOS.md) · **Correções:** [`CORRECOES.md`](CORRECOES.md)
**Pasta no GitHub:** https://github.com/rcdenes777/MapOS-5-Personalizado/tree/interface-gpt/interface_gpt/reviews/deepseek/R04

## Resultado

| Verificação | Resultado |
| --- | --- |
| Smoke do GPT | **72 combinações, PASS** |
| Quote do GPT | **29/29 PASS** |
| Portal do GPT | **24/24 PASS** |
| Portal-page do GPT | **8/8 PASS** |
| Navegador real — portal e administração | **44/44 PASS** |
| Bordas, concorrência e privacidade | **15/15 PASS** |
| Auditoria R03 adaptada | **118: 116 PASS, 0 FAIL, 2 INFO** |
| Regressão R02 | **37/37 PASS** |
| Responsividade | **27/27 PASS** |
| axe-core | **22 varreduras, 0 violações** |
| Teclado / portal | **6/6 PASS** |
| Capturas | **81** (45 desktop, 31 celular, 5 tablet), 0 duplicadas |

## Contrato confirmado

- Link **explícito**, com token local de 64 hex, validade de 120 dias, renovação do mesmo endereço e revogação.
- Portal independente, sem navegação administrativa e sem decisão pré-selecionada.
- Aprovação/recusa no portal grava a decisão na versão vigente e **não cria cobrança**.
- Rascunho alterado sai da visão pública; publicar v2 atualiza a outra aba; versão antiga não aceita resposta.
- Retirar publicação **não revoga o link**; revogar **preserva versões e decisões**.
- Após entrega, o orçamento fica somente para consulta, sem formulário, recebedor ou data de retirada.
- Sem cobrança, o portal não mostra Pagamento; após formalização mostra total, pago, saldo e situação.
- Dados internos, cliente, telefone, série, IMEI, laudo, histórico e observação interna não aparecem no portal.
- Um único botão primário por estado no orçamento administrativo, com aviso de divergência de valores.

## Correção técnica

**F04-01:** o selo “Demonstração” quebrava em `Demonstraç / ão` em 320 px. Corrigido com `white-space:nowrap` e ajuste de gap/padding no cabeçalho do portal. Antes/depois: `mobile/00-antes-fix-demo-320.png` e `mobile/portal-inicial-320-320x568.png`. Commit `df925de3`; apenas `assets/portal.css` (+8/−1).

## Limitações

O identificador é uma simulação local; não há autenticação, CSRF, isolamento entre usuários, token seguro, expiração contínua nem garantia transacional. O portal não deve ser enviado a clientes reais. A atualização entre abas não tem `aria-live` dedicado. A R01–R03 permanecem preservadas; `v5-trifase` e produção não foram tocadas. O R04 **não autoriza merge ou deploy**.
