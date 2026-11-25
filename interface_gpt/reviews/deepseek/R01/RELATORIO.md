# Revisão independente R01 — MapOS Bancada

**Rodada:** R01
**Revisor:** DeepSeek (agente independente, sem participação na implementação)
**Data:** 25/11/2026
**Repositório:** `rcdenes777/MapOS-5-Personalizado`
**Branch:** `interface-gpt`
**SHA testado:** `82c167b1d4ddc8f9939ff58123eec611199452eb`
**Baseline funcional do MapOS:** `8c256cae4ddaeefad68922abddbb8addfe37c99d`
**Último commit de desenvolvimento citado no briefing:** `f55182df6e048a3f3a9bd34e0a37be813fed7320` — o HEAD testado está dois commits à frente (o commit `82c167b1` apenas reserva o diretório de evidências).
**Ambiente:** clone isolado em `/home/dragonblue/workspace/interface-gpt-lab/repo`, servido por `python3 -m http.server 8130`; nenhuma conexão com a produção, nenhum dado real.
**Resultado geral:** 118 verificações automatizadas — **109 PASS, 6 FAIL, 3 INFO**; suíte existente `tests/smoke.cjs` aprovada (72 combinações perfil×rota); **95 capturas** (50 desktop, 37 celular, 8 tablet); nota média **7,3/10**.

O protótipo não foi alterado. Todas as escritas desta rodada estão exclusivamente em `interface_gpt/reviews/deepseek/R01/`.

---

## 1. Objetivo e método

O briefing pede execução, teste, coleta de evidências e avaliação técnica independente, sem corrigir a interface. O protótipo é um conjunto estático de HTML, CSS e JavaScript, sem PHP, banco, `npm` ou autenticação; os quatro perfis são simulados no seletor do topo e o estado vive no `localStorage` do navegador. Isso foi confirmado no README e no código, e delimitou o que é possível testar.

Execução:

1. Clone isolado da branch `interface-gpt`, leitura de `README.md`, `index.html`, `assets/app.js`, `assets/style.css`, `tests/smoke.cjs` e `reviews/deepseek/README.md`.
2. Execução do teste existente: `node tests/smoke.cjs` — 72 combinações perfil×rota, checagens de fila, exibição financeira e escaping; **PASS**.
3. Navegador real: Chromium 156 (Playwright), nenhuma simulação de DOM. Foram percorridas as 18 rotas do protótipo em oito resoluções, com capturas em 1440×900 e 390×844 como base, mais 1366×768, 1920×1080, 768×1024, 412×915, 360×800 e 320×568.
4. Fluxos operacionais A–I do briefing, incluindo criação de OS, reaproveitamento de unidade, catálogo, orçamento/aprovação, pagamento parcial, entrega com saldo, entrega a terceiro, retorno em garantia sem itens/estado, troca de perfil e persistência após recarregar.
5. Verificações de acessibilidade: teclado, foco, diálogo, nomes acessíveis, contraste calculado por CSS computado, alvos de toque e tamanho de texto.
6. Casos-limite: formulário vazio, textos longos sem espaços, HTML na busca, pagamento zero/acima do saldo, data futura de retirada e valores extremos.
7. Coleta de console, requisições de rede e respostas HTTP.

Ferramentas e versões estão em `testes/ambiente.txt`; os resultados brutos em `testes/resultados.json` e `testes/resultados.md`; os logs em `testes/execucao.log`, `testes/console.log` e `testes/rede.log`.

---

## 2. Testes existentes do protótipo

`tests/smoke.cjs` executa o `app.js` em uma VM com DOM simulado e cobre 18 rotas em quatro perfis (72 combinações), além de checar filas, status financeiro e escaping. Resultado:

```
72 profile/route combinations; queue, financial display and escaping checks passed.
```

**PASS**, mas com uma ressalva importante: o teste não usa navegador real e, por isso, não detecta os defeitos de layout, foco, atalho de conteúdo e overflow encontrados nesta rodada. Ele também não cobre interação com formulários, `dialog`, teclado ou impressão. A cobertura é útil como "fumaça", não como validação funcional integral — o próprio README reconhece isso.

---

## 3. Validação técnica

### 3.1 Rotas e renderização

As 18 rotas renderizaram com `h1` e conteúdo:

`#inicio`, `#ordens`, `#nova`, `#os/20`, `#os/20/atendimento`, `#os/20/orcamento`, `#os/20/entrega`, `#os/20/anexos`, `#os/20/historico`, `#retorno/20`, `#imprimir/20`, `#imprimir/20/cupom`, `#clientes`, `#estoque`, `#financeiro`, `#relatorios`, `#configuracoes`, `#mais`.

**18/18 PASS.** As abas da OS mantêm o `h1` no equipamento e usam `h2` para o conteúdo da seção; é uma escolha consistente, não um erro.

### 3.2 Console e JavaScript

- **0 exceções JavaScript** (`pageerror`) em todas as sessões e fluxos.
- **0 avisos** de console.
- **13 mensagens de erro de recurso**, todas iguais: `Failed to load resource: 404` para o favicon ausente (`/favicon.ico`). Não afeta a operação, mas suja o console e é um achado baixo (L-01).
- O teste `C03` do script não capturou o favicon porque o evento de resposta não o expõe; a leitura correta é a do `console.log`: há 404 de favicon, não há erro de JavaScript.

### 3.3 Rede

- **90 requisições** registradas, todas para `http://127.0.0.1:8130` (`/`, `assets/app.js`, `assets/style.css`, recarregamentos e a navegação de foco).
- **0 requisições externas**; nenhum `fetch`, XHR, fonte remota, imagem remota ou CDN. O requisito de ausência de serviços externos foi cumprido.
- Nenhuma resposta HTTP de erro capturada pelo listener de resposta; o único 404 é o favicon citado.

### 3.4 Formulários, links e botões

Todos os links e botões visíveis nas telas percorridas responderam. Os formulários usam validação nativa (`required`, `min`, `max`, `maxlength`), e o JavaScript revalida no `submit`:

- Nova OS vazia: bloqueada, 3 campos inválidos, nenhuma OS criada.
- Pagamento `0` e pagamento acima do saldo: bloqueados; saldo intacto.
- Retirada com data futura: bloqueada; nenhuma entrega gravada.
- Busca com `<img src=x onerror=...>`: escapada; nenhum `img` injetado e nenhum script executado.
- O `esc()` é aplicado a todos os valores dinâmicos revisados; não encontrei injeção de HTML nos fluxos testados.

### 3.5 Persistência

Após criar as OS #025, #026 e #027, pagar e entregar a OS #022 e registrar o retorno da #020, a página foi recarregada: **11 ordens** (8 do seed + 3 criadas), pagamento da #022 em `Quitado`, entrega preservada, e o `localStorage` com a chave `mapos-bancada-prototype-v1`.

**PASS.** A restauração em Configurações volta ao seed de 8 ordens e mostra o toast "Demonstração restaurada.".

### 3.6 Perfis simulados

| Perfil | Menu lateral | Vê R$? | Acessa | Bloqueado |
| --- | --- | --- | --- | --- |
| Administrador | Hoje, Ordens, Clientes, Estoque, Financeiro, Relatórios, Configurações | Sim | Tudo | — |
| Técnico | Hoje, Ordens, Estoque | Não | OS, atendimento, estoque | Financeiro, Nova OS, Clientes, Relatórios, Configurações |
| Atendente | Hoje, Ordens, Clientes | Não | Nova OS, OS, entrega, retorno, clientes | Estoque, Financeiro, Relatórios, Configurações |
| Financeiro | Hoje, Ordens, Financeiro, Relatórios | Sim | Financeiro, relatórios, OS (leitura + pagamento) | Nova OS, Clientes, Estoque, Configurações |

**29/29 PASS** nas asserções de menu, exposição financeira e bloqueio de rota. Não houve vazamento de `R$` nas telas dos perfis Técnico e Atendente, inclusive no detalhe da OS, no orçamento e na impressão. O Técnico vê "Acesso restrito / Valores ocultos neste perfil"; o Financeiro não vê ações técnicas nem de entrega.

Ressalva de escopo: a troca de perfil é apenas visual; não há autenticação, sessão, API ou verificação no servidor. Quem altera o `<select>` assume o papel. Isso é declarado no README e não foi tratado como falha, mas impede considerar a matriz de permissões como equivalente à do MapOS real.

### 3.7 Teclado e acessibilidade

**Passa:**

- Primeiro `Tab` alcança o atalho "Pular para o conteúdo" quando a página é carregada sem foco prévio.
- Foco de teclado visível (`outline: solid 3px rgb(39, 141, 186)`).
- Modal recebe foco ao abrir (botão "Fechar").
- `Escape` fecha o diálogo e devolve o foco ao botão que o abriu.
- Nenhum controle visível sem nome acessível.
- `nav` com `aria-label` ("Módulos", "Seções da OS", "Navegação rápida") e diálogo com `aria-labelledby`.
- Contraste AA calculado em painel, ordens, detalhe da OS e financeiro: **0 falhas** nos pares texto/fundo medidos.

**Falha:**

- **Atalho de conteúdo quebra a tela** (A-01): ao pressionar `Enter` no link "Pular para o conteúdo", o hash vira `#main`; o roteador trata `#main` como rota e renderiza "Ação indisponível". O usuário de teclado perde a tela em vez de pular para o conteúdo.
- **Foco escapa do modal** (M-04): após o último controle ("Confirmar"), o `Tab` vai para o `BODY` e só no `Tab` seguinte volta ao diálogo. O `<dialog>` nativo não está contendo o foco de forma completa.
- **Alvos de toque** (L-02): em 390×844, o link da marca mede 34×26 px e o `summary` "Itens, acessórios e estado (opcionais)" mede 324×24 px; ambos abaixo dos 44 px pedidos para ações principais.
- **Texto pequeno** (L-03): `eyebrow` 11,2 px; rótulos do menu inferior 11,7 px; `pill` 11,8 px; `order-id` 11,5 px. O corpo é 16 px e os campos usam 16 px (evita zoom no iOS), mas os rótulos auxiliares ficam no limite.

### 3.8 Impressão

- A prévia A4 e o cupom renderizam, e a mídia `print` esconde sidebar, topo e menu inferior.
- **Não existe regra `@page`** no CSS. A folha A4 tem 800 px de largura; a área útil de A4 a 96 dpi é 794 px. Sem margens de página, o conteúdo pode tocar/clipar a borda na impressão física (L-04). O cupom usa 72 mm na mídia de impressão, dentro dos 80 mm.
- O documento não tem cabeçalho da oficina, CNPJ, assinatura, itens detalhados, forma de pagamento ou termos de garantia; é uma prévia fictícia, como o README declara.

---

## 4. Responsividade

Resoluções testadas com o seed, em 14 telas cada: **1920×1080, 1440×900, 1366×768, 768×1024, 412×915, 390×844, 360×800, 320×568**.

| Resolução | Rolagem horizontal | Elementos fora da viewport | Observação |
| --- | --- | --- | --- |
| 1920×1080 | Não | Não | Conteúdo centralizado em `max-width: 1440px`; sobra espaço lateral. |
| 1440×900 | Não | Não | Layout desktop completo; cartão de "Prontos para retirada" comprimido (M-01). |
| 1366×768 | Não | Não | Mesmo layout; cartão comprimido permanece. |
| 768×1024 | Não | Não | Sem sidebar; menu inferior; cartões em uma coluna. |
| 412×915 | Não | Não | Uma coluna; menu inferior. |
| 390×844 | Não | Não | Base mobile; filtros empilhados (M-02); abas abaixo da dobra. |
| 360×800 | Não | Não | Sem overflow com o seed. |
| 320×568 | Não | Não | Sem overflow com o seed; cupom 80 mm cabe. |

**Com o seed, não há rolagem horizontal nem elemento cortado em nenhuma das oito resoluções.** O problema aparece com texto longo sem espaços (A-02): no detalhe da OS o overflow medido foi **4.338 px em 1440**, **4.315 px em 390** e **4.379 px em 320**; na listagem, **744 px em 390** e **808 px em 320**. O nome de 150 caracteres e o modelo de 160 caracteres são permitidos pelos `maxlength` do formulário, então o caso é alcançável por dados válidos, não apenas por um teste artificial.

O menu inferior está presente e fixo em todas as larguras abaixo de 880 px; a sidebar aparece a partir de 880 px. Em 768×1024 o layout usa menu inferior, o que é coerente com o breakpoint, mas deixa a área de conteúdo mais estreita do que um tablet poderia aproveitar.

---

## 5. Evidências visuais

**95 capturas**, todas PNG na resolução original, a maior com 188 KB (abaixo do limite de 500 KB):

- **Desktop: 50** — 1440×900 (48), 1366×768 (1), 1920×1080 (1).
- **Celular: 37** — 390×844 (30), 320×568 (4), 412×915 (2), 360×800 (1).
- **Tablet: 8** — 768×1024.

O índice completo, com link relativo e descrição de cada imagem, está em [`INDICE.md`](INDICE.md). Os destaques visuais são:

- [`desktop/01-painel-1440x900.png`](desktop/01-painel-1440x900.png) — painel completo.
- [`desktop/91-achado-cartao-lista-estreita-1440x900.png`](desktop/91-achado-cartao-lista-estreita-1440x900.png) — cartão comprimido.
- [`desktop/90-achado-atalho-conteudo-quebrado-1440x900.png`](desktop/90-achado-atalho-conteudo-quebrado-1440x900.png) — atalho quebrado.
- [`mobile/96-achado-texto-longo-390x844.png`](mobile/96-achado-texto-longo-390x844.png) e [`mobile/97-achado-texto-longo-lista-390x844.png`](mobile/97-achado-texto-longo-lista-390x844.png) — overflow com texto longo.
- [`mobile/98-achado-filtros-empilhados-390x844.png`](mobile/98-achado-filtros-empilhados-390x844.png) — filtros empilhados.
- [`desktop/92-achado-nova-os-submit-fora-da-tela-1440x900.png`](desktop/92-achado-nova-os-submit-fora-da-tela-1440x900.png) e [`mobile/99-achado-nova-os-submit-fora-da-tela-390x844.png`](mobile/99-achado-nova-os-submit-fora-da-tela-390x844.png) — submit no fim do formulário.
- [`desktop/93-achado-entrega-os-nao-finalizada-1440x900.png`](desktop/93-achado-entrega-os-nao-finalizada-1440x900.png) — entrega disponível em OS "Em Andamento".

---

## 6. Testes operacionais A–I

Todos os fluxos foram executados em uma sessão limpa, com dados fictícios, e as capturas de evidência estão em `desktop/40` a `desktop/46`.

| ID | Cenário | Passos | Esperado | Obtido | Status |
| --- | --- | --- | --- | --- | --- |
| A | Equipamento novo | Nova OS → cliente 1 → cadastro manual → marca/modelo/série → defeito, itens, estado → criar | OS #025, status Aberto, histórico de entrada | `#os/25`; 9 ordens; histórico "Entrada registrada" | PASS |
| B | Equipamento já cadastrado | Nova OS → cliente 1 → "Selecionar unidade do cliente" → OS #020 → defeito novo → criar | OS #026 vinculada à unidade Midea, com o defeito novo | `brand=Midea`, `model=Xtreme Save`, `unit=20`, histórico correto | PASS |
| C | Catálogo errado e volta ao manual | Selecionar "LG · Dual Inverter" no catálogo; editar a marca | Catálogo preenche marca/modelo; edição manual limpa a seleção | Marca/modelo preenchidos; catálogo voltou para `""` | PASS |
| D | Orçamento, aprovação, atendimento e finalização | OS #023 → simular resposta "Aprovado" → Em Andamento → Finalizado | Proposta vira total; status evolui; conclusão registrada | Proposta/total R$ 240,00; Em Andamento; Finalizado com data | PASS |
| E | Pagamento parcial, entrega com saldo e quitação | OS #022 → pagar R$ 100 → entregar → pagar R$ 120 | Pago R$ 200, saldo R$ 120, entrega registrada, depois Quitado | Pago R$ 200; entrega; pago R$ 320; Quitado | PASS, com achado M-05 |
| F | Entrega para terceiro autorizado | OS #020 → entrega → "Terceiro" → recebedor e autorização → confirmar | Entrega com vínculo "Terceiro autorizado" e autorização | `third=true`, recebedor e autorização persistidos; aba Entrega exibe | PASS |
| G | Retorno em garantia sem itens/estado | OS #020 → "Registrar retorno" → só o defeito → abrir | Nova OS #027, origem #020, itens/estado vazios, sem cobrança | `origin=20`, `items=""`, `condition=""`, "Em avaliação", R$ 0,00 | PASS |
| H | Alternância entre os quatro perfis | Trocar o seletor para Administrador, Técnico, Atendente e Financeiro | Menu e permissões coerentes; sem vazamento financeiro | 29 asserções de menu, valores e bloqueios | PASS |
| I | Persistência após recarregar | Recarregar após A–G; abrir #ordens e #022 | 11 ordens; pagamento e entrega preservados | 11 ordens; Quitado; Entregue | PASS |

**Observação do fluxo E:** a entrega foi aceita enquanto a OS #022 estava "Em Andamento" e sem conclusão. O fluxo executa o que a interface se propõe, por isso o teste funcional é PASS; o comportamento está registrado como achado **M-05**, porque permite congelar uma OS não finalizada (depois da entrega, o modal de andamento recusa alterações).

### O que não foi implementado (não é defeito)

O próprio README declara, e a inspeção confirmou: orçamento por itens, versionamento, link público, recusa/regularização/cancelamento, estornos, garantia com avaliação/solução/custos, consumo de estoque, vendas, anexos com upload, edição da identificação, gestão de equipamentos, relatórios completos, configurações reais, impressão em duas vias e autenticação. Esses itens entram em "lacunas declaradas", não na lista de defeitos.

---

## 7. Achados

Classificação: **Alta** = quebra requisito central ou bloqueia usuário; **Média** = perda relevante de produtividade/prevenção, com contorno; **Baixa** = polimento, cópia ou ruído.

### Alta

#### A-01 — O atalho "Pular para o conteúdo" quebra a tela

- **Evidência:** K02, K02-evidence; [`desktop/90-achado-atalho-conteudo-quebrado-1440x900.png`](desktop/90-achado-atalho-conteudo-quebrado-1440x900.png).
- **Reprodução:** carregar a página sem hash, pressionar `Tab` (foco no link "Pular para o conteúdo") e `Enter`. O hash vira `#main`; `render()` interpreta `#main` como rota e mostra "Ação indisponível".
- **Impacto:** quebra o principal recurso de navegação por teclado/leitor de tela e destrói a tela atual do usuário. É uma falha de acessibilidade e de roteamento, não uma preferência estética.
- **Direção:** o atalho deve mover o foco para `#main` sem alterar a rota; o roteador deve ignorar `#main` ou o link deve usar `focus()` via JS, sem `href` de rota.

#### A-02 — Texto longo sem espaços causa rolagem horizontal em todas as larguras

- **Evidência:** L02, L03; `testes/extras.json`; [`mobile/96-achado-texto-longo-390x844.png`](mobile/96-achado-texto-longo-390x844.png) e [`mobile/97-achado-texto-longo-lista-390x844.png`](mobile/97-achado-texto-longo-lista-390x844.png).
- **Reprodução:** gravar nome de cliente com 150 caracteres, modelo com 160 e defeito com 400, todos sem espaços (dentro dos `maxlength`). O `h1` do detalhe mede 3.792 px de largura; a página estoura **4.338 px em 1440**, **4.315 px em 390** e **4.379 px em 320**. A listagem estoura 744 px em 390 e 808 px em 320.
- **Impacto:** viola o requisito principal de responsividade; o conteúdo é cortado e a página inteira rola horizontalmente. Um nome/URL/part number legítimo pode acionar o defeito.
- **Direção:** aplicar `overflow-wrap: anywhere` (e `min-width: 0`) em `h1`, `.head p`, `.order-title small` e parágrafos de painel; validar com strings sem espaço, não só com frases normais.

### Média

#### M-01 — Cartão de OS comprimido na coluna "Prontos para retirada"

- **Evidência:** [`desktop/01-painel-1440x900.png`](desktop/01-painel-1440x900.png), [`desktop/27-perfil-tecnico-1440x900.png`](desktop/27-perfil-tecnico-1440x900.png) e [`desktop/91-achado-cartao-lista-estreita-1440x900.png`](desktop/91-achado-cartao-lista-estreita-1440x900.png).
- **Causa:** a partir de 880 px, `.order` vira três colunas (`1.15fr / 1fr / auto`) independentemente da largura do contêiner. No painel, "Prontos para retirada" fica na coluna direita do grid `1.65fr / 1fr` (~380 px em 1440), e o cartão é espremido: "Midea · Xtreme Save" quebra em quatro linhas, pills quebram ("Finaliza do", "Não entregue"), data e valor disputam espaço.
- **Impacto:** um dos painéis principais do desktop fica difícil de ler justamente na resolução de trabalho (1440×900). Não é apenas estético: a identificação da OS e o status ficam fragmentados.
- **Direção:** container query (ou classe compacta) para o cartão usar uma coluna quando o contêiner for estreito, em vez de depender só do viewport.

#### M-02 — Filtros empilhados consomem a primeira tela no celular

- **Evidência:** [`mobile/03-listagem-os-390x844.png`](mobile/03-listagem-os-390x844.png) e [`mobile/98-achado-filtros-empilhados-390x844.png`](mobile/98-achado-filtros-empilhados-390x844.png).
- **Comportamento:** os sete chips de fila (Todas, Em atendimento, Aguardando orçamento, Aguardando retirada, Retornos em avaliação, Orçamentos recusados, Cancelamentos pendentes) ocupam uma linha cada em 390 px. O primeiro cartão de OS só começa por volta de y=665; a primeira tela não mostra nenhuma OS.
- **Impacto:** produtividade mobile e "aproveitamento do espaço", itens explícitos do briefing. O usuário rola a cada consulta antes de ver o resultado.
- **Direção:** linha horizontal rolável com `scroll-snap`, um `select` de fila ou uma folha de filtros; manter o filtro ativo visível e reduzir a altura inicial.

#### M-03 — Ação de criar OS fica fora da primeira tela

- **Evidência:** [`desktop/05-nova-os-1440x900.png`](desktop/05-nova-os-1440x900.png) vs. [`desktop/92-achado-nova-os-submit-fora-da-tela-1440x900.png`](desktop/92-achado-nova-os-submit-fora-da-tela-1440x900.png); [`mobile/04-nova-os-390x844.png`](mobile/04-nova-os-390x844.png) vs. [`mobile/99-achado-nova-os-submit-fora-da-tela-390x844.png`](mobile/99-achado-nova-os-submit-fora-da-tela-390x844.png).
- **Comportamento:** o botão "Criar ordem de serviço" está no rodapé do formulário, depois da seção 3 e do bloco opcional de itens/estado. Em 1440×900 e 390×844 ele não aparece na primeira tela; não há barra fixa nem ação primária no topo.
- **Impacto:** a promessa "Registre o essencial; complementares depois" perde força: o usuário precisa atravessar campos opcionais para concluir. Aumenta abandono e rolagem em um fluxo frequente.
- **Direção:** barra de ação fixa no rodapé do formulário ou botão primário no topo (com o submit no fim como alternativa), mantendo o foco no essencial.

#### M-04 — O foco escapa do modal ao navegar por Tab

- **Evidência:** K05; `testes/execucao.log`.
- **Comportamento:** o `<dialog>` recebe foco corretamente, mas após o botão "Confirmar" o `Tab` leva o foco ao `BODY` (fora do diálogo) e só o `Tab` seguinte volta ao "Fechar". O ciclo se repete a cada volta.
- **Impacto:** usuários de teclado/leitor de tela perdem o contexto do modal; o `BODY` não é um alvo interativo. O `Escape` e o retorno de foco funcionam, então o contorno é possível, mas a contenção não está completa.
- **Direção:** trap de foco explícito no `keydown` (primeiro/último focável) ou `inert` no restante da página; testar Tab e Shift+Tab.

#### M-05 — Entrega permitida antes da finalização/aprovação

- **Evidência:** E03; [`desktop/93-achado-entrega-os-nao-finalizada-1440x900.png`](desktop/93-achado-entrega-os-nao-finalizada-1440x900.png) e [`desktop/10-os-orcamento-1440x900.png`](desktop/10-os-orcamento-1440x900.png).
- **Comportamento:** a OS #022 (Em Andamento, sem conclusão) e a OS #023 (Orçamento, sem total) exibem "Registrar entrega". A entrega é aceita e, depois dela, o modal de andamento recusa alterações (`if (o.delivery) return`), congelando a OS no status anterior.
- **Impacto:** uma OS pode ser entregue sem estar tecnicamente concluída e ficar presa em "Em Andamento"/"Orçamento". O comprovante de retirada passa a existir sem conclusão registrada.
- **Nota de fidelidade:** o modelo do Trifase no baseline também não bloqueia entrega por status (verificado em `Trifase_entrega_model::registrar`), então não é regressão em relação ao sistema atual; é uma oportunidade de trava que a nova interface pode oferecer.
- **Direção:** exigir status Finalizado (ou justificativa explícita) para entregar; se a entrega for permitida, registrar o status no evento e permitir correção.

#### M-06 — Proposta pendente pode ser sobrescrita sem versão ou confirmação

- **Evidência:** `testes/extras.json` (`propostaAntes`/`propostaDepois`).
- **Comportamento:** a OS #023 tem proposta de R$ 240,00 e aprovação "Aguardando resposta". O botão "Preparar orçamento" continua disponível; um novo valor de R$ 300,00 substitui a proposta, mantém "Aguardando resposta" e grava apenas "Orçamento preparado" no histórico. A versão anterior não é preservada.
- **Impacto:** altera uma proposta que já aguardava resposta do cliente, sem confirmação nem rastro de versão. É também uma lacuna de fidelidade (o Trifase tem versionamento/decisão), mas o risco de prevenção existe dentro do próprio protótipo.
- **Direção:** versionar a proposta (nova versão imutável), bloquear edição enquanto aguarda resposta ou exigir confirmação explícita com motivo.

### Baixa

| ID | Achado | Evidência | Impacto/direção |
| --- | --- | --- | --- |
| L-01 | `favicon.ico` ausente gera 404 em todas as cargas | `testes/console.log` (13 entradas) | Ruído no console; adicionar favicon ou `<link rel="icon">`. |
| L-02 | Alvos de toque abaixo de 44 px | K10: marca 34×26; `summary` 324×24 | Dificulta toque; elevar `summary` e a marca a 44 px. |
| L-03 | Textos auxiliares abaixo de 12 px | K11: `eyebrow` 11,2; menu 11,7; pill 11,8 | Legibilidade em 320/360; subir rótulos para 12,5–13 px. |
| L-04 | Impressão sem `@page` e sem margens | `extras.json` (`pageRule: null`); folha 800 px vs A4 794 px | Risco de corte na impressão física; definir `@page` e margens. |
| L-05 | "1 atendimentos" | [`desktop/21-clientes-1440x900.png`](desktop/21-clientes-1440x900.png) | Pluralização; usar "1 atendimento". |
| L-06 | Formatos de data misturados no histórico | D04: "2026-11-20" e "25/11/2026, 14:51:29" | Padronizar data/hora localizada. |
| L-07 | Fila "Cancelamentos pendentes" sempre zero | Código e tela; nenhuma ação de cancelamento | Fila morta; remover ou implementar o fluxo. |
| L-08 | Placeholder da busca omite "defeito" | [`desktop/03-listagem-os-1440x900.png`](desktop/03-listagem-os-1440x900.png) vs. descrição da tela | A busca cobre defeito, mas o placeholder não; alinhar a cópia. |
| L-09 | Troca de perfil descarta o contexto | `extras.json` (`#os/20` → `#inicio`) | Perda de contexto; preservar a rota se o novo perfil permitir. |

---

## 8. Avaliação independente (0–10)

| Critério | Nota | Justificativa |
| --- | --- | --- |
| Identidade visual | **8,0** | A "Bancada" tem identidade própria e coerente: verde profundo, creme, tipografia system-ui, ícones de traço e cartões. É sóbria e adequada a uma oficina. Divergência relevante: o MapOS/DESIGN.md usa laranja `#F37338` como cor de ação e tinta escura no botão; o protótipo usa verde `#176b58` com texto branco. Como o briefing dá liberdade criativa, não tratei como defeito, mas é um risco de continuidade de marca. |
| Clareza das informações | **8,0** | Os três indicadores separam serviço, pagamento e retirada, que era a direção do proprietário; os rótulos "Sem cobrança/Parcial/Quitado" e as filas são legíveis. Perdem clareza: o valor da lista financeira não é rotulado como saldo e "Proposta" vs. "Total cobrado" exige atenção. |
| Hierarquia visual | **8,0** | Bom uso de `h1`, painéis, seções numeradas no formulário e uma única ação primária por tela. O submit fora da primeira tela e os três `stat` altos no mobile quebram a hierarquia na prática. |
| Produtividade operacional | **7,0** | O painel por filas e as ações no contexto da OS são bons atalhos. Faltam ações em lote, ordenação, paginação e um filtro mobile compacto; a troca de perfil recomeça do zero. |
| Quantidade de cliques | **8,0** | Filas → lista → OS; orçamento em dois passos; pagamento e entrega em um modal cada. O fluxo principal é curto. A conferência de uma OS com saldo e retirada exige três ações independentes, o que é correto. |
| Ergonomia desktop | **7,0** | Sidebar e topbar bem resolvidas, lista em três colunas e ações visíveis. Contra: cartão comprimido no painel, campos de formulário muito largos em 1440 e submit no fim. |
| Ergonomia mobile | **7,0** | Menu inferior fixo, controles principais de 44 px, uma coluna e campos de 16 px (sem zoom no iOS). Contra: filtros empilhados, cartões de status altos que empurram as abas, rótulos de 11,7 px e submit no fim de um formulário longo. |
| Consistência entre módulos | **8,0** | Os mesmos componentes (head, panel, order, pill, btn) aparecem em todas as telas; impressão é um formato à parte, como esperado. Pequenas inconsistências de cópia e data. |
| Descoberta das funcionalidades | **7,5** | Filas nomeadas, "Mais" no mobile e ações contextuais tornam o caminho previsível. A fila de cancelamentos morta, ações escondidas por perfil e a ausência de busca no estoque/clientes reduzem a descoberta. |
| Prevenção de erros | **7,0** | Validação nativa, limites de pagamento, data futura bloqueada, confirmação de entrega e `confirm` no reset são bons. Contra: entrega antes da finalização, proposta sobrescrita, ausência de aviso de dados não salvos e reset destrutivo com aparência secundária. |
| Fidelidade aos fluxos de negócio | **6,0** | O núcleo (filas, três indicadores, nova OS com unidade existente/nova/identificar depois, atendimento, entrega com terceiro, retorno, perfis) conversa com o Trifase. Ficam de fora itens/versões/link público de orçamento, cancelamento, consumo de estoque, anexos, busca de equipamento por selo/série/IMEI, data real de conclusão e documentos completos. |
| Qualidade técnica do código | **7,0** | Sem dependências, sem requisições externas, `esc()` consistente, delegação de eventos simples e nenhum erro JS nos fluxos. Contra: um único `app.js` de ~33 KB com 71 linhas muito longas, estado global mutável, templates por `innerHTML`, lógica de filtro duplicada e teste existente em DOM simulado. |
| Facilidade de manutenção | **6,0** | É trivial executar e entender o todo, mas difícil evoluir: funções monolíticas, estilos inline, sem módulos/componentes, sem lint/build e sem teste de navegador no repositório. Uma correção de layout exige tocar em strings grandes. |

**Média: 7,3/10.**

Síntese: a direção de produto é boa e a execução visual é acima da média para um primeiro protótipo; os problemas que impedem uma nota maior são objetivos e corrigíveis (atalho, overflow, cartão comprimido, foco, entrega sem status), não uma rejeição do conceito.

---

## 9. Comparação com o MapOS Trifase

| Fluxo | Trifase (baseline `8c256ca`) | Protótipo | Avaliação |
| --- | --- | --- | --- |
| Painel e filas | `painel-filas.php` com filas e cartões de status; a mesma OS pode aparecer em mais de uma fila | Seis filas com contagens independentes e a mesma regra de sobreposição | Alinhado; o texto do protótipo repete a regra. |
| Nova OS | `nova-os-unidade.php`: existente / novo / identificar depois, catálogo, campos de selo/série/IMEI, itens/estado | Os três modos, catálogo e campos equivalentes; unidade existente em `select` | Parcial: falta busca de equipamento por selo/série/IMEI/modelo. |
| Três indicadores | Andamento, financeiro e retirada separados | Os três cartões com ações independentes | Alinhado. |
| Atendimento/laudo | `andamento-tecnico.php` com status e data real de conclusão (mínima = entrada, máxima = hoje) | Status e laudo; conclusão recebe `today()` sem campo de data | Parcial: falta a data real de conclusão. |
| Orçamento | Itens, versões, link público, decisão do cliente, regularização | Proposta única, resposta simulada, sem itens/versão/link | Parcial/declarado; é a maior lacuna de fidelidade. |
| Pagamento | Parcial/integral, forma, saldo | Parcial/integral, forma, saldo, bloqueio acima do saldo | Alinhado no escopo. |
| Entrega | Data, recebedor, próprio/terceiro, autorização, itens, confirmação de saldo; correção/cancelamento com motivo | Os mesmos campos e confirmação; sem correção/cancelamento | Parcial: falta o pós-entrega auditado. |
| Retorno | `retorno-novo.php`: defeito obrigatório, itens/estado opcionais, preserva origem e prazo | Mesma estrutura, cria outra OS, `coverage=Em avaliação` | Alinhado. |
| Estoque | Consulta e movimentações | Consulta demonstrativa, sem consumo | Parcial/declarado. |
| Anexos | Upload real com permissão e `STORAGE_PATH` | Estado vazio, upload não implementado | Ausente/declarado. |
| Impressão | A4 e cupom com documentos reais | Prévia A4/80 mm, sem dados completos | Parcial/declarado. |
| Perfis | Permissões no servidor (`permissions_map.php`) | Simulação no cliente, sem autenticação | Não equivalente por definição do protótipo. |

**Identidade:** o Trifase segue o `DESIGN.md` (laranja de ação, tinta escura no botão, canvas claro e sidebar escura); o protótipo adota verde/creme. O contraste do verde com branco passa AA (medido), mas a laranja da marca não aparece. Em uma futura integração, isso precisa ser decidido pelo proprietário, não herdado por acidente.

---

## 10. Oportunidades não percebidas pelo GPT

1. **Container queries no cartão de OS** para resolver M-01 sem duplicar componente; o problema é de largura do contêiner, não do viewport.
2. **Barra de ação fixa** no formulário de Nova OS, mantendo o submit sempre acessível (M-03).
3. **Filtros em linha rolável ou folha inferior** no mobile, preservando o filtro ativo e o primeiro resultado na primeira tela (M-02).
4. **`overflow-wrap: anywhere` seletivo** em `h1`, `.head p`, `.order-title small` e parágrafos de painel, com teste de strings sem espaço (A-02).
5. **Trap de foco explícito** no diálogo, com `inert` no fundo e teste Tab/Shift+Tab (M-04).
6. **Trava de entrega por status** ou registro explícito do status no evento de retirada (M-05).
7. **Versionamento de orçamento** com bloqueio enquanto aguarda resposta (M-06), alinhado ao modelo do Trifase.
8. **`@page { size: A4; margin: 12mm }`** e um cabeçalho/rodapé de documento na impressão (L-04).
9. **Pluralização e datas** com um helper único, para eliminar "1 atendimentos" e a mistura de formatos (L-05/L-06).
10. **Preservar a rota ao trocar de perfil** quando o novo perfil tem acesso, em vez de sempre voltar ao início (L-09).
11. **Semântica de abas** (`role="tablist"`, `role="tab"`, `aria-selected`) no detalhe da OS; hoje são botões com `aria-current`, o que funciona, mas não é anunciado como aba.
12. **Aviso de dados não salvos** ao sair de um formulário preenchido; não existe hoje e é barato de adicionar.
13. **Busca de equipamento existente** por selo, série, IMEI ou modelo, como no `nova-os-unidade.php`; o `select` atual não escala.
14. **Estoque acionável**: mostrar o mínimo (3 de 10) e permitir consumo/entrada; hoje "Estoque baixo" não diz o alvo.
15. **Rótulo "Saldo"** nas linhas do financeiro e distinção visual entre proposta e total cobrado.
16. **Paginação/ordenação** na listagem; o seed de 8 esconde o problema de escala.

---

## 11. Limitações desta análise

- **Navegador:** apenas Chromium 156 (Chrome for Testing). Não testei WebKit/Safari nem Firefox; diferenças de `dialog`, `Intl` e layout podem existir.
- **Dispositivo:** viewport emulado, sem toque real, teclado virtual, leitor de tela (NVDA/VoiceOver) ou testes com usuários. As conclusões de acessibilidade vêm de DOM/ARIA, teclado e contraste calculado, não de uma auditoria assistiva completa.
- **Impressão:** usei emulação de mídia `print`, não uma impressora física; o `@page` ausente e a largura de 800 px vs. 794 px são evidências de CSS, não uma medição de papel.
- **Backend:** o protótipo não tem PHP, banco, API ou autenticação; a matriz de perfis é simulada no cliente e não foi comparada com o `permissions_map.php` real.
- **Dados:** somente o seed fictício e dados sintéticos injetados no `localStorage` (textos longos, valores extremos). Não há dados de produção.
- **Cobertura:** 118 verificações e 95 capturas não esgotam o produto; não fiz fuzzing, testes de carga, testes de armazenamento cheio/privado, nem revisão linha a linha de todas as funções.
- **Capturas:** são da viewport, não da página inteira; o comportamento de rolagem foi verificado por script, mas a imagem mostra apenas o primeiro quadro de cada resolução.

---

## 12. Conclusão

O protótipo entrega uma direção de produto clara: filas operacionais, três indicadores independentes, ações no contexto da OS e uma linguagem visual própria. Os fluxos A–I funcionam, os dados persistem, não há requisições externas nem erros JavaScript, e o contraste AA passa nas telas principais.

Não está pronto para integração. Os dois achados altos (atalho de conteúdo quebrado e overflow com texto longo) ferem acessibilidade e o requisito principal de responsividade; os médios (cartão comprimido, filtros empilhados, submit fora da tela, foco escapando do modal, entrega sem finalização e proposta sobrescrita) afetam justamente a operação diária e a prevenção de erros. Nenhum deles exige redesenho: são correções localizadas de CSS, foco e regras de estado.

Prioridade sugerida para o GPT:

1. Corrigir o atalho de conteúdo e o overflow de texto (A-01/A-02).
2. Corrigir o cartão comprimido e a ação de criar OS fora da tela (M-01/M-03).
3. Compactar os filtros no mobile e conter o foco do modal (M-02/M-04).
4. Travar a entrega por status e versionar a proposta (M-05/M-06).
5. Polir os achados baixos e então reexecutar esta mesma bateria (R02) para comparar.

As decisões criativas e a implementação dos refinamentos permanecem com o GPT; esta rodada só executou, mediu e documentou.
