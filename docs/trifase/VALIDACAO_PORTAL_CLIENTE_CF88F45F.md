# Validação do portal do cliente — candidato cf88f45f

**Para avaliação pelo GPT Supervisor externo; não é aprovação de merge ou implantação.** Código avaliado: `cf88f45fb0ec4aac12a74d17d717f1bba90810f8`; base da branch: `8c256cae4ddaeefad68922abddbb8addfe37c99d`. Este relatório não altera código nem capturas; o commit que o contém tem SHA distinto do código avaliado.

Continuação de `VALIDACAO_PORTAL_CLIENTE_98600544.md`. O que já estava corrigido naquela entrega — exclusão transacional, disponibilidade financeira no portal/painel/impressão, rotação e revogação de token — não foi refeito; aqui está apenas o delta e a evidência dele.

## Defeitos corrigidos neste delta

1. **Migração parcial do financeiro quebrava telas administrativas.** Com `trifase_financeiro_obrigacoes` presente e `trifase_financeiro_eventos` ausente, `Financeiro::ordens`, `Trifase_financeiro::visualizar` e `Trifase_cancelamento_model::conferencia` consultavam os eventos e terminavam em erro de banco. Reproduzido em MySQL 8.4 no laboratório: lista e tela da OS respondiam **500** no código anterior e respondem **200** e **503** controlado no candidato. A correção introduz um predicado único (`trifaseFinanceiroProjecaoDisponivel`) usado por todos os pontos de leitura; a fila de cancelamentos passou a exibir total indisponível em vez de quebrar.
2. **Cancelamento com saldo desconhecido.** Na mesma migração parcial, uma OS gerenciada pelo financeiro podia seguir sem projeção. Agora a conferência registra bloqueio explícito e o pedido é recusado até a conciliação — a restrição de negócio é preservada, não contornada.
3. **Contrato da API de exclusão mudou de 409 para 500.** A troca de implementação em `98600544` transformou conflito de negócio em erro interno. A rota voltou a responder **404** (cliente inexistente), **409** (dependência ou restrição), **403** (histórico protegido) e **401** (sem token), usando o mesmo método transacional do painel.
4. **Portal exibia "Saldo a pagar" com a projeção indisponível.** O rótulo aparecia com "—", sugerindo saldo conhecido. Passou a ser omitido quando não há projeção; a coluna e os filtros de entrega do portal e da área do cliente passaram a exigir o módulo de entregas ligado além das tabelas, como as demais telas.

## Reprovação no código anterior e aprovação no candidato

- `tests/Unit/PortalMigracaoParcialTest.php` (4 testes) e `tests/Unit/ClientesExclusaoApiTest.php` (3 testes) foram executados sobre o código anterior: **3 erros e 2 falhas** (erro de tabela ausente; 500 no lugar de 404/409). No candidato: **7 testes, 16 asserções, saída 0**.
- Ensaio HTTP de migração parcial no MySQL: no código anterior, `financeiro/ordens` e `trifase_financeiro/visualizar` respondiam **500**; no candidato, **200** e **503**, com o portal em **200** sem valores monetários; restaurada a tabela, lista e tela voltam a **200 com valores**.
- Contrato HTTP da API exercitado no laboratório com `API_ENABLED=true`: exclusão permitida **200** (cliente, OS, venda, link e token removidos), restrição **409** com registros preservados, histórico protegido **403**, inexistente **404**, sem token **401**.

## Suítes e verificações

- PHPUnit em cópia limpa do candidato: **2.083 testes, 10.949 asserções, 1 ignorado, 1 depreciação** (baseline), saída 0.
- PHPStan: sem erros. PHP-CS-Fixer sem cache: 0 arquivos a corrigir. `npm run build` sem alteração em `assets/`.
- `npm run test:js`: **216 testes**, 0 falhas.
- Navegador (Playwright) no laboratório MySQL/PHP 8.5: portal, isolamento entre clientes, anexos, permissões administrativas, renovação/revogação/expiração, exclusão atômica pela web com rollback e controle positivo, painel autenticado e filtros de entrega — **três blocos PASS**, sem alteração de interface em relação às capturas de `evidencias-portal-cliente/`, que seguem válidas.
- Concorrência: duas rotações simultâneas produzem tokens distintos com exatamente um válido; rotação concorrente com exclusão não deixa token válido após reuso do identificador.
- Reuso de identificador: exclusão remove o vínculo do cliente; reinserir o mesmo `idClientes` não reativa o token anterior (teste unitário, ensaio MySQL e ensaio concorrente).

## Revisão independente

As revisões DeepSeek anteriores (`1451fa5f`, `d2502caa`) e a reavaliação de delta até `98600544` estão registradas nos documentos próprios. **Este delta não teve revisão independente.** O Supervisor desta sessão usa o mesmo provedor e modelo da rota `review`, portanto seu julgamento não conta como aprovação independente; o aceite depende do GPT Supervisor externo. Nenhuma revisão visual nova foi solicitada: não houve mudança de interface nos estados já capturados.

## Limites e riscos remanescentes

- Não houve acesso à produção. Máscara de token em logs de proxy e observabilidade continua sendo condição operacional a validar antes de ativar o acesso público; a configuração versionada não a implementa.
- Exclusão direta em banco, importação externa ou restauração de backup pode reativar vínculos; os caminhos suportados da aplicação (painel e API) limpam o link na mesma transação.
- O 503 da tela financeira mostra a mensagem genérica de erro quando `WHOOPS_ERROR_PAGE_ENABLED=false`; a mensagem específica fica no log. O status é a evidência verificável.
- Drivers exercitados: MySQL/mysqli e SQLite. Outros drivers não foram validados. Bloqueios podem gerar deadlock sem retry automático.
- O procedimento de migração, proxy e reversão em `PORTAL_CLIENTE_PUBLICO.md` continua proposto, não autorizado. Não houve merge nem deploy.
- A rota de exclusão da API foi exercitada em laboratório com `API_ENABLED=true`; a instância padrão do laboratório mantém a API desligada.

## Recursos

Sessão contínua de aproximadamente 16 minutos. Consumo de tokens e custo não estão disponíveis no runtime; nenhuma delegação OpenAI foi usada nesta etapa. O laboratório sintético existente foi reutilizado, com dois contêineres descartáveis (código anterior e API ligada), ambos removidos ao final.
