# Laboratório isolado de orçamento

Usar somente com dados sintéticos. Não apontar estes scripts para produção. Eles recusam outro banco/hostname e a preparação recusa reutilizar containers ou sobrescrever credenciais.

## Pré-requisitos

- Docker, Python 3.9+ e Node 22+.
- Imagens locais `mysql:8.4` e `mapos5-preview-php` (PHP 8.5 com mysqli, sqlite3, mbstring e extensões exigidas pelo Composer). O runner usa `--pull=never`.
- Dependências PHP de desenvolvimento instaladas pelo `composer.lock` em `application/vendor`.
- `npm ci` e Chromium do Playwright: `npx playwright install chromium`.

## Preparação nova

Na raiz do checkout, escolha um diretório **fora** do repositório. Não copiar `.env` ou dados de instalações existentes.

```sh
export MAPOS_REPO_DIR="$PWD"
export MAPOS_LAB_DIR="$(dirname "$PWD")/mapos5-orcamento-lab"
mkdir "$MAPOS_LAB_DIR"
cp tests/lab/orcamento/{run.py,bootstrap.php,router.php,localhost_proxy.py} "$MAPOS_LAB_DIR/"
python3 "$MAPOS_LAB_DIR/run.py"
```

A rede `mapos5-orcamento-lab-net` é interna e exclusiva; banco, storage, logs e cache são novos. O checkout é montado somente leitura. As senhas aleatórias ficam em arquivos 0600 dentro do diretório de laboratório; nunca versioná-los ou divulgá-los.

Antes de importar, aguarde uma conexão TCP autenticada (o socket temporário do MySQL não comprova prontidão TCP):

```sh
docker exec mapos5-orcamento-lab-php php -r 'new mysqli(getenv("DB_HOSTNAME"),getenv("DB_USERNAME"),getenv("DB_PASSWORD"),getenv("DB_DATABASE")); echo "TCP MySQL pronto\n";'
docker exec mapos5-orcamento-lab-php php -d variables_order=EGPCS /lab/bootstrap.php schema
docker exec mapos5-orcamento-lab-php php -d variables_order=EGPCS /lab/bootstrap.php migrate
docker exec mapos5-orcamento-lab-php php -d variables_order=EGPCS /lab/bootstrap.php inspect
```

Confirme banco `mapos5_orcamento_lab`, schema `20261119020000` e tabelas de negócio vazias. Se o Docker não publicar a porta na rede `--internal`, execute em outro terminal:

```sh
python3 "$MAPOS_LAB_DIR/localhost_proxy.py"
```

O proxy só escuta `127.0.0.1:8230` e recusa uma topologia diferente da rede exclusiva. Não execute outro proxy se a porta já estiver ocupada. Confirme o formulário de login com CSRF em `http://127.0.0.1:8230/index.php/login`, antes da fixture.

```sh
docker exec mapos5-orcamento-lab-php php -d variables_order=EGPCS /lab/bootstrap.php fixture
npm run test:e2e:orcamento
```

O comando agregado executa os dois roteiros: `test:e2e:orcamento-canais` e `test:e2e:orcamento-entrega`. A segunda suíte exercita três perfis, entrega/regularização pela interface, as duas páginas públicas e os POSTs proibidos. Ela aguarda a virada real do minuto para distinguir uma comunicação não futura porém posterior à retirada; não retroage eventos para acelerar o teste.

A fixture base utiliza o caminho de geração de senha do instalador versionado. O teste cria operadores sintéticos dedicados: o Administrador de instalação não recebe automaticamente permissões das extensões. O login é normal pelo formulário; não são copiados cookies/sessões. O teste lê credenciais privadas dentro do processo e nunca as imprime.

Cada execução cria OSs/operadores sintéticos próprios, sem apagar fixtures anteriores. Consulte os JSONs `orcamento-canais-results.json` e `orcamento-canais-sql.json` e as capturas desktop/celular no diretório de laboratório. Um PASS de login não equivale a PASS dos cenários seguintes.

## Banco existente deste laboratório

Não repetir `schema` ou `fixture`. Aplicar somente migrations pendentes deste checkout com `bootstrap.php migrate`; o gate global de schema responderá 503 enquanto houver migration pendente. Nunca desabilitar esse gate para testar uma versão incompatível.

## Concorrência descartável

O runner separado `scripts/test-orcamento-mysql.py` cria seu próprio MySQL sem rede externa, sem portas publicadas e com senha aleatória; não utiliza este banco HTTP. Veja `python3 scripts/test-orcamento-mysql.py --help` para os parâmetros aceitos.

Nenhum desses comandos autoriza deploy, migration em produção, concessão de permissão a perfis reais ou remoção de containers/volumes preexistentes.
