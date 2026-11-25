# Relatório R03 — Orçamento versionado

**Rodada:** R03 (primeiro incremento funcional de orçamento)
**Revisor:** DeepSeek, em revisão independente da implementação do GPT
**Data:** 25/11/2026
**Repositório:** `rcdenes777/MapOS-5-Personalizado`
**Branch:** `interface-gpt` (nenhuma alteração em `v5-trifase` ou na produção)
**Incremento avaliado:** `798b8075b597dcc7bb72335b617594b37f08547e`
**Correções técnicas desta revisão:** `b180ab6ca10910c23d77b686af1a2b9da8d771d7`
**Baseline funcional:** `8c256cae4ddaeefad68922abddbb8addfe37c99d`
**Baseline visual:** R02, head `89332827cad2c73fad180a005e4e2501cba2f22a`
**Pasta no GitHub:** https://github.com/rcdenes777/MapOS-5-Personalizado/tree/interface-gpt/interface_gpt/reviews/deepseek/R03

Nenhum arquivo fora de `interface_gpt/` foi alterado. Não houve merge, deploy ou mudança na branch `v5-trifase`. As evidências da R01 e da R02 foram preservadas; os arquivos da R02 que uma execução local chegou a tocar foram restaurados com `git checkout --` antes do commit.

---

## 1. Resumo executivo

| Verificação | Resultado |
| --- | --- |
| `tests/smoke.cjs` (protótipo) | **72 combinações perfil×rota, PASS** |
| `tests/quote.cjs` (domínio do GPT) | **29/29 PASS** |
| Navegador real — fluxos de orçamento (`quote-browser.cjs`) | **34 verificações: 33 PASS, 0 FAIL, 1 INFO** |
| Limites e entradas inválidas (`quote-edge.cjs`) | **12 verificações: 8 PASS, 0 FAIL, 4 INFO** |
| Bateria R02 adaptada (`audit-r03.cjs`) | **118 verificações: 116 PASS, 0 FAIL, 2 INFO** |
| Regressão R02 (`regressao-r02.cjs`) | **37/37 PASS** |
| Responsividade e capturas (`capture-r03.cjs`) | **32/32 PASS** |
| axe-core 4.14 (WCAG 2.2 A/AA) | **12 varreduras, 0 violações** |
| Foco no modal / retorno do foco | **4 verificações, 4 PASS** |
| Capturas | **60 PNG** (24 desktop, 26 celular, 10 tablet) |
| Exceções JavaScript / erros de console | **0** na bateria auditada |
| Requisições externas | **0** |

**Veredito:** incremento **apto para a avaliação do GPT no laboratório**, com ressalvas; **não apto para integração ou produção** enquanto o próprio documento da R03 mantiver o portal/token, a matriz real de permissões e a conciliação como pendentes.

O contrato novo foi confirmado: **aprovar o orçamento não cria cobrança**. A aprovação altera o status/andamento e grava a decisão; a cobrança só nasce em uma ação explícita de formalização. O valor formalizado ficou em aberto, sem recebimento automático.

---

## 2. Escopo executado

O laboratório foi atualizado por fast-forward para o SHA `798b8075`. Foram executados os testes do GPT e uma bateria própria, em navegador Chromium real, cobrindo:

- rascunho, publicação, versões e histórico;
- resposta interna e resposta simulada pelo link;
- recusa, retirada de publicação e nova versão;
- formalização de cobrança, pagamento parcial e quitação;
- andamento técnico, entrega e financeiro independentes;
- quatro perfis simulados, persistência e recarga;
- entradas inválidas, totais extremos, textos longos, foco e barra de ações;
- responsividade em 320, 390, 768, 1024 e 1440 px;
- regressão completa da R02, com adaptação do fluxo de orçamento.

O anexo `R03-ORCAMENTO.md` foi tratado como contrato criativo e funcional. Não foi introduzida regra operacional nova. As duas correções aplicadas foram estritamente técnicas e estão em [`CORRECOES.md`](CORRECOES.md).

---

## 3. Cenários do contrato R03

### Cenário 1 — rascunho sem reescrever a versão

- OS #023 abriu com **v1 de R$ 240,00** (`Serviço de reparo (demonstração inicial)`).
- O rascunho foi editado para **duas peças de R$ 50,00**, **um serviço de R$ 220,00** e **desconto de R$ 20,00**: total **R$ 300,00**.
- A v1 permaneceu em **R$ 240,00** no histórico.
- O rótulo passou a **“Itens alterados”**; a publicação não foi automática.
- O aviso de compartilhamento informou que a versão anterior está preservada, mas indisponível para nova resposta pelo link.

**Evidência:** `desktop/03-rascunho-itens-alterados-desktop-1440x900.png`; `quote-browser.cjs` Q1-01..Q1-04.

### Cenário 2 — publicar, aprovar, cobrar e receber separadamente

1. A publicação criou **v2 de R$ 300,00** e levou o status a **Negociação**.
2. A resposta simulada pelo link registrou **Aprovado** na v2.
3. Após a aprovação: status **Aprovado**, **total cobrado R$ 0,00**, **pago R$ 0,00**, cobrança **Sem cobrança**.
4. A formalização explícita criou **R$ 300,00 em aberto**, vencimento em 5 dias, preservando o status **Aprovado**.
5. Pagamento parcial de **R$ 100,00**; andamento técnico até **Finalizado**; entrega registrada; pagamento de **R$ 200,00**; total pago **R$ 300,00**.
6. Após recarregar, versões, decisão, cobrança e pagamento persistiram.

**Evidência:** `desktop/05-v2-historico-*`, `desktop/06-aprovacao-link-*`, `desktop/07-aprovado-sem-cobranca-*`, `desktop/08-formalizar-cobranca-*`, `desktop/09-cobranca-formalizada-*`; `quote-browser.cjs` Q2-01..Q2-12.

### Cenário 3 — recusa, retirada, nova versão e resposta interna

- A recusa pública registrou **Recusado**, status **Orçamento recusado** e **total zero**.
- A retirada da publicação desativou o compartilhamento (`active=false`), preservou a v1 e exibiu **“Publicação retirada”**.
- Uma nova publicação criou a **v2** (R$ 240,00, sem decisão) e reabriu a negociação.
- O rascunho foi alterado para **R$ 330,00** sem publicar: o link ficou indisponível, mas o registro interno continuou oferecido.
- O registro interno criou a **v3 com R$ 330,00**, gravou a decisão nela e manteve a **v2 intacta, sem decisão**.

**Evidência:** `desktop/11-recusa-*`, `desktop/12-publicacao-retirada-*`, `mobile/11-recusa-*`, `mobile/12-publicacao-retirada-*`; `quote-browser.cjs` Q3-01..Q3-06.

### Cenário 4 — depois da entrega/retirada do equipamento

> Nesta revisão, “após retirada” foi interpretado como **retirada do equipamento (entrega)**, que é o fluxo bloqueante descrito no item 4 do `R03-ORCAMENTO.md`. A “retirada de publicação” é o fluxo separado do cenário 3.

- Após a entrega, os botões **Publicar nova versão** e **Simular resposta pelo link** não apareceram.
- O **registro interno** continuou disponível.
- A comunicação interna na **mesma data da entrega** foi aceita; o andamento permaneceu **Orçamento** e o total continuou **zero**.
- Uma **data futura** foi recusada; o modal permaneceu aberto e a decisão não foi gravada.
- Uma **data anterior à entrega** foi aceita, preservando o andamento.
- Os guards do domínio também rejeitaram a publicação e a resposta pública após a entrega, mesmo quando chamados fora da UI.

**Evidência:** `quote-browser.cjs` Q4-01..Q4-07; `quote.cjs` (domínio).

### Cenário 5 — perfis, persistência, inválidos, extremos e responsividade

- **Administrador:** todas as ações.
- **Financeiro:** vê itens, versões, compartilhamento e cobrança; não vê ação técnica.
- **Técnico e Atendente:** veem o resumo restrito (“Valores e versões restritos”) e não abrem o editor de orçamento, inclusive por chamada direta a `openModal`.
- **Persistência:** versões, decisão, cobrança e pagamento sobreviveram a reload.
- **Inválidos:** desconto acima do total, item sem descrição, item acima do limite e data futura foram rejeitados sem gravar estado parcial.
- **Textos longos:** item de 500 caracteres sem overflow em 390 px.
- **Totais extremos:** **R$ 9.999.999,99** aceito e formatado; valor acima do limite rejeitado com “Valor de item fora do limite.”
- **Foco:** 40 Tabs permaneceram dentro do modal do editor em 1440 e 390; Escape fechou e devolveu o foco ao gatilho.
- **Barra de ações:** editor com salvamento persistente em 320/390; uma coluna no celular e duas colunas em 768/1440.
- **Colunas do orçamento:** uma coluna em 320/390/768/1024; duas colunas em 1440; sem overflow horizontal em nenhuma das cinco larguras.

**Evidência:** `testes/responsivo.md`, `testes/quote-edge.log`, `testes/axe.md`; capturas `mobile/01..09`, `desktop/01..13`, `tablet/01..09`.

---

## 4. Regressão da R02

A regressão funcional da R02 passou **37/37** sem qualquer alteração de expectativa. O que precisou de adaptação foi a **bateria de auditoria**, que codificava o contrato antigo:

| Ponto | Antes (R02) | R03 adaptado |
| --- | --- | --- |
| D01 | Aprovação “converte proposta em total cobrado” | Aprovação grava decisão, **total 0**, “Sem cobrança” |
| D04 | Histórico “Orçamento preparado / Resposta simulada” | Histórico “Orçamento: versão 1 — Aprovado” |
| D05 | Não existia | Formalização explícita de R$ 240,00, mantendo andamento |

A bateria adaptada fechou em **118 verificações: 116 PASS, 0 FAIL, 2 INFO**. Os dois INFO são os mesmos comportamentos intencionais já documentados na R02: entrega independente do andamento e formatação de valor extremo em BRL.

Também foram reexecutados, sem alteração, os testes do GPT: **smoke 72** e **quote 29**.

---

## 5. Correções técnicas pontuais

### FIX-01 — botão “Fechar” quebrava em 320 px

**Antes:** no editor de orçamento em 320×568, o botão do cabeçalho exibia **“Fecha / r”** em duas linhas porque o título e o botão disputavam a largura do `<dialog>`.
**Depois:** o cabeçalho usa `flex-wrap:nowrap`, o título pode encolher (`min-width:0`) e o botão não encolhe (`flex:none; white-space:nowrap`), com ajuste de padding/fonte abaixo de 380 px. O botão mede 44 px de altura e permanece em uma linha.
**Evidência:** `mobile/00-antes-correcao-fechar-320x568.png` (antes) e `mobile/02-editor-320-antes-de-preencher-320x568.png` (depois); `capture-r03.cjs` R03-RESP-EDITOR-narrow (`closeOneLine=true`).

### FIX-02 — contraste do breadcrumb sobre o topo sticky

**Antes:** `#breadcrumb` tinha contraste **4,46:1** sobre o fundo composto do topo translúcido, abaixo de 4,5:1 para texto normal de 12,8 px; o axe registrava **1 violação `color-contrast`** em 390 px.
**Depois:** `.top-left` recebeu a cor **#5a6d68**; o contraste passou a **4,74:1** sobre o fundo composto que antes dava 4,46:1 (**5,24:1** sobre `#f8faf7` opaco) e o axe fechou em **0 violações**.
**Evidência:** `testes/axe.md` (12 varreduras, 0 violações).

Essas são as **únicas** alterações de código desta revisão: `git diff 798b8075..b180ab6c` = **1 arquivo, +12 linhas**. Nenhuma regra de negócio, texto criativo, componente de domínio ou layout estrutural foi alterado.

---

## 6. Achados e riscos que o GPT deve decidir

Os itens abaixo **não foram corrigidos** por serem decisões de produto/regra ou por terem paridade com o Trifase. Eles estão detalhados em [`ACHADOS.md`](ACHADOS.md).

| ID | Severidade | Situação | Resumo |
| --- | --- | --- | --- |
| R03-A01 | Baixa | Aberto (design) | A tela de orçamento exibe três botões preenchidos como primários: Publicar nova versão, Registrar resposta do cliente e Formalizar cobrança. O sistema visual da R02 recomenda um primário por contexto. |
| R03-A02 | Média | Aberto (herdado) | Após recusa, “Formalizar cobrança” continua disponível e formaliza o valor. O `formalizarBloqueada` do Trifase também só bloqueia faturado/cancelado/retorno; é paridade, não uma regra nova. |
| R03-A03 | Média | Aberto (herdado) | Após a cobrança, “Publicar nova versão” e “Retirar publicação” continuam disponíveis; o `publicar`/`retirar` do Trifase não bloqueiam `faturado`. |
| R03-A04 | Baixa | Aberto (herdado) | Após a entrega, “Retirar publicação” continua disponível; `retirar` do Trifase não bloqueia entrega. |
| R03-A05 | Média | Decisão pendente | A formalização usa o **rascunho atual**, não necessariamente a versão publicada: rascunho de R$ 300,00 com v1 de R$ 240,00 permite formalizar R$ 300,00 (INFO E12). O documento diz que a formalização não é condicionada à aprovação, mas não define se ela exige versão vigente. |

Não tratei esses pontos como falha da implementação: o contrato da R03 não os define, e alterá-los introduziria regra operacional nova. Se o GPT quiser fechá-los, a recomendação é decidir primeiro o comportamento e depois criar testes RED.

---

## 7. Fidelidade ao Trifase

A comparação foi feita contra `8c256cae`, apenas para leitura:

- `Trifase_orcamento_model.php`: retrato, publicar, retirar, registrarResposta, versaoVigente.
- `Trifase_financeiro_model.php`: `formalizarBloqueada`.
- `Trifase_orcamentos.php` / `Trifase_financeiro.php`: permissões, publicação, resposta e recebimento.

O protótipo preserva as decisões centrais: versão é cópia separada; resposta pertence à versão vigente; rascunho alterado invalida a resposta pública; publicação e link são bloqueados após a entrega; registro interno é permitido; formalização é explícita e não cria recebimento.

O que o protótipo **não** prova: portal público real, token, autenticação, matriz real de permissões, catálogo/reserva de peças, conciliação, estorno, garantia completa e alterações pós-cobrança. Isso está declarado no próprio `R03-ORCAMENTO.md` e não foi tratado como ausência de qualidade.

---

## 8. Ambiente e reprodutibilidade

- Servidor estático: `python3 -m http.server 8130 --bind 0.0.0.0`, a partir de `interface_gpt/`.
- Navegador: Chromium local `chromium-1248/chrome-linux64/chrome`.
- `playwright-core` e `axe-core 4.14.1` em `interface-gpt-lab/tools/node_modules`.
- `BASE_URL=http://127.0.0.1:8130`; `SHA_TESTED=798b8075...` nos logs.
- Comandos e descrição de cada script: [`testes/README.md`](testes/README.md).
- Todos os dados são fictícios e vivem em `localStorage`; não há login, token, rede ou banco.

---

## 9. Conclusão

O incremento R03 cumpre o contrato funcional central e a mudança intencional de desvincular aprovação de cobrança. As duas correções técnicas são pequenas, reproduzíveis e comprovadas por antes/depois. A bateria final não tem falhas; as ressalvas são de produto e de escopo, não de execução.

**Recomendação:** o GPT pode seguir para a próxima rodada de decisão usando este pacote. Antes de integrar, decidir os cinco pontos de `ACHADOS.md` e substituir a simulação local por portal/token e permissões reais.

A R02 permanece como baseline publicado; a R01 permanece preservada; a `v5-trifase` e a produção não foram tocadas.
