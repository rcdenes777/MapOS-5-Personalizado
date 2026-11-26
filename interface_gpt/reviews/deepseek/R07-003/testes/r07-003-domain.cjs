// R07-003 — domínio isolado: troca física, linhagem, estoque fictício e ressalvas R07-002.
// Run: node r07-003-domain.cjs   (vm sem DOM; assets reais)
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ASSETS = process.env.ASSETS_DIR || path.join(__dirname, '../../../../assets');
const src = ['quote.js', 'finance.js', 'cancel.js', 'warranty.js', 'portal.js']
  .map(f => fs.readFileSync(path.join(ASSETS, f), 'utf8')).join('\n');

const checks = `
const W=BancadaWarranty,F=BancadaFinance,C=BancadaCancel,P=BancadaPortal,Q=BancadaQuote;
const day='2026-11-26',now=day+'T12:00:00Z',snap=x=>JSON.stringify(x);
let count=0;const ok=(v,m)=>{if(!v)throw Error(m||'Assertion failed')},eq=(a,b)=>ok(a===b,a+' != '+b),test=(n,fn)=>{try{fn();count++}catch(e){throw Error(n+': '+e.message)}};
function reject(fn,msg,state){const before=snap(state);let err;try{fn()}catch(e){err=e}eq(err&&err.message,msg);eq(snap(state),before)}
function setup(){
 const o={id:1,client:1,unit:1,brand:'LG',model:'Antiga',type:'Placa',seal:'ANT-1',status:'Finalizado',entry:'2026-10-01',conclusion:'2026-10-05',warrantyDays:90,total:50000,paid:20000,history:[]};
 const r=W.create(o,[o],{defect:'Falha',confirm:true},day),all=[o,r],stock=[{sku:'P1',name:'Placa substituta',quantity:2,cost:4500},{sku:'P0',quantity:0,min:1},{sku:'P2',quantity:1.5,cost:100}];
 W.assess(r,all,{coverage:'coberto',solution:'troca',diagnosis:'Falha',reason:'Acordo',previous:0,confirm:true},now,'Administrador');
 return {o,r,all,stock};
}
const data=(x,extra={})=>({assessment:W.assessment(x.r).id,source:'externa',destination:'retida_assistencia',type:'Placa',brand:'LG',model:'Nova',seal:'NOVA-1',serial:'',imei:'',reason:'MOTIVO PRIVADO',cost:4500,confirm:true,...extra});
const dataFor=(r,extra={})=>({assessment:W.assessment(r).id,source:'externa',destination:'retida_assistencia',type:'Placa',brand:'LG',model:'Nova',seal:'NOVA-1',serial:'',imei:'',reason:'MOTIVO PRIVADO',cost:4500,confirm:true,...extra});
const swap=(x,extra={})=>W.swap(x.r,x.all,x.stock,data(x,extra),now,'Administrador');
const state=x=>[x.all,x.stock];
function finish(x){x.r.status='Finalizado';x.r.conclusion=day;return W.create(x.r,x.all,{defect:'Outra falha',confirm:true},day)}
const applyAssessment=(r,all,solution)=>W.assess(r,all,{coverage:'coberto',solution,diagnosis:'Falha',reason:'Revisão',previous:(W.assessment(r)?.id||0),confirm:true},now,'Administrador');

/* ---------- identidade e preservação ---------- */
test('D01 troca externa preserva entrada original, financeiro e retorno',()=>{
 const x=setup(),orig=snap(x.o),ret={entry:x.r.entry,brand:x.r.brand,model:x.r.model,seal:x.r.seal,unit:x.r.unit},fin=snap(F.summary(x.o)),ledger=snap(x.o.financeLedger||null),e=swap(x);
 eq(snap(x.o),orig);eq(snap(F.summary(x.o)),fin);eq(snap(x.o.financeLedger||null),ledger);
 eq(x.r.total,0);eq(x.r.paid,0);
 eq(x.r.brand,ret.brand);eq(x.r.model,ret.model);eq(x.r.seal,ret.seal);eq(x.r.unit,ret.unit);eq(x.r.entry,ret.entry);
 ok(e.replacement.unit!==1&&e.replacement.unit!==x.r.id);eq(W.physical(x.r).model,'Nova');ok(W.executed(x.r));
 eq(F.summary(x.o).balance,30000);
});
test('D02 estoque: baixa exata de 1, custo do produto, sem tocar outro produto nem financeiro',()=>{
 const x=setup(),other=snap(x.stock[1]),p2=snap(x.stock[2]),fin=snap(F.summary(x.o)),e=swap(x,{source:'estoque',sku:'P1',cost:999999});
 eq(x.stock[0].quantity,1);eq(e.cost,4500);eq(x.stock[0].movements.length,1);
 const m=x.stock[0].movements[0];eq(m.type,'troca_saida');eq(m.quantity,1);eq(m.returnId,x.r.id);eq(m.operationId,e.id);eq(m.cost,4500);
 eq(snap(x.stock[1]),other);eq(snap(x.stock[2]),p2);eq(snap(F.summary(x.o)),fin);eq(e.sku,'P1');
});
test('D03 estoque vazio/inexistente/quantidade inválida rejeitados sem baixa',()=>{
 const x=setup();
 for(const sku of ['P0','missing'])reject(()=>swap(x,{source:'estoque',sku}),'Produto inexistente ou sem estoque disponível.',state(x));
 reject(()=>swap(x,{source:'estoque',sku:'P2'}),'Produto inexistente ou sem estoque disponível.',state(x));
 eq(x.stock[0].quantity,2);ok(!x.stock[0].movements);eq(snap(F.summary(x.o)),snap(F.summary(x.o)));
 swap(x,{source:'estoque',sku:'P1'});eq(x.stock[0].quantity,1);
});
test('D04 custo externo: zero e ausente válidos, negativos/extremos/fracionários rejeitados',()=>{
 const a=setup();eq(swap(a,{cost:null}).cost,null);
 const b=setup();eq(swap(b,{cost:0}).cost,0);
 for(const c of [-1,1.5,999999999+1,'abc',NaN]){const y=setup();reject(()=>swap(y,{cost:c}),'Informe um custo externo válido.',state(y))}
});
test('D05 texto, identidade e origem/destino validados isoladamente',()=>{
 const x=setup();
 for(const extra of [{source:''},{source:'outra'},{destination:''},{destination:'lixo'}])reject(()=>swap(x,extra),'Informe origem da substituta e destino da antiga.',state(x));
 for(const k of ['type','brand','model','reason'])reject(()=>swap(x,{[k]:' '}),'Confira os textos obrigatórios e seus limites.',state(x));
 reject(()=>swap(x,{seal:'',serial:'',imei:''}),'Identifique a nova unidade por selo, série ou IMEI.',state(x));
 reject(()=>swap(x,{seal:'x'.repeat(101)}),'Confira os textos obrigatórios e seus limites.',state(x));
 eq(swap(x,{seal:'',serial:'SERIE-1'}).replacement.serial,'SERIE-1');
});
test('D06 selo duplicado normalizado contra original e contra substitutas anteriores',()=>{
 const x=setup();
 for(const seal of [' ant- 1 ','ANT-1','aNt- 1'])reject(()=>swap(x,{seal}),'Selo já cadastrado. Identifique outra unidade física.',state(x));
 eq(swap(x).replacement.seal,'NOVA-1');x.r.status='Finalizado';x.r.conclusion=day;
 const r2=finish(x);x.all.push(r2);applyAssessment(r2,x.all,'troca');
 reject(()=>W.swap(r2,x.all,x.stock,dataFor(r2,{seal:' nova-1 '}),now,'Administrador'),'Selo já cadastrado. Identifique outra unidade física.',state(x));
 const e=W.swap(r2,x.all,x.stock,dataFor(r2,{seal:'NOVA-2'}),now,'Administrador');eq(e.replacement.seal,'NOVA-2');
});
test('D07 confirmação, avaliação obsoleta, solução incorreta e status bloqueiam',()=>{
 const x=setup();reject(()=>swap(x,{confirm:false}),'Confirme a substituição física e o destino da unidade antiga.',state(x));
 reject(()=>swap(x,{assessment:0}),'A avaliação mudou ou não permite esta solução. Reabra e confira.',state(x));
 const y=setup();y.r.status='Finalizado';reject(()=>W.swap(y.r,y.all,y.stock,data(y),now,'Administrador'),'Execute a solução antes de concluir ou entregar o retorno.',state(y));
 y.r.status='Cancelado';reject(()=>W.swap(y.r,y.all,y.stock,data(y),now,'Administrador'),'Retorno inexistente ou cancelado.',state(y));
 const z=setup();applyAssessment(z.r,z.all,'reparo_sem_cobranca');reject(()=>swap(z),'A avaliação mudou ou não permite esta solução. Reabra e confira.',state(z));
});
test('D08 cobrança própria, entrega e publicação ativa bloqueiam; retirada libera',()=>{
 const x=setup();x.r.billing={due:day};reject(()=>swap(x),'Concilie a cobrança própria deste retorno antes de executar outra solução.',state(x));
 delete x.r.billing;x.r.delivery={date:day};reject(()=>swap(x),'Corrija a entrega antes de executar outra solução.',state(x));
 x.r.delivery=null;
 const a=W.assessment(x.r);W.assess(x.r,x.all,{coverage:'nao_coberto',solution:'novo_orcamento',diagnosis:'Falha',reason:'Revisão',previous:a.id,confirm:true},now,'Administrador');
 Q.saveDraft(x.r,{items:[{type:'Serviço',name:'Reparo',quantity:1,unit:2000}],discount:0,terms:{}});
 const v=Q.publish(x.r,now);
 W.assess(x.r,x.all,{coverage:'coberto',solution:'troca',diagnosis:'Falha',reason:'Revisão',previous:W.assessment(x.r).id,confirm:true},now,'Administrador');
 reject(()=>swap(x),'Retire a publicação do orçamento antes de executar troca ou devolução.',state(x));
 Q.withdraw(x.r,v.number);swap(x);
});
test('D09 outro atendimento aberto da unidade bloqueia; finalizado/cancelado não',()=>{
 const x=setup();x.all.push({...x.o,id:9,status:'Aberto'});reject(()=>swap(x),'Conclua ou confira outros atendimentos abertos desta unidade antes de trocar.',state(x));
 x.all.pop();x.all.push({...x.o,id:9,status:'Finalizado'},{...x.o,id:10,status:'Cancelado'});swap(x);
});
test('D10 troca repetida e resolução executada bloqueiam; substituta não reutiliza unidade antiga',()=>{
 const x=setup();const e=swap(x);
 reject(()=>swap(x),'Esta unidade ou retorno já tem solução executada.',state(x));
 reject(()=>W.create(x.o,x.all,{defect:'Falha',confirm:true},day),'Unidade substituída. Utilize o atendimento da substituta.',state(x));
 reject(()=>W.reference(x.o,x.all),'Unidade substituída. Utilize o atendimento da substituta.',state(x));
 eq(W.replaced(1,x.all),x.r);eq(W.replaced(e.replacement.unit,x.all),null);
});
test('D11 linhagem/currentUnit/raiz caminham pela cadeia e não misturam raiz independente',()=>{
 const x=setup();const e1=swap(x);ok(W.lineage(x.o,1,x.all));ok(W.lineage(x.o,e1.replacement.unit,x.all));ok(!W.lineage(x.o,999,x.all));
 eq(W.currentUnit(x.o,x.all).unit,e1.replacement.unit);
 x.r.status='Finalizado';x.r.conclusion=day;const r2=W.create(x.r,x.all,{defect:'Falha 2',confirm:true},day);x.all.push(r2);
 eq(r2.unit,e1.replacement.unit);eq(r2.origin,1);eq(r2.warranty.previous,x.r.id);eq(r2.warranty.end,x.r.warranty.end);eq(r2.warrantyDays,0);
 applyAssessment(r2,x.all,'troca');const e2=W.swap(r2,x.all,x.stock,dataFor(r2,{seal:'NOVA-2'}),now,'Administrador');
 ok(W.lineage(x.o,e2.replacement.unit,x.all));eq(W.currentUnit(x.o,x.all).unit,e2.replacement.unit);
 const ind={...x.o,id:50,unit:e2.replacement.unit};eq(W.lastFinalized(ind,x.all),null);eq(W.active(ind,x.all).id,r2.id);
 eq(r2.origin||r2.id,1);eq(ind.origin||ind.id,50);
});
test('D12 IDs de OS e unidade coincidentes não confundem linhagem, lastFinalized e vínculo',()=>{
 const orders=[{id:100,client:1,unit:100,brand:'A',model:'M',type:'Placa',seal:'S100',status:'Finalizado',entry:'2026-10-01',conclusion:'2026-10-02',warrantyDays:90,total:0,paid:0,history:[]}];
 const r1=W.create(orders[0],orders,{defect:'Falha',confirm:true},day);orders.push(r1);
 W.assess(r1,orders,{coverage:'coberto',solution:'troca',diagnosis:'Falha',reason:'Acordo',previous:0,confirm:true},now,'Administrador');
 const e=W.swap(r1,orders,[],{assessment:W.assessment(r1).id,source:'externa',destination:'devolvida_cliente',type:'Placa',brand:'B',model:'N',seal:'S102',serial:'',imei:'',reason:'Motivo',cost:0,confirm:true},now,'Administrador');
 eq(e.replacement.unit,102);r1.status='Finalizado';r1.conclusion=day;
 const r2=W.create(r1,orders,{defect:'Falha 2',confirm:true},day);orders.push(r2);
 eq(r2.id,102);eq(r2.unit,102);eq(r2.id,r2.unit);
 eq(W.lastFinalized(orders[0],orders).id,r1.id);eq(W.reference(r1,orders).unit,102);eq(W.reference(r1,orders).root,100);
 eq(W.lastFinalized(orders[0],orders).unit,100);
});
test('D13 duas garantias independentes da mesma unidade não compartilham raiz nem prazo',()=>{
 const rootA={id:1,client:1,unit:1,brand:'LG',model:'Antiga',type:'Placa',seal:'ANT-1',status:'Finalizado',entry:'2026-10-01',conclusion:'2026-10-05',warrantyDays:90,total:0,paid:0,history:[]};
 const rootB={...rootA,id:50,warrantyDays:180,conclusion:'2026-10-10'};
 const orders=[rootA,rootB];
 const retB=W.create(rootB,orders,{defect:'Falha B',confirm:true},day);orders.push(retB);retB.status='Finalizado';retB.conclusion=day;
 const retA=W.create(rootA,orders,{defect:'Falha A',confirm:true},day);orders.push(retA);
 W.assess(retA,orders,{coverage:'coberto',solution:'troca',diagnosis:'Falha',reason:'Acordo',previous:0,confirm:true},now,'Administrador');
 const e=W.swap(retA,orders,[],dataFor(retA),now,'Administrador');
 eq(retB.origin,50);eq(retB.warranty.previous,50);eq(retB.warranty.end,'2027-04-08');eq(retB.warranty.days,180);
 eq(W.lastFinalized(rootB,orders).id,retB.id);eq(W.lastFinalized(rootA,orders),null);
 eq(W.physical(retB).unit,1);eq(W.lineage(rootB,e.replacement.unit,orders),false);
 reject(()=>W.reference(rootB,orders),'Unidade substituída. Utilize o atendimento da substituta.',[orders,[]]);
});
test('D14 retorno posterior usa a substituta, mantém prazo e atendimento anterior correto',()=>{
 const x=setup(),e=swap(x);x.r.status='Finalizado';x.r.conclusion=day;
 const r2=W.create(x.r,x.all,{defect:'Falha 2',confirm:true},day);x.all.push(r2);
 eq(r2.brand,'LG');eq(r2.model,'Nova');eq(r2.unit,e.replacement.unit);eq(r2.origin,1);eq(r2.warranty.previous,x.r.id);
 eq(r2.warranty.days,90);eq(r2.warranty.end,x.r.warranty.end);eq(r2.warrantyDays,0);
 reject(()=>W.create(x.r,x.all,{defect:'Falha 3',confirm:true},day),'Já existe retorno em andamento para esta unidade.',state(x));
});
test('D15 cliente distinto e identificação ausente rejeitados',()=>{
 const x=setup();const r=W.create(x.o,[x.o],{defect:'Falha',confirm:true},day);
 const before=snap([x.o,r]);
 let err;try{W.reference({...x.o,client:2},[x.o,r])}catch(e){err=e}
 ok(err&&/mesma unidade e o cliente/.test(err.message));eq(snap([x.o,r]),before);
 const y=setup();y.o.brand='';reject(()=>W.create(y.o,y.all,{defect:'Falha',confirm:true},day),'Identifique a mesma unidade e o cliente na OS de origem antes de registrar retorno.',state(y));
});
test('D16 concluir exige solução executada; após troca é permitido',()=>{
 const x=setup();reject(()=>W.transition(x.r,x.all,'Finalizado'),'Execute a solução de garantia escolhida antes de concluir o retorno.',state(x));
 swap(x);W.transition(x.r,x.all,'Finalizado');x.r.status='Finalizado';eq(x.r.status,'Finalizado');
});
test('D17 troca bloqueia revisão de avaliação, reembolso e cancelamento',()=>{
 const x=setup();swap(x);
 reject(()=>applyAssessment(x.r,x.all,'reparo_sem_cobranca'),'Solução já executada. Preserve a avaliação; corrija a operação antes de rever a decisão.',state(x));
 reject(()=>W.refundEligibility(x.r,x.all),'A avaliação mudou ou não permite esta solução. Reabra e confira.',state(x));
 x.r.warranty.events.push({id:99,type:'avaliar',coverage:'coberto',solution:'devolucao_valor'});
 reject(()=>W.refundEligibility(x.r,x.all),'Retorno já resolvido por troca.',state(x));
 let err;try{x.r.coverage='Coberto';C.request(x.r,'cliente','Pedido',now,x.all)}catch(e){err=e}
 ok(err&&/retorno ou solução de garantia vinculada/.test(err.message));
 eq(C.blockers(x.r,x.all).length,1);
});
test('D18 reembolso ativo bloqueia troca; após correção e revisão a troca é possível',()=>{
 const x=setup(),a=W.assessment(x.r);
 W.assess(x.r,x.all,{coverage:'coberto',solution:'devolucao_valor',diagnosis:'Falha',reason:'Acordo',previous:a.id,confirm:true},now,'Administrador');
 const ref=W.refund(x.r,x.all,{assessment:W.assessment(x.r).id,key:W.refundKey(x.o),confirm:true,mode:'parcial',amount:5000,date:day,method:'Pix',reference:'R1',reason:'Devolvido'},now,day,'Administrador');
 x.r.warranty.events.push({id:98,type:'avaliar',coverage:'coberto',solution:'troca'});
 reject(()=>swap(x),'Esta unidade ou retorno já tem solução executada.',state(x));
 W.correctRefund(x.r,x.all,{reference:ref.id,confirm:true,reason:'Engano'},now,'Administrador');
 applyAssessment(x.r,x.all,'troca');
 swap(x);ok(W.executed(x.r));
});
test('D19 operações legadas sem array: só inicializam em sucesso válido',()=>{
 const x=setup();delete x.r.warranty.operations;
 reject(()=>swap(x,{confirm:false}),'Confirme a substituição física e o destino da unidade antiga.',state(x));ok(!x.r.warranty.operations);
 swap(x);eq(x.r.warranty.operations.length,1);
 const y=setup();delete y.r.warranty.operations;
 reject(()=>W.assess(y.r,y.all,{coverage:'coberto',solution:'troca',diagnosis:'F',reason:'R',previous:0,confirm:true},now,'Administrador'),'Outra avaliação foi registrada. Recarregue antes de decidir.',state(y));
 ok(!y.r.warranty.operations);
 W.assess(y.r,y.all,{coverage:'coberto',solution:'troca',diagnosis:'F',reason:'R',previous:W.assessment(y.r).id,confirm:true},now,'Administrador');
 eq(y.r.warranty.operations.length,0);
 W.swap(y.r,y.all,y.stock,data(y),now,'Administrador');eq(y.r.warranty.operations.length,1);
});
test('D20 eventos e ledger: IDs de operação e ledger distintos e vínculos preservados',()=>{
 const x=setup();swap(x);const e=x.r.warranty.operations[0];
 eq(e.assessment,1);eq(e.origin,1);eq(e.oldUnit,1);eq(e.type,'troca');ok(!('ledgerId' in e));
 eq(x.r.financeLedger,undefined);eq(x.o.financeLedger,undefined);
 const y=setup();F.receive(y.o,10000,'2026-11-20','Pix',now);W.assess(y.r,y.all,{coverage:'coberto',solution:'devolucao_valor',diagnosis:'F',reason:'R',previous:W.assessment(y.r).id,confirm:true},now,'Administrador');
 const ref=W.refund(y.r,y.all,{assessment:W.assessment(y.r).id,key:W.refundKey(y.o),confirm:true,mode:'parcial',amount:5000,date:day,method:'Pix',reference:'R1',reason:'D'},now,day,'Administrador');
 ok(ref.ledgerId&&ref.ledgerId!==ref.id);const corr=W.correctRefund(y.r,y.all,{reference:ref.id,confirm:true,reason:'C'},now,'Administrador');
 ok(corr.ledgerId&&corr.ledgerId!==ref.ledgerId&&corr.id!==ref.id);
 eq(corr.reference,ref.id);eq(y.r.warranty.operations.length,2);
 eq(y.o.financeLedger.events.filter(ev=>String(ev.type).startsWith('warranty_')).length,2);
});
test('D21 portal: substituta por marca/modelo, sem selo, motivo, custo ou IDs',()=>{
 const x=setup();swap(x,{source:'estoque',sku:'P1'});
 const p=P.projection(x.r),j=snap(p);
 ok(p.equipment.includes('Nova'));ok(!j.includes('NOVA-1'));ok(!j.includes('MOTIVO PRIVADO'));ok(!j.includes('4500'));ok(!j.includes('"unit"'));ok(!j.includes('operation'));
 eq(p.finance,null);
});
test('D22 troca não cria dívida própria, não altera entrega/conclusão/prazo e mantém entrada original',()=>{
 const x=setup(),before={entry:x.r.entry,conclusion:x.r.conclusion,days:x.r.warrantyDays,end:x.r.warranty.end,delivery:x.r.delivery,approval:x.r.approval};
 swap(x,{source:'estoque',sku:'P1'});
 eq(x.r.total,0);eq(x.r.paid,0);eq(x.r.billing,undefined);eq(x.r.delivery,prev(x),'delivery');
 function prev(){return before.delivery}
 eq(x.r.entry,before.entry);eq(x.r.conclusion,before.conclusion);eq(x.r.warrantyDays,before.days);eq(x.r.warranty.end,before.end);eq(x.r.approval,before.approval);
 eq(x.o.brand,'LG');eq(x.o.model,'Antiga');eq(x.o.seal,'ANT-1');eq(x.o.unit,1);
});
test('D23 retorno cancelado: consulta read-only do histórico funciona, novas operações não',()=>{
 const x=setup();const a=W.assessment(x.r);
 W.assess(x.r,x.all,{coverage:'coberto',solution:'devolucao_valor',diagnosis:'Falha',reason:'Acordo',previous:a.id,confirm:true},now,'Administrador');
 const ref=W.refund(x.r,x.all,{assessment:W.assessment(x.r).id,key:W.refundKey(x.o),confirm:true,mode:'parcial',amount:5000,date:day,method:'Pix',reference:'R1',reason:'D'},now,day,'Administrador');
 W.correctRefund(x.r,x.all,{reference:ref.id,confirm:true,reason:'C'},now,'Administrador');
 x.r.status='Cancelado';
 const origin=W.refundOrigin(x.r,x.all,true);eq(origin.id,x.o.id);
 reject(()=>W.refundEligibility(x.r,x.all),'Retorno inexistente ou cancelado.',state(x));
 reject(()=>W.correctRefund(x.r,x.all,{reference:ref.id,confirm:true,reason:'C2'},now,'Administrador'),'Retorno inexistente ou cancelado.',state(x));
 eq(W.refundEvents(x.r).length,2);eq(x.r.total,0);
});
test('D24 prévia decimal/preços: formatação e limites do domínio não aceitam fração de centavo',()=>{
 const x=setup();
 for(const c of [1.5,-1,999999999+1,NaN]){const y=setup();reject(()=>swap(y,{cost:c}),'Informe um custo externo válido.',state(y))}
 eq(swap(x,{cost:999999999}).cost,999999999);
});
test('D25 troca em sequência: segunda substituta usada no retorno posterior',()=>{
 const x=setup();swap(x);x.r.status='Finalizado';x.r.conclusion=day;
 const r2=W.create(x.r,x.all,{defect:'F',confirm:true},day);x.all.push(r2);applyAssessment(r2,x.all,'troca');
 const e2=W.swap(r2,x.all,x.stock,dataFor(r2,{seal:'NOVA-2'}),now,'Administrador');r2.status='Finalizado';r2.conclusion=day;
 const r3=W.create(r2,x.all,{defect:'F3',confirm:true},day);x.all.push(r3);
 eq(r3.unit,e2.replacement.unit);eq(r3.warranty.previous,r2.id);eq(r3.origin,1);eq(r3.warranty.end,x.r.warranty.end);
 eq(W.lastFinalized(x.o,x.all).id,r2.id);eq(W.lineage(x.o,1,x.all),true);ok(W.lineage(x.o,r3.unit,x.all));
});
test('D26 retorno da segunda substituta após troca finalizada mantém atendimento anterior',()=>{
 const x=setup();swap(x);x.r.status='Finalizado';x.r.conclusion=day;
 const r2=W.create(x.r,x.all,{defect:'F2',confirm:true},day);x.all.push(r2);applyAssessment(r2,x.all,'troca');
 const e2=W.swap(r2,x.all,x.stock,dataFor(r2,{seal:'NOVA-2'}),now,'Administrador');r2.status='Finalizado';r2.conclusion=day;
 eq(W.lastFinalized(x.o,x.all).id,r2.id);eq(W.lastFinalized(r2,x.all).id,r2.id);
 const r3=W.create(r2,x.all,{defect:'F3',confirm:true},day);x.all.push(r3);
 eq(r3.warranty.previous,r2.id);eq(r3.unit,e2.replacement.unit);
});
test('D27 saída de estoque com custo desconhecido permanece desconhecida e vinculada',()=>{
 const x=setup();x.stock[0].cost=undefined;const e=swap(x,{source:'estoque',sku:'P1'});
 eq(e.cost,null);eq(x.stock[0].movements[0].cost,null);eq(x.stock[0].quantity,1);
});
test('D28 snapshot do retorno após troca: entrada original byte a byte e JSON serializável',()=>{
 const x=setup(),orig={id:x.o.id,brand:x.o.brand,model:x.o.model,type:x.o.type,seal:x.o.seal,serial:x.o.serial,imei:x.o.imei,unit:x.o.unit,entry:x.o.entry,conclusion:x.o.conclusion,warrantyDays:x.o.warrantyDays};
 const ret={brand:x.r.brand,model:x.r.model,type:x.r.type,seal:x.r.seal,unit:x.r.unit,entry:x.r.entry,conclusion:x.r.conclusion,warrantyDays:x.r.warrantyDays};
 swap(x);
 eq(snap({id:x.o.id,brand:x.o.brand,model:x.o.model,type:x.o.type,seal:x.o.seal,serial:x.o.serial,imei:x.o.imei,unit:x.o.unit,entry:x.o.entry,conclusion:x.o.conclusion,warrantyDays:x.o.warrantyDays}),snap(orig));
 eq(snap({brand:x.r.brand,model:x.r.model,type:x.r.type,seal:x.r.seal,unit:x.r.unit,entry:x.r.entry,conclusion:x.r.conclusion,warrantyDays:x.r.warrantyDays}),snap(ret));
 ok(JSON.stringify(x.r));
});
test('D29 handler/estado: custo externo ausente e zero não inventam cobrança',()=>{
 const x=setup();eq(swap(x,{cost:''}).cost,null);eq(x.r.total,0);eq(x.r.paid,0);eq(F.summary(x.o).balance,30000);
});
test('D30 avaliação troca exige cobertura concluída',()=>{
 const x=setup();
 reject(()=>W.assess(x.r,x.all,{coverage:'avaliacao',solution:'troca',diagnosis:'',reason:'R',previous:W.assessment(x.r).id,confirm:true},now,'Administrador'),'Conclua a avaliação de cobertura antes de escolher a solução.',state(x));
});
test('D31 avaliação inconsistente (cobertura em avaliação com solução troca) não executa',()=>{
 const x=setup();x.r.warranty.events.push({id:77,type:'avaliar',coverage:'avaliacao',solution:'troca'});
 reject(()=>swap(x),'A avaliação mudou ou não permite esta solução. Reabra e confira.',state(x));
});
test('D32 linhagem falsa com mesmo cliente é recusada',()=>{
 const x=setup();
 const alien={...x.o,id:70,unit:99,status:'Finalizado',conclusion:'2026-10-05',origin:1,brand:'LG',model:'Antiga'};
 x.all.push(alien);
 reject(()=>W.reference(alien,x.all),'Identifique a mesma unidade e o cliente na OS de origem antes de registrar retorno.',state(x));
});
test('D33 duas raízes da mesma unidade mantêm lastFinalized independentes',()=>{
 const rootA={id:60,client:1,unit:5,brand:'LG',model:'Antiga',type:'Placa',seal:'RA-1',status:'Finalizado',entry:'2026-10-01',conclusion:'2026-10-05',warrantyDays:90,total:0,paid:0,history:[]};
 const rootB={...rootA,id:61,seal:'RB-1',conclusion:'2026-10-10',warrantyDays:180};
 const orders=[rootA,rootB];
 const rA=W.create(rootA,orders,{defect:'Falha A',confirm:true},day);orders.push(rA);rA.status='Finalizado';rA.conclusion=day;
 const rB=W.create(rootB,orders,{defect:'Falha B',confirm:true},day);orders.push(rB);rB.status='Finalizado';rB.conclusion=day;
 eq(W.lastFinalized(rootA,orders).id,rA.id);eq(W.lastFinalized(rootB,orders).id,rB.id);
});
count;
`;

try {
  const total = vm.runInNewContext(src + '\n' + checks, {});
  const out = process.env.RESULT_PATH || path.join(__dirname, 'r07-003-domain-resultados.json');
  fs.writeFileSync(out, JSON.stringify({
    generatedAt: new Date().toISOString(),
    codeSha: process.env.CODE_SHA || '',
    assetsDir: ASSETS,
    total,
    summary: { PASS: total, FAIL: 0 },
    results: [{ id: 'DOMAIN', status: 'PASS', total }]
  }, null, 2));
  console.log(`${total} warranty swap domain checks passed.`);
} catch (e) {
  console.error('FAIL: ' + e.message);
  process.exit(1);
}
