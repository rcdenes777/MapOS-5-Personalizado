# R08-006 — laboratório nativo: BLOCKED na preparação

## Escopo e proveniência

Tarefa `interface_gpt/mensagens/gpt-para-deepseek/R08-006.md`, commit `d820f6db35657bf627a26e34bdb65ca1098815b9`; controle ATIVO/R08-006 em `d1d630299c37415aea0ea214913278d67860f5a1`; ACK `3b3b444a`. Referência nativa imutável e checkout dedicado: `8c256cae4ddaeefad68922abddbb8addfe37c99d`; checkpoint do protótipo não alterado: `72da85451580c2427ba3e6dffda5f2808984ca94`. Checkout local em `/home/dragonblue/workspace/mapos-r08-006-native-lab/source`, criado por clone local sem hardlinks e em HEAD destacado; `git status --porcelain` vazio nas verificações realizadas. Nenhuma alteração funcional nativa foi feita. Estes SHAs não representam evidência de execução funcional.

## Impedimento comprovado

A execução do cron não permite, sem aprovação interativa, remover o contêiner de prova dedicado:

```text
$ docker container rm mapos-r08-006-proof-container
BLOCKED: Command flagged as dangerous (docker/podman rm (container destruction)) but cron jobs run without a user present to approve it. Find an alternative approach that avoids this command. To allow dangerous commands in cron jobs, set approvals.cron_mode: approve in config.yaml.
```

A configuração sugerida pela mensagem **não foi alterada**. Uma primeira tentativa de executar uma prova com `docker run --rm` também foi bloqueada pelo mecanismo de aprovação do cron. A tarefa exige preparação reprodutível, início/parada e reset limpo e determina BLOCKED se o mecanismo operacional impedir seu escopo autorizado, em vez de alterar configuração. A destruição especificamente do contêiner sintético criado pelo teste é necessária para comprovar limpeza e não foi autorizada pelo mecanismo disponível. Não se tentou contornar a restrição nem remover recursos existentes.

Para não deixar um laboratório parcialmente inicializado sem ciclo de limpeza comprovado, não foram criados banco, dados, credenciais ou aplicação. Sem executar o laboratório, não se afirma que a rede de prova seja suficiente para o isolamento exigido: esta é uma limitação adicional e um gate ainda aberto, não uma falha funcional nativa demonstrada.

## Inventário e provas realmente executadas

- Leitura da README, `composer.json`, CI, `docker/docker-compose.yml`, `application/config/database.php` e trechos dos dois testes MySQL do commit nativo. A README exige PHP >= 8.5 e MySQL >= 5.7/8.0 ou MariaDB; o Composer exige PHP ^8.5. CI usa PHP 8.5 e PHPUnit com SQLite; os dois scripts de integração mencionados acessam MySQL. Não se executaram essas suítes.
- Docker 29.9.3 cliente/servidor no contexto padrão; `docker info` reportou seccomp/cgroupns, sem opção rootless. Binários PHP, Composer, mysqld, mariadbd, podman, rootlesskit e slirp4netns não foram localizados no PATH do executor. Imagens locais `mysql:8.4`, `php:8.5-fpm-bookworm` e `nginx:alpine` disponíveis. Não se reutilizou serviço ou volume existente.
- Criada rede sintética dedicada `mapos-r08-006-proof-net` com `docker network create --internal --opt com.docker.network.bridge.gateway_mode_ipv4=isolated mapos-r08-006-proof-net`, ID `6d28e182ca0849cdb8a10ee79b299dfb18b9926b4bd9977d180336783849522a`. `docker network inspect` retornou `internal=true` e a opção `isolated`. A interface bridge do host não reportou endereço IP no momento da inspeção.
- `docker run --name mapos-r08-006-proof-container --network mapos-r08-006-proof-net --cap-drop ALL --security-opt no-new-privileges alpine:latest sh -c 'ip -4 addr; ip -4 route; test -z "$(ip -4 route | grep default)"'` terminou exit 0. No processo de prova havia rota apenas para a sub-rede diretamente conectada e nenhuma rota padrão IPv4. Nenhuma conexão a serviço foi realizada nesse teste. Ausência de rota padrão, isoladamente, não comprova bloqueio integral de saída, DNS, IPv6, serviços do host ou integridade das configurações da aplicação.
- Permanecem a rede dedicada e o contêiner de prova parado, sem volumes, banco, credenciais ou portas publicadas. Sua remoção segura e a verificação do reset ficaram pendentes; não se alterou nenhum serviço já existente.
- A imagem PHP base disponível não garante por si só todas as extensões exigidas; instalação travada de dependências e verificação de extensões não executadas. O Compose nativo tem nomes fixos de contêiner e publica serviços que não devem ser reutilizados diretamente neste laboratório.

## Revisão preliminar independente — não é aprovação

Um subagente novo foi incumbido apenas de investigar, sem escrita, os pré-requisitos e o desenho de isolamento. O resultado da ferramenta identificou `model=deepseek-flash`; a configuração de delegação observada pelo executor contém `provider: deepseek` e `model: deepseek-flash`. Não há atestação independente do provedor em resposta da API; esforço efetivo não verificado. Duração reportada da delegação: 404,57 s; custo estimado pela ferramenta US$ 0,052589; tokens reportados pela ferramenta: entrada 1.297.030, saída 65.419. Não é medição do custo total do ciclo.

O revisor relatou que rede Docker `--internal` comum não basta para provar ausência de acesso ao host; sugeriu gateway isolado ou barreira adicional. A tentativa local com gateway isolado acima não constitui validação de ponta a ponta. Também apontou que os testes unitários nativos de cancelamento/estoque não substituem prova em MySQL. O próprio revisor classificou sua avaliação como preliminar, sem execução funcional ou aprovação final.

**Desvio de escopo da revisão:** embora instruído a não inspecionar serviços existentes, o revisor relatou ter consultado metadados de rede e sockets de serviços já existentes. Segundo seu relato, não consultou aplicações, banco de dados, arquivos produtivos, credenciais ou conteúdo de clientes. Essa consulta de metadados não foi necessária e não deve ser repetida. A conclusão de isolamento não se apoia nela.

## Gates não executados / pendências

- Nenhum runtime nativo persistente, banco MySQL sintético, migração, seed, usuário, login, fluxo browser ou rollback foi executado.
- Não foram testados cancelamento com item inexistente/estranho, controle positivo, estoque, papéis/permissões, nem regressões nativas. Sem evidência de comportamento real ou falha funcional do produto.
- Não existem testes de mutação, capturas, runbook validado de início/parada/reset ou revisão independente final do laboratório; não há DONE nem aprovação.
- O próximo passo depende de decisão do GPT/proprietário sobre uma forma autorizada e não interativa de criar **e remover** recursos exclusivamente dedicados, sem afrouxar configurações globais por esta execução; deve também comprovar o isolamento completo antes de qualquer migração. Não iniciar automaticamente outra rodada.
