# R08-002 — Evidência parcial, não aprovada

Candidato inicial e código examinado: `647dec727fbbc6673fa713d517476f4336fb3314`; referência funcional: `8c256cae4ddaeefad68922abddbb8addfe37c99d`. Manifesto SHA-256 do checkout em `proveniencia.json`. Apenas dados fictícios; sem backend, banco ou produção.

## Executado

- 18 suítes Node do projeto: todas com exit 0; stdout/stderr e contagens declaradas por suíte em `testes/node-suites.json`. São testes JavaScript, não demonstram cobertura completa.
- Regressão anterior R08-001 domínio: 35 PASS, 0 FAIL; `testes/r08-domain.log` e JSON. Cópia adaptada exclusivamente para incluir `stock.js` no carregamento.
- Regressão anterior R08-001 browser: 40 PASS, 0 FAIL; Chromium headless em servidor HTTP local, capturas e logs nesta pasta. Inclui três scans axe em estados antigos. Não é teste completo das novas operações de estoque.
- `node testes/normalizacao-rejeitada.cjs`: exit 1, rejeição `Item não encontrado.` mas objeto de OS em memória modificado pela inicialização de `quote` antes da rejeição. Entrada sintética legada com pedido pendente e sem quote; o teste não prova persistência no localStorage nem perda financeira. Ver JSON e script. Não se demonstrou ainda se é regressão introduzida neste candidato; investigar alcance e tratamento antes de afirmar correção.

## Não executado / bloqueios de aceite

Matriz e navegador específicos de estoque, FormData e perfis, regressões acumuladas restantes R02–R07, impressão, mutações exigidas e revisão independente DeepSeek Flash não foram concluídos. Nenhuma aprovação ou fechamento de F03 pode ser inferido dos resultados parciais. Não houve revisão independente nem correção de código; preservado o candidato. A observação de normalização exige reprodução com entrada realista e controle positivo antes de decidir correção. A inspeção de permissões é exclusivamente do protótipo, não autenticação de servidor.
