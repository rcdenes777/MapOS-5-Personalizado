# Entrega nas listas

O andamento do serviço e a entrega física são informações independentes.

- No início, **Aguardando retirada** reúne OS finalizadas e canceladas sem comprovante ativo de entrega.
- Ao abrir o indicador, o filtro **Todas / Aguardando retirada / Entregues** consulta as OS finalizadas e canceladas no próprio painel.
- A coluna **Previsão** é a data prevista da OS. A coluna **Entrega** mostra a retirada pendente ou a data e hora da entrega registrada.
- Na lista operacional de OS, o filtro **Entrega do equipamento** encontra retiradas pendentes ou entregues, preservando a paginação e os demais filtros.
- Corrigir/cancelar um comprovante retira a indicação de entregue e faz a OS voltar à fila. O comprovante anterior continua no histórico.
- Sem registro ativo, o sistema não presume uma entrega antiga. Confira os casos legados e registre a entrega quando necessário.

Nenhuma entrega, status, estoque ou valor financeiro é alterado por essas consultas. A lista financeira conserva seu foco em cobranças.

## Validação no laboratório 8230 — 10/11/2026

- 1.921 testes PHP, 9.241 verificações, sem falhas; uma depreciação e um teste ignorado preexistentes.
- Análise estática e verificações de saída escapada/ausência de script inline aprovadas; build concluído.
- Navegador: indicador e lista pendente (17), entregues (4), todas (21); conferidas finalizadas e canceladas, data/hora e filtro da lista operacional. Leitura em tela de 390 px conferida.
- Teste automatizado da correção de comprovante, contagem e paginação antes do recorte; consultas não alteraram status ou histórico.
- Nenhuma mutação de dados no laboratório foi necessária nesta etapa. Produção e permissões preservadas.

## Filas sem sobreposição de cancelamento

Cancelamentos pendentes inclui somente pedidos ativos ainda não confirmados. Após confirmar, a OS cancelada fica em Aguardando retirada até registrar sua entrega. Corrigir o comprovante devolve a OS à fila de retirada, sem reabrir o cancelamento.
