// Run: node tests/line-identity.cjs
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=['quote.js','finance.js','cancel.js','portal.js','warranty.js'].map(f=>fs.readFileSync(path.join(__dirname,'../assets',f),'utf8')).join('\n');
const checks=`
const Q=BancadaQuote,C=BancadaCancel,P=BancadaPortal,W=BancadaWarranty,day='2026-11-26',now=day+'T12:00:00Z',json=JSON.stringify;
let count=0;const ok=(v,m)=>{if(!v)throw Error(m||'Assertion failed')},eq=(a,b)=>ok(a===b,a+' != '+b),test=(n,fn)=>{try{fn();count++}catch(e){throw Error(n+': '+e.message)}};
function reject(fn,msg,o){const before=json(o);let err;try{fn()}catch(e){err=e}eq(err?.message,msg);eq(json(o),before)}
const piece=(name='IGBT')=>({type:'Peça',name,quantity:3,unit:1000}),service=()=>({type:'Serviço',name:'Diagnóstico',quantity:1,unit:2000});
const draft=items=>({items,discount:0,terms:{}});
function make(id=1){const o={id,client:1,brand:'LG',model:'Placa',status:'Aberto',entry:day,total:0,paid:0,history:[]};Q.saveDraft(o,draft([piece(),piece(),service()]));return o}
const rows=o=>C.lines(o),request=o=>C.request(o,'cliente','Solicitação',now);
const remove=(o,i,qty=1,key=C.itemKey(o,i))=>C.remove(o,i.lineId,qty,i.type==='Peça'?'unused':'notdone','',now,[],key);
test('distinct IDs for identical lines',()=>{const o=make();eq(new Set(rows(o).map(i=>i.lineId)).size,3)});
test('preserve IDs on edits and reorder; stale quote changes',()=>{const o=make(),[a,b,c]=rows(o),v=Q.publish(o,now);Q.saveDraft(o,draft([b,{...a,quantity:2},c]));eq(rows(o)[0].lineId,b.lineId);eq(rows(o)[1].lineId,a.lineId);eq(Q.vigente(o),null);eq(v.items[0].quantity,3)});
test('new line never reuses removed ID',()=>{const o=make(),[a,b,c]=rows(o);Q.saveDraft(o,draft([b,c]));Q.saveDraft(o,draft([...rows(o),piece()]));ok(rows(o).at(-1).lineId>a.lineId);ok(!rows(o).some(i=>i.lineId===a.lineId))});
test('changing type creates new ID',()=>{const o=make(),[a,b,c]=rows(o);Q.saveDraft(o,draft([{...a,type:'Serviço'},b,c]));ok(rows(o)[0].lineId!==a.lineId)});
test('forged or duplicate IDs rejected without mutation',()=>{const o=make(),[a,b]=rows(o);for(const items of [[a,a],[{...b,lineId:999}]])reject(()=>Q.saveDraft(o,draft(items)),'O item mudou ou não pertence a esta OS. Reabra o orçamento.',o)});
test('new version compares identity even with identical public values',()=>{const o=make(),v=Q.publish(o,now),old=json(v);Q.saveDraft(o,draft(rows(o).map(({lineId,...i})=>i)));eq(Q.vigente(o),null);eq(json(v),old)});
test('legacy draft migration preserves snapshot and invoice',()=>{const i=piece(),o={id:1,status:'Aberto',entry:day,total:0,paid:0,quote:{draft:draft([i]),versions:[{number:1,...draft([{...i}]),total:3000}],current:1,active:true},billing:{items:[{...i}]}};const old=json([o.quote.versions,o.billing]);const first=Q.init(o).draft.items[0].lineId;eq(Q.init(o).draft.items[0].lineId,first);eq(Q.vigente(o).number,1);eq(json([o.quote.versions,o.billing]),old)});
test('removing a first row never redirects stale selection to second identical row',()=>{const o=make();request(o);const [a,b,c]=rows(o),ka=C.itemKey(o,a);remove(o,a,3,ka);reject(()=>remove(o,a,1,ka),'Item não encontrado.',o);eq(rows(o)[0].lineId,b.lineId);eq(rows(o)[0].quantity,3);eq(rows(o)[1].lineId,c.lineId)});
test('unrelated reorder preserves exact selected ID',()=>{const o=make();request(o);const [a,b,c]=rows(o),key=C.itemKey(o,b);Q.saveDraft(o,draft([c,b,a]));const e=remove(o,b,1,key);eq(e.item.lineId,b.lineId);eq(rows(o).find(i=>i.lineId===b.lineId).quantity,2);eq(rows(o).find(i=>i.lineId===a.lineId).quantity,3)});
test('partial quantity stale key blocks replay',()=>{const o=make();request(o);const a=rows(o)[0],key=C.itemKey(o,a);remove(o,a,1,key);reject(()=>remove(o,a,1,key),'O item ou pedido mudou. Reabra a conferência.',o);remove(o,a,1);eq(rows(o)[0].lineId,a.lineId);eq(rows(o)[0].quantity,1)});
test('changing request blocks stale modal',()=>{const o=make();request(o);const a=rows(o)[0],key=C.itemKey(o,a);C.withdraw(o,'Retirado',now);request(o);reject(()=>remove(o,a,1,key),'O item ou pedido mudou. Reabra a conferência.',o);remove(o,a)});
test('different OS key cannot operate same local ID',()=>{const a=make(1),b=make(2);request(a);request(b);reject(()=>remove(b,rows(b)[0],1,C.itemKey(a,rows(a)[0])),'O item ou pedido mudou. Reabra a conferência.',b);remove(b,rows(b)[0])});
test('technical conference invalidates on identical replacement',()=>{const o=make();Q.saveDraft(o,draft([service()]));request(o);C.confer(o,true,'',now);ok(C.technical(o));Q.saveDraft(o,draft([service()]));ok(!C.technical(o))});
test('IDs persist across serialization and not exposed to client',()=>{const o=make();Q.publish(o,now);const x=JSON.parse(json(o));eq(json(rows(x)),json(rows(o)));ok(!json(P.projection(x)).includes('lineId'));const old=x.quote.nextLineId;Q.saveDraft(x,draft([piece()]));eq(rows(x)[0].lineId,old)});
test('normalized unique seal includes old and substitute, blank allowed',()=>{const orders=[{id:1,seal:' A 1 ',warranty:{operations:[{type:'troca',replacement:{seal:'B 2'}}]}}];ok(W.sealInUse('a1',orders));ok(W.sealInUse(' b2 ',orders));ok(!W.sealInUse('',orders));ok(!W.sealInUse('C3',orders))});
count;
`;
console.log(vm.runInNewContext(src+'\n'+checks,{})+' stable line identity domain checks passed.');
