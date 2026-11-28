# Validação do portal do cliente — candidato 68dcc933

**Para avaliação pelo GPT Supervisor externo; não é aprovação de merge ou implantação.** Código avaliado: `68dcc933a42db1e506cbdddedd015123fa77f0d5`; base da branch: `8c256cae4ddaeefad68922abddbb8addfe37c99d`. Este relatório não altera código nem capturas; o commit que o contém tem SHA distinto do código avaliado.

Continuação de `VALIDACAO_PORTAL_CLIENTE_98600544.md` e de `VALIDACAO_PORTAL_CLIENTE_CF88F45F.md`. O que já estava corrigido nessas entregas — exclusão transacional, disponibilidade financeira no portal/painel/impressão, rotação e revogação de token — não foi refeito.

## Defeitos corrigidos

1. **Migração parcial do financeiro quebrava telas administrativas.** Com `trifase_financeiro_obrigacoes` presente e `trifase_financeiro_eventos` ausente, `Financeiro::ordens`, `Trifase_financeiro::visualizar` e `Trifase_cancelamento_model::conferencia` consultavam os eventos e terminavam em erro de banco. Reproduzido em MySQL 8.4: lista e tela da OS respondiam **500** no código anterior e respondem **200** e **503** controlado no candidato. A correção introduz um predicado único (`trifaseFinanceiroProjecaoDisponivel`) usado por todos os pontos de leitura.
2. **Cancelamento com saldo desconhecido.** Na mesma migração parcial, uma OS gerenciada pelo financeiro podia seguir sem projeção. Agora a conferência registra bloqueio explícito e o pedido é recusado até a conciliação — a restrição de negócio é preservada.
3. **Contrato da API de exclusão mudou de 409 para 500 em `98600544`.** A rota voltou a responder **404** (cliente inexistente), **409** (dependência ou restrição), **403** (histórico protegido) e **401** (sem token), com o mesmo método transacional do painel.
4. **Valores desconhecidos apresentados como conhecidos** (achado F01 da primeira rodada de revisão externa): a listagem financeira usava a soma nativa dos itens como "Total cobrado" sem projeção, e a fila de cancelamentos virava "Não faturada" e R$ 0,00. Agora ambos mostram "Indisponível"; com projeção disponível o comportamento é o mesmo de antes, inclusive para OS sem obrigação. No portal, o rótulo "Saldo a pagar" deixa de aparecer sem projeção, e a coluna e os filtros de entrega passaram a exigir o módulo ligado além das tabelas.

## Reprovação no código anterior e aprovação no candidato

- `tests/Unit/PortalMigracaoParcialTest.php` (4 testes) e `tests/Unit/ClientesExclusaoApiTest.php` (3 testes) sobre o código anterior: **3 erros e 2 falhas** (tabela ausente; 500 no lugar de 404/409). No candidato: **7 testes, 16 asserções, saída 0**.
- Os dois testes de apresentação em `TrifaseOsListagemViewTest` (F01) **falham** contra o view anterior e passam no candidato.
- Ensaio HTTP de migração parcial no MySQL: no código anterior, `financeiro/ordens` e `trifase_financeiro/visualizar` respondiam **500**; no candidato, **200** e **503**, com a coluna Total em **"Indisponível"** nas quatro primeiras linhas e o portal em **200** sem valores monetários. Restaurada a tabela, lista e tela voltam a **200 com valores** (controle positivo).
- Contrato HTTP da API exercitado com `API_ENABLED=true`: exclusão permitida **200** (cliente, OS, venda, link e token removidos), restrição **409** com registros preservados, histórico protegido **403**, inexistente **404**, sem token **401**.

## Suítes e verificações

- PHPUnit em cópia limpa: **2.084 testes, 10.956 asserções, 1 ignorado, 1 depreciação** (baseline), saída 0.
- PHPStan sem erros. PHP-CS-Fixer sem cache: 0 arquivos a corrigir. `npm run build` sem alteração em `assets/`.
- `npm run test:js`: **216 testes**, 0 falhas.
- Navegador (Playwright) no laboratório MySQL/PHP 8.5: portal, isolamento entre clientes, anexos, permissões administrativas, renovação/revogação/expiração, exclusão atômica pela web com rollback e controle positivo, painel autenticado e filtros de entrega — **três blocos PASS**. As capturas de `evidencias-portal-cliente/` continuam válidas: nenhuma tela capturada mudou de aparência nos estados registrados.
- Concorrência: duas rotações simultâneas produzem tokens distintos com exatamente um válido; rotação concorrente com exclusão não deixa token válido após reuso do identificador.
- Reuso de identificador: exclusão remove o vínculo do cliente; reinserir o mesmo `idClientes` não reativa o token anterior (teste unitário, ensaio MySQL e ensaio concorrente).

## Revisão independente

Primeira rodada externa sobre `cf88f45f`: **aceite substancial com um achado material (F01)**, corrigido aqui. As revisões DeepSeek anteriores (`1451fa5f`, `d2502caa`, delta até `98600544`) estão registradas nos documentos próprios e não valem como aceite independente — o Supervisor desta sessão usa o mesmo provedor e modelo da rota `review`. O aceite final depende da segunda rodada do GPT Supervisor externo. Nenhuma revisão visual nova foi solicitada: as telas capturadas não mudaram.

## Limites e riscos remanescentes

- Não houve acesso à produção. Máscara de token em logs de proxy e observabilidade continua sendo condição operacional a validar antes de ativar o acesso público; a configuração versionada não a implementa.
- Exclusão direta em banco, importação externa ou restauração de backup pode reativar vínculos; os caminhos suportados da aplicação (painel e API) limpam o link na mesma transação.
- O 503 da tela financeira mostra a mensagem genérica de erro quando `WHOOPS_ERROR_PAGE_ENABLED=false`; a mensagem específica fica no log. O status é a evidência verificável.
- Drivers exercitados: MySQL/mysqli e SQLite. Outros drivers não foram validados. Bloqueios podem gerar deadlock sem retry automático.
- O procedimento de migração, proxy e reversão em `PORTAL_CLIENTE_PUBLICO.md` continua proposto, não autorizado. Não houve merge nem deploy.

## Recursos

Duas rodadas de correção na mesma sessão contínua, com o laboratório sintético existente e dois contêineres descartáveis (código anterior e API ligada), ambos removidos ao final. Consumo de tokens e custo não estão disponíveis no runtime; nenhuma delegação OpenAI foi usada.
