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
 const derived=(o,orders)=>orders.some(x=>x.id!==o.id&&(x.origin===o.id||x.warranty?.previous===o.id));
 const assessment=o=>o.warranty?.events?.filter(e=>e.type==='avaliar').at(-1)||null;
 const events=o=>o.warranty?.events||[];
 const executed=o=>!!o.warranty?.operations?.some(e=>e.type==='troca'||e.type==='reembolso'&&!o.warranty.operations.some(c=>c.type==='corrigir_reembolso'&&c.reference===e.id));
 function reference(o,orders){
   const root=orders.find(x=>x.id===(o.origin||o.id));
   ensure(root&&!root.origin&&root.status==='Finalizado'&&o.status==='Finalizado'&&BancadaFinance.dayValid(root.conclusion)&&BancadaFinance.dayValid(o.conclusion),'A origem precisa de conclusão real conhecida; não use a previsão para inferir cobertura.');
   ensure(o.brand&&o.model&&root.brand&&root.model&&same(o,root),'Identifique a mesma unidade e o cliente na OS de origem antes de registrar retorno.');
   const days=Number.isInteger(root.warrantyDays)&&root.warrantyDays>=0&&root.warrantyDays<=9999?root.warrantyDays:null;
   let end=null;if(days>0){const d=new Date(root.conclusion+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+days);end=d.toISOString().slice(0,10)}
   return {root:root.id,previous:o.id,unit:unit(o),client:root.client,conclusion:root.conclusion,days,end};
 }
 function active(o,orders){return orders.find(x=>x.origin&&same(x,o)&&!['Finalizado','Cancelado'].includes(x.status))||null}
 // Latest finalized return of the same unit; used to keep 'atendimento anterior' and single active return.
 function lastFinalized(o,orders){return orders.filter(x=>x.id!==o.id&&x.origin&&same(x,o)&&x.status==='Finalizado').sort((a,b)=>b.id-a.id)[0]||null}
 const activeSibling=(o,orders)=>orders.some(x=>x.id!==o.id&&x.origin&&same(x,o)&&!['Finalizado','Cancelado'].includes(x.status));
 function create(o,orders,d,day){
   const ref=reference(o,orders);ensure(!active(o,orders),'Já existe retorno em andamento para esta unidade.');
   ensure(d.confirm,'Confirme o recebimento físico e a abertura de outra OS.');
   const defect=text(d.defect,10000),items=text(d.items||'',10000,false),condition=text(d.condition||'',10000,false);
   return {id:Math.max(0,...orders.map(x=>x.id))+1,client:ref.client,unit:ref.unit,brand:o.brand,model:o.model,type:o.type||'',seal:o.seal||'',serial:o.serial||'',imei:o.imei||'',defect,items,condition,entry:day,status:'Aberto',total:0,paid:0,approval:'Sem orçamento',delivery:null,conclusion:null,warrantyDays:0,origin:ref.root,coverage:coverage.avaliacao,warranty:{...ref,events:[],operations:[]},history:[]};
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
   o.warranty.events.push(e);return e
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
 function days(v){ensure(/^\d{1,4}$/.test(String(v))&&Number(v)<=9999,'Confira o prazo concedido na OS.');return Number(v)}
 return {coverage,solutions,unit,same,derived,reference,active,lastFinalized,create,binding,assessment,events,executed,assess,cost,correctCost,costs,transition,days};
})();
