# Correção da identificação de uma OS

No laboratório 8230, o quadro **Identificação do equipamento** oferece **Editar identificação** para quem pode consultar e editar OS (`vOs` + `eOs`). Marca, modelo, selo, série, IMEI, itens recebidos e estado na entrada podem ser corrigidos. O motivo é obrigatório; pelo menos selo, série ou IMEI deve continuar preenchido.

A correção acrescenta um evento com operador, data, motivo e todos os campos antes/depois. A OS exibe o último evento; o histórico mostra as diferenças. O retrato original em `trifase_os_equipamentos` não é alterado. Cadastro da unidade/modelo, unidade vinculada, cliente, demais OS, entrega, garantia, financeiro, estoque e mídias não são reescritos. Correção não equivale a substituição física nem a recadastro da unidade para futuros atendimentos. Comprovantes anteriores continuam com seus dados registrados.

Migração aditiva `20261103010000`, sem novos perfis ou concessões. O endpoint `trifase_equipamentos/corrigir/{os}` aceita POST autenticado com CSRF e exige `vOs` + `eOs`. Trata campos, tamanhos e identificadores no servidor. Trava compartilhada por OS, versão otimista e chave idempotente evitam perda de correção concorrente ou duplicação por reenvio. Ausência de mudança, conflito, motivo vazio ou identificação física totalmente vazia são recusados. A correção fica disponível também em OS encerradas, sem reabrir o atendimento ou alterar comprovantes.

## Validação no laboratório

- Suíte PHP: 1860 testes, 8792 asserções, sem falhas; uma depreciação e um skip preexistentes. Teste adicional cobre preservação do original/cadastro/OS, projeção atual, histórico, reenvio, conflito e entrada inválida. Após ampliar as colunas de histórico para LONGTEXT e acrescentar caso Unicode de 10000 caracteres, o foco foi repetido.
- PHPStan, escape e formatação aprovados. Build concluído; visualização desktop e celular 360px conferida sem excesso horizontal.
- Formulário salvo pelo técnico na fixture **OS 9064**, ligada à mesma unidade da OS 3. A OS 3 foi somente consultada. Histórico antes/depois, reenvio idempotente, conflito com CSRF renovado e bloqueio de POST para perfil somente leitura com CSRF próprio válido conferidos no navegador.
- Após preparar a fixture, hashes de 53 tabelas de negócio permaneceram iguais; somente a nova tabela de correções recebeu um evento. Sessões/logs são excluídos dessa comparação. Migração também conferiu as tabelas anteriores.
- O primeiro roteiro de UI interrompeu após salvar devido a uma corrida entre redirecionamento e reload no teste. A validação final retomou o evento existente, sem criar outra correção; formulário mutável original tem guarda contra reexecução. Tentativas iniciais de POST com token CSRF antigo foram corrigidas no roteiro antes de afirmar validação de conflito/permissão.

Evidências locais: `outputs/equipamento-correcao/`, incluindo roteiro original, validação final, capturas e `concluido.json`. A fixture e seu evento ficam no laboratório para inspeção; não foram removidos ou aplicados à produção.
