# Resumo R03 — Orçamento versionado

**Incremento avaliado:** `798b8075b597dcc7bb72335b617594b37f08547e`
**Correções técnicas:** `b180ab6ca10910c23d77b686af1a2b9da8d771d7`
**Branch:** `interface-gpt`
**Relatório completo:** [`RELATORIO.md`](RELATORIO.md)
**Achados e riscos:** [`ACHADOS.md`](ACHADOS.md)
**Correções antes/depois:** [`CORRECOES.md`](CORRECOES.md)
**Pasta no GitHub:** https://github.com/rcdenes777/MapOS-5-Personalizado/tree/interface-gpt/interface_gpt/reviews/deepseek/R03

## Resultado

| Verificação | Resultado |
| --- | --- |
| Smoke do GPT | **72 combinações, PASS** |
| Domínio de orçamento do GPT | **29/29 PASS** |
| Navegador — fluxos R03 | **34: 33 PASS, 0 FAIL, 1 INFO** |
| Limites e inválidos | **12: 8 PASS, 0 FAIL, 4 INFO** |
| Auditoria R02 adaptada | **118: 116 PASS, 0 FAIL, 2 INFO** |
| Regressão R02 | **37/37 PASS** |
| Responsividade | **32/32 PASS** |
| axe-core | **12 varreduras, 0 violações** |
| Foco no modal | **4/4 PASS** |
| Capturas | **60** (24 desktop, 26 celular, 10 tablet) |

## Contrato confirmado

- Aprovar o orçamento **não cria cobrança**: decisão e status mudam; total cobrado fica **R$ 0,00**.
- A cobrança nasce apenas em **Formalizar cobrança** e fica **em aberto**, sem recebimento automático.
- Rascunho **não reescreve** a versão publicada; publicar cria uma nova versão; a anterior fica no histórico.
- Mudança de itens torna a versão anterior **indisponível para resposta pelo link**.
- Depois da entrega, publicação e resposta pública ficam bloqueadas; registro interno na mesma data ou anterior é permitido e **preserva o andamento**.
- Formalização explícita preserva o andamento; pagamento, conclusão e entrega são independentes.

## Correções técnicas

1. **320 px:** o botão “Fechar” do modal quebrava como “Fecha / r”. Corrigido com cabeçalho sem quebra e botão sem encolhimento. Antes/depois em `mobile/00-antes-correcao-fechar-320x568.png` e `mobile/02-editor-320-antes-de-preencher-320x568.png`.
2. **Contraste:** o breadcrumb do topo tinha 4,46:1 sobre o fundo composto e gerava 1 violação axe; a cor foi ajustada para **#5a6d68** e o axe fechou em **0 violações**.

Nenhuma regra de negócio foi alterada; as duas correções são CSS.

## Ressalvas para o GPT

- **R03-A01** — três botões preenchidos como primários na mesma tela de orçamento (hierarquia visual).
- **R03-A02** — cobrança continua oferecida após recusa; paridade com `formalizarBloqueada` do Trifase.
- **R03-A03** — após cobrar, ainda é possível publicar/retirar; paridade com `publicar`/`retirar` do Trifase.
- **R03-A04** — após entrega, “Retirar publicação” continua disponível; paridade com `retirar`.
- **R03-A05** — formalização usa o rascunho atual, não necessariamente a versão publicada (INFO E12). Decidir se isso é intencional.

## Limites

O protótipo continua estático, sem login, token, portal público real, banco ou permissões reais. Não é aprovação para integração ou produção. A `v5-trifase` e a produção não foram tocadas.
