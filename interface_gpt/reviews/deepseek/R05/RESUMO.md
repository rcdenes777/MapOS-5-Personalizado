# R05 — Financeiro e estornos

**Incremento GPT:** `f3bbf1bd6d7269fa6a977d83116a82d5886edd83`
**Árvore de código testada:** `0d0b4e74297d77939e8c6060759ca419f7956ad9` (incremento + 2 correções CSS)
**Baseline R04:** evidências `63aae434`; árvore validada `8fba40c7`
**Referência funcional:** `8c256cae4ddaeefad68922abddbb8addfe37c99d`
**Data:** 25/11/2026

## Resultado

A R05 está **funcionalmente apta no escopo experimental**. As seis suítes do GPT passaram, a central financeira, os recebimentos, o estorno e os recibos foram exercitados em navegador real, e as regressões R02–R04 continuam verdes. Dois defeitos visuais objetivos foram corrigidos em CSS, com antes/depois. Não há falha conhecida do contrato financeiro.

| Verificação | Resultado |
| --- | --- |
| `smoke.cjs` | **72 combinações PASS** |
| `quote.cjs` | **29/29 PASS** |
| `portal.cjs` | **24/24 PASS** |
| `portal-page.cjs` | **8/8 PASS** |
| `finance.cjs` | **24/24 PASS** |
| `finance-ui.cjs` | **12/12 PASS** |
| Navegador real (`browser.cjs`) | **56/56 PASS** |
| Bordas (`edge.cjs`) | **18/18 PASS** |
| axe-core | **16 varreduras, 0 violações** |
| Teclado | **3/3 PASS** |
| Regressão R04 (portal) | **44/44 PASS** |
| Regressão R04 (bordas) | **17/17 PASS** |
| Regressão R02 | **37/37 PASS** |
| Auditoria R03 adaptada | **118: 116 PASS, 0 FAIL, 2 INFO** |
| Capturas | **37 PNG do delta R05** (15 desktop, 19 celular, 3 tablet); +8 auxiliares da regressão R03 |
| Impressão | **2 PDFs** (recibo normal e estornado) |

## Contrato confirmado

- Central de contas a receber com busca, filtros e métricas; sem vencimento não é vencido; vencimento no próprio dia não é atraso.
- Aprovação no portal **não cria cobrança**; formalização é ação separada e cria a obrigação de R$ 240,00.
- Recebimentos parciais e integrais em centavos, sem exceder o saldo; pagamento não altera andamento nem entrega.
- Estorno integral de um recebimento, com data igual/posterior e justificativa obrigatória até 500 caracteres; o original permanece, o saldo recompõe e o recibo fica **ESTORNADO**.
- Estorno duplicado, recebimento inexistente, justificativa vazia/longa, data inválida/anterior e alvo que não é recebimento são rejeitados.
- Novo recebimento pode quitar o saldo recomposto.
- Valor legado (`paid` agregado) vira **valor anterior**, sem recibo ou data fictícios; o novo recebimento é individual e estornável.
- Financeiro recebe e consulta; somente Administrador estorna; Técnico/Atendente não acessam valores nem recibos, inclusive por rota direta.
- Portal recebe a atualização de total/pago/saldo e não recebe histórico, justificativa privada ou lançamentos internos.
- Persistência em `localStorage`, atualização entre abas e anúncio por `aria-live` funcionam.
- Recibos normal e estornado imprimem com marcas distintas.

## Correções técnicas

**F05-01 — vão no resumo da cobrança.** A grade esticava o `<h2>` “Resumo da cobrança” e afastava o selo. Corrigido com `align-content:start` no painel; `h2` medido em **38,6 px** em vez de **90,8 px**. Antes/depois: [`desktop/00-antes-gap-resumo-1440.png`](desktop/00-antes-gap-resumo-1440.png) e [`desktop/os23-estornado-1440.png`](desktop/os23-estornado-1440.png).

**F05-02 — valor extremo quebrado em 320.** O saldo `R$ 9.999.999,99` quebrava o último dígito e as métricas extremas quebravam em duas linhas. Corrigido com `white-space:nowrap` e `clamp()` somente em telas ≤359 px; `scrollWidth = clientWidth`. Antes/depois: [`mobile/00-antes-valor-extremo-320.png`](mobile/00-antes-valor-extremo-320.png) e [`mobile/central-valor-extremo-320.png`](mobile/central-valor-extremo-320.png).

As correções estão no commit `0d0b4e74`; apenas `assets/style.css`, **+2/−2** contra `f3bbf1bd`. Nenhuma regra financeira, texto de produto ou identidade visual foi alterada.

## Limitações declaradas

- `localStorage` não é segurança, banco transacional nem contabilidade; o protótipo não tem autenticação, CSRF, idempotência de servidor ou devolução bancária.
- Estorno corrige registro; **não devolve dinheiro**.
- Cancelamentos, acertos, retificação de canceladas e abatimentos por garantia ficam para etapa posterior, conforme o contrato.
- Recibos não têm validade comercial.
- A rota direta `#os/<id>/financeiro` de Técnico/Atendente permanece na OS, mas exibe **Acesso restrito** e nenhum valor; observação de UX, não exposição.
- Os scripts antigos da R03 que usavam a simulação `publicresponse` permanecem como evidência histórica; a R04/R05 usam a página do cliente.

## Nota qualitativa

**8,6/10** no escopo experimental: o fluxo financeiro, a preservação do original, a recompensa do saldo e a privacidade do portal estão claros e testados. Como mecanismo real de segurança, o protótipo continua **0/10** por definição — é uma simulação local.

## Evidências

- Relatório completo: [`RELATORIO.md`](RELATORIO.md)
- Achados: [`ACHADOS.md`](ACHADOS.md)
- Correções: [`CORRECOES.md`](CORRECOES.md)
- Índice visual: [`INDICE.md`](INDICE.md)
- Testes: [`testes/README.md`](testes/README.md)
- Auditoria independente: [`AUDITORIA-CEGA.md`](AUDITORIA-CEGA.md)
