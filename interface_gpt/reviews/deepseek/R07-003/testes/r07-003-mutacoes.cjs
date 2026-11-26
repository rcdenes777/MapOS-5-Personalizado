'use strict';
/*
 * R07-003 — mutation testing das guardas da troca/linhagem/estoque.
 * Cada mutação altera uma guarda em cópia scratch e executa a suíte de domínio R07-003.
 * Nenhum mutante é publicado; o checkout não é alterado.
 * Uso: SCRATCH_DIR=/scratch/r07-003-mutacoes node r07-003-mutacoes.cjs
 */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SOURCE = process.env.ASSETS_DIR || path.resolve(__dirname, '../../../../assets');
const SCRATCH = process.env.SCRATCH_DIR || path.join(require('node:os').tmpdir(), 'r07-003-mutacoes');
const OUT = process.env.RESULT_PATH || path.join(__dirname, 'r07-003-mutacoes-resultados.json');
const FILES = ['quote.js', 'portal.js', 'finance.js', 'cancel.js', 'warranty.js'];
const pristine = path.join(SCRATCH, 'pristine');
const work = path.join(SCRATCH, 'work');

fs.rmSync(SCRATCH, { recursive: true, force: true });
fs.mkdirSync(pristine, { recursive: true });
fs.mkdirSync(work, { recursive: true });
for (const f of FILES) fs.copyFileSync(path.join(SOURCE, f), path.join(pristine, f));

const mutations = [
  { id: 'R07M3-01', file: 'warranty.js', guard: 'solução vigente exige troca', find: "ensure(a?.solution==='troca'&&a.coverage!=='avaliacao'", replace: "ensure(true", expect: ['D07', 'D31'] },
  { id: 'R07M3-02', file: 'warranty.js', guard: 'cobertura concluída na execução', find: "&&a.coverage!=='avaliacao'", replace: '', expect: ['D31'] },
  { id: 'R07M3-03', file: 'warranty.js', guard: 'retorno aberto para executar', find: "ensure(!['Cancelado','Finalizado'].includes(o.status),'Execute a solução antes de concluir ou entregar o retorno.');", replace: '', expect: ['D07'] },
  { id: 'R07M3-04', file: 'warranty.js', guard: 'retorno sem cobrança própria', find: "ensure(!BancadaFinance.hasObligation(o),'Concilie a cobrança própria deste retorno antes de executar outra solução.');", replace: '', expect: ['D08'] },
  { id: 'R07M3-05', file: 'warranty.js', guard: 'retorno sem entrega', find: "ensure(!o.delivery,'Corrija a entrega antes de executar outra solução.');", replace: '', expect: ['D08'] },
  { id: 'R07M3-06', file: 'warranty.js', guard: 'publicação de orçamento retirada', find: "ensure(!BancadaQuote.active(o),'Retire a publicação do orçamento antes de executar troca ou devolução.');", replace: '', expect: ['D08'] },
  { id: 'R07M3-07', file: 'warranty.js', guard: 'unidade não substituída nem solução executada', find: "ensure(!replaced(unit(o),orders)&&!executed(o),'Esta unidade ou retorno já tem solução executada.');", replace: '', expect: ['D10', 'D17', 'D18'] },
  { id: 'R07M3-08', file: 'warranty.js', guard: 'outro atendimento aberto da unidade', find: "ensure(!orders.some(x=>x.id!==o.id&&unit(x)===unit(o)&&!['Finalizado','Cancelado'].includes(x.status)),'Conclua ou confira outros atendimentos abertos desta unidade antes de trocar.');", replace: '', expect: ['D09'] },
  { id: 'R07M3-09', file: 'warranty.js', guard: 'avaliação esperada (stale)', find: "ensure(Number(d.assessment)===a.id,'A avaliação mudou ou não permite esta solução. Reabra e confira.');", replace: '', expect: ['D07'] },
  { id: 'R07M3-10', file: 'warranty.js', guard: 'confirmação da troca', find: "ensure(d.confirm,'Confirme a substituição física e o destino da unidade antiga.');", replace: '', expect: ['D07', 'D19'] },
  { id: 'R07M3-11', file: 'warranty.js', guard: 'origem/destino permitidos', find: "ensure(['estoque','externa'].includes(d.source)&&['retida_assistencia','devolvida_cliente'].includes(d.destination),'Informe origem da substituta e destino da antiga.');", replace: '', expect: ['D05'] },
  { id: 'R07M3-12', file: 'warranty.js', guard: 'identificação da nova unidade', find: "ensure(replacement.seal||replacement.serial||replacement.imei,'Identifique a nova unidade por selo, série ou IMEI.');", replace: '', expect: ['D05'] },
  { id: 'R07M3-13', file: 'warranty.js', guard: 'selo normalizado não duplicado', find: "ensure(!seal||!orders.some(x=>normalizeSeal(x.seal)===seal||normalizeSeal(swapEvent(x)?.replacement.seal)===seal),'Selo já cadastrado. Identifique outra unidade física.');", replace: '', expect: ['D06'] },
  { id: 'R07M3-14', file: 'warranty.js', guard: 'textos obrigatórios e limites', find: "(!required||v.trim())", replace: "true", expect: ['D05'] },
  { id: 'R07M3-15', file: 'warranty.js', guard: 'custo externo válido', find: "ensure(Number.isSafeInteger(d.cost)&&d.cost>=0&&d.cost<=999999999,'Informe um custo externo válido.');", replace: '', expect: ['D04', 'D24'] },
  { id: 'R07M3-16', file: 'warranty.js', guard: 'estoque existente e disponível', find: "ensure(product&&Number.isSafeInteger(product.quantity)&&product.quantity>0,'Produto inexistente ou sem estoque disponível.');", replace: '', expect: ['D03'] },
  { id: 'R07M3-17', file: 'warranty.js', guard: 'baixa de exatamente 1 unidade', find: "if(product){product.quantity--;", replace: "if(product){", expect: ['D02'] },
  { id: 'R07M3-18', file: 'warranty.js', guard: 'linhagem física na referência', find: "&&o.client===root.client&&lineage(root,p.unit,orders)", replace: "&&o.client===root.client", expect: ['D32'] },
  { id: 'R07M3-19', file: 'warranty.js', guard: 'unidade substituída não referencia retorno', find: "ensure(!replaced(p.unit,orders),'Unidade substituída. Utilize o atendimento da substituta.');", replace: '', expect: ['D10'] },
  { id: 'R07M3-20', file: 'warranty.js', guard: 'lastFinalized restrito à raiz e unidade física', find: "x.origin===rootId(o)&&x.client===o.client&&physical(x).unit===currentUnit(o,orders).unit", replace: "x.origin&&x.client===o.client", expect: ['D13'] },
  { id: 'R07M3-21', file: 'warranty.js', guard: 'currentUnit percorre a cadeia de trocas', find: "const currentUnit=(o,orders)=>{let p=physical(o);const seen=new Set();while(!seen.has(p.unit)){seen.add(p.unit);const t=orders.find(x=>x.origin===(o.origin||o.id)&&swapEvent(x)?.oldUnit===p.unit);if(!t)break;p=physical(t)}return p};", replace: "const currentUnit=(o,orders)=>physical(o);", expect: ['D11', 'D25'] },
  { id: 'R07M3-22', file: 'warranty.js', guard: 'linhagem restrita à origem', find: "const owner=orders.find(o=>o.origin===root.id&&swapEvent(o)?.oldUnit===current);", replace: "const owner=orders.find(o=>swapEvent(o)?.oldUnit===current);", expect: ['D13'] },
  { id: 'R07M3-23', file: 'warranty.js', guard: 'operações legadas inicializadas só no sucesso', find: "o.warranty.operations??=[];o.warranty.events.push(e);return e", replace: "o.warranty.events.push(e);return e", expect: ['D19'] },
  { id: 'R07M3-24', file: 'warranty.js', guard: 'identidade física preservada na referência', find: "const p=physical(o);\n   ensure(p.brand&&p.model", replace: "const p={unit:unit(o),brand:o.brand,model:o.model};\n   ensure(p.brand&&p.model", expect: ['D11'] },
  { id: 'R07M3-25', file: 'warranty.js', guard: 'portal não projeta a unidade antiga depois da troca', find: "const replacement=o.warranty?.operations?.find(e=>e.type==='troca')?.replacement;", replace: "const replacement=null;", expect: ['D21'], fileOverride: 'portal.js' },
  { id: 'R07M3-26', file: 'warranty.js', guard: 'lastFinalized não cruza raízes da mesma unidade', find: "x.origin===rootId(o)&&x.client===o.client&&physical(x).unit===currentUnit(o,orders).unit", replace: "x.origin&&x.client===o.client&&physical(x).unit===currentUnit(o,orders).unit", expect: ['D33'] }
];

function runDomain(assetsDir) {
  return spawnSync(process.execPath, [path.join(__dirname, 'r07-003-domain.cjs')], {
    env: { ...process.env, ASSETS_DIR: assetsDir, RESULT_PATH: path.join(work, 'domain.json') }, encoding: 'utf8'
  });
}

const results = [];
for (const m of mutations) {
  fs.rmSync(work, { recursive: true, force: true });
  fs.mkdirSync(work, { recursive: true });
  for (const f of FILES) fs.copyFileSync(path.join(pristine, f), path.join(work, f));
  const file = m.fileOverride || m.file;
  const target = path.join(work, file);
  const original = fs.readFileSync(target, 'utf8');
  if (!original.includes(m.find)) {
    results.push({ id: m.id, file, guard: m.guard, expect: m.expect, status: 'INCONCLUSIVO', detail: 'trecho não encontrado no arquivo' });
    console.log(`INCONCLUSIVO ${m.id} — ${m.guard} :: trecho não encontrado`);
    continue;
  }
  fs.writeFileSync(target, original.split(m.find).join(m.replace));
  const run = runDomain(work);
  const out = `${run.stdout || ''}\n${run.stderr || ''}`;
  const hit = (out.match(/FAIL: (D\d+)/) || [])[1] || null;
  let status, detail;
  if (run.status === 0) {
    status = 'SOBREVIVENTE';
    detail = 'nenhum teste de domínio falhou';
  } else if (hit && m.expect.includes(hit)) {
    status = 'DETECTADA';
    detail = 'falha em ' + hit;
  } else if (hit) {
    status = 'DETECTADA_FORA_DO_ALVO';
    detail = 'falha em ' + hit;
  } else {
    status = 'INCONCLUSIVO';
    detail = 'execução falhou sem teste identificável: ' + out.slice(-300);
  }
  results.push({ id: m.id, file, guard: m.guard, expect: m.expect, status, detail });
  console.log(`${status} ${m.id} — ${m.guard} :: ${detail}`);
}
fs.writeFileSync(path.join(pristine, '..', 'fixtures.json'), JSON.stringify({ mutations: mutations.map(m => ({ id: m.id, file: m.fileOverride || m.file, guard: m.guard, expect: m.expect })) }, null, 2));
const summary = results.reduce((s, r) => { s[r.status] = (s[r.status] || 0) + 1; return s; }, {});
fs.writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), source: SOURCE, scratch: SCRATCH, total: results.length, summary, results }, null, 2));
fs.rmSync(work, { recursive: true, force: true });
console.log(`TOTAL ${results.length} · DETECTADA ${summary.DETECTADA || 0} · FORA_DO_ALVO ${summary.DETECTADA_FORA_DO_ALVO || 0} · SOBREVIVENTE ${summary.SOBREVIVENTE || 0} · INCONCLUSIVO ${summary.INCONCLUSIVO || 0}`);
