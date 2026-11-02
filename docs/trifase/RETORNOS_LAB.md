# Retorno em garantia por equipamento — laboratório8230

Implementado o recorte operacional aprovado: abrir outra OS para a unidade que voltou, preservar a origem e o prazo original, registrar novo defeito/entrada, diagnóstico, avaliação de cobertura, solução e histórico. Não reabrir automaticamente a OS antiga. Estar dentro do prazo é indicação temporal, não aprovação de cobertura.

## Dados e integridade

Migração aditiva20261102040000 cria `trifase_garantia_retornos` (OS nova, origem raiz, atendimento anterior, unidade, cliente, conclusão/prazo/vencimento originais, operador, chave/hash) e `trifase_garantia_eventos` (avaliações, custos declarados e correções). Sem down destrutivo. FKRESTRICT preserva vínculos. Backup privado102793bytes antes da aplicação duas vezes no banco `mapos_ui_piloto`, com18tabelas anteriores preservadas.

Origem/anterior devem estar Finalizados, identificar a mesma unidade/cliente e ter conclusão real conhecida. Não inferir conclusão a partir da previsão. Registro próprio é preferido; referência financeira antiga já conhecida continua válida. Vínculos incompatíveis são recusados. A criação reaproveita a unidade e o cliente no servidor; não aceita cliente/unidade/preço da requisição como origem de verdade. Novo defeito, itens recebidos e estado são obrigatórios. Laudo, observações, itens cobrados, anexos, tokens e recebimentos antigos não são copiados.

A nova OS começa Aberto, não faturada, sem receita e sem novo prazo concedido. Conclusão do retorno registra prazo própriozero; a referência de garantia aparece no módulo e no resumo como prazo da OS de origem. Edição nativa não concede outro prazo. Retorno posterior mantém a raiz e o vencimento originais, inclusive após concluir o atendimento intermediário. Não há extensão automática nem política nova de prorrogação.

Uma unidade tem no máximo um retorno ativo (diferente de Finalizado/Cancelado). Origem e anterior são travados em ordem, junto com a unidade e a OS nova. Reenvio com mesma chave/payload mantém o mesmo atendimento; outra entrada concorrente não cria duplicata ativa. Falha depois de criar a OS e vincular a unidade reverte toda a transação. A origem que já gerou retorno não reabre nem muda de status pelo formulário nativo; seu histórico continua preservado.

## Avaliação e custos

Cobertura:Em avaliação/Coberto/Não coberto. Diagnóstico obrigatório ao concluir a avaliação. Cada revisão exige justificativa, operador e chave idempotente; uma tela desatualizada não sobrescreve outra avaliação. Eventos anteriores são imutáveis.

Soluções registráveis:reparo sem cobrança, novo orçamento, troca ou devolução do valor. São decisões documentadas: não criam orçamento, não movem estoque e não executam cobrança, estorno ou reembolso. A operação efetiva continua nos fluxos próprios. Prazo expirado permanece em avaliação até decisão humana.

Custo interno e tempo são declarações da equipe, com referência/descrição. Não são preço cobrado, despesa paga ou movimentação de estoque; não importar retroativamente preço de compra atual como custo histórico. Totais mostram apenas custos/tempo registrados neste retorno e nos retornos da unidade, sem inventar custos antigos. Correção gera outro evento, desconta uma única vez e sinaliza o original como Corrigido, preservando valor, autor e data. Integração automática com custo de peças, mão de obra tarifada e estoque fica fora deste recorte.

## Permissões, privacidade e interface

`TRIFASE_RETORNOS_ENABLED=false` por padrão. Somente8230 ativado, com equipamentos e atendimentos também ativos. Consulta: vOs; criação: vOs+aOs+eOs; avaliação: vOs+eOs; custos/correção: tambémvLancamento. Perfil sem financeiro recebe diagnóstico e não recebe valores, descrições ou controles de custos. Rotas de mutação somentePOST/CSRF; nenhuma exclusão nova doCSRF. Sem permissão nova concedida.

Entrada a partir da OS concluída/identificada. Se a unidade já tem retorno aberto, leva ao existente. No resumo da OS de retorno aparecem cobertura, origem e prazo, com acesso à avaliação/histórico. Revisão e custos são formulários recolhíveis na mesma página. Histórico por unidade liga os atendimentos. Dados de avaliação, custo, selo e histórico interno não foram adicionados à projeção do link público. A API permanece desligada; edição genérica de retorno exige ações dedicadas, sem declarar suporte novo ao fluxo naAPI.

## Verificação e limites

40checksHTTP:leitura/edição/custos negados, CSRF/GET, redirecionamento ao retorno ativo, criação idempotente, duplicata ativa recusada, diagnóstico obrigatório, revisão stale, valores monetários inválidos, centavosptBR, custo/correção idempotentes, histórico preservado, quatro soluções sem efeitos financeiros, proteção da origem, conclusão sem cobrança, segundo retorno, prazo expirado e tentativa de novo prazo pela edição nativa. Navegador percorreu criação, avaliação e custo2550centavos/30minutos. Campo oculto de chave não foi exportado pela ferramenta do navegador(retornounull); coletor corrigido usando a chave persistida da própria fixture, sem mudar seu registro, e roteiro completo repetido. Uma falha de sintaxe no coletor foi corrigida antes de ele executar.

Dois processosPHP/MySQL independentes criaram contra a mesma unidade da origem expirada: umaOS criada e outra tentativa recusada. Auditoria porPK/hash confirmou18tabelas anteriores preservadas, incluindoOS3 do usuário, financeiro, estoque original, anexos, orçamentos e conclusão da origem. Sem novo item, obrigação, recebimento, retirada, anexo ou versão de orçamento. São3retornos/8eventos deQA. Prazo original da unidadeA permaneceu31/01/2027; unidadeBexpirada31/03/2020não ganhou cobertura automática.

Responsividade:formulário/histórico a360px. Foi encontrada e corrigida rolagem horizontal em item degrid com palavra longa; após correção, clientWidth=scrollWidth=345comviewport360. Não é ensaio em aparelho físico ou homologação de todos os fluxos do sistema.

Fixtures:origem9020(unidadeA2), retorno9031concluído/coberto/reparo sem cobrança/custo2550/30min, segundo9033aberto sem avaliação; origem9030(unidadeB1), expirado9032aberto/em avaliação. Fonte legada/produção8200/4.55.2/master/trabalho/MapOS-Moderno preservados. Não repetir seeds ou scripts mutáveis. Relatórios e capturas `retorno-*` em `outputs/ui-piloto/`.

Validação final:1.751 testesPHP/8.248asserções, sem falhas/erros/warnings;1depreciação e1ignorado preexistentes. PHPStan sem novos erros/baseline preservado;23JS, build e escape aprovados. Inclui proteção da origem pelo caminho financeiro antigo mesmo com a flag técnica desligada e conclusão do retorno sem novo prazo, inclusive diante de campo nativo inconsistente.
