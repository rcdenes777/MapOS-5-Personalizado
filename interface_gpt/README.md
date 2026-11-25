# MapOS · Bancada — interface experimental GPT

Protótipo independente, mobile-first, para homologar uma nova experiência de operação.
Baseline funcional: 8c256cae4ddaeefad68922abddbb8addfe37c99d (v5-trifase).

## Executar

Na pasta interface_gpt:

    python3 -m http.server 8080 --bind 127.0.0.1

Abra http://localhost:8080. Não exige PHP, Composer, banco, npm ou internet.
O armazenamento local do navegador contém apenas dados de demonstração; use Configurações > Restaurar dados fictícios para voltar à amostra inicial. O seletor de perfil não é autenticação.

## Direção de design

- Bancada: interface orientada ao trabalho, não à estrutura dos controllers.
- Seis filas do Trifase como atalhos, com contagens independentes.
- Andamento técnico, financeiro e retirada em três indicadores separados.
- Cadastro de OS com dados essenciais à frente e opcionais recolhidos; catálogo editável.
- Mobile-first: navegação inferior, cartões que se reorganizam, formulários em uma coluna, controles de pelo menos 44 px nas ações principais. Sidebar e múltiplas colunas aparecem somente com espaço suficiente.
- HTML, CSS e JavaScript sem dependências externas. Valores dinâmicos são escapados na renderização.

## Fontes funcionais consultadas

No SHA de referência: application/views/trifase/os.php, nova-os-unidade.php, entrega.php, retorno-novo.php, andamento-tecnico.php; application/libraries/Trifase_os_fila.php; application/models/Trifase_entrega_model.php, Trifase_retorno_model.php, Trifase_financeiro_model.php; application/controllers/Mapos.php.

## Módulos disponíveis

| Área | Estado |
| --- | --- |
| Painel e filas | Navegáveis, dados fictícios, filtros |
| Listagem e pesquisa de OS | Interativas |
| Nova OS e identificação | Simulação de nova unidade, catálogo, unidade existente e identificação posterior |
| Retorno | Cria novo atendimento separado, itens/estado opcionais |
| Detalhes da OS | Resumo, atendimento, orçamento, entrega, anexos e histórico |
| Andamento e laudo | Simulação parcial |
| Orçamento/aprovação | Rascunho por peças/serviços, versões, publicação/retirada, decisão interna e pública simulada; cobrança explícita |
| Portal do cliente | Página independente, link local com validade e revogação, resposta à versão vigente e resumo financeiro limitado |
| Pagamento | Simulação de recebimento parcial/integral |
| Retirada | Data, recebedor, próprio/terceiro, autorização, itens e conferência |
| Clientes | Consulta, cadastro simulado |
| Estoque | Consulta demonstrativa |
| Financeiro e relatórios | Visões de demonstração |
| Impressão | Prévia A4 e 80 mm, não documento oficial |
| Perfis | Simulação conservadora de visibilidade; matriz real de permissões ainda não auditada |

## Pendências para refinamento

- Auditoria funcional completa das rotas, estados, permissões, testes e documentação do sistema.
- Paridade completa de orçamento (catálogo de itens, estoque, condições, quantidades fracionárias, edição após cobrança, integração real do link e portal público, regularização de casos legados), cancelamento, estornos, garantia (avaliação, solução, custos), consumo de estoque, vendas, anexos, edição da identificação, gestão de equipamentos, cadastros, relatórios e configurações.
- Impressão em duas vias e demais documentos reais.
- Validação visual em navegador: 320, 360, 390, 768, 1024 e 1440 px; teclado, leitor de tela, toque, orientação, foco, contraste e ausência de overflow.
- Testes de interação reais e comparação dos fluxos com o sistema atual.

## Limites

O protótipo não é um substituto do sistema real. Não possui autenticação, APIs, acesso a produção ou garantia de paridade das regras de negócio. Nenhum dado da oficina é copiado. Nenhum arquivo fora de interface_gpt deve ser modificado na branch experimental. Não integrar à v5-trifase sem autorização.

Verificação inicial: JavaScript compilado; geração de 18 rotas por quatro perfis (72 combinações) sem erros com DOM simulado e sem valores monetários nos perfis demonstrativos não financeiros. Não equivale a teste de navegador ou validação funcional integral.

## Incremento R03 — orçamento

Consulte [R03-ORCAMENTO.md](R03-ORCAMENTO.md) para os cenários novos, decisões e divergências restantes. A R03 foi validada em navegador pelo DeepSeek; consulte reviews/deepseek/R03.

Testes locais sem dependências: `node tests/smoke.cjs` e `node tests/quote.cjs`.

## Incremento R04 — portal do cliente

Consulte [R04-PORTAL.md](R04-PORTAL.md). No orçamento de uma OS, gere o link de demonstração e abra a visão do cliente. A página `portal.html` usa os mesmos dados fictícios do navegador; não compartilha dados entre dispositivos. Não enviar a clientes reais. Rodar `node tests/portal.cjs` e `node tests/portal-page.cjs`, além dos testes anteriores. A revisão em navegador da R04 permanece pendente.
