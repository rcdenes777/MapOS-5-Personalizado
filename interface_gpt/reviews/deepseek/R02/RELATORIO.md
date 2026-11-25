# Relatório R02 — MapOS Bancada

**Rodada:** R02 (correções e refinamentos)
**Revisor/implementador:** DeepSeek, sob direção criativa do GPT
**Data:** 25/11/2026
**Repositório:** `rcdenes777/MapOS-5-Personalizado`
**Branch:** `interface-gpt`
**SHA inicial da R02:** `da3fa68dab9c3d0fd90499ee8b7079abb754ae74`
**Commit das correções técnicas:** `fe27e12a280859e585dfb2f7a8c6d3ba18718106`
**Commit dos refinamentos visuais:** `789d86229bb48aa3b53f5bfe59cff483d2a46689`
**SHA final do código antes das evidências:** `789d8622`
**Commit das evidências (92 capturas, testes e logs):** `fbea8b01f92fb4da3ae6927294d0eb020f206a6f`
**Commit da errata e ajuste da captura 98:** `23fdf9ead8174074e903403a5cea69ed9e0da630`
**Baseline funcional do MapOS:** `8c256cae4ddaeefad68922abddbb8addfe37c99d`
**Errata da auditoria cega da R01:** [`ERRATA-R01.md`](ERRATA-R01.md)
**Pasta no GitHub:** https://github.com/rcdenes777/MapOS-5-Personalizado/tree/interface-gpt/interface_gpt/reviews/deepseek/R02

Nenhum arquivo fora de `interface_gpt/` foi alterado. Não houve merge, deploy ou mudança na `v5-trifase`. As evidências da R01 foram preservadas em `reviews/deepseek/R01/`.

---

## 1. Resumo executivo

| Verificação | Resultado |
| --- | --- |
| Regressão específica das correções (`regressao.cjs`) | **37/37 PASS**, 0 FAIL |
| Bateria R01 adaptada (`audit.cjs`) | **117 verificações: 115 PASS, 0 FAIL, 2 INFO** |
| Smoke existente (`tests/smoke.cjs`) | **PASS** — 72 combinações perfil×rota |
| axe-core 4.14 (WCAG 2.2 A/AA) | **26 varreduras, 0 violações** |
| Fluxos A–I | **PASS** (2 INFO: entrega independente e formatação de valor extremo) |
| Persistência | **PASS** — 11 ordens após recarregar |
| Requisições externas | **0** |
| Capturas | **92** (49 desktop, 35 celular, 8 tablet), todas < 190 KB |
| Nota média | **7,8/10** (era 7,3 na R01) |

Os dois achados altos da R01 foram corrigidos; todos os médios foram corrigidos ou deliberadamente documentados conforme a decisão do GPT. O único achado funcional da R01 mantido é a sobrescrita de proposta (M-06), explicitamente fora de escopo nesta rodada.

---

## 2. Escopo executado e arquivos

O briefing autorizou correções técnicas pontuais e refinamentos visuais específicos, mantendo a identidade e a arquitetura. Foram alterados apenas:

| Arquivo | Mudança |
| --- | --- |
| `interface_gpt/assets/app.js` | Atalho de conteúdo, foco do modal, overflow/plural/datas/placeholder, contexto de perfil, regra de entrega, filtro mobile, navegação, opcionais. |
| `interface_gpt/assets/style.css` | Container query dos cartões, `overflow-wrap`, tipografia mínima, alvos de toque, `@page`, painel compacto, filtros, estatísticas da OS, barra de ações, cabeçalhos mobile. |
| `interface_gpt/assets/favicon.svg` | Novo favicon local (sem requisição externa). |
| `interface_gpt/index.html` | Link do favicon e nome acessível da marca mobile. |

`git diff --stat da3fa68d..789d8622`: **4 arquivos, +99/−17**. Nenhum arquivo do sistema MapOS, da `v5-trifase` ou da pasta R01 foi tocado.

Commits separados, como pedido:

1. `fe27e12a` — correções técnicas.
2. `789d8622` — refinamentos visuais.
3. Commit de evidências (este pacote R02).

---

## 3. Correções técnicas (Grupo 1)

### 3.1 A-01 — Atalho de conteúdo

O link "Pular para o conteúdo" agora usa `preventDefault` e move o foco para `#main` com `scrollIntoView`, sem alterar `location.hash`. O roteador não vê mais `#main` como rota. O listener é defensivo para o DOM simulado do smoke test, que não implementa `addEventListener` no nó.

**Evidência:** `G1-01` — antes: `hash=#main`, `h1="Ação indisponível"`; depois: `hash=""`, `h1="O que precisa de atenção?"`, foco em `main`.

### 3.2 A-02 — Overflow de textos longos

`body { overflow-wrap: anywhere }` e `min-width: 0` já existente nos contêineres permitem quebrar palavras sem esconder conteúdo. O teste injeta nome de 150 caracteres, modelo de 160 e defeito de 400, todos sem espaços, dentro dos `maxlength`.

| Resolução | Overflow do detalhe (R01) | Overflow do detalhe (R02) | Overflow da lista (R01) | Overflow da lista (R02) |
| --- | --- | --- | --- | --- |
| 1920×1080 | 3.981 px | **0** | 0 | **0** |
| 1440×900 | 4.338 px | **0** | 0 | **0** |
| 1366×768 | 4.412 px | **0** | 34 px | **0** |
| 768×1024 | 3.937 px | **0** | 366 px | **0** |
| 412×915 | 4.293 px | **0** | 722 px | **0** |
| 390×844 | 4.315 px | **0** | 744 px | **0** |
| 360×800 | 4.339 px | **0** | 768 px | **0** |
| 320×568 | 4.379 px | **0** | 808 px | **0** |

**Evidência:** `G1-02-1920` a `G1-02-320`; capturas `mobile/96-r02-texto-longo` e `97-r02-texto-longo-lista`.

### 3.3 M-01 — Cartões adaptados ao contêiner

`.list` virou container (`container-type: inline-size`) e o layout de três colunas do cartão passou de media query de viewport para `@container (min-width: 620px)`. O cartão da coluna direita do painel (387 px) agora fica em uma coluna; o cartão largo continua em três.

| Medida | R01 | R02 |
| --- | --- | --- |
| Largura do cartão estreito | 387 px | 387 px |
| Altura | 208 px | **139 px** |
| Colunas computadas | 3 | **1** |
| Linhas do título | 5 | **1** |
| Cartão largo | 3 colunas | 3 colunas |

**Evidência:** `G1-03`/`G1-03b`; captura `desktop/90-r02-cartao-lista-estreita` (comparar com `R01/desktop/91-achado-cartao-lista-estreita`).

### 3.4 M-04 — Foco no modal

Foi adicionado um trap de foco no `keydown` do diálogo: Tab no último focável vai ao primeiro; Shift+Tab no primeiro vai ao último; se o foco estiver fora (por exemplo, `BODY`), o próximo Tab o devolve ao diálogo. `Escape` continua fechando pelo comportamento nativo e devolvendo o foco ao gatilho.

**Evidência:** `G1-04` (12 Tabs contidos), `G1-04b` (Escape/retorno) e `G1-04c` (Shift+Tab).

### 3.5 Favicon, toque, texto, plural, datas, placeholder, marca e impressão

| Item | Antes | Depois |
| --- | --- | --- |
| Favicon | 404 em todas as cargas | `assets/favicon.svg`, sem 404 |
| Alvos de toque | marca 34×26; `summary` 24 px | ambos ≥ 44 px; `G1-06` |
| Texto auxiliar | 11,2–11,8 px | todos ≥ 12 px; `G1-07` |
| Plural | "1 atendimentos", "1 ordens encontradas" | "1 atendimento", "1 ordem encontrada"; `G1-08/08b` |
| Datas | ISO no histórico e formatos misturados | `DD/MM/YYYY` ou `DD/MM/YYYY · HH:mm`; `G1-10` |
| Placeholder | sem "defeito" | "Buscar OS, cliente, equipamento ou defeito"; `G1-09` |
| Marca mobile | `aria-label="Início"` com texto "m." | `aria-label="m. · MapOS Bancada"`; `G1-11`, axe 0 |
| Impressão | sem `@page`; folha 800 px | `@page` A4 12 mm; `@page cupom` 80 mm/3 mm; `G1-12` |

A impressão agora distingue A4 e cupom: `@page { size: A4 portrait; margin: 12mm }`, `@page cupom { size: 80mm 150mm; margin: 3mm }` e `.print-sheet.coupon { page: cupom; width: 74mm }`. A prévia em tela mantém 800 px; a mídia de impressão usa `width:100%; max-width:800px`, sem o estouro de 800 px sobre a área útil A4 (794 px a 96 dpi).

### 3.6 Contexto ao trocar de perfil

A troca de perfil preserva a rota atual quando o novo perfil tem acesso (por exemplo, `#os/20` → Técnico permanece em `#os/20`). Quando não tem, volta para `#inicio` (por exemplo, `#configuracoes` → Técnico). **Evidência:** `G1-13`/`G1-13b`; `testes/extras.json`.

---

## 4. Refinamentos visuais (Grupo 2)

A identidade foi preservada: mesma paleta verde/creme, tipografia, ícones de traço, sidebar escura e componentes. As mudanças são de densidade e composição.

### 4.1 Painel

- Banner reduzido: 230 → **130 px** em 390; 260 → **41 px** em 320; 157 → **137 px** em 1440.
- Métricas: 377 → **230 px** em 390; 402 → **113 px** em 320 (três colunas em 390; carrossel horizontal em ≤360).
- Primeira OS: 995 → **659 px** em 390; 1.139 → **461 px** em 320; 643 → **622 px** em 1440.
- As seis filas continuam presentes e clicáveis; em 320 ficam em uma linha horizontal com `scroll-snap`.
- Em ≤360, a ação "Nova OS" duplicada do cabeçalho foi ocultada; a ação continua no menu inferior. O banner mantém a faixa escura e o título.

**Evidência:** `desktop/01`, `mobile/01`, `mobile/90`, `mobile/95`; regressão `G2-01`/`G2-01b`.

### 4.2 Filtros mobile

Abaixo de 880 px, os sete chips são substituídos por um seletor "Fila" de 44 px, com o filtro ativo visível e a pesquisa preservada. Acima de 880 px, os chips continuam.

| Medida | R01 | R02 |
| --- | --- | --- |
| Primeiro resultado em 390 | 680 px | **392 px** |
| Primeiro resultado em 320 | 677 px | **389 px** |
| Altura dos filtros em 390 | 294 px | **44 px** |
| Chips no desktop | 7 | 7 (inalterado) |

**Evidência:** `G2-02`; capturas `mobile/03`, `mobile/98-r02-filtros-compactos`.

### 4.3 Detalhe da OS no celular

Os três cartões passaram a linhas compactas com rótulo, estado, informação complementar e ação contextual à direita. Os três estados continuam independentes. Não houve redução de texto abaixo de 12 px nem de alvos abaixo de 44 px; os botões têm 104–128 px de largura.

| Medida | R01 | R02 |
| --- | --- | --- |
| Altura dos três cartões em 390 | 500 px | **277 px** |
| Topo das abas em 390 | 769 px | **516 px** |
| Altura dos três cartões em 320 | 500 px | **255 px** |
| Topo das abas em 320 | 790 px | **487 px** |

**Evidência:** `G2-03`; capturas `mobile/06` e `mobile/94-r02-os-compacta`.

### 4.4 Nova OS

- Barra de ações persistente: `position: fixed` no mobile, acima do menu inferior (64 px de folga), e flutuante no desktop (`right:28px; bottom:20px`), sem ocupar a largura toda.
- O formulário ganhou `padding-bottom:120px` e os campos `scroll-margin-bottom:160px`; ao focar o campo de defeito, ele fica acima da barra (`fieldBottom=555 < barTop=715`).
- Selo, série e IMEI foram recolhidos em "Dados opcionais (selo, série e IMEI)"; continuam no DOM e são enviados pelo formulário. Os obrigatórios e as validações nativas seguem visíveis.
- O submit está visível em 390 (`top=726`, barra 715–780, menu em 783) e em 320 (`top=450`, barra 439–504, menu em 507).

**Evidência:** `G2-04`, `G2-04b`, `G2-05`; capturas `desktop/91-r02-nova-os-barra`, `mobile/99-r02-nova-os-barra`, `mobile/04`.

### 4.5 Navegação e cabeçalhos mobile

- A navegação inferior agora destaca apenas a aba atual: em `#nova`, só `#nova`; em `#os/20`, só `#ordens`. O sidebar continua destacando "Ordens de serviço" para as rotas de OS.
- Cabeçalhos mobile: margens e espaçamentos reduzidos; o texto explicativo do painel é ocultado em ≤600 px; em ≤360 o breadcrumb é ocultado e o banner vira uma faixa curta. As informações operacionais (cliente, entrada, estado, ações) permanecem.
- **Evidência:** `G2-06`/`G2-06b`; capturas `mobile/01`, `mobile/04`, `mobile/90`.

---

## 5. Fidelidade operacional (Grupo 3)

### 5.1 M-05 — entrega e andamento

A R01 sugeria travar a entrega por status. O GPT conferiu o Trifase e determinou que **a entrega é independente do andamento técnico**. A R02 não criou essa trava. O que foi corrigido foi a trava excessiva do protótipo: antes, qualquer alteração de andamento era recusada se existisse entrega; agora:

- entregar uma OS em "Em Andamento" continua permitido;
- depois da entrega, a OS pode ser finalizada (desde que aprovada);
- reabrir uma OS **finalizada e entregue** continua bloqueado, com a mensagem "Equipamento entregue: registre outro atendimento em vez de reabrir esta OS.", espelhando `Trifase_atendimento_model::prepararTransicao`;
- nenhuma outra restrição operacional foi adicionada.

**Evidência:** `G3-01` (entrega + finalização = PASS) e `G3-02` (reabertura bloqueada = PASS); `desktop/92-r02-entrega-independente`. O fluxo E da bateria também confirma pagamento e entrega independentes.

### 5.2 M-06 — orçamento

Não foi implementado versionamento, conforme o briefing. A divergência permanece e está documentada: a OS #023, com proposta de R$ 240,00 e aprovação "Aguardando resposta", aceita uma nova proposta de R$ 300,00 sem versão ou confirmação; o histórico registra apenas "Orçamento preparado". Evidência em `testes/extras.json`. O módulo de orçamento será ampliado pelo GPT após o estudo das regras de versão, aprovação e recusa.

### 5.3 Cancelamentos

Nenhum módulo de cancelamento foi criado. A fila "Cancelamentos pendentes" continua sem fluxo completo; é uma lacuna conhecida, registrada em `ACHADOS-R01-STATUS.md`.

---

## 6. Validação

### 6.1 Testes

| Suíte | Resultado |
| --- | --- |
| `tests/smoke.cjs` (existente) | 72 combinações perfil×rota; PASS |
| `regressao.cjs` (nova) | 37/37 PASS — correções técnicas, refinamentos visuais e medições antes/depois |
| `audit.cjs` (R01 adaptada) | 117: 115 PASS, 0 FAIL, 2 INFO |
| `axe.cjs` | 26 varreduras (12 telas × 2 resoluções + modal), 0 violações |
| `extras.cjs` | Proposta sobrescrita documentada, `@page` presente, perfil preservado, overflow 0 em 1440/390/320 |

Os 2 INFO da auditoria são: E03 (entrega independente do andamento, comportamento intencional) e L07 (formatação de valor extremo em BRL). Não há FAIL.

### 6.2 Fluxos A–I

| Fluxo | Resultado | Observação |
| --- | --- | --- |
| A — equipamento novo | PASS | OS #025; campos opcionais recolhidos, obrigatórios preservados |
| B — equipamento existente | PASS | OS #026 vinculada à unidade #020 |
| C — catálogo e volta ao manual | PASS | catálogo limpa ao editar a marca |
| D — orçamento/aprovação/atendimento/finalização | PASS | OS #023; proposta vira total; conclusão registrada |
| E — pagamento parcial, entrega e quitação | PASS | OS #022; saldo e quitação corretos |
| F — entrega para terceiro | PASS | autorização e recebedor persistidos |
| G — retorno sem itens/estado | PASS | OS #027 com origem #020 |
| H — quatro perfis | PASS | 29 asserções de menu, valores e bloqueios |
| I — persistência | PASS | 11 ordens após recarregar |

### 6.3 Perfis, rede, console e persistência

- **Perfis:** Administrador, Técnico, Atendente e Financeiro mantêm menus e bloqueios; Técnico/Atendente não veem `R$`.
- **Rede:** 0 requisições externas; todas para `127.0.0.1:8130`; nenhum `fetch`/XHR.
- **Console:** 0 exceções JS; 0 avisos; favicon resolvido (sem 404).
- **Persistência:** 11 ordens após reload; pagamento, entrega e retorno preservados.

### 6.4 Responsividade

As oito resoluções do briefing foram cobertas. Com o seed, não há rolagem horizontal nem elementos fora da viewport; o único caso de "fora da viewport" é o carrossel intencional de métricas em ≤360, dentro de um contêiner com `overflow-x:auto` (excluído corretamente pelo detector). Com texto longo, o overflow é 0 em todas as oito resoluções.

| Resolução | Primeira OS (painel) | Primeiro resultado (lista) | Topo das abas da OS |
| --- | --- | --- | --- |
| 1440×900 | 622 px | 372 px | 389 px |
| 768×1024 | 707 px | 350 px | 394 px |
| 390×844 | 659 px | 392 px | 516 px |
| 320×568 | 461 px (menu em 507) | 389 px | 487 px |

### 6.5 Impressão

- A4: `@page` 12 mm, conteúdo em 800 px na prévia e `max-width:800px` na mídia de impressão.
- Cupom: `@page cupom` 80×150 mm, margem 3 mm; folha de 74 mm.
- A prévia A4 e o cupom continuam sem validade comercial; o documento real ainda é uma lacuna declarada.

### 6.6 Firefox e WebKit

Não estavam disponíveis no cache local do Playwright (apenas Chromium 1248 foi instalado) e não foram baixados nesta rodada. A verificação complementar fica registrada como pendência; a bateria principal é Chromium.

---

## 7. Evidências comparativas

A pasta R02 usa os mesmos dados, resoluções e enquadramentos da R01. Pares principais:

| Correção | R01 (antes) | R02 (depois) |
| --- | --- | --- |
| Painel compacto | `R01/desktop/01-painel-1440x900.png` · `R01/mobile/01-painel-390x844.png` | `desktop/01-painel-1440x900.png` · `mobile/01-painel-390x844.png` |
| Cartão em contêiner estreito | `R01/desktop/91-achado-cartao-lista-estreita-1440x900.png` | `desktop/90-r02-cartao-lista-estreita-1440x900.png` |
| Filtros mobile | `R01/mobile/98-achado-filtros-empilhados-390x844.png` | `mobile/98-r02-filtros-compactos-390x844.png` |
| Detalhe da OS compacto | `R01/mobile/06-os-detalhe-resumo-390x844.png` | `mobile/06-os-detalhe-resumo-390x844.png` · `mobile/94-r02-os-compacta-390x844.png` |
| Nova OS com barra | `R01/desktop/92-achado-nova-os-submit-fora-da-tela-1440x900.png` · `R01/mobile/99-achado-nova-os-submit-fora-da-tela-390x844.png` | `desktop/91-r02-nova-os-barra-1440x900.png` · `mobile/99-r02-nova-os-barra-390x844.png` |
| Texto longo | `R01/mobile/96-achado-texto-longo-390x844.png` · `97-...lista` | `mobile/96-r02-texto-longo-390x844.png` · `97-r02-texto-longo-lista-390x844.png` |
| Entrega independente | `R01/desktop/93-achado-entrega-os-nao-finalizada-1440x900.png` | `desktop/92-r02-entrega-independente-1440x900.png` |
| Impressão A4/80 mm | `R01/desktop/19`, `20`, `36`, `37` | `desktop/19`, `20`, `36`, `37` |
| Clientes/datas/plural | `R01/desktop/21`, `16` | `desktop/21`, `16` |

O índice completo, com todas as 92 imagens e links relativos, está em [`INDICE.md`](INDICE.md).

---

## 8. Notas atualizadas

| Critério | R01 | R02 | Justificativa da mudança |
| --- | --- | --- | --- |
| Identidade visual | 8,0 | **8,0** | Paleta, tipografia, ícones e sidebar preservados; a compactação não descaracterizou. |
| Clareza das informações | 8,0 | **8,5** | Filtro ativo explícito, painel mais direto, estados da OS em linhas legíveis. |
| Hierarquia visual | 8,0 | **8,5** | Primeira OS e abas mais próximas; ação da Nova OS sempre disponível. |
| Produtividade operacional | 7,0 | **8,0** | Menos rolagem no painel, filtros compactos e submit persistente. |
| Quantidade de cliques | 8,0 | **8,0** | Fluxos principais inalterados; nenhuma etapa nova. |
| Ergonomia desktop | 7,0 | **8,0** | Cartão estreito corrigido, banner menor, barra flutuante sem cobrir a largura. |
| Ergonomia mobile | 7,0 | **8,0** | Primeiro resultado em 392 px (era 680), abas em 516 px (era 769), barra acima do menu. |
| Consistência entre módulos | 8,0 | **8,5** | Componentes e padrões mantidos; plural, datas e navegação alinhados. |
| Descoberta das funcionalidades | 7,5 | **8,0** | Seletor de fila e ação persistente reduzem a busca; lacunas declaradas permanecem. |
| Prevenção de erros | 7,0 | **7,5** | Trava excessiva removida, reabertura finalizada+entregue preservada; M-06 ainda pendente. |
| Fidelidade aos fluxos de negócio | 6,0 | **6,5** | Entrega/andamento alinhados ao Trifase; orçamento e cancelamento continuam simplificados. |
| Qualidade técnica do código | 7,0 | **7,5** | Correções localizadas, listener defensivo, testes de regressão; ainda é um `app.js` monolítico. |
| Facilidade de manutenção | 6,0 | **6,5** | Container query e helpers reduzem duplicação; falta modularização. |
| **Média** | **7,3** | **7,8** | |

A média sobe 0,5 ponto. O que impede uma nota maior não é mais layout: é a fidelidade de orçamento/cancelamento e a ausência de uma arquitetura modular/backend.

---

## 9. Achados remanescentes e riscos

1. **M-06 — proposta sobrescrita (média):** mantida por decisão do GPT; precisa de versionamento e bloqueio enquanto aguarda resposta. Evidência `testes/extras.json`.
2. **Cancelamentos (baixa):** fila sem fluxo; não implementar nesta rodada.
3. **Aviso de dados não salvos (baixa):** sair da Nova OS preenchida ainda descarta o conteúdo sem confirmação; não estava no Grupo 1, mas é oportunidade.
4. **Semântica de abas (baixa):** o detalhe usa botões com `aria-current`; `role="tablist"`/`aria-selected` seria mais correto.
5. **Busca de equipamento existente (média de fidelidade):** o `select` de unidades não substitui a busca por selo/série/IMEI/modelo do `nova-os-unidade.php`.
6. **Documento impresso (média declarada):** A4/cupom continuam prévias; faltam dados fiscais, itens, assinatura e duas vias.
7. **Altura fixa do cupom (baixa):** `@page cupom` usa 150 mm; impressoras térmicas podem usar comprimento variável. A largura de 80 mm e a margem de 3 mm estão corretas; validar no driver real.
8. **Firefox/WebKit (limitação):** não testados nesta rodada.
9. **Carrossel de métricas em ≤360 (baixa):** a rolagem horizontal é intencional e contida; não há indicador visual de que há mais filas à direita.

Nenhuma restrição de negócio nova foi introduzida. A única alteração de regra foi a remoção da trava pós-entrega, com a preservação da proibição de reabrir OS finalizada e entregue.

---

## 10. Limitações

- **Navegador:** Chromium 156 (Chrome for Testing). Firefox e WebKit não estavam disponíveis; a verificação complementar pedida no briefing não foi executada.
- **Dispositivo:** viewport emulado, sem toque real, teclado virtual ou leitor de tela (NVDA/VoiceOver). A acessibilidade foi verificada por axe-core, teclado, foco e contraste calculado.
- **Impressão:** emulação de mídia `print`, não impressora física.
- **Dados:** somente seed fictício e dados sintéticos no `localStorage`; nenhum dado real.
- **Cobertura:** 117 verificações de auditoria + 37 de regressão + 26 varreduras axe; não é fuzzing nem teste de carga.
- **Capturas:** viewport, não página inteira; os enquadramentos seguem a R01.

---

## 11. Conclusão

A R02 corrige os dois bloqueios altos e os problemas de ergonomia que mais afetavam a operação: o atalho de conteúdo, o overflow de textos reais, o cartão comprimido, os filtros empilhados, o submit fora da tela e o foco do modal. A decisão do GPT sobre entrega/andamento foi implementada sem criar trava nova: a entrega continua independente e apenas a reabertura de OS finalizada e entregue é recusada, como no Trifase.

O protótipo agora mostra a primeira OS na primeira tela em 390 e em 320, mantém as seis filas, reduz o detalhe da OS em 223 px (390) e 245 px (320) e deixa o submit sempre acessível sem cobrir o menu inferior. As 37 regressões e as 117 verificações passam, o axe não encontra violações e não há requisição externa.

Permanecem a sobrescrita de proposta (M-06, fora de escopo por decisão), a lacuna de cancelamentos e as funcionalidades declaradamente não implementadas. A próxima rodada pode se concentrar em versão de orçamento, cancelamento e modularização do `app.js`; não há, nesta rodada, defeito de layout ou acessibilidade bloqueante conhecido.

**Evidências:** [`INDICE.md`](INDICE.md) · [`RESUMO.md`](RESUMO.md) · [`ACHADOS-R01-STATUS.md`](ACHADOS-R01-STATUS.md) · [`testes/resultados.json`](testes/resultados.json) · [`testes/regressao.log`](testes/regressao.log) · [`testes/axe.md`](testes/axe.md)
