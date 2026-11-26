'use strict';
/*
 * R07-002 — mutation testing das guardas novas da devolução/F02.
 * Cada mutação altera uma guarda priorizada em cópia scratch e roda os negativos.
 * Nenhum mutante é publicado; o checkout não é alterado.
 * Uso: SCRATCH_DIR=/scratch/r07-002-mutacoes node r07-002-mutacoes.cjs
 */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SOURCE = process.env.ASSETS_DIR || path.resolve(__dirname, '../../../../assets');
const SCRATCH = process.env.SCRATCH_DIR || path.join(require('node:os').tmpdir(), 'r07-002-mutacoes');
const OUT = process.env.RESULT_PATH || path.join(__dirname, 'r07-002-mutacoes-resultados.json');
const FILES = ['quote.js', 'portal.js', 'finance.js', 'cancel.js', 'warranty.js'];
const pristine = path.join(SCRATCH, 'pristine');
const work = path.join(SCRATCH, 'work');

fs.rmSync(SCRATCH, { recursive: true, force: true });
fs.mkdirSync(pristine, { recursive: true });
fs.mkdirSync(work, { recursive: true });
for (const f of FILES) fs.copyFileSync(path.join(SOURCE, f), path.join(pristine, f));

const mutations = [
  { id: 'R07M2-01', file: 'warranty.js', guard: 'solução vigente exige devolução', find: "ensure(a?.solution==='devolucao_valor'&&a.coverage!=='avaliacao','A avaliação mudou ou não permite esta solução. Reabra e confira.');", replace: '', expect: ['N01'] },
  { id: 'R07M2-02', file: 'warranty.js', guard: 'cobertura concluída', find: "&&a.coverage!=='avaliacao'", replace: '', expect: ['N02'] },
  { id: 'R07M2-03', file: 'warranty.js', guard: 'avaliação esperada (stale)', find: "ensure(Number(d.assessment)===a.id,'A avaliação mudou ou não permite esta solução. Reabra e confira.');", replace: '', expect: ['N03'] },
  { id: 'R07M2-04', file: 'warranty.js', guard: 'chave financeira', find: "ensure(d.key===refundKey(origin),'O financeiro mudou. Recarregue e confira novamente o valor.');", replace: '', expect: ['N04'] },
  { id: 'R07M2-05', file: 'warranty.js', guard: 'devolução não excede o recebido', find: "ensure(d.amount<=s.paid&&(d.mode!=='total'||d.amount===s.paid),'A devolução deve respeitar o recebido líquido; no encerramento total, devolva exatamente esse valor.');", replace: '', expect: ['N05'] },
  { id: 'R07M2-06', file: 'warranty.js', guard: 'total devolve exatamente o recebido', find: "(d.mode!=='total'||d.amount===s.paid)", replace: "true", expect: ['N06'] },
  { id: 'R07M2-07', file: 'warranty.js', guard: 'modalidade e valor válidos', find: "ensure(['parcial','total'].includes(d.mode)&&Number.isSafeInteger(d.amount)&&d.amount>=0&&d.amount<=999999999&&(d.amount>0||d.mode==='total'),'Confira modalidade e valor devolvido.');", replace: '', expect: ['N07', 'N08'] },
  { id: 'R07M2-08', file: 'warranty.js', guard: 'forma de devolução permitida', find: "ensure(BancadaFinance.methods.includes(d.method),'Forma de devolução inválida.');", replace: '', expect: ['N09'] },
  { id: 'R07M2-09', file: 'warranty.js', guard: 'data não futura', find: "&&d.date<=day", replace: '', expect: ['N10'] },
  { id: 'R07M2-10', file: 'warranty.js', guard: 'data não anterior a eventos financeiros', find: "ensure(!(origin.financeLedger?.events||[]).some(e=>!e.type.startsWith('warranty_')&&e.date>d.date),'Data anterior aos registros financeiros da origem.');", replace: '', expect: ['N12'] },
  { id: 'R07M2-11', file: 'warranty.js', guard: 'textos obrigatórios e limites', find: "(!required||v.trim())", replace: "true", expect: ['N13', 'N14'] },
  { id: 'R07M2-12', file: 'warranty.js', guard: 'confirmação da devolução', find: "ensure(d.confirm,'Confirme que o dinheiro já foi devolvido fora do sistema e confira o abatimento.');", replace: '', expect: ['N15'] },
  { id: 'R07M2-13', file: 'warranty.js', guard: 'retorno sem cobrança própria', find: "ensure(!BancadaFinance.hasObligation(o),'Concilie a cobrança própria deste retorno antes de executar outra solução.');", replace: '', expect: ['N18'] },
  { id: 'R07M2-14', file: 'warranty.js', guard: 'retorno sem entrega', find: "ensure(!o.delivery,'Corrija a entrega antes de executar outra solução.');", replace: '', expect: ['N19'] },
  { id: 'R07M2-15', file: 'warranty.js', guard: 'retorno aberto (não finalizado/cancelado)', find: "ensure(!['Cancelado','Finalizado'].includes(o.status),'Execute a solução antes de concluir ou entregar o retorno.');", replace: '', expect: ['N20'] },
  { id: 'R07M2-16', file: 'warranty.js', guard: 'publicação retirada', find: "ensure(!BancadaQuote.active(o),'Retire a publicação do orçamento antes de executar troca ou devolução.');", replace: '', expect: ['N21'] },
  { id: 'R07M2-17', file: 'warranty.js', guard: 'cobrança já encerrada', find: "ensure(credit>0,'A cobrança já está encerrada.');", replace: '', expect: ['N22'] },
  { id: 'R07M2-18', file: 'warranty.js', guard: 'confirmação da correção', find: "ensure(d.confirm,'Confirme que o dinheiro não foi devolvido e que o registro foi lançado por engano.');", replace: '', expect: ['N23'] },
  { id: 'R07M2-19', file: 'warranty.js', guard: 'correção única por devolução', find: "ensure(e&&!refundCorrected(o,e.id),'Devolução inexistente ou já corrigida.');", replace: '', expect: ['N25'] },
  { id: 'R07M2-20', file: 'warranty.js', guard: 'último finalizado por raiz', find: "x.origin===rootId(o)&&x.client===o.client&&physical(x).unit===currentUnit(o,orders).unit", replace: "x.origin&&x.client===o.client&&physical(x).unit===currentUnit(o,orders).unit", expect: ['N35'] },
  { id: 'R07M2-21', file: 'finance.js', guard: 'estorno bloqueado com devolução', find: "ensure(!warrantyCredits(o).amount&&!(rectification&&warrantyCredits(o).credit),'Há devolução ou abatimento registrado nesta OS. Confira o histórico antes de corrigir o recebimento.');", replace: '', expect: ['N27'] },
  { id: 'R07M2-22', file: 'finance.js', guard: 'acerto protegido por crédito de garantia', find: "ensure(!warrantyCredits(o).count,'Há devolução de garantia vinculada a esta OS. Preserve a cobrança de garantia.');", replace: '', expect: ['N28'] },
  { id: 'R07M2-23', file: 'finance.js', guard: 'crédito ignora devolução corrigida', find: "return ev.filter(e=>e.type==='warranty_refund'&&!ev.some(c=>c.type==='warranty_refund_correction'&&c.reference===e.id)).reduce(", replace: "return ev.filter(e=>e.type==='warranty_refund').reduce(", expect: ['N26'] },
  { id: 'R07M2-24', file: 'cancel.js', guard: 'F02 solução executada bloqueia', find: "||o.warranty?.operations?.some(e=>e.type==='troca'||e.type==='reembolso'&&!o.warranty.operations.some(x=>x.type==='corrigir_reembolso'&&x.reference===e.id))", replace: "", expect: ['N31'] },
  { id: 'R07M2-25', file: 'cancel.js', guard: 'F02 derivado por origem/anterior bloqueia', find: "orders.some(x=>x.id!==o.id&&(x.origin===o.id||x.warranty?.previous===o.id))||", replace: "", expect: ['N33', 'N34'] },
  { id: 'R07M2-26', file: 'quote.js', guard: 'edição bloqueada por obrigação encerrada', find: "&&!o.delivery&&!hasObligation(o)}", replace: "&&!o.delivery}", expect: ['N30'] }
];

function runNegatives(assetsDir) {
  const resultPath = path.join(work, 'negativos.json');
  const r = spawnSync(process.execPath, [path.join(__dirname, 'r07-002-negativos.cjs')], {
    env: { ...process.env, ASSETS_DIR: assetsDir, RESULT_PATH: resultPath }, encoding: 'utf8'
  });
  let data = null;
  try { data = JSON.parse(fs.readFileSync(resultPath, 'utf8')); } catch { }
  return { r, data };
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
  const run = runNegatives(work);
  if (!run.data) {
    results.push({ ...m, status: 'INCONCLUSIVO', detail: 'harness não produziu resultado: ' + (run.r.stderr || '').slice(0, 300) });
    continue;
  }
  const failed = run.data.results.filter(r => r.status === 'FAIL').map(r => r.id);
  const expectedHit = m.expect.filter(id => failed.includes(id));
  const status = failed.length === 0 ? (m.equivalentReason ? 'EQUIVALENTE' : 'SOBREVIVENTE') : (expectedHit.length ? 'DETECTADA' : 'DETECTADA_FORA_DO_ALVO');
  results.push({ id: m.id, file: m.file, guard: m.guard, expect: m.expect, failed, extra: failed.filter(id => !m.expect.includes(id)), status, detail: status === 'SOBREVIVENTE' ? 'nenhum teste negativo falhou' : status === 'EQUIVALENTE' ? m.equivalentReason : ('falhas: ' + failed.slice(0, 8).join(', ')) });
  console.log(`${status} ${m.id} — ${m.guard} :: ${failed.length ? failed.slice(0, 6).join(', ') : 'sem falhas'}`);
}
fs.writeFileSync(path.join(pristine, '..', 'fixtures.json'), JSON.stringify({ mutations: mutations.map(m => ({ id: m.id, file: m.file, guard: m.guard, expect: m.expect })) }, null, 2));
const summary = results.reduce((s, r) => { s[r.status] = (s[r.status] || 0) + 1; return s; }, {});
fs.writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), codeSha: process.env.CODE_SHA || '', source: SOURCE, scratch: SCRATCH, total: results.length, summary, results }, null, 2));
fs.rmSync(work, { recursive: true, force: true });
console.log(`TOTAL ${results.length} · DETECTADA ${summary.DETECTADA || 0} · FORA_DO_ALVO ${summary.DETECTADA_FORA_DO_ALVO || 0} · SOBREVIVENTE ${summary.SOBREVIVENTE || 0} · EQUIVALENTE ${summary.EQUIVALENTE || 0} · INCONCLUSIVO ${summary.INCONCLUSIVO || 0}`);
