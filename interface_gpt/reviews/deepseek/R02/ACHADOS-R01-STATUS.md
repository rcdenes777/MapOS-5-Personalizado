# Status dos achados da R01 — rodada R02

**SHA inicial da R02:** `da3fa68dab9c3d0fd90499ee8b7079abb754ae74`
**Commit técnico:** `fe27e12a280859e585dfb2f7a8c6d3ba18718106`
**Commit visual:** `789d86229bb48aa3b53f5bfe59cff483d2a46689`
**Evidências:** `interface_gpt/reviews/deepseek/R02/`

| ID R01 | Achado | Status na R02 | Evidência |
| --- | --- | --- | --- |
| A-01 | Atalho "Pular para o conteúdo" quebrava a tela | **Corrigido** em `fe27e12a` | `G1-01` em `testes/regressao.log`; `#main` recebe foco sem alterar a rota. |
| A-02 | Texto longo sem espaços causava overflow horizontal | **Corrigido** em `fe27e12a` | `G1-02-1920` a `G1-02-320`, 8 resoluções com overflow 0; capturas `mobile/96-r02-texto-longo` e `97-r02-texto-longo-lista`. |
| M-01 | Cartão comprimido em contêiner estreito no desktop | **Corrigido** em `fe27e12a` | Container query; `G1-03` (1 coluna, 139 px, 1 linha) e captura `desktop/90-r02-cartao-lista-estreita`. |
| M-02 | Sete filtros empilhados no celular | **Corrigido** em `789d8622` | Seletor de fila < 880 px; `G2-02`; primeiro resultado em 392 px (era 680). |
| M-03 | Criar OS fora da primeira tela | **Corrigido** em `789d8622` | Barra fixa/flutuante; `G2-04` e `G2-04b`; submit visível em 390 e 320; campo focado acima da barra. |
| M-04 | Foco escapava do modal | **Corrigido** em `fe27e12a` | `G1-04`, `G1-04b`, `G1-04c`: Tab, Shift+Tab e Escape. |
| M-05 | Entrega antes da finalização | **Decisão do GPT:** não travar a entrega por status | `G3-01`/`G3-02`: entrega em "Em Andamento" e finalização posterior permitidas; reabrir finalizada + entregue bloqueado, como no Trifase. |
| M-06 | Proposta pendente sobrescrita sem versão | **Não implementado** nesta rodada, por decisão do GPT; divergência documentada | `testes/extras.json`: 24.000 → 30.000 com "Aguardando resposta"; sem versão. |
| L-01 | Favicon 404 | **Corrigido** em `fe27e12a` | `assets/favicon.svg`; `G1-05`; axe sem 404. |
| L-02 | Alvos de toque < 44 px | **Corrigido** em `fe27e12a` | `G1-06`: marca mobile e `summary` com 44 px. |
| L-03 | Textos auxiliares < 12 px | **Corrigido** em `fe27e12a` | `G1-07`: nenhum texto < 12 px. |
| L-04 | Impressão sem `@page`/margens | **Corrigido** em `fe27e12a` | `G1-12`: `@page` A4 12 mm e cupom 80 mm 3 mm; capturas 19/20/36/37. |
| L-05 | "1 atendimentos" | **Corrigido** em `fe27e12a` | `G1-08` e `G1-08b`: "1 atendimento", "1 ordem encontrada". |
| L-06 | Formatos de data misturados | **Corrigido** em `fe27e12a` | `G1-10`: histórico sem ISO, `DD/MM/YYYY` e `DD/MM/YYYY · HH:mm`. |
| L-07 | Fila de cancelamentos sempre zero | **Mantido** como lacuna conhecida; não autorizado implementar | Sem fluxo de cancelamento nesta rodada. |
| L-08 | Placeholder não mencionava defeito | **Corrigido** em `fe27e12a` | `G1-09`: "Buscar OS, cliente, equipamento ou defeito". |
| L-09 | Troca de perfil descartava contexto | **Corrigido** em `fe27e12a` | `G1-13`/`G1-13b`: preserva `#os/20` quando acessível; sai para `#inicio` quando não. |
| L-10 | `aria-label` da marca não continha "m." | **Corrigido** em `fe27e12a` | `G1-11`; axe-core: 0 violações em 26 varreduras. |

## Não corrigido por decisão de escopo

- **M-06 / orçamento:** o protótipo continua com proposta única e sobrescrita enquanto "Aguardando resposta". O GPT informou que o módulo será ampliado depois do estudo completo de versões/aprovação/recusa; a divergência está registrada no relatório e em `testes/extras.json`.
- **Cancelamentos:** a fila sem fluxo completo permanece; não foi criado módulo novo.
- **Lacunas declaradas do protótipo:** anexos com upload, consumo de estoque, busca de equipamento por selo/série/IMEI, data real de conclusão, documentos completos, relatórios, autenticação real e temas.

## Regressões

- Nenhuma regressão funcional nos fluxos A–I.
- Nenhuma trava de negócio nova foi adicionada. A única mudança de estado foi a remoção da trava excessiva pós-entrega e a preservação da regra do Trifase contra reabertura de OS finalizada e entregue.
- A identidade visual (verde/creme, tipografia, ícones, sidebar) foi preservada; as mudanças são de composição e densidade.
