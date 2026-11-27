'use strict';
// Differential success-path test: base 647dec72 vs v2 uncommitted experiment.
// Synthetic valid operations only; compares complete final {o,stock} JSON.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const V2 = '/home/dragonblue/workspace/interface-gpt-lab/repo/interface_gpt/assets';
const BASE = process.env.BASE_ASSETS;

function makeCtx(dir) {
  const src = ['quote.js','stock.js','finance.js','cancel.js']
    .map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
  const ctx = vm.createContext({ console });
  vm.runInContext(src, ctx);
  return ctx;
}
const v2 = makeCtx(V2), base = makeCtx(BASE);

const scenarioSrc = `(function(spec){
  const Q=BancadaQuote,S=BancadaStock,C=BancadaCancel,now='2026-11-26T12:00:00Z';
  const o={id:1,status:'Aberto',entry:'2026-11-25',total:0,paid:0,history:[]};
  const stock=spec.linked?[{sku:'P-001',name:'IGBT',quantity:8,min:0,cost:450,movements:[]}]:[];
  try{
    if(spec.linked){
      for(const l of spec.links){S.link(stock,o,{expected:S.orderKey(o,stock),sku:'P-001',quantity:l.qty,unit:l.unit},now,'Admin')}
    }else{
      Q.saveDraft(o,{items:spec.items,discount:spec.discount,terms:{}});
    }
    if(spec.total) o.total=spec.total;
    C.request(o,'cliente','Pedido',now);
    const items=C.lines(o);
    const item=items[spec.target];
    if(!item)return {bad:'no target'};
    const key=C.itemKey(o,item);
    const e=C.remove(o,item.lineId,spec.qty,spec.disposition,spec.reason,now,[],key,stock,'Admin');
    return {ok:true,state:JSON.stringify({o,stock}),returned:e.stockReturned,movement:e.stockMovement};
  }catch(err){return {ok:false,error:err.message,state:JSON.stringify({o,stock})}}
})`;
const fnV2 = vm.runInContext(scenarioSrc, v2), fnBase = vm.runInContext(scenarioSrc, base);

let seed = 20261126;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const pick = a => a[Math.floor(rnd() * a.length)];
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));

const diffs = [], failures = [];
let okBoth = 0, rejBoth = 0;
for (let t = 0; t < 600; t++) {
  const linked = rnd() < 0.5;
  let spec;
  if (linked) {
    const links = [];
    let left = 8;
    const n = ri(1, 2);
    for (let i = 0; i < n; i++) {
      const q = ri(1, Math.min(3, left));
      links.push({ qty: q, unit: pick([0, 500, 1000, 2500]) });
      left -= q;
    }
    const total = rnd() < 0.5 ? pick([1, 1000, 5000]) : 0;
    spec = { linked: true, links, total, target: 0, qty: 0, disposition: 'unused', reason: '' };
    // provisional target/qty chosen after link; use deterministic post-setup via two-phase:
    spec.after = 'linked';
  } else {
    const n = ri(1, 3), items = [];
    for (let i = 0; i < n; i++) {
      const type = rnd() < 0.6 ? 'Peça' : 'Serviço';
      items.push({ type, name: 'Item ' + i, quantity: ri(1, 5), unit: pick([0, 100, 999, 1000, 2500]) });
    }
    const gross = items.reduce((s, i) => s + i.quantity * i.unit, 0);
    spec = {
      linked: false, items, discount: ri(0, Math.min(gross, 500)),
      total: rnd() < 0.5 ? pick([1, gross, gross + 1000]) : 0,
      target: ri(0, n - 1), qty: 0, disposition: '', reason: ''
    };
  }
  // fill target/qty/disposition via a dry metadata call on the base context
  const meta = vm.runInContext(`(function(spec){
    const Q=BancadaQuote,S=BancadaStock,C=BancadaCancel,now='2026-11-26T12:00:00Z';
    const o={id:1,status:'Aberto',entry:'2026-11-25',total:0,paid:0,history:[]};
    const stock=spec.linked?[{sku:'P-001',name:'IGBT',quantity:8,min:0,cost:450,movements:[]}]:[];
    if(spec.linked){for(const l of spec.links){S.link(stock,o,{expected:S.orderKey(o,stock),sku:'P-001',quantity:l.qty,unit:l.unit},now,'Admin')}}
    else{Q.saveDraft(o,{items:spec.items,discount:spec.discount,terms:{}})}
    if(spec.total)o.total=spec.total;
    C.request(o,'cliente','Pedido',now);
    const items=C.lines(o);const target=Math.min(spec.target,items.length-1);const it=items[target];
    return {target,type:it.type,quantity:it.quantity};
  })`, base)(spec);
  spec.target = meta.target;
  if (meta.type === 'Peça') {
    spec.disposition = pick(['unused', 'lost']);
    spec.qty = ri(1, meta.quantity);
    spec.reason = spec.disposition === 'lost' ? 'Perda sintética' : '';
  } else {
    spec.disposition = 'notdone';
    spec.qty = meta.quantity;
    spec.reason = '';
  }
  const b = fnBase(spec), v = fnV2(spec);
  if (b.ok && v.ok) {
    okBoth++;
    if (b.state !== v.state || b.returned !== v.returned || b.movement !== v.movement) {
      diffs.push({ spec, base: b, v2: v });
    }
  } else if (!b.ok && !v.ok) {
    rejBoth++;
    if (b.error !== v.error) failures.push({ kind: 'message', spec, base: b.error, v2: v.error });
  } else {
    failures.push({ kind: b.ok ? 'base-ok-v2-reject' : 'base-reject-v2-ok', spec, base: b, v2: v });
  }
}
console.log(JSON.stringify({ total: 600, okBoth, rejBoth, diffs: diffs.length, failures: failures.length, sampleDiffs: diffs.slice(0, 1), sampleFailures: failures.slice(0, 2) }, null, 2));
process.exitCode = diffs.length || failures.length ? 1 : 0;
