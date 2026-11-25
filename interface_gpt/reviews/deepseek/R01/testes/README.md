# Testes e evidências — R01

Esta pasta contém os scripts, logs e resultados da revisão independente. Nada aqui altera o protótipo; os scripts apenas navegam e leem o `localStorage`.

## Conteúdo

| Arquivo | O que é |
| --- | --- |
| `smoke.log` | Saída de `node tests/smoke.cjs` (teste existente do protótipo). |
| `audit.cjs` | Bateria principal: rotas, perfis, fluxos A–I, teclado, contraste, responsividade, casos-limite e console/rede. |
| `execucao.log` | Log completo da execução da bateria principal (118 verificações). |
| `resultados.json` | Resultado estruturado (status, detalhe, console, rede, capturas). |
| `resultados.md` | Mesma tabela em Markdown, para leitura rápida. |
| `extras.cjs` | Evidências complementares: proposta sobrescrita, `@page`, troca de perfil e overflow com texto longo. |
| `extras.log` / `extras.json` | Saída das evidências complementares. |
| `capturas.cjs` | Geração das 95 capturas de referência e dos estados de fluxo. |
| `capturas-achados.cjs` | Capturas dedicadas dos achados visuais. |
| `ambiente.txt` | Versões, host, SHA, URL e comando do servidor. |
| `console.log` | Mensagens de console coletadas (0 exceções JS; 13 erros 404 de favicon). |
| `rede.log` | Requisições registradas (todas locais; 0 externas). |

## Como reproduzir

Pré-requisitos: Node 22+, Chromium/Chrome e `playwright-core` instalado fora do protótipo (o repositório não tem `node_modules`).

```bash
# 1. Servir o protótipo (na pasta interface_gpt)
cd interface_gpt
python3 -m http.server 8130 --bind 127.0.0.1

# 2. Em outro terminal, com playwright-core disponível
export NODE_PATH=/caminho/para/node_modules
export CHROME_PATH=/caminho/para/chrome   # opcional se o Chromium estiver no caminho padrão do script
export BASE_URL=http://127.0.0.1:8130
node reviews/deepseek/R01/testes/audit.cjs
node reviews/deepseek/R01/testes/extras.cjs
node reviews/deepseek/R01/testes/capturas.cjs
node reviews/deepseek/R01/testes/capturas-achados.cjs
```

O script `audit.cjs` limpa o `localStorage` ao iniciar cada sessão e usa somente o seed fictício. As capturas são gravadas em `../desktop`, `../mobile` e `../tablet`, sempre na resolução indicada no nome.

## Versões usadas nesta rodada

- Chromium: Google Chrome for Testing 156.0.8078.4
- `playwright-core`: 1.65.1
- Node: v26.12.1
- Python: 3.14.9
- SHA: `82c167b1d4ddc8f9939ff58123eec611199452eb`

## Notas de execução

- O `Intl.NumberFormat` de pt-BR usa espaço não separável em `R$ 240,00`; as asserções normalizam `\u00a0`.
- Nas rotas de OS, o `h1` é o equipamento; o título da aba fica em `h2`. As asserções de rota verificam o `h1` do equipamento.
- A captura em mídia `print` precisa de `emulateMedia({ media: 'print' })` e não tem `#main h1` visível; o script espera o elemento "attached", não "visible".
- O modal é um `<dialog>` nativo; o teste de teclado confirma que o foco escapa ao `BODY` após o último controle (achado M-04).

## Resultado

`PASS 109 · FAIL 6 · INFO 3 · TOTAL 118`. Os seis FAILs são achados reproduzidos (A-01, M-04, L-02, L-03, A-02 em duas verificações); a lista completa está em `resultados.md` e a classificação em `../RELATORIO.md`.
