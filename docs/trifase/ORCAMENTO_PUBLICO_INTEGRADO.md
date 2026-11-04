# Orçamento no acompanhamento público

A página `publico/os/<token>` renderiza diretamente a versão publicada do orçamento, seus itens e valores e o formulário de aprovação/recusa, mantendo a galeria de anexos autorizados. O POST de resposta continua no controlador existente, com CSRF, token, versão, idempotência e trava da OS. Após sucesso retorna ao acompanhamento.

Na prévia interna, quem já pode publicar orçamento revisa equipamento, defeito relatado, diagnóstico para o cliente, condições de pagamento, prazo de execução e garantia. Defeito e diagnóstico são sugestões originadas da OS; precisam ser revisadas antes da confirmação de publicação. Pagamento e prazo não são inventados. Campos vazios aparecem como “A confirmar com a assistência”. As condições da última versão são reaproveitadas para revisão ao preparar a próxima.

Esses textos são uma lista fechada gravada em `conteudo.apresentacao` da versão, não uma leitura pública do laudo vivo ou das observações. O hash dos itens/valores permanece compatível com versões anteriores; a chave da operação de publicar também considera os textos. Alterações futuras em textos técnicos não mudam a versão publicada. Alterações em itens/valores mantêm a proteção existente que indisponibiliza o orçamento até nova publicação.

Versões antigas continuam válidas sem novos textos; para acrescentá-los é necessária nova publicação explícita. Não há migração nem mudança de perfil. Notas internas, custo, identificadores privados e anexos não autorizados permanecem fora da apresentação. A galeria segue as autorizações atuais da OS, independentemente da versão do orçamento. Aprovação não registra pagamento nem entrega.

## Validação em 04/11/2026

- PHP: 1.864 testes, 8.850 asserções, sem falhas; uma depreciação e um teste ignorado já existentes.
- PHPStan sem erros; verificação de escape e scripts inline passou; frontend reconstruído.
- Testes executam publicação com textos, repetição idempotente, recusa de chave reutilizada com outro diagnóstico, congelamento, aprovação, limites, campos inválidos e ausência de notas privadas.
- Renderização testa orçamento/formulário junto a foto e vídeo autorizados, escape de HTML e ausência de valores/formulário quando não publicado.
- Navegador: leitura da OS 9058 confirmou acompanhamento e imagens existentes. Não havia orçamento publicado; nenhum orçamento ou resposta foi criado nessa OS. O ciclo desta nova apresentação não foi submetido pelo navegador com dados do usuário.
- Alteração somente no checkout/laboratório 8230; sem push.

## Resposta no andamento da OS

O bloco superior de andamento agora mostra “Aprovado pelo cliente” ou “Recusado pelo cliente”, com data e hora da resposta da versão atual. Também fica disponível ao técnico: a projeção contém somente tipo da decisão, horário e validade; não recebe o conteúdo financeiro do orçamento. Se a versão estiver retirada, cancelada ou com itens alterados, a resposta fica neutra e avisa para conferir o orçamento. Uma nova versão sem resposta não reutiliza a aprovação antiga. O status técnico não é alterado automaticamente.

Verificado na OS 9058 pelo navegador: aprovação de 04/11/2026 às 14:27 apareceu no bloco superior, sem alterar registros. Testes de renderização cobrem aprovação, recusa, versão indisponível e ausência de valores para técnico. Suíte: 1.865 testes e 8.856 asserções sem falhas, com a depreciação e o teste ignorado anteriores; PHPStan, escape, formatação e build passaram.
