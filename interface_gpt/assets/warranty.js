'use strict';
// R07-001: private return history and assessment. Fictional browser-local data.
const BancadaWarranty=(()=>{
 const coverage={avaliacao:'Em avaliação',coberto:'Coberto',nao_coberto:'Não coberto'};
 const solutions={'':'Ainda não definida',reparo_sem_cobranca:'Reparo sem cobrança',novo_orcamento:'Novo orçamento',troca:'Troca',devolucao_valor:'Devolução de dinheiro'};
 const ensure=(ok,msg)=>{if(!ok)throw Error(msg)};
 const clone=x=>JSON.parse(JSON.stringify(x));
 const text=(v,max,required=true)=>{ensure(typeof v==='string'&&!v.includes('\0')&&v.trim().length<=max&&(!required||v.trim()),'Confira os textos obrigatórios e seus limites.');return v.trim()};
 const unit=o=>o.unit||o.origin||o.id;
 const same=(a,b)=>a.client===b.client&&unit(a)===unit(b);
 const swapEvent=o=>o.warranty?.operations?.find(e=>e.type==='troca')||null;
 const physical=o=>swapEvent(o)?.replacement||{unit:unit(o),type:o.type||'',brand:o.brand||'',model:o.model||'',seal:o.seal||'',serial:o.serial||'',imei:o.imei||''};
 const replaced=(id,orders)=>orders.find(o=>swapEvent(o)?.oldUnit===id)||null;
 function lineage(root,id,orders){
   let current=unit(root);const seen=new Set();
   while(current!==id){if(seen.has(current))return false;seen.add(current);
     const owner=orders.find(o=>o.origin===root.id&&swapEvent(o)?.oldUnit===current);
     if(!owner)return false;current=swapEvent(owner).replacement.unit;
   }return true;
 }
 const currentUnit=(o,orders)=>{let p=physical(o);const seen=new Set();while(!seen.has(p.unit)){seen.add(p.unit);const t=orders.find(x=>x.origin===(o.origin||o.id)&&swapEvent(x)?.oldUnit===p.unit);if(!t)break;p=physical(t)}return p};
 const rootId=o=>o.origin||o.id;
 const derived=(o,orders)=>orders.some(x=>x.id!==o.id&&(x.origin===o.id||x.warranty?.previous===o.id));
 const assessment=o=>o.warranty?.events?.filter(e=>e.type==='avaliar').at(-1)||null;
 const events=o=>o.warranty?.events||[];
 const executed=o=>!!o.warranty?.operations?.some(e=>e.type==='troca'||e.type==='reembolso'&&!o.warranty.operations.some(c=>c.type==='corrigir_reembolso'&&c.reference===e.id));
 function reference(o,orders){
   const root=orders.find(x=>x.id===(o.origin||o.id));
   ensure(root&&!root.origin&&root.status==='Finalizado'&&o.status==='Finalizado'&&BancadaFinance.dayValid(root.conclusion)&&BancadaFinance.dayValid(o.conclusion),'A origem precisa de conclusão real conhecida; não use a previsão para inferir cobertura.');
   const p=physical(o);
   ensure(p.brand&&p.model&&root.brand&&root.model&&o.client===root.client&&lineage(root,p.unit,orders),'Identifique a mesma unidade e o cliente na OS de origem antes de registrar retorno.');
   ensure(!replaced(p.unit,orders),'Unidade substituída. Utilize o atendimento da substituta.');
   const days=Number.isInteger(root.warrantyDays)&&root.warrantyDays>=0&&root.warrantyDays<=9999?root.warrantyDays:null;
   let end=null;if(days>0){const d=new Date(root.conclusion+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+days);end=d.toISOString().slice(0,10)}
   return {root:root.id,previous:o.id,unit:p.unit,client:root.client,conclusion:root.conclusion,days,end};
 }
 function active(o,orders){const p=currentUnit(o,orders);return orders.find(x=>x.id!==o.id&&x.origin&&x.client===o.client&&physical(x).unit===p.unit&&!['Finalizado','Cancelado'].includes(x.status))||null}
 // Latest finalized return of the same unit; used to keep 'atendimento anterior' and single active return.
 function lastFinalized(o,orders){return orders.filter(x=>x.origin===rootId(o)&&x.client===o.client&&physical(x).unit===currentUnit(o,orders).unit&&x.status==='Finalizado').sort((a,b)=>b.id-a.id)[0]||null}
 const activeSibling=(o,orders)=>orders.some(x=>x.id!==o.id&&x.origin&&same(x,o)&&!['Finalizado','Cancelado'].includes(x.status));
 function create(o,orders,d,day){
   const ref=reference(o,orders),p=physical(o);ensure(!active(o,orders),'Já existe retorno em andamento para esta unidade.');
   ensure(d.confirm,'Confirme o recebimento físico e a abertura de outra OS.');
   const defect=text(d.defect,10000),items=text(d.items||'',10000,false),condition=text(d.condition||'',10000,false);
   return {id:Math.max(0,...orders.map(x=>x.id))+1,client:ref.client,unit:ref.unit,brand:p.brand,model:p.model,type:p.type,seal:p.seal,serial:p.serial,imei:p.imei,defect,items,condition,entry:day,status:'Aberto',total:0,paid:0,approval:'Sem orçamento',delivery:null,conclusion:null,warrantyDays:0,origin:ref.root,coverage:coverage.avaliacao,warranty:{...ref,events:[],operations:[]},history:[]};
 }
 // Earlier fictitious returns had only origin/coverage. Resolve without inventing a deadline.
 function binding(o,orders){
   if(!o.origin)return null;
   if(o.warranty)return o.warranty;
   const root=orders.find(x=>x.id===o.origin);
   if(!root||root.origin||!same(o,root))return null;
   try{return {...reference(root,orders),events:[],operations:[]}}catch{return null}
 }
 function editable(o,orders){ensure(o.origin&&binding(o,orders)&&o.status!=='Cancelado','Retorno inexistente ou cancelado.')}
 function append(o,orders,type,data,when,actor){
   const w=binding(o,orders);ensure(w,'Vínculo de garantia inválido.');
   const e={id:Math.max(0,...w.events.map(x=>x.id))+1,type,...data,when,actor};
   if(!o.warranty)o.warranty=clone(w);
   o.warranty.operations??=[];o.warranty.events.push(e);return e
 }
 function assess(o,orders,d,when,actor){
   editable(o,orders);ensure(d.confirm,'Confirme a avaliação registrada.');
   ensure(Object.hasOwn(coverage,d.coverage)&&Object.hasOwn(solutions,d.solution),'Confira cobertura e solução.');
   ensure(d.coverage!=='avaliacao'||!d.solution,'Conclua a avaliação de cobertura antes de escolher a solução.');
   const diagnosis=text(d.diagnosis,20000,d.coverage!=='avaliacao'),reason=text(d.reason,10000);
   ensure(Number(d.previous)===(assessment(o)?.id||0),'Outra avaliação foi registrada. Recarregue antes de decidir.');
   ensure(!executed(o),'Solução já executada. Preserve a avaliação; corrija a operação antes de rever a decisão.');
   const e=append(o,orders,'avaliar',{coverage:d.coverage,solution:d.solution,diagnosis,reason},when,actor);o.coverage=coverage[e.coverage];return e
 }
 function cost(o,orders,d,when,actor){
   editable(o,orders);ensure(d.confirm,'Confira e confirme o custo interno.');
   const amount=d.amount,minutes=d.minutes,reason=text(d.reason,10000);
   ensure(Number.isSafeInteger(amount)&&amount>=0&&amount<=999999999&&Number.isSafeInteger(minutes)&&minutes>=0&&minutes<=100000&&(amount||minutes),'Informe custo interno ou tempo de trabalho válido.');
   return append(o,orders,'custo',{amount,minutes,reason},when,actor)
 }
 function correctCost(o,orders,d,when,actor){
   editable(o,orders);ensure(d.confirm,'Confirme a correção do custo.');
   const e=events(o).find(x=>x.id===Number(d.reference)&&x.type==='custo');
   ensure(e&&!events(o).some(x=>x.type==='corrigir_custo'&&x.reference===e.id),'Custo inexistente ou já corrigido.');
   return append(o,orders,'corrigir_custo',{reference:e.id,amount:e.amount,minutes:e.minutes,reason:text(d.reason,10000)},when,actor)
 }
 function costs(o){return events(o).reduce((s,e)=>{const sign=e.type==='custo'?1:e.type==='corrigir_custo'?-1:0;return {amount:s.amount+sign*(e.amount||0),minutes:s.minutes+sign*(e.minutes||0)}},{amount:0,minutes:0})}
 function transition(o,orders,status){
   if(status===o.status)return;
   ensure(o.status!=='Finalizado'||(!derived(o,orders)&&!activeSibling(o,orders)),'Esta OS já originou retorno. Preserve o atendimento encerrado e use a nova OS.');
   if(status==='Finalizado'&&o.origin){const s=assessment(o)?.solution;ensure(!['troca','devolucao_valor'].includes(s)||executed(o),'Execute a solução de garantia escolhida antes de concluir o retorno.')}
 }
 function refundOrigin(o,orders,readOnly=false){
   if(!readOnly)editable(o,orders);else ensure(o.origin&&binding(o,orders),'Retorno inexistente.');
   const w=binding(o,orders),origin=orders.find(x=>x.id===w.root);
   ensure(origin&&origin.id===o.origin&&origin.client===o.client&&BancadaFinance.hasObligation(origin),'A origem não possui cobrança de garantia disponível.');
   return origin;
 }
 function refundKey(origin){
   const s=BancadaFinance.summary(origin);
   return JSON.stringify([s.total,s.paid,s.balance,s.warrantyRefund||0,s.warrantyCredit||0,origin.financeLedger?.events||[]]);
 }
 function refundEligibility(o,orders){
   const origin=refundOrigin(o,orders),a=assessment(o);
   ensure(a?.solution==='devolucao_valor'&&a.coverage!=='avaliacao','A avaliação mudou ou não permite esta solução. Reabra e confira.');
   ensure(!['Cancelado','Finalizado'].includes(o.status),'Execute a solução antes de concluir ou entregar o retorno.');
   ensure(!BancadaFinance.hasObligation(o),'Concilie a cobrança própria deste retorno antes de executar outra solução.');
   ensure(!o.delivery,'Corrija a entrega antes de executar outra solução.');
   ensure(!BancadaQuote.active(o),'Retire a publicação do orçamento antes de executar troca ou devolução.');
   ensure(!o.warranty?.operations?.some(e=>e.type==='troca'),'Retorno já resolvido por troca.');
   return {origin,a};
 }
 const operationId=o=>Math.max(0,...(o.warranty?.operations||[]).map(e=>e.id||0))+1;
 const refundEvents=o=>(o.warranty?.operations||[]).filter(e=>e.type==='reembolso'||e.type==='corrigir_reembolso');
 const refundCorrected=(o,id)=>refundEvents(o).some(e=>e.type==='corrigir_reembolso'&&e.reference===id);
 function refund(o,orders,d,when,day,actor){
   const {origin,a}=refundEligibility(o,orders);
   ensure(Number(d.assessment)===a.id,'A avaliação mudou ou não permite esta solução. Reabra e confira.');
   ensure(d.key===refundKey(origin),'O financeiro mudou. Recarregue e confira novamente o valor.');
   ensure(d.confirm,'Confirme que o dinheiro já foi devolvido fora do sistema e confira o abatimento.');
   ensure(['parcial','total'].includes(d.mode)&&Number.isSafeInteger(d.amount)&&d.amount>=0&&d.amount<=999999999&&(d.amount>0||d.mode==='total'),'Confira modalidade e valor devolvido.');
   ensure(BancadaFinance.dayValid(d.date)&&d.date>= '1900-01-01'&&d.date<=day,'Informe a data real da devolução, sem data futura.');
   ensure(BancadaFinance.methods.includes(d.method),'Forma de devolução inválida.');
   const reference=text(d.reference,300),reason=text(d.reason,2000),s=BancadaFinance.summary(origin);
   ensure(d.amount<=s.paid&&(d.mode!=='total'||d.amount===s.paid),'A devolução deve respeitar o recebido líquido; no encerramento total, devolva exatamente esse valor.');
   ensure(!(origin.financeLedger?.events||[]).some(e=>!e.type.startsWith('warranty_')&&e.date>d.date),'Data anterior aos registros financeiros da origem.');
   const credit=d.mode==='total'?s.total:d.amount;
   ensure(credit>0,'A cobrança já está encerrada.');
   const id=operationId(o),entry=BancadaFinance.recordWarrantyRefund(origin,{amount:d.amount,credit,date:d.date,method:d.method,reference,reason,registered:when,returnId:o.id,operationId:id});
   const e={id,type:'reembolso',assessment:a.id,ledgerId:entry.id,origin:origin.id,mode:d.mode,amount:d.amount,credit,date:d.date,method:d.method,reference,reason,when,actor};
   (o.warranty.operations??=[]).push(e);return e;
 }
 function correctRefund(o,orders,d,when,actor){
   const origin=refundOrigin(o,orders),e=refundEvents(o).find(x=>x.id===Number(d.reference)&&x.type==='reembolso');
   ensure(d.confirm,'Confirme que o dinheiro não foi devolvido e que o registro foi lançado por engano.');
   ensure(e&&!refundCorrected(o,e.id),'Devolução inexistente ou já corrigida.');
   const reason=text(d.reason,2000),id=operationId(o);
   const correction=BancadaFinance.correctWarrantyRefund(origin,e.ledgerId,o.id,{reason,registered:when,date:when.slice(0,10),method:e.method,operationId:id});
   const result={id,type:'corrigir_reembolso',reference:e.id,ledgerId:correction.id,amount:e.amount,credit:e.credit,reason,when,actor};
   (o.warranty.operations??=[]).push(result);return result;
 }
 function swapEligibility(o,orders){
   editable(o,orders);const a=assessment(o);
   ensure(a?.solution==='troca'&&a.coverage!=='avaliacao','A avaliação mudou ou não permite esta solução. Reabra e confira.');
   ensure(!['Cancelado','Finalizado'].includes(o.status),'Execute a solução antes de concluir ou entregar o retorno.');
   ensure(!BancadaFinance.hasObligation(o),'Concilie a cobrança própria deste retorno antes de executar outra solução.');
   ensure(!o.delivery,'Corrija a entrega antes de executar outra solução.');
   ensure(!BancadaQuote.active(o),'Retire a publicação do orçamento antes de executar troca ou devolução.');
   ensure(!replaced(unit(o),orders)&&!executed(o),'Esta unidade ou retorno já tem solução executada.');
   ensure(!orders.some(x=>x.id!==o.id&&unit(x)===unit(o)&&!['Finalizado','Cancelado'].includes(x.status)),'Conclua ou confira outros atendimentos abertos desta unidade antes de trocar.');
   return a;
 }
 const normalizeSeal=v=>String(v||'').replace(/\s+/g,'').toUpperCase();
 const sealInUse=(v,orders)=>{const seal=normalizeSeal(v);return !!seal&&orders.some(x=>normalizeSeal(x.seal)===seal||normalizeSeal(swapEvent(x)?.replacement.seal)===seal)};
 function swap(o,orders,stock,d,when,actor){
   const a=swapEligibility(o,orders);
   ensure(Number(d.assessment)===a.id,'A avaliação mudou ou não permite esta solução. Reabra e confira.');
   ensure(d.confirm,'Confirme a substituição física e o destino da unidade antiga.');
   ensure(['estoque','externa'].includes(d.source)&&['retida_assistencia','devolvida_cliente'].includes(d.destination),'Informe origem da substituta e destino da antiga.');
   const replacement={type:text(d.type,100),brand:text(d.brand,100),model:text(d.model,100),seal:text(d.seal||'',100,false),serial:text(d.serial||'',100,false),imei:text(d.imei||'',100,false)};
   const reason=text(d.reason,2000);
   ensure(replacement.seal||replacement.serial||replacement.imei,'Identifique a nova unidade por selo, série ou IMEI.');
   ensure(!sealInUse(replacement.seal,orders),'Selo já cadastrado. Identifique outra unidade física.');
   const used=orders.flatMap(x=>[x.id,unit(x),swapEvent(x)?.replacement.unit||0]);
   replacement.unit=Math.max(0,...used)+1;
   let product=null,cost=null;
   if(d.source==='estoque'){
     product=stock.find(x=>x.sku===d.sku);
     ensure(product&&Number.isSafeInteger(product.quantity)&&product.quantity>0,'Produto inexistente ou sem estoque disponível.');
     cost=Number.isSafeInteger(product.cost)&&product.cost>=0?product.cost:null;
   }else if(d.cost!==null&&d.cost!==undefined&&d.cost!==''){
     ensure(Number.isSafeInteger(d.cost)&&d.cost>=0&&d.cost<=999999999,'Informe um custo externo válido.');cost=d.cost;
   }
   const e={id:operationId(o),type:'troca',assessment:a.id,origin:o.origin,oldUnit:unit(o),replacement,source:d.source,destination:d.destination,sku:product?.sku||null,cost,reason,when,actor};
   // Only a fictional stock debit for the explicit replacement; no native inventory access.
   if(product){product.quantity--; (product.movements??=[]).push({type:'troca_saida',quantity:1,returnId:o.id,operationId:e.id,cost,when,reason})}
   (o.warranty.operations??=[]).push(e);return e;
 }
 function days(v){ensure(/^\d{1,4}$/.test(String(v))&&Number(v)<=9999,'Confira o prazo concedido na OS.');return Number(v)}
 return {coverage,solutions,unit,same,derived,reference,active,lastFinalized,create,binding,assessment,events,executed,assess,cost,correctCost,costs,transition,days,refundOrigin,refundEligibility,refundKey,refundEvents,refundCorrected,refund,correctRefund,swapEvent,physical,replaced,lineage,currentUnit,swapEligibility,swap,sealInUse};
})();
