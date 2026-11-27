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
| Pagamento | Recebimento parcial/integral, estorno de registro, recibo e histórico local |
| Retirada | Data, recebedor, próprio/terceiro, autorização, itens e conferência |
| Clientes | Consulta, cadastro simulado |
| Estoque | Consulta demonstrativa |
| Financeiro e relatórios | Contas de OS, vencimentos, filtros e busca; relatórios de demonstração |
| Impressão | Prévia A4 e 80 mm, não documento oficial |
| Perfis | Simulação conservadora de visibilidade; matriz real de permissões ainda não auditada |

## Pendências para refinamento

- Auditoria funcional completa das rotas, estados, permissões, testes e documentação do sistema.
- Paridade completa de orçamento (catálogo de itens, estoque, condições, quantidades fracionárias, edição após cobrança, integração real do link e portal público, regularização de casos legados), validação especial de saldo anterior, conciliação e projeções nativas, garantia (avaliação, solução, custos), consumo de estoque, vendas, anexos, edição da identificação, gestão de equipamentos, cadastros, relatórios e configurações.
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

Consulte [R04-PORTAL.md](R04-PORTAL.md). No orçamento de uma OS, gere o link de demonstração e abra a visão do cliente. A página `portal.html` usa os mesmos dados fictícios do navegador; não compartilha dados entre dispositivos. Não enviar a clientes reais. Rodar `node tests/portal.cjs` e `node tests/portal-page.cjs`, além dos testes anteriores. A R04 foi validada pelo DeepSeek; consulte reviews/deepseek/R04.

## Incremento R05 — financeiro

Consulte [R05-FINANCEIRO.md](R05-FINANCEIRO.md). Abra Financeiro no menu ou na aba da OS. Estorno corrige registro, não devolve dinheiro. Testes: `node tests/finance.cjs` e `node tests/finance-ui.cjs`, além das suítes anteriores. R05 validada pelo DeepSeek; consulte reviews/deepseek/R05.

## Incremento R06 — cancelamentos

Consulte [R06-CANCELAMENTOS.md](R06-CANCELAMENTOS.md). Abra a aba Cancelamento de uma OS elegível. Pedido, conferência técnica e acerto financeiro são independentes. Registre perda sem retorno ao estoque, devolução como evento separado, saldo a receber e retificação nos casos simulados. Testes: `node tests/cancel.cjs` e `node tests/cancel-ui.cjs` além das seis suítes anteriores. R06 validada pelo DeepSeek em navegador real; consulte [reviews/deepseek/R06](reviews/deepseek/R06/RELATORIO.md).

## Ensaio nativo de listagem de OS — somente laboratório

Este ensaio é separado do simulador: o navegador usa a listagem e o detalhe
renderizados pelo MapOS nativo, com a sessão, os filtros e as permissões do
servidor. `assets/native-os-list.css` apenas ajusta a apresentação da lista;
não lê dados, não concede permissões e não implementa regras de negócio. O
compose opcional monta uma cópia do CSS nativo com esse acréscimo, somente
leitura, no laboratório sintético. **Não é instalação nem deploy para produção.**

O procedimento abaixo é específico do laboratório existente neste host. Não
use em outro alvo sem revisar o caminho, o checkout e a configuração. O overlay
é experimental: depende da estrutura HTML e dos rótulos nativos; navegadores
sem suporte a `:has()` mantêm a apresentação original. O build da raiz não
compila este arquivo e não equivale a uma integração para produção.

```bash
(
set -eu
LAB=/home/dragonblue/workspace/mapos-r08-006-native-lab
REPO=/home/dragonblue/workspace/interface-gpt-lab/repo
# Recuse código nativo diferente ou com alterações antes de preparar arquivos.
test "$(git -C "$LAB/source" rev-parse HEAD)" = 8c256cae4ddaeefad68922abddbb8addfe37c99d
test -z "$(git -C "$LAB/source" status --porcelain)"
export NODE_PATH=/home/dragonblue/workspace/interface-gpt-lab/tools/node_modules
node "$REPO/interface_gpt/referencias/laboratorio/test-guard.cjs"
LAB="$LAB" REPO="$REPO" python3 - <<'PY'
import os
from pathlib import Path
lab, repo = Path(os.environ['LAB']), Path(os.environ['REPO'])
base = (lab / 'source/assets/dist/app.css').read_bytes()
extra = (repo / 'interface_gpt/assets/native-os-list.css').read_bytes()
target = lab / 'runtime/bancada-app-v6.css'
data = base + b'\n' + extra
if target.exists():
    if target.read_bytes() != data:
        raise SystemExit('Arquivo existente difere; não foi sobrescrito')
else:
    with target.open('xb') as file:
        file.write(data)
PY
# Recria somente o app sintético; sessões de laboratório podem expirar.
docker compose -f "$LAB/compose.yaml" -f "$REPO/interface_gpt/referencias/laboratorio/compose-bancada.yaml" up -d --no-deps --no-build --pull never app
export NODE_PATH=/home/dragonblue/workspace/interface-gpt-lab/tools/node_modules
node "$REPO/interface_gpt/referencias/laboratorio/test-guard.cjs"
node "$REPO/interface_gpt/referencias/laboratorio/test-read.cjs"
node "$REPO/interface_gpt/referencias/laboratorio/test-os-equipment-layout.cjs"
)
```

Para retornar ao CSS original, recrie apenas o app com o compose-base:

```bash
docker compose -f /home/dragonblue/workspace/mapos-r08-006-native-lab/compose.yaml up -d --no-deps --no-build --pull never app
```

A verificação visual até aqui usou Chromium e dados sintéticos; não é cobertura
em aparelhos reais, WebKit ou Firefox. Na referência exercitada, os SHA-256 são:

- CSS nativo: `ac7c224bf76a879c7eee901485da33bb73b9b7168e612fb546691c957854d6a4`.
- Overlay: `4ea423f4e726d8e349d843b4098a4715272cf63573e3dfcbdb4eb9b26e2f7f01`.
- CSS combinado: `478efdfba10898515df902af8e737ec42cefb27e79334bd70c98a19ea3a4343a`.

O retorno do overlay não altera o banco. Antes de cada uso, confira se o hash
servido de `assets/dist/app.css` corresponde ao arquivo esperado. Não exponha o
laboratório nem use credenciais ou dados reais. Veja as capturas e a verificação
em [evidencias/](evidencias/).
