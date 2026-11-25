# Correções técnicas da R03

**Commit:** `b180ab6ca10910c23d77b686af1a2b9da8d771d7`
**Diff em relação ao incremento do GPT:** `798b8075..b180ab6c` — **1 arquivo, +12 linhas**
**Arquivo alterado:** `interface_gpt/assets/style.css`

Nenhuma alteração em HTML, JavaScript, domínio, textos, regras de negócio, tabela, permissão ou fluxo financeiro. As duas correções abaixo foram encontradas em navegador real e validadas novamente após a alteração.

---

## FIX-01 — cabeçalho do modal em 320 px

### Antes

Em `320×568`, o título “Preparar orçamento” ocupava duas linhas e o botão “Fechar” era comprimido para **“Fecha / r”**, com o texto quebrado dentro do botão de 44 px.

Evidência: [`mobile/00-antes-correcao-fechar-320x568.png`](mobile/00-antes-correcao-fechar-320x568.png).

### Depois

O cabeçalho não quebra, o título pode encolher e o botão não encolhe; abaixo de 380 px o título e o botão recebem ajuste de fonte/padding.

Evidência: [`mobile/02-editor-320-antes-de-preencher-320x568.png`](mobile/02-editor-320-antes-de-preencher-320x568.png) (é o editor **depois** da correção, antes de preencher) e [`mobile/e9-editor-320.png`](mobile/e9-editor-320.png). O teste R03-RESP-EDITOR-narrow registra `closeOneLine=true`, `closeH=44`, `overflow=0` e `submitBottom=526`.

```css
.modal-head{flex-wrap:nowrap}
.modal-head h2{min-width:0}
.modal-head button{flex:none;white-space:nowrap}
@media(max-width:380px){
  .modal-head h2{font-size:1.05rem}
  .modal-head button{padding:8px 10px;font-size:.8rem}
}
```

---

## FIX-02 — contraste do breadcrumb

### Antes

O axe-core 4.14.1 registrava **1 violação `color-contrast` (serious)** em `390×844` no `#breadcrumb`: **4,46:1** para texto normal de 12,8 px sobre o fundo composto do topo translúcido (`#e8f0ec`). O limite WCAG AA é 4,5:1.

### Depois

A cor do bloco do topo passou de `var(--muted)` para `#5a6d68`. O contraste calculado passou a **4,74:1** sobre `#e8f0ec` (e **5,24:1** sobre `#f8faf7` opaco). A varredura final tem **12 telas/estados × 0 violações**.

Evidência: [`testes/axe.md`](testes/axe.md).

```css
.top-left{color:#5a6d68}
```

---

## Escopo preservado

- `tests/smoke.cjs`: 72 combinações, PASS.
- `tests/quote.cjs`: 29 checks, PASS.
- Regressão R02: 37/37 PASS.
- Auditoria adaptada: 116 PASS, 0 FAIL, 2 INFO.
- Nenhum arquivo de `v5-trifase`, banco, produção ou backend foi alterado.
- A R02 foi restaurada ao estado publicado antes do commit das evidências.
