# R06 — Cancelamentos, conferência técnica e acerto financeiro

Baseline R05: incremento f3bbf1bd; código testado 0d0b4e74; evidências ae61edc8; conclusão R05-001-DONE. Referência funcional 8c256cae4ddaeefad68922abddbb8addfe37c99d.

## Contrato estudado

- application/models/Trifase_cancelamento_model.php: solicitar, retirar, conferencia, retirarItem, hashTecnico, tecnicaValida, conferirTecnica, calcularAcerto, confirmar.
- application/controllers/Trifase_cancelamentos.php e application/views/trifase/cancelamento.php.
- application/models/Trifase_financeiro_model.php: acertarCancelamento, receber, corrigirRecebimento, retificarCancelamento, cancelamentoAdmiteRecebimento, resumo, recibo; application/helpers/trifase_garantia_helper.php: trifaseGarantiaResumo.

## Incremento

Aba Cancelamento, pedido por cliente/assistência, motivo obrigatório, retirada do pedido sem desfazer conciliações anteriores, fila de cancelamentos pendentes, indicação no cartão da OS. Pedido não muda andamento, cobrança ou entrega. Bloqueios para concluída, cancelada, faturada legada, entregue ou com vínculo de garantia (conservador até R07).

Conferência técnica: itens da proposta atual representam os itens vinculados. Peça pode ser conciliada em quantidade parcial ou total, como não utilizada ou consumida/perdida; consumo/perda exige motivo. Nunca retorna perda ao estoque. Como o protótipo ainda não comprova baixas, nenhuma entrada automática no estoque é feita para peça não utilizada. Serviços não executados podem ser retirados; os executados permanecem. Versões de orçamento preservadas. Conferência técnica exige que nenhuma peça reste e que os serviços remanescentes tenham sido executados. Mudança de status/itens invalida a conferência.

Acerto financeiro em etapa separada: valor devido menos desconto negociado = total final. Compara ao recebido líquido; calcula saldo a receber, a devolver ou sem pendências. Exige confirmação do financeiro, justificativa e conferência do acerto quando há obrigação ou valores. Se devolução necessária, exige valor exato, data válida não anterior aos eventos financeiros, forma e comprovante/referência; registra evento independente de devolução. Não transfere dinheiro. Mantém recebimentos originais, não os marca como estornados. Valor final pode ser zero ou criar obrigação nova sem cobrança prévia, conforme referência. Mudança no retrato financeiro invalida confirmação. Cancelamento confirmado não registra entrega; a retirada permanece operação própria.

Recebimentos posteriores são permitidos quando o acerto confirmado foi a receber. Estorno de registro normal em cancelada apenas na hipótese a receber e sem devoluções; se acerto quitado sem devolução, administrador pode retificar por lançamento incorreto ou não compensado, com data entre confirmação e hoje, justificativa e referência ao recebimento. Saldo recomposto autoriza novo recebimento. Correção após devolução é bloqueada. Recibo original preservado. Portal exibe projeção financeira atualizada, nunca motivo ou comprovante privado; orçamento cancelado indisponível.

Perfis simulados: Admin/Técnico solicitam/retiram/conferem; Admin/Financeiro confirmam acerto; Admin retifica e estorna; Atendente consulta e registra entrega. Matriz real usa permissões específicas eOs, vLancamento/eLancamento, estornarRecebimento e retificarFinanceiroCancelado; ainda requer auditoria completa. A escolha de perfis é provisória, não mudança de política real.

## Limites e decisões

Não há baixas de estoque comprovadas, custo unitário real ou projeção nativa de estoque: R08 deverá implementar a vinculação de movimentos. A perda e a não utilização são evidenciadas na OS, sem alterar quantidade fictícia do estoque. Não inferir custo da perda a partir do preço de venda. Desconto de rascunho é zerado sem obrigação e limitado ao subtotal remanescente quando há obrigação; o valor formalizado é preservado até o acerto. O protótipo não representa rateio nativo de desconto por linha. Garantia/abatimentos, acertos legados/externos, validação especial de saldo anterior (retificação validar_saldo_anterior), idempotência e atomicidade de servidor permanecem pendentes. Não permitir retificação de casos legados que não sejam simulados. Nenhum novo fluxo de produção, banco, segurança real ou reembolso bancário. Não alterar produção nem integrar backend.

## Cenários de laboratório R06

1. Restaurar dados; OS #023, solicitar pelo cliente, conferir status/saldo/entrega intactos e fila; retirar e solicitar novamente. Rejeitar duplicidade, origem vazia, motivo vazio, finalizada, entregue e vínculos garantia. Testar Técnico/Atendente/Financeiro/Admin.
2. Criar orçamento de OS comum com 3 peças, 2 serviços, desconto; publicar. Solicitar cancelamento. Conciliar 1 peça não utilizada e 2 consumidas, obrigando motivo; rejeitar quantidade inválida. Nenhuma entrada em estoque (baixa não comprovada). Retirar serviço não executado, preservar realizado e versões. Não liberar conferência com peça pendente. Conferir técnica; alteração de item/status invalida conferência. Retirar pedido não restaura itens.
3. Acerto sem cobrança anterior: total devido R$ 80 menos R$ 10 desconto, saldo R$ 70; confirmar cancelamento e receber após cancelado, estornar o recebimento, receber de novo. Status Cancelado e entrega independente. Conferir fila e portal.
4. Acerto com recebimentos R$ 100 e R$ 140, final devido R$ 80: devolução R$ 160. Rejeitar valor divergente, referência vazia, forma/data inválida e data anterior aos recebimentos. Confirmar; pago líquido R$ 80 e saldo zero; evento devolução separado, recibos originais não estornados; portal atualizado e sem referência privada; correções posteriores bloqueadas.
5. Acerto sem pendência (valor final igual ao pago) e total zero (com e sem obrigação anterior). Retificação autorizada de recebimento em cancelada sem devolução: tipo explícito, justificativa e data entre confirmação e hoje, novo saldo, recebimento posterior. Bloquear retificação duplicada e sem permissão.
6. Duas abas, alterações financeiras durante acerto, confirmação stale, persistência, tentativa direta de operações não autorizadas. Não esperar garantias transacionais de localStorage.
7. Regressões R02–R05 completas; adaptar apenas expectativas intencionais do novo fluxo. Capturar delta em 320/390/768/1440: pedido, fila, conferência, peças/perda, cálculo de saldo/devolução, confirmação, histórico, financeiro/portal/entrega; verificar valores extremos, textos, foco, contraste, axe, teclado, sem requisições externas. Não repetir capturas inalteradas.
8. Testes do GPT: node tests/smoke.cjs, quote.cjs, portal.cjs, portal-page.cjs, finance.cjs, finance-ui.cjs, cancel.cjs, cancel-ui.cjs (todos em tests/).

## Verificação inicial

GPT executou a lógica das oito suítes em JavaScript com módulos de Node/DOM simulados: 72 rotas/perfis, 29 orçamento, 24 portal, 8 página pública, 24 financeiro, 12 integração financeira, 30 cancelamento, 11 integração cancelamento. Total 210 verificações PASS nesse ambiente. Nenhum navegador real executado pelo GPT. Publicar evidências independentes em reviews/deepseek/R06. Correções técnicas pontuais autorizadas; alterações de regra/design requerem retorno ao GPT. Preservar R01–R05.
