'use strict';
/*
 * R08-001 — mutation testing das guardas de identidade (F03) e ressalvas N1/N5.
 * Cada mutação altera uma guarda em cópia scratch; nenhum mutante é publicado.
 * O checkout é lido, nunca alterado.
 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SOURCE = process.env.ASSETS_DIR || path.resolve(__dirname, '../../../../assets');
const SCRATCH = process.env.SCRATCH_DIR || path.join(os.tmpdir(), 'r08-mutacoes');
const OUT = process.env.RESULT_PATH || path.join(__dirname, 'r08-mutacoes-resultados.json');
const FILES = ['quote.js', 'stock.js', 'portal.js', 'finance.js', 'finance-ui.js', 'cancel.js', 'warranty.js', 'quote-ui.js', 'cancel-ui.js', 'warranty-ui.js', 'app.js'];
const SITE = path.resolve(__dirname, '../../../..');
const pristine = path.join(SCRATCH, 'pristine');
const work = path.join(SCRATCH, 'work');
const PORT = 8199;

fs.rmSync(SCRATCH, { recursive: true, force: true });
fs.mkdirSync(pristine, { recursive: true });
fs.mkdirSync(path.join(pristine, 'assets'), { recursive: true });
for (const f of FILES) fs.copyFileSync(path.join(SOURCE, f), path.join(pristine, 'assets', f));
for (const f of ['index.html', 'portal.html']) fs.copyFileSync(path.join(SITE, f), path.join(pristine, f));
for (const f of ['style.css', 'portal.css', 'favicon.svg']) fs.copyFileSync(path.join(SITE, 'assets', f), path.join(pristine, 'assets', f));

const mutations = [
  { id: 'R08M-01', file: 'quote.js', guard: 'edição de mesma linha/tipo preserva ID', find: 'lineId:prior&&prior.type===i.type?prior.lineId:next++', replace: 'lineId:next++', expect: ['D02'], suite: 'domain' },
  { id: 'R08M-02', file: 'quote.js', guard: 'troca de tipo aloca novo ID', find: 'lineId:prior&&prior.type===i.type?prior.lineId:next++', replace: 'lineId:prior?prior.lineId:next++', expect: ['D05'], suite: 'domain' },
  { id: 'R08M-03', file: 'quote.js', guard: 'contador não é recalculado do máximo (sem reciclagem)', find: 'let next=q.nextLineId', replace: 'let next=Math.max(0,...q.draft.items.map(i=>i.lineId||0))+1', expect: ['D14','D31'], suite: 'domain' },
  { id: 'R08M-04', file: 'quote.js', guard: 'identify considera o máximo das linhas existentes', find: 'let next=Math.max(1,Number.isSafeInteger(q.nextLineId)?q.nextLineId:1,...q.draft.items.filter(i=>Number.isSafeInteger(i.lineId)&&i.lineId>0).map(i=>i.lineId+1));', replace: 'let next=Math.max(1,Number.isSafeInteger(q.nextLineId)?q.nextLineId:1);', expect: ['D15'], suite: 'domain' },
  { id: 'R08M-05', file: 'quote.js', guard: 'identify repara ID duplicado', find: '||used.has(i.lineId))i.lineId=next++', replace: ')i.lineId=next++', expect: ['D15'], suite: 'domain' },
  { id: 'R08M-06', file: 'quote.js', guard: 'ID forjado/duplicado no payload é rejeitado', find: "assert(i.lineId===undefined||i.lineId===null||prior&&!seen.has(i.lineId),'O item mudou ou não pertence a esta OS. Reabra o orçamento.');", replace: "assert(true,'O item mudou ou não pertence a esta OS. Reabra o orçamento.');", expect: ['D06', 'D07'], suite: 'domain' },
  { id: 'R08M-07', file: 'quote.js', guard: 'nova versão compara identidade', find: 'const ids=v.items.every(i=>Number.isSafeInteger(i.lineId));', replace: 'const ids=false;', expect: ['D10'], suite: 'domain' },
  { id: 'R08M-08', file: 'quote.js', guard: 'snapshot legado compara conteúdo, não identidade', find: 'const ids=v.items.every(i=>Number.isSafeInteger(i.lineId));', replace: 'const ids=true;', expect: ['D11'], suite: 'domain' },
  { id: 'R08M-09', file: 'cancel.js', guard: 'chave incorpora a OS', find: 'const itemKey=(o,i)=>JSON.stringify([o.id,state(o)?.id,', replace: 'const itemKey=(o,i)=>JSON.stringify([state(o)?.id,', expect: ['D20', 'D26'], suite: 'domain' },
  { id: 'R08M-10', file: 'cancel.js', guard: 'chave incorpora o pedido', find: 'const itemKey=(o,i)=>JSON.stringify([o.id,state(o)?.id,', replace: 'const itemKey=(o,i)=>JSON.stringify([o.id,', expect: ['D20', 'D26'], suite: 'domain' },
  { id: 'R08M-11', file: 'cancel.js', guard: 'chave esperada é conferida antes de remover', find: "ensure(expected===itemKey(o,item),'O item ou pedido mudou. Reabra a conferência.');", replace: "ensure(true,'O item ou pedido mudou. Reabra a conferência.');", expect: ['D17', 'D20', 'D21'], suite: 'domain' },
  { id: 'R08M-12', file: 'cancel.js', guard: 'seleção por lineId, nunca por índice externo', find: 'index=q.draft.items.findIndex(i=>i.lineId===lineId)', replace: 'index=q.draft.items.findIndex((i,n)=>n===lineId)', expect: ['D16', 'D17', 'D18'], suite: 'domain' },
  { id: 'R08M-13', file: 'cancel.js', guard: 'retirada parcial preserva o ID', find: 'else item.quantity-=quantity;', replace: 'else {item.quantity-=quantity;item.lineId=undefined;}', expect: ['D17','D19'], suite: 'domain' },
  { id: 'R08M-14', file: 'cancel.js', guard: 'conferência técnica incorpora identidade', find: 'lines(o).map(i=>[i.lineId,i.type,i.name,i.quantity,i.unit])', replace: 'lines(o).map(i=>[i.type,i.name,i.quantity,i.unit])', expect: ['D23', 'D24'], suite: 'domain' },
  { id: 'R08M-15', file: 'warranty.js', guard: 'selo único inclui unidade substituta', find: 'normalizeSeal(x.seal)===seal||normalizeSeal(swapEvent(x)?.replacement.seal)===seal', replace: 'normalizeSeal(x.seal)===seal', expect: ['D28'], suite: 'domain' },
  { id: 'R08M-16', file: 'warranty.js', guard: 'selo normalizado', find: 'const sealInUse=(v,orders)=>{const seal=normalizeSeal(v);', replace: 'const sealInUse=(v,orders)=>{const seal=String(v||\'\');', expect: ['D28'], suite: 'domain' },
  { id: 'R08M-17', file: 'warranty-ui.js', guard: 'N5 produto zerado fora do seletor', find: 'db.stock.filter(p=>p.quantity>0)', replace: 'db.stock', expect: ['U03'], suite: 'ui' },
  { id: 'R08M-18', file: 'warranty-ui.js', guard: 'N1 fallback só em raiz finalizada', find: "if(o.origin||o.status!=='Finalizado'||!BancadaFinance.dayValid(o.conclusion))return null;", replace: "if(o.origin||!BancadaFinance.dayValid(o.conclusion))return null;", expect: ['U04'], suite: 'ui' },
  { id: 'R08M-19', file: 'cancel.js', guard: 'chave da linha inclui o lineId', find: 'const itemKey=(o,i)=>JSON.stringify([o.id,state(o)?.id,i.lineId,i.type', replace: 'const itemKey=(o,i)=>JSON.stringify([o.id,state(o)?.id,i.type', expect: ['D26'], suite: 'domain' },
  { id: 'R08M-20', file: 'cancel.js', guard: 'chave financeira inclui o pedido', find: 'const financialKey=o=>JSON.stringify([o.id,technicalKey(o),state(o)?.id,', replace: 'const financialKey=o=>JSON.stringify([o.id,technicalKey(o),', expect: ['D33'], suite: 'domain' },
  { id: 'R08M-21', file: 'cancel.js', guard: 'conferência técnica não é duplicada', find: "ensure(!technical(o),'Conferência técnica já registrada para este pedido.');", replace: '', expect: ['D23'], suite: 'domain' },
  { id: 'R08M-22', file: 'app.js', guard: 'N6 bloqueia selo duplicado em qualquer modo não-existente', find: "if(d.mode!=='existing'&&BancadaWarranty.sealInUse(eq.seal,db.orders))", replace: "if(d.mode==='new'&&BancadaWarranty.sealInUse(eq.seal,db.orders))", expect: ['R08-N6-03', 'R08-N6-04'], suite: 'n6' },
  { id: 'R08M-23', file: 'cancel.js', guard: 'chave financeira inclui a OS', find: 'const financialKey=o=>JSON.stringify([o.id,technicalKey(o)', replace: 'const financialKey=o=>JSON.stringify([technicalKey(o)', expect: ['D34'], suite: 'domain' },
  { id: 'R08M-24', file: 'cancel.js', guard: 'chave da linha inclui o nome', find: 'i.lineId,i.type,i.name,i.quantity,i.unit]);', replace: 'i.lineId,i.type,i.quantity,i.unit]);', expect: ['D26'], suite: 'domain' },
  { id: 'R08M-25', file: 'cancel.js', guard: 'retrato técnico inclui a quantidade', find: 'lines(o).map(i=>[i.lineId,i.type,i.name,i.quantity,i.unit])', replace: 'lines(o).map(i=>[i.lineId,i.type,i.name,i.unit])', expect: ['D35'], suite: 'domain' }
];

function runSuite(kind, assetsDir) {
  const file = kind === 'ui' ? 'r08-ui.cjs' : 'r08-domain.cjs';
  return spawnSync(process.execPath, [path.join(__dirname, file)], {
    env: { ...process.env, ASSETS_DIR: assetsDir, RESULT_PATH: path.join(work, 'out.json') }, encoding: 'utf8'
  });
}
async function waitUp(url) {
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(url); if (r.ok) return; } catch {}
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('servidor scratch não subiu');
}
function runN6(base) {
  return spawnSync(process.execPath, [path.join(__dirname, 'r08-n6.cjs')], {
    env: { ...process.env, BASE_URL: base, RESULT_PATH: path.join(work, 'n6.json') }, encoding: 'utf8'
  });
}

const results = [];
const { spawn } = require('node:child_process');
(async () => {
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '--directory', work], { stdio: 'ignore' });
const BASE = `http://127.0.0.1:${PORT}`;
for (const m of mutations) {
  fs.rmSync(work, { recursive: true, force: true });
  fs.cpSync(pristine, work, { recursive: true });
  const target = path.join(work, 'assets', m.file);
  const original = fs.readFileSync(target, 'utf8');
  if (!original.includes(m.find)) {
    results.push({ id: m.id, file: m.file, guard: m.guard, expect: m.expect, status: 'INCONCLUSIVO', detail: 'trecho não encontrado' });
    console.log(`INCONCLUSIVO ${m.id} — ${m.guard} :: trecho não encontrado`);
    continue;
  }
  fs.writeFileSync(target, original.split(m.find).join(m.replace));
  let run;
  if (m.suite === 'n6') { await waitUp(BASE); run = runN6(BASE); }
  else run = runSuite(m.suite, path.join(work, 'assets'));
  const out = `${run.stdout || ''}\n${run.stderr || ''}`;
  const hit = (out.match(/FAIL:? ((?:D|U)\d+|R08-N6-\d+)/) || [])[1] || null;
  let status, detail;
  if (run.status === 0) { status = 'SOBREVIVENTE'; detail = 'nenhum teste falhou'; }
  else if (hit && m.expect.includes(hit)) { status = 'DETECTADA'; detail = 'falha em ' + hit; }
  else if (hit) { status = 'DETECTADA_FORA_DO_ALVO'; detail = 'falha em ' + hit; }
  else { status = 'INCONCLUSIVO'; detail = 'execução falhou sem teste identificável: ' + out.slice(-300); }
  results.push({ id: m.id, file: m.file, guard: m.guard, expect: m.expect, status, detail });
  console.log(`${status} ${m.id} — ${m.guard} :: ${detail}`);
}
server.kill();
fs.rmSync(work, { recursive: true, force: true });
const summary = results.reduce((s, r) => { s[r.status] = (s[r.status] || 0) + 1; return s; }, {});
fs.writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), codeSha: process.env.CODE_SHA || '', source: SOURCE, scratch: SCRATCH, total: results.length, summary, results }, null, 2));
console.log(`TOTAL ${results.length} · DETECTADA ${summary.DETECTADA || 0} · FORA_DO_ALVO ${summary.DETECTADA_FORA_DO_ALVO || 0} · SOBREVIVENTE ${summary.SOBREVIVENTE || 0} · INCONCLUSIVO ${summary.INCONCLUSIVO || 0}`);
if (summary.SOBREVIVENTE || summary.INCONCLUSIVO) process.exitCode = 1;
})().catch(e => { console.error('FATAL', e); process.exit(1); });
