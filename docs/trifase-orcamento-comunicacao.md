# Respostas de orçamento e entrega física

## Registro normal pela equipe

Na OS, seção **Compartilhamento**, um operador com `vOs`, `vLancamento`, `eOs` e `publicarOrcamento` pode registrar a resposta comunicada por telefone, WhatsApp ou presencialmente. O registro exige decisão, pessoa que comunicou, data/hora informadas da comunicação e confirmação explícita; observação/referência é opcional e privada.

A decisão permanece vinculada à versão vigente, publicada e com os mesmos itens/valores. Não substitui decisão anterior. `criado_em` registra o horário real do servidor e `usuario_id` identifica o operador; `comunicado_em` é uma informação declarada pela equipe, não uma assinatura ou autenticação do cliente.

Os formulários usam o fuso horário configurado na aplicação e precisão de minuto (`datetime-local`). São recusadas datas futuras ou anteriores ao minuto de criação da versão. O início desse minuto é admitido porque o formulário não informa segundos. Não alterar a data de criação de uma versão para contornar essa validação.

Observação e justificativa admitem múltiplas linhas: CRLF é normalizado para LF antes da validação de comprimento, do hash de idempotência e da gravação. O limite é de 2000 caracteres no texto normalizado; a justificativa continua exigindo ao menos 5 caracteres após `trim`. CR isolado, NUL, os demais controles C0/C1, DEL, controles bidirecionais e UTF-8 inválido continuam proibidos. As duas informações permanecem privadas e escapadas na apresentação HTML.

Nos formulários URL-encoded da aplicação, apenas esses dois campos são lidos do fluxo original antes da validação do modelo: isso impede a limpeza global do CodeIgniter de remover DEL/UTF-8 inválido silenciosamente e transformar a solicitação em uma decisão válida. Os demais campos, autorização e CSRF conservam seus caminhos existentes. As ações de resposta e regularização recusam explicitamente outros formatos de POST, inclusive `multipart/form-data`, antes de gravar: esses formulários não enviam arquivos. Integrações manuais devem enviar `application/x-www-form-urlencoded`, não multipart. O histórico usa `pre` escapado com quebra automática, pois o compressor HTML existente elimina LF de parágrafos comuns; o compressor global não foi alterado.

## Entrega ativa

A fonte do bloqueio é `Trifase_entrega_model::ativa()`, não o status técnico nem a feature flag de entrega. A regra permanece válida mesmo que a interface de entrega seja desabilitada depois de registrar a retirada.

As respostas pública e interna verificam a entrega **dentro da mesma transação/trava da OS** usada para registrar/corrigir retirada. Um POST direto não contorna a regra. Se a entrega ganhar a disputa, a nova decisão normal é negada. Se a decisão ganhar, a entrega posterior segue as regras existentes.

Novas publicações também são bloqueadas sob essa mesma trava enquanto houver entrega ativa **da própria OS**; o formulário interno é ocultado, e o POST direto é recusado sem substituir a versão aprovada. A entrega da origem de um retorno em garantia não bloqueia o orçamento da OS de retorno ainda não entregue; as regras de avaliação `novo_orcamento` continuam exigidas. Status `Finalizado` sem entrega física não acrescenta esse bloqueio. Após correção administrativa motivada da entrega, a publicação volta a depender das regras de elegibilidade existentes, sem apagar o histórico físico.

O reenvio idêntico de uma publicação registrada antes da entrega recebe apenas o identificador histórico, sem criar versão, reativar publicação antiga ou alterar eventos. Outros dados com a mesma chave continuam conflitantes. A verificação de entrega fica depois desse reconhecimento de reenvio e antes de qualquer nova gravação.

Um reenvio idêntico de operação já registrada apenas confirma o resultado anterior; não cria outro evento. A chave com outros dados é recusada. Versão substituída, publicação retirada, cancelamento ou token inválido continuam sendo reavaliados.

O orçamento, a resposta anterior, acompanhamento e anexos autorizados continuam disponíveis segundo a publicação/validade existentes. O cliente vê **“Equipamento entregue. Este orçamento está disponível somente para consulta.”**; o link não é revogado automaticamente. Corrigir uma entrega não apaga seu histórico e apenas permite nova avaliação da elegibilidade atual.

## Regularização administrativa tardia

É uma ação excepcional e separada do registro normal. Só admite versão atual elegível, ainda sem decisão, com entrega ativa e comunicação informada não posterior à retirada física. Uma comunicação no mesmo minuto da retirada é admitida pela precisão do formulário; isso não comprova a ordem dos fatos, que deve ser sustentada pela justificativa/evidência administrativa.

Exige os dados da comunicação, justificativa de 5 a 2000 caracteres, operador autenticado e confirmação explícita. O evento de decisão é o mesmo mecanismo existente, com `regularizacao_tardia=1`, `justificativa` privada e `entrega_id` apontando para a entrega auditada. A data real de registro permanece em `criado_em`.

**Não altera** entrega, status técnico, histórico técnico, valores, cobranças, pagamentos, estornos, estoque ou garantia. Não reabre a OS. A restrição única de `decisao_versao`, a trava por OS e a chave de idempotência também se aplicam à regularização.

### Política de acesso decidida — concessão pendente

A rota `trifase_orcamentos/regularizar_resposta/{id}` exige todas as permissões comuns de resposta **e** `regularizarOrcamento`. A nova permissão aparece no cadastro de grupos, mas **nenhuma migration a concede**, inclusive ao Administrador. Grupos existentes que não a possuem permanecem sem acesso; o formulário não aparece e POST direto é negado.

Decisão do proprietário para futura implantação: conceder inicialmente **apenas ao grupo Administrador**. Não incluir Financeiro ou Técnico automaticamente. Essa configuração não é aplicada nesta missão; qualquer concessão em produção depende de outra missão autorizada. Permissões de laboratório só se aplicam a usuários sintéticos.

## Histórico e privacidade

A apresentação distingue resposta enviada pelo link, registrada pela equipe em cada canal e regularização tardia. Respostas legadas sem canal não são reclassificadas como telefônicas. Operador, observações e justificativa só aparecem nas telas internas autorizadas, nunca no link público. Nomes e demais textos são escapados.

## Atualização do banco

As migrations aditivas `20261119010000_trifase_orcamento_comunicacao` e `20261119020000_trifase_orcamento_regularizacao` acrescentam metadados aos eventos existentes, sem preencher ou reescrever decisões históricas. Campos de comunicação/justificativa/referência ficam nulos no legado; a flag tardia inicia em zero. Não executar `down` para apagar histórico.

Aplicar e reaplicar primeiro em banco descartável. Atualização de produção, migrations de produção e deploy exigem missão e autorização separadas; não fazem parte desta implementação.
