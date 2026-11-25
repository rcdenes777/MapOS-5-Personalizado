# Correções técnicas da R05

**Incremento:** `f3bbf1bd6d7269fa6a977d83116a82d5886edd83`
**Árvore final:** `0d0b4e74297d77939e8c6060759ca419f7956ad9`
**Diff contra o incremento:** `f3bbf1bd..0d0b4e74` — **1 arquivo, +2/−2** (`assets/style.css`)
**Natureza:** somente CSS de layout; nenhuma regra financeira, texto, identidade visual ou funcionalidade nova.

## F05-01 — vão no “Resumo da cobrança”

**Problema:** o painel lateral da aba Financeiro usava `display:grid` com `.form-section`; a grade esticava o `<h2>` para preencher a altura do painel. O título “Resumo da cobrança” ocupava **90,8 px**, deixando um vão grande antes do selo “Parcial”.

**Correção:**

```css
.finance-order .stack .panel{align-content:start}
```

**Depois:** `<h2>` com **38,6 px**; o selo sobe e o painel mantém o conteúdo compacto no topo, mesmo quando a coluna esquerda é mais alta.

**Antes:** [`desktop/00-antes-gap-resumo-1440.png`](desktop/00-antes-gap-resumo-1440.png)  
**Depois:** [`desktop/os23-estornado-1440.png`](desktop/os23-estornado-1440.png)

## F05-02 — valor extremo em 320 px

**Problema:** no mobile, o saldo `R$ 9.999.999,99` quebrava o último dígito e as métricas extremas quebravam em duas linhas porque herdavam `overflow-wrap:anywhere`.

**Correção, limitada a ≤359 px:**

```css
@media(max-width:359px){
  .finance-metrics .stat strong{
    white-space:nowrap;
    font-size:clamp(.78rem,3.4vw,1.5rem)
  }
  .finance-balance .money{
    white-space:nowrap;
    font-size:.95rem
  }
}
```

**Depois:** o valor fica inteiro em uma linha, sem overflow; medido `scrollWidth = clientWidth` em 320. O layout normal de 390/768/1440 não é afetado.

**Antes:** [`mobile/00-antes-valor-extremo-320.png`](mobile/00-antes-valor-extremo-320.png)  
**Depois:** [`mobile/central-valor-extremo-320.png`](mobile/central-valor-extremo-320.png)

## Escopo e reexecução

- As duas correções foram commitadas em `0d0b4e74`, depois do incremento.
- Browser **56/56**, bordas **18/18**, axe **16/0**, teclado **3/3**.
- Regressões R04 **44/44 + 17/17**, R02 **37/37**, R03 **118 (116/0/2)**.
- Nenhum arquivo de R01–R04 foi alterado.
- Nenhuma alteração em backend, banco, produção ou `v5-trifase`; `v5-trifase` remota permanece em `8c256cae`.
- Os PDFs de recibo normal e estornado foram gerados em [`recibos/`](recibos/).
