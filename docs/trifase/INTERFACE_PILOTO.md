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
