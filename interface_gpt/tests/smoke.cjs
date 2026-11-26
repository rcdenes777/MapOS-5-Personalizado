// Run with: node tests/smoke.cjs (no dependencies).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const app = ['quote.js','portal.js','quote-ui.js','finance.js','finance-ui.js','cancel.js','cancel-ui.js','warranty.js','warranty-ui.js','app.js'].map(f=>fs.readFileSync(path.join(__dirname,'../assets',f),'utf8')).join('\n');
const nodes = new Map(), handlers = {};
const document = {querySelector(k) {
  if(k === '#new-form') return null;
  if(!nodes.has(k)) nodes.set(k,{innerHTML:'',textContent:'',focus(){}});
  return nodes.get(k);
},addEventListener(k,fn){handlers[k]=fn}};
const context={document,window:{addEventListener(){},scrollTo(){}},location:{hash:'#inicio'},localStorage:{getItem(){return null},setItem(){}},assert};
vm.createContext(context);
const result=vm.runInContext(app+`
let count=0;
for(const profile of Object.keys(roleCaps)){
  role=profile;
  for(const route of ['inicio','ordens','nova','os/20','os/20/entrega','os/20/orcamento','os/20/historico','os/20/atendimento','os/20/anexos','retorno/20','imprimir/20','imprimir/20/cupom','clientes','estoque','financeiro','relatorios','configuracoes','mais']){
    location.hash='#'+route;render();
    const h=$('#main').innerHTML;
    assert.ok(h.includes('<h1>'),profile+' '+route);
    if(!can('finance'))assert.ok(!h.includes('R$'),profile+' '+route+' monetary leak');
    count++;
  }
}
assert.equal(db.orders.filter(queues[2][2]).length,1);
assert.equal(moneyStatus(db.orders.find(o=>o.id===20)),'Parcial');
assert.equal(moneyStatus(db.orders.find(o=>o.id===19)),'Quitado');
assert.equal(esc('<script>'), '&lt;script&gt;');
count;
`,context);
console.log(result+' profile/route combinations; queue, financial display and escaping checks passed.');
