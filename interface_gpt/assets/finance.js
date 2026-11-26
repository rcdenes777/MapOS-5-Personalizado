'use strict';
// R05 local ledger: append-only receipts and corrections. No money is transferred.
const BancadaFinance=(()=>{
 const methods=['Pix','Dinheiro','Cartão de Crédito','Cartão de Débito','Transferência'];
 const ensure=(ok,msg)=>{if(!ok)throw Error(msg)};
 const dayValid=d=>{if(typeof d!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(d))return false;const x=new Date(d+'T00:00:00Z');return !Number.isNaN(x.getTime())&&x.toISOString().slice(0,10)===d};
 function init(o){
   if(!o.financeLedger){
     const opening=o.paid||0;
     o.financeLedger={opening,events:[]};
   }
   return o.financeLedger;
 }
 const events=o=>init(o).events;
 // Warranty credits preserve the original charge and receipt ledger. Read-only projection.
 const warrantyCredits=o=>{
   const ev=o.financeLedger?.events||[];
   return ev.filter(e=>e.type==='warranty_refund'&&!ev.some(c=>c.type==='warranty_refund_correction'&&c.reference===e.id)).reduce((s,e)=>({amount:s.amount+e.amount,credit:s.credit+e.credit,count:s.count+1}),{amount:0,credit:0,count:0});
 };
 const hasObligation=o=>!!(o.total||o.billing||o.financeLedger?.warrantyBaseTotal!==undefined);
 const summary=o=>{
   const l=o.financeLedger||{opening:o.paid||0,events:[]},c=warrantyCredits(o);
   const received=l.opening+l.events.reduce((s,e)=>s+(e.type==='receive'?e.amount:['reverse','refund'].includes(e.type)?-e.amount:0),0);
   const originalTotal=l.warrantyBaseTotal??o.total??0,total=originalTotal-c.credit,paid=received-c.amount;
   return {total,paid,balance:total-paid,due:o.billing?.due||'',opening:l.opening,...(l.warrantyBaseTotal!==undefined?{originalTotal,originalPaid:received,warrantyRefund:c.amount,warrantyCredit:c.credit}: {})};
 };
 function sync(o){const s=summary(o);o.paid=s.paid;if(o.financeLedger?.warrantyBaseTotal!==undefined)o.total=s.total}
 function warrantyStatus(o,publicView=false){const c=warrantyCredits(o);return c.credit&&o.total===0?(c.amount?(publicView?'Reembolsada':'Reembolsado'):(publicView?'Encerrada por garantia':'Encerrado por garantia')):null}
 function recordWarrantyRefund(o,data){
   const s=summary(o);ensure(hasObligation(o)&&Number.isSafeInteger(data.amount)&&Number.isSafeInteger(data.credit)&&data.amount>=0&&data.amount<=s.paid&&data.credit>0&&data.credit<=s.total&&data.credit>=data.amount,'Confira o valor e o abatimento da garantia.');
   // Preserve the pre-refund quote projection for old demo orders without billing.
   BancadaQuote.init(o);const l=init(o);l.warrantyBaseTotal??=s.total;
   const e={...data,id:next(o),type:'warranty_refund'};events(o).push(e);sync(o);return e;
 }
 function correctWarrantyRefund(o,id,returnId,data){
   const e=o.financeLedger?.events.find(x=>x.id===id&&x.type==='warranty_refund'&&x.returnId===returnId);
   ensure(e&&!o.financeLedger.events.some(x=>x.type==='warranty_refund_correction'&&x.reference===id),'Devolução inexistente ou já corrigida.');
   const correction={...data,id:next(o),type:'warranty_refund_correction',reference:id,returnId,amount:e.amount,credit:e.credit};events(o).push(correction);sync(o);return correction;
 }
 const reversed=(o,id)=>events(o).find(e=>e.type==='reverse'&&e.reference===id)||null;
 const receipt=(o,id)=>events(o).find(e=>e.type==='receive'&&e.id===id)||null;
 const next=o=>Math.max(0,...events(o).map(e=>e.id))+1;
 const cancellation=o=>o.cancellation?.events?.filter(e=>e.type==='confirm').at(-1)||null;
 const allowsReceive=o=>o.status!=='Cancelado'||cancellation(o)?.settlement.result==='a_receber'||events(o).some(e=>e.type==='reverse'&&e.rectification);
 const allowsReverse=o=>!warrantyCredits(o).amount&&!events(o).some(e=>e.type==='refund')&&(o.status!=='Cancelado'||cancellation(o)?.settlement.result==='a_receber');
 function settle(o,a,refund,day){
   ensure(!warrantyCredits(o).count,'Há devolução de garantia vinculada a esta OS. Preserve a cobrança de garantia.');
   init(o);if(refund)events(o).push({id:next(o),type:'refund',...refund});
   if(o.billing||o.total||a.gross){o.billing={...(o.billing||{due:day,items:[]}),settlement:{gross:a.gross,discount:a.discount}}}
   o.total=a.total;sync(o);
 }
 function receive(o,amount,date,method,registered){
   const s=summary(o);
   ensure(o.total>0&&allowsReceive(o),'Cobrança indisponível. Acerto de cancelamento não autoriza recebimento.');
   ensure(Number.isSafeInteger(amount)&&amount>0&&amount<=s.balance,'Recebimento excede o saldo ou tem valor inválido.');
   ensure(dayValid(date)&&methods.includes(method),'Informe data e forma de pagamento válidas.');
   const e={id:next(o),type:'receive',amount,date,method,registered};events(o).push(e);sync(o);return e;
 }
 function reverse(o,id,date,reason,registered,rectification=null,today=registered.slice(0,10)){
   const original=receipt(o,id);
   ensure(o.total>0&&!events(o).some(e=>e.type==='refund'),'Há devolução registrada ou não há obrigação; confira o histórico.');
   ensure(!warrantyCredits(o).amount&&!(rectification&&warrantyCredits(o).credit),'Há devolução ou abatimento registrado nesta OS. Confira o histórico antes de corrigir o recebimento.');
   if(rectification){const c=cancellation(o);ensure(o.status==='Cancelado'&&c&&o.total===c.settlement.total&&['lancamento_incorreto','nao_compensado'].includes(rectification),'Retificação indisponível.');ensure(date>=c.day&&date<=today,'Data fora do período de retificação.');ensure(!(summary(o).balance>0&&!allowsReceive(o)),'Validação de saldo anterior exige conciliação específica.');}else ensure(allowsReverse(o),'Use retificação financeira autorizada.');
   ensure(original&&!reversed(o,id),'Recebimento inexistente ou já estornado.');
   ensure(typeof reason==='string'&&reason.trim()&&reason.trim().length<=500,'Informe a justificativa da correção (até 500 caracteres).');
   ensure(dayValid(date)&&date>=original.date,'Data da correção anterior ao recebimento ou inválida.');
   ensure(summary(o).paid>=original.amount,'A correção deixaria o recebido negativo.');
   const e={id:next(o),type:'reverse',reference:id,amount:original.amount,date,method:original.method,reason:reason.trim(),registered,...(rectification?{rectification}:{})};events(o).push(e);sync(o);return e;
 }
 function category(o,today){const s=summary(o);if(!hasObligation(o))return 'none';if(!s.balance)return 'paid';if(s.due&&s.due<today)return 'overdue';return 'open'}
 function aggregate(orders,today){const a={total:0,paid:0,balance:0,overdue:0,count:0};for(const o of orders){const s=summary(o);if(!hasObligation(o))continue;a.total+=s.total;a.paid+=s.paid;a.balance+=s.balance;if(s.balance>0)a.count++;if(category(o,today)==='overdue')a.overdue+=s.balance}return a}
 return {methods,init,summary,sync,events,receipt,reversed,receive,reverse,category,aggregate,dayValid,settle,allowsReceive,allowsReverse,cancellation,warrantyCredits,hasObligation,warrantyStatus,recordWarrantyRefund,correctWarrantyRefund};
})();
