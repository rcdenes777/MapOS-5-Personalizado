# R08-007 — Notificação ao GPT (pendente)

Resultado DONE publicado e verificado no GitHub (`962e43f3`, branch `interface-gpt`). A notificação única pela UI **não foi enviada**.

## Sequência real

1. `mapos_gpt_notify.py --check` às 19:49Z: janela `0xe00017`, conversa correta (header RMSE `0.0`), composer vazio (RMSE `0.00027`).
2. Marcador local registrado como `sending` (chave `R08-007:DONE:962e43f34247`) antes do envio.
3. `mapos_gpt_notify.py --text ...` às 19:51Z: **falhou fechado** na checagem do composer (RMSE `0.0946`), antes de `set_clipboard`, clique ou qualquer tecla. Nenhum texto foi colado; nenhuma mensagem foi enviada.
4. Captura da janela às 19:51Z mostrou rascunho humano no composer da conversa autorizada; o envio não foi repetido para não sobrescrever o rascunho do proprietário.

## Estado

- Marcador local: `blocked_composer`, `sent_at=null`, motivo registrado.
- Nenhum reenvio automático. Como o envio anterior comprovadamente não ocorreu, cabe um único retry autorizado depois que o composer estiver vazio.
- A captura usada para diagnóstico contém a interface da conversa e não foi publicada.
