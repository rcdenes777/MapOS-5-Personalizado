# Testes e evidências — R04

Todos os dados são fictícios e vivem no `localStorage` do mesmo navegador. O portal é uma simulação local, sem autenticação ou backend. O laboratório usa:

```bash
python3 -m http.server 8130 --bind 0.0.0.0
export NODE_PATH=/home/dragonblue/workspace/interface-gpt-lab/tools/node_modules
export BASE_URL=http://127.0.0.1:8130
export SHA_TESTED=431c428270e2ca98fece34c8ebc58624320b8628
export INCREMENT_SHA=431c428270e2ca98fece34c8ebc58624320b8628
export CODE_SHA=df925de31c09b2cc116abb025e9fdca5d39f5183
```

## Suítes

| Script | Resultado | Cobertura |
| --- | --- | --- |
| `../../../tests/smoke.cjs` | **72 combinações, PASS** | Rotas, filas e escaping do protótipo. |
| `../../../tests/quote.cjs` | **29/29 PASS** | Domínio de orçamento do GPT. |
| `../../../tests/portal.cjs` | **24/24 PASS** | Domínio do portal: link, projeção, decisão e entrega. |
| `../../../tests/portal-page.cjs` | **8/8 PASS** | Renderização pública com DOM stub. |
| `browser.cjs` | **44/44 PASS** | Link, portal, versões, entrega, financeiro, privacidade, hierarquia e duas abas. |
| `edge.cjs` | **15/15 PASS** | Revogação/expiração entre abas, formulário inválido, token inválido, perfis, cópia, textos longos/XSS e foco. |
| `audit-r03.cjs` (cópia) | **118: 116 PASS, 0 FAIL, 2 INFO** | Regressão R03 adaptada; não modifica a pasta R03. |
| `regressao-r02.cjs` (cópia) | **37/37 PASS** | Regressão R02; não modifica a pasta R02. |
| `capture.cjs` | **27/27 PASS; 72 capturas** | 320 a 1920, estados do portal e painel. |
| `axe.cjs` | **22 varreduras, 0 violações; 9/9 foco** | WCAG 2.2 A/AA e teclado; ordem de Tab do formulário do portal. |

## Comandos

```bash
# a partir de reviews/deepseek/R04/testes
node browser.cjs
node edge.cjs
node audit-r03.cjs
node regressao-r02.cjs
node capture.cjs
node axe.cjs
```

Os quatro testes do GPT são executados a partir de `interface_gpt/`:

```bash
node tests/smoke.cjs
node tests/quote.cjs
node tests/portal.cjs
node tests/portal-page.cjs
```

## Artefatos

- `browser-resultados.json` — 44 verificações de navegador.
- `edge-resultados.json` — 15 bordas e concorrência.
- `resultados.json` / `resultados.md` — auditoria R03 adaptada.
- `regressao-resultados.json` — 37 regressões R02.
- `responsivo.json` / `responsivo.md` — medidas e 72 capturas.
- `axe.json` / `axe.md` — 22 varreduras axe e 0 violações.
- `a11y-resultados.json` — 6 verificações de controles/teclado.
- `../AUDITORIA-CEGA.md` — veredito independente e resolução das ressalvas.
- `proveniencia.json` — `incrementSha=431c4282`, `codeTreeSha=df925de3` e hashes dos assets.
- `smoke.log`, `quote.log`, `portal.log`, `portal-page.log` — saídas do GPT.
- Capturas adicionais: `00-antes-fix-demo-320.png` (antes da correção) e as 8 capturas da bateria R03 adaptada.

## Observações

- O antigo botão “Simular resposta pelo link” não existe mais na UI administrativa; a resposta pública é feita em `portal.html`.
- Os testes R02/R03 são **cópias** em R04; as pastas originais não são escritas.
- Os 2 INFO da auditoria R03 são comportamentos intencionais já conhecidos (entrega independente e valor extremo), não falhas da R04.
- O portal não é um mecanismo de segurança real; o identificador local e o `localStorage` não substituem token de servidor.
