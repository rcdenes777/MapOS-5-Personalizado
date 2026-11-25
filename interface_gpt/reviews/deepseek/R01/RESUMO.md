# Resumo R01 — MapOS Bancada

**SHA testado:** `82c167b1d4ddc8f9939ff58123eec611199452eb` (branch `interface-gpt`)
**Commit das evidências:** `317348bff596a2bd0fcd7e2ad9175ce49ac02ef3`
**Ambiente:** estático, sem produção, dados fictícios; Chromium 156 + Playwright.
**Execução:** 118 verificações — **109 PASS, 6 FAIL, 3 INFO**; suíte existente (72 combinações perfil×rota) aprovada; **95 capturas** (50 desktop, 37 celular, 8 tablet).
**Nota média:** **7,3/10**.
**Pasta R01 no GitHub:** https://github.com/rcdenes777/MapOS-5-Personalizado/tree/interface-gpt/interface_gpt/reviews/deepseek/R01

## O que está bom

- Direção de produto clara: seis filas operacionais e três indicadores independentes (andamento, financeiro, retirada).
- Fluxos A–I executam: nova OS (nova/existente/identificar depois), catálogo, orçamento→aprovação→andamento→finalização, pagamento parcial, entrega com saldo, entrega a terceiro, retorno em garantia e persistência.
- Nenhuma requisição externa; nenhum erro JavaScript; nenhum vazamento de `R$` para Técnico/Atendente.
- Contraste AA passa nas telas principais; foco visível; modal recebe foco e `Escape` devolve ao gatilho.
- Mobile com menu inferior, campos de 16 px e controles principais de 44 px.

## Bloqueios (corrigir antes de integrar)

1. **A-01 — Atalho de conteúdo quebra a tela.** `Tab` → "Pular para o conteúdo" → `Enter` leva a `#main`, que o roteador trata como rota e mostra "Ação indisponível".
2. **A-02 — Texto longo sem espaços estoura o layout.** No detalhe da OS o overflow chega a 4.338 px em 1440, 4.315 px em 390 e 4.379 px em 320; na listagem, 744/808 px em 390/320. Nome de 150, modelo de 160 e defeito de 400 caracteres são permitidos pelos `maxlength`.
3. **M-01 — Cartão comprimido no painel desktop.** "Prontos para retirada" usa o layout de três colunas dentro de uma coluna de ~380 px: título quebra em quatro linhas, pills quebram no meio da palavra.
4. **M-02 — Filtros empilhados no celular.** Os sete chips ocupam uma linha cada em 390 px; o primeiro cartão de OS só aparece por volta de y=665.
5. **M-03 — Criar OS fora da primeira tela.** O botão está no fim do formulário, depois dos campos opcionais, em 1440 e 390.
6. **M-04 — Foco escapa do modal.** Após "Confirmar", o `Tab` vai para o `BODY` e só volta no `Tab` seguinte.
7. **M-05 — Entrega antes da finalização.** OS "Em Andamento" ou "Orçamento" oferece "Registrar entrega"; depois da entrega o andamento fica bloqueado.
8. **M-06 — Proposta sobrescrita.** OS #023 com proposta de R$ 240,00 aguardando resposta aceita nova proposta de R$ 300,00 sem versão ou confirmação.

## Achados baixos

Favicon 404; alvos de toque abaixo de 44 px (marca e `summary`); textos de 11,2–11,8 px; impressão sem `@page`/margens (800 px vs. A4 794 px); "1 atendimentos"; datas em formatos misturados; fila de cancelamentos sempre zero; placeholder da busca omite "defeito"; troca de perfil volta ao início.

## Notas

| Critério | Nota |
| --- | --- |
| Identidade visual | 8,0 |
| Clareza das informações | 8,0 |
| Hierarquia visual | 8,0 |
| Produtividade operacional | 7,0 |
| Quantidade de cliques | 8,0 |
| Ergonomia desktop | 7,0 |
| Ergonomia mobile | 7,0 |
| Consistência entre módulos | 8,0 |
| Descoberta das funcionalidades | 7,5 |
| Prevenção de erros | 7,0 |
| Fidelidade aos fluxos de negócio | 6,0 |
| Qualidade técnica do código | 7,0 |
| Facilidade de manutenção | 6,0 |
| **Média** | **7,3** |

## Prioridades para o GPT

1. Atalho de conteúdo e overflow de texto (A-01/A-02).
2. Cartão comprimido e submit fora da tela (M-01/M-03).
3. Filtros mobile compactos e trap de foco no modal (M-02/M-04).
4. Trava de entrega por status e versionamento de proposta (M-05/M-06).
5. Polimento dos baixos e reexecução da bateria em R02.

## Lacunas declaradas (não contam como defeito)

Orçamento por itens/versões/link público; cancelamento; consumo de estoque; anexos com upload; busca de equipamento por selo/série/IMEI/modelo; data real de conclusão; documentos completos; relatórios; autenticação real; temas/dark mode; paginação.

**Relatório completo:** [`RELATORIO.md`](RELATORIO.md) · **Índice visual:** [`INDICE.md`](INDICE.md) · **Resultados brutos:** [`testes/resultados.json`](testes/resultados.json)
