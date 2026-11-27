# R08-007 — Relatório técnico

Validação focal, somente leitura, do ciclo restaurado GitHub → Hermes → GPT no laboratório nativo sintético existente. Não é implementação, aprovação de produto nem retomada da R08-006.

## Proveniência

| Item | Valor |
|---|---|
| Tarefa | `interface_gpt/mensagens/gpt-para-deepseek/R08-007.md` |
| Publicação da tarefa / HEAD do controle | `b50b6ad120386fb56cbb742518f12bd25de85529` |
| ACK | `af62e809` (`chore(bancada): registra ACK da R08-007`) |
| Código candidato — inicial | `86f4c552ac111cec65460768b7023d207824a1b7` |
| Código candidato — final | `86f4c552ac111cec65460768b7023d207824a1b7` (**inalterado**; nenhum arquivo de código, CSS, teste ou configuração do laboratório foi editado) |
| Referência nativa no `source/` do laboratório | `8c256cae4ddaeefad68922abddbb8addfe37c99d` (checkout destacado, worktree limpo) |
| CSS servido em `assets/dist/app.css` | `478efdfba10898515df902af8e737ec42cefb27e79334bd70c98a19ea3a4343a` |
| Overlay `interface_gpt/assets/native-os-list.css` | `4ea423f4e726d8e349d843b4098a4715272cf63573e3dfcbdb4eb9b26e2f7f01` |

Os dois hashes de CSS conferem com os valores registrados em `interface_gpt/README.md`; a lista servida é a nativa (`8c256cae`) com o overlay experimental já ativo.

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

| Viewport | Status | `h1` | Overflow (`scrollWidth - innerWidth`) | Busca (px) | Ação de linha | Linhas | Captura / SHA-256 |
|---|---|---|---|---|---|---|---|
| 390×900 | 200 | Ordens de serviço | 0 | 324×44, dentro do viewport | `Ver OS 10`, 44×44, visível e clicável | 10 | `os-lista-admin-390x900.png` / `72315232f9f58d6cef45d681d75bd782c6acd9e7d41bc7763ed3d1f64d3512d9` |
| 1440×900 | 200 | Ordens de serviço | 0 | 431×42, dentro do viewport | `Ver OS 10`, 36×36, visível e clicável | 10 | `os-lista-admin-1440x900.png` / `5a691140144cb4e852bc8291f6f7cf787ada13713cfd8c09b9bf13dbb10ec82f` |

Critérios: `no_overflow`, `search_visible` e `action_usable` (visível, dentro do viewport, ≥ 24×24 e `elementFromPoint` no centro resolve para o próprio controle) verdadeiros nos dois viewports. Inspeção visual das duas capturas: sem overflow, sobreposição ou corte de texto; busca visível; ícones de ação (ver/editar/excluir) legíveis e separados. **Nenhum defeito objetivo observado; nenhuma alteração de código feita.**

Observação de fixture (não defeito): todas as 10 OS sintéticas aparecem como `Cancelado` e com `Total R$ 0,00`, coerente com o estado deixado por rodadas anteriores no banco sintético.

## Teste 3 — revisão independente

<!-- REVISAO -->

## Rotas e custo

| Papel | Configuração | Observado na execução |
|---|---|---|
| Coordenador (cron) | job `fb7db49cdf80`, `model: deepseek-chat`, `provider: deepseek` | sessão `deepseek-flash` / `deepseek`, `base_url=https://api.deepseek.com/v1`; 25 chamadas, 68.699 tokens de entrada, 9.086 de saída, 2.090.496 de cache lido, 3.757 de reasoning |
| Revisor independente | subagente herda o modelo do processo | <!-- REVISAO-ROTA --> |

Custo estimado do coordenador: **US$ 0,022** (`cost_status=estimated`, fonte `official_docs_snapshot`); custo real registrado: US$ 0, Revisor: <!-- REVISAO-CUSTO -->. Início do ciclo: 2026-11-27T19:35:11Z (16:35 -03).

## Limitações e riscos

- Somente Chromium headless; sem WebKit, Firefox ou aparelhos reais.
- Capturas do administrador em 390 e 1440; o técnico foi coberto pelo `test-read.cjs` em 320 e 1024, não por captura própria.
- "Usabilidade da ação" foi medida por visibilidade, alvo ≥ 24 px e acerto de `elementFromPoint`; a navegação real de detalhe e busca foi exercitada pelo `test-read.cjs`.
- Overlay CSS experimental depende da estrutura e dos rótulos nativos; navegadores sem `:has()` mantêm a apresentação original.
- Nenhuma escrita de domínio; apenas sessões normais de login. Laboratório sintético, sem dados, credenciais ou serviços de produção.
- Julgamento visual final permanece com o GPT Supervisor.
