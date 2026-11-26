# R07-002 — Matriz F04 de capacidades exigidas

**Fonte:** `application/controllers/Trifase_retornos.php` no SHA de referência `8c256cae4ddaeefad68922abddbb8addfe37c99d` (v5-trifase), conferido com `Trifase_garantia_model.php`, `Trifase_financeiro_model.php` e os testes `TrifaseGarantiaOperacoesTest.php` / `TrifaseRetornoTest.php`.  
**Regra:** o protótipo **não** presume direitos efetivos pelo nome do perfil. Cada ação da demonstração usa uma capacidade simulada (`can(...)`) como substituto conservador da conjunção nativa; a produção deve continuar exigindo as capacidades reais listadas abaixo.

## Capacidades nativas por ação (código original)

| Ação | Capacidades exigidas no original | Referência |
| --- | --- | --- |
| Abrir/consultar retorno e garantia | `vOs` | `Trifase_retornos.php:81` |
| Criar novo retorno | `vOs` + `aOs` + `eOs` | `Trifase_retornos.php:23-25` |
| Avaliar cobertura/solução | `vOs` + `eOs` | `Trifase_retornos.php:139-141` |
| Registrar/corrigir custo interno | `vOs` + `eOs` + `vCustoInterno` + `eCustoInterno` | `Trifase_retornos.php:164-196` |
| Ver valores financeiros do retorno | `vOs` + `vLancamento` | `Trifase_retornos.php:92` |
| Registrar devolução de garantia | `vOs` + `eOs` + `vLancamento` + `reembolsarGarantia` | `Trifase_retornos.php:247-250` |
| Corrigir devolução de garantia | `vOs` + `eOs` + `vLancamento` + `reembolsarGarantia` + `estornarRecebimento` | `Trifase_retornos.php:278-283` |
| Ver/operar a OS de origem | `vOs` (consulta) e `eOs` (edição) | `Trifase_retornos.php:23-25, 81, 139` |
| Estornar recebimento ordinário | `vOs` + `vLancamento` + `estornarRecebimento` | `Trifase_financeiro.php:89-92` |

## Simulação do protótipo (demonstração)

`roleCaps` em `interface_gpt/assets/app.js`:

| Perfil | Capacidades simuladas | Consequência para a garantia |
| --- | --- | --- |
| Administrador | `create, tech, finance, deliver, return, client, settings` | Registra/corrige devolução e custos; consulta valores |
| Financeiro | `finance` | Consulta valores e histórico de devolução; **não** registra/corrige |
| Técnico | `tech` | Avalia retorno; **não** cria retorno (falta `return`/`aOs`), **não** vê valores, comprovante ou motivo financeiro |
| Atendente | `create, deliver, return, client` | Cria retorno/entrega; **não** vê valores, comprovante ou motivo financeiro |

Mapeamento conservador adotado:

- `warrantyRefund` / `warrantyRefundCorrect` → `can('settings')` **e** `can('finance')` para ver o painel. `settings` representa, na simulação, a conjunção `eOs + vLancamento + reembolsarGarantia (+ estornarRecebimento)`; não é uma inferência de que o perfil "Administrador" real tenha esses direitos.
- `warrantyCost` / `warrantyCorrect` → `can('settings')`, no lugar de `vCustoInterno`/`eCustoInterno`.
- `warrantyAssess` → `can('tech')`, no lugar de `eOs`.
- `create` (retorno) → `can('return')`, no lugar de `aOs` + `eOs` (+ `vOs` de leitura).
- Valores financeiros na OS → `can('finance')`, no lugar de `vLancamento`.

## Evidências de comportamento (não de autorização real)

| Verificação | Evidência |
| --- | --- |
| Admin registra parcial/total e corrige | `testes/r07-002-browser.log` R07B-08..15, R07B-24..26; `testes/r07-002-domain.log` D01..D05 |
| Financeiro consulta valores e não executa (nem por handler direto) | R07B-66, R07B-67 |
| Técnico e Atendente sem R$, comprovante ou motivo financeiro | R07B-68-Técnico, R07B-68-Atendente |
| Handler direto não autorizado deixa o estado intacto | R07B-67; `tests/warranty-refund-ui.cjs` (suíte do GPT) |
| Custos internos restritos a Admin na simulação | R07-001 R07-S3/R07N-… (regressão preservada em `testes/r07-browser.log` e `r07-negativos.log`) |
| Portal público sem dados privados | R07B-23, R07B-69; R07E-P-02; D27, N38 |

## Limitações

- A simulação não tem autenticação, sessão ou CSRF; os perfis são apenas um seletor de demonstração.
- A matriz acima é a **exigência** nativa; a correspondência 1:1 com a futura implementação fica para a integração (R10/homologação), sem presumir que os nomes de perfil reais carreguem essas permissões.
- `estornarRecebimento` também protege a correção de devolução no original; na simulação, a correção é bloqueada pela capacidade `settings` e o estorno ordinário por `canReverse() === 'Administrador'`.
- Nenhum teste desta rodada executa o backend PHP ou o banco; a comparação com o original é estática, no SHA de referência.
