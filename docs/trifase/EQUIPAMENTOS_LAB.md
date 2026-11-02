# Identificação reutilizável — etapa concluída no laboratório

Autorização para prosseguir recebida após concluir a entrega (02/11/2026). Recorte inicial: uma unidade física por OS, com catálogo de marca/modelo separado da placa/aparelho do cliente. Selo de garantia, série e IMEI são identificadores da unidade, não do modelo nem do estoque de peças.

Três tabelas próprias: catálogo, unidades vinculadas ao cliente e retrato de identificação por OS. Mesmo modelo pode identificar várias unidades; a mesma unidade pode aparecer em vários atendimentos daquele cliente. Selo normalizado único quando informado. Exigir algum identificador somente ao cadastrar uma unidade reutilizável; OS legada continua com descrição livre sem conversão automática.

Registro de entrada exige informar novamente itens recebidos e estado; não copiar defeito, diagnóstico, laudo, serviços ou valores de atendimento anterior. O vínculo não altera financeiro, estoque, status, conclusão ou garantia. Não substituir a identificação histórica de uma OS já vinculada nem acrescentá-la depois de uma retirada registrada. Transferência de unidade entre clientes e correção auditável da identificação ficam fora deste primeiro recorte; bloquear mudança silenciosa de cliente em OS identificada.

Busca ao focar e filtro progressivo, até25 resultados. Unidades filtradas pelo cliente da OS no servidor. Leitura com vOs, vínculo com vOs+eOs; nova OS continua exigindo aOs e validações nativas. Selo/série/IMEI e histórico permanecem privados: não ampliar projeção do link público.

Flag própria desligada por padrão; preparar e testar migração fora do código servido para evitar bloquear o laboratório durante a implementação. Aplicar somente no8230 após testes e backup. Não modificar OS3 do usuário nem repetir seeds. Migração aplicada duas vezes no banco isolado `mapos_ui_piloto`, após backup privado. Flag ativada somente no8230; desligada por padrão para instalações existentes.


## Evidência e limites

1.709 testes PHP / 8.040 asserções, sem falhas ou erros, mantendo uma depreciação e um teste ignorado preexistentes. PHPStan sem novos erros e baseline preservado; 23 testes JS, build e escape aprovados. Dezessete verificações HTTP exercitaram permissões, CSRF, cliente diferente, repetição idempotente e rollback da criação completa. A nova OS vinculada é criada atomicamente: entrada inválida ou reenvio não deixa outra OS órfã.

Navegador: duas placas LG/INV-12 usam um catálogo e unidades distintas. A unidade A foi reutilizada para outro atendimento com novos itens, estado e defeito; o histórico mostra cada entrada. Histórico verificado com largura CSS360, sem rolagem horizontal. Não é ensaio em celular físico. Selo/série/IMEI não foram acrescentados à projeção pública; o comprovante privado usa a identificação histórica. API permanece desativada: proteções de integridade incluídas no código, sem ensaio HTTP da API.

Auditoria por chaves e hashes preservou os registros anteriores de onze tabelas, incluindo OS3 do usuário, financeiro, estoque, anexos e links. Fixtures novas9003/9004/9005/9006/9008 são exclusivas de QA. Relatórios `equipamento-http.json`, `equipamento-audit.json`, `equipamento-phpunit-final.txt`, `equipamento-phpstan-final.txt` e imagens em `outputs/ui-piloto/`.

Primeiro recorte: uma unidade por OS; cadastro/reuso e histórico, sem transferência entre clientes, manutenção do catálogo, correção auditável da identificação, checksum de IMEI ou retorno em garantia automático. Não reabrir setup/seeds nem redefinir registros existentes. Próximo recorte autorizado: orçamento publicado em versões, com nome e confirmação de aprovação/recusa pelo cliente, sem alterar recebimentos ou andamento.
