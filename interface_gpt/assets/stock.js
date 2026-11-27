'use strict';
// Fictional inventory. SKU is stable, and OS ledger proof is scoped to OS + line + SKU.
// Local synchronous operations are not database transactions or authentication.
const BancadaStock=(()=>{
 const ensure=(ok,msg)=>{if(!ok)throw Error(msg)};
 const copy=x=>JSON.parse(JSON.stringify(x));
 const amount=(n,max=1000000,min=1)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
 const costValid=n=>n===null||amount(n,9999999999,0);
 const text=(v,max)=>{const s=String(v??'').trim();ensure(s&&s.length<=max,'Informe descrição ou motivo válido.');return s};
 const events=p=>p.movements||[];
 const find=(stock,sku)=>{const matches=stock.filter(p=>p.sku===sku);ensure(matches.length===1,'Produto inexistente ou duplicado.');const p=matches[0];ensure(amount(p.quantity,2147483647,0)&&Array.isArray(events(p)),'Saldo ou histórico inválido.');return p};
 const key=p=>JSON.stringify([p.sku,p.quantity,p.cost??null,events(p).length]);
 const catalogKey=stock=>JSON.stringify(stock.map(key));
 const orderKey=(o,stock)=>{const q=BancadaQuote.init(copy(o));return JSON.stringify([o.id,o.status,!!o.delivery,o.total,!!o.billing,q.nextLineId,q.draft,catalogKey(stock)])};
 const event=(p,type,quantity,after,cost,reason,when,actor,link={})=>{ensure(amount(after,2147483647,0),'Saldo insuficiente ou fora do limite permitido.');return {id:events(p).length+1,sku:p.sku,type,quantity,before:p.quantity,after,cost,reason,when,actor,...link}};
 function commit(plan){if(!plan?.event)return;const {product:p,event:e}=plan;p.quantity=e.after;if(e.type==='entrada')p.cost=e.cost;(p.movements??=[]).push(e)}
 function create(stock,name,min,expected){ensure(expected===catalogKey(stock),'O catálogo mudou. Reabra o cadastro.');name=text(name,150);ensure(amount(min,1000000,0),'Estoque mínimo inválido.');let n=Math.max(0,...stock.map(p=>/^P-\d+$/.test(p.sku)?Number(p.sku.slice(2)):0))+1;ensure(amount(n,2147483647),'Identificador de produto fora do limite.');const p={sku:'P-'+String(n).padStart(3,'0'),name,quantity:0,min,cost:null,movements:[]};stock.push(p);return p}
 function move(stock,sku,d,when,actor){const p=find(stock,sku);ensure(d.expected===key(p),'O saldo mudou. Reabra a movimentação.');ensure(['entrada','saida','contagem'].includes(d.type)&&amount(d.quantity,1000000,d.type==='contagem'?0:1),'Confira tipo e quantidade da movimentação.');ensure(costValid(d.cost)&& (d.type==='entrada'?d.cost!==null:d.cost===null),'Informe custo unitário válido somente para entrada.');const reason=text(d.reason,2000);const after=d.type==='contagem'?d.quantity:p.quantity+(d.type==='entrada'?d.quantity:-d.quantity);const e=event(p,d.type,after-p.quantity,after,d.cost,reason,when,actor);commit({product:p,event:e});return e}
 function balance(p,os,line){let n=0;for(const e of events(p)){if(!['os_saida','os_devolucao','os_consumo','os_conciliacao'].includes(e.type)||e.osId!==os||e.lineId!==line||e.sku!==p.sku)continue;ensure(Number.isSafeInteger(e.quantity)&& (e.type==='os_saida'?e.quantity<0:e.quantity>0),'Histórico de baixa inválido.');n-=e.quantity;ensure(Number.isSafeInteger(n)&&n>=0,'Histórico de baixa inválido.')}return n}
 function reconcile(stock,o,i,quantity,disposition,when,actor){
   if(!i.stockSku)return {returned:0,note:disposition==='unused'?'Baixa não comprovada; sem entrada no estoque.':disposition==='lost'?'Consumo/perda registrado; não retorna ao estoque.':''};
   ensure(i.type==='Peça'&&amount(quantity,i.quantity)&&['unused','lost'].includes(disposition),'Vínculo de peça inválido.');
   const p=find(stock,i.stockSku),outstanding=balance(p,o.id,i.lineId);
   ensure(outstanding<=i.quantity,'Histórico de baixa incompatível com a linha.');
   const returned=disposition==='unused'&&outstanding>=i.quantity?quantity:0;
   const processed=Math.min(quantity,outstanding),type=disposition==='lost'?'os_consumo':returned?'os_devolucao':'os_conciliacao';
   const note=disposition==='lost'?'Consumo/perda registrado; não retorna ao estoque.':returned?'Baixa comprovada; '+returned+' un. devolvida(s) ao estoque.':'Baixa não comprovada para toda a linha; sem entrada no estoque.';
   return {product:p,returned,note,event:processed?event(p,type,processed,p.quantity+returned,null,note,when,actor,{osId:o.id,lineId:i.lineId}):null};
 }
 const editable=o=>Number.isSafeInteger(o.id)&&o.id>0&&BancadaQuote.editable(o)&&!o.conclusion&&!['Finalizado','Faturado'].includes(o.status)&&o.cancellation?.events?.filter(e=>['request','withdraw','confirm'].includes(e.type)).at(-1)?.type!=='request';
 function link(stock,o,d,when,actor){
   ensure(editable(o),'Inclusão de peça indisponível neste atendimento.');
   ensure(d.expected===orderKey(o,stock),'A OS ou estoque mudou. Reabra a operação.');
   const p=find(stock,d.sku);ensure(amount(d.quantity,10000)&&amount(d.unit,999999999,0),'Quantidade ou valor inválido.');ensure(p.quantity>=d.quantity,'Saldo insuficiente ou fora do limite permitido.');
   const draft=copy(o),q=BancadaQuote.init(draft),c=p.cost??null;ensure(costValid(c),'Custo de referência inválido.');ensure(amount(q.nextLineId,Number.MAX_SAFE_INTEGER-1),'Identificador de linha fora do limite.');
   const i={type:'Peça',name:p.name,quantity:d.quantity,unit:d.unit,lineId:q.nextLineId++,stockSku:p.sku,stockCost:c};
   q.draft.items.push(i);q.draft.discount=0;BancadaQuote.totals(q.draft.items,0);
   const e=event(p,'os_saida',-i.quantity,p.quantity-i.quantity,c,'Inclusão de peça na OS',when,actor,{osId:o.id,lineId:i.lineId});
   BancadaQuote.sync(draft);Object.assign(o,draft);commit({product:p,event:e});return i;
 }
 function unlink(stock,o,lineId,expected,when,actor){
   ensure(editable(o),'Retirada de peça indisponível neste atendimento.');
   ensure(expected===orderKey(o,stock),'A OS ou estoque mudou. Reabra a operação.');
   const draft=copy(o),q=BancadaQuote.init(draft),i=q.draft.items.find(x=>x.lineId===lineId&&x.stockSku);ensure(i,'Peça vinculada não encontrada.');
   const plan=reconcile(stock,draft,i,i.quantity,'unused',when,actor);q.draft.items=q.draft.items.filter(x=>x.lineId!==lineId);q.draft.discount=0;BancadaQuote.sync(draft);Object.assign(o,draft);commit(plan);return plan;
 }
 return {find,key,catalogKey,orderKey,create,move,balance,reconcile,commit,editable,link,unlink};
})();
