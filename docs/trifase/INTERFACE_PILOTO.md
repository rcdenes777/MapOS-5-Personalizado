# Visualização da OS — piloto azul e prata

02/11/2026. Primeira integração do protótipo Penpot com dados persistidos do MapOS, somente em laboratório. Não implementa as 130 vistas do planejamento.

## Ativação e comparação

`TRIFASE_UI_PILOTO_ENABLED` é falso por padrão. Quando ligado, somente `os/visualizar/{id}` na aba resumo usa a nova apresentação. `?apresentacao=classica` abre a interface anterior; produtos, serviços, anexos, anotações, histórico e formulários continuam nas funções existentes. Não há migração, ativação automática de financeiro/público ou alteração das preferências de tema dos usuários. Desligar o piloto só troca a apresentação.

A prévia8200 e os ambientes existentes não foram atualizados. O laboratório8230 tem rede/banco/storage próprios, três OS e usuários fictícios, sem dados importados da prévia. Usou somente a estrutura SQL como referência. Segredos e arquivos desse ambiente ficam fora do Git. Não executar seus scripts de fixtures em outra instalação.

## Funcionamento

O resumo reúne relato, observações e laudo, peças e serviços, anexos, datas/andamento, financeiro e situação do link. Campos vazios continuam identificados. Não extrai marca/modelo ou selo da descrição livre. Não presume entrega física, cobertura de retorno ou aceite de orçamento.

Financeiro e preços desta apresentação exigem vLancamento; totais/recebimentos/saldo vêm do modelo existente. OS sem obrigação não ganha saldo ou recebido fictícios. A seleção da nova apresentação não altera as permissões dos endpoints nem corrige permissões de outras telas.

Link público usa o estado existente, sob vOs+eOs. Nenhum token é criado na leitura e não se publicam novos campos. Gestão de anexos/link continua na ação existente. Fotos/vídeos usam os mesmos modais, autorização e armazenamento. No resumo, anexos são de consulta; envio/exclusão ficam na tela específica, com seus formulários e diálogos.

Editar OS encaminha ao formulário normal quando editável, ou à edição técnica protegida quando permitido após faturar. Atualizar andamento, receber, consultar itens e demais ações continuam em suas telas existentes. O piloto não simula sucesso de uma função ainda ausente.

## Integração e atualização

- `Os::visualizar`: seleção opt-in e consultas somente leitura de resumo financeiro e estado público, com permissão.
- `trifase_interface_helper.php`: flag; `views/trifase/os.php`: apresentação.
- `tema/topo.php`: atributo do piloto no HTML somente nessa vista.
- `os/partes/anexos.php`: modo de consulta para omitir controles de exclusão sem seu diálogo.
- Tokens e CSS documentados em DESIGN.md; assets compilados versionados. Paleta clara azul/prata escopada; modo escuro mantém os tokens existentes.
- `TrifaseOsViewTest`: renderização real da vista, negação de valores sem permissão, parcial mesmo com status Finalizado, estado sem obrigação e escaping.

Estas são integrações explícitas a revisar ao atualizar upstream. Não é plugin independente de versão. Não foram alteradas regras financeiras, migrations, mapa de permissões ou projeção pública.

## Validação

- PHPUnit:1670 testes,7807 asserções, sem falhas/erros;1 depreciação e1 teste ignorado. Execução em cópia gravável isolada sem rede. Tentativas iniciais em montagem somente leitura/sem assets não servem como resultado final.
- PHPStan sem erros novos e sem ampliação de baseline.23 testes JS passaram. Dependências do lockfile reinstaladas offline; build completo aprovado.
- HTTP no8230:19 verificações na execução inicial, incluindo sessão, perfil sem financeiro, abas nativas, estados, dados reais e upload PNG/MP4 sintético. Reexecução com arquivos já existentes omite a etapa de upload.
- Navegador: larguras CSS360/390 e desktop1260, sem overflow horizontal do documento; modo escuro e retorno ao claro. Foto em modal com zoom200%, Escape/foco restaurado; vídeo com controles, readyState4 e sem erro. Atalhos Editar OS e Registrar recebimento abrem as funções da mesma OS.
- Auditoria somente leitura após navegar: um recebimento de20000centavos, saldo30000 e andamento Em Andamento preservados. Nenhum recebimento feito pelos testes de interface.
- Contrastes da nova paleta recalculados em DESIGN.md. Não é certificação WCAG ou teste de aparelho físico. A API fullPage apresentou corte em capturas mobile; usar evidência do viewport nativo e medições DOM, sem tratar captura cortada como defeito ou aprovação do layout.

Relatórios e capturas locais em `outputs/ui-piloto/` no workspace. Continuar pela operação da OS na nova apresentação após avaliação do piloto; equipamento/selo, entrega, retorno, decisão versionada e bateria funcional completa continuam em etapas posteriores.


### Lista inicial de produtos e serviços — 02/11/2026

Os campos de inclusão de itens na OS passam a listar ao focar/clicar, com filtragem progressiva e no máximo25opções por resposta. O atributo opt-in `data-autocomplete-listar` não muda o mínimo dos demais campos. Só os endpoints já autorizados de produto/serviço aceitam termo vazio; sem termo válido nos outros cadastros continua sem resultado. Selecionar preenche o ID/preço; não salva nem adiciona automaticamente. Escape/saída cancelam pesquisa pendente e o clique reabre a lista.

Validação: lista inicial dos dois produtos e do serviço fictícios, filtro mos retornando apenasMOSFET, preço70,00/400,00 preenchido, Escape e reabertura no mesmo campo.414testesPHP direcionados/1288asserções,23testesJS, PHPStan e build aprovados. Nenhum item adicionado ou removido durante esse teste.


### Inclusão e remoção no próprio resumo — 02/11/2026

Adicionar peça/serviço agora expande formulários dentro da OS, com os mesmos endpoints, validação, preço sugerido, quantidade e descontos da tela nativa. O formulário foi extraído para `os/partes/formulario-item.php`, compartilhado com a apresentação clássica; prefixos distinguem IDs de campos/erros/autocomplete. Os campos de desconto também aceitam prefixo, mantendo o padrão anterior para outras telas. O botão de envio fica após o desconto no novo layout.

A lista é renderizada por `trifase/itens.php`. Remover pede confirmação com nome e consequência, e usa os endpoints nativos de exclusão. As respostas da OS ganham os trechos `pilotoitens` e, com permissão, `pilotofinanceiro`, somente com flag ligada e contexto resumo. O módulo os/tela já aplica esses trechos; formulários e campos em edição não são substituídos. A limpeza do aviso de estoque passou a ser restrita ao formulário enviado, para não apagar o contexto do outro formulário. Sem novas rotas, migrations, permissões ou regras monetárias.

Verificações reais em OS9001 exclusiva de QA:2fusíveis de15menos5em reais=25; serviço1,5×400menos10%=540; total565, depois540ao remover peça e0ao remover serviço. Valores atualizados também na lateral sem navegação/reload. Produto devolvido ao estoque19, exatamente o valor anterior ao ensaio. OS3 do usuário manteve2produtos,1serviço e4anexos; não foi usada para mutações de QA. Fixture9001 permanece vazia para inspeção, sem novo recebimento.

Validação:1673testesPHP/7839asserções, sem falhas/erros/warnings, mantendo1depreciação e1ignorado; PHPStan sem erros novos/baseline preservado,23JS e build.9 verificaçõesHTTP: formulários nativos preservados, OS faturada sem controles e POST403, item ausente422, remoção inválida404, CSRF403 e perfil sem valores/controles comerciais. Navegador: ciclo real com desconto/fracionamento, confirmação de remoção e validação vazia; larguras360/390sem overflow após estabilizar o layout e sem IDs duplicados. Não é homologação completa ou teste físico. A tentativa inicial de teste revelou idOs ausente no formulário extraído; corrigido e coberto por teste. Uma fixture unitária sem ID de item gerou aviso e foi corrigida; relatório válido é itens-phpunit-final.txt.

As funções de edição técnica, recebimento, compartilhamento e envio de anexos continuam nas telas existentes. Este lote integra operações de itens; não declara toda a fase operacional ou novas entidades implementadas.

### Anexos e link no resumo

O resumo reutiliza o formulário nativo de upload (200 MiB por arquivo), mantém imagem/vídeo na galeria e oferece marcação Público por arquivo a quem tem `vOs` e `eOs`. A rota POST `trifase/visibilidade` valida vínculo do anexo com a OS, CSRF e valores; a transação altera somente esse arquivo. Novos uploads continuam privados. Erro de rede deixa o controle desabilitado com estado não confirmado, evitando anunciar uma privacidade que o servidor não confirmou.

O link ativo permanece disponível para copiar; gerar, renovar e revogar retornam ao resumo pelo destino fechado `voltar=resumo` somente no piloto. Revogação exige confirmação. As rotas clássicas permanecem disponíveis e o piloto segue desativado por padrão.

### Edição técnica e recebimentos no resumo

OS faturada/gerida permite editar os mesmos campos técnicos da tela existente, em seção recolhível “Editar OS”. O modelo mantém a lista fechada de campos e protege valores/vínculos/conclusão. OS ainda não faturada continua com o formulário completo nativo. A cobrança e o recebimento parcial usam os mesmos endpoints, permissões, CSRF, centavos e chaves idempotentes do financeiro; o retorno AJAX ao resumo existe somente com o piloto ligado. Em erro, o formulário permanece preenchido e mantém a chave da operação.

Andamento de OS gerida é atualizado na mesma tela com as opções existentes. Finalizar não quita a OS. O histórico, a correção de recebimentos e a conciliação de legado continuam na tela financeira; não há conciliação automática nem transferência de dinheiro.

### Recibo por recebimento

`trifase_financeiro/recibo/{os}/{evento}` exige `vOs` e `vLancamento`, aceita somente GET/HEAD e confere que o evento é recebimento daquela OS. O documento mostra o valor e a data imutáveis desse evento, a forma e o cliente. Não representa quitação total. Eventos estornados aparecem com indicação explícita e data do estorno; chaves idempotentes, hashes e motivos internos não são enviados à view. Não há publicação pelo token do cliente. Impressão usa folha responsiva e CSS próprio de documento; o emitente precisa estar configurado para entregar ao cliente.

### Lista e continuidade visual

Com o piloto habilitado, o layout autenticado usa os tokens azul/prata também nas telas existentes (cadastros, início, financeiro e formulários). `?apresentacao=classica` preserva a aparência anterior da página e o default continua desligado. A mudança de tema não equivale a implementar todas as funções novas do protótipo.

Na lista de OS, Andamento e Pagamento ficam separados. A projeção financeira é consultada em lote apenas para a página atual e somente com `vLancamento`; perfis sem essa permissão não recebem coluna ou valores na lista do piloto. Previsão substitui o rótulo ambíguo Entrega, sem transformar a data prevista em registro real de retirada. Filtros e paginação permanecem nativos.

### Entrega física — etapa concluída

Retirada integrada no resumo, com recebedor, data real, itens e confirmação de condições. Saldo pendente permanece pendente; terceiro exige autorização. Correção preserva o original, permite nova entrega e mantém comprovante cancelado consultável. Permissões configuráveis e flag própria desligada por padrão. Detalhes, isolamento e evidências em `ENTREGAS_LAB.md`. Etapa concluída. Em02/11/2026 o usuário autorizou retomar as etapas seguintes.


### Identificação e histórico de equipamentos

Catálogo de marca/modelo separado da unidade do cliente, com selo/série/IMEI privados e retrato de entrada por OS. Cadastro e reuso no resumo; nova OS pede novos itens/estado/defeito e não copia laudo ou valores. Migração e flag próprias; detalhes, limites e validação em `EQUIPAMENTOS_LAB.md`.
