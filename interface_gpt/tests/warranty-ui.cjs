// Run: node tests/warranty-ui.cjs (DOM stub, not browser)
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=['quote.js','portal.js','quote-ui.js','finance.js','finance-ui.js','cancel.js','cancel-ui.js','warranty.js','warranty-ui.js','app.js'].map(f=>fs.readFileSync(path.join(__dirname,'../assets',f),'utf8')).join('\n');
const nodes=new Map();const document={querySelector(k){if(k==='#new-form')return null;if(!nodes.has(k))nodes.set(k,{innerHTML:'',textContent:'',focus(){}});return nodes.get(k)},addEventListener(){}};
const context={document,window:{addEventListener(){},scrollTo(){}},location:{hash:'#inicio'},localStorage:{getItem(){return null},setItem(){}}};
const checks=`
let count=0;const ok=(v,m)=>{if(!v)throw Error(m||'Assertion failed')},eq=(a,b)=>ok(a===b,a+' != '+b),test=(n,fn)=>{try{fn();count++}catch(e){throw Error(n+': '+e.message)}};
const o=db.orders.find(x=>x.id===16),r=db.orders.find(x=>x.id===18);
test('origin shows existing active return',()=>{role='Administrador';ok(warrantySummary(o).includes('Abrir retorno em andamento'));ok(newOrder(o).includes('Retorno em andamento'))});
test('return tab works from route',()=>{location.hash='#os/18/garantia';render();ok($('#main').innerHTML.includes('Avaliação da cobertura'));ok($('#main').innerHTML.includes('Prazo original'))});
test('evaluation form and submit',()=>{ok(warrantyModal('warrantyAssess',r));warrantySubmit('warrantyAssess',r,{coverage:'coberto',solution:'reparo_sem_cobranca',diagnosis:'Diagnóstico fictício',reason:'Avaliação',previous:0,confirm:true});eq(r.coverage,'Coberto');eq(r.total,0);ok(warrantyPanel(r).includes('Reparo sem cobrança'))});
test('cost admin private',()=>{ok(warrantyModal('warrantyCost',r));warrantySubmit('warrantyCost',r,{amount:'25.50',minutes:'30',reason:'Interno privado',confirm:true});eq(BancadaWarranty.costs(r).amount,2550);ok(warrantyPanel(r).includes('Interno privado'))});
test('restricted profiles no cost or controls',()=>{for(const p of ['Atendente','Técnico','Financeiro']){role=p;const h=warrantyPanel(r);ok(!h.includes('Interno privado'));eq(warrantyModal('warrantyCost',r),null)}});
test('assessment rights',()=>{role='Atendente';eq(warrantyModal('warrantyAssess',r),null);role='Técnico';ok(warrantyModal('warrantyAssess',r))});
test('correct cost preserves event',()=>{role='Administrador';const e=BancadaWarranty.events(r).find(x=>x.type==='custo');ok(warrantyModal('warrantyCorrect',r,e.id));warrantySubmit('warrantyCorrect',r,{reference:e.id,reason:'Duplicado',confirm:true});eq(BancadaWarranty.costs(r).amount,0);eq(warrantyModal('warrantyCorrect',r,e.id),null)});
test('quote action only after new quote evaluation',()=>{ok(!BancadaQuote.editable(r));warrantySubmit('warrantyAssess',r,{coverage:'nao_coberto',solution:'novo_orcamento',diagnosis:'Falha nova',reason:'Revisão',previous:BancadaWarranty.assessment(r).id,confirm:true});ok(BancadaQuote.editable(r));ok(quotePanel(r).includes('Editar itens'));ok(!quotePanel(r).includes('Formalizar cobrança'))});
test('other profiles guarantee tab no money leak',()=>{for(const p of ['Técnico','Atendente']){role=p;location.hash='#os/18/garantia';render();ok(!$('#main').innerHTML.includes('R$'))}});
count;
`;
console.log(vm.runInNewContext(src+'\n'+checks,context)+' warranty UI checks passed.');
