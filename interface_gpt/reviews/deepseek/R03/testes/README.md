# Testes e evidências — R03

Todos os testes usam dados fictícios em `localStorage` e o protótipo estático; não há backend, login, token ou chamada externa. O servidor de laboratório foi iniciado em `interface_gpt/` com:

```bash
python3 -m http.server 8130 --bind 0.0.0.0
```

E as ferramentas de navegador em `interface-gpt-lab/tools/node_modules`:

```bash
export NODE_PATH=/home/dragonblue/workspace/interface-gpt-lab/tools/node_modules
export BASE_URL=http://127.0.0.1:8130
export SHA_TESTED=798b8075b597dcc7bb72335b617594b37f08547e
export CODE_SHA=b180ab6ca10910c23d77b686af1a2b9da8d771d7
export INCREMENT_SHA=798b8075b597dcc7bb72335b617594b37f08547e
```

## Suítes

| Script | Resultado | O que cobre |
| --- | --- | --- |
| `../../../tests/smoke.cjs` | **72 combinações, PASS** | Rotas, filas, exibição financeira e escaping do protótipo. |
| `../../../tests/quote.cjs` | **29/29 PASS** | Domínio de orçamento do GPT: versões, decisões, cobrança, datas e guards. |
| `quote-browser.cjs` | **34: 33 PASS, 0 FAIL, 1 INFO** | Cenários 1–4 em Chromium real, perfis, persistência e responsividade básica. |
| `quote-edge.cjs` | **12: 8 PASS, 0 FAIL, 4 INFO** | Desconto inválido, item vazio, texto longo, cobrança após recusa/cobrança, datas, 320, teto de valor e formalização do rascunho. |
| `audit-r03.cjs` | **118: 116 PASS, 0 FAIL, 2 INFO** | Bateria R02 adaptada ao contrato “aprovação ≠ cobrança”; D01/D04/D05 atualizados. |
| `regressao-r02.cjs` | **37/37 PASS** | Regressão R02 sem alteração de expectativa. |
| `axe-r03.cjs` | **14 varreduras, 0 violações; foco 8/8** | WCAG 2.2 A/AA nas novas telas, no editor e no modal do link, em 1440 e 390; foco por Tab no editor e no link. |
| `capture-r03.cjs` | **32/32 PASS; 49 capturas** | Matriz 320/390/768/1440/1024, editor, histórico, decisão e cobrança. |

## Comandos

```bash
# a partir de reviews/deepseek/R03/testes
node quote-browser.cjs
node quote-edge.cjs
SHA_TESTED=798b8075b597dcc7bb72335b617594b37f08547e CODE_SHA=b180ab6ca10910c23d77b686af1a2b9da8d771d7 INCREMENT_SHA=798b8075b597dcc7bb72335b617594b37f08547e node audit-r03.cjs
node regressao-r02.cjs
node axe-r03.cjs
node capture-r03.cjs
```

Os testes do protótipo são executados a partir de `interface_gpt/`:

```bash
node tests/smoke.cjs
node tests/quote.cjs
```

## Artefatos principais

- `resultados.json` / `resultados.md` — auditoria R02 adaptada (118 verificações, console e rede).
- `quote-browser-resultados.json` — 34 verificações de navegador.
- `edge-resultados.json` — 12 verificações de limites.
- `regressao-resultados.json` — 37 regressões R02.
- `responsivo.json` / `responsivo.md` — medidas de coluna, overflow, cabeçalho e barra de ação.
- `axe.json` / `axe.md` — 14 varreduras axe e 0 violações; `axe-antes-798.json` preserva a violação anterior no checkout puro 798b8075.
- `proveniencia.json` — `incrementSha=798b8075`, `codeTreeSha=b180ab6c` e hashes dos assets; explica por que `SHA_TESTED` e `codeSha` são campos distintos.
- `console.log` / `rede.log` — 0 exceções/erros e 0 requisições externas na auditoria.
- `smoke.log` / `quote.log` — saídas dos testes do GPT.

## Observações

- O teste `Q4-03` é INFO: a retirada de publicação após a entrega permanece disponível; o comportamento tem paridade com o `retirar` do Trifase.
- `E5`, `E6`, `E7` e `E12` são INFO/riscos de produto, não falhas: cobrança após recusa, publicar/retirar após cobrança, retirada após entrega e formalização sobre rascunho.
- Os arquivos de evidência da R02 não foram alterados no commit da R03; uma execução local que os tocou foi restaurada com `git checkout --`. O CSS corrigido já estava na árvore servida durante os testes; a coluna `codeSha` dos JSONs registra `b180ab6c`, não apenas o incremento `798b8075`.
