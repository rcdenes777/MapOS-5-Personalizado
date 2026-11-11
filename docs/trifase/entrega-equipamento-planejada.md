# Entrega e retirada de equipamentos — todas as OS

Status: planejado, solicitado em 01/11/2026. Aplica-se a OS normal e retorno em garantia. Nenhum código funcional ou migração executado nesta etapa.

## Constatação no código
- application/views/os/formulario.php:148–155: dataFinal tem ajuda “Previsão de entrega ao cliente”.
- application/views/os/visualizar.php:37: dataFinal é exibida como previsão de entrega.
- application/views/os/os.php:28: coluna “Entrega” usa dataFinal; isso não comprova retirada efetiva.
- application/controllers/Os.php:15: status não inclui registro próprio de entrega.
- application/views/os/imprimirOsTermica.php:388: há espaço impresso “Assinatura do Recebedor”, sem persistência própria de retirada identificada na inspeção.
Não foram encontrados campos, endpoints ou migrações específicos para data real da retirada, pessoa que recebeu e confirmação auditável. Conclusão restrita ao checkout work/mapos-v5 inspecionado; não houve validação de instalações antigas ou produção.

## Requisito aprovado para planejamento
Uma única função de entrega deve servir a qualquer OS, com ou sem garantia. Separar previsão, conclusão técnica, entrega física e financeiro. Finalizado não significa entregue; entregue não significa pago. Não reutilizar dataFinal como confirmação real e não inferir entregas de OS antigas.

Registrar OS, data/hora efetiva da entrega, data/hora do registro, pessoa que recebeu, vínculo com cliente (próprio ou terceiro autorizado), atendente autenticado, itens entregues e observações. Conferir identificação sem exigir cópia ou número completo de documento por padrão. Para terceiro, registrar autorização conforme política definida antes da implementação.
Ação “Registrar entrega” na visualização de qualquer OS, com situação “Entrega não registrada” ou “Entregue em ...”. Exibir conclusão técnica separada. Permissões configuradas por tipo de usuário; checagem no servidor. Não fixar acesso por título de técnico ou administrador. A possibilidade de entrega com saldo e de devolução sem reparo deve seguir política explícita; não bloquear ou liberar automaticamente sem defini-la.

Gerar comprovante com OS, identificação do equipamento/selo quando existente, itens entregues, recebedor, atendente, data e termos aplicáveis. Excluir custos internos e notas privadas. Impressão não equivale a confirmação digital nem assinatura eletrônica. Definir depois se assinatura será coletada e como. Arquivo e consulta exigem autorização própria; não publicar pelo token da OS automaticamente.

Reenvio idêntico não duplica a entrega. Correção/cancelamento de entrega precisa de motivo, responsável e evento de auditoria, preservando o registro original. Suportar nova entrega após um cancelamento documentado, sem duplicar eventos ativos. Entregas parciais/múltiplos equipamentos ficam fora da primeira etapa até regra definida.

## Integração e testes futuros
Preferir módulo Trifase e tabelas aditivas próprias ligadas à OS, sem duplicar fluxos de garantia/OS normal. Não alterar saldo, recebimentos, estoque, garantia ou data de conclusão ao confirmar a entrega. Alteração de prazo de garantia deve seguir política validada e registro explícito separado.
Testar OS normal e garantia; terceiro autorizado; ausência de permissão; OS de outro cliente; reenvio simultâneo; correção auditável; preservação de financeiro/estoque/prazo; comprovante privado; OS antigas sem evidência de retirada. Implementar e validar em laboratório, com commits pequenos. Push e mudanças em produção exigem autorização específica.

Protótipos existentes de entrega em garantia são referência visual; versão normal deve usar o mesmo componente com contexto adequado. Próxima fase: revisar a tela normal, definir políticas pendentes e detalhar dados/rotas antes da implementação.
