# R08-007 — Relatório técnico

Validação focal, somente leitura, do ciclo restaurado GitHub → Hermes → GPT no laboratório nativo sintético existente. Não é implementação, aprovação de produto nem retomada da R08-006.

## Proveniência

| Item | Valor |
|---|---|
| Tarefa | `interface_gpt/mensagens/gpt-para-deepseek/R08-007.md` |
| Publicação da tarefa / HEAD do controle | `b50b6ad120386fb56cbb742518f12bd25de85529` |
| ACK | `af62e809` (`chore(bancada): registra ACK da R08-007`) |
| HEAD do repositório na execução dos testes | `af62e809` (ACK + controle/tarefa; **não** é o código candidato) |
| Código candidato — inicial | `86f4c552ac111cec65460768b7023d207824a1b7` |
| Código candidato — final | `86f4c552ac111cec65460768b7023d207824a1b7` (**inalterado**; nenhum arquivo de código, CSS, teste ou configuração do laboratório foi editado) |
| Referência nativa no `source/` do laboratório | `8c256cae4ddaeefad68922abddbb8addfe37c99d` (checkout destacado, worktree limpo) |
| CSS servido em `assets/dist/app.css` | `478efdfba10898515df902af8e737ec42cefb27e79334bd70c98a19ea3a4343a` |
| Overlay `interface_gpt/assets/native-os-list.css` | `4ea423f4e726d8e349d843b4098a4715272cf63573e3dfcbdb4eb9b26e2f7f01` |

Os dois hashes de CSS conferem com os valores registrados em `interface_gpt/README.md`; a lista servida é a nativa (`8c256cae`) com o overlay experimental já ativo.

Sobre a linha 2 de `test-read.log` (`candidate(repo HEAD): af62e809`): o rótulo registra o HEAD do repositório no instante da execução, que já incluía o commit de ACK. O código candidato continua sendo `86f4c552`: `git diff 86f4c552..af62e809 -- interface_gpt/assets interface_gpt/referencias` é vazio (registrado em `ambiente.txt`), o blob de `test-read.cjs` é idêntico nos dois commits e o overlay servido tem o SHA-256 do candidato. Nenhum arquivo de código mudou entre o candidato e a execução.

## Ambiente exercitado

| Componente | Valor | Verificação |
|---|---|---|
| Alvo | `http://127.0.0.1:18130` (loopback, proxy `socat` para socket Unix privado) | `guard.cjs` no início de cada página |
| Cabeçalho de identidade | `X-Mapos-Lab: synthetic-native-isolated` | `curl` e `guard.cjs` |
| PHP | 8.5.13 (NTS) | `docker compose exec app php -v` |
| MySQL | 8.4.11 | `docker compose exec db mysql --version` |
| nginx | 1.31.3 | cabeçalho `Server` |
| Dados | sintéticos (`Cliente Fictício Alfa`, equipamentos `LAB ...`) | capturas |

Credenciais sintéticas lidas de `private/users.json` (`0600`), nunca impressas em logs ou capturas.

## Teste 1 — `test-read.cjs` (lista/detalhe nativos)

Comando (a partir da raiz do repositório, com `NODE_PATH` do ambiente de testes):

```bash
NODE_PATH=/home/dragonblue/workspace/interface-gpt-lab/tools/node_modules \
  node interface_gpt/referencias/laboratorio/test-read.cjs
```

- Log: `interface_gpt/evidencias/R08-007/test-read.log`
- Início/fim: 2026-11-27T19:36:10Z / 19:36:13Z
- Saída: `native lab: anonymous redirects and admin/technician list, detail and empty search passed`
- **Exit code: 0**

Asserções efetivamente executadas pelo script (todas passaram):

1. Guarda fail-closed: serviço de proxy ativo, processo `socat` com `TCP-LISTEN:18130,bind=127.0.0.1` → socket esperado, diretório do socket privado, resposta com `X-Mapos-Lab` e formulário de login no mesmo origin.
2. Anônimo: `GET /index.php/os` e `GET /index.php/os/visualizar/10` respondem **307** para `/index.php/login`.
3. `admin` e `tecnico`: login normal, lista `GET /index.php/os` com **200** e `h1` = `Ordens de serviço`.
4. Coluna Total: presente para `admin` (`td[data-label="Total"]` > 0) e **ausente** para `tecnico` (0 células).
5. Layout móvel (320 px): célula de equipamento com `display: block` e sem overflow horizontal (`scrollWidth <= innerWidth`).
6. Tablet (1024 px): campo de busca com largura ≥ 160 px.
7. Detalhe: link da primeira linha aponta para `/index.php/os/visualizar/<id>` no mesmo origin, resposta **200**, sem redirecionamento, `h1` contém `OS <id>`.
8. Busca por id: resultado **200** e link da OS presente; busca inexistente (`INEXISTENTE-987654`): **200** com exatamente 1 ocorrência de `Nenhuma OS encontrada`.

## Teste 2 — capturas da lista de OS do administrador

Script: `interface_gpt/evidencias/R08-007/capturas-os.cjs` (Playwright/Chromium headless, requisições externas bloqueadas por allow-list de origin, login novo por viewport, somente sessões normais de login). Resultado bruto: `capturas-os.json`; log: `capturas-os.log`; **exit code 0**.

| Viewport | Status | `h1` | Overflow (`scrollWidth - innerWidth`) | Busca (px) | Ação de linha | Linhas no DOM | Captura / SHA-256 |
|---|---|---|---|---|---|---|---|
| 390×900 | 200 | Ordens de serviço | 0 | 324×44, dentro do viewport | `Ver OS 10`, 44×44, visível e clicável | 10 (OS 10 e início da 9 visíveis) | `os-lista-admin-390x900.png` / `72315232f9f58d6cef45d681d75bd782c6acd9e7d41bc7763ed3d1f64d3512d9` |
| 1440×900 | 200 | Ordens de serviço | 0 | 431×42, dentro do viewport | `Ver OS 10`, 36×36, visível e clicável | 10 (7 visíveis) | `os-lista-admin-1440x900.png` / `5a691140144cb4e852bc8291f6f7cf787ada13713cfd8c09b9bf13dbb10ec82f` |

Critérios: `no_overflow`, `search_visible` e `action_usable` (visível, dentro do viewport, ≥ 24×24 e `elementFromPoint` no centro resolve para o próprio controle) verdadeiros nos dois viewports. A medida de ação cobre o primeiro link de detalhe (`Ver OS 10`); a inspeção visual das duas capturas cobriu os ícones de ver/editar/excluir de todas as linhas visíveis: legíveis, separados e sem sobreposição. **Nenhum defeito objetivo observado; nenhuma alteração de código feita.**

Bloqueio de rede: a allow-list `page.route` bloqueia toda requisição iniciada pela **página** fora de `http://127.0.0.1:18130`; o `guard.cjs` usa `page.request` (APIRequestContext), que não passa por `page.route`, mas só acessa a própria URL do laboratório (`/index.php/login`) — não há requisição externa do guard.

Observação de fixture (não defeito): o estado sintético não é uniforme. Extrato integral em `estado-fixture.json` (leitura do DOM como administrador em 1440×900, 19:43Z): OS 10 a 3 `Cancelado` com `R$ 0,00`; OS 2 `Aberto` com `R$ 0,00`; OS 1 `Finalizado` com `R$ 320,00`. As capturas mostram apenas as linhas visíveis (10 a 4 em 1440; 10 e início da 9 em 390).

## Teste 3 — revisão independente

- Revisor: subagente novo, somente leitura, via `delegate_task`; rota efetiva **`deepseek/deepseek-flash`** (herdada da sessão do coordenador, provedor `deepseek`), `delegation_id` `deleg_7e61db6e`, 24 chamadas, 302 s, custo estimado US$ 0,0433. O revisor **executou ferramentas**: releu os scripts, reexecutou `test-read.cjs` (exit 0), refez as medições 390/1440 em Playwright inline, extraiu o estado completo das 10 linhas, revalidou SHA-256 e dimensões das PNGs, conferiu o checkout nativo limpo e procurou segredos.
- Pacote revisado: `46018a5e` (código `86f4c552` inalterado). Parecer bruto em `revisao-independente.json`.
- Veredito inicial: **`passed=false`**, com 2 bloqueantes de evidência/relato e 10 sugestões.

Bloqueantes e disposição:

| # | Bloqueante | Disposição |
|---|---|---|
| 1 | Relatório afirmava que as 10 OS eram `Cancelado`/`R$ 0,00`; o DOM real tem OS 2 `Aberto` e OS 1 `Finalizado`/`R$ 320,00`. | **Corrigido**: afirmação substituída pelo extrato integral em `estado-fixture.json`, com escopo explícito das linhas visíveis nas capturas. |
| 2 | `test-read.log` rotula o HEAD da execução (`af62e809`) como "candidate", enquanto o relatório nomeia `86f4c552`. | **Corrigido**: seção de proveniência explica o rótulo e comprova a identidade do código (diff vazio, blob idêntico, overlay com o hash do candidato); `ambiente.txt` registra a verificação. |

Sugestões registradas sem alteração de código (escopo da rodada proíbe corrigir implementação):

- `guard.cjs:8`: `state.includes('active')` também aceita `inactive`; o `MainPID` ainda barra o caso inativo, então não houve passe falso, mas a comparação deve ser exata (`ActiveState`). Recomendação para decisão do GPT.
- `test-read.cjs:52`: pega o primeiro link de detalhe do documento, não necessariamente o da primeira linha da tabela; o relatório foi ajustado para não afirmar isso.
- `capturas-os.cjs`: o script só falha por suas três asserções booleanas; `status`, `h1` e número de linhas são observacionais (registrados em `capturas-os.json`, não asseridos). O revisor não reexecutou o script para não sobrescrever as capturas; a reprodução inline bateu com todas as métricas.
- `capturas-os.log` não traz bloco de proveniência; `ambiente.txt` supre ambiente, SHAs e comandos de verificação.
- Custos: números do coordenador têm agora artefato próprio em `custos.json`; os do revisor vêm do resultado da delegação.

## Rotas e custo

| Papel | Configuração | Observado na execução |
|---|---|---|
| Coordenador (cron) | job `fb7db49cdf80`, `model: deepseek-chat`, `provider: deepseek` | sessão `deepseek-flash` / `deepseek`, `base_url=https://api.deepseek.com/v1`; 32 chamadas, 78.303 tokens de entrada, 17.806 de saída, 2.843.136 de cache lido, 6.952 de reasoning (`custos.json`) |
| Revisor independente | subagente herda o modelo do processo | `deepseek/deepseek-flash`, 24 chamadas, 1.255.066 tokens de entrada, 53.373 de saída, custo estimado US$ 0,0433 |

Custo estimado do coordenador: **US$ 0,031** (`cost_status=estimated`, fonte `official_docs_snapshot`, leitura às 19:43Z; o valor final fecha ao término da sessão); custo real registrado no `state.db`: US$ 0. Início do ciclo: 2026-11-27T19:35:11Z (16:35 -03).

## Limitações e riscos

- Somente Chromium headless; sem WebKit, Firefox ou aparelhos reais.
- Capturas do administrador em 390 e 1440; o técnico foi coberto pelo `test-read.cjs` em 320 e 1024, não por captura própria.
- "Usabilidade da ação" foi medida por visibilidade, alvo ≥ 24 px e acerto de `elementFromPoint` no primeiro link de detalhe; os demais ícones foram julgados por inspeção visual das capturas. A navegação real de detalhe e busca foi exercitada pelo `test-read.cjs` (ambos os papéis).
- `capturas-os.cjs` não assere `status`, `h1` e contagem de linhas; são registros observacionais no JSON. O bloqueio de rede vale para requisições da página; o guard acessa apenas a URL do laboratório via `page.request`.
- `guard.cjs` tem endurecimento pendente na checagem de `ActiveState` (sugestão da revisão); não foi alterado nesta rodada, por proibição de mudança de implementação e para preservar a identidade do harness testado.
- Overlay CSS experimental depende da estrutura e dos rótulos nativos; navegadores sem `:has()` mantêm a apresentação original.
- Nenhuma escrita de domínio; apenas sessões normais de login. Laboratório sintético, sem dados, credenciais ou serviços de produção.
- O estado das OS sintéticas varia (ver `estado-fixture.json`); não é um fixture recriado para esta rodada.
- Julgamento visual final permanece com o GPT Supervisor.
