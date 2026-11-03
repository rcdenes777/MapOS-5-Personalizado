# Separação entre OS operacional e financeiro — laboratório 8230

Correção solicitada pelo usuário em 03/11/2026, sobre `ec5395e`.

## Localização

**Ordens de serviço** é a listagem técnica: busca, andamento, fila e datas. No piloto, não exibe Situação financeira, Saldo a receber nem colunas Total/Pagamento/Saldo, mesmo quando quem acessa é administrador. O controller não carrega os resumos de cobrança para essa página.

**Financeiro → OS e recebimentos** (`financeiro/ordens`) concentra os filtros financeiros e a consulta dos valores. A aba aparece junto de Lançamentos. A consulta mantém andamento, fila, busca e datas para cruzar as informações, mas não oferece editar/excluir a OS nem mostra a descrição técnica do equipamento. Há atalhos para consultar a OS e abrir seu financeiro individual. O link do cliente respeita `vCliente`.

O atalho de saldo do painel agora abre o Financeiro. Endereços antigos de OS com filtros financeiros válidos encaminham para essa área preservando os parâmetros, depois de verificar as permissões. Limpeza e paginação permanecem no contexto escolhido.

## Permissões e regras preservadas

A rota nova exige **vOs + vLancamento**, as mesmas permissões que antes eram necessárias para consultar esses valores na listagem e no financeiro individual da OS. O mapa de rotas e a checagem dentro do método correspondem. Não foram alterados perfis ou concedidas capacidades. A consulta só aceita GET/HEAD e requer os módulos piloto/financeiro já existentes; não há nova variável ou migração.

A separação usa contexto definido pelo servidor no template compartilhado; não é um campo que o usuário possa habilitar na query string. Na área financeira, totais, recebimentos, saldos, estornos e reembolsos continuam usando o resumo canônico existente. Faturamento anterior mantém saldo Não apurado. Nenhuma obrigação ou evento foi recalculado/gravado. Com a interface piloto desligada, a listagem nativa permanece.

Esta mudança trata a listagem de OS e seus filtros/atalhos; não redefine as permissões de edição de produtos/serviços ou os demais módulos do sistema.

## Validação

- PHP: 1851 testes / 8683 asserções sem falhas ou erros; depreciação antiga de TemaCorTest e um skip. Foco inicial de rota, permissões e views:455testes/1169asserções.
- JavaScript:209casos aprovados, além da execução isolada padrão. Build, PHPStan, formatação, escape e detector Impeccable aprovados.
- Navegador:26checks. Administrador vê listagem técnica sem dados de cobrança; aba financeira disponível por navegação real; sete situações preservadas inclusive vazias, filtros combinados, paginação financeira, ações sem edição técnica, links antigos encaminhados, link do painel atualizado, perfil sem financeiro bloqueado por403real/AJAX. Capturas1440/360conferidas.
- Hashes de37tabelas com dados iguais antes/depois, excluindo sessões/logs. Nenhuma fixture nova, push ou alteração em produção,8200,Penpot ou nos três documentos preexistentes.

Evidências: `outputs/separacao-financeiro/` na pasta canônica do projeto. Mobile físico e regressão integrada para produção continuam pendentes. A referência visual permanece o sistema atual com seus componentes e tema.
