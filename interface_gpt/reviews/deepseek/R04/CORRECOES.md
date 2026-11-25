# Correções técnicas da R04

**Correção:** `df925de31c09b2cc116abb025e9fdca5d39f5183`
**Diff contra o incremento:** `431c4282..df925de3` — **1 arquivo, +8/−1**
**Arquivo:** `interface_gpt/assets/portal.css`

Nenhuma alteração em JavaScript, HTML, orçamento, portal, regras, permissões ou backend. A única mudança foi responsividade do selo do cabeçalho do portal.

---

## F04-01 — selo “Demonstração” em 320 px

### Antes

Em `320×568`, o selo quebrava como **“Demonstraç / ão”**, com duas linhas, enquanto o cabeçalho ainda tentava manter a marca.

Evidência: [`mobile/00-antes-fix-demo-320.png`](mobile/00-antes-fix-demo-320.png).

### Depois

O selo fica em **uma linha**, o cabeçalho permanece dentro da largura e não há overflow horizontal. O teste `R04-RESP-PORTAL-320` registra `demoOneLine=true`, `demoText="Demonstração"` e `overflow=0`.

Evidência: [`mobile/portal-inicial-320-320x568.png`](mobile/portal-inicial-320-320x568.png).

```css
/* R04: selo de demonstração em uma linha no cabeçalho de 320 px. */
.customer-demo{white-space:nowrap}
@media(max-width:359px){
  .customer-header{gap:8px}
  .customer-demo{flex:none;font-size:.7rem;padding:4px 5px}
}
```

---

## Escopo preservado

- `tests/smoke.cjs`: 72 combinações, PASS.
- `tests/quote.cjs`: 29/29 PASS.
- `tests/portal.cjs`: 24/24 PASS.
- `tests/portal-page.cjs`: 8/8 PASS.
- Navegador real: 44/44 fluxos e 15/15 bordas.
- Auditoria R03 adaptada: 116 PASS, 0 FAIL, 2 INFO.
- Regressão R02: 37/37 PASS.
- axe: 22 varreduras, 0 violações.
- Capturas: 81 PNG, 0 duplicadas.
- R01–R03 preservadas; `v5-trifase` em `8c256cae`; produção intocada.
