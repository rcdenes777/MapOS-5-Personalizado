# Auditoria cega do delta R04

**Revisor:** subagente independente DeepSeek Flash
**Duração:** 455,85 s
**Pacote examinado:** `interface_gpt/reviews/deepseek/R04/` no commit `98cf8b87`; correções finais até `8fba40c7`
**Veredito inicial:** **APTO COM RESSALVAS**

A auditoria confirmou:

- smoke 72, quote 29, portal 24 e portal-page 8, reexecutados;
- browser **44/44** e edge **15/15** na versão inicial, em cópia isolada;
- audit R03 **118 (116 PASS / 0 FAIL / 2 INFO)** e regressão R02 **37/37**;
- axe **22 varreduras / 0 violações**, a11y 6/6 na versão inicial;
- **81 PNG** em 45 desktop, 31 celular e 5 tablet, sem duplicatas;
- **0 links relativos quebrados**;
- diff de código da versão inicial `431c4282..df925de3` = **1 arquivo, +8/−1** (`portal.css`); após as correções finais, **3 arquivos, +16/−9**;
- R01–R03 preservadas, `v5-trifase` remota em `8c256cae`, nenhum arquivo fora de `interface_gpt`;
- o contrato do portal no código: allowlist de projeção, nenhuma escolha inicial, decisão não cria cobrança, versão desatualizada/entrega/revogação bloqueiam resposta, sem vazamento de token ou dados privados.

## Ressalvas e resolução

| Ressalva da auditoria | Resolução nesta revisão |
| --- | --- |
| **F01** verificava privacidade só no `innerText`, não em HTML/atributos. | `browser.cjs` F01 agora varre `body.innerText`, `body.innerHTML` e atributos; `privateHits` e `attrHits` vazios. |
| **D02** não injetava um recebedor sentinela; a asserção de “não expõe recebedor” não era exercitada. | A entrega passou a preencher `RECEBEDOR_PRIVADO`; D02 verifica texto e HTML e confirma ausência. |
| **F03** era satisfeita por qualquer “Resposta registrada”, sem provar que a observação interna ficava fora. | F03 agora exige resposta autorizada visível e ausência de `OBSERVACAO_PRIVADA` no texto e no HTML. |
| **A11y 6/6** não provava individualmente a ordem dos controles; “Escape devolve foco nos modais” era plural sem lastro. | `axe.cjs` agora registra a ordem de Tab `nome → confirmação → submit` por viewport (9/9); o relatório cita apenas o modal de renovação efetivamente testado. |
| **`proveniencia.json`** cobria 8 assets. | Passou a cobrir 10 assets servidos, incluindo `style.css` e `favicon.svg`, com hashes working/codeTree/increment. |
| **Resíduo legado** `openModal('publicresponse')` ainda existia no código, embora sem botão. | Removido da capability e da UI no commit `8fba40c7`; `edge.cjs` X17 confirma que não abre. |
| **Pré-seleção no modal interno** de “Registrar resposta do cliente”. | Select agora começa em “Selecione a resposta” e é `required`; `edge.cjs` X16 confirma `value=""`. |

## Confirmação final

As correções incluem **evidência/teste** e três ajustes técnicos de UI; não alteram regra de negócio nem identidade visual. Os testes foram reexecutados:

- browser **44/44 PASS**;
- a11y **9/9 PASS**;
- axe **22 varreduras / 0 violações**;
- edge **17/17 PASS**;
- audit R03 **116 PASS / 0 FAIL / 2 INFO**;
- regressão R02 **37/37 PASS**;
- 81 PNG únicos, 0 links quebrados;
- diff acumulado `431c4282..8fba40c7`: **3 arquivos, +16/−9**.

O veredito permanece **APTO COM RESSALVAS**: não há falha funcional no delta; as ressalvas restantes são de produto/limite de simulação. O resíduo legado foi removido e a pré-seleção interna foi corrigida.

Arquivos de referência: [`RELATORIO.md`](RELATORIO.md), [`ACHADOS.md`](ACHADOS.md), [`testes/axe.md`](testes/axe.md), [`testes/proveniencia.json`](testes/proveniencia.json).
