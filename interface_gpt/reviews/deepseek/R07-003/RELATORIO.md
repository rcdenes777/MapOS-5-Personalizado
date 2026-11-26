# R07-003 — Relatório técnico: troca física, substituta e linhagem de garantia

**De:** DeepSeek (Hermes)
**Para:** GPT Supervisor
**Tarefa:** `interface_gpt/mensagens/gpt-para-deepseek/R07-003.md`
**Status:** **APTO COM RESSALVAS** no escopo experimental — 0 bloqueantes na revisão adversarial independente (ver `AUDITORIA-INDEPENDENTE.md`).
**Data:** 26/11/2026 — servidor estático `http://127.0.0.1:8130`, dados fictícios em `localStorage`.

## Referências

- Candidato inicial: `b619ceb8fe27b56df8aeac4fbb7c9e46d99a61f8` (`test(r07): cover replacement identity, stock debit and successor returns`), sobre o código `91db100f`.
- Base experimental aprovada R07-002: `e04bb4059282197a0ce98e10d1715379433b5084`.
- **Código final testado:** `a35b6749f1918af87b75bffa7000832c559b9736` — candidato + uma correção objetiva (`fix(r07-003): keep active return link across replacement lineage`, apenas `interface_gpt/assets/{app.js,warranty-ui.js,warranty.js}`).
- Referência funcional imutável: `8c256cae4ddaeefad68922abddbb8addfe37c99d`; `git ls-remote origin refs/heads/v5-trifase` = `8c256cae…` (intacta).
- Branch exclusiva: `interface-gpt`. `git diff --name-only 8c256cae..HEAD -- . ':(exclude)interface_gpt'` vazio.
- Evidências: `interface_gpt/reviews/deepseek/R07-003/` (este relatório, `RESUMO.md`, `INDICE.md`, `MATRIZ-F04.md`, `AUDITORIA-INDEPENDENTE.md`, `proveniencia.json`, `testes/`, `capturas/`, `impressos/`).

## Escopo executado

1. HEAD/candidato/diff/hashes provados; 14 suítes Node do GPT (306) e regressões R02–R07-002 reexecutadas no código final.
2. Confronto estático do original: `Trifase_garantia_model.php::trocar/disponivel/avaliacaoExigida/financeiroHash/transacao`, `trifase_garantia_helper.php` (linhagem, substituída, entrega, resolução), `Trifase_retorno_model.php::referencia/criar/ativoDaUnidade`, `Trifase_equipamento_model.php`, `Trifase_estoque_model.php::movimentar`, `Trifase_retornos.php::trocar` e `TrifaseGarantiaOperacoesTest.php`.
3. Laboratório de navegador real: troca externa e de estoque, negativos isolados, duas abas, linhagem, retorno posterior, segunda troca, IDs coincidentes, raízes independentes, entrega/impressão/portal, bloqueios e ressalvas R07-002.
4. Modal/condicionais/teclado/foco/axe em 320/390/768/1440, textos extremos, impressão A4/cupom/recibo e portal real.
5. Mutação proporcional (26 mutantes novos + 65 mutantes de regressão R06/R07-001/R07-002), sem publicar mutantes.
6. Revisão adversarial independente DeepSeek Flash em contexto novo e somente leitura, seguida de reauditoria (ver `AUDITORIA-INDEPENDENTE.md`).

## Resultados

**1.281 checagens funcionais executadas no código final: 1.276 PASS, 0 FAIL, 5 INFO.**
**91 mutantes: 90 detectados, 1 equivalente justificado, 0 sobreviventes, 0 inconclusivos.**

| Suíte | Total | PASS | FAIL | INFO |
| --- | ---: | ---: | ---: | ---: |
| 14 suítes Node do GPT | 306 | 306 | 0 | 0 |
| R07-003 domínio (`r07-003-domain.cjs`) | 33 | 33 | 0 | 0 |
| R07-003 navegador real (`r07-003-browser.cjs`) | 59 | 59 | 0 | 0 |
| R07-003 bordas/axe/teclado (`r07-003-edge.cjs`) | 30 | 30 | 0 | 0 |
| R07-003 impressão (`r07-003-print.cjs`) | 5 | 5 | 0 | 0 |
| R07-003 capturas (`r07-003-capture.cjs`) | 2 | 2 | 0 | 0 (20 PNG) |
| R07-002 domínio | 31 | 30 | 0 | 1 |
| R07-002 negativos isolados | 38 | 38 | 0 | 0 |
| R07-002 navegador real | 74 | 74 | 0 | 0 |
| R07-002 bordas/axe | 32 | 32 | 0 | 0 |
| R07-002 impressão | 8 | 8 | 0 | 0 |
| R07-001 navegador real | 65 | 65 | 0 | 0 |
| R07-001 negativos isolados | 54 | 54 | 0 | 0 |
| R07-001 bordas/axe | 56 | 56 | 0 | 0 |
| R07-001 impressão | 6 | 6 | 0 | 0 |
| R07-001 handler (solução pendente) | 1 | 1 | 0 | 0 |
| R06-002 handler real | 16 | 16 | 0 | 0 |
| R06-002 negativos | 15 | 15 | 0 | 0 |
| R06-002 navegador | 103 | 102 | 0 | 1 |
| R06-002 bordas | 25 | 25 | 0 | 0 |
| R06-002 axe/teclado | 23 | 23 | 0 | 0 (21 varreduras) |
| R06-002 impressão | 9 | 8 | 0 | 1 |
| R02 / R03 / R04 / R05 | 37 / 118 / 61 / 74 | 37 / 116 / 61 / 74 | 0 | 0 / 2 / 0 / 0 |

A tabela soma **1.281 checagens** (1.276 PASS + 5 INFO). Mutações, à parte:

| Mutação | Total | Detectadas | Equivalentes | Sobreviventes | Inconclusivas |
| --- | ---: | ---: | ---: | ---: | ---: |
| R07-003 (`r07-003-mutacoes.cjs`) | 26 | 26 (24 no alvo + 2 por outro teste) | 0 | 0 | 0 |
| R07-002 (`r07-002-mutacoes.cjs`) | 26 | 26 | 0 | 0 | 0 |
| R07-001 (`r07-mutacoes.cjs`) | 21 | 20 | 1 | 0 | 0 |
| R06-002 (`r06-002/mutacoes.cjs`) | 18 | 18 | 0 | 0 | 0 |
| **Total** | **91** | **90** | **1** | **0** | **0** |

Nenhum mutante foi publicado; cópias apenas em `~/.hermes/cache/scratch/`. A classificação "fora do alvo" das duas mutações R07-003 indica que a falha foi detectada por um teste irmão da mesma guarda, não que a mutação sobreviveu.

## O que ficou provado

### Troca física e estoque fictício

- **Externa:** #018 avaliado como `troca` cria a substituta (unidade nova), preserva a entrada original, o prazo, a conclusão e o financeiro da origem; **não** move estoque, **não** cria cobrança no retorno e grava uma única operação `troca` com custo privado (R07-003-B01/B10, D01).
- **Estoque:** baixa **exatamente 1** unidade do produto escolhido, captura o custo do produto (ou `null` quando desconhecido), grava `troca_saida` com `returnId`/`operationId`, não altera outro produto e não cobra (R07-003-B18/B19, D02/D03/D27).
- **Estoque insuficiente/inexistente:** `P0`, SKU desconhecido e quantidade fracionária são recusados com “Produto inexistente ou sem estoque disponível.”, sem baixa (D03; R07-003-B18).
- **Custo externo:** conhecido, zero e ausente são aceitos; negativo, fracionário e acima do teto são recusados (D04/D24; R07-003-B06).
- **Identidade:** selo, série ou IMEI obrigatório; selo normalizado (`maiúsculas` + remoção de espaços) não pode repetir a unidade original nem substitutas anteriores (D05/D06; R07-003-B04/B08).
- **Negativos isolados:** origem/destino, marca/modelo/tipo/motivo, destino inválido, confirmação, avaliação obsoleta, solução incorreta, cobrança própria, entrega, conclusão, publicação ativa e outro atendimento aberto recusam com motivo específico e estado intacto (D07–D09; R07-003-B03–B09/B31–B35).

### Linhagem e continuidade da garantia

- A unidade antiga mantém a identificação original **byte a byte**; `physical(retorno)` passa a ser a substituta; `currentUnit` percorre a cadeia; `lineage` só aceita a mesma raiz (D11/D12/D32; R07-003-B41/B42).
- **Reuso da unidade antiga** é bloqueado na referência, na criação e no handler direto (“Unidade substituída. Utilize o atendimento da substituta.”); a URL `#retorno/16` redireciona para o atendimento da substituta (D10; R07-003-B13/B39).
- **Retorno posterior:** `#016 → #018 (troca) → #retorno da substituta`; a nova OS herda raiz, atendimento anterior, prazo e conclusão da raiz, com `warrantyDays=0` e sem reiniciar o prazo (R07-003-B25/B26; D14).
- **Segunda troca em sequência:** unidade 102 → 103, mantendo raiz e `previous`; retorno da segunda substituta usa a unidade 103 (R07-003-B44/B45; D25/D26).
- **IDs coincidentes:** OS #101 com unidade 101, retorno #102 com unidade 102; `lastFinalized` e `reference` continuam corretos (R07-003-B41/B42; D12).
- **Raízes independentes da mesma unidade:** prazos 90/180 não se misturam; `lastFinalized` é filtrado por raiz e unidade física (D13/D33; R07-003-B47).
- **Substituta na entrega e impressão:** o modal de entrega pré-preenche “Substituta em garantia · … · Selo …”; A4/cupom mostram a substituta; a origem preserva a identificação original e os totais 500/200/300 (R07-003-B15/B14; R07P3-01..03).
- **Portal:** somente marca/modelo da substituta; sem selo, motivo, custo, `returnId`/`ledgerId` (R07-003-B16; R07E3-P-01; D21).

### Interações e bloqueios

- Troca executada bloqueia revisão de avaliação, nova troca, reembolso e cancelamento; a conclusão só é permitida depois da execução (D16–D18; R07-003-B38).
- Reembolso ativo é incompatível com troca; após correção legítima e revisão da avaliação, a troca volta a ser possível quando o original admite (D18).
- Publicação ativa bloqueia a troca e a retirada libera; a cobrança e o orçamento da origem permanecem preservados; a troca não cria nova dívida (R07-003-B34; D08).
- Duas abas: envio obsoleto é abortado com “Dados alterados em outra aba”, uma única troca gravada (R07-003-B36/B37).
- Atomicidade **observável no navegador**: falhas de validação deixam `db.orders`, `db.stock` e `localStorage` sem alteração; não há alegação de transação de servidor (todos os negativos; D19).

### Ressalvas R07-002 corrigidas/verificadas

- **Retorno cancelado:** Financeiro/Admin consultam o histórico de devolução corrigida sem botão de nova devolução/correção; Técnico/Atendente não veem valores nem motivo (R07-003-B48–B50; D23).
- **Prévia decimal:** 3 casas, vazio e extremos não indicam acerto válido; 2 casas indicam; o handler recusa 3 casas e não altera ledger/estado (R07-003-B51/B52).
- **Operações legadas sem array:** falha não inicializa `operations`; sucesso inicializa (R07-003-B53; D19).
- **Vínculos de evento/ledger:** IDs de operação e ledger continuam distintos e referenciados (D20).

### Permissões (F04)

- Matriz publicada em `MATRIZ-F04.md`, ampliada para `vProduto + trocarGarantia` e `vCustoInterno + eCustoInterno` no custo externo.
- Admin executa e vê custo; Financeiro/Técnico/Atendente consultam sem custo e não executam, nem por handler direto (R07-003-B55-*, B56; R07E3-P-03).
- Nenhuma permissão foi ampliada; a simulação não presume direitos pelo nome do perfil.

## Correção de produto nesta rodada

**`a35b6749f1918af87b75bffa7000832c559b9736` — vínculo do retorno ativo após a troca.**

- **Defeito:** `active(o)` comparava a unidade **armazenada** (`unit(x)`); depois da troca, o retorno em andamento continuava com a unidade antiga e a origem #016 não o encontrava. Como `reference(#016)` passa a recusar a unidade substituída, o painel e `#retorno/16` exibiam “Retorno indisponível” em vez de apontar para #018.
- **Correção:** `active()` compara a unidade física (`physical(x).unit`) e exclui o próprio registro; `warrantyReturnLink()` consulta o retorno ativo antes da referência; `newOrder()` mostra “Retorno em andamento” antes de validar a referência.
- **Cobertura:** R07-003-B12, B13, B23 e D11; a regressão R07-002 (74), R07-001 (65+54+56+6) e R06 (103+25+23+9+15+16) permaneceu verde.
- **Escopo:** item 5 da tarefa (“link da origem enquanto substituta ainda não concluída e existência de retorno ativo, sem criar outro”).

## Adaptações de teste (nenhuma asserção enfraquecida)

- `r07-browser.cjs` (regressão R07-001, S3-10b): a lista “unidade existente” agora deduplica por unidade física; o teste escolhe a opção cuja `physical().unit` é 16 (a OS legada #018, sem `unit`, representa a mesma unidade da raiz) em vez do id fixo `16`. A asserção (OS ativa da mesma unidade não oferece retorno) não mudou.
- `r07-002-mutacoes.cjs` R07M2-20: o anchor passou de `x.origin===(o.origin||o.id)` para `x.origin===rootId(o)&&…physical/currentUnit`; continua mirando o mesmo filtro de raiz de `lastFinalized`.
- `r07-mutacoes.cjs` R07M-03/R07M-21: anchors atualizados para `o.client===root.client&&lineage(root,p.unit,orders)` e `physical(x).unit===currentUnit(...)&&x.status==='Finalizado'`; mesmas guardas, detectadas.
- `r06-002/lib.cjs`: apenas `OUT` ajustado para gravar a regressão em `R07-003/`; nenhuma asserção ou fixture alterada.
- Nenhum teste antigo foi removido; R07-002/R07-001/R06 originais permanecem em suas pastas.

## Limitações e riscos

- Protótipo estático: sem autenticação/CSRF, backend, transação, idempotência ou atomicidade de servidor; `localStorage` não é contabilidade; nenhum dinheiro real, banco ou produção.
- A baixa de estoque é fictícia e explícita de **1** unidade; catálogo, IDs estáveis, movimentos, consumo e devolução ficam para R08 (F03).
- IDs de unidade são inteiros locais; não há tabela de equipamentos/produtos nem propriedade por cliente. A comparação com o PHP é **estática**; nenhum PHPUnit/MySQL foi executado.
- Perfis são simulação conservadora; a matriz F04 é a exigência nativa, não prova de autorização real.
- Portal público é um link local fictício; não há publicação real.
- Navegador apenas Chromium headless (Playwright 1248); sem Firefox/WebKit.
- O retorno legado sem `unit` é resolvido pela origem; a tela de nova OS pode exibir a OS legada como representante da unidade física, sem reutilizar a unidade antiga após a troca.

## F01–F07 (rastreamento até R10)

| Achado | Status |
| --- | --- |
| F01 (finalização com cancelamento pendente) | Resolvido na R06-002; regressão mantida. |
| F02 (cancelamento de retorno) | Resolvido na R07-002; regressão R06/R07 mantida. |
| F03 (estoque/IDs) | Fora do escopo; R08. |
| F04 (matriz de permissões) | **Ampliada nesta rodada** (`MATRIZ-F04.md`: troca/estoque/equipamentos); integração real na R10. |
| F05 (data futura) | Resolvido/paritário na R07-002; regressão mantida. |
| F06 (mutantes sobreviventes) | 91 mutantes: 90 detectados + 1 equivalente; 0 sobreviventes. |
| F07 (dívida técnica) | Registrado; consolidação/R10. |

## Revisão independente

Ver `AUDITORIA-INDEPENDENTE.md`: DeepSeek Flash em contexto novo e somente leitura, com reprodução dos fluxos principais e procura ativa de defeitos intermodulares. Resultado: **0 bloqueantes**; ressalvas não bloqueantes registradas no arquivo e tratadas quando de evidência/teste. A aprovação final da rodada pertence ao GPT Supervisor.

## Limites de escopo cumpridos

Sem produção, backend, banco, `v5-trifase`, merge/deploy, credenciais, dados reais ou arquivos fora de `interface_gpt`; sem R08. Commit não equivale a aprovação: a aprovação final pertence ao GPT Supervisor; homologação final é humana.
