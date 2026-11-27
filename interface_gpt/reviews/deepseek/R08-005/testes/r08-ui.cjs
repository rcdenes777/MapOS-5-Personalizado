'use strict';
/* R08-001 — UI em stub DOM: identidade no editor/conferência, N1 e N5. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ASSETS = process.env.ASSETS_DIR || path.resolve(__dirname, '../../../../assets');
const OUT = process.env.RESULT_PATH || path.join(__dirname, 'r08-ui-resultados.json');
const FILES = ['quote.js', 'portal.js', 'quote-ui.js', 'finance.js', 'finance-ui.js', 'cancel.js', 'cancel-ui.js', 'warranty.js', 'warranty-ui.js', 'app.js'];
const src = FILES.map(f => fs.readFileSync(path.join(ASSETS, f), 'utf8')).join('\n');
const nodes = new Map();
const document = { querySelector(k) { if (k === '#new-form') return null; if (!nodes.has(k)) nodes.set(k, { innerHTML: '', textContent: '', focus() {} }); return nodes.get(k); }, addEventListener() {} };
const context = { document, window: { addEventListener() {}, scrollTo() {} }, location: { hash: '#inicio' }, localStorage: { getItem() { return null }, setItem() {} } };
vm.createContext(context);
vm.runInContext(src, context);

const tests = [
  ['U01', 'editor carrega identidade e linha nova em branco', () => vm.runInContext(`(()=>{
    role='Administrador';
    BancadaQuote.saveDraft(db.orders.find(x=>x.id===23),{items:[{type:'Peça',name:'IGBT',quantity:2,unit:1000},{type:'Peça',name:'IGBT',quantity:2,unit:1000}],discount:0,terms:{}});
    const a=BancadaCancel.lines(db.orders.find(x=>x.id===23))[0];
    return quoteEditorRow(a).includes('name="itemId" value="'+a.lineId+'"')&&quoteEditorRow().includes('name="itemId" value=""');
  })()`, context)],
  ['U02', 'conferência identifica a linha exata e recusa índice como ID', () => vm.runInContext(`(()=>{
    const o=db.orders.find(x=>x.id===23);
    BancadaCancel.request(o,'cliente','Pedido R08','2026-11-26T12:00:00Z');
    const b=BancadaCancel.lines(o)[1];
    if(!cancelPanel(o).includes('modal:cancelitem:'+o.id+':'+b.lineId))return false;
    const h=cancelModal('cancelitem',o,b.lineId)[1];
    return h.includes('name="lineId" value="'+b.lineId+'"')&&h.includes('name="itemKey"')&&cancelModal('cancelitem',o,0)===null&&cancelModal('cancelitem',o,999)===null;
  })()`, context)],
  ['U03', 'N5 seletor de troca exclui produto zerado e mantém o disponível', () => vm.runInContext(`(()=>{
    const r=db.orders.find(x=>x.id===18);
    warrantySubmit('warrantyAssess',r,{coverage:'coberto',solution:'troca',diagnosis:'Teste',reason:'Acordo',previous:0,confirm:true});
    db.stock[0].quantity=0;
    const h=warrantyModal('warrantySwap',r)[1];
    return !h.includes('value="'+db.stock[0].sku+'"')&&h.includes('value="'+db.stock[1].sku+'"');
  })()`, context)],
  ['U04', 'N1 fallback apenas em raiz finalizada', () => vm.runInContext(`(()=>{
    const root=db.orders.find(x=>x.id===16);
    return !!warrantyOriginRef(root)&&warrantyOriginRef({...root,status:'Aberto'})===null&&warrantyOriginRef({...root,status:'Cancelado'})===null&&warrantyOriginRef({...root,status:'Finalizado',conclusion:'2026-02-30'})===null;
  })()`, context)],
];
const results = [];
let pass = 0;
for (const [id, name, fn] of tests) {
  try { if (!fn()) throw new Error('asserção falhou'); pass++; results.push({ id, name, status: 'PASS', detail: '' }); console.log(`PASS ${id} — ${name}`); }
  catch (e) { results.push({ id, name, status: 'FAIL', detail: e.message }); console.log(`FAIL: ${id} — ${name} :: ${e.message}`); }
}
fs.writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), codeSha: process.env.CODE_SHA || '', source: ASSETS, total: results.length, summary: { PASS: pass, FAIL: results.length - pass }, results }, null, 2));
console.log(`\nTOTAL ${results.length} · PASS ${pass} · FAIL ${results.length - pass}`);
if (results.length - pass) process.exitCode = 1;
