'use strict';
/*
 * R07-002 — domínio: devolução de garantia, correção compensatória, F02 e raízes.
 * Executa os assets reais em VM isolada (sem DOM, sem localStorage, sem rede).
 * Uso: node r07-002-domain.cjs
 *      ASSETS_DIR=/scratch/assets RESULT_PATH=/scratch/out.json node r07-002-domain.cjs
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const ASSETS = process.env.ASSETS_DIR || path.resolve(__dirname, '../../../../assets');
const OUT = process.env.RESULT_PATH || path.join(__dirname, 'r07-002-domain-resultados.json');
const FILES = ['quote.js', 'portal.js', 'finance.js', 'cancel.js', 'warranty.js'];
const src = FILES.map(f => fs.readFileSync(path.join(ASSETS, f), 'utf8')).join('\n');

const checks = String.raw`
const F=BancadaFinance,W=BancadaWarranty,Q=BancadaQuote,C=BancadaCancel,P=BancadaPortal;
const day='2026-11-26',now=day+'T12:00:00Z';
const out=[];
const test=(id,name,fn)=>{try{fn();out.push({id,name,status:'PASS'})}catch(e){out.push({id,name,status:'FAIL',detail:String(e&&e.message||e)})}};
const info=(id,name,detail)=>out.push({id,name,status:'INFO',detail});
const ok=(v,m)=>{if(!v)throw Error(m||'assertion failed')};
const eq=(a,b,m)=>{if(a!==b)throw Error((m?m+': ':'')+'expected '+JSON.stringify(b)+' got '+JSON.stringify(a))};
const snap=x=>JSON.stringify(x);
const clone=x=>JSON.parse(JSON.stringify(x));
const rejects=(fn,msg,state,label)=>{
  const before=snap(state);let err=null;try{fn()}catch(e){err=e}
  eq(err&&err.message,msg,(label||'error')+' message');
  if(state!==undefined)eq(snap(state),before,(label||'error')+' state unchanged');
};
function origin(opts={}){
  const {id=1,unit=7,client=1,total=50000,paid=20000,conclusion='2026-09-01',days=90,billing=true,ledger=true,status='Finalizado'}=opts;
  const o={id,unit,client,brand:'LG',model:'Inverter',type:'Placa eletrônica',status,entry:'2026-08-20',conclusion,
    warrantyDays:days,total,paid:0,approval:'Aprovado',delivery:null,history:[{time:'2026-08-20T10:00:00Z',text:'Entrada registrada'}]};
  if(billing)o.billing={due:'2026-12-20',items:[{type:'Serviço',name:'Original',quantity:1,unit:total}],discount:0};
  if(ledger){if(paid)F.receive(o,paid,'2026-11-25','Pix',now);}else{o.paid=paid;}
  return o;
}
function setup(opts={}){
  const o=origin(opts);
  const r=W.create(o,[o],{defect:'Falha após o reparo',confirm:true},day);
  const all=[o,r];
  W.assess(r,all,{coverage:'coberto',solution:'devolucao_valor',diagnosis:'Falha confirmada',reason:'Acordo com o cliente',previous:0,confirm:true},now,'Administrador');
  return {o,r,all};
}
const data=(x,more={})=>({assessment:W.assessment(x.r).id,key:W.refundKey(x.o),mode:'parcial',amount:5000,date:day,method:'Pix',reference:'COMPROVANTE PRIVADO',reason:'MOTIVO PRIVADO',confirm:true,...more});
const give=(x,more={})=>W.refund(x.r,x.all,data(x,more),now,day,'Administrador');
const correction=(x,id)=>W.correctRefund(x.r,x.all,{reference:id,reason:'Registro lançado por engano',confirm:true},now,'Administrador');
const summary=(o,total,paid,balance)=>{const s=F.summary(o);eq(s.total,total,'total');eq(s.paid,paid,'paid');eq(s.balance,balance,'balance');eq(o.total,total,'o.total');eq(o.paid,paid,'o.paid')};

/* ---------- 1. exemplo normativo do GPT: 500/200, parcial 50, total 150/450 ---------- */
test('D01','Parcial 50 sobre 500/200 preserva cobrança, recibo e histórico da origem',()=>{
  const x=setup(),b=snap(x.o.billing),h=snap(x.o.history),rc=snap(F.receipt(x.o,1)),before=snap(x.o);
  const e=give(x);
  eq(e.mode,'parcial');eq(e.amount,5000);eq(e.credit,5000);eq(e.origin,1);
  summary(x.o,45000,15000,30000);
  eq(F.summary(x.o).originalTotal,50000);eq(F.summary(x.o).originalPaid,20000);
  eq(F.summary(x.o).warrantyRefund,5000);eq(F.summary(x.o).warrantyCredit,5000);
  eq(snap(x.o.billing),b,'billing');eq(snap(x.o.history),h,'history');eq(snap(F.receipt(x.o,1)),rc,'receipt');
  eq(F.reversed(x.o,1),null,'receipt not reversed');eq(F.events(x.o).length,2,'one receipt + one refund');
  eq(x.r.total,0);eq(x.r.paid,0);eq(x.r.status,'Aberto');
  ok(W.executed(x.r),'refund counts as executed solution');
  const org=JSON.parse(before);eq(org.conclusion,x.o.conclusion,'conclusion');eq(org.entry,x.o.entry,'entry');
});
test('D02','Encerramento total após parcial devolve 150 e abate 450; histórico 200/500',()=>{
  const x=setup();give(x);
  const e=give(x,{mode:'total',amount:15000});
  eq(e.amount,15000);eq(e.credit,45000);
  summary(x.o,0,0,0);
  const c=F.warrantyCredits(x.o);eq(c.amount,20000,'total refunded cash');eq(c.credit,50000,'total credited');eq(c.count,2);
  eq(F.warrantyStatus(x.o),'Reembolsado');
  eq(P.projection(x.o).finance.status,'Reembolsada');
  eq(P.projection(x.o).finance.total,0);eq(P.projection(x.o).finance.paid,0);eq(P.projection(x.o).finance.balance,0);
  eq(F.category(x.o,day),'paid');eq(F.aggregate(x.all,day).balance,0,'aggregate excludes closed balance');
  ok(F.hasObligation(x.o),'zero-value obligation remains visible');
  ok(!Q.editable(x.o),'closed obligation cannot be edited');
  rejects(()=>Q.formalize(x.o,day),'Confira os itens e o vencimento da cobrança.',x.all,'recharge');
  eq(x.r.warranty.operations.length,2,'two operations');
  eq(x.r.warranty.operations.map(e=>e.mode).join(','),'parcial,total');
});
test('D03','Correção em ordem direta (parcial e depois total) recompõe 50/50/0 e 500/200/300',()=>{
  const x=setup();const p=give(x),t=give(x,{mode:'total',amount:15000});
  const pBefore=snap(p),tBefore=snap(t);
  correction(x,p.id);
  summary(x.o,5000,5000,0);
  ok(W.executed(x.r),'total refund still executed');
  eq(F.warrantyStatus(x.o),null,'partial remainder is not a closed warranty status');
  correction(x,t.id);
  summary(x.o,50000,20000,30000);
  eq(snap(p),pBefore,'original partial event preserved');eq(snap(t),tBefore,'original total event preserved');
  eq(W.refundEvents(x.r).length,4,'four operation records');
  ok(!W.executed(x.r),'no active refund after both corrections');
  eq(F.receipt(x.o,1).amount,20000,'original receipt intact');
  eq(F.events(x.o).filter(e=>e.type==='warranty_refund').length,2,'ledger refunds preserved');
});
test('D04','Correção em ordem inversa (total e depois parcial) também restaura os valores',()=>{
  const x=setup();const p=give(x),t=give(x,{mode:'total',amount:15000});
  correction(x,t.id);summary(x.o,45000,15000,30000);
  correction(x,p.id);summary(x.o,50000,20000,30000);
  ok(!W.executed(x.r));eq(W.refundEvents(x.r).length,4);
  const totalOps=W.refundEvents(x.r).filter(e=>e.type==='reembolso').length;
  eq(totalOps,2,'refund originals retained');
});
test('D05','Encerramento total com zero dinheiro abate 500 sem saída e status Encerrado por garantia',()=>{
  const x=setup({paid:0});
  const e=give(x,{mode:'total',amount:0});
  eq(e.amount,0);eq(e.credit,50000);
  summary(x.o,0,0,0);
  eq(F.warrantyStatus(x.o),'Encerrado por garantia');
  eq(P.projection(x.o).finance.status,'Encerrada por garantia');
  eq(F.events(x.o).filter(e=>e.type==='receive').length,0,'no receipt invented');
  eq(F.events(x.o)[F.events(x.o).length-1].type,'warranty_refund');
  correction(x,e.id);summary(x.o,50000,0,50000);
  eq(F.warrantyStatus(x.o),null);
});
test('D06','Dado legado com total positivo e sem billing preserva valor e não inventa recibo/obrigação',()=>{
  const x=setup({billing:false,ledger:false});
  const q=snap(Q.init(x.o).versions);
  give(x,{mode:'total',amount:20000});
  summary(x.o,0,0,0);
  eq(x.o.billing,undefined,'billing not invented');
  eq(x.o.financeLedger.opening,20000,'legacy opening preserved');
  eq(F.events(x.o).filter(e=>e.type==='receive').length,0,'no receipt event');
  eq(F.events(x.o).filter(e=>e.type==='warranty_refund').length,1,'only the refund event');
  eq(snap(Q.init(x.o).versions),q,'quote projection preserved');
  eq(F.summary(x.o).originalTotal,50000);eq(F.summary(x.o).originalPaid,20000);
  ok(F.hasObligation(x.o));eq(F.category(x.o,day),'paid');
  eq(P.projection(x.o).finance.status,'Reembolsada');
});
test('D07','Pagamento posterior após parcial respeita o saldo líquido e compõe a devolução total',()=>{
  const x=setup();give(x); // 450/150/300
  rejects(()=>F.receive(x.o,30001,day,'Pix',now),'Recebimento excede o saldo ou tem valor inválido.',x.all,'overpay');
  F.receive(x.o,30000,day,'Pix',now);summary(x.o,45000,45000,0);
  const e=give(x,{mode:'total',amount:45000});
  eq(e.credit,45000);eq(e.amount,45000);summary(x.o,0,0,0);
  rejects(()=>F.receive(x.o,1,day,'Pix',now),'Cobrança indisponível. Acerto de cancelamento não autoriza recebimento.',x.all,'receive after closure');
});
test('D08','Correção de recebimento bloqueada com devolução ativa e reabilitada após corrigir',()=>{
  const x=setup();const e=give(x);
  rejects(()=>F.reverse(x.o,1,day,'Erro',now),'Há devolução ou abatimento registrado nesta OS. Confira o histórico antes de corrigir o recebimento.',x.all,'reverse blocked');
  correction(x,e.id);
  const rev=F.reverse(x.o,1,day,'Erro',now);
  eq(rev.reference,1);summary(x.o,50000,0,50000);
  eq(F.reversed(x.o,1).id,rev.id);
});
test('D09','Datas da devolução: futura, impossível e anterior ao recibo são recusadas; igual é aceita',()=>{
  const x=setup();
  rejects(()=>give(x,{date:'2026-11-27'}),'Informe a data real da devolução, sem data futura.',x.all,'future');
  rejects(()=>give(x,{date:'2026-02-30'}),'Informe a data real da devolução, sem data futura.',x.all,'impossible');
  rejects(()=>give(x,{date:'2026-11-24'}),'Data anterior aos registros financeiros da origem.',x.all,'before receipt');
  const e=give(x,{date:'2026-11-25'});eq(e.date,'2026-11-25');
});
test('D10','Segunda devolução aceita data anterior à primeira, mas nunca anterior ao recibo (paridade original)',()=>{
  const x=setup();give(x,{date:'2026-11-26'});
  const e=give(x,{mode:'total',amount:15000,date:'2026-11-25'});
  eq(e.date,'2026-11-25');summary(x.o,0,0,0);
  const y=setup();give(y,{date:'2026-11-26'});
  rejects(()=>give(y,{mode:'total',amount:15000,date:'2026-11-24'}),'Data anterior aos registros financeiros da origem.',y.all,'antes do recibo');
  info('D10i','A data da segunda devolução pode anteceder a primeira porque eventos de garantia não são financeiros; o piso continua sendo o recibo original (25/11).',e.date);
});
test('D11','Chave financeira obsoleta e avaliação obsoleta recusam com estado intacto',()=>{
  const x=setup();
  const oldKey=W.refundKey(x.o);F.receive(x.o,1000,day,'Pix',now);
  rejects(()=>W.refund(x.r,x.all,data(x,{key:oldKey}),now,day,'Administrador'),'O financeiro mudou. Recarregue e confira novamente o valor.',x.all,'stale key');
  rejects(()=>W.refund(x.r,x.all,data(x,{key:W.refundKey(x.o),assessment:0}),now,day,'Administrador'),'A avaliação mudou ou não permite esta solução. Reabra e confira.',x.all,'stale assessment');
  give(x);summary(x.o,45000,16000,29000);
});
test('D12','Cobrança própria do retorno, entrega, finalização e publicação ativa bloqueiam a devolução',()=>{
  const x=setup();x.r.total=1000;x.r.billing={due:day,items:[]};
  rejects(()=>give(x),'Concilie a cobrança própria deste retorno antes de executar outra solução.',x.all,'own billing');
  x.r.total=0;delete x.r.billing;give(x);
  const y=setup();y.r.delivery={date:day};
  rejects(()=>give(y),'Corrija a entrega antes de executar outra solução.',y.all,'delivery');
  y.r.delivery=null;y.r.status='Finalizado';
  rejects(()=>give(y),'Execute a solução antes de concluir ou entregar o retorno.',y.all,'finalized');
  y.r.status='Aberto';give(y);
  const z=setup();
  W.assess(z.r,z.all,{coverage:'coberto',solution:'novo_orcamento',diagnosis:'Novo reparo',reason:'Revisão',previous:1,confirm:true},now,'Administrador');
  Q.saveDraft(z.r,{items:[{type:'Serviço',name:'Reparo',quantity:1,unit:5000}],discount:0,terms:{}});
  const v=Q.publish(z.r,now);
  W.assess(z.r,z.all,{coverage:'coberto',solution:'devolucao_valor',diagnosis:'Acordo',reason:'Revisão',previous:2,confirm:true},now,'Administrador');
  rejects(()=>give(z),'Retire a publicação do orçamento antes de executar troca ou devolução.',z.all,'active publication');
  Q.withdraw(z.r,v.number);give(z);
  eq(z.r.quote.versions.length,1,'old version preserved');
});
test('D13','Solução diferente de devolução e cobertura em avaliação não permitem executar',()=>{
  const x=setup();
  W.assess(x.r,x.all,{coverage:'coberto',solution:'reparo_sem_cobranca',diagnosis:'Outro',reason:'Revisão',previous:1,confirm:true},now,'Administrador');
  rejects(()=>give(x),'A avaliação mudou ou não permite esta solução. Reabra e confira.',x.all,'wrong solution');
  const y=setup();
  // força uma avaliação legada incoerente (cobertura em avaliação com solução)
  y.r.warranty.events.push({id:99,type:'avaliar',coverage:'avaliacao',solution:'devolucao_valor',diagnosis:'',reason:'legado',when:now,actor:'Legado'});
  rejects(()=>give(y),'A avaliação mudou ou não permite esta solução. Reabra e confira.',y.all,'coverage pending');
});
test('D14','Solução executada protege a avaliação até a correção do registro',()=>{
  const x=setup();const e=give(x);
  const d={coverage:'coberto',solution:'reparo_sem_cobranca',diagnosis:'Conferido',reason:'Revisão',previous:1,confirm:true};
  rejects(()=>W.assess(x.r,x.all,d,now,'Administrador'),'Solução já executada. Preserve a avaliação; corrija a operação antes de rever a decisão.',x.all,'assess blocked');
  correction(x,e.id);
  W.assess(x.r,x.all,d,now,'Administrador');
  eq(W.assessment(x.r).solution,'reparo_sem_cobranca');
});
test('D15','Correção duplicada, confirmação e motivo obrigatórios são recusados sem estado parcial',()=>{
  const x=setup();const e=give(x);
  rejects(()=>W.correctRefund(x.r,x.all,{reference:e.id,reason:'Erro',confirm:false},now,'Administrador'),'Confirme que o dinheiro não foi devolvido e que o registro foi lançado por engano.',x.all,'confirm');
  rejects(()=>W.correctRefund(x.r,x.all,{reference:e.id,reason:' ',confirm:true},now,'Administrador'),'Confira os textos obrigatórios e seus limites.',x.all,'reason');
  rejects(()=>W.correctRefund(x.r,x.all,{reference:999,reason:'Erro',confirm:true},now,'Administrador'),'Devolução inexistente ou já corrigida.',x.all,'unknown');
  correction(x,e.id);
  rejects(()=>correction(x,e.id),'Devolução inexistente ou já corrigida.',x.all,'duplicate');
  eq(W.refundEvents(x.r).filter(e=>e.type==='corrigir_reembolso').length,1);
});
test('D16','Modalidades/valor: zero parcial, modo inválido, acima do recebido e total inexato',()=>{
  const x=setup();
  rejects(()=>give(x,{amount:0}),'Confira modalidade e valor devolvido.',x.all,'zero partial');
  rejects(()=>give(x,{mode:'metade'}),'Confira modalidade e valor devolvido.',x.all,'mode');
  rejects(()=>give(x,{amount:20001}),'A devolução deve respeitar o recebido líquido; no encerramento total, devolva exatamente esse valor.',x.all,'excess');
  rejects(()=>give(x,{mode:'total',amount:19999}),'A devolução deve respeitar o recebido líquido; no encerramento total, devolva exatamente esse valor.',x.all,'total inexact');
  give(x,{amount:20000});summary(x.o,30000,0,30000);
});
test('D17','Forma inválida, referência/motivo vazios e confirmação ausente',()=>{
  const x=setup();
  rejects(()=>give(x,{method:'Cheque'}),'Forma de devolução inválida.',x.all,'method');
  rejects(()=>give(x,{reference:' '}),'Confira os textos obrigatórios e seus limites.',x.all,'reference');
  rejects(()=>give(x,{reason:' '}),'Confira os textos obrigatórios e seus limites.',x.all,'reason');
  rejects(()=>give(x,{confirm:false}),'Confirme que o dinheiro já foi devolvido fora do sistema e confira o abatimento.',x.all,'confirm');
  give(x);
});
test('D18','Débito zero não permite nova cobrança nem some do financeiro',()=>{
  const x=setup();give(x,{mode:'total',amount:20000});
  rejects(()=>Q.formalize(x.o,day),'Confira os itens e o vencimento da cobrança.',x.all,'formalize');
  rejects(()=>Q.saveDraft(x.o,{items:[{type:'Serviço',name:'Novo',quantity:1,unit:100}],discount:0,terms:{}}),'Edição de itens indisponível neste atendimento.',x.all,'edit');
  ok(F.hasObligation(x.o));eq(F.category(x.o,day),'paid');
  eq(F.aggregate([x.o],day).total,0);eq(F.aggregate([x.o],day).count,0);
  eq(F.warrantyStatus(x.o),'Reembolsado');
});
test('D19','F02: retorno sem solução executada percorre solicitar/retirar/conferir/confirmar',()=>{
  const x=setup();const originBefore=snap(x.o);
  C.request(x.r,'cliente','Desistência do reparo',now,x.all);
  ok(C.pending(x.r));C.withdraw(x.r,'Cliente reavaliou',now);ok(!C.pending(x.r));
  C.request(x.r,'cliente','Desistência confirmada',now,x.all);
  C.confer(x.r,true,'Sem peças pendentes',now,x.all);
  const st=C.confirm(x.r,{key:C.financialKey(x.r),gross:0,discount:0,refund:0,reason:'',confirm:true,financialConfirmed:true},now,day,x.all);
  eq(x.r.status,'Cancelado');ok(!C.pending(x.r));eq(st.type,'confirm');
  eq(snap(x.o),originBefore,'origin untouched');
});
test('D20','F02: solução executada bloqueia cancelamento; correção reabilita',()=>{
  const x=setup();const e=give(x);
  ok(C.blockers(x.r,x.all).some(m=>m.includes('solução de garantia')));
  rejects(()=>C.request(x.r,'cliente','Teste',now,x.all),'Há retorno ou solução de garantia vinculada. Preserve o histórico e concilie a garantia.',x.all,'request blocked');
  correction(x,e.id);ok(!C.blockers(x.r,x.all).length,'correction re-enables');
  C.request(x.r,'cliente','Teste',now,x.all);ok(C.pending(x.r));
});
test('D21','F02: derivado por origem ou anterior, mesmo cancelado, bloqueia o cancelamento',()=>{
  const a=setup();
  const child={...clone(a.r),id:3,origin:a.r.id,warranty:{...clone(a.r.warranty),previous:a.r.id},status:'Aberto'};
  ok(C.blockers(a.r,[...a.all,child]).length>0,'child by origin+previous blocks');
  const canceled={...clone(child),status:'Cancelado'};
  ok(C.blockers(a.r,[...a.all,canceled]).length>0,'canceled child still blocks');
  const originChild={...clone(child),id:4,warranty:{...clone(child.warranty),previous:null}};
  ok(C.blockers(a.o,[a.o,a.r,originChild]).length>0,'origin with child blocks');
  ok(C.blockers(a.o,a.all).length>0,'origin with return blocks even if return canceled');
});
test('D22','F02: devolução executada com pedido pendente impede confirmação; retirada continua possível',()=>{
  const x=setup();C.request(x.r,'cliente','Pedido antes da devolução',now,x.all);
  give(x); // executa devolução com pedido pendente (regra original não bloqueia)
  ok(C.pending(x.r));
  const confirmData={key:C.financialKey(x.r),gross:0,discount:0,refund:0,reason:'',confirm:true,financialConfirmed:true};
  rejects(()=>C.confirm(x.r,confirmData,now,day,x.all),'Há retorno ou solução de garantia vinculada. Preserve o histórico e concilie a garantia.',x.all,'confirm blocked');
  C.withdraw(x.r,'Pedido retirado após devolução',now);ok(!C.pending(x.r));
  eq(x.r.status,'Aberto');
});
test('D23','F02: cancelar retorno não altera a obrigação da raiz',()=>{
  const x=setup();const before=snap(F.summary(x.o));
  C.request(x.r,'cliente','Desistência',now,x.all);C.confer(x.r,true,'',now,x.all);
  C.confirm(x.r,{key:C.financialKey(x.r),gross:0,discount:0,refund:0,reason:'',confirm:true,financialConfirmed:true},now,day,x.all);
  eq(snap(F.summary(x.o)),before,'origin summary unchanged');eq(x.r.total,0);eq(x.r.paid,0);
  summary(x.o,50000,20000,30000);
});
test('D24','Raízes independentes: prazos e vínculo não cruzam entre duas OS da mesma unidade',()=>{
  const a=setup();a.r.status='Finalizado';a.r.conclusion=day;
  const b={...clone(a.o),id:11,total:60000,paid:0,conclusion:'2026-10-01',warrantyDays:180,billing:{due:'2026-12-30',items:[{type:'Serviço',name:'Original B',quantity:1,unit:60000}],discount:0},history:[{time:'2026-10-01',text:'B'}],financeLedger:{opening:0,events:[]}};
  const all=[...a.all,b];
  eq(W.lastFinalized(b,all),null,'root B has no finalized return');
  eq(W.lastFinalized(a.o,all).id,a.r.id,'root A keeps its return');
  const n=W.create(b,all,{defect:'Novo defeito',confirm:true},day);
  eq(n.origin,11,'origin is root B');eq(n.warranty.previous,11,'previous is root B');eq(n.warranty.days,180,'deadline from root B');
  eq(n.warranty.root,11);eq(n.warranty.days,180);eq(n.warranty.client,1);eq(n.unit,7);
});
test('D25','Raiz com retorno finalizado encadeia o anterior da mesma raiz, não da unidade vizinha',()=>{
  const a=setup();a.r.status='Finalizado';a.r.conclusion=day;
  const b={...clone(a.o),id:11,total:1000,paid:0,conclusion:'2026-10-01',warrantyDays:30,billing:{due:day,items:[],discount:0}};
  const n=W.create(a.r,[...a.all,b],{defect:'Segundo reparo',confirm:true},day);
  eq(n.origin,1);eq(n.warranty.previous,a.r.id);
  eq(W.lastFinalized(a.o,[...a.all,b,n]).id,a.r.id,'only finalized return of root A');
  eq(W.lastFinalized(b,[...a.all,b,n]),null,'root B unaffected');
});
test('D26','Retorno ativo único por unidade bloqueia entrada em raiz distinta e reabertura indevida',()=>{
  const x=setup();
  const b={...clone(x.o),id:11,total:1000,paid:0,conclusion:'2026-10-01',warrantyDays:30,billing:{due:day,items:[],discount:0}};
  rejects(()=>W.create(b,[...x.all,b],{defect:'Outro',confirm:true},day),'Já existe retorno em andamento para esta unidade.',[...x.all,b],'active unique');
  x.r.status='Finalizado';x.r.conclusion=day;x.r.aprovado=true;
  const sib={...clone(x.r),id:12,status:'Aberto',warranty:{...clone(x.r.warranty),events:[],operations:[]}};
  rejects(()=>W.transition(x.r,[...x.all,sib],'Em Andamento'),'Esta OS já originou retorno. Preserve o atendimento encerrado e use a nova OS.',[...x.all,sib],'reopen blocked');
});
test('D27','Projeção pública e recibo não vazam comprovante, motivo, retorno ou valores privados',()=>{
  const x=setup();give(x);
  const p=snap(P.projection(x.o));
  ok(!p.includes('COMPROVANTE'),'reference leaked');ok(!p.includes('MOTIVO'),'reason leaked');
  ok(!p.includes('returnId'),'return id leaked');ok(!p.includes('ledgerId'),'ledger id leaked');
  eq(P.projection(x.o).finance.balance,30000);eq(F.receipt(x.o,1).amount,20000);
  eq(P.projection(x.o).finance.paid,15000);
});
test('D28','Cancelamento do acerto recusa obrigação de garantia ativa (settle protegido)',()=>{
  const x=setup();give(x);
  rejects(()=>F.settle(x.o,{gross:0,discount:0,total:0,paid:15000,refund:0,balance:0,result:'sem_pendencias'},null,day),'Há devolução de garantia vinculada a esta OS. Preserve a cobrança de garantia.',x.all,'settle blocked');
});
test('D29','Valores extremos mínimos/máximos em centavos permanecem seguros',()=>{
  const x=setup();const e=give(x,{amount:1});
  eq(e.amount,1);summary(x.o,49999,19999,30000);
  const y=setup({total:999999999,paid:999999999});
  const t=give(y,{mode:'total',amount:999999999});
  eq(t.credit,999999999);summary(y.o,0,0,0);
  const z=setup();
  rejects(()=>give(z,{amount:1000000000}),'Confira modalidade e valor devolvido.',z.all,'above limit');
});
test('D30','Parcial múltipla e correções preservam o ledger append-only e o total original',()=>{
  const x=setup();const p1=give(x,{amount:3000}),p2=give(x,{amount:2000});
  summary(x.o,45000,15000,30000);
  eq(F.warrantyCredits(x.o).count,2);eq(F.warrantyCredits(x.o).amount,5000);
  correction(x,p1.id);summary(x.o,48000,18000,30000);
  correction(x,p2.id);summary(x.o,50000,20000,30000);
  eq(F.events(x.o).filter(e=>e.type==='warranty_refund').length,2,'refund ledger events remain');
  eq(F.events(x.o).filter(e=>e.type==='warranty_refund_correction').length,2,'corrections appended');
  eq(F.summary(x.o).originalTotal,50000);eq(F.summary(x.o).originalPaid,20000);
});
JSON.stringify(out);
`;

const context = { console };
const results = JSON.parse(vm.runInNewContext(src + '\n' + checks, context));
const summary = results.reduce((s, r) => { s[r.status] = (s[r.status] || 0) + 1; return s; }, {});
const assets = {};
for (const f of FILES) assets[f] = crypto.createHash('sha256').update(fs.readFileSync(path.join(ASSETS, f))).digest('hex');
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({
  generatedAt: new Date().toISOString(), codeSha: process.env.CODE_SHA || '', assetsDir: ASSETS,
  assets, total: results.length, summary, results
}, null, 2));
for (const r of results) console.log(`${r.status} ${r.id} — ${r.name}${r.detail ? ' :: ' + r.detail : ''}`);
console.log(`TOTAL ${results.length} · PASS ${summary.PASS || 0} · FAIL ${summary.FAIL || 0} · INFO ${summary.INFO || 0}`);
