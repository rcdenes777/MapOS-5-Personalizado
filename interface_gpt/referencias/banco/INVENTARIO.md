# Inventário — banco de produção MapOS 5 Personalizado

Status: referência documental manual, sem registros reais. Não é backup, não é
ambiente de produção e não autoriza retomar R08-006.

Data da coleta: 26/11/2026.

## Origem confirmada

O banco `mapos_ensaio` é o banco da pilha de produção `mapos-v5-trabalho`:

- o ingress do Cloudflare para `os.trifaseeletronica.com.br` aponta para
  `http://localhost:8110`;
- o `nginx` da pilha `mapos-v5-trabalho` publica `127.0.0.1:8110` e encaminha
  ao `php-fpm` da mesma pilha;
- o `.env` da aplicação dessa pilha contém `DB_DATABASE=mapos_ensaio`;
- o contêiner MySQL da pilha tem `MYSQL_DATABASE=mapos_ensaio`.

A outra pilha encontrada, `mapos-trabalho`, mantém o banco `mapos_trabalho`
(32 tabelas) e não é a origem do hostname público acima.

Credenciais, senhas e conteúdo de `.env` não foram copiados para este diretório.

## Versão e estrutura

| Item | Resultado |
|---|---:|
| Motor | MySQL 8.4.11 |
| Banco | `mapos_ensaio` |
| Tabelas | 62 |
| Colunas | 566 |
| Índices (nomes distintos) | 164 |
| Índices únicos (incluindo PKs) | 95 |
| Chaves estrangeiras | 74 |
| Views | 0 |
| Triggers | 0 |
| Rotinas | 0 |
| Migração registrada | `20261124010000` (única linha em `migrations`) |

A tabela `migrations` contém apenas a versão mais recente; o histórico completo
de migrações não pode ser reconstruído somente por ela. A versão acima foi
obtida de metadados, sem ler registros de negócio.

### Collations encontradas

- 28 tabelas em `utf8mb4_general_ci`;
- 30 tabelas em `utf8mb3_general_ci`;
- 4 tabelas em `utf8mb4_0900_ai_ci`.

Há risco de comparação/join entre colunas de collations diferentes; nenhuma
normalização foi feita nesta coleta.

## Tabelas

### Núcleo e operação (37)

```text
anexos, anotacoes_os, api_rate_limit, api_refresh_tokens, categorias,
ci_sessions, clientes, cobrancas, configuracoes, contas, documentos,
email_queue, emitente, equipamentos, equipamentos_os, garantias,
itens_de_vendas, lancamentos, login_attempts, logs, marcas, migrations,
os, os_financeiro, os_historico, os_recebimentos, os_revisoes_orcamento,
os_tokens_publicos, permissoes, produtos, produtos_os, resets_de_senha,
servicos, servicos_os, usuarios, usuarios_codigos_recuperacao, vendas
```

### Módulos Trifase (25)

```text
trifase_atendimentos, trifase_cadastros_eventos, trifase_cancelamentos,
trifase_entregas_estado, trifase_entregas_eventos,
trifase_equipamento_correcoes, trifase_equipamento_modelos,
trifase_equipamentos, trifase_estoque_eventos,
trifase_financeiro_eventos, trifase_financeiro_obrigacoes,
trifase_financeiro_projecoes, trifase_garantia_eventos,
trifase_garantia_operacoes, trifase_garantia_reembolsos,
trifase_garantia_retornos, trifase_garantia_trocas,
trifase_orcamento_estado, trifase_orcamento_eventos,
trifase_orcamento_versoes, trifase_os_custos, trifase_os_equipamentos,
trifase_publico_anexos, trifase_publico_links, trifase_servico_custos
```

## Relacionamentos principais

- `usuarios.permissoes_id` → `permissoes.idPermissao`;
- `os.clientes_id` → `clientes.idClientes`;
- `os.usuarios_id` → `usuarios.idUsuarios`;
- `os.lancamento` → `lancamentos.idLancamentos`;
- `produtos_os` e `servicos_os` → `os` e aos respectivos cadastros;
- `equipamentos_os` → `equipamentos` e `os`;
- `garantias.usuarios_id` → `usuarios`;
- `lancamentos` → clientes, categorias, contas, usuários e OS;
- `os_financeiro` e `os_recebimentos` → `os`;
- `trifase_equipamentos` → modelo e cliente;
- `trifase_os_equipamentos` → OS e unidade Trifase;
- `trifase_entregas_eventos` → OS; `trifase_entregas_estado` → evento e OS;
- `trifase_financeiro_obrigacoes` → OS e lançamento principal;
- `trifase_financeiro_eventos` → obrigação, lançamento e evento referenciado;
- `trifase_garantia_retornos` → OS de origem, OS anterior e unidade;
- `trifase_garantia_eventos` → retorno; `trifase_garantia_operacoes` → evento
  de avaliação e OS.

O schema contém 74 FKs no total, incluindo as relações acima e as cadeias de
estoque, custos, cancelamentos e orçamento.

## Divergências em relação ao SHA de referência

Comparação apenas de DDL com `banco.sql` no SHA
`8c256cae4ddaeefad68922abddbb8addfe37c99d`:

- baseline: 27 tabelas e 233 colunas;
- produção: 62 tabelas e 566 colunas;
- nenhuma tabela do baseline está ausente na produção;
- 35 tabelas existem somente na produção: 25 `trifase_*` e 10 tabelas
  operacionais posteriores (`api_rate_limit`, `api_refresh_tokens`, `emitente`,
  `login_attempts`, `os_financeiro`, `os_historico`, `os_recebimentos`,
  `os_revisoes_orcamento`, `os_tokens_publicos`,
  `usuarios_codigos_recuperacao`);
- tabelas comuns ganharam colunas, entre elas `clientes.token_versao`,
  `os.desconto`, `lancamentos.os_id`, descontos em itens de venda/OS,
  `permissoes.exigir_2fa` e campos de tema/2FA/sessão em `usuarios`.

Essas diferenças são compatíveis com a evolução posterior ao baseline e não
provam defeito. O histórico de migrações disponível não permite atribuir cada
diferença a uma migration específica.

## Arquivos publicados

| Arquivo | Bytes | SHA-256 |
|---|---:|---|
| `schema-producao.sql` | 57.899 | `66e0b6e4565f8447cdd974e61a41437ad3ab8aa8ff3487c4cddb6f97e69427f8` |
| `dados-laboratorio.sql` | 11.083 | `421a6a3b83cbdad5ff57ea0833fc3e353827ed0ad4c1832707e4f0593922fe5b` |

`schema-producao.sql` contém 62 `CREATE TABLE`, nenhum `INSERT`, nenhum
`REPLACE`, nenhum `LOAD DATA`, nenhum `USE`, nenhum `CREATE/DROP DATABASE`,
nenhum `CREATE USER/GRANT`, nenhum `DEFINER` e nenhum valor histórico de
`AUTO_INCREMENT`. Views, triggers e rotinas não existiam para exportar.

`dados-laboratorio.sql` contém 36 `INSERT` com dados fictícios. Não contém
`os_tokens_publicos`, `trifase_publico_links`, `api_refresh_tokens`,
`resets_de_senha` nem campos TOTP. Os campos de senha usam o marcador inválido
`LAB-ONLY-NOT-A-HASH`, não um hash: o login não funciona até gerar um hash
local. Os campos `char(64)` de integridade usam placeholders repetidos, não
hashes de credenciais.

## Validação realizada

- Coleta de produção somente leitura: consultas a `information_schema`,
  `mysqldump --no-data` e contagem de metadados.
- Importação do schema em MySQL 8.4.11 descartável: exit 0.
- Importação das fixtures no mesmo banco: exit 0.
- Resultado: 62 tabelas; 1 cliente, 2 OS, 1 produto, 3 linhas de histórico,
  1 lançamento, 1 entrega, 1 evento de garantia e 1 evento de estoque.
- `FOREIGN_KEY_CHECKS=1` ao final; os relacionamentos foram aceitos.
- Nenhum comando de escrita foi executado no banco de produção.

## Limitações

- O schema é uma fotografia; não substitui migrations nem backup.
- `AUTO_INCREMENT` históricos foram removidos de propósito.
- Não houve boot da aplicação nem teste de login, orçamento, cancelamento,
  reembolso, troca, anexos ou links públicos.
- As fixtures não cobrem as 62 tabelas; módulos sem dados incluem orçamento,
  cancelamentos, reembolsos, trocas, links públicos, anexos, API, sessões,
  configurações, documentos, vendas e cobranças.
- A tabela `migrations` não foi semeada; um laboratório que inicie a aplicação
  deve tratar a versão do schema conforme o procedimento nativo, não presumir
  que o histórico está completo.
- Collations mistas podem afetar joins e ordenações; não foram alteradas.
- Não foi feito restore em produção, por proibição explícita.

## Comandos redigidos

```text
docker exec <mysql-producao> mysql ... information_schema ...
docker exec <mysql-producao> mysqldump ... --no-data --skip-comments ...
docker exec <mysql-producao> mysql ... SELECT MIN/MAX(version) FROM migrations
docker run --rm ... mysql:8.4  # banco descartável para validar os arquivos
```
