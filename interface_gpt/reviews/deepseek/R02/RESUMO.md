# Resumo R02 — MapOS Bancada

**SHA inicial:** `da3fa68dab9c3d0fd90499ee8b7079abb754ae74`
**Commit técnico:** `fe27e12a280859e585dfb2f7a8c6d3ba18718106`
**Commit visual:** `789d86229bb48aa3b53f5bfe59cff483d2a46689`
**Commit das evidências:** `fbea8b01f92fb4da3ae6927294d0eb020f206a6f`
**Branch:** `interface-gpt` · **Pasta:** https://github.com/rcdenes777/MapOS-5-Personalizado/tree/interface-gpt/interface_gpt/reviews/deepseek/R02

## Resultado

| Verificação | Resultado |
| --- | --- |
| Regressão específica | **37/37 PASS** |
| Bateria R01 adaptada | **117: 115 PASS, 0 FAIL, 2 INFO** |
| Smoke existente | **PASS** (72 combinações) |
| axe-core | **0 violações** em 26 varreduras |
| Fluxos A–I | **PASS** |
| Capturas | **92** (49 desktop, 35 celular, 8 tablet) |
| Nota média | **7,8/10** (R01: 7,3) |

## Antes → depois

| Medida | R01 | R02 |
| --- | --- | --- |
| Primeiro resultado da lista em 390 | 680 px | **392 px** |
| Primeiro resultado da lista em 320 | 677 px | **389 px** |
| Abas da OS em 390 | 769 px | **516 px** |
| Abas da OS em 320 | 790 px | **487 px** |
| Cartões de estado da OS em 390 | 500 px | **277 px** |
| Primeira OS no painel em 390 | 995 px | **659 px** |
| Primeira OS no painel em 320 | 1.139 px | **461 px** (menu em 507) |
| Cartão em contêiner de 387 px | 3 colunas, 208 px, 5 linhas | **1 coluna, 139 px, 1 linha** |
| Overflow com texto longo | 3.981–4.412 px | **0 em 8 resoluções** |
| Submit da Nova OS | fora da tela (1.470/1.491 px) | **fixo, visível acima do menu** |
| Impressão | sem `@page` | **A4 12 mm + cupom 80 mm 3 mm** |

## O que foi corrigido

- **A-01** atalho de conteúdo não mexe mais na rota.
- **A-02** texto longo quebra em qualquer palavra, sem overflow em 8 resoluções.
- **M-01** cartão usa container query: 1 coluna em contêiner estreito, 3 em largo.
- **M-02** filtros mobile viram seletor de fila de 44 px; chips ficam no desktop.
- **M-03** barra de ações persistente na Nova OS, acima do menu, sem cobrir o campo focado.
- **M-04** foco contido no modal (Tab e Shift+Tab), Escape devolve ao gatilho.
- **M-05** entrega independente do andamento; só reabrir finalizada+entregue é bloqueado (como no Trifase).
- **L-01..L-06 e L-08..L-10** favicon, toques, textos ≥12 px, plural, datas, placeholder e nome acessível da marca.
- **Painel, detalhe da OS, navegação e cabeçalhos mobile** compactados sem mudar a identidade visual.

## O que permanece

- **M-06 — orçamento sobrescrito:** não implementado por decisão do GPT; proposta de R$ 240,00 ainda pode virar R$ 300,00 aguardando resposta, sem versão. Documentado em `testes/extras.json`.
- **Cancelamentos:** fila sem fluxo completo; lacuna conhecida.
- **Lacunas declaradas:** anexos com upload, consumo de estoque, busca de equipamento por selo/série/IMEI, data real de conclusão, documento impresso completo, relatórios, autenticação real e temas.
- **Firefox/WebKit:** não disponíveis nesta rodada; auditoria em Chromium 156.

## Notas

| Critério | R01 | R02 |
| --- | --- | --- |
| Identidade visual | 8,0 | 8,0 |
| Clareza das informações | 8,0 | 8,5 |
| Hierarquia visual | 8,0 | 8,5 |
| Produtividade operacional | 7,0 | 8,0 |
| Quantidade de cliques | 8,0 | 8,0 |
| Ergonomia desktop | 7,0 | 8,0 |
| Ergonomia mobile | 7,0 | 8,0 |
| Consistência entre módulos | 8,0 | 8,5 |
| Descoberta das funcionalidades | 7,5 | 8,0 |
| Prevenção de erros | 7,0 | 7,5 |
| Fidelidade aos fluxos de negócio | 6,0 | 6,5 |
| Qualidade técnica do código | 7,0 | 7,5 |
| Facilidade de manutenção | 6,0 | 6,5 |
| **Média** | **7,3** | **7,8** |

## Próximos passos sugeridos

1. Versionamento de orçamento e bloqueio de sobrescrita enquanto aguarda resposta (M-06).
2. Fluxo de cancelamento ou remoção da fila morta.
3. Aviso de dados não salvos ao sair da Nova OS.
4. Semântica de abas (`tablist`/`aria-selected`) e busca de equipamento por selo/série/IMEI.
5. Modularização do `app.js` e verificação complementar em Firefox/WebKit.

**Relatório completo:** [`RELATORIO.md`](RELATORIO.md) · **Índice:** [`INDICE.md`](INDICE.md) · **Status R01:** [`ACHADOS-R01-STATUS.md`](ACHADOS-R01-STATUS.md)
