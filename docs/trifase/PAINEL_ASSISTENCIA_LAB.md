# Painel da assistência — laboratório 8230

Implementado em 03/11/2026 sobre `5b7342d`, na branch `v5-trifase`.

## Visão inicial

Com a interface piloto ativa, o início apresenta filas de atendimento, orçamento, peças, retirada e retornos em avaliação; previsões mais próximas; retiradas pendentes; contagens por andamento; financeiro e atalhos permitidos. Agenda, gráficos e listas nativas continuam acessíveis por **Agenda e gráficos** (`mapos?visao=classica`). Com a flag piloto desligada, a visão inicial continua nativa.

Referência visual: `outputs/comparacao-penpot-2026-11-02/penpot-painel.png`. O MCP respondeu, mas não havia plugin conectado ao desenho nesta etapa; usou-se a exportação salva, sem alegar leitura da revisão atual ou alterar o Penpot. A implementação reaproveita o tema azul, tokens, kpi-card, botões, links, pills e ocultação de valores existentes.

## Regras compartilhadas

`Trifase_os_fila` concentra as mesmas condições usadas no painel e no filtro GET `fila` da listagem. Contagem e paginação da listagem respeitam a fila antes do limite; a configuração de status visíveis não esconde resultados de uma fila explícita. O filtro pode ser combinado com andamento, financeiro, saldo, pesquisa e datas.

- **Em atendimento:** Aberto, Aprovado, Em Andamento e Aguardando Peças.
- **Aguardando orçamento:** Orçamento e Negociação.
- **Aguardando peças:** status exato, com atalho já existente por status.
- **Prontas para retirada:** status Finalizado sem entrada ativa em `trifase_entregas_estado`. Não usa a previsão como prova de conclusão ou garantia. Uma entrega corrigida deixa de ser ativa e a OS volta à fila; a consulta não apaga histórico nem muda status.
- **Retornos em avaliação:** vínculo de retorno, OS não finalizada/cancelada/faturada e última avaliação ainda `avaliacao` ou sem avaliação. A última avaliação prevalece sobre as anteriores.

Os grupos se sobrepõem; a interface avisa isso. Filas opcionais só aparecem com os módulos e tabelas disponíveis. Listas de atenção/retirada exibem até seis OS; contadores e atalhos consultam o conjunto completo. Datas zeradas são tratadas como sem previsão, com comparação textual compatível com MySQL estrito e SQLite.

## Financeiro e permissões

- `vOs` permite os resumos de OS. Sem essa permissão, o controller não consulta as filas.
- `vLancamento` permite receitas pagas no mês e o botão de ocultar valores. A receita usa a data do pagamento e o balanço nativo; inclui todo o financeiro, não apenas OS. Reembolsos constam nas despesas, não são subtraídos dessa receita por uma segunda regra inventada.
- O saldo das OS exige **vOs + vLancamento**, módulo financeiro e tabelas. Soma os saldos positivos da projeção canônica já usada nos filtros: recebimentos, estornos, créditos/reembolsos ativos e correções canceladas. Faturas antigas sem apuração não são tratadas como saldo zero nem entram na soma.
- Atalhos e Nova OS/Nova venda usam suas permissões nativas. Ocultar valores é preferência por navegador, não substitui autorização; o perfil sem financeiro não recebe os números no HTML.

Nenhuma permissão, rota pública, migração, variável de ambiente ou dado de negócio foi criado/alterado. O novo método do controller é privado.

## Evidências

- PHP: 1845 testes / 8664 asserções, sem falhas ou erros; depreciação antiga de TemaCorTest e um skip. Foco final: 46 testes / 239 asserções.
- JavaScript: 209 casos aprovados, incluindo a suíte existente de ocultação; execução isolada padrão também aprovada.
- PHPStan, escape, build e formatação aprovados; detector Impeccable `[]`. CSS compilado incluído.
- Playwright: 25 checks. Contagens e listas comparadas a referências independentes dos modelos de entrega, avaliação de retorno e resumos financeiros; paginação, saldo, persistência da ocultação, perfil sem financeiro, visão nativa e ausência de erros JS. Capturas de 360, 1280 e 1440 pixels, sem excesso horizontal.
- Hashes das linhas de 37 tabelas com dados antes/depois idênticos; sessões/logs excluídos por serem efeitos normais da navegação. Nenhuma fixture nova. Credenciais apenas no arquivo privado de acesso.

Evidências e scripts somente de leitura em `outputs/painel-assistencia/` na pasta do projeto. Não houve push, alterações em produção/8200, Penpot ou nos três documentos preexistentes. Mobile físico, volume de banco em escala e regressão integrada de produção permanecem pendentes. Esta etapa não declara todas as telas implementadas ou todo o sistema validado.
