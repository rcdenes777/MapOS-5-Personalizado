# Testes e evidências — R02

Scripts e logs da rodada de correções/refinamentos. Nada aqui altera o protótipo.

## Conteúdo

| Arquivo | O que é |
| --- | --- |
| `smoke.log` | `tests/smoke.cjs` — 72 combinações perfil×rota (PASS). |
| `regressao.cjs` | 37 testes de regressão das correções e refinamentos. |
| `regressao-red-inicial.log` | Primeira execução (RED), antes das correções: 29 falhas esperadas. |
| `regressao.log` | Execução final: 37/37 PASS. |
| `regressao-resultados.json` | Resultado estruturado da regressão. |
| `audit.cjs` | Bateria R01 adaptada: rotas, perfis, fluxos A–I, teclado, contraste, responsividade, casos-limite, console e rede. |
| `execucao.log` | Execução final da auditoria: 117 verificações, 115 PASS, 0 FAIL, 2 INFO. |
| `resultados.json` / `resultados.md` | Resultado estruturado e tabela legível. |
| `axe.cjs` / `axe.json` / `axe.md` | axe-core 4.14 em 12 telas × 2 resoluções + modal: 26 varreduras, 0 violações. |
| `extras.cjs` / `extras.json` | Proposta sobrescrita (M-06), `@page`, contexto de perfil e overflow com texto longo. |
| `baseline.cjs` / `baseline-r01.json` | Medições “antes” feitas no SHA inicial da R02 (`da3fa68d`). |
| `medicoes.cjs` / `medicoes-r02.json` | Medições “depois” (hero, primeira OS, abas, barra, cartões). |
| `capturas.cjs` / `capturas-r02.cjs` | Geração das capturas canônicas e dos estados corrigidos. |
| `console.log` / `rede.log` | Console (vazio) e requisições (todas locais). |
| `ambiente.txt` | Versões, SHAs, servidor e limitações. |

## Como reproduzir

```bash
# 1. Servir o protótipo
cd interface_gpt
python3 -m http.server 8130 --bind 0.0.0.0

# 2. Em outro terminal
export NODE_PATH=/caminho/para/node_modules   # playwright-core + axe-core
export CHROME_PATH=/caminho/para/chrome        # opcional
export BASE_URL=http://127.0.0.1:8130
node reviews/deepseek/R02/testes/regressao.cjs
node reviews/deepseek/R02/testes/audit.cjs
node reviews/deepseek/R02/testes/axe.cjs
node reviews/deepseek/R02/testes/extras.cjs
node reviews/deepseek/R02/testes/medicoes.cjs
node reviews/deepseek/R02/testes/capturas.cjs
node reviews/deepseek/R02/testes/capturas-r02.cjs
```

## Resultado final

- Regressão: **37/37 PASS**.
- Auditoria: **117 (115 PASS, 0 FAIL, 2 INFO)**.
- axe-core: **0 violações**.
- Smoke: **PASS**.
- Nenhuma requisição externa; nenhuma exceção JavaScript.

## Notas de execução

- `body { overflow-wrap: anywhere }` é intencional para A-02; o teste injeta strings sem espaços dentro dos `maxlength`.
- O carrossel de métricas em ≤360 é uma rolagem horizontal **intencional** dentro de `.metrics`; o detector de “elementos fora da viewport” ignora ancestrais com `overflow-x: auto`.
- O campo série/selo/IMEI fica em `<details>` fechado; para preenchê-lo no teste, abra o `summary` “Dados opcionais”.
- A barra da Nova OS é `fixed`; o teste verifica que o submit fica acima do menu inferior e que o campo focado fica acima da barra.
- Firefox/WebKit não estavam disponíveis no cache do Playwright; a rodada é Chromium 156.
