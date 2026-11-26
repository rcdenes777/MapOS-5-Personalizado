'use strict';
/*
 * R07-001 — mutation testing das guardas novas (cópias scratch, nunca publicadas).
 * Cada mutação altera uma guarda priorizada e roda os testes negativos isolados.
 * Uso: SCRATCH_DIR=/caminho node r07-mutacoes.cjs
 */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SOURCE = path.resolve(__dirname, '../../../../assets');
const SCRATCH = process.env.SCRATCH_DIR || path.join(require('node:os').tmpdir(), 'r07-mutacoes');
const OUT = process.env.RESULT_PATH || path.join(__dirname, 'r07-mutacoes-resultados.json');
const FILES = ['quote.js', 'portal.js', 'finance.js', 'warranty.js'];
const pristine = path.join(SCRATCH, 'pristine');
const work = path.join(SCRATCH, 'work');

fs.rmSync(SCRATCH, { recursive: true, force: true });
fs.mkdirSync(pristine, { recursive: true });
fs.mkdirSync(work, { recursive: true });
for (const f of FILES) fs.copyFileSync(path.join(SOURCE, f), path.join(pristine, f));

const mutations = [
  {
    id: 'R07M-01', file: 'warranty.js', guard: 'retorno ativo único',
    find: "ensure(!active(o,orders),'Já existe retorno em andamento para esta unidade.');",
    replace: '', expect: ['R07N-01']
  },
  {
    id: 'R07M-02', file: 'warranty.js', guard: 'origem com conclusão real',
    find: "root.status==='Finalizado'&&o.status==='Finalizado'&&",
    replace: '', expect: ['R07N-02', 'R07N-02b']
  },
  {
    id: 'R07M-03', file: 'warranty.js', guard: 'mesma unidade e cliente',
    find: "&&o.client===root.client&&lineage(root,p.unit,orders),'Identifique a mesma unidade", replace: ",'Identifique a mesma unidade", expect: ['R07N-04']
  },
  {
    id: 'R07M-04', file: 'warranty.js', guard: 'defeito obrigatório',
    find: "(!required||v.trim())", replace: "true", expect: ['R07N-05']
  },
  {
    id: 'R07M-05', file: 'warranty.js', guard: 'confirmação da entrada',
    find: "ensure(d.confirm,'Confirme o recebimento físico e a abertura de outra OS.');",
    replace: '', expect: ['R07N-06']
  },
  {
    id: 'R07M-06', file: 'warranty.js', guard: 'solução exige cobertura concluída',
    find: "ensure(d.coverage!=='avaliacao'||!d.solution,'Conclua a avaliação de cobertura antes de escolher a solução.');",
    replace: '', expect: ['R07N-11']
  },
  {
    id: 'R07M-07', file: 'warranty.js', guard: 'avaliação stale',
    find: "ensure(Number(d.previous)===(assessment(o)?.id||0),'Outra avaliação foi registrada. Recarregue antes de decidir.');",
    replace: '', expect: ['R07N-14']
  },
  {
    id: 'R07M-08', file: 'warranty.js', guard: 'solução executada não é revista',
    find: "ensure(!executed(o),'Solução já executada. Preserve a avaliação; corrija a operação antes de rever a decisão.');",
    replace: '', expect: ['R07N-16']
  },
  {
    id: 'R07M-09', file: 'warranty.js', guard: 'origem com derivado não reabre',
    find: "ensure(o.status!=='Finalizado'||(!derived(o,orders)&&!activeSibling(o,orders)),'Esta OS já originou retorno. Preserve o atendimento encerrado e use a nova OS.');",
    replace: '', expect: ['R07N-19']
  },
  {
    id: 'R07M-10', file: 'warranty.js', guard: 'troca/devolução pendente bloqueia conclusão',
    find: "ensure(!['troca','devolucao_valor'].includes(s)||executed(o),'Execute a solução de garantia escolhida antes de concluir o retorno.')",
    replace: '', expect: ['R07N-20', 'R07N-21']
  },
  {
    id: 'R07M-11', file: 'warranty.js', guard: 'custo zero/tempo zero',
    find: "(amount||minutes),'Informe custo interno", replace: "(amount>=0),'Informe custo interno", expect: ['R07N-24']
  },
  {
    id: 'R07M-12', file: 'warranty.js', guard: 'teto do custo',
    find: "amount<=999999999", replace: "amount<=9999999999", expect: ['R07N-25']
  },
  {
    id: 'R07M-13', file: 'warranty.js', guard: 'correção única',
    find: "&&!events(o).some(x=>x.type==='corrigir_custo'&&x.reference===e.id)", replace: "", expect: ['R07N-28']
  },
  {
    id: 'R07M-14', file: 'quote.js', guard: 'edição/publicação só com decisão de novo orçamento',
    find: "const returnAllowed=o=>!o.origin||o.warranty?.events?.filter(e=>e.type==='avaliar').at(-1)?.solution==='novo_orcamento';",
    replace: "const returnAllowed=o=>true;", expect: ['R07N-30', 'R07N-31']
  },
  {
    id: 'R07M-15', file: 'quote.js', guard: 'faturar exige aprovação vigente',
    find: "v?.decision?.answer==='Aprovado'&&", replace: "", expect: ['R07N-32']
  },
  {
    id: 'R07M-16', file: 'quote.js', guard: 'faturar exige itens/valores idênticos',
    find: "&&v.total===t.total", replace: "", expect: ['R07N-33', 'R07N-34', 'R07N-35'], equivalentReason: 'vigente() já exige snapshotKey igual (itens e desconto), e o total é derivado desses mesmos campos; a igualdade de total é redundante por construção.'
  },
  {
    id: 'R07M-17', file: 'quote.js', guard: 'publicação pública com entrega',
    find: "(!o.delivery||internal),'Publicação indisponível neste atendimento.'", replace: "true,'Publicação indisponível neste atendimento.'", expect: ['R07N-38']
  },
  {
    id: 'R07M-18', file: 'quote.js', guard: 'edição após entrega',
    find: "&&!o.delivery&&!hasObligation(o)}", replace: "&&!hasObligation(o)}", expect: ['R07N-39']
  },
  {
    id: 'R07M-19', file: 'warranty.js', guard: 'irmão ativo não reabre',
    find: "&&!activeSibling(o,orders)", replace: "", expect: ['R07N-19d']
  },
  {
    id: 'R07M-20', file: 'warranty.js', guard: 'último finalizado por id',
    find: ".sort((a,b)=>b.id-a.id)[0]", replace: ".sort((a,b)=>a.id-b.id)[0]", expect: ['R07N-44']
  },
  {
    id: 'R07M-21', file: 'warranty.js', guard: 'último finalizado exige status Finalizado',
    find: "physical(x).unit===currentUnit(o,orders).unit&&x.status==='Finalizado'", replace: "physical(x).unit===currentUnit(o,orders).unit", expect: ['R07N-45']
  }
];

function runNegatives() {
  const resultPath = path.join(work, 'negativos.json');
  const r = spawnSync(process.execPath, [path.join(__dirname, 'r07-negativos.cjs')], {
    env: { ...process.env, ASSETS_DIR: work, RESULT_PATH: resultPath },
    encoding: 'utf8'
  });
  let data = null;
  try { data = JSON.parse(fs.readFileSync(resultPath, 'utf8')); } catch {}
  return { code: r.status, stdout: r.stdout, stderr: r.stderr, data };
}

const results = [];
for (const m of mutations) {
  fs.rmSync(work, { recursive: true, force: true });
  fs.mkdirSync(work, { recursive: true });
  for (const f of FILES) fs.copyFileSync(path.join(pristine, f), path.join(work, f));
  const target = path.join(work, m.file);
  const original = fs.readFileSync(target, 'utf8');
  if (!original.includes(m.find)) {
    results.push({ ...m, status: 'INCONCLUSIVO', detail: 'trecho não encontrado no arquivo' });
    continue;
  }
  fs.writeFileSync(target, original.split(m.find).join(m.replace));
  const run = runNegatives();
  if (!run.data) {
    results.push({ ...m, status: 'INCONCLUSIVO', detail: 'harness não produziu resultado: ' + (run.stderr || '').slice(0, 300) });
    continue;
  }
  const failed = run.data.results.filter(r => r.status === 'FAIL').map(r => r.id);
  const expectedHit = m.expect.filter(id => failed.includes(id));
  const status = failed.length === 0 ? (m.equivalentReason ? 'EQUIVALENTE' : 'SOBREVIVENTE') : (expectedHit.length ? 'DETECTADA' : 'DETECTADA_FORA_DO_ALVO');
  results.push({
    id: m.id, file: m.file, guard: m.guard, expect: m.expect, failed,
    extra: failed.filter(id => !m.expect.includes(id)), status,
    detail: status === 'SOBREVIVENTE' ? 'nenhum teste negativo falhou' : status === 'EQUIVALENTE' ? m.equivalentReason : ('falhas: ' + failed.slice(0, 8).join(', '))
  });
  console.log(`${status} ${m.id} — ${m.guard} :: ${failed.length ? failed.slice(0, 5).join(', ') : 'sem falhas'}`);
}
fs.writeFileSync(path.join(pristine, '..', 'fixtures.json'), JSON.stringify({ mutations: mutations.map(m => ({ id: m.id, file: m.file, guard: m.guard, expect: m.expect })) }, null, 2));
const summary = results.reduce((s, r) => { s[r.status] = (s[r.status] || 0) + 1; return s; }, {});
fs.writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), source: SOURCE, scratch: SCRATCH, total: results.length, summary, results }, null, 2));
fs.rmSync(work, { recursive: true, force: true });
console.log(`TOTAL ${results.length} · DETECTADA ${summary.DETECTADA || 0} · FORA_DO_ALVO ${summary.DETECTADA_FORA_DO_ALVO || 0} · SOBREVIVENTE ${summary.SOBREVIVENTE || 0} · EQUIVALENTE ${summary.EQUIVALENTE || 0} · INCONCLUSIVO ${summary.INCONCLUSIVO || 0}`);
