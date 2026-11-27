# Evidência — listagem nativa de OS no laboratório sintético

## Escopo e associação

Esta evidência acompanha **no mesmo commit** `assets/native-os-list.css`, os testes
e o compose opcional em `referencias/laboratorio/`. A base do repositório antes
desta entrega era `56561eac7d50df18fee28a6492feae3dc263ab81`; o código nativo
montado no laboratório é `8c256cae4ddaeefad68922abddbb8addfe37c99d`. As
capturas foram feitas no laboratório sintético, sem dados ou credenciais reais.
O detalhe é a tela nativa, não uma tela redesenhada pela alteração.

O overlay é um **experimento local**, não uma instalação de produção. Ele altera
apenas apresentação da listagem nativa; dados, filtros, navegação, sessão e
permissões continuam no backend. A folha é anexada a uma cópia do CSS nativo e
montada somente para leitura no contêiner `app`. O código nativo não foi editado.
O build nativo não compila automaticamente este overlay.

## Capturas

| Arquivo | Perfil e estado | Viewport | SHA-256 |
| --- | --- | --- | --- |
| [Lista móvel](os-lista-admin-mobile-320.png) | Administrador, lista de OS | 320 × 900 | `bac530af82139b84636a03c5f10c8378eb1779749dbe2391278f7d770c4d1b2d` |
| [Lista tablet 640](os-lista-admin-tablet-640.png) | Administrador, lista de OS | 640 × 900 | `c83fab69c4c0b717e762e024b46f5358ead642b5831a63fd7d1a2a20e57a4558` |
| [Lista tablet 768](os-lista-admin-tablet-768.png) | Administrador, lista de OS | 768 × 900 | `afa602e91450da1712a3d78f144e5d8ce3d9490cc70cbacc250e0ce70e88a731` |
| [Lista tablet](os-lista-admin-tablet-1024.png) | Administrador, lista e filtros | 1024 × 900 | `ca2bba86f3bb6cf773d0a53588db0cdeebe5b871118c1c8ea8e2106ba0c6dd6c` |
| [Lista desktop](os-lista-admin-desktop-1440.png) | Administrador, lista de OS | 1440 × 900 | `e359708081fa3714f5df4bc712ca2cc0b2798620807b75b66454b1b6643aaec3` |
| [Lista técnica móvel](os-lista-tecnico-mobile-390.png) | Técnico, lista de OS | 390 × 900 | `d5e1c9153e0bd780b30b47d7885e1d508b33e57415e079cbc02c9c60e7be8027` |
| [Detalhe técnico](os-detalhe-tecnico-tablet-1024.png) | Técnico, detalhe nativo de OS | 1024 × 900 | `af907aafc928e9e128719be89a23d3e4befb3ff9b47757c633e3a392fa2a7647` |

As capturas foram revisadas visualmente. O laboratório estava preenchido com
fixtures sintéticas; por exemplo, nomes de clientes e telefones são fictícios.
A presença de ações para OS canceladas reflete a configuração nativa sintética
`control_editos=1`; não é demonstração de validação das mutações.

## Verificação executada

- `test-guard.cjs`: alvo vivo e três rejeições simuladas passaram.
- `test-read.cjs`: acesso anônimo redirecionado ao login; administrador e
  técnico acessaram lista/detalhe, busca positiva e vazia; coluna `Total` ausente
  para técnico. Layout do técnico exercitado em 320 e 1024 px.
- `test-os-equipment-layout.cjs`: Chromium em 320, 390, 639, 640, 641, 768, 1023,
  1024, 1100, 1199, 1200, 1440 e 1600 px. Verificou controles, largura de busca,
  sobreposição, navegação para detalhe e overflow por `scrollWidth`/`clientWidth`
  com textos longos inseridos somente no DOM de teste. Impressão estreita não
  aplica o ajuste mobile.
- Na fixture, a tabela em 320 px passou de 322/286 px (conteúdo/contêiner) para
  286/286 px; em 1024 px, busca passou de 26 para 222 px e a tabela ficou
  722/722 px. Esses números não garantem ausência de overflow para todo dado.
- Chromium AX em 320 px: 1 tabela, 11 linhas incluindo cabeçalho, 90 células de
  dados e 9 cabeçalhos, igual à contagem observada na base. Não substitui teste
  com leitor de tela.
- Retorno ao compose-base: CSS original servido por HTTP com hash idêntico ao
  arquivo nativo; reaplicação do overlay e testes passaram. Durante uma partida,
  houve `502` transitório; uma nova verificação confirmou login `200`.
- O procedimento de ativação e testes documentado no README foi exercitado no
  laboratório. As 19 suítes `.cjs` do simulador passaram. A correção do aviso de
  demonstração também foi conferida em mídia de impressão.
- `npm run build` e `npm run test:js` passaram em cópia descartável da base nativa;
  `test:js`: 216 testes, 0 falhas. `npm run test` não existe no `package.json`.
  O build nativo não valida a montagem do overlay.

## Identidade dos arquivos

| Artefato | SHA-256 |
| --- | --- |
| CSS nativo | `ac7c224bf76a879c7eee901485da33bb73b9b7168e612fb546691c957854d6a4` |
| Overlay | `4ea423f4e726d8e349d843b4098a4715272cf63573e3dfcbdb4eb9b26e2f7f01` |
| CSS combinado, host/contêiner/HTTP/navegador | `478efdfba10898515df902af8e737ec42cefb27e79334bd70c98a19ea3a4343a` |

## Revisão independente e limitações

Revisões independentes, realizadas por análise de evidências fornecidas e sem
execução de ferramentas pelo revisor, aceitaram a versão anterior **somente como
experimento Chromium no laboratório**. Elas identificaram a necessidade de
conferir bytes servidos, cache, acessibilidade, impressão e nomes longos. A
revisão do delta de 640 a 1023 px não encontrou bloqueante para commit local
experimental; a lacuna nessa faixa foi reproduzida, corrigida e testada. O
revisor não executou testes e a conclusão não autoriza produção.

Ainda faltam Firefox/WebKit, aparelhos reais, zoom e teste com leitor de tela. O
seletor depende do texto e da estrutura HTML do nativo e pode deixar de casar
após mudanças; uma integração sustentável requer contrato de apresentação
estável e processo de build próprio. A captura de detalhe e as verificações de
leitura não comprovam criação, edição, estoque, pagamentos, cancelamentos ou
paridade funcional completa. Nenhuma alteração foi promovida a produção.

## Recursos

A supervisão e as verificações foram executadas no ambiente Hermes local; as
revisões delegadas usaram a rota informada como `deepseek-flash`. Para o
mapeamento e as revisões desta fatia, há 8 durações informadas,
que somam 518,98 segundos de execução de agentes; não são tempo de relógio nem
incluem todas as chamadas locais. Consumo de tokens, cobrança e custo estimado
não foram disponibilizados: **desconhecidos**, não zero.
