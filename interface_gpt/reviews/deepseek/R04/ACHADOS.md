# Achados da R04

## Corrigido e comprovado

| ID | Severidade | Status | Achado | Evidência |
| --- | --- | --- | --- | --- |
| R04-F01 | Baixa (responsividade) | **FIX** | Em 320 px, o selo “Demonstração” quebrava em duas linhas no cabeçalho do portal. | `mobile/00-antes-fix-demo-320.png`; depois `mobile/portal-inicial-320-320x568.png`; `responsivo.json` com `demoOneLine=true`; commit `df925de3` (só `portal.css`). |
| R04-F02 | Baixa (resíduo) | **FIX** | O caminho legado `openModal('publicresponse')` ainda existia no código e podia abrir a antiga simulação por chamada direta. | Removido de `app.js`/`quote-ui.js`; `edge.cjs` X17 confirma que não abre; UI já não oferecia botão. |
| R04-F03 | Média (prevenção) | **FIX** | O modal interno “Registrar resposta do cliente” pré-selecionava “Aprovado” no primeiro item do select. | `select` agora inicia em “Selecione a resposta” e é `required`; `edge.cjs` X16 confirma `value=""` e obrigatoriedade. |

## Observações e limites declarados

| ID | Severidade | Status | Achado | Evidência/decisão |
| --- | --- | --- | --- | --- |
| R04-A01 | Alta (fora do escopo) | **LIMITE** | O identificador local não implementa segurança real: sem servidor, CSRF, autenticação, isolamento entre usuários, token cifrado ou garantia transacional. | Declarado em `R04-PORTAL.md` e no rodapé do portal; não é tratado como falha da demonstração. |
| R04-A02 | Baixa | **LIMITE** | A expiração não roda em timer contínuo com a aba aberta; é reavaliada em recarga, foco, mudança de hash ou evento de armazenamento. | `R04-PORTAL.md` limita a expiração a simulação local; `edge.cjs` X03 valida a reavaliação por armazenamento. |
| R04-A03 | Baixa (a11y) | **OBSERVAÇÃO** | A atualização entre abas troca o conteúdo sem `aria-live` dedicado; leitores de tela podem não anunciar mudanças. | axe 22/0 não detecta; não foi tratado como bloqueio. |
| R04-A04 | Baixa | **OBSERVAÇÃO** | “Ver endereço para copiar” exibe e seleciona o endereço, mas não usa Clipboard API. | Rótulo deliberadamente não promete cópia automática; `browser.cjs`/X08 verifica o endereço. |
| R04-A05 | Baixa | **INTENCIONAL** | Sem orçamento publicado, o link permanece ativo e o portal mostra “Não há orçamento publicado”; retirar a publicação não revoga o link. | R04 decisão explícita; `browser.cjs` C06/C07. |

## O que não foi tratado como falha

- **Aprovação sem cobrança:** comportamento central do contrato, confirmado em `browser.cjs` B02.
- **Pagamento só após formalização:** independência financeira exigida; `browser.cjs` E01–E04.
- **Portal sem formulário após entrega:** modo somente consulta; `browser.cjs` D01–D03.
- **Recusa sem cobrança automática:** total zero; `browser.cjs` B06.
- **Diagnóstico em `<details>` fechado:** o conteúdo está no HTML escapado e é acessível ao expandir; não é vazamento nem falta de dado.
- **Link local copiado por seleção:** o R04 declara que não é um link real de WhatsApp; não há promessa de integração com clipboard.

## Escopo preservado

- Nenhum backend, banco, produção ou branch `v5-trifase` foi alterado.
- R01–R03 preservadas integralmente.
- Código alterado no total: `portal.css` (selo 320), `app.js` e `quote-ui.js` (remoção do resíduo legado e escolha explícita interna), commits `df925de3` e `8fba40c7`.
