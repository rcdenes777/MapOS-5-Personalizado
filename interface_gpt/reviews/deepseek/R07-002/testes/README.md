# Testes da R07-002

**Código testado:** `e04bb4059282197a0ce98e10d1715379433b5084` (candidato `b1dfff01` + correção do piso nativo da data).  
**Candidato:** `b1dfff0197d81f2ad4cd7a570f5476cd0aa6fc8d`; base R07-001 `f46ad182`.  
**Referência funcional:** `8c256cae` (v5-trifase; remoto conferido).  
**Servidor:** `http://127.0.0.1:8130` (`python3 -m http.server` em `interface_gpt/`), dados fictícios em `localStorage`.  
**Dependências:** Node 26.12.1, `playwright-core` + Chromium 1248, `axe-core` 4.14.1, `pdftotext`/`pdfinfo`, Pillow 13.

## Comandos

```bash
cd interface_gpt
node tests/smoke.cjs && node tests/quote.cjs && node tests/portal.cjs && node tests/portal-page.cjs
node tests/finance.cjs && node tests/finance-ui.cjs && node tests/cancel.cjs && node tests/cancel-ui.cjs
node tests/warranty.cjs && node tests/warranty-ui.cjs && node tests/warranty-refund.cjs && node tests/warranty-refund-ui.cjs

cd reviews/deepseek/R07-002/testes
export BASE_URL=http://127.0.0.1:8130
export CODE_SHA=e04bb4059282197a0ce98e10d1715379433b5084
export NODE_PATH=/home/dragonblue/workspace/interface-gpt-lab/tools/node_modules:/home/dragonblue/workspace/node_modules

node r07-002-domain.cjs && node r07-002-negativos.cjs
node r07-002-browser.cjs && node r07-002-edge.cjs && node r07-002-print.cjs && node r07-002-capture.cjs
SCRATCH_DIR=/home/dragonblue/.hermes/cache/scratch/r07-002-mutacoes node r07-002-mutacoes.cjs

# regressões (cópias; originais preservados em R07-001 e R06-002)
node r07-browser.cjs && node r07-negativos.cjs && node r07-edge.cjs && node r07-print.cjs
SCRATCH_DIR=/home/dragonblue/.hermes/cache/scratch/r07-002-mutacoes-legado node r07-mutacoes.cjs
node r07-handler-check.cjs

cd r06-002
node handler-tech.cjs && node negativos.cjs && node browser.cjs && node edge.cjs && node axe.cjs && node print.cjs
SCRATCH_DIR=/home/dragonblue/.hermes/cache/scratch/r07-002-mutacoes-r06 node mutacoes.cjs

cd ../regressao
node regressao-r02.cjs && node regressao-r03-audit.cjs
node regressao-r04-browser.cjs && node regressao-r04-edge.cjs
node regressao-r05-browser.cjs && node regressao-r05-edge.cjs
```

## Adaptações de cópia (nenhuma asserção enfraquecida)

- `r06-002/browser.cjs`: F02 — OS #018 deixou de ser bloqueada e virou positiva; #016 mantém o bloqueio com a mensagem nova (“retorno ou solução de garantia vinculada”). A mensagem genérica anterior era o bug F02.
- `r07-mutacoes.cjs`: dois anchors de texto foram atualizados porque `quote.js` passou a usar `hasObligation` e `warranty.js` filtra `lastFinalized` pela raiz. As mutações continuam mirando as mesmas guardas (20 detectadas + 1 equivalente).
- `r06-002/lib.cjs`: `OUT` ajustado de `../` para `../../` apenas para gravar a evidência em `R07-002/`; o original `R06-002` não foi tocado.

## Observações

- Nenhum mutante é publicado; cópias mutadas ficam sob `~/.hermes/cache/scratch/`.
- `r06-002/axe-R06-regressao.md` é artefato da regressão R06; a evidência nova é `axe-r07-002.md` (5 varreduras, 0 violações).
- `capturas-delta.json` compara as duas capturas homônimas com a R07-001; ambas mudaram de dimensão (+81 px) pela troca do aviso pelo painel real de devolução.
- `proveniencia.py` gera `../proveniencia.json` com hashes de assets, suítes e evidências; `v5TrifaseRemoteTip` vem de `git ls-remote`.
