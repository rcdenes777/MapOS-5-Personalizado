# R04 — Portal do cliente

Baseline R03: 0fa965b3 (evidências); árvore de código validada b180ab6c.
Referência funcional: 8c256cae4ddaeefad68922abddbb8addfe37c99d.

## Decisões

- Página independente, mobile-first, sem navegação administrativa e sem autenticação simulada na visão do cliente.
- Link por OS, geração explícita, renovação do mesmo endereço, expiração de 120 dias e revogação. A validade é apenas uma simulação local.
- Projeção pública com lista fechada de campos: número da OS, andamento, entrada, previsão, equipamento; versão vigente, itens e condições publicadas; decisão e informações autorizadas sobre seu registro; resumo financeiro (total, pago, saldo, situação) apenas quando houver cobrança.
- Não expor cadastro de cliente, telefone, série, IMEI, anotações, laudos internos, custos, estoque, operador, histórico privado ou versões antigas. O diagnóstico e o defeito compartilhados são textos próprios da versão publicada, não uma cópia automática das anotações internas.
- Cliente escolhe aprovar ou recusar, informa nome, confirma os itens e o total. Não há decisão pré-selecionada. Resposta não cria cobrança, pagamento ou entrega. Versão antiga, retirada ou desatualizada não permite nova resposta pública. Entrega torna o orçamento somente consultável.
- Retirar publicação não equivale a revogar o link; revogar link não apaga orçamento ou decisões. A página continua acessível sem orçamento enquanto o link estiver ativo.
- Hierarquia contextual das ações do orçamento, histórico depois das operações em mobile e confirmação persistente nos modais. Aviso quando o valor do rascunho difere do publicado ou a proposta foi recusada; nenhuma nova trava de cobrança.
- Controles de link acessíveis nos perfis administrativos com acesso financeiro simulado; a permissão eOs real ainda precisa de auditoria completa.

## Fontes de referência consultadas

application/helpers/trifase_publico_helper.php; application/controllers/Publico.php; application/models/Trifase_publico_model.php; application/controllers/Orcamento_publico.php; application/views/trifase/publico.php, publico-financeiro.php, orcamento-conteudo.php, orcamento-atendimento.php, orcamento-decisao.php e os.php; application/models/Trifase_financeiro_model.php (resumoCliente); regras de versão e decisão já estudadas na R03.

## Como testar

1. Abrir a interface pelo mesmo endereço local e navegador usados para o restante do protótipo. Restaurar dados fictícios se necessário.
2. Abrir #os/23/orcamento, gerar link de demonstração e abrir visão do cliente em nova aba. Testar endereço inválido, renovação, revogação e novo link. Confirmar que retirar a publicação não revoga o link.
3. No portal, conferir v1 de R$ 240,00. Aprovar ou recusar sem escolha prévia. Confirmar reflexo na aba administrativa e persistência; nenhuma cobrança automática. Verificar tentativa de segunda resposta e campos inválidos.
4. Em nova rodada, alterar rascunho, verificar que orçamento antigo some da visão pública, publicar v2 e conferir a atualização. Testar versão obsoleta, decisão tardia e link revogado entre abertura e envio do formulário.
5. Após entrega, orçamento vigente fica somente para consulta; não expor recebedor nem data de retirada em cartão independente. Retirada de publicação ainda permitida pela referência.
6. Formalizar cobrança separadamente; conferir total, pago, saldo e situação no portal após pagamentos. Sem cobrança, não mostrar seção financeira. Não incluir custos ou desconto interno; o desconto da proposta publicada é informação do orçamento.
7. Injetar textos fictícios privados em cadastro, laudo, identificação, histórico e observação interna da decisão, e verificar ausência na interface pública. Verificar escaping com textos longos e caracteres HTML.
8. Testar duas abas e alterações concorrentes na medida permitida pelo armazenamento local; não prometer atomicidade. Reexecutar as regressões R02/R03, adaptando o antigo botão "Simular resposta pelo link" ao novo portal.
9. Capturar desktop, tablet e mobile (320/360/390/412/768/1024/1366/1440/1920 quando pertinente). Testar foco, erros, contraste, overflow, cabeçalho, botões de decisão, modais e área de confirmação persistente. Capturar página inteira e detalhes de cada estado. Confirmar que nenhuma requisição externa ocorre.

## Validação inicial

Executados por GPT em JavaScript, sem navegador real: 24 testes de domínio portal; 8 renderizações da página pública; 29 verificações de orçamento; 72 combinações de rotas/perfis; 8 modais gerados. Arquivos de teste: tests/portal.cjs, tests/portal-page.cjs, tests/quote.cjs, tests/smoke.cjs.

## Limites

Este portal é uma simulação no mesmo navegador, perfil e origem HTTP (host e porta iguais). Não compartilhar com clientes reais. O identificador aleatório local NÃO implementa segurança de servidor, CSRF, controle de sessão, token cifrado, isolamento entre usuários, autenticação, expiração contínua ou garantias transacionais. Os dados fictícios integrais permanecem no localStorage e são inspecionáveis; a projeção limita a apresentação, não o acesso ao armazenamento. A atualização entre abas é uma conveniência, não sincronização entre dispositivos. Recarregar ou usar outro navegador pode exigir gerar outro link. Arquivos compartilhados exibem estado vazio: upload, galeria e autorização de anexos estão pendentes. Previsão só aparece se houver valor no modelo de demonstração; editor ainda pendente. Nome da oficina é fictício. Não há contato WhatsApp nem pagamento online. A integração real deverá usar exclusivamente os endpoints autorizados e a proteção do backend original.

A R04 não está homologada em navegador e não autoriza merge ou deploy. Preservar R01–R03. Publicar a revisão em reviews/deepseek/R04.
