# Nova OS com cadastro de unidade — laboratório 8230

Implementado em 03/11/2026, sobre `7a2b7eb`, na branch `v5-trifase`.

## Comportamento

A Nova OS oferece usar unidade existente, cadastrar uma nova ou identificar depois. O cadastro novo reaproveita marca/modelo do catálogo por lista filtrável ou permite preenchê-los no próprio formulário. Exige selo, série ou IMEI e os itens/estado desta entrada. Esses identificadores privados não são copiados para a descrição geral da OS.

Trocar o modo preserva o rascunho; a descrição manual não é substituída automaticamente. Erros de validação mantêm os campos. Um modelo selecionado é recarregado do banco no servidor, inclusive ao retornar um formulário inválido. A unidade pertence ao cliente escolhido ao salvar.

OS, histórico inicial, modelo, unidade e retrato da entrada são gravados na mesma transação. Falhas desfazem o conjunto. Selo repetido é recusado; reenvio de chave já utilizada é recusado antes de criar outra OS. A unicidade no banco continua protegendo a chave em concorrência. Nenhuma migração, rota nova ou concessão de permissão: usa os controles existentes de criação/consulta de OS e a flag de equipamentos.

## Validação

- PHPUnit: 1829 testes, 8569 asserções, nenhuma falha ou erro; há aviso de depreciação e um teste ignorado na suíte existente. Foco Nova OS/unidade: 14 testes, 74 asserções, sem avisos.
- JavaScript: 209 casos aprovados; execução padrão isolada também concluída. Build concluído depois de instalação offline das dependências.
- PHPStan sem erros; verificação de escape sem novas ocorrências. Formatação aplicada aos PHP alterados; detector Impeccable retornou `[]`.
- Playwright: criação pela interface, modelo do catálogo, limpar modelo, alternar modos, identificação obrigatória, selo duplicado e preservação de rascunho, catálogo canônico após POST adulterado com data inválida. Capturas conferidas em 1440 e 360 pixels, sem excesso horizontal no formulário.
- Comparação de banco: os registros anteriores permaneceram iguais; entraram uma OS, um histórico, um modelo, uma unidade e um vínculo, além de sessão/logs. Nenhum financeiro, estoque ou anexo alterado.

Fixture única criada: **OS 9060**, cliente QA existente 9050, selo `QA-NOVA-20261103-C1`. Não repetir o roteiro de criação: `envio.json` guarda o envio realizado. Backups privados antes/depois em `work/ui-piloto/backups/`, fora do Git; evidências em `outputs/nova-os-cadastro-unidade/` na pasta do projeto.

## Limites

Testes confinados ao 8230. Não houve push nem alterações em produção, 8200, Penpot, master ou trabalho. Mobile físico e corrida simultânea deste formulário não foram executados. A bateria completa integrada antes de produção continua necessária. Unicidade de série/IMEI segue o modelo preexistente; esta etapa não altera suas regras.

## Busca e cadastro de cliente na Nova OS

O campo Cliente lista até25cadastros ao clicar e filtra desde a primeira letra; o servidor permite busca vazia e ordena por nome. O cadastro rápido existente é aberto pelo rodapé Cadastrar novo cliente ou pelo botão Cadastrar cliente, preenche o nome digitado, salva sem navegar e seleciona o novo cliente. Não salva OS provisória nem perde os demais campos do formulário. A opção exige aCliente.

Por autorização explícita do usuário nesta etapa, somente o perfil técnico2 do laboratório8230 recebeu aCliente; demais permissões foram preservadas e a cópia anterior está em work/ui-piloto/backups/perfil2-antes-cadastro-cliente.json. Não há grant automático em código, nova permissão ou alteração de produção.

Validação:21testesPHP/143asserções; navegador com técnico conferiu listagem vazia, filtro de uma letra, seleção existente, resultado inexistente, cadastro no modal, retorno com id selecionado, preservação de equipamento/defeito/observações e apenas uma aba. Cliente fictício9054(QA Busca Cliente Inline 20261103), sem documento/contato inventado; nenhuma OS criada. Tela360px sem excesso horizontal, sem errosJS. Build, escape, formatação e diferenças aprovados; evidências em outputs/nova-os-busca-cliente/.

## Selo aplicado após a finalização

A pedido do usuário, selo, série e IMEI são opcionais na entrada. Cadastro/vinculação e correção da identificação aceitam os três campos vazios; cada equipamento continua com id interno próprio e selo vazio não participa da chave única. O selo pode ser informado depois por Editar identificação, com histórico desta OS. Não altera automaticamente o cadastro da unidade para próximos atendimentos, nem muda prazo de garantia. Regras de selo duplicado quando preenchido e exigências próprias da troca em garantia permanecem.

Validação:12testesPHP/77asserções, incluindo duas unidades distintas sem identificador, reenvio sem duplicação e preenchimento posterior do selo; suíteJS e build aprovados; navegador confirmou identificadores vazios válidos na Nova OS, sem criar registros. Formatação e diferenças aprovadas.

## Descrição automática e texto anterior

Na Nova OS com equipamento selecionado/cadastrado, o campo livre de descrição fica oculto e a descrição usada é Marca · Modelo, sem selo/série/IMEI. O servidor confirma essa descrição a partir da identificação vinculada na mesma transação de criação. Ao escolher Identificar depois, o campo livre aparece; alternar opções preserva o rascunho manual.

Edição de OS identificada não sobrescreve descrição existente: se houver texto diferente de Marca · Modelo, ele continua editável em Descrição anterior da OS, recolhida inicialmente. Descrições iguais ao modelo ou vazias ficam ocultas; OS sem identificação mantém o campo disponível. Nenhum registro antigo foi atualizado nesta mudança.

Navegador conferiu Nova OS nos modos de descrição manual/novo equipamento, geração LG · MODELO-QA e restauração do rascunho; consulta da edição9058 confirmou texto anterior preservado em bloco recolhido. Nenhum formulário foi salvo no laboratório. Build, suíteJS e PHPStan aprovados. Testes da criação com vínculo conferem a descrição persistida; fixtures dos testes de view foram atualizadas para incluir anotações/histórico já presentes no resumo.
