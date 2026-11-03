# Migração do Map-OS 4.x para a v5

Este guia leva uma instalação da série 4 (4.55.x, a última) para a v5. Se você está numa versão mais antiga, atualize antes para a 4.55.x.

> A v5 ainda não tem release estável. Faça a migração primeiro numa **cópia** do servidor e do banco, confira o resultado e só então repita em produção.

Resumo do que muda:

| Área | Na 4.x | Na v5 |
| --- | --- | --- |
| PHP | 8.4 ou mais novo | **8.5 ou mais novo** (`composer.json`: `^8.5`) |
| Interface | Bootstrap, jQuery, tema Matrix | Tailwind, componentes próprios, modo claro, escuro ou sistema |
| Anexos de OS e arquivos | `assets/anexos` e `assets/arquivos`, com URL pública | `STORAGE_PATH`, fora da pasta pública, servidos por controller com permissão |
| Login | só e-mail e senha | limite de tentativas, 2FA (TOTP) opcional |
| Segurança do navegador | sem política | cabeçalhos de segurança e CSP em enforce |
| API | `reGenToken`, token sem refresh, sem expiração real | `exp`, refresh token, tokens revogáveis, `reGenToken` removido, `API_ENABLED=false` desliga a API de verdade |
| OS e vendas | desconto só no total | desconto também por item |

## 1. Requisitos

- PHP >= 8.5 com as extensões `curl`, `gd`, `mysqli`, `zip`, `mbstring`, `dom`, `xml`, `zlib`, `iconv`, `json`, `openssl` e `fileinfo` (o instalador da v5 confere todas; na atualização, confira com `php -m` no PHP que o servidor web usa).
- MySQL >= 5.7 ou >= 8.0 (ou MariaDB).
- **Composer só é necessário se você instalar pelo código-fonte** (`git clone`). O zip da release (`vX.Y.Z-release.zip`) já traz o `application/vendor` instalado.
- **Node não é necessário.** Ele só serve para quem altera views, CSS ou as bibliotecas de JavaScript (veja o [CONTRIBUTING](../CONTRIBUTING.md)). O CSS e o JS compilados vão no pacote.

Confira a versão do PHP que o **servidor web** usa (não só a da linha de comando): `php -v` e a tela de informações do PHP no painel de hospedagem.

## 2. Backup

Não pule esta etapa: a migração altera tabelas e move arquivos.

1. **Banco de dados:** no painel, menu Configurações → **Backup**, ou `mysqldump` pelo terminal. Guarde o arquivo fora do servidor.
2. **Arquivos que não vêm no pacote novo:**
   - `application/.env`;
   - `assets/anexos`, `assets/arquivos`, `assets/uploads` (logo) e `assets/userImage` (fotos de perfil);
   - qualquer personalização feita em `assets/img`;
   - arquivos de `application/config` que você alterou à mão (`config.php`, `database.php`, `email.php`);
   - views, CSS ou JavaScript que você personalizou (veja [quem personalizou o painel](#quem-personalizou-views-css-ou-javascript)).
   O backup do painel é só do banco: copie também, à parte, as pastas de arquivos abaixo.
3. Anote a versão atual (rodapé do sistema) e a URL do sistema.

## 3. Passo a passo

### 3.1. Instale a v5 numa pasta nova

Em vez de sobrescrever a pasta da 4.x, prefira colocar a v5 numa pasta nova e trazer só o que é seu. A v5 **remove** muitos arquivos da 4.x (Bootstrap, jQuery, Font Awesome, tema Matrix, bibliotecas antigas), e copiar por cima deixa esses arquivos soltos no servidor.

- **Pelo zip da release:** baixe `vX.Y.Z-release.zip` na página de releases, confira o SHA256 com o arquivo `.sha256` publicado ao lado e extraia.
- **Pelo código-fonte:** clone o repositório na branch/tag desejada e rode, na raiz:

  ```bash
  composer install --no-dev
  ```

> **Não use o botão "Atualizar Mapos" da 4.x para esta migração.** Até a 4.55.4 o botão baixava o código do branch `master`, que agora é a v5 e não traz o `application/vendor`; ele só roda `composer install` se o Composer existir no servidor. A partir da 4.55.5 ele segue o branch `4.x` e não instala a v5, então atualize a 4.x para a 4.55.5 antes de migrar. Além disso, o PHP 8.5, o `.env` novo e o `STORAGE_PATH` exigem passos manuais. A atualização pelo painel da v5 é outra (veja [atualizacao.md](atualizacao.md)) e só vale a partir da v5.

### 3.2. Traga o que é seu

Copie para a pasta nova:

- `application/.env` (veja o passo 3.3);
- `assets/uploads` e `assets/userImage`;
- as personalizações de `assets/img`;
- `assets/anexos` e `assets/arquivos`, **só para que a migration os encontre** (passo 3.4). Depois da migração eles ficam vazios. **Não pule este passo:** se os arquivos não estiverem na pasta nova quando você rodar a atualização do banco, a migration conclui, mas os registros ficam sem arquivo e a OS mostra "Arquivo não encontrado" no lugar de cada anexo. Nesse caso, copie `assets/anexos` e `assets/arquivos` da 4.x para a pasta nova e refaça só essa migration: `php index.php tools migrate 20261014020000` (desfaz a `move_uploads_to_storage`) e depois `php index.php tools migrate`. Os registros órfãos mantêm o caminho antigo, então a segunda execução move os arquivos que agora existem.

### 3.3. Ajuste o `application/.env`

Compare o seu `.env` com o `application/.env.example` da v5 e acrescente o que falta. As variáveis novas são:

| Variável | Para que serve | Padrão |
| --- | --- | --- |
| `STORAGE_PATH` | Pasta dos anexos de OS e dos arquivos. **Aponte para fora da pasta pública.** | vazio: `application/storage` |
| `UPLOAD_MAX_KB` | Tamanho máximo de cada upload, em KB. | `204800` (200 MB) |
| `UPLOAD_MAX_PIXELS` | Limite de pixels (largura × altura) de uma imagem enviada, para proteger a memória ao gerar miniaturas e PDFs. | `40000000` (40 megapixels) |
| `APP_SECURITY_HEADERS` | Liga ou desliga os cabeçalhos de segurança. | `true` |
| `APP_HSTS_MAX_AGE` | Duração do HSTS (só em HTTPS). `0` desliga. | `31536000` |
| `APP_HSTS_INCLUDE_SUBDOMAINS` | Acrescenta `includeSubDomains` ao HSTS. | `false` |
| `APP_CSP` | `enforce`, `report-only` ou `off`. | `enforce` |
| `APP_CSP_REPORT` | Envia relatórios de violação ao Map-OS. | `true` |
| `APP_COOKIE_SECURE` | `auto` marca o cookie como `Secure` quando o acesso é HTTPS. | `auto` |
| `APP_COOKIE_HTTPONLY` | `true` impede que JavaScript leia o cookie da sessão. | `true` |
| `APP_SESS_REGENERATE_DESTROY` | `true` troca o id da sessão no login e apaga a antiga. | `true` |
| `APP_COOKIE_SAMESITE` | `SameSite` dos cookies. | `Lax` |
| `APP_PROXY_IPS` | IPs do proxy reverso em que o Map-OS confia para ler o `X-Forwarded-Proto`. | vazio |
| `API_REFRESH_TOKEN_EXPIRE_TIME` | Duração do refresh token da API, em segundos. | `2592000` (30 dias) |
| `API_TOKEN_EXPIRE_TIME` | Duração do access token, em segundos. O token do usuário dura no máximo 1 hora, mesmo que este valor seja maior; o token da área do cliente (sem refresh) dura o configurado. | o instalador grava `3600` (1 hora) |
| `API_CORS_ORIGINS` | Origens que podem chamar a API de um navegador. Vazio: sem CORS. | vazio |
| `API_RATE_LIMIT` | Requisições por minuto por IP na API. `0` desliga. | `300` |
| `UPDATER_PRERELEASES` | Inclui pré-releases na busca de atualização. | `false` |

Variáveis que já existiam e **mudaram de comportamento**:

- **`API_ENABLED`:** com `false`, a API deixa de existir: todas as rotas `api/v1` respondem `404`, inclusive por URL direta de controller.
- **`API_JWT_KEY`:** precisa ter **pelo menos 32 caracteres** e não pode ser o `enter_jwt_key` do `.env.example`. Em produção, com a chave vazia, curta ou igual ao exemplo, a API responde `503` até a troca (Configurações > Sistema, "Gerar uma chave nova para os tokens", ou edite o `.env`; para gerar uma, `openssl rand -hex 32`). Trocar a chave invalida todos os tokens: quem usa o app entra de novo.
- **`APP_ENCRYPTION_KEY`:** o 2FA recusa ativar com o valor do `.env.example`.
- **`API_CORS_ORIGINS`:** passa a valer também para a API do cliente (que antes respondia `Access-Control-Allow-Origin: *`).

`GLOBAL_XSS_FILTERING` não existe mais na v5 e pode ser apagada do `.env`.

> **Atenção aos valores antigos.** A 4.x gravava `APP_COOKIE_SECURE=false`, `APP_COOKIE_HTTPONLY=false` e `APP_SESS_REGENERATE_DESTROY=false`. Esses valores **continuam valendo** se você só acrescentar o que falta: os padrões novos só se aplicam a quem não define a variável (e às instalações novas). Troque-os por `auto`, `true` e `true` (ou apague as linhas). O painel mostra um aviso aos administradores enquanto o `.env` tiver os valores antigos.

Pontos de atenção:

- **`APP_ENVIRONMENT`:** em produção use `production`. O catálogo de componentes (`/index.php/componentes`) e as páginas de erro detalhadas só existem em `development`.
- **Atrás de proxy reverso** (Nginx na frente, Cloudflare, load balancer), preencha `APP_PROXY_IPS`; do contrário o sistema não percebe que o acesso é HTTPS e os cookies e o HSTS não funcionam como esperado. Detalhes em [cookies-e-sessao.md](cookies-e-sessao.md) e [cabecalhos-de-seguranca.md](cabecalhos-de-seguranca.md).
- **Não troque `APP_ENCRYPTION_KEY`.** Ela cifra os segredos do 2FA e alimenta o limite de tentativas de login.

### 3.4. Defina o `STORAGE_PATH` e rode as migrations

Defina o `STORAGE_PATH` **antes** de migrar. Crie a pasta fora da pasta pública do servidor web e dê permissão de escrita ao usuário do PHP:

```bash
sudo mkdir -p /var/mapos-storage
sudo chown www-data:www-data /var/mapos-storage
```

```
STORAGE_PATH=/var/mapos-storage
```

Depois atualize o banco, de um destes jeitos:

- **Pelo painel:** logado como administrador, menu Configurações → Sistema → **Atualizar banco de dados**.
- **Pelo terminal**, na raiz do projeto:

  ```bash
  php index.php tools migrate
  ```

  O comando funciona com `composer install --no-dev` (não precisa de pacotes de desenvolvimento) e, se falhar, escreve o erro no terminal (stderr) e sai com código diferente de zero. A tela inicial do painel avisa os administradores enquanto houver atualizações do banco pendentes. Com migrations pendentes, o painel pede para atualizar o banco antes de abrir qualquer tela: quem tem a permissão de sistema vê o botão "Atualizar banco de dados", os demais usuários veem um aviso para falar com o administrador.

Numa **instalação nova** (instalador web) você não precisa fazer isto: o instalador aplica as migrations ao final e avisa na tela se não conseguir (sem o PHP de linha de comando no servidor, por exemplo); nesse caso use um dos dois jeitos acima.

As migrations da v5, na ordem em que rodam (conferidas em `application/database/migrations`; a última da 4.x é `20240503170400_add_garantia_status_to_vendas_table`):

| Migration | O que faz |
| --- | --- |
| `add_tema_modo_destaque_to_configuracoes` e `remove_tema_destaque_from_configuracoes` | Converte o `app_theme` da 4.x no modo de cor (`app_tema_modo`: claro, escuro ou sistema). A cor de destaque deixou de existir. |
| `create_login_attempts` | Tabela do limite de tentativas de login. |
| `invalidate_plain_password_reset_tokens` | Invalida os tokens de recuperação de senha do cliente que estavam em texto claro. Quem tinha um pedido pendente precisa pedir de novo. |
| `fix_decimal_scale_of_prices` | Ajusta preços de produtos e serviços e saldo das contas para `DECIMAL(10,2)`. |
| `create_os_historico` | Histórico de status da OS. |
| `create_api_tokens` | Tabelas `api_refresh_tokens` (refresh token da API) e `api_rate_limit` (limite de requisições). |
| `create_two_factor` | Colunas e tabela do 2FA. |
| `add_tema_modo_to_usuarios` | Preferência de tema por usuário. |
| `add_tema_cor` | Cor do tema do painel (padrão laranja, azul, verde, violeta ou grafite): coluna `usuarios.tema_cor` (preferência de cada pessoa, no menu do usuário) e configuração `app_tema_cor` (cor padrão do sistema, em Configurações → Geral), que nasce `padrao`. Nada muda visualmente até alguém escolher outra cor. Se o banco ainda não tiver rodado a migration, a troca de cor só vale no navegador; rode a atualização do banco. |
| `move_uploads_to_storage` | Move `assets/anexos` e `assets/arquivos` para o `STORAGE_PATH` e grava no banco o caminho relativo. |
| `add_desconto_to_itens` | Colunas de desconto por item em OS e vendas. |
| `add_token_versao` | Coluna `token_versao` em `usuarios` e `clientes`: trocar a senha ou desativar a conta invalida os access tokens já emitidos. |
| `add_sessao_versao_to_usuarios` | Coluna `usuarios.sessao_versao`: trocar a senha derruba as outras sessões abertas do painel. |

Sobre o `move_uploads_to_storage`: ele pode rodar de novo com segurança; arquivo que não for encontrado fica como estava. Depois de migrar, confira que os anexos abrem e que `assets/anexos` e `assets/arquivos` esvaziaram. O link direto antigo (`/assets/anexos/...`) deixa de funcionar de propósito. Mais detalhes, e o rollback, em [armazenamento-de-arquivos.md](armazenamento-de-arquivos.md).

### 3.5. Configure o servidor web

A v5 foi feita para o servidor entregar **só** `index.php`, `assets/` e, até o fim da instalação, `install/`. Todo o resto (`application/`, `updates/`, `scripts/`, `tests/`, `docker/`, `docs/`, `banco.sql`, `composer.json` e demais arquivos de projeto, e qualquer arquivo que comece com `.`) só é lido pelo PHP.

- **Apache:** o `.htaccess` da raiz e o de `application/` já fazem o bloqueio, **desde que o `AllowOverride` esteja liberado** para a pasta do sistema. Sem isso o servidor ignora os `.htaccess` e o `application/.env` (senha do banco, chave de criptografia, chave dos tokens da API) fica legível pela URL.
- **Nginx, Caddy, FrankenPHP, Apache sem `.htaccess`:** é preciso aplicar as regras do guia **[servidor-web.md](servidor-web.md)**, que traz a configuração pronta de cada servidor.
- O `docker/etc/nginx/default.conf` serve ao ambiente Docker e já traz as regras.

O `application/.env` é lido de `application/` (o `index.php` não tem outro caminho configurável), então a proteção é bloquear a pasta. **Depois de configurar o servidor, e sempre que mexer nele, teste:**

```bash
curl -I https://seu-dominio/application/.env
curl -I https://seu-dominio/banco.sql
curl -I https://seu-dominio/application/logs/index.html
```

A resposta deve ser `403` ou `404`, nunca `200`. Um `200` no `.env` significa que a senha do banco e as chaves estão públicas: bloqueie o acesso imediatamente e troque a senha do banco, a `API_JWT_KEY` e os tokens dos gateways de pagamento.

O melhor complemento é apontar o `STORAGE_PATH` para fora da pasta pública ([armazenamento-de-arquivos.md](armazenamento-de-arquivos.md)): os anexos, os arquivos enviados e o `csp-violacoes.json` (em `<STORAGE_PATH>/logs/`) ficam lá.

Depois de testar o acesso, **apague a pasta `install/`** do servidor.

### 3.6. Tarefas agendadas

Os cron jobs de e-mail continuam os mesmos:

```
*/2 * * * * php /caminho/do/sistema/index.php email/process
*/5 * * * * php /caminho/do/sistema/index.php email/retry
```

### 3.7. Confira

- Login no painel e na área do cliente (`/mine`).
- Dashboard, uma OS (abrir, anexar arquivo, mudar o desconto de um item), uma venda e um lançamento.
- Impressão de OS e de um relatório em PDF.
- Console do navegador sem erros de CSP (se algo for bloqueado, veja [cabecalhos-de-seguranca.md](cabecalhos-de-seguranca.md)).
- Se usa a API: login, `refresh` e uma rota autenticada (veja abaixo).
- Em Meu perfil, a opção de ativar o 2FA ([dois-fatores.md](dois-fatores.md)).

## 4. O que muda para cada perfil

### Quem usa o sistema no dia a dia

- **Tema:** claro, escuro ou sistema, escolhido na barra do topo e gravado no perfil de cada usuário.
- **Busca global** com `Ctrl`/`⌘` + `K`, e os atalhos `F1` a `F4` para clientes, produtos, serviços e OS.
- **Login:** depois de 5 falhas para o mesmo e-mail (ou 20 do mesmo IP) o acesso é bloqueado por 1 minuto, e o tempo dobra a cada nova falha, até 1 hora.
- **2FA opcional** em Meu perfil. O administrador pode exigir o 2FA por grupo de permissão.
- **Desconto por item** na OS e na venda, em R$ ou em %, além do desconto geral. O desconto geral passa a incidir sobre o total já com os descontos dos itens.
- **Confirmação por senha:** ativar o 2FA e, na área do cliente, trocar o e-mail ou a senha pedem a senha atual.
- **OS faturada com pagamento baixado** não pode ser excluída: estorne o recebimento antes. Ao excluir uma OS faturada sem baixa, só saem os lançamentos em aberto dela.
- **E-mail da OS:** o botão "E-mail" da tela da OS envia por formulário (POST) e exige a permissão de editar OS (`eOs`). Link salvo para `os/enviar_email/<id>` não envia mais.
- **Planilhas (XLSX)** dos relatórios: texto que começa com `=`, `+`, `-` ou `@` sai com um apóstrofo na frente, para o Excel não executá-lo como fórmula.
- **Recuperação de senha do cliente:** o link vale 1 hora (eram 24) e uma só vez.
- **Exclusões** passam por uma janela de confirmação, e ações das cobranças (atualizar, enviar por e-mail, confirmar, cancelar, excluir) e a exclusão de usuário usam POST com token CSRF. Links salvos que apontavam para elas como GET deixam de funcionar.

### Quem administra o servidor

- A sessão do painel é revalidada a cada requisição: usuário desativado, excluído ou com a conta expirada perde o acesso na hora, e trocar a senha encerra as outras sessões abertas do usuário.
- Confirmações de senha (trocar a senha, gerar novos códigos do 2FA, desativar o 2FA) e o pedido de redefinição de senha têm limite de tentativas, como o login.
- **Delegação de permissões:** quem tem `cUsuario` ou `cPermissao` só cria, edita e redefine usuários e grupos com permissões que ele mesmo tem; só o administrador concede tudo. Se um gerente deixou de conseguir cadastrar alguém num grupo mais alto, é isto.
- O backup do painel não leva mais `ci_sessions`, `login_attempts` e os tokens da API e de recuperação de senha. Ao restaurar, todos entram de novo.
- O zip da release não traz `tests/`, `docker/` nem `scripts/`. Quem usa Docker usa o código-fonte; as portas do `docker-compose.yml` escutam só em `127.0.0.1`, e o phpMyAdmin só acessa o servidor configurado.
- Imagens enviadas têm limite de pixels (`UPLOAD_MAX_PIXELS`), além do limite de tamanho.
- Rotas do painel passam pelo mapa de permissões (`application/config/permissions_map.php`): **o que não estiver mapeado é negado**. Um controller que você criou precisa de entrada nele.
- Os cabeçalhos de segurança são enviados em toda resposta, e a CSP está em `enforce`: scripts e estilos inline são bloqueados.
- Anexos e arquivos vêm do `STORAGE_PATH` e só abrem com login e permissão. O backup do painel é só do banco: inclua o `STORAGE_PATH` no seu backup de arquivos.
- O atualizador do painel usa releases com tag, verifica o SHA256 e guarda backup dos arquivos trocados ([atualizacao.md](atualizacao.md)).
- A logo do emitente e as fotos de perfil continuam em `assets/uploads` e `assets/userImage`.

### Quem personalizou views, CSS ou JavaScript

A v5 trocou a base do front-end. Customizações da 4.x **não são aproveitadas automaticamente**:

- Saíram Bootstrap, jQuery, jQuery UI, tema Matrix, Font Awesome, Boxicons, DataTables, Select2, Trumbowyg e as demais bibliotecas antigas. Plugins que dependem de jQuery não funcionam mais.
- As telas usam Tailwind v4, os tokens de `assets/src/tokens.css` e a biblioteca de componentes (`component('button', [...])`). A fonte de verdade da interface é o [`DESIGN.md`](../DESIGN.md).
- Toda tela do painel passa por `MY_Controller::layout()`. O modo legado do layout não existe mais.
- Não há `<script>` inline: o JavaScript da página fica em módulos ES em `assets/js/modules/`, e a CSP bloqueia o inline.
- Toda saída nas views passa por `e()` (`application/helpers/escape_helper.php`).
- Não existe mais cor de destaque configurável: a marca tem uma única cor de ação. A configuração `app_tema_destaque` foi removida, e `app_theme` só é lida para converter o tema antigo no modo de cor.
- As impressões e os PDFs usam `assets/dist/imprimir.css` e `assets/dist/pdf.css`.
- Para alterar CSS ou views e gerar o resultado, é preciso Node >= 22 e `npm ci && npm run build`. Veja o [CONTRIBUTING](../CONTRIBUTING.md#front-end).

Se você mantém um fork, o caminho mais seguro é reaplicar suas mudanças sobre as telas novas, e não tentar mesclar as views antigas.

### Quem usa a API (`/api/v1`)

Detalhes completos em [api-autenticacao.md](api-autenticacao.md). **Quem tem app móvel deve rever os pontos abaixo antes de atualizar o servidor:**

- **`API_ENABLED=false` desliga a API de verdade:** todas as rotas respondem `404`, inclusive por URL direta de controller. Na 4.x ela continuava acessível pelo roteamento padrão.
- **Chave:** com `API_JWT_KEY` vazia, com menos de 32 caracteres ou igual ao `.env.example`, a API responde `503` em produção.
- **Login:** a resposta ganha `refresh_token`, `token_type` e `expires_in`. O access token passa a ter a claim `exp`; o do usuário dura no máximo 1 hora. Tokens da 4.x (sem `exp`) valem até vencer pelo `API_TIME`.
- **Renovação:** `POST /api/v1/refresh` (refresh token de uso único) e `POST /api/v1/logout`. **`GET /api/v1/reGenToken` foi removida** e responde `404`: o app precisa renovar pelo refresh token ou fazer login de novo.
- **Tokens revogáveis:** trocar a senha, desativar a conta ou fazer logout invalida na hora os access tokens já emitidos (`403`). Depois de trocar a própria senha pela API, o app precisa entrar de novo.
- **2FA:** quem ativou o 2FA precisa enviar o campo `totp` no login. O app móvel atual não envia, então esses usuários só devem ligar o 2FA depois que o app for atualizado ([dois-fatores.md](dois-fatores.md)).
- **`PUT /api/v1/usuarios/{id}` no próprio usuário:** só grava os campos de perfil e **ignora** `permissoes_id`, `situacao` e `dataExpiracao`. Trocar a própria senha exige `senha_atual` (sem ela, `403`), a nova senha tem no mínimo 8 caracteres, a senha é sempre gravada com hash e o e-mail não pode repetir. `situacao` e `permissoes_id` só são obrigatórios ao editar *outro* usuário (que exige a permissão `cUsuario`). O super admin não pode ser desativado nem sair do grupo Administrador.
- **Usuários pela API seguem a regra de delegação do painel (#2879):** quem tem `cUsuario` e não é administrador só cria, edita ou exclui usuários, e só atribui grupos, com permissões que o próprio grupo dele tem (`403` fora disso). Só o usuário principal altera os dados do usuário principal, e `DELETE` recusa usuário com OS, vendas, lançamentos ou garantias (desative-o). `POST` exige um `permissoes_id` de grupo ativo.
- **Respostas sem senha:** o hash da senha não aparece mais nas respostas de clientes, usuários e OS. Um app que lia esse campo deixa de recebê-lo.
- **Anexos de OS:** a resposta deixa de trazer o caminho do arquivo e passa a trazer `url` e `thumb_url`, que **exigem o token**. O arquivo é baixado por `GET api/v1/os/<os>/anexos/<id>` (`?miniatura=1` para a miniatura) e, para o cliente, `GET api/v1/client/os/<os>/anexos/<id>`. Detalhes em [armazenamento-de-arquivos.md](armazenamento-de-arquivos.md).
- **OS pela API:** o item (produto, serviço) e a anotação precisam pertencer à OS da URL (`404` se não); OS faturada ou cancelada só é editada com `control_editos` ligado (`403`); o desconto é calculado no servidor e preço e quantidade são validados.
- **Limite de requisições:** `API_RATE_LIMIT` (300 por minuto por IP). Acima disso, `429` com `Retry-After`. O login também tem limite de tentativas, como o painel.
- **CORS:** só com `API_CORS_ORIGINS` preenchido, vale para a API de usuários e para a do cliente. App Android/iOS não precisa.

## 5. Rollback

A forma mais segura de voltar é **restaurar o backup**: o banco e os arquivos da pasta antiga. Mantenha a pasta da 4.x intacta até ter certeza de que a v5 está estável.

Se precisar voltar só o banco e manter a v5 instalada, cada migration tem `down()`, e o comando de versão desfaz as posteriores. A última migration da 4.x é `20240503170400`:

```bash
php index.php tools migrate 20240503170400
```

Isso desfaz as migrations da v5 (menos a de escala decimal dos preços, `fix_decimal_scale_of_prices`, que permanece em `DECIMAL(10,2)` de propósito). Faça backup antes, porque colunas e tabelas novas (2FA, tokens, histórico da OS, desconto por item) são removidas com os dados que tinham.

Isso inclui as colunas `token_versao` e `usuarios.sessao_versao`.

Para voltar **só** os anexos para `assets/`, desfaça apenas a migration `move_uploads_to_storage`, como descrito em [armazenamento-de-arquivos.md](armazenamento-de-arquivos.md#rollback). Com a v5 em uma pasta nova, esse `down` devolve os arquivos para a pasta da v5, e não para a da 4.x: copie `assets/anexos` e `assets/arquivos` de volta e restaure o dump do banco (apagando e recriando o banco antes, para não sobrarem tabelas da v5).

Depois do rollback do banco, volte também os arquivos da 4.x, o `.env` anterior e, se mudou o PHP, a versão que a 4.x usava.

## 6. Problemas comuns

| Sintoma | Causa provável |
| --- | --- |
| Tela branca ou erro 500 logo após trocar os arquivos | PHP < 8.5 no servidor web, ou `application/vendor` ausente (instalação pelo código-fonte sem `composer install --no-dev`). |
| Painel sem estilo ou sem botões | Pasta `assets/` incompleta, ou o servidor não entrega `assets/dist` e `assets/vendor`. |
| Anexos antigos não abrem, ou a atualização do banco parou na `move_uploads_to_storage` | `STORAGE_PATH` inexistente ou sem permissão de escrita. A migration para com a mensagem (e a lista de arquivos no log) e **não conclui**: corrija a permissão e rode a atualização do banco (ou `php index.php tools migrate`) de novo; o que já foi movido não se repete. Se você atualizou antes desta correção e a migration já consta como aplicada com os arquivos ainda em `assets/anexos`, desfaça só ela e refaça: `php index.php tools migrate 20261014020000` e depois `php index.php tools migrate`. Anexo sem arquivo no disco aparece como "Arquivo não encontrado"; não é erro de permissão. Detalhes em [armazenamento-de-arquivos.md](armazenamento-de-arquivos.md#migração-dos-arquivos-existentes). |
| Os anexos mostram "Arquivo não encontrado" depois de migrar | `assets/anexos` e `assets/arquivos` não foram copiados para a pasta da v5 antes da migration. Copie-as e refaça só essa migration (`php index.php tools migrate 20261014020000` e depois `php index.php tools migrate`); veja o passo 3.2. |
| `php index.php tools migrate` para em `create_login_attempts` e sai com código 8 | O dump da 4.x foi restaurado por cima de um banco que já tinha as tabelas da v5. Apague e recrie o banco (`DROP DATABASE` e `CREATE DATABASE`), restaure o dump e migre de novo. |
| O painel avisa de atualizações do banco pendentes | A instalação ou a troca de arquivos não aplicou as migrations. Use Configurações > Sistema > `Atualizar banco de dados` ou `php index.php tools migrate` (funciona com `composer install --no-dev`). Enquanto houver pendência, o limite de tentativas de login, o 2FA e o histórico da OS ficam desligados. |
| Botões e janelas não respondem; erros de CSP no console | Script inline ou biblioteca de CDN adicionada por customização. Ajuste a customização; evite desligar a CSP. |
| A API responde `404` | `API_ENABLED` está `false`. |
| A API responde `503` | `API_JWT_KEY` vazia, com menos de 32 caracteres ou igual ao `.env.example`. |
| O app móvel pede login a toda hora, ou `reGenToken` dá `404` | Esperado na v5: renove pelo refresh token (`POST /api/v1/refresh`). |
| `curl -I .../application/.env` responde `200` | O servidor ignora os `.htaccess`. Aplique as regras de [servidor-web.md](servidor-web.md) agora. |
| O 2FA de um usuário deixou de abrir | A `APP_ENCRYPTION_KEY` foi trocada. Redefina o 2FA do usuário em Usuários → editar. |

Dúvidas e problemas: [Discussions](https://github.com/RamonSilva20/mapos/discussions) ou contato@mapos.com.br. Falhas de segurança **não** vão em issue pública: veja o [SECURITY.md](../SECURITY.md).
## Extensão opcional Trifase — link público da OS

Na branch `v5-trifase`, há uma extensão adicional à versão oficial. Sua migration
`20261031000000_create_trifase_publico` cria somente `trifase_publico_links` e
`trifase_publico_anexos`; não importa links da v4 e não publica anexos existentes.
Mesmo com as tabelas presentes, o módulo nasce desabilitado. Para ativar em
ambiente isolado, configure `TRIFASE_PUBLICO_ENABLED=true` e, quando o domínio
dos clientes for diferente do painel, `TRIFASE_PUBLIC_BASEURL`.

As rotas `trifase/*` são administrativas, com vOs + eOs e POST/CSRF nas mudanças.
Miniaturas em `trifase/miniatura/<os>/<id>` exigem login e vínculo à OS.
As prévias `publico/miniatura/<token>/<id>` e `publico/imagem/<token>/<id>` usam
a mesma autorização do download e servem somente imagens raster verificadas,
sem cache. Não há migration adicional para as miniaturas.
As rotas `publico/os/<token>` e `publico/anexo/<token>/<id>` só atendem com o
módulo ligado e token vigente. Os anexos precisam de publicação explícita.
Revisar proxy, HTTPS e logs antes de qualquer acesso externo; não expor o painel
ou o armazenamento para publicar os links. Procedimento e limites completos em
[docs/trifase/LINK_PUBLICO.md](trifase/LINK_PUBLICO.md).

A ampliação das fotos do módulo Trifase usa uma janela na própria página. Copiar
junto `views/trifase/galeria.php` e os módulos `assets/js/modules/trifase/galeria.js`
e `galeria-zoom.js` ao
atualizar os arquivos. A página pública inclui o carregador da v5 com nonce por
resposta; imagens, downloads e erros continuam sem scripts. Não há nova variável
de ambiente ou migration para essa alteração.

### Trifase: anexos de até 200 MB

O limite padrão por arquivo é 204800 KB (200 MiB), configurável em
`UPLOAD_MAX_KB`. PHP deve usar `upload_max_filesize=200M` e `post_max_size=210M`;
o servidor Nginx deve aceitar `client_max_body_size 210M`. O envio completo
(incluindo todos os arquivos e o formulário) precisa caber nos 210 MiB.
Instalações com `UPLOAD_MAX_KB` explícito mantêm o valor configurado; ajuste-o
para 204800 para usar o novo limite. Reinicie/recarregue somente os serviços
da instalação que está sendo atualizada. O limite de pixels de fotos permanece.

Vídeos MP4 e WebM agora são aceitos nos anexos. Atualizar o helper de storage,
os controllers e componentes Trifase, a entrada de permissão `Trifase.video`
e as views da OS. O player usa as rotas autenticadas
`trifase/video/<os>/<anexo>` e públicas `publico/video/<token>/<anexo>`, com suporte
a Range. Caso use proxy, preservar os cabeçalhos Range e If-Range e permitir
as respostas 206/416; manter tokens fora dos logs, inclusive avisos de buffering
(`fastcgi_max_temp_file_size 0;` no Nginx/FastCGI). A CSP pública passa a admitir
`media-src 'self'`. Não expor URLs estáticas do armazenamento. Sem migration nova
ou publicação automática de vídeos; codecs incompatíveis podem exigir download.

### Trifase: link recuperável e prazo de 120 dias

Aplicar `20261031010000_persist_trifase_publico_token` após backup do banco e
dos arquivos. Ela adiciona duas colunas à tabela de links do módulo e amplia
links antigos ativos em 90 dias, sem trocar hashes ou anexos; não reativa
expirados/revogados. Novos links valem 120 dias e ficam disponíveis no painel
mesmo após sair da tela. Copiar também `libraries/Trifase_token.php`, o model,
controller e view atualizados. `APP_ENCRYPTION_KEY` deve estar configurada e
ser preservada junto ao backup privado: ela protege a cópia recuperável.
Tokens antigos cujo endereço não é conhecido continuam ativos sem cópia
recuperável; o painel explica essa situação, sem invalidá-los automaticamente.

## Configuração do link público

Em **Configurações > Link público**, usuários com `cSistema` podem ativar o
módulo e definir `TRIFASE_PUBLICO_VALIDADE_DIAS` entre 1 e 365 dias (padrão 120).
É independente da API. Desligar bloqueia o acesso público; religar permite os
links ainda válidos. Não apaga tokens nem publicações.

Alterar o padrão só afeta novos links. Na OS, **Renovar validade até…** aplica
o padrão a partir de hoje, mantendo endereço e anexos. A data proposta aparece
antes do envio e pode antecipar o vencimento se o novo padrão for menor.
A renovação exige POST, CSRF e `vOs` + `eOs`; não reativa links expirados ou
revogados. Não há nova migração para estas configurações.

### Trifase: financeiro separado do andamento

Entrega controlada para a prévia 8200, com ativação explícita por instalação:
`TRIFASE_FINANCEIRO_ENABLED=true`. O padrão continua false. Aplicar, nesta ordem,
as migrações aditivas `20261031120000_trifase_financeiro_lab`,
`20261031130000_trifase_tecnico_garantia` e `20261031140000_trifase_integridade`.
O sufixo histórico `_lab` da primeira não deve ser renomeado.

Antes: backup de arquivos, ambiente/chave e banco; restauração conferida em cópia
isolada; ensaio das migrações. Elas criam tabelas/vínculos próprios sem converter
OS antigas ou pagamentos. Interromper gravações durante a atualização e conferir
conteúdo das tabelas existentes, anexos e tokens antes de liberar a prévia.

Recebimentos e saldo têm situação independente do andamento. A edição técnica
continua disponível depois do faturamento, enquanto itens/valores ficam protegidos.
A garantia de registros geridos começa na conclusão registrada; datas do legado
não são inferidas. Conciliação antiga é individual, explícita e limitada a vínculo
pendente seguro, reutilizando o lançamento. Pagamentos antigos exigem revisão.

A permissão `estornarRecebimento` começa negada aos grupos existentes e deve ser
concedida explicitamente pelo administrador. Desativar não desfaz recebimentos nem
remove proteção de registros geridos. Não usar down destrutivo. Preservar histórico
e conciliar operações posteriores antes de restaurar um backup.

Consultar `docs/trifase/FINANCEIRO_LAB.md` para integração, permissões, evidências,
limites e pontos a revisar em atualizações upstream. Produção permanece fora desta
entrega; sem conversão em lote, reembolso bancário ou alteração do MapOS 4.55.2.


### Piloto visual Trifase (opcional)

`TRIFASE_UI_PILOTO_ENABLED=false` mantém a interface atual. Em laboratório, `true` habilita o novo resumo da OS, sem migração de dados ou ativação dos módulos financeiro/público. `?apresentacao=classica` mantém acesso à apresentação anterior. Não alterar chaves, permissões ou flags dos módulos para apenas trocar a interface. O build de assets acompanha a mudança. O piloto não registra entrega, selo, retorno ou aceite de orçamento.


## Extensão Trifase: equipamentos (opcional)

A migração `20261102010000_trifase_equipamentos` acrescenta catálogo, unidades e retratos de entrada por OS sem converter descrições antigas. Faça backup e aplique em cópia antes de ativar `TRIFASE_EQUIPAMENTOS_ENABLED=true` (defaultfalse). As rotas `trifase_equipamentos/*` exigem login/permissão: leitura com `vOs`, vínculo com `vOs+eOs` e nova OS com `aOs+vOs`. Desligar a flag não remove histórico nem permite quebrar vínculos por exclusão/transferência silenciosa. Não há migração reversa destrutiva. Ver `trifase/EQUIPAMENTOS_LAB.md`.


## Extensão Trifase: orçamento publicado (opcional)

A migração `20261102020000_trifase_orcamentos` cria versões e eventos de orçamento sem converter OS existentes. Após backup e ensaio em cópia, ative `TRIFASE_ORCAMENTOS_ENABLED=true` (defaultfalse) e conceda `publicarOrcamento` somente aos perfis que podem compartilhar preços pelo link. Consulta exige `vOs+vLancamento`; publicar/retirar também exige `eOs+publicarOrcamento`. O módulo público também deve estar ativo. Não excluir rotas do CSRF. Desligar a flag preserva histórico e bloqueio de exclusão de OS com versões. Ver `trifase/ORCAMENTOS_LAB.md`.

## Extensão Trifase: conclusão técnica (opcional)

A migração `20261102030000_trifase_atendimentos` cria referência técnica própria sem converter OS/obrigações existentes. Após backup e ensaio em cópia, `TRIFASE_ATENDIMENTOS_ENABLED=true` habilita conclusão/andamento sem cobrança, com `vOs+eOs`, POST e CSRF. Registros anteriores conservam a referência conhecida; registros próprios continuam protegidos e consultáveis com a flag desligada. Não apagar a tabela para reverter a aparência. Ver `trifase/ATENDIMENTOS_LAB.md` para regras de primeira conclusão, prazo e limitações da API.

## Extensão Trifase: retorno em garantia (opcional)

A migração `20261102040000_trifase_retornos` cria vínculos e eventos, sem reabrir OS antigas ou converter garantias. Após backup e ensaio em cópia, ative `TRIFASE_RETORNOS_ENABLED=true` junto dos módulos de equipamentos e atendimentos. Origem precisa estar concluída e ter unidade/cliente e referência de garantia conhecidos. Leitura exige `vOs`; criação também `aOs+eOs`; avaliação `eOs`; custos também `vLancamento`. Decisões não executam pagamentos, estoque ou prorrogação de prazo. Preserve as tabelas ao desligar a função. Ver `trifase/RETORNOS_LAB.md`.

### Clientes, catálogo e custos do laboratório Trifase

As migrações aditivas `20261102050000` e `20261102060000` preparam o histórico privado dos cadastros, movimentos de estoque e custos por item/serviço. Aplicar backup e migrations antes de habilitar `TRIFASE_CADASTROS_ENABLED` ou `TRIFASE_ESTOQUE_ENABLED`; ambas vêm desligadas. Não classificam clientes, reinterpretam unidades, recalculam saldos ou preenchem custos antigos automaticamente.

A ativação foi ensaiada somente no laboratório8230. Usar permissões nativas de consulta/edição por área; não conceder automaticamente por nome de cargo. Custos exigem também visualização financeira. Com estoque auditável ativo, ajustes passam pelo novo formulário e escritas de produtos/OS pela API ficam bloqueadas até adaptação equivalente; API permanece desligada no laboratório. Não apagar tabelas para desativar a interface: histórico de clientes, OS e estoque continua protegido. Consulte `trifase/CADASTROS_LAB.md` e `trifase/ESTOQUE_CUSTOS_LAB.md` para regras, limitações e recuperação coerente.

### Trifase: execução das soluções de garantia (opcional)

A migração `20261102070000` acrescenta históricos de operações, substituições físicas e devoluções. A interface fica desligada por padrão (`TRIFASE_GARANTIA_OPERACOES_ENABLED=false`). A ativação exige os módulos Trifase relacionados e concessão explícita de `trocarGarantia`/`reembolsarGarantia`; a migração não altera perfis. Devoluções registram dinheiro já devolvido fora do sistema, com abatimento da cobrança original; não fazem transferências bancárias. Registros e seus efeitos financeiros permanecem protegidos ao desligar a interface. Consulte [o guia de operações de garantia](trifase/GARANTIA_OPERACOES_LAB.md) antes de ativar; backup e conciliação são necessários para restauração, sem apagar históricos.


### Interface piloto: financeiro das OS

Com `TRIFASE_UI_PILOTO_ENABLED` e `TRIFASE_FINANCEIRO_ENABLED` já ativos, a consulta de cobrança das OS fica em **Financeiro → OS e recebimentos** (`financeiro/ordens`). A rota está no mapa de permissões e exige `vOs+vLancamento`, como o financeiro individual da OS; nenhuma permissão é concedida automaticamente. Não exige nova migração ou variável. A lista operacional mantém andamento, filas e datas; links antigos com filtros financeiros são encaminhados à nova área após as verificações de acesso. Com a interface piloto desligada, a listagem nativa permanece. Veja [a separação das áreas](trifase/SEPARACAO_OS_FINANCEIRO_LAB.md).
