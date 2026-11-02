# Conclusão técnica sem cobrança — laboratório8230

Recorte implementado em02/11/2026 como preparação do retorno em garantia: uma OS pode ser concluída mesmo sem obrigação financeira, cobrança, lançamento ou recebimento. Não criar receita de zero nem marcar pagamento fictício. Prazo/data de conclusão não dependem da previsão de entrega.

## Registro e compatibilidade

Migração20261102030000 cria somente `trifase_atendimentos`: OS, data real, prazo concedido naquele momento, operador e data do registro. Não converte registros anteriores. FKRESTRICT e guard no painel/API protegem a conclusão contra exclusão; referência e prazo registrados permanecem usados mesmo com flag desligada. Sem down destrutivo.

`TRIFASE_ATENDIMENTOS_ENABLED=false` por padrão, true apenas no8230. Backup privado95225bytes antes da migração; aplicação repetida duas vezes preservou17tabelas anteriores. Consulta prefere conclusão/prazo próprios, depois referência já conhecida do financeiro; legado sem registro mantém a regra anterior. Não usar automaticamente previsão antiga como data real para preencher a tabela nova.

A primeira transição para Finalizado registra hoje e o prazo nativo0a9999dias (vazio=0). Conclusão conhecida é preservada; refinalizar não inicia outro prazo. OS já finalizada sem referência conhecida exige declaração explícita da data real; ela deve estar entre a entrada e hoje e só pode ser informada uma vez. Não corrigir silenciosamente data/prazo já registrados. Correção auditável de conclusão fica fora deste recorte.

Reabrir antes da retirada preserva a conclusão; OS com retirada ativa não reabre pela ação técnica. Cancelamento e conciliação financeira continuam nos fluxos existentes. Retorno em garantia será outra OS ligada à unidade/origem, não reabertura automática.

## Integração

`trifase_atendimentos/andamento/{os}` e `conclusao/{os}`:POST,CSRF,vOs+eOs, confirmação no formulário. Técnico não precisa receber vLancamento para atualizar andamento. Resumo oferece a ação em OS geridas ou sem receita; mostra conclusão real. OS de totalzero informa ausência de valor a cobrar e não oferece formalização de zero.

A edição/criação nativa também participa do registro de conclusão sob transação. Prazo já registrado não é substituído por edição da OS. Previsão continua editável sem alterar a referência. Criação já Finalizada registra a conclusão atomicamente; falha de conclusão reverte a OS. Métodos técnicos do modelo financeiro delegam à regra comum com a flag ligada ou quando há conclusão própria. Não alteram a tabela de obrigação para concluir novas OS. API continua desligada no laboratório; com a função ativa, conclusão e edição de registros já concluídos exigem ações técnicas dedicadas, sem simular suporte novo porPUT/POST genéricos.

## Evidência

1.731 testesPHP/8.164asserções sem falhas/erros/warnings;1depreciação+1ignorado preexistentes. PHPStan sem novos erros/baseline preservado;23JS/build/escape aprovados. Suíte exercita finalizar sem obrigação, preservar data conhecida, datas inválidas, conclusão única, reabertura antes/depois da retirada e prazo vazio sem garantia inventada.

15checksHTTP:permissão/CSRF/GET/confirmação negados; técnico sem financeiro; repetição/refinalização preserva referência; data antiga explícita e futura recusada; previsão editada sem deslocar garantia; troca de prazo recusada; criação finalizada atômica e falha semOSórfã. Primeira coleta verificou a mensagem na resposta da edição, mas o fluxo nativo retorna ao próprio formulário; coleta corrigida para consultar a OS e repetida com fixture antiga nova, sem redefinir conclusão já registrada.

Navegador:OS9020 finalizada sem faturar, garantia90dias a partir de02/11/2026 até31/01/2027. Previsão da fixture foi deliberadamente alterada de2099para2098 para provar independência. Formulário conferido em larguraCSS396semoverflow; não é teste físico. Auditoria porPK/hash preservou17tabelas anteriores, incluindo OS3 do usuário, orçamento e financeiro. Nenhuma nova receita/obrigação/retirada/anexo;4conclusões deQA. OS9020/9021/9023/9024exclusivas deQA;9024criada finalizada pela tela nativa. Não repetir seeds ou scripts mutáveis.

Relatórios `atendimento-http.json`, `atendimento-audit.json`, `atendimento-phpunit-final.txt`, `atendimento-phpstan-final.txt` e imagens em `outputs/ui-piloto/`. Próximo recorte: retorno em garantia vinculado à unidade/OS original, cobertura e solução justificadas, sem mudar prazo ou pagamentos da origem automaticamente.

Atualização02/11/2026:retorno por equipamento implementado em `RETORNOS_LAB.md`. Origem com retorno não muda de status por reabertura/cancelamento; conclusão de retorno não concede novo prazo.
