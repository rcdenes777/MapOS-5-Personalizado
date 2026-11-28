# Deploy do portal do cliente — prontidão e checklist

**Status: pronto para aceite externo, NÃO implantado.** Código aprovado: `68dcc933a42db1e506cbdddedd015123fa77f0d5`. Branch: `feature/portal-cliente-publico`. Nada foi mesclado, publicado ou aplicado em produção; nenhuma configuração de produção foi alterada.

Este documento reúne o que foi validado no laboratório sintético (MySQL 8.4, PHP 8.5, nginx) para uma ativação segura. Onde a evidência é limite, está dito.

## 1. Integridade do candidato

- `68dcc933` é ancestral de `HEAD` (`308cb22f`); os dois commits posteriores são documentação (44 linhas no relatório de validação). Nenhuma alteração de código depois do aceite.
- Aceite técnico externo registrado em `VALIDACAO_PORTAL_CLIENTE_68DCC933.md`.
- Migração nova: **uma** (`20261127010000_trifase_cliente_publico`). Nenhuma rota nova no `routes.php` — o portal usa o roteamento padrão do CodeIgniter.

## 2. Máscara de token nos logs (validada)

O token é credencial de portador no caminho da URL. Três vetores foram verificados:

| Vetor | Situação |
|---|---|
| Access log do proxy | `default.conf` versionado não define `log_format`: usa o `combined`, que loga `$request` com o token. **Precisa do bloco abaixo** |
| Error log do proxy | `log_format` não se aplica; em 502/erro de upstream o nginx grava a request line crua. Reproduzido: 1 ocorrência do token no `error_log` |
| Logs da aplicação | 404 do portal usa `show_404('', false)`: não registra a URI. Verificado com token sintético — 0 ocorrências em `application/logs` |

### Bloco de proxy validado

```nginx
map $request_uri $uri_mascarada {
    default $request_uri;
    "~^(?<prefixo>.*?)(?<token>[a-f0-9]{64})(?<sufixo>.*)$" $prefixo***$sufixo;
}

map $http_referer $referer_mascarado {
    default $http_referer;
    "~^(?<refpre>.*?)(?<reftok>[a-f0-9]{64})(?<refsuf>.*)$" $refpre***$refsuf;
}

log_format portal_mascarado '$remote_addr - $remote_user [$time_local] '
                            '"$request_method $uri_mascarada $server_protocol" '
                            '$status $body_bytes_sent "$referer_mascarado" '
                            '"$http_user_agent"';

server {
    access_log /var/log/nginx/portal-access.log portal_mascarado;
    error_log  /var/log/nginx/portal-error.log warn;

    # Token no caminho: nada deste bloco vai para o error log (request line crua).
    location ~ ^/(index\.php/)?publico(_cliente)?(/|$) {
        error_log off;
        # ... proxy_pass e cabeçalhos do bloco existente ...
    }

    # demais locations seguem inalteradas
}
```

Detalhes que custaram teste e devem ser preservados:

- A regex precisa de aspas por causa de `{64}`; sem aspas o nginx não sobe (`unexpected "{"`).
- `error_log off;` só vale dentro do `location`; fora dele, o 502 do portal vaza o token. Não cria arquivo chamado `off`.
- A rota aceita com e sem `index.php`; sem o prefixo opcional, uma instalação com URL limpa vazaria o token.

### Resultado medido

Seis requisições através de um nginx real na frente da aplicação de laboratório:

| Requisição | Status | Log |
|---|---|---|
| lista válida | 200 | `/index.php/publico_cliente/index/***` |
| detalhe de OS válida | 200 | `/index.php/publico_cliente/os/***/643` |
| anexo publicado | 200 | `/index.php/publico_cliente/anexo/***/643/148` |
| token inválido | 404 | mascarado |
| link individual de OS | 200 | `/index.php/publico/os/***` |
| mesma rota sem `index.php` | 404 | `/publico_cliente/index/***` |

- Token válido e token inválido: **0 ocorrências** em qualquer arquivo de `/var/log/nginx`.
- Referer com token também sai mascarado.
- Controle positivo: 502 em rota comum continua registrado no `error_log` — a proteção é cirúrgica, não cega o servidor.

### Observabilidade além do proxy

Se houver coletor (Fluent Bit, Vector, Filebeat) ou APM, ele lê o mesmo arquivo ou o `access` do nginx. Com o bloco acima o arquivo já está limpo; ainda assim, aplicar uma regra de substituição `[a-f0-9]{64}` → `***` no coletor como segunda barreira, e nunca habilitar captura de `$request` bruto em dashboards. O `error_log` do portal fica sem registros por desenho: o status 5xx dessas rotas continua visível no access log para alerta.

## 3. Migração e compatibilidade

Teste em MySQL 8.4 sobre a base `8c256cae` com o estado real de uma instalação (a tabela `migrations` do CodeIgniter guarda **uma** linha: ele trunca e regrava a cada migração):

1. Estado anterior: `migrations` = `20261124010000`, sem a tabela do portal.
2. `php index.php tools migrate` → `Migrations run successfully`.
3. Resultado: tabela `trifase_cliente_publico_links` criada, índices `PRIMARY (cliente_id)` e `UNIQUE trifase_cliente_token_unico (token_hash)`, `migrations` = `20261127010000`.
4. Segunda execução: sucesso, sem erro de objeto duplicado (idempotente).
5. Funcional: geração de link para cliente novo, `resolver()` devolveu o cliente, comprimento do token 64.

Cuidados operacionais:

- **Não editar a tabela `migrations` à mão.** Ela guarda uma linha só; inserir histórico retroativo faz o CI3 reexecutar migrações antigas contra um schema que já as tem (erro `Duplicate column name 'cep'`, `Duplicate key name`). Foi reproduzido.
- **`down()` destrói os vínculos.** `tools migrate 20261124010000` remove a tabela e **revoga todos os links** de cliente. Verificado: tabela some, versão volta. Reversão de código não exige isso — ver seção 5.
- Instalação incompleta (sem tabelas de entrega/financeiro): o portal degrada, não quebra. Entrega aparece como indisponível; valores financeiros ficam indisponíveis em vez de zero.

## 4. Backup e restauração

Procedimento validado no laboratório:

```bash
docker exec <db> sh -c 'exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" \
  --single-transaction --routines --triggers <database>' > pre-deploy.sql
```

- Dump gerado: 395 KB para a base com fixtures.
- Teste de desastre: `DROP TABLE trifase_cliente_publico_links` e restauração do dump → tabela recriada, **115 vínculos** restaurados, token do fixture resolvendo com **200** no portal.
- O dump restaura o estado exato, inclusive validade de token. **Depois de qualquer restauração, revogar/rotacionar todos os links antes de reabrir o acesso público**: um token que havia sido trocado depois do backup volta a valer.

## 5. Reversão

| Cenário | Ação | Efeito nos links |
|---|---|---|
| Desligar o portal | `TRIFASE_PUBLICO_ENABLED=false` e recarregar o PHP-FPM | Nenhum; links ficam inacessíveis e voltam ao religar |
| Reverter código | Redeploy do release anterior; manter a tabela | Nenhum; o código antigo ignora a tabela |
| Reverter schema | `tools migrate <versão anterior>` | **Destrói todos os links** |
| Restaurar backup | restore do dump | Vínculos voltam ao estado do dump; revogar depois |

Não há rollback de dados sem perda de links: a tabela é a própria credencial. Planeje a comunicação ao cliente antes de qualquer um dos dois últimos casos.

## 6. Flags e sequência de ativação

Flags lidas pelo portal: `TRIFASE_PUBLICO_ENABLED`, `TRIFASE_PUBLIC_BASEURL`, `TRIFASE_PUBLICO_VALIDADE_DIAS`, `TRIFASE_FINANCEIRO_ENABLED`, `TRIFASE_ENTREGAS_ENABLED`, `TRIFASE_ORCAMENTOS_ENABLED`.

Sequência segura:

1. Deploy do código com `TRIFASE_PUBLICO_ENABLED=false` (padrão). Rotas públicas respondem 404; nada exposto.
2. `php index.php tools migrate` — cria a tabela.
3. Configurar `TRIFASE_PUBLIC_BASEURL` com a origem pública **https** (sem usuário, senha, query ou fragmento) e `TRIFASE_PUBLICO_VALIDADE_DIAS` (1–365). **Antes de ligar a flag**: uma URL inválida lança `DomainException` na renderização e a tela responde 500. Verificado com `ftp://invalido`.
4. Aplicar o bloco de proxy da seção 2 e recarregar o nginx. Confirmar com uma requisição de token falso que o access log mostra `***`.
5. Ligar `TRIFASE_PUBLICO_ENABLED=true` e recarregar o PHP-FPM.
6. Smoke test com cliente sintético: gerar link pelo painel, abrir em desktop e celular, conferir OS, valores (se o financeiro estiver ligado), anexos publicados, renovar e revogar.
7. Só então emitir links reais. Nunca enviar link automaticamente.

`APP_ENCRYPTION_KEY` **não deve mudar**: ela cifra o token em repouso. Trocar a chave não invalida o acesso do visitante (a resolução usa o hash), mas impede o painel de reexibir o link existente.

## 7. Checklist de implantação

Pré-deploy
- [ ] Commit implantado é `68dcc933` (ou descendente só de documentação), verificado por `git rev-parse`.
- [ ] Backup do banco concluído e **restaurado em cópia** com sucesso (não basta gerar o arquivo).
- [ ] Janela e responsável definidos; comunicação de revogação de links pronta.
- [ ] Flags conferidas: `TRIFASE_PUBLICO_ENABLED=false` no momento do deploy.

Deploy
- [ ] Código publicado; `php index.php tools migrate` executado uma vez, com saída de sucesso.
- [ ] Tabela e índice único confirmados (`SHOW CREATE TABLE`).
- [ ] Bloco de proxy aplicado; `nginx -t` ok; nginx recarregado.
- [ ] `TRIFASE_PUBLIC_BASEURL` e validade configurados.
- [ ] Flag ligada e PHP-FPM recarregado.

Pós-deploy
- [ ] Requisição com token falso: 404 e `***` no access log.
- [ ] Smoke test completo com cliente sintético (lista, detalhe, anexo, renovação, revogação).
- [ ] Nenhum token em `application/logs`, access log, error log ou coletor.
- [ ] Link revogado continua 404 imediatamente após a revogação.
- [ ] Monitoração: alerta para 5xx nas rotas do portal e para volume anormal de 404.

## 8. Riscos residuais

- Máscara validada em nginx; se o proxy real for Apache, Traefik ou um CDN, o bloco precisa ser reescrito e revalidado — o `error_log` de cada um trata a request line de forma diferente.
- Coletor de logs não foi exercitado: a segunda barreira (regex no coletor) é recomendação, não evidência.
- Bloqueios de banco podem gerar deadlock sem retry automático.
- Drivers exercitados: MySQL/mysqli e SQLite. Outros não foram validados.
- Restauração de backup reativa tokens antigos por desenho.

## 9. Evidência de origem

- Aceite do código: `VALIDACAO_PORTAL_CLIENTE_68DCC933.md` (suíte 2.084 testes, Playwright no laboratório, contrato HTTP da API, concorrência).
- Este documento: ensaios de máscara, migração, backup/restauração e flags executados no laboratório sintético em 2026-11-28, com contêineres descartáveis removidos ao final.
