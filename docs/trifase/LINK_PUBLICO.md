# Módulo Trifase: link público da OS

Implementado na branch local `v5-trifase`, sobre a tag oficial `v5.2.2`
(`9a4c5dc3835b52c12616a73ab60635e96e23ad7a`). Não publicado no GitHub nem
instalado no MapOS de trabalho. Aplicado e validado somente na prévia local 8200.

## Comportamento

Na tela de uma OS, **Link público** abre a administração do compartilhamento.
Exige usuário logado com **vOs e eOs**, inclusive para ver a tela. Alterações
usam POST com o CSRF padrão da v5. Não cria uma permissão administrativa paralela.

- **Gerar link público** cria um token aleatório de 256 bits, válido por 30 dias.
- Existe um único link vigente por OS. **Gerar novo link e invalidar anterior**
  troca o token imediatamente; **Revogar acesso público** encerra o acesso.
- O banco guarda apenas SHA-256 do token. Por isso o link completo aparece
  somente na resposta à geração: copie antes de sair da tela. Recarregar a tela
  não recupera o token; se necessário, gere outro.
- A tela oferece abrir o link e compartilhar pelo WhatsApp. Nenhuma mensagem
  é enviada automaticamente. O link é uma credencial de leitura: quem o tiver
  poderá acompanhar aquela OS até expirar ou ser revogado.
- A página pública mostra número, andamento, entrada, previsão e descrição
  do equipamento em texto. Não mostra cliente, endereço, técnico, anotações,
  laudo interno ou valores financeiros. Imagens embutidas no editor não são
  transportadas para a área pública.
- Anexos começam privados. Marque explicitamente os que deseja disponibilizar.
  Desmarcar e salvar remove o acesso sem precisar trocar o link. Todo download
  verifica novamente token, OS e publicação do anexo.
- Fotos aparecem em cartões com miniaturas tanto na seleção administrativa
  quanto na página pública. Clicar na miniatura abre a imagem maior em uma janela modal na própria
  página. Arquivos sem prévia de imagem (PDF, TXT etc.) mostram ícone e extensão,
  com download. Vídeos, recebimentos parciais e laudos públicos são etapas separadas.
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
| `publico/os/<token>` | GET/HEAD, token vigente |
| `publico/anexo/<token>/<anexo>` | GET/HEAD, token vigente e anexo publicado na OS |
| `publico/miniatura/<token>/<anexo>` | GET/HEAD, mesmas verificações, somente imagem raster válida |
| `publico/imagem/<token>/<anexo>` | GET/HEAD, imagem original inline com as mesmas verificações |

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
O armazenamento continua sendo o privado da v5 (`STORAGE_PATH`); arquivos em
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
