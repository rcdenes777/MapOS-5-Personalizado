# Correções técnicas da R04

**Árvore de código final:** `8fba40c72bba50b0c7f6f75f89a99ab34f5e7e90`
**Incremento:** `431c428270e2ca98fece34c8ebc58624320b8628`
**Diff acumulado contra o incremento:** `431c4282..8fba40c7` — **3 arquivos, +16/−9**
**Commits de correção:** `df925de3` (portal.css) e `8fba40c7` (app.js/quote-ui.js)

As correções são técnicas e restritas ao protótipo. Nenhum backend, banco, produção, identidade visual ou regra de negócio foi alterado.

---

## F04-01 — selo “Demonstração” em 320 px

**Commit:** `df925de3` · `assets/portal.css` · +8/−1.

Em `320×568`, o selo quebrava como **“Demonstraç / ão”** em duas linhas. O cabeçalho agora mantém o selo em uma linha, sem overflow. O teste `R04-RESP-PORTAL-320` registra `demoOneLine=true`, `demoText="Demonstração"` e `overflow=0`.

Antes: [`mobile/00-antes-fix-demo-320.png`](mobile/00-antes-fix-demo-320.png). Depois: [`mobile/portal-inicial-320-320x568.png`](mobile/portal-inicial-320-320x568.png).

```css
/* R04: selo de demonstração em uma linha no cabeçalho de 320 px. */
.customer-demo{white-space:nowrap}
@media(max-width:359px){
  .customer-header{gap:8px}
  .customer-demo{flex:none;font-size:.7rem;padding:4px 5px}
}
```

---

## F04-02 — resíduo `publicresponse` removido

**Commit:** `8fba40c7` · `assets/app.js` + `assets/quote-ui.js`.

O caminho legado `openModal('publicresponse')` e o botão “Simular resposta pelo link” foram removidos da capability e da UI. A decisão pública agora só existe em `portal.html`. O teste `edge.cjs` X17 chama `openModal('publicresponse',23)` e confirma que o modal **não abre**.

```text
cap/capability: sem publicresponse
quoteModal/handleQuoteSubmit: somente approval
```

---

## F04-03 — resposta interna sem pré-seleção

**Commit:** `8fba40c7` · `assets/app.js` + `assets/quote-ui.js`.

O select do modal interno “Registrar resposta do cliente” iniciava em **“Aprovado”** por ser o primeiro item. Agora:

- o primeiro item é **“Selecione a resposta”** com valor vazio;
- o campo é `required`;
- o teste `edge.cjs` X16 confirma `value=""`, `required=true` e que o modal não registra decisão sem escolha.

O portal público já estava correto: os dois rádios começam `checked=false`.

```html
<select name="answer" required>
  <option value="">Selecione a resposta</option>
  <option value="Aprovado">Aprovado</option>
  <option value="Recusado">Recusado</option>
</select>
```

---

## Escopo preservado

- `tests/smoke.cjs`: 72 combinações, PASS.
- `tests/quote.cjs`: 29/29 PASS.
- `tests/portal.cjs`: 24/24 PASS.
- `tests/portal-page.cjs`: 8/8 PASS.
- Navegador real: 44/44 fluxos e 17/17 bordas.
- Auditoria R03 adaptada: 118 verificações, 116 PASS, 0 FAIL, 2 INFO.
- Regressão R02: 37/37 PASS.
- axe: 22 varreduras, 0 violações; 9/9 controles/teclado.
- Capturas: 81 PNG, 0 duplicadas.
- R01–R03 preservadas; `v5-trifase` em `8c256cae`; produção intocada.
