// Run: node tests/warranty-swap-ui.cjs (DOM stub)
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=['quote.js','portal.js','quote-ui.js','finance.js','finance-ui.js','cancel.js','cancel-ui.js','warranty.js','warranty-ui.js','app.js'].map(f=>fs.readFileSync(path.join(__dirname,'../assets',f),'utf8')).join('\n');
const nodes=new Map(),document={querySelector(k){if(k==='#new-form')return null;if(!nodes.has(k))nodes.set(k,{innerHTML:'',textContent:'',focus(){}});return nodes.get(k)},addEventListener(){}};
const context={document,window:{addEventListener(){},scrollTo(){}},location:{hash:'#inicio'},localStorage:{getItem(){return null},setItem(){}}};
const checks=`
let count=0;const ok=(v,m)=>{if(!v)throw Error(m||'Assertion failed')},eq=(a,b)=>ok(a===b,a+' != '+b),test=(n,fn)=>{try{fn();count++}catch(e){throw Error(n+': '+e.message)}};
const r=db.orders.find(x=>x.id===18),o=db.orders.find(x=>x.id===16);
role='Administrador';
test('swap action available after assessment',()=>{warrantySubmit('warrantyAssess',r,{coverage:'coberto',solution:'troca',diagnosis:'Conferido',reason:'Acordo',previous:0,confirm:true});ok(warrantyPanel(r).includes('Registrar troca'));ok(warrantyModal('warrantySwap',r)[1].includes('Destino da antiga'))});
test('other profiles cannot execute swap',()=>{for(const p of ['Financeiro','Técnico','Atendente']){role=p;eq(warrantyModal('warrantySwap',r),null);ok(!warrantyPanel(r).includes('modal:warrantySwap'))}role='Administrador'});
test('successful replacement and print/delivery',()=>{const before=JSON.stringify(o);warrantySubmit('warrantySwap',r,{assessment:1,source:'externa',destination:'retida_assistencia',type:'Placa',brand:'Midea',model:'Substituta',seal:'NOVA-1',reason:'Acordo privado',cost:'45.00',confirm:true});eq(JSON.stringify(o),before);ok(deliveryEquipment(r).includes('Midea'));ok(equipment(r).includes('Daikin'));ok(printView(r,false).includes('Substituta em garantia'));ok(warrantyPanel(r).includes('Substituição registrada'));eq(warrantyModal('warrantySwap',r),null)});
test('cost not visible to restricted profiles',()=>{for(const p of ['Financeiro','Técnico','Atendente']){role=p;const h=warrantyPanel(r);ok(!h.includes('45,00'));ok(!h.includes('Custo interno'))}role='Administrador'});
test('subsequent form points to replacement',()=>{r.status='Finalizado';r.conclusion=today();ok(warrantyReturnLink(o).includes('#retorno/18'));ok(newOrder(o).includes('Substituta em garantia'));ok(newOrder(o).includes('data-origin="18"'))});
test('portal replacement without seal or internal cost',()=>{const p=BancadaPortal.projection(r);ok(p.equipment.includes('Midea'));ok(!JSON.stringify(p).includes('NOVA-1'));ok(!JSON.stringify(p).includes('Acordo privado'))});
count;
`;
console.log(vm.runInNewContext(src+'\n'+checks,context)+' warranty swap UI checks passed.');
