'use strict';
/*
 * R06-002 — mutation testing temporário (somente em scratch, nunca no checkout).
 * Copia os assets para um diretório de scratch, aplica uma mutação por vez e roda
 * negativos.cjs com ASSETS_DIR apontando para a cópia mutada. O checkout do
 * laboratório nunca é alterado e nenhum mutante é publicado.
 *
 * Uso:
 *   SCRATCH_DIR=/home/dragonblue/.hermes/cache/scratch/r06-002-mutacoes node mutacoes.cjs
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const SOURCE = path.resolve(__dirname, '../../../../assets');
const SCRATCH = process.env.SCRATCH_DIR || '/home/dragonblue/.hermes/cache/scratch/r06-002-mutacoes';
const OUT = process.env.RESULT_PATH || path.join(__dirname, 'mutacoes-resultados.json');
const FILES = ['quote.js', 'portal.js', 'finance.js', 'cancel.js'];

const mutations = [
  {
    id: 'M01', file: 'cancel.js', expected: 'N01', guard: 'valor devolvido exatamente igual ao calculado',
    find: "ensure(d.refund===a.refund,'O valor devolvido deve ser exatamente o valor calculado.');",
    replace: "ensure(true,'O valor devolvido deve ser exatamente o valor calculado.');"
  },
  {
    id: 'M01b', file: 'cancel.js', expected: 'N01', guard: 'comparação de devolução invertida',
    find: "ensure(d.refund===a.refund,'O valor devolvido deve ser exatamente o valor calculado.');",
    replace: "ensure(d.refund!==a.refund,'O valor devolvido deve ser exatamente o valor calculado.');",
    note: 'inversão: a rejeição do valor divergente continua ocorrendo, mas o controle positivo (valor exato) é rejeitado; o teste deve falhar no controle positivo.'
  },
  {
    id: 'M02', file: 'cancel.js', expected: 'N02', guard: 'forma de devolução na lista permitida',
    find: "ensure(BancadaFinance.dayValid(d.date)&&BancadaFinance.methods.includes(d.method),'Informe data e forma da devolução.');",
    replace: "ensure(BancadaFinance.dayValid(d.date),'Informe data e forma da devolução.');"
  },
  {
    id: 'M03', file: 'cancel.js', expected: 'N03', guard: 'data de devolução válida',
    find: "ensure(BancadaFinance.dayValid(d.date)&&BancadaFinance.methods.includes(d.method),'Informe data e forma da devolução.');",
    replace: "ensure((true||BancadaFinance.dayValid(d.date))&&BancadaFinance.methods.includes(d.method),'Informe data e forma da devolução.');"
  },
  {
    id: 'M04', file: 'cancel.js', expected: 'N04', guard: 'comprovante/referência obrigatório',
    find: "const ref=text(d.ref,300);",
    replace: "const ref=String(d.ref??'').trim();"
  },
  {
    id: 'M05', file: 'cancel.js', expected: 'N05', guard: 'conferência financeira explícita',
    find: "ensure(d.confirm&&d.financialConfirmed,'Confirme a conferência financeira e o cancelamento.');",
    replace: "ensure(d.confirm,'Confirme a conferência financeira e o cancelamento.');"
  },
  {
    id: 'M05b', file: 'cancel.js', expected: 'N05', guard: 'conferência financeira invertida',
    find: "ensure(d.confirm&&d.financialConfirmed,'Confirme a conferência financeira e o cancelamento.');",
    replace: "ensure(d.confirm&&!d.financialConfirmed,'Confirme a conferência financeira e o cancelamento.');",
    note: 'inversão: com financialConfirmed=false a guarda passa; o teste negativo deve falhar.'
  },
  {
    id: 'M06', file: 'cancel.js', expected: 'N06', guard: 'conferência do acerto',
    find: "ensure(!requires||d.settlementConfirmed,'Confirme os valores do acerto.');",
    replace: "ensure(true,'Confirme os valores do acerto.');"
  },
  {
    id: 'M07', file: 'cancel.js', expected: 'N07', guard: 'justificativa obrigatória no acerto',
    find: "const reason=text(d.reason,2000,requires);",
    replace: "const reason=text(d.reason,2000,false);"
  },
  {
    id: 'M08', file: 'cancel.js', expected: 'N08', guard: 'remoção integral do serviço não executado',
    find: "ensure(item.type==='Peça'?['unused','lost'].includes(disposition):disposition==='notdone'&&quantity===item.quantity,'Destino inválido para este item.');",
    replace: "ensure(item.type==='Peça'?['unused','lost'].includes(disposition):disposition==='notdone','Destino inválido para este item.');"
  },
  {
    id: 'M09', file: 'cancel.js', expected: 'N09', guard: 'destino de peça restrito a unused/lost',
    find: "ensure(item.type==='Peça'?['unused','lost'].includes(disposition):disposition==='notdone'&&quantity===item.quantity,'Destino inválido para este item.');",
    replace: "ensure(item.type==='Peça'?['unused','lost','notdone'].includes(disposition):disposition==='notdone'&&quantity===item.quantity,'Destino inválido para este item.');"
  },
  {
    id: 'M10', file: 'cancel.js', expected: 'N10', guard: 'destino de serviço restrito a notdone',
    find: "ensure(item.type==='Peça'?['unused','lost'].includes(disposition):disposition==='notdone'&&quantity===item.quantity,'Destino inválido para este item.');",
    replace: "ensure(item.type==='Peça'?['unused','lost'].includes(disposition):['notdone','unused'].includes(disposition)&&quantity===item.quantity,'Destino inválido para este item.');"
  },
  {
    id: 'M11', file: 'finance.js', expected: 'N11', guard: 'retificação bloqueada após devolução',
    find: "ensure(o.total>0&&!events(o).some(e=>e.type==='refund'),'Há devolução registrada ou não há obrigação; confira o histórico.');",
    replace: "ensure(o.total>0,'Há devolução registrada ou não há obrigação; confira o histórico.');"
  },
  {
    id: 'M12a', file: 'finance.js', expected: 'N12', guard: 'limite inferior da janela de retificação',
    find: "ensure(date>=c.day&&date<=today,'Data fora do período de retificação.');",
    replace: "ensure(date<=today,'Data fora do período de retificação.');"
  },
  {
    id: 'M12b', file: 'finance.js', expected: 'N12', guard: 'limite superior da janela de retificação',
    find: "ensure(date>=c.day&&date<=today,'Data fora do período de retificação.');",
    replace: "ensure(date>=c.day,'Data fora do período de retificação.');"
  },
  {
    id: 'M13', file: 'finance.js', expected: 'N13', guard: 'tipo de retificação permitido',
    find: "['lancamento_incorreto','nao_compensado'].includes(rectification)",
    replace: "true"
  },
  {
    id: 'M14', file: 'cancel.js', expected: 'N14', guard: 'teto do valor devido',
    find: "ensure(Number.isSafeInteger(gross)&&gross>=0&&gross<=999999999&&Number.isSafeInteger(discount)&&discount>=0&&discount<=gross,'Valor devido ou desconto inválido.');",
    replace: "ensure(Number.isSafeInteger(gross)&&gross>=0&&Number.isSafeInteger(discount)&&discount>=0&&discount<=gross,'Valor devido ou desconto inválido.');"
  },
  {
    id: 'M15', file: 'cancel.js', expected: 'N15', guard: 'devolução não anterior aos eventos financeiros',
    find: "ensure(!BancadaFinance.events(o).some(e=>e.date>d.date),'Data anterior aos registros financeiros.');",
    replace: "ensure(true,'Data anterior aos registros financeiros.');"
  }
];

const results = [];
const pristine = path.join(SCRATCH, 'pristine');
const runs = path.join(SCRATCH, 'runs');

function copyAssets(dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const f of FILES) fs.copyFileSync(path.join(pristine, f), path.join(dest, f));
}

function hashes(dir) {
  const out = {};
  for (const f of FILES) out[f] = crypto.createHash('sha256').update(fs.readFileSync(path.join(dir, f))).digest('hex');
  return out;
}

function runNegativos(dir, resultPath) {
  return spawnSync(process.execPath, [path.join(__dirname, 'negativos.cjs')], {
    env: { ...process.env, ASSETS_DIR: dir, RESULT_PATH: resultPath },
    encoding: 'utf8', timeout: 120000
  });
}

fs.mkdirSync(pristine, { recursive: true });
for (const f of FILES) fs.copyFileSync(path.join(SOURCE, f), path.join(pristine, f));

// Sanity: pristine tree must pass all negative tests before any mutation.
const sanityPath = path.join(SCRATCH, 'sanity.json');
const sanity = runNegativos(pristine, sanityPath);
const sanityPayload = JSON.parse(fs.readFileSync(sanityPath, 'utf8'));
if (sanity.status !== 0 || sanityPayload.fail !== 0) {
  console.error('ERRO: árvore pristina falhou nos testes negativos.');
  process.exit(2);
}

for (const m of mutations) {
  const dir = path.join(runs, m.id);
  fs.rmSync(dir, { recursive: true, force: true });
  copyAssets(dir);
  const file = path.join(dir, m.file);
  const original = fs.readFileSync(file, 'utf8');
  const occurrences = original.split(m.find).length - 1;
  if (occurrences !== 1) {
    results.push({ id: m.id, guard: m.guard, expected: m.expected, classification: 'inconclusivo', detail: `trecho encontrado ${occurrences} vezes` });
    console.log(`INCONCLUSIVO ${m.id} — trecho encontrado ${occurrences} vezes`);
    continue;
  }
  fs.writeFileSync(file, original.replace(m.find, m.replace));
  const resultPath = path.join(SCRATCH, `resultado-${m.id}.json`);
  const run = runNegativos(dir, resultPath);
  let payload = null;
  try { payload = JSON.parse(fs.readFileSync(resultPath, 'utf8')); } catch { /* inconclusivo */ }
  if (!payload) {
    results.push({ id: m.id, guard: m.guard, expected: m.expected, classification: 'inconclusivo', detail: (run.stderr || run.stdout || '').slice(0, 600) });
    console.log(`INCONCLUSIVO ${m.id} — sem JSON de resultado`);
    continue;
  }
  const target = payload.results.find(r => r.id === m.expected);
  const failed = payload.results.filter(r => r.status === 'FAIL');
  let classification, detail;
  if (!target) {
    classification = 'inconclusivo'; detail = `teste ${m.expected} ausente`;
  } else if (target.status === 'FAIL') {
    classification = 'detectado';
    detail = `${m.expected} falhou: ${target.detail}` + (failed.length > 1 ? ` | também: ${failed.map(r => r.id).join(',')}` : '');
  } else {
    classification = 'sobrevivente';
    detail = `${m.expected} continuou PASS; falhas: ${failed.map(r => r.id).join(',') || 'nenhuma'}`;
  }
  results.push({
    id: m.id, file: `interface_gpt/assets/${m.file}`, guard: m.guard, expected: m.expected,
    mutation: { find: m.find, replace: m.replace },
    classification, detail, note: m.note || ''
  });
  console.log(`${classification.toUpperCase()} ${m.id} — ${m.guard} :: ${detail}`);
}

const tally = {
  total: results.length,
  detectado: results.filter(r => r.classification === 'detectado').length,
  sobrevivente: results.filter(r => r.classification === 'sobrevivente').length,
  equivalente: results.filter(r => r.classification === 'equivalente').length,
  inconclusivo: results.filter(r => r.classification === 'inconclusivo').length
};

fs.writeFileSync(OUT, JSON.stringify({
  generatedAt: new Date().toISOString(),
  codeSha: process.env.CODE_SHA || '',
  sourceAssets: SOURCE,
  pristineHashes: hashes(pristine),
  scratch: SCRATCH,
  publishedMutants: false,
  note: 'Mutantes aplicados somente em cópias sob o diretório de scratch; nenhum arquivo do checkout foi alterado.',
  tally, results
}, null, 2));
console.log(`\nMUTAÇÕES ${tally.total} · detectado ${tally.detectado} · sobrevivente ${tally.sobrevivente} · equivalente ${tally.equivalente} · inconclusivo ${tally.inconclusivo}`);
if (tally.sobrevivente || tally.inconclusivo) process.exitCode = 1;
