# Clientes, catálogo e correções privadas

Implementado no laboratório8230 em02/11/2026. `TRIFASE_CADASTROS_ENABLED=false` por padrão; migração aditiva20261102050000. Não altera produção, instalação8200 ou Penpot.

## Uso

A ficha nativa `clientes/visualizar/<id>` reúne categoria, orientações e histórico, sem novo menu. Categoria opcional: **Não classificado, Bronze, Prata ou Ouro**. Cadastros novos continuam não classificados até uma escolha explícita. A listagem exibe a categoria atual; não há regra automática de desconto, prioridade, restrição de atendimento ou classificação por pagamentos.

Orientações devem ser objetivas, como preferência de contato ou necessidade de aprovação escrita. São privadas, inclusive suas versões anteriores: não entram em documentos, link público, área do cliente ou respostas genéricas da API. A extensão não reaproveita campos legados que já possam ter outra visibilidade.

No histórico de equipamento, **Identificação atual e correções** permite corrigir selo, série e IMEI; **Consultar ou editar modelo** abre tipo, marca e modelo. O catálogo pode ser pesquisado a partir da identificação da OS. Não exclui ou une modelos, não muda o proprietário nem transfere uma unidade entre clientes. O tipo, marca/modelo e selo guardados em cada OS anterior permanecem imutáveis; próximos atendimentos usam o cadastro corrigido. As versões da correção explicam a diferença. Não corrige retroativamente o comprovante antigo ou a identificação vinculada à OS.

## Integridade e acesso

`trifase_cadastros_eventos` guarda antes/depois, motivo obrigatório, operador, horário, chave idempotente e hash do pedido. Trava o cadastro antes da alteração e exige a versão vista pelo operador; uma janela antiga não sobrescreve a nova. Reenvio idêntico não duplica; mesma chave com outros dados é recusada. Selo e chave normalizada de modelo continuam únicos.

Consulta de relacionamento exige `vCliente`; POST também exige `eCliente`. Catálogo/unidade exigem `vOs`, e POST também `eOs`. Controles ocultos não substituem essas checagens. Sem nova permissão automática por nome de cargo. Usuário autorizou expressamente seis permissões nativas de adicionar/editar cliente/produto/serviço somente no perfil1 do laboratório; perfis restritos não foram ampliados e nenhuma exclusão foi concedida.

A exclusão nativa/API de cliente verifica os históricos protegidos antes de remover OS/itens em cascata. A proteção continua com a apresentação desligada. A manutenção não altera técnico, financeiro, estoque, datas ou garantia.

## Evidências

Testes executam o modelo, incluindo categoria inválida, versão obsoleta, idempotência, selo duplicado, preservação do dono e antes/depois. HTTP verifica permissões/CSRF e preservação da identificação antiga. Navegador confere a ficha integrada e categoria Prata; largura CSS efetiva360, sem transbordamento horizontal. Evidências em `outputs/ui-piloto/cadastros-estoque-*` e `clientes-relacionamento-*.png` no workspace, fora do Git.

Não há transferência de dono, fusão de modelos, checksum de IMEI, edição retroativa de documentos ou filtro por categoria na listagem. Não prometer homologação completa da API ou aparelho físico.
