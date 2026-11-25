# R03 — Incremento de orçamento

Baseline visual: R02, head 89332827cad2c73fad180a005e4e2501cba2f22a.
Referência funcional: 8c256cae4ddaeefad68922abddbb8addfe37c99d.

## Decisões

- Separar rascunho de itens, versão publicada, resposta e cobrança. Uma resposta não cria automaticamente uma obrigação financeira.
- Publicar outra versão é permitido antes da entrega; a anterior continua no histórico. Uma resposta pertence à versão vigente. Mudanças nos itens tornam a versão anterior indisponível para decisão pública.
- Registro interno quando itens mudaram cria um retrato novo; resposta pública sobre versão desatualizada é rejeitada.
- Após entrega, publicação e resposta pelo link ficam bloqueadas, mas o registro interno de comunicação anterior ou na mesma data é permitido e preserva o andamento.
- Formalização da cobrança ordinária é explícita, não condicionada automaticamente à aprovação; preserva o andamento. O retorno em garantia com novo orçamento precisa de regras específicas e não foi incluído.
- Valores em centavos inteiros. Rascunho de peças/serviços com quantidade inteira, preço unitário, desconto global e condições textuais. Versões são cópias separadas.
- Interface com lista de itens e total, painel de compartilhamento/cobrança, histórico expansível. No celular, o editor usa uma coluna, total atualizado e ação de salvar persistente.
- Módulo de domínio em assets/quote.js, apresentação em assets/quote-ui.js, orquestração existente em assets/app.js.

## Fontes conferidas na referência

application/models/Trifase_orcamento_model.php (retrato, publicar, retirar, registrarResposta, versaoVigente); application/controllers/Trifase_orcamentos.php (permissões, publicar, registrar_resposta); application/views/trifase/orcamento-painel.php; application/models/Trifase_financeiro_model.php (formalizarBloqueada); application/controllers/Trifase_financeiro.php (formalizar e receber). O protótipo não substitui o backend.

## Cenários para o laboratório

1. Abrir OS #023, conferir versão 1 com R$ 240,00. Editar rascunho para duas peças de R$ 50,00, um serviço de R$ 220,00 e desconto de R$ 20,00. Total R$ 300,00. Conferir que v1 continua R$ 240,00.
2. Publicar v2; confirmar histórico de v1, v2 vigente e status Negociação. Simular resposta pelo link, aprovar. Total cobrado permanece zero. Formalizar cobrança e verificar R$ 300,00 em aberto. Pagar parcialmente, concluir, entregar e quitar separadamente.
3. Nova rodada limpa: recusar a versão atual, retirar publicação, publicar nova versão. Testar mudança de itens sem publicação e registro interno da resposta criando novo retrato.
4. Após retirada, verificar que não é possível publicar nem responder pelo link; permitir registro interno na mesma data ou anterior, sem mudar andamento. Rejeitar data futura ou posterior à retirada.
5. Conferir os quatro perfis, persistência e histórico, entradas inválidas, totais extremos, textos longos, foco no modal e barra de ações em 320/390/768/1440.
6. Reexecutar regressões R02. Atualizar os passos de orçamento da bateria: aprovação não cria cobrança; o fluxo deve formalizá-la separadamente. Não interpretar a mudança intencional como regressão.

## Limitações explícitas

Portal/link compartilhável real não implementado; botão de resposta pública é uma simulação local sob perfil financeiro. Não existe token, servidor ou autenticação. A matriz real de permissões ainda deve ser auditada. Não há catálogo de peças integrado, reserva/consumo, quantidades fracionárias, descontos por item, condições de pagamento estruturadas, autorização de execução integral, conciliação externa, estornos, alterações pós-cobrança nem fluxo completo de garantia/cancelamento. A vedação de edição de itens de OS já cobrada e de retorno é limite conservador do protótipo, não nova especificação do MapOS.

As verificações de domínio e renderização simulada não são teste de navegador. A R03 não está aprovada para integração nem produção. Preservar a R01/R02 e registrar a revisão da R03 separadamente.
