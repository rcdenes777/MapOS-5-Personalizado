# Entrega física de equipamento — laboratório

Implementada em 02/11/2026 no laboratório 8230. Usuário determinou terminar esta etapa e parar; não iniciar outra etapa sem retomada.

## Regras aprovadas

- Permitir retirada com saldo em aberto mediante aviso e confirmação explícita. A cobrança continua pendente.
- Terceiro exige nome do recebedor e registro de como o cliente autorizou a retirada. Não coletar foto/número de documento por padrão.
- Mesma função para qualquer OS: previsão, conclusão, retirada, garantia e pagamento são registros independentes. O módulo de retorno em garantia ainda não foi implementado.
- Uma entrega ativa por OS nesta versão. Correção cancela o registro com motivo e operador; o original permanece consultável e uma nova entrega pode ser registrada.

## Implementação

Migration aditiva `20261102000000_trifase_entregas` cria `trifase_entregas_eventos` e `trifase_entregas_estado`, sem converter OS antigas. A trava compartilhada da OS serializa registros; chave/hash de operação protegem reenvio e conflito de payload. Falha na projeção desfaz o evento inteiro. Vínculos MySQL usam restrição de exclusão; a reversão automática destrutiva é recusada.

`Trifase_entregas` oferece POST registrar/cancelar e GET/HEAD comprovante. Mapa e controller conferem permissões: leitura exige `vOs`; mutações exigem `registrarEntrega` ou `corrigirEntrega`, sem vincular a nomes de cargos. Os códigos aparecem na configuração de permissões e não são concedidos automaticamente em instalações existentes. CSRF continua obrigatório.

A seção no resumo exibe retirada ativa, recebedor, data, comprovante e histórico. Checkbox de condições é obrigatório; autorização torna-se obrigatória para terceiro também no servidor. Datas futuras ou anteriores à entrada são recusadas. O comprovante é privado, mostra o retrato do equipamento/itens registrados e sinaliza cancelamento; omite observações internas, forma de autorização, hashes e chaves. Não é recibo de pagamento nem assinatura eletrônica.

Exclusão pelo painel e pela API é bloqueada quando há histórico de entrega, inclusive com o módulo desligado. O bloqueio ocorre antes de devolver estoque ou apagar anexos. A API continua desativada no laboratório: sua proteção foi incluída no código; não se habilitou a API para ensaio HTTP.

## Ativação e isolamento

`TRIFASE_ENTREGAS_ENABLED=false` por padrão. Migração aplicada duas vezes com sucesso apenas em `mapos_ui_piloto`; versão registrada após confirmar que a anterior era `20261031140000`. Nove tabelas existentes foram comparadas antes/depois e preservadas. Flag habilitada e permissões concedidas somente ao perfil fictício 1 do laboratório. Perfil 2 permanece sem permissão de registrar/corrigir.

Backup privado anterior: `work/ui-piloto/backups/antes-entregas-20261102.sql` (64.474 bytes, acesso 0600). Não incluir credenciais, banco ou configuração do laboratório no Git. Nenhuma alteração na instalação 8200, produção, master/trabalho, 4.55.2 ou MapOS-Moderno; nenhum push.

## Validação

- 1.695 testes PHP / 7.969 asserções: sem falhas/erros; uma depreciação e um teste ignorado preexistentes. PHPStan sem novos erros, baseline preservado; verificação de escape aprovada.
- 23 testes JS e build aprovados.
- 19 checks HTTP: permissões negadas, CSRF/GET, vínculo com outra OS, terceiro sem autorização, confirmação ausente, correção/reenvio, comprovante cancelado e nova entrega sem quitar.
- Dois processos PHP/MySQL concorrentes na fixture 9001: uma entrega criada e outra recusada; nenhuma segunda entrega ativa. A primeira tentativa de coleta teve erro de parsing do relatório, foi descartada e repetida com cancelamento auditado da fixture. Evidência válida em `entrega-concorrencia.json`.
- Navegador: entrega por terceiro na OS sintética 9002 com saldo150; recebido250 e statusFinalizado preservados. Correção/nova entrega mantém o original cancelado. Formulário360px sem overflow; autorização obrigatória ao selecionar terceiro. Não é teste em aparelho físico.
- Dez tabelas técnicas/financeiras/estoque/anexos/links comparadas antes/depois das operações e preservadas. OS3 do usuário não foi usada para mutações de QA.

Relatórios e imagens em `outputs/ui-piloto/`: `entrega-http.json`, `entrega-concorrencia.json`, `entrega-phpunit.txt`, `entrega-phpstan.txt`, `entrega-desktop.jpg`, `entrega-mobile.jpg`.

## Retomada futura

Etapa encerrada. Restam identificação reutilizável (marca/modelo/unidade/selo), orçamento/decisão versionados, retorno em garantia e demais extensões do plano. O tema estendido às telas nativas não equivale à implementação dessas funções. Não reiniciar seeds/setup nem resetar o banco. Testes mutáveis somente em fixtures próprias.

Atualização02/11/2026: usuário autorizou continuar. Identificação reutilizável concluída no recorte descrito em `EQUIPAMENTOS_LAB.md`; orçamento versionado é a etapa seguinte.
