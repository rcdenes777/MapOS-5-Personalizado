# Evidências — comunicação, entrega e regularização de orçamento

## Origem e limites

- `SOURCE_SHA`: `67d628a275a52cce90bb59c03c887d9b2163a65b`.
- Branch: `feat/orcamento-canais-entrega`, derivada de `origin/v5-trifase` em clone separado.
- HEAD remoto e candidata original conferidos; candidata original limpa e preservada.
- O laboratório antigo em 8230 estava inativo. Foi criado outro laboratório exclusivo com banco/storage sintéticos, rede interna e bind somente em loopback; código servido comparado ao checkout.
- `PRODUCTION_CHANGED: NO`; `MIGRATIONS_PRODUCTION: NO`; `DEPLOY_EXECUTED: NO`.
- MapOS 7 não foi alterado. Nenhuma sessão, configuração, credencial ou dump de produção foi copiado.

## Resultado funcional

| Gate | Resultado |
|---|---|
| F001 — telefone, WhatsApp e presencial | PASS nos cenários implementados e executados |
| F002 — entrega ativa impede decisão normal | PASS público/interno, inclusive POST direto |
| Regularização tardia | PASS com permissão específica, sem concessão automática |
| Concorrência/rollback MySQL | PASS — 21 casos, zero falhas/ignorados |
| PHPUnit completo | PASS — 1.982 testes, 9.990 asserções, zero erros/falhas/ignorados |
| JavaScript | PASS — 216 testes, zero falhas/ignorados |
| PHPStan | PASS — nenhum erro |
| PHP-CS-Fixer | PASS — dry-run sem alterações em 553 arquivos |
| Escape / scripts inline | PASS — nenhum acréscimo sem escape ou script inline |
| Build | PASS — `npm ci && npm run build`; estáticos reproduzidos sem diff |
| Playwright/HTTP | PASS — 27 + 26 = 53 verificações, login normal e CSRF |
| Revisão independente do conjunto | CONCLUÍDA — pareceres separados F002 e F001/regularização, sem defeito concreto; aprovação formal do PR permanece pendente |

A suíte PHP foi repetida como usuário não-root, com cache mPDF temporário isolado: o teste de permissões de pasta deixou de ser ignorado. Permanece **uma depreciação preexistente**, disparada por três testes de `TemaCorTest`, por propriedade dinâmica `$dbforge`. Foram 4.266 ocorrências ignoradas pelo baseline; ele não foi ampliado. O Node emitiu avisos preexistentes de módulos sem `type` e `localStorage` experimental; os 216 testes passaram. A instalação npm informou scripts de instalação bloqueados pela política do ambiente; build e testes executaram com sucesso sem liberá-los.

## Evidências versionadas

Na pasta `docs/evidence/orcamento-comunicacao/`:

- `verification.json`: contagens e hashes do código conferido.
- `orcamento-canais-results.json`: seis decisões pela interface, três canais × aprovação/recusa; reenvio, privacidade, CSRF, login/permissão e layout.
- `f002-results.json`: entrega e regularização pela interface; formulários ocultos; página pública integrada e avulsa; POST público 422; negação por permissão 403 via AJAX; datas e versão inválidas; conflito/duplicação; invariantes SQL finais.
- `mysql-results.json`: resumo do ensaio MySQL 8.4.11/InnoDB.
- Capturas de consulta pública e regularização, em desktop e 393 px. Não incluem senhas, cookies ou capacidades visíveis.

As evidências usam somente dados sintéticos. Arquivos privados de credenciais, `.env`, estados de login e URLs de capacidade não foram versionados. Os detalhes SQL locais confirmam uma decisão por versão, vínculo com a entrega, operador e datas reais, sem alteração de OS/histórico técnico, entrega, financeiro ou estoque pela regularização.

## Concorrência real

O runner cria MySQL novo sem rede externa ou portas publicadas, e processos PHP com conexões mysqli independentes. A ordem é demonstrada por `performance_schema.data_lock_waits`; os sleeps apenas consultam a barreira.

Casos executados:

- Aprovar/recusar × entregar, ambos os sentidos, canais interno e público.
- Revalidação do token público sob trava para aprovação e recusa.
- Aprovar × aprovar; aprovar × recusar.
- Reenvio e chave conflitante; resposta pública bloqueada após entrega e ACK de decisão anterior.
- Rollback após criar evento quando falha OS ou histórico técnico.
- Entrega × correção, ambas as ordens.
- Regularização × regularização, reenvio e rollback de persistência parcial.
- Migrations reaplicadas, preservação do legado, índices únicos, FKs e InnoDB.

O estado final é lido no banco depois de cada caso. O runner verificou a remoção de seus próprios containers, volume e arquivo privado, sem atingir recursos existentes.

## Reproduzir

Preparação e requisitos: `tests/lab/orcamento/README.md`. As fixtures recusam outro banco/hostname e o preparador não cria credenciais dentro do repositório.

```sh
# Suíte PHP pelo PHP 8.5 com dependências do composer.lock:
application/vendor/bin/phpunit
application/vendor/bin/phpstan analyse --memory-limit=1G
application/vendor/bin/php-cs-fixer fix --config=.php-cs-fixer.php --dry-run --diff
npm ci
npm run test:js
npm run build
python3 scripts/test-orcamento-mysql.py
npm run test:e2e:orcamento
```

No ambiente desta missão o PHP foi executado em `mapos5-preview-php`; o runner MySQL usa essa imagem e `mysql:8.4` locais com `--pull=never`. O laboratório HTTP é servido por `mapos5-orcamento-lab-php`, nunca pelo container de produção.

Para repetir toda a suíte sem root, montar um diretório gravável novo em `/app/assets/uploads/temp`, definir `TMPDIR` e o cache/JUnit em outro diretório de evidências gravável, usando `docker run --user "$(id -u):$(id -g)" --network none`. Não mudar permissões de uma instalação real para testar.

## Decisão administrativa pendente

A permissão `regularizarOrcamento` não é concedida a nenhum grupo pelas migrations. Recomendação: concessão apenas ao grupo administrativo designado expressamente pelo proprietário; não incluir Financeiro ou Técnico automaticamente. Essa decisão e qualquer ativação em produção ficam para outra missão autorizada.

Os formulários têm precisão de minuto. Comunicação no mesmo minuto da criação da versão/retirada é admitida conforme a regra documentada; não é prova da ordem dos fatos. A interface identifica a informação como declarada pela equipe, registra o horário atual e exige justificativa. Nenhum evento foi retroagido para acelerar os testes.

O trabalho não constitui autorização de implantação nem aceite do próprio autor. SHA final, commits e PR são informados no fechamento da entrega.
