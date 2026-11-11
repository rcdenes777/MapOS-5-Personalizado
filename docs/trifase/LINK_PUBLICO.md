# Módulo Trifase: link público da OS

Implementado na branch local `v5-trifase`, sobre a tag oficial `v5.2.2`
(`9a4c5dc3835b52c12616a73ab60635e96e23ad7a`). Não publicado no GitHub nem
instalado no MapOS de trabalho. Aplicado e validado somente na prévia local 8200.

## Comportamento

Na tela de uma OS, **Link público** abre a administração do compartilhamento.
Exige usuário logado com **vOs e eOs**, inclusive para ver a tela. Alterações
usam POST com o CSRF padrão da v5. Não cria uma permissão administrativa paralela.

- **Gerar link público** cria um token aleatório de 256 bits, válido pelo prazo configurado (padrão 120 dias).
- Existe um único link vigente por OS. **Gerar novo link e invalidar anterior**
  troca o token imediatamente; **Revogar acesso público** encerra o acesso.
- O banco guarda o SHA-256 usado na leitura pública e uma cópia criptografada
  com AES-256-GCM, vinculada à OS e à chave da instalação. O painel autorizado
  recupera o mesmo link ao voltar ou recarregar. Ler a tela não renova o prazo
  nem substitui o token; somente a ação explícita de gerar outro faz isso.
- A tela oferece abrir o link e compartilhar pelo WhatsApp. Nenhuma mensagem
  é enviada automaticamente. O link é uma credencial de leitura: quem o tiver
  poderá acompanhar aquela OS até expirar ou ser revogado.
- A página pública mostra número, andamento, entrada, previsão e descrição
  do equipamento em texto. Não mostra cliente, endereço, técnico, anotações,
  laudo interno ou valores financeiros. Imagens embutidas no editor não são
  transportadas para a área pública.
- Anexos começam privados. Marque explicitamente os que deseja disponibilizar. A seleção também limita a listagem e o download no portal autenticado e na API do cliente. Anexos antigos sem marca de publicação ficam disponíveis para a equipe.
- Para retirar um anexo de todos os canais do cliente, desmarque a publicação. Revogar o link encerra o acesso pelo endereço público. O titular autenticado ainda pode consultar anexos que continuam marcados como publicados. Com o módulo de link público desativado, a seleção existente continua valendo no portal; reative o módulo para alterar a seleção no painel.
  Desmarcar e salvar remove o acesso sem precisar trocar o link. Todo download
  verifica novamente token, OS e publicação do anexo.
- Fotos aparecem em cartões com miniaturas tanto na seleção administrativa
  quanto na página pública. Clicar na miniatura abre a imagem maior em uma janela modal na própria
  página. Arquivos sem prévia de imagem (PDF, TXT etc.) mostram ícone e extensão,
  com download. Vídeos MP4 e WebM têm reprodução em janela; recebimentos parciais e laudos públicos seguem como etapas separadas.
- Miniaturas reutilizam o arquivo criado no upload. Se ele não existir ou
  estiver inválido, usam a imagem original verificada, respeitando o limite
  de pixels configurado. Arquivo sem imagem válida recebe um ícone, sem imagem
  quebrada. Esta etapa não cria derivados novos nem altera anexos ou publicações.

## Ativação em uma instalação de testes

1. Preparar uma cópia isolada da v5.2.2 com dependências do `composer.lock`.
2. Aplicar a migration `20261031000000_create_trifase_publico` pelo procedimento
   normal de atualização de banco da v5. Em instalação por terminal, o comando
   padrão é `php index.php tools migrate`; confira o ambiente antes de executá-lo.
3. Definir em `application/.env`:

```dotenv
TRIFASE_PUBLICO_ENABLED=true
TRIFASE_PUBLIC_BASEURL=https://dominio-dos-clientes.example/
```

A URL deve ser uma base http(s) sem credenciais, query ou fragmento. Suporta
subpasta. Sem `TRIFASE_PUBLIC_BASEURL`, usa o `APP_BASEURL` já configurado, nunca
o cabeçalho Host da requisição. No laboratório foi usado apenas loopback.
Em acesso externo configure HTTPS e o domínio correto; não envie links com
localhost ou com o endereço privado do painel a clientes externos.

O módulo usa o roteamento padrão do CI3, sem editar `routes.php`:

| Rota após `index.php/` | Acesso |
| --- | --- |
| `trifase/gerenciar/<os>` | GET, login, vOs + eOs |
| `trifase/gerar/<os>` | POST, login, vOs + eOs + CSRF |
| `trifase/revogar/<os>` | POST, login, vOs + eOs + CSRF |
| `trifase/anexos/<os>` | POST, login, vOs + eOs + CSRF |
| `trifase/miniatura/<os>/<anexo>` | GET/HEAD, login, vOs + eOs e vínculo do anexo à OS |
| `trifase/video/<os>/<anexo>` | GET/HEAD e Range, login, vOs + eOs e vínculo à OS |
| `publico/os/<token>` | GET/HEAD, token vigente |
| `publico/anexo/<token>/<anexo>` | GET/HEAD, token vigente e anexo publicado na OS |
| `publico/miniatura/<token>/<anexo>` | GET/HEAD, mesmas verificações, somente imagem raster válida |
| `publico/imagem/<token>/<anexo>` | GET/HEAD, imagem original inline com as mesmas verificações |
| `publico/video/<token>/<anexo>` | GET/HEAD e Range, token vigente, vídeo verificado e publicado na OS |

O prefixo `index.php` acompanha `config['index_page']`. Não desative o CSRF nem
inclua rotas Trifase em `csrf_exclude_uris`. Não exponha o painel para viabilizar
o domínio público: seu proxy deve aceitar somente as rotas públicas e assets
necessários, respeitando a mesma subpasta configurada.

Tokens fazem parte da URL. Desative ou mascare access logs e traces para essas
rotas no proxy, servidor web e observabilidade; nunca copie URLs privadas para
logs, analytics ou rastreadores. O módulo não registra o token no log da aplicação.
Respostas públicas, inclusive erros e downloads, usam `no-store`, `no-referrer`,
`nosniff`, bloqueio de frames e de indexação. Esses cabeçalhos não impedem alguém
autorizado de salvar um arquivo que já tenha baixado.

Não há migração dos tokens antigos da v4: novos links têm de ser gerados.
As configurações Apache e Nginx do projeto bloqueiam o acesso HTTP direto a `assets/anexos/`. Em hospedagem com configuração própria, aplique o mesmo bloqueio. O armazenamento continua sendo o privado da v5 (`STORAGE_PATH`); arquivos em
pastas públicas legadas, caminhos externos e symlinks que saem da raiz não passam.
Também é conferido o MIME real. Não existem URLs estáticas para anexos públicos.

## Separação para facilitar atualizações

É uma extensão organizada nos pontos nativos do CodeIgniter 3. Não exige HMVC,
um gerenciador de plugins ou alterações no framework/vendor.

| Parte própria | Arquivos |
| --- | --- |
| Administração e leitura pública | `controllers/Trifase.php`, `controllers/Publico.php` |
| Persistência e concorrência | `models/Trifase_publico_model.php` |
| Configuração, projeção e cabeçalhos | `helpers/trifase_publico_helper.php` |
| Tabelas próprias | `trifase_publico_links`, `trifase_publico_anexos` |
| Migration | `database/migrations/20261031000000_create_trifase_publico.php` |
| Interface | `views/trifase/*` |
| Testes de comportamento | `tests/Unit/TrifasePublicoTest.php` |

**Apenas dois pontos no código original:**

1. Entrada `Trifase` em `config/permissions_map.php`.
2. Uma inclusão de `trifase/atalho` em `views/os/visualizar.php`.

Além disso são versionados o CSS recompilado e a documentação de migração.
Nenhuma alteração em `Os.php`, `Os_model.php`, login, API, estoque, financeiro,
`banco.sql`, dependências ou arquivos Docker do upstream. Novas tabelas são
aditivas; não criam campos nas tabelas originais.

Isso reduz conflitos, mas não torna a extensão independente de qualquer versão:
ela depende dos contratos da v5 de permissões, storage, componentes e schema.
Ao atualizar o upstream, manter os arquivos próprios, revisar os dois pontos de
integração, verificar eventuais nomes novos em conflito (especialmente Publico),
recompilar o frontend e repetir os testes antes de instalar. Não mesclar a master
antiga da v4 sobre a v5. Não sobrescrever configurações e dados com os do laboratório.

Para desativar, defina `TRIFASE_PUBLICO_ENABLED=false` ou remova essa variável:
o atalho desaparece e o controller público retorna 404, inclusive por URL direta.
Tabelas e arquivos permanecem para reativação. A migration `down` apaga somente
tokens e seleção pública do módulo; destrói esses vínculos e exige autorização
separada. O rollback completo só deve ser planejado junto às demais migrations
da versão instalada. Restaurar dados antigos exige revisar/revogar os links.

## Evidência de validação em 31/10/2026

- PHP 8.5.12 em containers temporários, sem usar os bancos existentes.
- 14 testes novos do modelo/helper: aleatoriedade/hash, expiração, renovação,
  revogação por OS, OS excluída, anexos privados, seleção inválida, rollback da
  seleção, isolamento, projeção de dados, URL configurada, flag e cache binário.
- Suíte PHP completa: 1.603 testes e 7.325 assertions, sem falhas. Um aviso de
  depreciação em três testes já existentes de `TemaCorTest` (propriedade dinâmica
  `Migration_add_tema_cor::$dbforge`); o baseline não foi ampliado.
- `composer analyse`: sem erros, usando o caminho esperado pelos stubs do projeto.
- `composer format` nos PHP alterados, sem ajustes pendentes.
- `npm ci`, `npm run build` e 20 arquivos de testes JS passaram.
- 37 verificações HTTP com login real e CSRF: leitura anônima pela URL emitida,
  falta de permissão, CSRF ausente, GET mutante negado, arquivos privados/de
  outra OS, caminho fora da raiz, symlink externo, MIME falso, HEAD, renovação,
  revogação e cabeçalhos de cache em sucessos, falhas e binários.
- Teste real de duas renovações concorrentes no MySQL: espera observada de
  2,59 segundos pelo lock, um slot por OS e apenas o último token ativo.
- Flag desligada testada por HTTP com e sem `index.php`.
- Migration aplicada, desfeita e reaplicada no MySQL descartável: duas OS e
  seis anexos fictícios permaneceram; apenas as duas tabelas do módulo saíram.
- Navegador: login e cliques reais no atalho, geração e publicação de anexo;
  desktop e celular de 390 px, sem overflow horizontal ou erro JavaScript.

Esses testes não comprovam funcionamento em um domínio externo, túnel, proxy
de produção ou dados reais. Esses ambientes não foram alterados.

### Atualização: miniaturas

Miniaturas foram adicionadas em arquivos próprios do módulo e aplicadas somente
à prévia local 8200, sem nova migration, troca de token ou alteração na seleção
de publicação. O trecho `views/trifase/miniatura.php` é compartilhado pelas duas
telas. A ampliação agora usa uma janela na própria página; o download continua separado.

- Nove testes novos de filesystem/cabeçalhos: prioridade da thumb, fallback,
  MIME falso, original ausente, arquivo sem prévia, caminhos e symlinks externos,
  limite de pixels e imagem inline com no-store.
- Suíte PHP: 1.614 testes, 7.355 assertions, sem falhas; permanece o aviso antigo
  em `TemaCorTest`. PHPStan sem erros, formatação conferida, frontend recompilado
  e 20 arquivos de testes JS passaram.
- Dezenove verificações HTTP na prévia: bytes JPEG das URLs emitidas, ampliação,
  HEAD, no-store, token inválido, bloqueio do anexo privado nas duas rotas de
  imagem, login obrigatório no painel e token ausente dos logs.
- Inspeção no navegador: quatro miniaturas administrativas carregadas e somente
  as três autorizadas na página pública. Molduras uniformes, sem recorte das fotos.

A inspeção usou a seleção já definida pelo usuário. Nenhum arquivo foi publicado
automaticamente para produzir a demonstração.

### Atualização: janela de imagens

A ampliação usa o componente modal nativo da v5, com módulo ES próprio em
`assets/js/modules/trifase/galeria.js`, compartilhado pelo painel e pela página
pública. Clicar na miniatura não navega nem cria outra aba. O botão de fechar,
Esc e o clique fora da caixa fecham a janela e devolvem o foco à miniatura.
A rolagem da página fica bloqueada enquanto a janela está aberta. Falhas de
carregamento apresentam uma mensagem, sem inserir HTML a partir dos dados.

A página pública válida autoriza o carregador JS por nonce aleatório novo a
cada resposta e `strict-dynamic`; não usa scripts inline nem libera origens
externas por lista ampla. Imagens, downloads e respostas de erro continuam com
`script-src 'none'`. As URLs da imagem e do download têm de ser da mesma origem.

Validação: 1.616 testes PHP, 7.368 assertions, sem falhas; permanece o aviso antigo
de TemaCorTest. PHPStan sem erros; 21 arquivos de testes JS, incluindo cinco
casos do modal, passaram. Na prévia foram testados clique real nas duas telas,
foto carregada, quantidade de abas inalterada, fechamento pelo botão, Esc e
fundo, foco restaurado, 19 verificações HTTP dos anexos e nonces distintos em
respostas consecutivas. Não houve alteração no banco ou na seleção publicada.


### Atualização: lupa e zoom

O rodapé da janela oferece **Ampliar** (lupa), **Reduzir** e **Ajustar**.
O zoom vai de 100% a 800% em relação à imagem ajustada inicialmente; a área
com rolagem permite alcançar todos os detalhes. Ajustar volta à foto inteira,
e abrir outra imagem reinicia o zoom. Os controles ficam indisponíveis durante
o carregamento ou se o arquivo falhar. O mesmo componente atende painel e cliente.

A view carrega `trifase/galeria-zoom.js`, com URL própria para atualizar também
navegadores que mantêm o módulo anterior em cache. O módulo reutiliza a validação
de URLs de `galeria.js`; não muda as permissões nem os arquivos publicados.

Para Nginx com FastCGI, configure `fastcgi_max_temp_file_size 0;` no bloco PHP,
além de filtrar os access logs públicos: imagens grandes podem gerar avisos de
buffering que contêm o endereço com token. Na prévia 8200 foi preservada a
configuração anterior e aplicada essa opção, sem desativar os demais logs.

Verificação: sete casos da galeria e os 21 arquivos JS passaram; 1.616 testes PHP
(7.369 assertions, um aviso antigo de depreciação), PHPStan sem erros e build
concluído. No navegador, lupa no painel e no cliente, limite de 800%, redução,
ajuste sem recorte, rolagem horizontal/vertical e Esc funcionaram sem criar abas.


### Vídeos e limite de envio

- Anexos aceitam **MP4** (`video/mp4`) e **WebM** (`video/webm`), além dos
  formatos anteriores. O conteúdo real precisa corresponder à extensão.
- O limite padrão é **200 MiB por arquivo** (204800 KB). O envio completo,
  incluindo vários arquivos e o formulário, deve caber em **210 MiB** no PHP e
  no Nginx. Configure os três limites juntos conforme a seção de migração.
  A mesma regra de tamanho vale para imagens e documentos; fotos mantêm o
  limite independente de 40 megapixels para proteger a memória.
- O cartão **Reproduzir vídeo** abre o player na própria página. Ele funciona
  na aba Anexos da OS e no painel Trifase para usuários com vOs + eOs, e no
  link público apenas para vídeos explicitamente selecionados. O módulo
  continua desativado por padrão; o upload não publica o arquivo.
- Os controles nativos permitem reproduzir, pausar, alterar volume, avançar e
  usar tela cheia. Não há autoplay nem carregamento de todos os vídeos da
  galeria no player; a fonte do player só é atribuída ao abrir a janela. Fechar pausa e remove a
  fonte. O navegador precisa suportar o codec do arquivo; não há conversão
  automática. Quando não consegue reproduzir, o player oferece download.
- Vídeos usam cartões com um quadro pausado como miniatura, identificado pelo
  formato. O navegador busca metadados e o quadro inicial somente quando o
  cartão fica visível, pela mesma rota protegida do player. Não há geração de
  JPEG no servidor nem dependência de FFmpeg. Se o codec não puder ser exibido,
  permanece o ícone com a ação Reproduzir.
- O endpoint aceita um intervalo de bytes por resposta (206), inclusive
  sufixos. Intervalos inválidos ou múltiplos recebem 416. HEAD retorna os
  metadados sem corpo e ignora Range; If-Range sem validador disponível retorna
  o arquivo inteiro. A cópia é feita em blocos de 1 MiB e libera o bloqueio da
  sessão antes do envio. Cada pedido de trecho revalida o acesso. Revogar não
  apaga trechos já recebidos pelo navegador.
- Copiar também `helpers/trifase_video_helper.php`, a view `trifase/video.php`
  e o módulo `assets/js/modules/trifase/video.js`. O módulo é novo, evitando
  depender da atualização do JavaScript anterior em cache. A política da
  página pública permite somente mídia da própria origem. Sem nova migration.

Validação final: 1.625 testes PHP / 7.439 assertions, sem falhas, com a
depreciação preexistente de TemaCorTest; PHPStan sem erros; 22 arquivos de
testes JS passaram. Em laboratório MySQL isolado, 24 verificações HTTP
confirmaram uploads reais de MP4/WebM, aceitação de exatamente 200 MiB,
rejeição do excedente e de conteúdo falso, Range, HEAD, MIME, no-store, outra
OS, usuário sem eOs, token inválido, anexo privado e revogação. Sete verificações
adicionais cobriram telas administrativas e If-Range nos dois formatos.
Reprodução real de MP4/H.264 e WebM/VP9 foi conferida no navegador com vídeos
artificiais. Nenhum arquivo foi publicado na OS real para produzir os testes.


### Correção: miniatura e janela após envio de anexo

A view `os/partes/anexos.php` carrega seu próprio helper Trifase. Ela também é
renderizada pela resposta AJAX de `os/anexar`, sem passar pelo cabeçalho da OS.
Isso garante que o cartão recém-enviado já tenha `data-trifase-video` e a rota
do player, em vez do antigo link com `target="_blank"`. Fotos com miniatura na
aba Anexos também usam a janela da galeria, incluindo a lupa.

Copiar o novo módulo `assets/js/modules/trifase/miniatura-video.js` junto da
view compartilhada: ele mostra um quadro pausado, mudo e sem autoplay ou
controles embutidos no cartão. Clicar abre a janela com os controles completos.
Falha ou codec incompatível mantém o ícone e o acesso ao player/download.
Sem migration, alteração de token ou publicação automática.

Validação desta correção: 1.626 testes PHP / 7.444 assertions, sem falhas
(uma depreciação preexistente); PHPStan sem erros; 23 arquivos JS passaram;
build sem alterações nos CSS gerados. O teste PHP renderiza o trecho em um
processo separado, sem o cabeçalho, e exige a rota do player sem target blank.
Na prévia 8200 o MP4 já existente exibiu quadro em 0,1 s, abriu em janela com
readyState 4 e duração reconhecida, e o número de abas permaneceu um. A foto
também abriu na janela com a lupa. Nenhum anexo foi enviado ou publicado pelo
teste na instalação do usuário.


### Link sempre disponível e validade de 120 dias

A migration `20261031010000_persist_trifase_publico_token` acrescenta
`token_cifrado` e `validade_dias` somente à tabela do módulo. A cópia é
autenticada por AES-256-GCM com nonce aleatório, chave derivada de
`APP_ENCRYPTION_KEY` e vínculo criptográfico à OS. O hash também é conferido
antes de revelar o endereço no painel com vOs + eOs. A área pública continua
validando só hash, prazo e anexos selecionados; não recebe o conteúdo cifrado.

Links novos valem 120 dias. Links antigos ainda vigentes recebem mais 90 dias
para completar 120 desde a emissão. Expirados e revogados não são reativados.
O marcador de validade torna a ampliação idempotente, inclusive ao repetir a
migration. Abrir a tela, voltar da OS ou copiar o link não altera sua validade.
Revogar limpa hash e cópia cifrada; substituir troca ambos e invalida o anterior.

Um hash antigo sozinho não permite reconstruir o token. Quando o endereço
ainda é conhecido, a recuperação administrativa `guardarTokenExistente`
valida o hash/OS/prazo e guarda a cópia cifrada sem mudar URL ou seleção.
Endereços antigos desconhecidos permanecem válidos e aparecem como ativos, com
aviso de que não podem ser recuperados; não são substituídos automaticamente.

Preservar a chave da instalação junto do backup privado do banco. Trocar a
chave impede recuperar cópias anteriores, embora a leitura pública por hash
ainda funcione; não apagar arquivos `.env` em atualizações. Rollback da
migration remove as colunas extras, sem encurtar o prazo já concedido. Para
voltar exatamente ao estado anterior, restaurar a cópia de banco e arquivos
feita antes da atualização, em vez de alternar upgrades/rollbacks repetidamente.

Validação: 1.632 testes PHP / 7.477 assertions, uma depreciação preexistente;
PHPStan sem erros; testes JS e build sem falhas. Em MySQL isolado, repetir a
migration preservou hash e seleção, ampliou o prazo uma única vez e permitiu
recuperar token antigo conhecido. Vinte verificações HTTP cobriram retorno
da OS, recarga, mesma URL, 120 dias, perfil sem eOs, anonimato, renovação e
revogação. A prévia usa somente a recuperação do endereço informado pelo
usuário, sem gerar outro link ou mudar os anexos publicados.

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
