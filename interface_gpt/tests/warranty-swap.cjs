// Run: node tests/warranty-swap.cjs
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=['quote.js','finance.js','cancel.js','warranty.js','portal.js'].map(f=>fs.readFileSync(path.join(__dirname,'../assets',f),'utf8')).join('\n');
const checks=`
const W=BancadaWarranty,F=BancadaFinance,C=BancadaCancel,P=BancadaPortal,Q=BancadaQuote;
const day='2026-11-26',now=day+'T12:00:00Z',snap=x=>JSON.stringify(x);
let count=0;const ok=(v,m)=>{if(!v)throw Error(m||'Assertion failed')},eq=(a,b)=>ok(a===b,a+' != '+b),test=(n,fn)=>{try{fn();count++}catch(e){throw Error(n+': '+e.message)}};
function reject(fn,msg,state){const before=snap(state);let err;try{fn()}catch(e){err=e}eq(err?.message,msg);eq(snap(state),before)}
function setup(){
 const o={id:1,client:1,unit:1,brand:'LG',model:'Antiga',type:'Placa',seal:'ANT-1',status:'Finalizado',entry:'2026-10-01',conclusion:'2026-10-05',warrantyDays:90,total:50000,paid:20000,history:[]};
 const r=W.create(o,[o],{defect:'Falha',confirm:true},day),all=[o,r],stock=[{sku:'P1',name:'Placa substituta',quantity:2,cost:4500},{sku:'P0',quantity:0}];
 W.assess(r,all,{coverage:'coberto',solution:'troca',diagnosis:'Falha',reason:'Acordo',previous:0,confirm:true},now,'Administrador');
 return {o,r,all,stock};
}
const data=(x,extra={})=>({assessment:W.assessment(x.r).id,source:'externa',destination:'retida_assistencia',type:'Placa',brand:'LG',model:'Nova',seal:'NOVA-1',serial:'',imei:'',reason:'MOTIVO PRIVADO',cost:4500,confirm:true,...extra});
const swap=(x,extra={})=>W.swap(x.r,x.all,x.stock,data(x,extra),now,'Administrador');
const state=x=>[x.all,x.stock];
test('external swap preserves original entry, stock and finance',()=>{const x=setup(),orig=snap(x.o),stock=snap(x.stock),entry=snap([x.r.brand,x.r.model,x.r.seal,x.r.unit,x.r.entry,x.r.warranty.end]);const e=swap(x);eq(snap(x.o),orig);eq(snap(x.stock),stock);eq(snap([x.r.brand,x.r.model,x.r.seal,x.r.unit,x.r.entry,x.r.warranty.end]),entry);eq(x.r.total,0);eq(e.cost,4500);eq(e.oldUnit,1);ok(e.replacement.unit!==1);eq(W.physical(x.r).model,'Nova');ok(W.executed(x.r));eq(F.summary(x.o).balance,30000)});
test('stock debit captures cost and one movement',()=>{const x=setup(),e=swap(x,{source:'estoque',sku:'P1',cost:999999});eq(x.stock[0].quantity,1);eq(e.cost,4500);eq(x.stock[0].movements.length,1);eq(x.stock[0].movements[0].type,'troca_saida');eq(x.stock[0].movements[0].operationId,e.id);eq(x.stock[1].quantity,0);eq(x.r.total,0)});
test('empty or unknown stock rejects all state',()=>{const x=setup();for(const sku of ['P0','missing'])reject(()=>swap(x,{source:'estoque',sku}),'Produto inexistente ou sem estoque disponível.',state(x));swap(x,{source:'estoque',sku:'P1'})});
test('unknown cost stays unknown',()=>{const x=setup();eq(swap(x,{cost:null}).cost,null)});
test('invalid external cost',()=>{const x=setup();reject(()=>swap(x,{cost:-1}),'Informe um custo externo válido.',state(x));swap(x,{cost:0})});
test('confirm before write',()=>{const x=setup();reject(()=>swap(x,{confirm:false}),'Confirme a substituição física e o destino da unidade antiga.',state(x));swap(x)});
test('source and destination required independently',()=>{const x=setup();for(const extra of [{source:''},{destination:''}])reject(()=>swap(x,extra),'Informe origem da substituta e destino da antiga.',state(x));swap(x,{destination:'devolvida_cliente'})});
test('identity required',()=>{const x=setup();reject(()=>swap(x,{seal:''}),'Identifique a nova unidade por selo, série ou IMEI.',state(x));swap(x,{seal:'',serial:'SERIE-1'})});
test('normalized duplicate seal',()=>{const x=setup();reject(()=>swap(x,{seal:' ant- 1 '}),'Selo já cadastrado. Identifique outra unidade física.',state(x));swap(x)});
test('required type brand model reason',()=>{const x=setup();for(const k of ['type','brand','model','reason'])reject(()=>swap(x,{[k]:' '}),'Confira os textos obrigatórios e seus limites.',state(x));swap(x)});
test('stale assessment',()=>{const x=setup();reject(()=>swap(x,{assessment:0}),'A avaliação mudou ou não permite esta solução. Reabra e confira.',state(x));swap(x)});
test('own obligation blocks swap',()=>{const x=setup();x.r.billing={due:day};reject(()=>swap(x),'Concilie a cobrança própria deste retorno antes de executar outra solução.',state(x));delete x.r.billing;swap(x)});
test('active published quote blocks swap until withdrawn',()=>{const x=setup();const a=W.assessment(x.r);W.assess(x.r,x.all,{coverage:'nao_coberto',solution:'novo_orcamento',diagnosis:'Falha',reason:'Revisão',previous:a.id,confirm:true},now,'Administrador');Q.saveDraft(x.r,{items:[{type:'Serviço',name:'Reparo',quantity:1,unit:2000}],discount:0,terms:{}});const v=Q.publish(x.r,now);W.assess(x.r,x.all,{coverage:'coberto',solution:'troca',diagnosis:'Falha',reason:'Revisão',previous:W.assessment(x.r).id,confirm:true},now,'Administrador');reject(()=>swap(x),'Retire a publicação do orçamento antes de executar troca ou devolução.',state(x));Q.withdraw(x.r,v.number);swap(x)});
test('delivered and finalized block',()=>{const x=setup();x.r.delivery={date:day};reject(()=>swap(x),'Corrija a entrega antes de executar outra solução.',state(x));x.r.delivery=null;x.r.status='Finalizado';reject(()=>swap(x),'Execute a solução antes de concluir ou entregar o retorno.',state(x));x.r.status='Aberto';swap(x)});
test('other active ordinary OS blocks',()=>{const x=setup();x.all.push({...x.o,id:9,status:'Aberto'});reject(()=>swap(x),'Conclua ou confira outros atendimentos abertos desta unidade antes de trocar.',state(x));x.all.pop();swap(x)});
test('duplicate swap and assessment revision blocked',()=>{const x=setup();swap(x);reject(()=>swap(x),'Esta unidade ou retorno já tem solução executada.',state(x));reject(()=>W.assess(x.r,x.all,{coverage:'coberto',solution:'reparo_sem_cobranca',diagnosis:'Falha',reason:'Revisão',previous:1,confirm:true},now,'Administrador'),'Solução já executada. Preserve a avaliação; corrija a operação antes de rever a decisão.',state(x));ok(C.blockers(x.r,x.all).length)});
test('swap required before finalize',()=>{const x=setup();reject(()=>W.transition(x.r,x.all,'Finalizado'),'Execute a solução de garantia escolhida antes de concluir o retorno.',state(x));swap(x);W.transition(x.r,x.all,'Finalizado')});
test('replacement return preserves lineage and guarantee',()=>{const x=setup(),e=swap(x);x.r.status='Finalizado';x.r.conclusion=day;eq(W.lastFinalized(x.o,x.all).id,x.r.id);const next=W.create(x.r,x.all,{defect:'Outra falha',confirm:true},day);eq(next.unit,e.replacement.unit);eq(next.brand,'LG');eq(next.model,'Nova');eq(next.origin,1);eq(next.warranty.previous,x.r.id);eq(next.warranty.end,x.r.warranty.end);x.all.push(next);eq(W.active(x.o,x.all).id,next.id);reject(()=>W.create(x.r,x.all,{defect:'Outra falha',confirm:true},day),'Já existe retorno em andamento para esta unidade.',state(x))});
test('old physical unit cannot be reused by domain',()=>{const x=setup();swap(x);reject(()=>W.create(x.o,x.all,{defect:'Falha',confirm:true},day),'Unidade substituída. Utilize o atendimento da substituta.',state(x))});
test('chained second swap continues root but not independent root',()=>{const x=setup();swap(x);x.r.status='Finalizado';x.r.conclusion=day;const r2=W.create(x.r,x.all,{defect:'Falha',confirm:true},day);x.all.push(r2);W.assess(r2,x.all,{coverage:'coberto',solution:'troca',diagnosis:'Falha',reason:'Acordo',previous:0,confirm:true},now,'Administrador');const e=W.swap(r2,x.all,x.stock,{...data(x),seal:'NOVA-2'},now,'Administrador');r2.status='Finalizado';r2.conclusion=day;ok(W.lineage(x.o,e.replacement.unit,x.all));eq(W.lastFinalized(x.o,x.all).id,r2.id);const independent={...x.o,id:50,unit:e.replacement.unit};eq(W.lastFinalized(independent,x.all),null)});
test('portal projection shows replacement but hides cost and reason',()=>{const x=setup();swap(x);const p=P.projection(x.r);ok(p.equipment.includes('Nova'));const json=snap(p);ok(!json.includes('MOTIVO PRIVADO'));ok(!json.includes('NOVA-1'));ok(!json.includes('4500'));eq(p.finance,null)});
test('legacy operations missing are initialized on success',()=>{const x=setup();delete x.r.warranty.operations;swap(x);eq(x.r.warranty.operations.length,1)});
count;
`;
console.log(vm.runInNewContext(src+'\n'+checks,{})+' warranty swap domain checks passed.');
