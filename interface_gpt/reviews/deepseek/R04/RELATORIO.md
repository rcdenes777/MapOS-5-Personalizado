# Relatório R04 — Portal do cliente e refinamentos do orçamento

**Rodada:** R04 — portal do cliente
**Revisor:** DeepSeek, revisão independente da implementação do GPT
**Data:** 25/11/2026
**Repositório:** `rcdenes777/MapOS-5-Personalizado`
**Branch:** `interface-gpt`
**Incremento avaliado:** `431c428270e2ca98fece34c8ebc58624320b8628`
**Árvore de código testada:** `df925de31c09b2cc116abb025e9fdca5d39f5183` (incremento + correção CSS do selo em 320)
**Baseline R03:** evidências `0fa965b3`; árvore validada `b180ab6c`
**Referência funcional:** `8c256cae4ddaeefad68922abddbb8addfe37c99d`
**Pasta no GitHub:** https://github.com/rcdenes777/MapOS-5-Personalizado/tree/interface-gpt/interface_gpt/reviews/deepseek/R04

Nenhum arquivo fora de `interface_gpt/` foi alterado. Não houve merge, deploy, alteração da branch `v5-trifase` ou da produção. R01, R02 e R03 foram preservadas.

---

## 1. Resumo executivo

| Verificação | Resultado |
| --- | --- |
| `tests/smoke.cjs` | **72 combinações perfil×rota, PASS** |
| `tests/quote.cjs` | **29/29 PASS** |
| `tests/portal.cjs` | **24/24 PASS** |
| `tests/portal-page.cjs` | **8/8 PASS** |
| Navegador real — portal e administração (`browser.cjs`) | **44/44 PASS** |
| Bordas, concorrência e privacidade (`edge.cjs`) | **15/15 PASS** |
| Bateria R03 adaptada (`audit-r03.cjs`) | **118: 116 PASS, 0 FAIL, 2 INFO** |
| Regressão R02 (`regressao-r02.cjs`) | **37/37 PASS** |
| Responsividade e capturas (`capture.cjs`) | **27/27 PASS** |
| axe-core 4.14.1 (WCAG 2.2 A/AA) | **22 varreduras, 0 violações** |
| Teclado / escolha inicial / submit do portal | **6/6 PASS** |
| Capturas | **81 PNG** (45 desktop, 31 celular, 5 tablet), 0 duplicadas |
| Exceções JavaScript / requisições externas | **0 / 0** |

**Veredito:** **APTO COM RESSALVAS PARA O DELTA R04**, no laboratório. O portal cumpre o contrato de apresentação, decisão, link, versionamento, privacidade e independência financeira. **Não é homologação para produção**: o identificador é local, não há autenticação, CSRF, isolamento entre usuários nem expiração contínua, conforme o próprio `R04-PORTAL.md`.

**Nota qualitativa do delta:** **8,5/10** na mesma escala experimental da R01 (7,3/10), considerando cobertura funcional, acessibilidade automatizada, hierarquia e legibilidade. Como mecanismo de segurança real, a nota é **0/10** — e isso é uma limitação declarada, não um defeito escondido.

---

## 2. O que foi validado

O laboratório foi atualizado por fast-forward ao SHA `431c4282`. A bateria cobre:

- geração de link local, token de 64 hex, validade de 120 dias, renovação, expiração, revogação, novo link e revogação durante o preenchimento;
- abertura do portal **em aba separada**, com atualização entre abas por `storage`, sem reload;
- aprovação e recusa diretamente na página do cliente, com nome, confirmação e **nenhuma escolha pré-selecionada**;
- preservação de versões e decisões, rascunho alterado, v2 publicada, resposta em versão antiga e resposta após retirada;
- modo somente consulta após entrega, sem formulário, sem recebedor e sem data de retirada;
- independência entre aprovação, formalização, pagamento, entrega e quitação;
- projeção pública fechada, sem cliente, telefone, série, IMEI, defeito interno, laudo, histórico, observação interna ou token;
- avisos administrativos de divergência de valores e de proposta recusada;
- hierarquia contextual dos botões: um único primário por estado;
- responsividade de 320 a 1920 px, contraste, foco, overflow e teclado;
- regressões R02 e R03 adaptadas ao portal.

---

## 3. Link do cliente

### Geração

O painel administrativo deixa de exibir a simulação antiga e passa a ter **“Link do cliente”** com:

- `Sem link ativo` e botão **Gerar link de demonstração**;
- `Link ativo`, **Abrir visão do cliente** e **Gerenciar link** depois da geração;
- validade exibida (ex.: `25/03/2027 · 17:06`), **Ver endereço para copiar**, **Renovar validade** e **Revogar link**.

O token gerado tem **64 caracteres hexadecimais**, a validade é de **120 dias simulados** e o endereço contém `portal.html#<token>`. A geração é explícita; abrir o orçamento não cria link.

### Renovação

Renovar mantém o **mesmo endereço** e estende a validade. O portal aberto continua válido; o teste L07 confirmou token idêntico e expiração maior.

### Expiração

Ao colocar a expiração no passado, o portal passa a **Link indisponível** e o painel volta a **Sem link ativo**. Um novo link recebe **novo token**; o token anterior deixa de resolver. A expiração é reavaliada em recarga, foco, mudança de hash ou evento de armazenamento — **não há timer contínuo**, como declarado nas limitações do R04.

### Revogação

Revogar:

- invalida o endereço imediatamente;
- **preserva versões e decisões**;
- **não apaga o orçamento**;
- é propagado para outra aba **sem reload**;
- se o cliente estiver com o formulário aberto, o formulário desaparece e uma resposta direta é rejeitada.

**Evidências:** `desktop/admin-link-ativo-1440-1440x900.png`, `desktop/admin-renovar-link-1440-1440x900.png`, `desktop/admin-revogar-link-1440-1440x900.png`, `mobile/portal-link-invalido-390-390x844.png`; `browser.cjs` L01–L11; `edge.cjs` X01–X03.

---

## 4. Portal do cliente

### Apresentação pública

A página independente `portal.html` exibe somente:

- número da OS, andamento, entrada, previsão e equipamento;
- versão vigente, itens, totais, desconto, condições publicadas e textos de equipamento/defeito/diagnóstico **da versão publicada**;
- decisão registrada (resposta, nome, data, origem e indicador pós-entrega);
- resumo financeiro **somente quando há cobrança**: total, pago, saldo e situação;
- bloco de arquivos compartilhados vazio nesta demonstração.

Não há shell administrativo, menu interno, histórico privado, cliente, telefone, série, IMEI, laudo, observação interna, custos, estoque ou operador.

### Decisão

- Os dois rádios começam **desmarcados** (`checked=false`).
- Aprovar/recusar exige nome (mínimo 3), escolha explícita e confirmação de itens/total.
- A resposta grava decisão **na versão vigente**, atualiza o status e **não cria cobrança**.
- O portal passa para **Resposta registrada**, sem formulário; a aba administrativa atualiza por `storage`.
- Segunda resposta, resposta em versão antiga, resposta após retirada, após entrega ou após revogação são rejeitadas.

**Evidências:** `desktop/portal-inicial-1440-1440x900.png`, `mobile/portal-decisao-390-390x844.png`, `mobile/portal-aprovado-390-390x844.png`, `mobile/portal-recusado-390-390x844.png`; `browser.cjs` B01–B07, C01–C07.

### Versões e atualização entre abas

- Rascunho alterado e não publicado faz o orçamento **desaparecer do portal**; a página continua ativa, mas mostra “Não há orçamento publicado”.
- Publicar v2 atualiza a outra aba sem reload, mostra **Versão 2** e preserva a v1 no histórico administrativo.
- Forçar o formulário para a versão 1 e enviar resulta em erro explícito e **não grava decisão**.
- Retirar a publicação esconde o orçamento, mas **não revoga o link**.
- O portal aberto recebe decisão, publicação, pagamento, entrega e revogação por evento de armazenamento.

**Evidências:** `desktop/portal-pagina-inteira-1440-1440x900-full.png`, `desktop/portal-sem-orcamento-1440-1440x900.png`, `desktop/portal-recusado-1440-1440x900.png`; `edge.cjs` X01–X04.

### Entrega

Após a entrega, o orçamento vigente fica **somente para consulta**:

- não há formulário;
- aparece “Equipamento entregue. Orçamento disponível somente para consulta.”;
- a decisão anterior permanece visível;
- recebedor e data de retirada **não** são expostos;
- resposta pública é rejeitada no domínio.

**Evidências:** `mobile/portal-apos-entrega-390-390x844.png`, `desktop/portal-apos-entrega-1440-1440x900.png`; `browser.cjs` D01–D03.

### Financeiro

- Sem cobrança, a seção **Pagamento** não aparece.
- A formalização explícita cria **R$ 240,00 em aberto** e o portal passa a mostrar total, pago, saldo e situação.
- Pagamento parcial de R$ 100,00 mostra **Parcialmente paga** e saldo R$ 140,00.
- Quitação mostra **Quitada** e saldo zero.
- A aprovação continua independente da cobrança e do pagamento.

**Evidências:** `mobile/portal-cobranca-390-390x844.png`, `mobile/portal-cobranca-parcial-390-390x844.png`, `desktop/portal-cobranca-1440-1440x900.png`; `browser.cjs` E01–E04.

---

## 5. Privacidade, escaping e conteúdo longo

Foram injetados dados fictícios privados em cliente, telefone, defeito, laudo, série, IMEI, itens, histórico e observação interna da decisão. O HTML do portal não os contém. O token também não é impresso no corpo da página.

Textos publicados com HTML (`<img onerror…>`) são escapados; o diagnóstico longo permanece visível dentro das informações do orçamento e **não cria overflow em 320 px**. O portal não carrega recursos externos.

**Evidências:** `browser.cjs` F01–F03, `edge.cjs` X12–X14.

---

## 6. Hierarquia administrativa e avisos

- **Um único primário por estado:** resposta no estado inicial; publicar quando o rascunho está alterado; formalizar após aprovação/recusa; nenhum primário quando a cobrança já foi criada.
- A **história vem depois das operações** no celular; em telas largas, o painel de operações fica à direita e o histórico abaixo da proposta.
- O aviso de divergência informa os itens atuais, o valor publicado e que a cobrança usa os itens atuais: `Os itens atuais somam R$ 300,00. A versão publicada soma R$ 240,00. A cobrança usa os itens atuais da OS.`
- A recusa gera aviso próprio antes de formalizar.
- O modal de cobrança repete o aviso e mantém o foco no fluxo.

**Evidências:** `desktop/admin-inicial-1440-1440x900.png`, `desktop/admin-rascunho-divergente-1440-1440x900.png`, `desktop/admin-cobranca-aviso-1440-1440x900.png`, `mobile/admin-recusa-aviso-390-390x844.png`; `browser.cjs` G01–G04.

---

## 7. Responsividade e acessibilidade

- Portal sem overflow em **320, 360, 390, 412, 768, 1024, 1366, 1440 e 1920 px**.
- Cabeçalho do portal contido; **selo “Demonstração” em uma linha em 320** após a correção F04-01.
- Decisão em **uma coluna** até 412 e **duas** a partir de 768.
- Administração em **uma coluna** até 1024 e **duas** em 1366/1440/1920; sem overflow.
- axe-core: **22 varreduras, 0 violações** (WCAG 2.2 A/AA), incluindo portal pendente, aprovado, pagamento, entrega, link indisponível e modal de cobrança.
- Teclado: os dois rádios, nome, confirmação e submit são alcançáveis; nenhuma escolha inicial; Escape devolve foco nos modais administrativos testados.
- A atualização entre abas substitui conteúdo sem `aria-live` dedicado; isso é uma limitação de anúncio para leitor de tela, não uma violação axe detectada.

**Evidências:** `testes/responsivo.md`, `testes/axe.md`, `testes/a11y-resultados.json`; capturas de 320 a 1920.

---

## 8. Correção técnica

### F04-01 — selo “Demonstração” quebrava em 320 px

**Antes:** `Demonstraç / ão` em duas linhas no cabeçalho do portal.
**Depois:** selo em uma linha, cabeçalho dentro da largura e sem overflow.
**Correção:** apenas `assets/portal.css`; commit `df925de3` (1 arquivo, +8/-1).
**Evidência:** `mobile/00-antes-fix-demo-320.png` (antes) e `mobile/portal-inicial-320-320x568.png` (depois); `responsivo.json` registra `demoOneLine=true`.

Nenhuma regra operacional, texto criativo, identidade visual, backend, banco ou arquivo fora de `interface_gpt` foi alterado. A R03 permanece preservada; o CSS do painel administrativo foi o entregue pelo GPT.

---

## 9. Regressões e adaptação do fluxo antigo

| Regressão | Resultado | Adaptação |
| --- | --- | --- |
| R02 — 37 verificações funcionais | **37/37 PASS** | Nenhuma alteração; executada em cópia R04. |
| R03 — auditoria (118 verificações) | **116 PASS / 0 FAIL / 2 INFO** | Cópia em R04; o fluxo interno continua válido. |
| R03 — navegador com resposta pública | **substituído** | O antigo modal “Simular resposta pelo link” não é mais usado; a decisão pública foi movida para `portal.html` e coberta por `browser.cjs` B/C/D/E. |
| Portal — domínio do GPT | **24/24 PASS** | Executado em `node tests/portal.cjs`. |
| Portal — renderização | **8/8 PASS** | Executado em `node tests/portal-page.cjs`. |

Os 2 INFO da auditoria R03 continuam sendo os comportamentos intencionais já conhecidos (entrega independente e formatação de valor extremo), não regressões da R04.

---

## 10. Achados e limitações

Os itens abaixo não foram corrigidos por serem decisões de produto, limites declarados ou simulação local:

- **F04-01 (corrigido):** selo “Demonstração” em 320.
- **R04-A01:** o identificador local **não é segurança**: não há servidor, CSRF, autenticação, isolamento entre usuários, token cifrado ou garantia transacional. Está declarado no R04 e no rodapé do portal.
- **R04-A02:** expiração não é contínua em aba aberta; é reavaliada em recarga, foco, hash ou evento de armazenamento. O R04 declara a limitação.
- **R04-A03:** atualização entre abas troca o DOM sem anúncio `aria-live` dedicado; axe não encontrou violação, mas leitores de tela podem não anunciar a mudança.
- **R04-A04:** “Ver endereço para copiar” exibe e seleciona o endereço; não usa a Clipboard API. O rótulo foi escolhido para não prometer cópia automática.
- **R04-A05:** sem publicação, o link continua ativo e o portal mostra “Não há orçamento publicado”, conforme a decisão do R04; retirar publicação não revoga o link.

Nenhum desses itens é uma regra operacional nova. O GPT deve decidir se quer tratá-los na próxima rodada.

---

## 11. Comparação R03 → R04

| Ponto | R03 | R04 |
| --- | --- | --- |
| Resposta pública | Modal “Simular resposta pelo link” | Página independente `portal.html` com link, validade, renovação e revogação |
| Link | Inexistente | Geração explícita, 120 dias, renovar, revogar e copiar endereço |
| Hierarquia do orçamento | Até três botões primários concorrentes | Um primário contextual por estado; histórico depois das operações no celular |
| Portal | Projeção simulada na mesma tela | Página separada, sem shell administrativo |
| Privacidade | Não havia projeção pública real | Allowlist de campos e testes de vazamento/XSS |
| Entrega | Sem portal para consulta | Portal somente consulta, sem formulário, recebedor ou data de retirada |
| Aviso financeiro | Apenas texto de cobrança | Aviso de divergência entre rascunho, versão publicada e cobrança |

**Evidência comparativa:** R03 `desktop/01-orcamento-v1-desktop-1440x900.png` e `desktop/06-aprovacao-link-desktop-1440x900.png` (preservadas) contra R04 `desktop/admin-inicial-1440-1440x900.png`, `desktop/admin-link-ativo-1440-1440x900.png` e `desktop/portal-inicial-1440-1440x900.png`.

---

## 12. Ambiente e reprodutibilidade

- Servidor estático em `interface_gpt/`: `python3 -m http.server 8130 --bind 0.0.0.0`.
- Chromium local `chromium-1248/chrome-linux64/chrome`.
- `playwright-core` e `axe-core 4.14.1` em `interface-gpt-lab/tools/node_modules`.
- `BASE_URL=http://127.0.0.1:8130`; `incrementSha=431c4282` e `codeSha=df925de3` registrados nos JSONs.
- Manifesto de hashes e explicação da árvore: [`testes/proveniencia.json`](testes/proveniencia.json).
- Comandos: [`testes/README.md`](testes/README.md).

Os dados são fictícios e ficam no `localStorage`; não há login, token real, banco ou chamada de rede externa.

---

## 13. Conclusão

O R04 está **funcionalmente completo no escopo experimental** e não introduziu violação do contrato de orçamento, privacidade ou financeiro. As duas suítes do GPT para o portal, os 44 fluxos de navegador, os 15 casos de borda e as 22 varreduras axe fecham sem falhas. A única correção de produto foi visual e restrita ao selo de 320 px.

A entrega **não autoriza merge, deploy ou uso com clientes reais**. O portal continua sendo uma demonstração local; a próxima etapa real é substituir o identificador local por endpoints autenticados e proteção de backend, além de decidir os pontos abertos acima.
