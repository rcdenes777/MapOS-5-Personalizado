# Detalhe da OS por perfil — laboratório 8230

Revisão de 03/11/2026, após a separação da listagem técnica e financeira. Aplicada com a flag existente `TRIFASE_UI_PILOTO_ENABLED`; desligá-la preserva o comportamento nativo. Nenhuma migração, variável nova ou concessão de permissão.

## Comportamento

| Capacidade existente | Detalhe da OS no piloto |
| --- | --- |
| `vOs` | Atendimento, relato, diagnóstico/laudo, descrição e quantidade de itens, anexos e histórico em consulta. Sem valores comerciais ou controles financeiros. |
| `vOs` + `eOs`, sem `vLancamento` | Editar os dados técnicos permitidos e adicionar/remover peças e serviços de OS editáveis. O servidor aplica o preço atual do catálogo. Não aceita preço ou desconto enviado pelo navegador. |
| `vOs` + `vLancamento` | Consultar orçamento, cobrança, saldo, recebimentos e histórico; visualizar valores dos itens. |
| Anteriores + `eOs` | Alterar composição comercial/descontos enquanto a OS for editável. |
| Anteriores + `aLancamento` | Receber valores; formalização também exige `eOs`. |
| `estornarRecebimento` junto das permissões de consulta | Corrigir recebimento. Reembolso continua separado, com `reembolsarGarantia`, `eOs` e `vLancamento`. |

OS faturadas/canceladas continuam bloqueadas para mutação de itens. O faturamento não impede a edição técnica autorizada pelo módulo. Acrescentar/remover itens antes do faturamento mantém a regra nativa de limpar o desconto geral quando a composição muda; isso não altera o preço unitário dos itens existentes.

Sem financeiro, resumo, “Mais ações”, abas de produtos/serviços e respostas AJAX seguem a mesma apresentação sem valores. PIX, descontos e sugestões com preços não são enviados por esses caminhos da OS; o campo `{VALOR_OS}` do atalho de WhatsApp não carrega valor. Impressões A4/térmica geram documento técnico sem valores/PIX. Formulários de itens continuam utilizáveis sem campo oculto de preço: o valor vem do catálogo no servidor. Requisição direta que tentar incluir preço/desconto é recusada com403, mesmo com CSRF válido; descontos e faturamento diretos também são recusados.

O financeiro individual tem atalho para **OS e recebimentos** e o menu destaca Lançamentos nas páginas financeiras; a edição técnica mantém seu contexto próprio. Não há concessão baseada no nome do perfil: valem as capacidades configuradas.

## Escopo preservado

Não redefine acesso aos catálogos globais, vendas, cobranças externas ou e-mails automáticos: esses módulos continuam com suas permissões próprias. Não interpreta valores que alguém escrever em texto livre. A privacidade aqui se refere aos campos estruturados e operações da OS no piloto. Produção/8200/master/trabalho, instalação4.55.2 e Penpot não foram modificados.

## Validação

- PHP:1855testes/8734asserções, sem falhas/erros; depreciação antiga e1skip. Foco521/2806. PHPStan e verificador de escape aprovados.
- JavaScript:25arquivos de teste aprovados; build completo e formatação padrão. Detector Impeccable sem achados.
- Navegador: quatro perfis existentes — administrador, técnico sem financeiro, somente leitura e consulta comercial sem publicar. Bloqueios reais403/AJAX com CSRF válido, consulta financeira, recibos, custos, orçamento, recebimento/estorno/reembolso, descontos e faturamento. Inclusão e remoção de produto/serviço pela UI com técnico, recusa de preço adulterado, ausência de valores em respostas e abas; impressão técnica e navegação financeira.60verificações aprovadas. A primeira captura após redimensionar uma sessão desktop foi descartada; a sessão móvel nova360px foi conferida sem extrapolar a largura. Não é aparelho físico.
- Fixture única criada: **OS9063**, clienteQA existente9050, técnico2. Peça e serviço de teste removidos pela aplicação; os registros de auditoria/estoque/custos do teste podem permanecer. Não repetir o roteiro mutável: `fixture.json` registra a criação e os itens já testados. Não se afirma que toda a passagem mutável deixou o banco idêntico; ela cria a fixture e seus históricos. A passagem final somente leitura comparou37tabelas sem alterações, excluindo sessões/logs.

Evidências locais: `outputs/detalhe-os-perfis/` na pasta canônica, incluindo `browser.json`, `fixture.json`, `banco-passagem-final.json`, logs de testes e capturas. O primeiro roteiro parou em um seletor de link que não existia para a OS sem obrigação; os testes restantes foram concluídos por `final-browser.py`, sem repetir as mutações. Regressão integrada para produção e homologação humana continuam pendentes.

## Complemento — agenda do painel clássico

Na rota `mapos?visao=classica`, os cards de saldo, lançamentos e balanço já seguiam suas permissões, mas a agenda enviava `total` e `faturado` para qualquer usuário com `vOs`. Corrigido no servidor: esses dois campos só integram o JSON com `vLancamento`; o padrão do serializador é omiti-los. O modal também não inclui os campos sem essa capacidade. Agenda, cliente, datas, equipamento e atalhos técnicos permanecem. Sem alteração de perfil ou banco.

Validação desta correção:1857PHP/8750asserções (depreciação e skip antigos), foco459/1245, PHPStan/build/JS/escape/formato aprovados;19checks de navegador com quatro perfis, incluindo resposta real da agenda e abertura do modal técnico. Evidências: `outputs/painel-classico-perfis/`. Nenhuma fixture ou mutação de negócio foi executada nesta passagem.
