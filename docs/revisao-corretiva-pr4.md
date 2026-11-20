# Revisão corretiva — PR #4

## Escopo e segurança

- Branch existente: `feat/orcamento-canais-entrega`.
- `SOURCE_SHA`: `3564bb4cd98ed76018d591557ea2c4b6a3ff8b3a`; os oito commits anteriores são preservados, sem rebase ou amend.
- Somente clone de desenvolvimento, banco/usuários/storage sintéticos e laboratório HTTP em loopback.
- Nenhuma alteração de produção, migrations de produção, deploy ou merge.
- Migrations, regras de autorização/CSRF e concessões de permissões existentes não são modificadas.
- Decisão do proprietário registrada, mas não aplicada: futura concessão de `regularizarOrcamento` inicialmente apenas ao grupo Administrador.

## Achado A — confirmado

`publicar()` reconhecia o reenvio e validava o orçamento sob a trava da OS, mas não verificava a entrega ativa antes de criar outra versão. O painel também oferecia a ação após a entrega.

**Reprodução antes da correção:** o teste unitário publicou outra versão após entrega ativa; o formulário continuou presente. No MySQL/InnoDB, sete verificações novas falharam: publicação ganhou indevidamente mesmo quando a entrega havia obtido a trava primeiro, e a publicação também foi aceita em três status com flags ligadas/desligadas. Resultado desse ensaio RED: 22 PASS, 7 FAIL, 0 SKIP.

**Correção:** reutilizar `entregue()`/`Trifase_entrega_model::ativa()` dentro da transação já existente, depois do reconhecimento do reenvio histórico e antes das novas gravações. Não há outra trava, dependência de status técnico nem concessão de permissão. O formulário fica oculto enquanto existir entrega ativa da própria OS.

**Contratos cobertos:**

- Nova publicação após entrega é negada inclusive por POST direto com CSRF válido; versões, aprovação, estado físico, histórico, financeiro, estoque e link não mudam.
- Replay da publicação anterior confirma o ID histórico, sem duplicar nem reativar versão antiga; outros dados com a mesma chave continuam conflitantes.
- Ambas as ordens da corrida publicação × entrega são demonstradas com conexões MySQL independentes e `performance_schema.data_lock_waits`.
- Cancelamento administrativo motivado da entrega preserva os eventos e permite reavaliar a publicação pelas regras já existentes.
- `Finalizado` sem entrega continua publicável.
- Regressão de garantia exercita uma origem realmente entregue e um retorno avaliado como `novo_orcamento`: o retorno publica, recebe aprovação e formaliza sem alterar a origem. Depois da entrega do próprio retorno, nova publicação é negada e a aprovação histórica permanece.

## Achado B — confirmado

A regex incluía LF entre os controles proibidos, apesar de observação e justificativa serem `textarea`. Os testes novos com LF e CRLF atingiram a rejeição do modelo antes da correção.

**Correção:** normalizar apenas CRLF para LF antes do comprimento, do hash idempotente e da gravação; permitir LF, mantendo a rejeição de CR isolado, NUL, demais C0, DEL, C1, controles bidirecionais e UTF-8 inválido. Limites permanecem em 2000 caracteres; a justificativa mantém mínimo de cinco caracteres após `trim`.

A execução HTTP comprovou um problema diretamente relacionado: a limpeza global do CodeIgniter retirava DEL/bytes inválidos antes de chamar o modelo e podia salvar uma decisão com texto silenciosamente modificado. Apenas esses dois campos privados, nos formulários URL-encoded, passam a ser lidos pelo `input_stream` existente e validados intactos no domínio. Demais campos, autenticação, permissões e CSRF não mudam. A primeira revisão independente rejeitou o fallback inicialmente mantido para multipart: uma nova reprodução HTTP com CSRF válido confirmou que NUL era retirado e a decisão gravada. O fallback foi eliminado; outros formatos de POST, inclusive multipart, são recusados explicitamente antes de gravar. Esses formulários não enviam arquivos. Integrações manuais precisam usar `application/x-www-form-urlencoded`. Os testes negativos enviam multipart real, inclusive byte FF, para as duas rotas e os dois campos, exigindo erro explícito e invariantes SQL intactas.

O navegador também comprovou que o hook global de compressão eliminava LF de parágrafos mesmo com `whitespace-pre-wrap`. Somente os dois textos privados passaram a usar `pre` escapado, com quebra automática e fonte do sistema, conforme padrão já existente no projeto. O compressor global não foi alterado.

**Contratos cobertos:** LF/CRLF, várias linhas, limite de 2000 caracteres Unicode após normalização, replay canônico sem duplicação, rejeição de todos os C0 exceto LF, DEL/C1/bidi, tipos impróprios, UTF-8 inválido, comprimento excedido, HTML escapado e privacidade nas duas páginas públicas.

## Revisão independente

A primeira rodada bloqueou a candidata pelo fallback multipart. Após sua remoção e inclusão da reprodução HTTP, a segunda rodada retornou `passed=true`, sem preocupações de segurança ou erros lógicos concretos. O parecer registra hashes dos quatro arquivos funcionais e dos dois roteiros E2E; esses hashes são comparados ao código antes dos commits.

O revisor repetiu 81 testes focados (1.225 asserções), verificou o compressor real e relatou um probe isolado de 154 combinações de MIME/payload. Não executou E2E, MySQL ou a suíte completa; esses gates pertencem à validação do engenheiro. O parecer e os limites estão em `docs/evidence/revisao-corretiva-pr4/independent-review.json`. Não é aprovação formal do próprio PR.

## Evidências da candidata e reprodução

Ensaios da candidata durante a investigação (pré-commit; não substituem a repetição integral vinculada ao `FINAL_SHA` no fechamento do PR):

| Gate | Resultado |
|---|---|
| PHPUnit completo | 1.991 testes, 10.541 asserções; zero falhas, erros ou skips |
| MySQL 8.4.11/InnoDB | 29 casos PASS, zero falhas ou skips |
| Playwright/HTTP | 62 verificações PASS: 29 canais e 33 entrega/regularização, incluindo multipart recusado |
| JavaScript | 216 testes PASS, zero falhas ou skips |
| PHPStan | Nenhum erro; baseline não ampliado |
| PHP-CS-Fixer | Dry-run sem cache, 553 arquivos, nenhuma correção necessária |
| Escape / scripts inline | Nenhuma nova ocorrência |
| Build | PASS, assets rastreados reproduzidos sem alteração |

A suíte PHP conserva uma depreciação preexistente em `TemaCorTest` (propriedade dinâmica `$dbforge`); o baseline de depreciações não foi modificado. Avisos preexistentes do Node sobre módulos sem `type` não foram corrigidos fora do escopo.

O PHP foi executado como usuário não-root em container descartável `--network none`, com código somente para leitura. Testes de arquivos usam diretórios graváveis descartáveis, contendo apenas as proteções `.htaccess`/`index.html` versionadas: não são copiados uploads reais nem logs de instalação. Erros de preparação (diretório somente leitura ou proteção não copiada) não foram tratados como regressão do produto nem contornados alterando testes.

Para reproduzir, consultar `tests/lab/orcamento/README.md`. Gates usados:

```sh
application/vendor/bin/phpunit --do-not-cache-result
application/vendor/bin/phpstan analyse --memory-limit=1G --no-progress
application/vendor/bin/php-cs-fixer fix --config=.php-cs-fixer.php --using-cache=no --dry-run --diff
php scripts/check-escape.php
php scripts/check-inline-script.php
npm run test:js
npm run build
python3 scripts/test-orcamento-mysql.py
npm run test:e2e:orcamento
```

As evidências anteriores de F001/F002 ficam preservadas em `docs/evidence/orcamento-comunicacao/`. Os resultados corretivos e o parecer independente são separados, evitando apresentar evidência antiga como validação do SHA novo. O fechamento no PR #4 informa o `FINAL_SHA` completo, resultados da repetição final sobre árvore limpa, CI GitHub e limites do parecer independente. O autor não concede aprovação formal ao próprio PR.
