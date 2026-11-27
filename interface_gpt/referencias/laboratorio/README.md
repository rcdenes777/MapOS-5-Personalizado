# Laboratório nativo sintético — MapOS 5

Laboratório persistente para tarefas autônomas do ciclo GPT–Hermes. Não é
produção, não contém dados reais e não altera o código nativo.

## Acesso

- **URL:** `http://127.0.0.1:18130/` — somente loopback.
- **Diretório do laboratório:** `/home/dragonblue/workspace/mapos-r08-006-native-lab`
- **Código nativo:** `source/`, checkout destacado em
  `8c256cae4ddaeefad68922abddbb8addfe37c99d`, montado somente leitura.
- **Runtime persistente:** `runtime/` (logs, cache, storage, uploads e socket).
- **Credenciais sintéticas:** `private/users.json`, modo `0600`, quatro papéis
  com senhas distintas geradas localmente. Nunca publicar esse diretório.
- **Serviço do proxy:** `mapos-native-lab-proxy.service` (systemd de usuário).

## Versões

| Componente | Versão |
|---|---|
| PHP | 8.5.13 |
| MySQL | 8.4.11 |
| nginx | imagem `nginx:alpine`, `Server: nginx/1.31.3` |
| Playwright | Chromium do ambiente de testes |

## Isolamento

- `app`, `db` e `web` usam somente a rede Docker interna
  `mapos-r08-006-proof-net` (`internal=true`, IPv6 desativado, gateway IPv4
  isolado).
- Nenhum dos três contêineres publica porta Docker nem monta o socket Docker.
- O único acesso ao host é `127.0.0.1:18130`, atendido pelo serviço de usuário
  `socat`, que encaminha para o socket Unix privado `runtime/socket/web.sock`.
- O nginx responde com `X-Mapos-Lab: synthetic-native-isolated` e uma CSP que
  remove `connect-src` externo e bloqueia frames/objetos.
- O PHP e o nginx não alcançam a internet por TCP direto; a resolução DNS
  externa do PHP também falhou no teste.
- `source/` é montado `:ro`; logs, cache, storage e uploads são volumes
  graváveis separados. O código nativo não tem alterações rastreadas.

## Inicialização e operação

Defina o caminho:

```bash
LAB=/home/dragonblue/workspace/mapos-r08-006-native-lab
P=/home/dragonblue/workspace/interface-gpt-lab/repo/interface_gpt/referencias/laboratorio
mkdir -p "$LAB"
cd "$LAB"
cp -n "$P/compose.yaml" "$P/nginx.conf" "$LAB/"
```

O laboratório atual já está inicializado. Para recriar em uma máquina nova:

```bash
# Este bloco é para um ambiente novo, não para executar sobre o laboratório atual.
cd "$LAB"
# 1. código nativo no commit de referência
git clone https://github.com/rcdenes777/MapOS-5-Personalizado.git source.new
git -C source.new checkout --detach 8c256cae4ddaeefad68922abddbb8addfe37c99d
mv source.new source

# 2. dependências PHP já instaladas no host, sem rede durante a prova
#    (o checkout de referência não versiona application/vendor)
mkdir -p vendor source/application/vendor
# preencha ./vendor com dependências correspondentes ao composer.lock do checkout
# SHA-256 de source/composer.lock: a44102ceeeb78174be102e134a621e514b8a6e9f00780240720fcc692949da0f
sha256sum source/composer.lock
# É necessário obter ./vendor previamente ou instalar as dependências do lock.
# Verificar disponibilidade das imagens antes do compose; mysql/nginx podem exigir pull.
docker image inspect mapos5-preview-php:8.5.13 >/dev/null
# A origem/build da imagem local não está documentada; reconstrução em outro host não foi validada.
# o compose monta ./vendor; source/application/vendor fica apenas como ponto de montagem vazio

# 3. diretórios persistentes, roteador local e credenciais sintéticas
mkdir -p runtime/{logs,cache,storage,anexos,arquivos,userImage,socket} private
cp "$P/router.php" "$P/initialize.php" runtime/
chmod 700 runtime runtime/socket private
python3 "$P/preparar-segredos.py"

# 4. rede interna dedicada (se ainda não existir)
docker network inspect mapos-r08-006-proof-net >/dev/null 2>&1 || \
  docker network create --internal --opt com.docker.network.bridge.gateway_mode_ipv4=isolated mapos-r08-006-proof-net

# 5. banco sintético e schema publicado
docker compose up -d --no-build db app
# aguarde o healthcheck do db e importe:
REF=/home/dragonblue/workspace/interface-gpt-lab/repo/interface_gpt/referencias/banco
docker compose exec -T db sh -ec 'export MYSQL_PWD="$MYSQL_PASSWORD"; exec mysql --default-character-set=utf8mb4 -u "$MYSQL_USER" "$MYSQL_DATABASE"' < "$REF/schema-producao.sql"
docker compose exec -T db sh -ec 'export MYSQL_PWD="$MYSQL_PASSWORD"; exec mysql --default-character-set=utf8mb4 -u "$MYSQL_USER" "$MYSQL_DATABASE"' < "$REF/dados-laboratorio.sql"

# 6. estado de migração e quatro perfis sintéticos
docker compose exec -T app php /lab/initialize.php

# 7. aplicação e proxy de loopback
docker compose up -d --no-build app web
mkdir -p "$HOME/.config/systemd/user"
install -m 0644 "$P/mapos-native-lab-proxy.service" "$HOME/.config/systemd/user/"
systemctl --user daemon-reload
systemctl --user start mapos-native-lab-proxy.service
curl -fsS http://127.0.0.1:18130/index.php/login >/dev/null
```

### Start, stop e status

```bash
cd "$LAB"
docker compose start db app web          # iniciar sem remover nada
docker compose ps                       # estado dos três serviços
systemctl --user status mapos-native-lab-proxy.service --no-pager
curl -fsS http://127.0.0.1:18130/index.php/login >/dev/null && echo OK

docker compose stop web app db          # parar; volumes e dados permanecem
```

O serviço de proxy permanece ativo e volta a funcionar quando o `web` sobe.
Persistência automática após logout/reboot é opcional e não foi testada.
Neste host a unidade está enabled e linger já estava habilitado; não foi alterado
nesta retomada. Em outro host, inicie o serviço ao entrar, se necessário.
Não é necessário remover contêiner, rede ou volume para operar o laboratório.

### Reset sintético

O reset apaga somente o banco sintético e reimporta os arquivos publicados.
Ele é uma operação destrutiva e **exige aprovação interativa** quando executado
por um agente; não use como parte de testes normais.

```bash
cd "$LAB"
docker compose exec -T db sh -ec 'export MYSQL_PWD="$MYSQL_PASSWORD"; \
  test "$MYSQL_DATABASE" = mapos_lab_synthetic && \
  mysql -u "$MYSQL_USER" -e "DROP DATABASE mapos_lab_synthetic; \
  CREATE DATABASE mapos_lab_synthetic CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;"'
REF=/home/dragonblue/workspace/interface-gpt-lab/repo/interface_gpt/referencias/banco
docker compose exec -T db sh -ec 'export MYSQL_PWD="$MYSQL_PASSWORD"; exec mysql --default-character-set=utf8mb4 -u "$MYSQL_USER" "$MYSQL_DATABASE"' < "$REF/schema-producao.sql"
docker compose exec -T db sh -ec 'export MYSQL_PWD="$MYSQL_PASSWORD"; exec mysql --default-character-set=utf8mb4 -u "$MYSQL_USER" "$MYSQL_DATABASE"' < "$REF/dados-laboratorio.sql"
docker compose exec -T app php /lab/initialize.php
```

### Testes

```bash
cd "$LAB"
# Requer Node, Playwright instalado em interface-gpt-lab/tools/node_modules,
# Chromium do Playwright, Docker Compose e o proxy ativo. Testes alteram dados
# sintéticos: OS, eventos e estoque permanecem no banco do laboratório.
node "$P/test-guard.cjs"                 # identidade real e rejeições simuladas
node "$P/test-login.cjs"                 # quatro papéis e 16 rotas
node "$P/test-denied.cjs"                # 403 sem mudança de estoque
node "$P/test-browser-isolation.cjs"     # CSP bloqueia fetch externo
node "$P/test-http-workflow.cjs"         # cria OS, entrada estoque, cancela OS

# Alternativa granular; executar em sequência, não reutilizar OS antiga:
node "$P/test-create-os.cjs"             # cria OS e registra last-test-os.txt
node "$P/test-stock.cjs"                 # baixa uma unidade do produto 1; requer estoque positivo
node "$P/test-cancel.cjs"                # solicita e confere a OS recém-criada
node "$P/test-cancel-confirm.cjs"        # confirma a mesma OS; deve vir por último

docker compose exec -T app env -i PATH=/usr/local/bin:/usr/bin:/bin HOME=/tmp \
  php application/vendor/bin/phpunit --do-not-cache-result
```

O PHPUnit precisa ser executado com ambiente limpo para não herdar as flags
Trifase do aplicativo; a suíte usa SQLite em memória e não altera o MySQL.

## Evidência atual

- **PHPUnit:** 2.051 testes, 10.812 asserções, 1 depreciação, 2 ignorados,
  exit 0, com ambiente limpo.
- **Perfis:** 4/4 logins; 4 papéis; 16 rotas de navegação verificadas.
- **Fluxo HTTP (rodada anterior):** OS sintética criada e relida; estoque 6 → 7; pedido,
  conferência técnica e confirmação de cancelamento; OS persistida como
  `Cancelado`.
- **Negativos:** tentativa de retirar item de outra OS retornou 422 com estado
  inalterado; técnico sem permissão recebeu 403 e o estoque não mudou.
- **Isolamento:** sem portas Docker publicadas; PHP e nginx com saída TCP
  externa bloqueada; DNS externo do PHP sem resolução; CSP bloqueou chamada
  `fetch` externa do navegador.
- **Persistência:** parada e nova partida dos três serviços preservaram
  estoque, OS cancelada, eventos e versão de migração.
- **Reset:** apagar e recriar o banco sintético exigiu aprovação interativa; a
  reimportação e o `initialize.php` foram validados com 62 tabelas e 4 usuários.

## Limitações

- O reset do banco requer aprovação; testes normais não o exigem.
- Start/stop foram exercitados interativamente; não foram repetidos dentro de
  um tick real do cron.
- O laboratório não executa a UI de integração nem altera o código nativo.
- A referência de banco inclui 62 tabelas; as fixtures não preenchem todos os
  módulos (orçamento, reembolso, troca, links públicos e anexos).
- O PHPUnit completo passou com ambiente limpo; o primeiro ensaio com as flags
  do aplicativo falhou e permanece registrado como falha de preparação.
- O sistema de arquivos do host e a conta do proprietário continuam sendo a
  fronteira de confiança; o isolamento é de rede/container, não uma sandbox de
  hardware.

## Publicação

Esta pasta contém somente configuração, scripts de teste e procedimentos.
`private/` não é versionado. O relatório e a revisão independente acompanham
os arquivos publicados.
