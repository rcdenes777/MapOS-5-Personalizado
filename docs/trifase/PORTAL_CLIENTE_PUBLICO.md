# Portal público do cliente — candidato em desenvolvimento

> **UNREVIEWED — NOT APPROVED FOR MERGE.** Este é um checkpoint para inspeção independente, não uma entrega aceita. A implementação correspondente ao checkpoint é `e33f8256afedbf9a51f13a8797f02ac032a6c1aa`.

**Estado: WIP. Não é autorização de implantação, merge ou aceite.**

## Escopo e segurança

O link do cliente é uma credencial de portador: dá acesso de leitura às OS e aos valores desse cliente, até expirar ou ser revogado. Administradores autorizados usam a ficha do cliente para criar, copiar, enviar via WhatsApp, trocar ou revogar o link. A troca invalida o link anterior. Nunca registrar URLs com token em access logs, traces, métricas, analytics ou ferramentas de suporte; quem possuir o link terá acesso ao conteúdo. Use HTTPS. Não enviar links automaticamente.

As rotas públicas verificam o token em cada solicitação, limitam OS ao cliente e só entregam anexos explicitamente publicados para aquela OS. Links individuais de OS permanecem separados. A projeção financeira considera apenas obrigações formalizadas; quando o módulo está desabilitado, os valores ficam indisponíveis em vez de indicar ausência de cobrança.

## Migração e ativação — procedimento proposto, ainda não autorizado

1. Antes de qualquer produção, obter aprovação do responsável, backup verificado e revisão independente do commit e da configuração. Confirmar a compatibilidade da versão e da chave `APP_ENCRYPTION_KEY` existente; não trocá-la para instalar a feature.
2. Em cópia isolada, validar a migration `20261127010000_trifase_cliente_publico`, os testes e os controles de acesso. Confirmar o plano de recuperação. Não alterar `banco.sql`.
3. Na janela autorizada, aplicar as migrations pendentes pelo procedimento normal do projeto (`php index.php tools migrate`), depois de confirmar o destino e todas as migrations incluídas. Isso não foi executado em produção.
4. Verificar `TRIFASE_PUBLICO_ENABLED`, `TRIFASE_PUBLIC_BASEURL` (origem HTTPS pública), `TRIFASE_PUBLICO_VALIDADE_DIAS` e, quando apropriado, `TRIFASE_FINANCEIRO_ENABLED`. O portal depende das tabelas de entrega e do módulo de links públicos. Configurar as flags apenas conforme a decisão de implantação.
5. Testar com cliente e OS sintéticos autorizados, inclusive renovação, revogação, segregação, anexos e filtros. Não enviar links reais até o aceite.

## Proxy público

Adicionar somente rotas GET/HEAD do prefixo configurado, sem expor o painel. Com `index_page=index.php`, os caminhos novos são:

- `/index.php/publico_cliente/index/<token>`
- `/index.php/publico_cliente/os/<token>/<id-os>`
- `/index.php/publico_cliente/anexo/<token>/<id-os>/<id-anexo>`

Permitir os assets estáticos necessários, especialmente `/assets/dist/app.css` e fontes locais. Respeitar eventuais subpastas e as regras existentes dos links públicos individuais; não abrir outros controllers ou uploads estáticos. Bloquear ou mascarar integralmente o caminho com token nos logs de proxy, web server e observabilidade, inclusive em erros; preservar `no-store`, `no-referrer`, bloqueio de indexação e os demais cabeçalhos. A sintaxe exata depende do proxy existente e precisa ser validada pelo operador antes do deploy. Nenhuma configuração de produção foi alterada aqui.

## Reversão — planejamento

A reversão de código e regras de proxy deve ser coordenada com o estado de migrations da instalação e os links já enviados. O `down()` da migration remove a tabela `trifase_cliente_publico_links` e **destrói os vínculos de acesso do cliente**; não executá-lo sem autorização explícita e backup. Não presumir que migrar para uma versão anterior remova apenas esta tabela: conferir todas as migrations intermediárias e seus efeitos. A recuperação de backup pode reativar tokens antigos; revogação/rotação deve ser planejada antes da reabertura do acesso.

## Evidência provisória

A base observada foi `8c256cae4ddaeefad68922abddbb8addfe37c99d`. A suíte PHP em desenvolvimento executou 2.064 testes e 10.900 asserções com uma depreciação; 4.431 ocorrências foram ignoradas pelo baseline. O build e os 216 testes JS passaram. Testes de navegador no laboratório sintético exercitaram isolamento, anexos, permissão restrita, expiração, renovação, revogação, telas de cliente autenticado, paginação financeira e regressão do link individual. Um ensaio descartável em MySQL 8.4 testou criação, repetição, índice único, rollback e preservação de tabela-controle. Estes resultados ainda requerem vínculo e repetição aplicável no candidato final; não constituem aceite.

As capturas sintéticas estão em [`evidencias-portal-cliente/`](evidencias-portal-cliente/): desktop 1440×900 e celular 375×812. Elas mostram a listagem, não todos os estados; os arquivos desta versão foram registrados no checkpoint `ccc5c46c57b618ceb9a916e7fa3ffaa0055c75a4`. A inspeção local identificou alvos de filtro pequenos no celular; após ajuste, o Playwright verificou altura mínima de 44 px e ausência de overflow horizontal. Foram detectadas duas mutações dirigidas, em cópias descartáveis: remoção do isolamento de cliente e inversão da soma do consolidado. Essa amostra não substitui a matriz completa de mutações.

O parecer visual externo recebido no registro parcial avaliou capturas anteriores e não pôde ser associado ao runtime efetivo nem aos arquivos finais; não é aceite visual. A revisão independente de segurança/código e a revisão visual das capturas atuais seguem pendentes. A suíte PHP no checkpoint `ccc5c46c57b618ceb9a916e7fa3ffaa0055c75a4` foi executada novamente com 2.064 testes e 10.900 asserções; PHPStan passou e o roteiro Playwright passou em laboratório. O estado é **incompleto e não aprovado**, apesar desses resultados.
