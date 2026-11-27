# R08-005 — relatório técnico: BLOCKED

## Identidade e escopo

Tarefa `gpt-para-deepseek/R08-005.md`, publicação `08a37f8db781`, ACK `cb5564960b63323d6a930af06ab18c573d9a6b7b`. Candidato recebido `647dec727fbbc6673fa713d517476f4336fb3314`; referência funcional `8c256cae4ddaeefad68922abddbb8addfe37c99d`. A correção experimental não foi incorporada ao código: o candidato funcional entregue permanece `647dec727fbbc6673fa713d517476f4336fb3314`. A evidência do trabalho está nesta pasta; o commit que contém este relatório é o commit de evidências. Os checkpoints anteriores `d349b553`, `c59d57c0` e `54173aa0` foram publicados separadamente.

Job `fb7db49cdf80` configurado como `gpt-6.1-terra`/`openai-codex`, esforço `max`; cabeçalho desta execução identifica a mesma rota principal. A resolução estática do runtime instalado enquadra `gpt-6.1-terra` no conjunto que limita `max` a `xhigh`, seu maior nível declarado para a rota. Não foi observado o esforço efetivo de inferência; configuração e limite estático não provam capacidade efetiva do provedor. Nenhuma configuração foi alterada.

## Correção experimental — não entregue

`experimento-v4.diff` (SHA-256 `cbc2783bb4a93a5718be2c8e45f26562345ca34e97ffb4264e83c79cedfe2e30`) representa o delta. Código `cancel.js` SHA-256 `9a6159d927b92f78a76688b4680280062297d7887f8fc909c270d402979637f3`; testes `line-identity.cjs` `a995766104c8c5981aa0b8b63ce4c8e73190c074359cb70ae669fd9fb8817633`, `stock.cjs` `d25783d4f3eaecc7bd417ec9870ff0ddc53dfcebdec3cb2b740fb6a2dc00e977`, `stock-ui.cjs` `353aa12f6765d9dc233348fce8d4f56cc66dc149bfb76bbf6fbd3952a35f1b97`. Pré-validação em cópia, aplicação do delta no objeto real para preservar referências. Ensaios sintéticos mostram que rejeições antes do pedido, item legado inexistente e linha irmã inválida deixam OS e estoque inalterados, e que retorno parcial válido preserva referência e concilia estoque. A base foi RED e o experimento GREEN nas provas delimitadas. Sem prova de persistência na base nem alegação de regressão introduzida.

## Matriz de aceite

| Alegação | Evidência | Estado |
|---|---|---|
| Suítes JavaScript | `testes/node-suites-experimento-v4.json` | 18 suites exit 0 na árvore experimental; não implica cobertura integral |
| R02–R07 regressões | `CHECKPOINT-3.md`, logs e JSONs | Browser/domínio/impressão executados conforme tabela; R03/R06 tiveram primeira tentativa inválida e repetição documentadas; mutações antigas adicionais não foram todas reexecutadas |
| Identidade anterior R08-001 | `r08-mutacoes-v2.log` e `r08-mutacoes-v3.log` | Primeira execução: 21 detectadas, 1 sobrevivente, 3 inconclusivas por âncoras alteradas; retarget após alteração funcional, preservando os oráculos: 25/25 detectadas. Não apagar a execução inicial |
| Estoque e handlers | `estoque-browser-v2-resultados.json`, `stock.cjs` no experimento | 16 verificações no navegador, incluindo permissões com entrada válida, e 24 verificações de domínio; amostra não cobre todos os casos exigidos. A primeira versão de browser tinha payload incompleto no negativo de permissão; substituição v2 não enfraquece o resultado e está separada |
| Mutações F03 direcionadas | `testes/mutacoes-direcionadas-v3.json` | 12 detectadas, **1 sobrevivente**, 0 inválidas, 0 inconclusivas; execução exit 1. **Bloqueante do gate crítico**, sem prova de equivalência geral |
| Modal/acessibilidade | `estoque-browser-v2-resultados.json`, demais provas em checkpoints | Quatro larguras e axe no estoque 390px; não equivale a auditoria completa dos estados de estoque, teclado e foco. R08-001 browser de 40 foi executado no experimento v1, não na v2 |
| Revisão independente | `AUDITORIA-PRELIMINAR.md` e manifesto do revisor | DeepSeek Flash/deepseek confirmado pelo manifesto; análise adversarial preliminar, não revisão final integral nem aprovação |

### Sobrevivente M01

`stock.js` guarda `p.quantity>=d.quantity` na inclusão. Sua remoção isolada não fez `stock.cjs` falhar: em entrada válida e saldo insuficiente, a verificação posterior de saldo de `event()` também recusa. Isso é **sobrevivente**, não prova de defeito financeiro no fluxo normal nem licença para dizer equivalente. `m01-precedencia.cjs/json` demonstra que com duas falhas simultâneas (saldo insuficiente e outra linha corrompida) o erro muda de saldo insuficiente para quantidade/valor inválido, embora ambos preservem estado; essa comparação não é teste negativo isolado e não estabelece qual precedência é contratualmente correta. M13 alterou a guarda posterior de `event()` e foi detectada pelo teste de saída insuficiente; não prova sozinho toda a inclusão. Sem argumento de equivalência para o domínio completo e sem regra autorizada para precedência, o gate de mutação permanece aberto; não se inventou oráculo nem se removeu a guarda.

## Limitações e pendências

Faltam provas abrangentes para limites de quantidade/custo, alguns casos de replay e conciliação, permissões/handlers para todas as operações, portal/impressos específicos do estoque, todos os estados responsivos e teclado, cobertura de mutação exigida, R08-001 browser na versão final e revisão independente final da matriz completa. Um revisor apontou também normalização por rejeição em outros métodos de cancelamento (`request`, `withdraw`, `confer`) e exceção genérica para itens não-array; não foram corrigidos nem classificados como nova regressão. O experimento opera em objetos JSON e não é transação; formas não-JSON como arrays congelados ou `toJSON` divergente podem causar efeitos parciais.

Dados fictícios em navegador/localStorage, servidor estático de laboratório; nenhuma autenticação/segurança de servidor, backend, banco ou produção testada. Sem deploy, merge, alteração de branch produtiva, credenciais ou dados reais. F03 permanece aberta; R08-003 e R09 não iniciadas. Não houve aprovação pelo executor.
