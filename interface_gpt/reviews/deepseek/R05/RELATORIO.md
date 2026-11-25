# R05 — Validação independente do financeiro e dos estornos

**Incremento GPT:** `f3bbf1bd6d7269fa6a977d83116a82d5886edd83`
**Árvore de código efetivamente testada:** `0d0b4e74297d77939e8c6060759ca419f7956ad9`
**Correção técnica:** `0d0b4e74` — `assets/style.css`, +2/−2
**Baseline R04:** evidências `63aae434`; árvore validada `8fba40c7`
**Referência funcional:** `8c256cae4ddaeefad68922abddbb8addfe37c99d`
**Data:** 25/11/2026
**Ambiente:** protótipo estático em `http://127.0.0.1:8130`, Chromium/Playwright, dados fictícios em `localStorage`

## 1. Escopo e método

A R05 foi validada de forma independente, sem reutilizar os testes do GPT como prova de UI. A sequência foi:

1. Leitura integral de `R05-FINANCEIRO.md` e do código entregue (`finance.js`, `finance-ui.js`, integração em `app.js`).
2. Execução das seis suítes fornecidas pelo GPT.
3. Sondagem da central e da aba financeira em 320, 390, 768 e 1440 px.
4. Construção de uma suíte de navegador com dados controlados, duas abas, recibos, estorno, permissões e legado.
5. Bateria de bordas para valores, datas, justificativa, duplicidade e impressão.
6. axe-core e teclado nas telas e modais novos.
7. Regressões R02, R03 e R04 executadas em cópias independentes, sem sobrescrever as pastas anteriores.
8. Correção de dois defeitos visuais objetivos e reexecução completa sobre a nova árvore.

O estorno foi tratado como **correção de registro**, nunca como devolução de dinheiro. Nenhum backend, banco, produção, `v5-trifase` ou arquivo fora de `interface_gpt` foi alterado.

## 2. Resultados

| Verificação | Resultado |
| --- | --- |
| `node tests/smoke.cjs` | **72 combinações PASS** |
| `node tests/quote.cjs` | **29/29 PASS** |
| `node tests/portal.cjs` | **24/24 PASS** |
| `node tests/portal-page.cjs` | **8/8 PASS** |
| `node tests/finance.cjs` | **24/24 PASS** |
| `node tests/finance-ui.cjs` | **12/12 PASS** |
| Navegador real (`browser.cjs`) | **56/56 PASS** |
| Bordas e exceções (`edge.cjs`) | **18/18 PASS** |
| axe-core (`axe.cjs`) | **16 varreduras, 0 violações** |
| Teclado / portal (`axe.cjs`) | **3/3 PASS** |
| Regressão R04 portal (`regressao-r04-browser.cjs`) | **44/44 PASS** |
| Regressão R04 bordas (`regressao-r04-edge.cjs`) | **17/17 PASS** |
| Regressão R02 (`regressao-r02.cjs`) | **37/37 PASS** |
| Auditoria R03 adaptada (`regressao-r03-audit.cjs`) | **118: 116 PASS, 0 FAIL, 2 INFO** |
| Capturas | **37 PNG do delta R05**: 15 desktop, 19 celular, 3 tablet; +8 auxiliares da regressão R03 |
| Impressão | **2 PDFs #023**: recibo normal e estornado; #020 auxiliares |
| Erros de página / console | **0 / 0** nas suítes principais |
| Requisições externas | **0** |

Os dois `INFO` da auditoria R03 são os mesmos limites já conhecidos de fluxo de entrega e formatação extrema; não são falhas da R05.

## 3. Cenários executados

### 3.1 Central financeira e vencimentos

- A central lista **5 cobranças** com obrigação; OS sem total não aparece.
- Totais iniciais: **R$ 650,00** a receber, **R$ 930,00** recebido líquido, **R$ 1.580,00** cobrado e **R$ 0,00** vencido.
- Com vencimentos controlados: #022 vencida (**R$ 220,00**), #021 vencendo hoje e #020 futura. O filtro **Vencidas** mostra apenas #022; **A vencer / sem data** mostra #021 e #020; **Quitadas** mostra #019 e #016.
- Vencimento no próprio dia permanece **Em aberto**; ausência de vencimento não é atraso.
- Busca por cliente, equipamento, número de OS e estado vazio funcionam.
- Valor extremo de **R$ 9.999.999,99** é formatado sem overflow em 1440 e 320 após a correção F05-02.

### 3.2 OS #023 — decisão, formalização, recebimentos e estorno

Fluxo executado:

1. Link de demonstração gerado; portal aberto; condições vazias agrupadas em uma única mensagem.
2. Aprovação pelo portal gravou decisão e manteve **total 0 / pago 0**.
3. Formalização separada criou obrigação de **R$ 240,00** com vencimento.
4. Recebimento de **R$ 100,00 (Pix)** e **R$ 140,00 (Dinheiro)**; OS quitada, andamento e entrega inalterados.
5. Recibos #1 e #2 abertos e impressos.
6. Estorno integral do recebimento #1 por “Lançamento incorreto na demonstração”; obrigação permaneceu **R$ 240,00**, pago caiu para **R$ 140,00**, saldo recomposto para **R$ 100,00**.
7. Recibo #1 continuou acessível e passou a exibir **ESTORNADO**; o evento de estorno referencia o #1 e preserva valor, data, forma e justificativa.
8. Estorno duplicado foi rejeitado: botão ausente, `openModal` não abriu e `financialSubmit` lançou erro sem novo evento.
9. Novo recebimento de **R$ 100,00 (Transferência)** quitou o saldo recomposto, totalizando quatro eventos.
10. Portal refletiu **pago 140 / saldo 100**, sem a justificativa privada, e depois **Quitada / saldo 0**.
11. Persistência após recarregar manteve os quatro eventos e o saldo.

### 3.3 Dados legados

A OS #020 iniciou com **R$ 200,00 recebidos anteriormente** e nenhum recibo individual:

- o painel mostrou “Valor recebido anteriormente” e **não** ofereceu estorno do valor legado;
- um novo recebimento de **R$ 50,00** foi registrado individualmente, somando **R$ 250,00**;
- o estorno desse novo recebimento devolveu o pago a **R$ 200,00** sem criar recibo, data ou forma fictícios para o valor anterior.

### 3.4 Permissões simuladas e rotas diretas

- **Administrador:** recebe, consulta e estorna.
- **Financeiro:** acessa central, recebe e consulta recibo; não vê nem abre estorno, inclusive por chamada direta.
- **Técnico e Atendente:** não veem valores em `#financeiro`, `#os/20/financeiro` ou `#recibo/20/1`. `#financeiro` e `#recibo` mostram **Ação indisponível**; a aba financeira da OS mostra **Acesso restrito**. Nenhum valor é exposto.
- A troca de perfil em uma rota financeira remove os valores e as ações; a URL pode permanecer na OS, mas o conteúdo financeiro fica bloqueado.

### 3.5 Persistência e duas abas

- Recebimento registrado na aba A apareceu na aba B por evento de `storage`.
- O portal atualizou total/pago/saldo após recebimento em outra aba.
- A região `#customer-live`, `role="status"` e `aria-live="polite"` anunciou “Informações do atendimento atualizadas.”.
- Após recarregar, os eventos e o saldo permaneceram.

### 3.6 Recibos e impressão

- Recibo normal: valor, OS, cliente, equipamento, data e forma; sem marca de estorno.
- Recibo estornado: mesmo valor original, marca **ESTORNADO**, data da correção e aviso de que não houve reembolso bancário.
- PDFs gerados: [`recibos/recibo-normal.pdf`](recibos/recibo-normal.pdf) e [`recibos/recibo-estornado.pdf`](recibos/recibo-estornado.pdf).
- Recibo em 320 sem overflow horizontal.

### 3.7 Refinamentos R04 preservados

- Condições vazias do orçamento são agrupadas em **“Condições de pagamento, prazo e garantia a confirmar com a assistência.”**, sem três “Não informado”.
- Saldo do portal tem bloco próprio `.customer-balance` e fundo destacado.
- Atualização entre abas tem anúncio em região viva.
- “Ver endereço para copiar” abre o endereço local e seleciona o campo; Clipboard API é tentada com fallback manual.
- O espaço entre proposta e histórico no desktop foi mantido; a grade do workspace não cria sobreposição.

## 4. Correções técnicas

### F05-01 — vão no “Resumo da cobrança”

**Antes:** a grade `.finance-order .stack .panel` esticava o `<h2>` para **90,8 px**, criando um vão grande entre o título e o selo “Parcial”.
**Depois:** `align-content:start` no painel; `<h2>` medido em **38,6 px**, selo imediatamente abaixo.
**Escopo:** `assets/style.css`; commit `0d0b4e74`; +2/−2 no total.
**Evidência:** [`desktop/00-antes-gap-resumo-1440.png`](desktop/00-antes-gap-resumo-1440.png) e [`desktop/os23-estornado-1440.png`](desktop/os23-estornado-1440.png).

### F05-02 — valor extremo quebrado em 320

**Antes:** `R$ 9.999.999,99` quebrava o último dígito e as métricas extremas quebravam em duas linhas.
**Depois:** `white-space:nowrap` e `clamp()` em `.finance-metrics .stat strong` e `.finance-balance .money` para ≤359 px; `scrollWidth = clientWidth` em 320.
**Evidência:** [`mobile/00-antes-valor-extremo-320.png`](mobile/00-antes-valor-extremo-320.png) e [`mobile/central-valor-extremo-320.png`](mobile/central-valor-extremo-320.png).

Nenhuma regra de negócio, texto criativo, identidade visual, backend, banco, produção ou arquivo fora de `interface_gpt` foi alterado. As correções são estritamente de layout.

## 5. Achados e limites

- **R05-A01 (limite):** `localStorage` não é autenticação, segurança, banco transacional ou contabilidade. O identificador do portal é uma simulação local.
- **R05-A02 (limite):** cancelamentos, acertos e retificação de OS cancelada ficam para etapa posterior; recebimento e estorno em OS cancelada são bloqueados.
- **R05-A03 (contrato):** estorno **não devolve dinheiro**; apenas corrige o lançamento e recompõe o saldo.
- **R05-A04 (observação de UX):** a rota direta `#financeiro`/`#recibo` de Técnico/Atendente mostra **Ação indisponível**; `#os/<id>/financeiro` permanece na OS e mostra **Acesso restrito**, em vez de redirecionar. Não há valores nem ações; não é uma exposição.
- **R05-A05 (limite):** recibos são prévias de demonstração sem validade comercial.
- **R05-A06 (histórico):** os scripts R03 que usavam a simulação `publicresponse` ficam como evidência histórica; o fluxo atual usa `portal.html`.
- **R05-A07 (UX):** OS sem obrigação e OS cancelada compartilham a mensagem “Acerto de cancelamento…”, imprecisa para o primeiro caso; não altera valores ou eventos e pode ser refinada em etapa posterior.

## 6. Artefatos

- [`RESUMO.md`](RESUMO.md) — síntese para revisão rápida.
- [`ACHADOS.md`](ACHADOS.md) — achados, corrigidos e limites.
- [`CORRECOES.md`](CORRECOES.md) — detalhe das duas correções CSS.
- [`INDICE.md`](INDICE.md) — índice das 37 capturas e dos PDFs.
- [`testes/README.md`](testes/README.md) — comandos, contagens e saídas.
- [`AUDITORIA-CEGA.md`](AUDITORIA-CEGA.md) — revisão independente do pacote.
- [`testes/proveniencia.json`](testes/proveniencia.json) — incremento, árvore servida e hashes dos assets.

## 7. Conclusão

A R05 passa no contrato financeiro e no escopo visual experimental. O ponto mais sensível — estorno com preservação do original e recomposição do saldo — foi exercitado em domínio, navegador, portal, histórico, recibo e impressão. As duas correções encontradas foram visuais, localizadas e comprovadas; as regressões anteriores continuam verdes.

**Nota qualitativa:** **8,6/10** no escopo experimental. Como segurança real, **0/10** — o protótipo é local e declara essa limitação.
