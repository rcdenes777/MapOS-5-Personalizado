// Run: node tests/line-identity-ui.cjs (DOM stub)
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=['quote.js','portal.js','quote-ui.js','finance.js','finance-ui.js','cancel.js','cancel-ui.js','warranty.js','warranty-ui.js','app.js'].map(f=>fs.readFileSync(path.join(__dirname,'../assets',f),'utf8')).join('\n');
const nodes=new Map(),document={querySelector(k){if(k==='#new-form')return null;if(!nodes.has(k))nodes.set(k,{innerHTML:'',textContent:'',focus(){}});return nodes.get(k)},addEventListener(){}};
const context={document,window:{addEventListener(){},scrollTo(){}},location:{hash:'#inicio'},localStorage:{getItem(){return null},setItem(){}}};
const checks=`
let count=0;const ok=(v,m)=>{if(!v)throw Error(m||'Assertion failed')},eq=(a,b)=>ok(a===b,a+' != '+b),test=(n,fn)=>{try{fn();count++}catch(e){throw Error(n+': '+e.message)}};
const o=db.orders.find(x=>x.id===23),Q=BancadaQuote,C=BancadaCancel;
role='Administrador';Q.saveDraft(o,{items:[{type:'Peça',name:'IGBT',quantity:2,unit:1000},{type:'Peça',name:'IGBT',quantity:2,unit:1000}],discount:0,terms:{}});const [a,b]=C.lines(o);
test('quote editor carries identity and new rows blank',()=>{ok(quoteEditorRow(a).includes('name="itemId" value="'+a.lineId+'"'));ok(quoteEditorRow().includes('name="itemId" value=""'))});
test('cancel modal identifies exact selected item',()=>{cancelSubmit('cancelrequest',o,{origin:'cliente',reason:'Pedido'});ok(cancelPanel(o).includes('modal:cancelitem:'+o.id+':'+b.lineId));const h=cancelModal('cancelitem',o,b.lineId)[1];ok(h.includes('name="lineId" value="'+b.lineId+'"'));ok(h.includes('name="itemKey"'));eq(cancelModal('cancelitem',o,999),null)});
test('authorized stable item handler and stale rejection',()=>{const d={lineId:String(a.lineId),itemKey:C.itemKey(o,a),quantity:'2',disposition:'unused',reason:'',confirm:true};cancelSubmit('cancelitem',o,d);eq(C.lines(o)[0].lineId,b.lineId);const before=JSON.stringify(o);let err;try{cancelSubmit('cancelitem',o,d)}catch(e){err=e}eq(err?.message,'Item não encontrado.');eq(JSON.stringify(o),before)});
test('unauthorized cancellation handler leaves item intact',()=>{role='Atendente';const before=JSON.stringify(o);let err;try{cancelSubmit('cancelitem',o,{lineId:String(b.lineId),itemKey:C.itemKey(o,b),quantity:'1',disposition:'unused',confirm:true})}catch(e){err=e}ok(err);eq(JSON.stringify(o),before);role='Administrador'});
test('zero stock not offered, source guard remains',()=>{const r=db.orders.find(x=>x.id===18);warrantySubmit('warrantyAssess',r,{coverage:'coberto',solution:'troca',diagnosis:'Teste',reason:'Acordo',previous:0,confirm:true});db.stock[0].quantity=0;const h=warrantyModal('warrantySwap',r)[1];ok(!h.includes('value="'+db.stock[0].sku+'"'));ok(h.includes('value="'+db.stock[1].sku+'"'))});
test('fallback period only for finalized root',()=>{const root=db.orders.find(x=>x.id===16);ok(warrantyOriginRef(root));eq(warrantyOriginRef({...root,status:'Aberto'}),null);eq(warrantyOriginRef({...root,status:'Cancelado'}),null)});
count;
`;
console.log(vm.runInNewContext(src+'\n'+checks,context)+' stable line identity UI checks passed.');
