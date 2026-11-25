'use strict';
// R06: local cancellation workflow; current quote lines stand in for linked service/part lines.
// No inventory balance movement without proven native stock debit (R08).
const BancadaCancel=(()=>{
 const ensure=(ok,msg)=>{if(!ok)throw Error(msg)};
 const copy=x=>JSON.parse(JSON.stringify(x));
 const text=(v,max,required=true)=>{const s=String(v??'').trim();ensure((!required||s)&&s.length<=max,'Confira o motivo ou as observações.');return s};
 const init=o=>o.cancellation||(o.cancellation={events:[]});
 const events=o=>init(o).events;
 const state=o=>events(o).filter(e=>['request','withdraw','confirm'].includes(e.type)).at(-1)||null;
 const pending=o=>state(o)?.type==='request';
 const lines=o=>BancadaQuote.init(o).draft.items;
 const blockers=(o,orders=[])=>[...(['Cancelado','Finalizado','Faturado'].includes(o.status)||o.conclusion?['Atendimento concluído, cancelado ou faturado legado. Concilie antes.']:[]),...(o.delivery?['Há entrega física registrada.']:[]),...(o.origin||orders.some(x=>x.origin===o.id)?['Há vínculo de garantia; conciliação de garantia será tratada na R07.']:[])];
 const guard=(o,orders)=>ensure(!blockers(o,orders).length,blockers(o,orders).join(' '));
 const requestId=o=>{const p=state(o);ensure(p?.type==='request','Não há pedido pendente.');return p.id};
 const add=(o,type,data,when)=>{const e={id:events(o).length+1,type,when,...copy(data)};events(o).push(e);return e};
 const technicalKey=o=>JSON.stringify([o.status,lines(o).map(i=>[i.type,i.name,i.quantity,i.unit])]);
 const financialKey=o=>JSON.stringify([technicalKey(o),BancadaQuote.init(o).draft.discount,o.total,o.paid,o.billing?.due||'',BancadaFinance.events(o),!!o.delivery,o.conclusion||null]);
 const technical=o=>pending(o)&&!lines(o).some(i=>i.type==='Peça')&&events(o).filter(e=>e.type==='technical'&&e.request===state(o).id).at(-1)?.key===technicalKey(o);
 function request(o,origin,reason,when,orders=[]){
   guard(o,orders);ensure(!pending(o),'Já existe pedido pendente.');ensure(['cliente','assistencia'].includes(origin),'Selecione quem solicitou.');
   return add(o,'request',{origin,reason:text(reason,2000),status:o.status},when)
 }
 function withdraw(o,reason,when){return add(o,'withdraw',{request:requestId(o),reason:text(reason,2000)},when)}
 function remove(o,index,quantity,disposition,reason,when,orders=[]){
   guard(o,orders);const request=requestId(o),q=BancadaQuote.init(o),item=q.draft.items[index];
   ensure(Number.isInteger(index)&&item,'Item não encontrado.');
   ensure(Number.isInteger(quantity)&&quantity>0&&quantity<=item.quantity,'Quantidade inválida.');
   ensure(item.type==='Peça'?['unused','lost'].includes(disposition):disposition==='notdone'&&quantity===item.quantity,'Destino inválido para este item.');
   const why=disposition==='lost'?text(reason,2000):'';
   const old=copy(item);old.quantity=quantity;
   if(quantity===item.quantity)q.draft.items.splice(index,1);else item.quantity-=quantity;
   // Original clears OS discount when there is no formalized obligation; with obligation preserve it separately.
   q.draft.discount=o.total?Math.min(q.draft.discount,q.draft.items.reduce((s,i)=>s+i.quantity*i.unit,0)):0;
   BancadaQuote.sync(o);
   return add(o,'item',{request,item:old,disposition,reason:why,stockReturned:0,stockNote:disposition==='unused'?'Baixa não comprovada; sem entrada no estoque.':disposition==='lost'?'Consumo/perda registrado; não retorna ao estoque.':''},when);
 }
 function confer(o,confirmed,notes,when,orders=[]){
   guard(o,orders);const request=requestId(o);ensure(!lines(o).some(i=>i.type==='Peça'),'Concilie todas as peças antes.');
   ensure(confirmed,'Confirme os serviços executados e a conferência das peças.');
   return add(o,'technical',{request,key:technicalKey(o),reason:text(notes,2000,false)},when)
 }
 function calculate(o,gross,discount){
   ensure(Number.isSafeInteger(gross)&&gross>=0&&gross<=999999999&&Number.isSafeInteger(discount)&&discount>=0&&discount<=gross,'Valor devido ou desconto inválido.');
   const paid=BancadaFinance.summary(o).paid,total=gross-discount,refund=Math.max(0,paid-total),balance=Math.max(0,total-paid);
   return {gross,discount,total,paid,refund,balance,result:refund?'a_devolver':balance?'a_receber':'sem_pendencias'}
 }
 function confirm(o,d,when,day,orders=[]){
   guard(o,orders);const request=requestId(o);ensure(technical(o),'Conferência técnica pendente ou desatualizada.');
   ensure(d.key===financialKey(o),'A OS mudou. Reabra o acerto.');
   ensure(d.confirm&&d.financialConfirmed,'Confirme a conferência financeira e o cancelamento.');
   const a=calculate(o,d.gross,d.discount),requires=!!(o.billing||o.total||a.gross||a.discount);
   const reason=text(d.reason,2000,requires);
   ensure(!requires||d.settlementConfirmed,'Confirme os valores do acerto.');
   ensure(d.refund===a.refund,'O valor devolvido deve ser exatamente o valor calculado.');
   let refund=null;
   if(a.refund){
     const ref=text(d.ref,300);ensure(BancadaFinance.dayValid(d.date)&&BancadaFinance.methods.includes(d.method),'Informe data e forma da devolução.');
     ensure(!BancadaFinance.events(o).some(e=>e.date>d.date),'Data anterior aos registros financeiros.');
     refund={amount:a.refund,date:d.date,method:d.method,reference:ref,registered:when};
   }
   const before=copy({total:o.total,paid:o.paid,billing:o.billing||null});
   BancadaFinance.settle(o,a,refund,day);
   const e=add(o,'confirm',{request,reason,settlement:a,before,refund,day},when);
   o.status='Cancelado';o.cancelRequested=false;return e;
 }
 return {events,state,pending,lines,blockers,technical,financialKey,request,withdraw,remove,confer,calculate,confirm};
})();
