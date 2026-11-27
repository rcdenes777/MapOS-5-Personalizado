# Relatório — laboratório nativo sintético MapOS 5

Status: **operacional no host, pendente de parecer independente final**.

## Entrega

- URL: `http://127.0.0.1:18130/` (somente loopback)
- Diretório: `/home/dragonblue/workspace/mapos-r08-006-native-lab`
- Código nativo: `source/`, destacado em
  `8c256cae4ddaeefad68922abddbb8addfe37c99d`, sem alterações rastreadas.
- Runtime: `runtime/`; credenciais sintéticas em `private/` (modo `0600`).
- Runbook reproduzível: `README.md` nesta pasta.

## Versões

| Componente | Versão |
|---|---|
| PHP | 8.5.13 |
| MySQL | 8.4.11 |
| nginx | 1.31.3 (`nginx:alpine`) |
| Banco sintético | `mapos_lab_synthetic` |
| Migração | `20261124010000` |
| Tabelas | 62 |
| Usuários sintéticos | 4 |

## Isolamento verificado

- `app`, `db` e `web` estão apenas na rede interna
  `mapos-r08-006-proof-net`; a rede é `internal=true`, IPv6 desativado e
  gateway IPv4 isolado.
- Nenhum dos três contêineres tem porta Docker publicada (`ports={}`).
- Nenhum monta `/var/run/docker.sock`.
- O host acessa o laboratório somente por `127.0.0.1:18130`, via serviço de
  usuário `socat` → socket Unix `runtime/socket/web.sock` → nginx.
- O socket e o diretório do runtime têm modo privado; o serviço systemd de
  usuário está `enabled` e `active`, com `Linger=yes` para o gateway.
- O PHP e o nginx tiveram saída TCP externa bloqueada (`1.1.1.1:443`).
- O PHP não resolveu DNS externo; a CSP do nginx remove `connect-src` externo
  e o navegador não completou `fetch` para `viacep.com.br`.
- `source/` é montado somente leitura; logs, cache e storage são volumes
  separados.

## Testes executados

| Verificação | Resultado |
|---|---|
| PHPUnit nativo, ambiente limpo | **2.051 testes, 10.812 asserções**, 1 depreciação, 2 ignorados, exit 0 |
| Login dos 4 papéis | 4/4 PASS; 16 rotas de navegação verificadas |
| Permissões | técnico/atendente negados em financeiro e usuários; financeiro negado em usuários |
| Criação de OS pelo fluxo HTTP | OS criada, redirecionada e relida com o mesmo marcador |
| Estoque (rodada anterior) | saldo 6 → 7 com evento persistido |
| Cancelamento | pedido, conferência técnica e confirmação; OS persistida como `Cancelado` |
| Item de outra OS | HTTP 422, mensagem exata, estoque/itens/eventos inalterados |
| Técnico sem permissão | HTTP 403, estoque inalterado |
| Persistência | parada e nova partida dos três serviços preservaram OS, estoque, eventos e migração |
| Reset | `DROP/CREATE DATABASE` exigiu aprovação; reimportação, 62 tabelas, 4 usuários e fixtures validados |

Logs: `runtime/final-acceptance.log`,
`runtime/isolation-final.log`, `runtime/phpunit-clean-env.log`.

## Retomada: verificação do guard e dos scripts

No laboratório existente, os nove scripts (incluindo `test-guard.cjs`) foram
executados após conectar o guard: todos terminaram com exit 0. O guard checa
serviço/PID do proxy, socket privado, cabeçalho e destino do formulário antes
de preencher as credenciais; `test-guard.cjs` verifica também rejeição de
cabeçalho ausente, redirecionamento e formulário com origem indevida. Os três
negativos são simulados; não substituem a verificação do alvo vivo.
O teste HTTP e os testes granulares criaram e alteraram apenas dados sintéticos.

## Procedimentos

O runbook contém start, stop, status, reset e execução de testes. O teste
normal usa HTTP local e leitura de banco; não requer remoção de contêiner,
volume, rede ou socket. O reset do banco é a única operação destrutiva e requer
aprovação interativa; não foi contornado.

## Limitações

- A revisão independente final ainda não foi anexada.
- Start/stop não foram repetidos dentro de um tick real do cron; foram
  exercitados interativamente.
- O reset depende de aprovação; o cron não deve executá-lo sem autorização.
- As fixtures não cobrem todos os módulos (orçamento, reembolso, troca, links
  públicos e anexos).
- O PHPUnit completo exige ambiente limpo (`env -i`); com as flags do app ele
  falha por preparação, não por regressão do produto.
- O isolamento é de rede/container; a conta do proprietário e o host continuam
  sendo a fronteira de confiança.
- Não há integração de UI nem uso de produção nesta entrega.

## Estado operacional

O cron `MapOS GPT-Hermes 15m` permanece **pausado** e não foi alterado.
R08-006 não foi retomada. Nenhuma credencial ou senha é publicada nesta pasta.
