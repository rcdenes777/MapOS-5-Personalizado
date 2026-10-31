# Trifase na v5 — avaliação e etapa 0

Data: 31/10/2026. Registro histórico da preparação inicial (etapa 0).

Atualização: o link público foi implementado e testado na branch local. O estado
atual, a arquitetura modular e as evidências estão em [LINK_PUBLICO.md](LINK_PUBLICO.md).
Recebimentos parciais e galeria de vídeos continuam como etapas futuras.

## Base e isolamento

Base oficial: RamonSilva20/mapos, tag v5.2.2, commit
`9a4c5dc3835b52c12616a73ab60635e96e23ad7a` (release não preliminar).
Fork confirmado: rcdenes777/mapos, parent RamonSilva20/mapos.
Na consulta remota, o fork tinha somente master em
`b2898fb9944220b92fa008f6dffcdee853b282e5`; v5-trifase não existia.

Branch v5-trifase criada exclusivamente em work/mapos-v5 deste chat.
upstream aponta ao projeto oficial; origin ao fork. Sem upstream de branch;
push.default=nothing exige destino explícito e não substitui autorização humana.
Nenhum push, deploy, migração ou inicialização de serviço executado.

Referências antigas, somente leitura:
- /home/dragonblue/mapos: master em 463ec35, quatro commits locais além do
  origin/master conhecido; php.ini modificado e diretório de anexos não rastreado.
- /home/dragonblue/mapos-trabalho: trabalho em b2898fb, árvore limpa na inspeção.

Não copiar configurações, bancos, anexos, dependências ou histórico antigo para
esta base. Não alterar a instalação 4.55.2, Docker, produção ou MapOS-Moderno.
A versão efetivamente instalada não foi consultada por HTTP ou banco.

## Avaliação de integração

Módulos adicionais são viáveis, mas não totalmente independentes: rotas,
permissões, faturamento, telas e armazenamento exigem pontos de integração.
Não mesclar master antigo nem copiar controllers inteiros.

| Objetivo | Evidência atual | Adaptação proposta |
| --- | --- | --- |
| Link por OS | Antigo: Publico.php, OsTokenPublico_model.php, routes_publico.php | Controller público dedicado, modelo de tokens e projeção explícita de dados; ações administrativas protegidas pelo permissions_map.php da v5 |
| Anexos autorizados | V5: armazenamento_helper.php e docs/armazenamento-de-arquivos.md; arquivos fora da raiz pública | Resolver token, OS e vínculo do anexo a cada requisição; servir pelo armazenamento privado, sem URL direta de assets |
| Recebimentos parciais | Antigo: Recebimentos.php, OsRecebimentos_model.php e migration create_os_recebimentos | Serviço financeiro próprio, centavos inteiros, transações, bloqueio por OS, idempotência, histórico e estorno auditável |
| Status financeiro independente | V5: Os::faturar grava lançamento, os.lancamento, faturado=1 e status=Faturado | Separar estado financeiro do andamento da OS; reconciliar com lançamentos, relatórios, cobranças e exclusão sem receita duplicada |
| Vídeos | V5: lista de tipos de armazenamento não inclui vídeo; armazenamentoEnviar usa readfile integral | Adicionar formatos/MIME de forma controlada, player e suporte a Range/206/416; manter checagens também em miniaturas e mídia |
| Interface | V5: componentes, módulos ES e DESIGN.md; legado usa outra estrutura | Reescrever interface nos componentes da v5; não transportar jQuery ou Bootstrap |

Reaproveitar regras do legado após revisão: token aleatório, expiração,
revogação e renovação; isolamento por OS; centavos; histórico; idempotência e
serialização financeira. Não transportar valores monetários via float.

## Política pública proposta

A autorização desta etapa é preparar e avaliar, sem publicar dados reais.
A regra de quais anexos ficam públicos precisa ser explícita no módulo.
Proposta conservadora para novas instalações: publicação por anexo, desativada
por padrão. Caso se escolha publicar todos os anexos da OS, registrar essa
política de forma explícita e testá-la. Não decidir pela regra de uma memória
antiga. Nunca publicar anotações internas, credenciais ou dados do usuário.
Tokens não devem aparecer nos logs. Definir cache privado/no-store e
Referrer-Policy restritiva nas respostas públicas, inclusive erros e binários.

## Sequência de commits proposta

0. Este documento: base oficial, isolamento e contrato de integração.
1. Núcleo de token e política de anexos com testes de comportamento, sem rota pública habilitada.
2. Migration aditiva, geração/renovação/revogação administrativa com permissão e CSRF.
3. Página pública e entrega privada de anexos; ativação somente em laboratório.
4. Recebimentos e reconciliação financeira; depois painel e relatórios.
5. Upload e galeria de vídeos, navegação e compatibilidade móvel.

Tabelas novas via migrations; não modificar banco.sql. Documentar novas rotas,
variáveis e migrations em docs/migracao-4x-para-5.md junto da implementação.
Não reutilizar datas/versões antigas sem conferir ordenação de migrations.

## Critérios de aceite antes de ativar

- Token ausente, malformado, expirado, revogado ou de outra OS não revela dados.
- Anexo de outra OS, não publicado, inexistente e caminho fora do storage são negados.
- Renovação concorrente não deixa múltiplos links ativos; rollback preserva consistência.
- OS de R$ 1.000 com recebimentos de R$ 300 e R$ 200 apresenta recebido 500,
  saldo 500 e estado parcial sem mudar o andamento técnico da OS.
- Reenvio idêntico não duplica pagamento; dois recebimentos simultâneos não
  ultrapassam saldo; estorno mantém auditoria e reconcilia lançamentos.
- Conferir totais com descontos da v5, saldo zero, cancelamento, exclusão,
  orçamento alterado e lançamento previamente faturado; sem dupla contabilização.
- MIME falso, arquivo grande e Range inválido são tratados; busca no vídeo
  funciona sem contornar a autorização. Download e preview usam a mesma regra.
- Testes reais de banco em instância descartável, nunca produção; validação
  HTTP nas URLs emitidas e inspeção visual em desktop e celular.
- Antes de PR: composer format, composer test, composer analyse; alterações
  de tela também exigem npm ci, npm run build e testes JS pertinentes.

## Validação executada e limitações

Conferidos fork/parent, branches e release pela conexão GitHub; tag e commit
confirmados no clone. Código da v5 e pontos correspondentes do legado lidos.
A etapa 0 altera somente documentação. Não houve teste funcional ou teste de
banco. PHP e Composer não foram encontrados no PATH deste ambiente; não
instalados. Antes de codificar a próxima etapa, preparar runtime PHP 8.5 e
banco descartável com autorização específica se envolver instalação ou Docker.

Push depende de aprovação específica do destino e commits revisáveis. Deploy,
qualquer operação em dados reais ou mudança de infraestrutura exige nova
confirmação de escopo e plano de recuperação. Não executar comandos de rollback
contra instalações existentes como parte desta preparação.
