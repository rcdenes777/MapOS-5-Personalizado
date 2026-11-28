# Revisão independente do portal — checkpoint 1451fa5f

**Estado: WIP; não aprovado para merge nem implantação.** Esta evidência é limitada às revisões abaixo; não estabelece que todo o candidato passou por auditoria ou testes finais.

- Candidato de código e capturas: `1451fa5f4869481ad6c9b70a1a6a32dae2d69cfe`.
- Base da branch: `8c256cae4ddaeefad68922abddbb8addfe37c99d`.
- Este documento não altera código, fixtures ou capturas. Seu commit posterior não muda o candidato de código revisado.

## Revisão estática DeepSeek

A sessão nativa do perfil supervisor limitou o pai ao toolset `delegation`; a implementação instalada remove a delegação do filho leaf. A resolução local para essa seleção produziu lista de ferramentas vazia. O resultado efetivo informou `model_map`, opção `review`, provedor `deepseek`, modelo `deepseek-flash`, esforço solicitado `high`, conclusão normal e nenhum fallback registrado. O esforço efetivo do provedor não foi confirmado independentemente.

O parecer focado cobriu autenticação por link, escopo de cliente e OS, publicação de anexo e orçamento, expiração/revogação e cabeçalhos. O pacote foi construído a partir dos blobs do candidato; SHA-256 do pacote montado: `8d1bc40bf4acb5224cb0b8ab35d6d6970df0f8866e92b229c7a5796f0860acf9`. A comparação literal da chamada ao revisor com o pacote identificou uma única diferença: remoção da quebra de linha final; os demais caracteres coincidiram. Nenhum dado de produção ou credencial foi incluído.

O revisor não demonstrou bypass de isolamento no escopo fornecido. Sinalizou lacunas quanto ao escape na view e aos helpers de arquivo e financeiro. Conferência estática adicional do supervisor encontrou: view com `e()` nos dados exibidos; seleção pública de anexo condicionada à mesma OS e à publicação; `armazenamentoLocalizar` limitado à raiz privada; resposta do anexo forçada a download; tratamento de lista vazia no financeiro. Essas leituras adicionais não são testes de execução nem uma segunda revisão independente.

A primeira tentativa mais ampla teve alterações introduzidas pela sessão intermediária durante a cópia, inclusive um falso erro no nome de uma asserção. Seu parecer **não é aceite**. O risco identificado nessa tentativa permanece condicionado: uma exclusão de cliente fora do fluxo da aplicação pode deixar link órfão e, se o identificador for reutilizado, potencialmente associá-lo a outro cliente; a busca estática encontrou os fluxos de exclusão do painel e da API usando o método de limpeza, mas não demonstra proteção para escrita direta no banco, importadores externos ou toda operação administrativa. Não há evidência aqui de exploração por fluxo normal da aplicação.

O token no caminho continua sendo credencial de portador e pode constar em logs ou histórico. A configuração de proxy/observabilidade e a revisão dos mecanismos de exclusão e restauração continuam pendentes antes de qualquer implantação. Não se decidiu alterar a política de HSTS ou infraestrutura nesta revisão.

## Revisão visual Luna

A sessão independente usou `model_map`, opção `visual`, provedor `openai-codex`, modelo observado `gpt-6-luna`, esforço solicitado `medium`; nenhuma troca de rota foi registrada. As quatro imagens foram entregues no campo de imagens e a revisora transcreveu o título sintético e as OS `#404` e `#403`, respectivamente, nas telas de lista e detalhe. O supervisor também inspecionou as imagens.

Não foi demonstrado defeito visual bloqueante nas imagens. Em celular, filtros e valores quebram linhas; nas capturas não há corte horizontal visível. Capturas não provam navegação, foco, contraste medido, área efetiva dos alvos ou comportamento fora do recorte.

Blobs Git das imagens no candidato:

- `portal-desktop.png`: `2258fde50bd26d876f930cdd8c19897eada6d3ed`
- `portal-mobile.png`: `176bc11832d04da06711fda890f8a12936731605`
- `portal-detalhe-desktop.png`: `1cce2b14b5accb6c34a7be8cbf00aac7ae5a0c0e`
- `portal-detalhe-mobile.png`: `49ea1ed3c373ecf4342bc2e4dece8567b4dd0d27`

Os arquivos locais entregues à revisora foram comparados com esses blobs. As capturas mostram dados identificados como sintéticos e não contêm barra de endereço ou token visível.

## Testes e limites

Nenhuma alteração funcional foi feita nesta revisão, e nenhuma suíte de regressão foi repetida. As contagens históricas no documento do portal são relatos anteriores, não resultados desta sessão. Permanecem pendentes os testes finais aplicáveis ao candidato integrado, verificação de concorrência e migrações parciais, revisão do restante da funcionalidade fora do escopo acima, controles operacionais de logs e aceite independente aplicável. Não houve merge nem deploy.
