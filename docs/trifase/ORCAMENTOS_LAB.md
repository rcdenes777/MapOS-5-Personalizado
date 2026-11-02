# Orçamento publicado e decisão do cliente — laboratório8230

Fluxo aprovado em02/11/2026: funcionário autorizado confere a prévia de peças, serviços, descontos e valores, confirma a divulgação e publica uma versão. Quem possui o link ativo da OS pode consultar essa versão, informar nome e confirmar aprovação ou recusa. A resposta é declarada por quem possui o link; não comprova identidade nem equivale a assinatura digital certificada.

## Contratos

- Versão guarda somente retrato comercial fechado, com centavos, hash, número, operador e data. Não expõe custo de compra, dados do cadastro do cliente, anotações, laudo, identificadores físicos ou chaves internas. A página imprime apenas nomes de itens, quantidades, preços, descontos, total e resposta declarada.
- Preço/quantidade/desconto vêm das regras e registros nativos no servidor. Prévia com hash diferente é recusada. Publicação explícita; editar itens não publica automaticamente.
- Mudança dos itens/valores/cliente ou cancelamento da OS torna o orçamento anterior indisponível para consulta/decisão pública. Requer nova publicação conferida. Versões e decisões antigas permanecem internas, sem sobrescrita. Pagamento e andamento continuam independentes; aprovação não fatura, recebe, move estoque, entrega ou muda garantia.
- Estado aponta uma versão publicada. Cada versão aceita uma única decisão. Reenvio com mesma chave/payload é idempotente; outra decisão não substitui a anterior. Retirar a publicação preserva versão/resposta; uma nova publicação recebe outro número. Sem prazo próprio adicional: acesso depende da validade/revogação do link da OS.
- Publicação, retirada, resposta e mutações nativas compartilham trava da OS. Token/validade, versão e hash são revalidados dentro da transação da resposta. Revogar/reemitir link bloqueia formulário antigo. Eventos e versões não são apagados; exclusão da OS com histórico é bloqueada mesmo com flag desligada.

## Segurança e ativação

`TRIFASE_ORCAMENTOS_ENABLED=false` por padrão. Migração aditiva20261102020000 cria versões, eventos e projeção de publicação; sem down destrutivo. Backup privado81017bytes antes da aplicação duas vezes no banco `mapos_ui_piloto`;14tabelas anteriores preservadas. Ativação somente no8230.

Rotas `trifase_orcamentos/visualizar/{os}`:vOs+vLancamento; publicar/retirar: tambémeOs+publicarOrcamento. Nova permissão configurável no cadastro de perfis. Usuário autorizou explicitamente concedê-la ao administrador fictício do laboratório; sem concessão em outras instalações. Tela esconde controles, servidor também nega.

Rotas `orcamento_publico/ver/{token}` GET/HEAD e `responder/{token}` POST usam capacidade do link, sem login do painel. CSRF continua obrigatório, sem nova exclusão. Cabeçalhos no-store/no-referrer/noindex, CSP própria sem script e form-action self apenas nessa página. Controller público anterior permanece somente GET/HEAD, com CSPform-actionnone. A página de acompanhamento oferece acesso ao orçamento somente quando a versão está publicada e válida. Não gerar link nem enviar mensagem a cliente real durante QA.

## Verificação

36 checksHTTP em fixtures9010/9012: permissão específica/financeiro negados, GET/CSRF, confirmação obrigatória, nomes inválidos, versão adulterada, publicar/repetir, recusar/repetir/conflito, mudar valor e bloquear prévia/resposta antiga, nova versão, aprovar, retirar, revogar e token inválido. Navegador exerceu publicação e aprovação daOS9010 em duas versões. Total280 corresponde a peça2×50menos10, serviço200 e desconto geral10. Formulário a360px sem overflow horizontal; não é teste físico.

Duas execuções PHP/MySQL independentes na versão3 daOS9012: uma decisão criada e outra recusada. Auditoria confirmou uma decisão por versão, conteúdo/hash histórico íntegro, registros anteriores de14tabelas preservados e nenhuma cobrança/recebimento/entrega/anexo adicional. OS3 do usuário preservada. Fixtures9010/9011/9012 abertas e não faturadas; produto9010 sintético tem estoque próprio. A coleta inicial parou numa expectativa incorreta de exclusão: o perfil não possuía dOs e recebeu403. Repetida em fixture9012 com essa limitação explicitada; não declarar ensaio HTTP do guard interno de exclusão. API permanece desligada, proteção incluída no código sem teste HTTP da API.

Relatórios `orcamento-http.json`, `orcamento-concorrencia.json`, `orcamento-audit.json`, `orcamento-phpunit-final.txt`, `orcamento-phpstan-final.txt` e imagens em `outputs/ui-piloto/`. 1.721 testesPHP/8.125asserções, sem falhas, erros ou warnings; uma depreciação e um ignorado preexistentes. PHPStan sem novos erros, baseline preservado;23JS, build e escape aprovados. SuítePHP inclui preço, isolamento de OS/token, idempotência, substituição imutável e rollback de falha simulada ao gravar a projeção. Uma tentativa inicial do teste de falha gerou aviso esperado do SQLite: tratamento restrito ao aviso simulado, sem silenciar os demais.

Não repetir seeds/scripts mutáveis. Não alterar8200/produção/master/trabalho/4.55.2/MapOS-Moderno. Sem push. Próximo recorte: conclusão técnica e garantia independentes da cobrança, depois OS de retorno vinculada à unidade e ao atendimento de origem; não criar obrigação financeira fictícia para serviço em garantia.
