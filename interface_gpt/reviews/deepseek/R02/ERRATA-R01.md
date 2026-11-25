# Errata da auditoria cega — pacote R01

**Auditoria:** subagente cego, somente leitura, em 25/11/2026.
**Veredito:** **APTO COM RESSALVAS** — nenhum achado sem suporte, nenhuma contagem inventada, nenhuma alteração fora do escopo.
**Pacote auditado:** `interface_gpt/reviews/deepseek/R01/` no SHA `da3fa68d`.
**Decisão:** a R01 é preservada integralmente, como exige o briefing da R02. As correções documentais ficam registradas aqui; a R02 é a referência atual para o protótipo.

## Ressalvas e tratamento

| # | Ressalva da auditoria | Evidência | Tratamento |
| --- | --- | --- | --- |
| 1 | O SHA de evidências citado no R01 (`317348bf`) não contém `testes/axe.cjs`, `axe.json` e `axe.md`; esses arquivos entram em `da3fa68d`. | `git ls-tree 317348bf` vs `da3fa68d`. | **Confirmado.** O R01 deve ser lido como `317348bf` (capturas/testes principais) + complemento `da3fa68d` (axe e achado L-10). O pacote R02 já nasce com o SHA de evidências único (`fbea8b01`). |
| 2 | "Todos os links e botões visíveis responderam" não tem crawl exaustivo em `resultados.json`. | `audit.cjs` exercita rotas e ações específicas, não todos os links/botões. | **Confirmado.** A frase correta é: "todos os fluxos e ações exercitados responderam; não foi feito crawl exaustivo de cada link/botão". A R02 verifica os fluxos A–I e as ações corrigidas, não um crawl. |
| 3 | 95 arquivos, mas 94 imagens distintas: `mobile/03-listagem-os-390x844.png` e `mobile/98-achado-filtros-empilhados-390x844.png` são byte-idênticos. | `md5sum` igual; o script 98 não altera o estado. | **Confirmado.** O R01 tem 95 arquivos e 94 telas distintas; a 98 é uma segunda tomada da mesma tela, não uma tela adicional. O R02 usa 98 com filtro ativo para não repetir a 03. |
| 4 | `C03 PASS` ("sem recursos HTTP com erro") convive com 13 erros 404 no console. | `console.log` com 13 entradas; `httpErrors: []`. | **Confirmado.** O C03 media respostas do listener, não o console. A leitura válida está no `console.log`: 0 exceções JS e 13 erros de favicon. A R02 corrigiu o favicon e o console ficou vazio. |
| 5 | "Dois commits à frente" para `82c167b1` em relação a `f55182df` está incorreto. | `git rev-list --count f55182df..82c167b1` = 1. | **Confirmado.** É **um** commit à frente (`82c167b1` reserva o diretório de revisão). |
| 6 | M-01 diz "quatro linhas", mas a captura 91 mostra cinco; M-02 diz "uma linha cada", mas "Todas" e "Em atendimento" dividem a primeira; M-05 cita `if (o.delivery) return` como trava do andamento, mas esse trecho é do modal de entrega. | Capturas 91/98; `app.js` linhas do modal e do submit. | **Confirmado.** São imprecisões de descrição: M-01 = cinco linhas; M-02 = os chips ocupam quase toda a primeira tela, com duas opções na primeira linha; a trava do andamento é `if(o.delivery||...)` no `submit`, não o guard do modal de entrega. A R02 registra as medidas reais. |
| 7 | L-06 cita "14:51:29", mas o D04 registra "14:53:48". | `resultados.json` do R01. | **Confirmado.** O horário correto é o do artefato (14:53:48); o valor no texto era de uma execução anterior. |
| 8 | L-03 atribui ao K11 valores de `pill` 11,8 px e `order-id` 11,5 px, que o K11 não listou. | K11 lista `eyebrow` 11,2 e menu 11,7; os outros vêm do CSS (`.pill` .74rem, `.order-id` .72rem). | **Confirmado.** O K11 mediu os elementos com texto direto na página; `pill`/`order-id` foram identificados por CSS, não pelo K11. A R02 elevou todos para ≥12 px. |
| 9 | "0 violações de contraste, landmark, rótulo ou estrutura" contradiz o `label-content-name-mismatch`. | `axe.json` do R01: 12 nós de `label-content-name-mismatch`. | **Confirmado.** A frase correta: "0 violações de contraste, landmark e estrutura; a única regra acionada foi `label-content-name-mismatch` (WCAG 2.5.3)". A R02 corrigiu o `aria-label` da marca e o axe ficou em 0. |
| 10 | Cobertura mobile 390 parcial: faltam cadastro manual, modais de orçamento/aprovação e resultado de pesquisa. | `mobile/` do R01. | **Confirmado.** São lacunas de completude, não ausência total (o desktop cobre). A R02 mantém a mesma prioridade de capturas; a cobertura mobile adicional fica para a próxima rodada. |
| 11 | Prefixos numéricos duplicados no mobile do R01: 93, 94 e 95. | `ls mobile/`. | **Confirmado.** Os links funcionam, mas os nomes não são únicos; não renomeei para não quebrar referências da R01. |
| 12 | RESUMO do R01 chama 8 achados de "Bloqueios", mas o RELATORIO classifica 2 como Alta e 6 como Média. | Tabela de gravidade. | **Confirmado.** O rótulo correto seria "Bloqueios e pontos prioritários"; a R02 usa "O que foi corrigido" e "O que permanece". |
| 13 | Bind do servidor divergente: `0.0.0.0` no `ambiente.txt`, `127.0.0.1` no README. | Arquivos citados. | **Corrigido na R02:** o README de testes passa a usar `--bind 0.0.0.0`, igual ao ambiente. A R01 fica como está. |
| 14 | O 404 do console não identifica `/favicon.ico`; a atribuição ao favicon é plausível, mas não está no log. | `console.log` registra a URL da página. | **Confirmado.** A conclusão veio de `curl /favicon.ico` (404) e da ausência de `<link rel="icon">`; o log não nomeia o recurso. A R02 adicionou o favicon e não há mais 404. |

## O que a R02 já resolve

- Todos os achados de código da R01 (A-01, A-02, M-01 a M-04, L-01 a L-06 e L-08 a L-10) estão corrigidos e cobertos por 37 testes de regressão.
- O console da R02 está vazio, o favicon existe e o axe-core não tem violações.
- A R02 mede antes/depois e mantém a R01 intacta para comparação.

## O que permanece

- M-06 (orçamento sobrescrito) e a fila de cancelamentos continuam fora de escopo, como decidido pelo GPT.
- A cobertura mobile de todas as telas e o crawl exaustivo de links/botões não fazem parte desta rodada; são melhorias para a R03.
- Firefox/WebKit não foram testados.

**Conclusão:** as ressalvas são de rastreabilidade e precisão documental; não invalidam os achados nem a R02. O baseline R01 continua útil, com esta errata como leitura obrigatória.
