// Run: node tests/stock.cjs (no dependencies)
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=['quote.js','stock.js','finance.js','cancel.js','warranty.js','portal.js'].map(f=>fs.readFileSync(path.join(__dirname,'../assets',f),'utf8')).join('\n');
const checks=`
let count=0;const eq=(a,b)=>{if(a!==b)throw Error(a+' != '+b)},ok=v=>{if(!v)throw Error('Assertion failed')},snap=x=>JSON.stringify(x),test=(n,f)=>{try{f();count++}catch(e){throw Error(n+': '+e.message)}};
const S=BancadaStock,Q=BancadaQuote,C=BancadaCancel,now='2026-11-26T12:00:00Z',actor='Administrador';
const setup=()=>({o:{id:1,status:'Aberto',entry:'2026-11-25',total:0,paid:0,history:[]},stock:[{sku:'P-001',name:'IGBT',quantity:8,min:2,cost:450}],});
const link=(x,q=3)=>S.link(x.stock,x.o,{expected:S.orderKey(x.o,x.stock),sku:'P-001',quantity:q,unit:1000},now,actor);
const move=(x,type,quantity,cost,expected=S.key(x.stock[0]))=>S.move(x.stock,'P-001',{type,quantity,cost,expected,reason:'Teste'},now,actor);
const request=x=>C.request(x.o,'cliente','Pedido',now);
const remove=(x,i,q,d,reason='')=>C.remove(x.o,i.lineId,q,d,reason,now,[],C.itemKey(x.o,i),x.stock,actor);
function reject(f,msg,x){const before=snap(x);let e;try{f()}catch(err){e=err}eq(e?.message,msg);eq(snap(x),before)}
test('entry changes reference cost not sale; movement balance',()=>{const x=setup(),e=move(x,'entrada',2,0);eq(e.before,8);eq(e.after,10);eq(x.stock[0].cost,0);eq(e.quantity,2)});
test('entry requires cost',()=>{const x=setup();reject(()=>move(x,'entrada',2,null),'Informe custo unitário válido somente para entrada.',x)});
test('exit insufficient atomic',()=>{const x=setup();reject(()=>move(x,'saida',9,null),'Saldo insuficiente ou fora do limite permitido.',x)});
test('count stale and replay',()=>{const x=setup(),k=S.key(x.stock[0]);move(x,'contagem',0,null,k);reject(()=>move(x,'contagem',4,null,k),'O saldo mudou. Reabra a movimentação.',x);eq(x.stock[0].quantity,0)});
test('catalog new SKU zero balance and stale replay',()=>{const x=setup(),k=S.catalogKey(x.stock),p=S.create(x.stock,'PC817',2,k);eq(p.sku,'P-002');eq(p.quantity,0);eq(p.cost,null);reject(()=>S.create(x.stock,'Outro',0,k),'O catálogo mudou. Reabra o cadastro.',x)});
test('link debit and immutable cost',()=>{const x=setup(),i=link(x);eq(x.stock[0].quantity,5);eq(S.balance(x.stock[0],1,i.lineId),3);eq(i.stockCost,450);move(x,'entrada',2,700);eq(Q.init(x.o).draft.items[0].stockCost,450);eq(x.o.total,0)});
test('link stale replay',()=>{const x=setup(),d={expected:S.orderKey(x.o,x.stock),sku:'P-001',quantity:3,unit:1000};S.link(x.stock,x.o,d,now,actor);reject(()=>S.link(x.stock,x.o,d,now,actor),'A OS ou estoque mudou. Reabra a operação.',x)});
test('link insufficient leaves state',()=>{const x=setup();reject(()=>link(x,9),'Saldo insuficiente ou fora do limite permitido.',x)});
test('editor cannot remove or change linked qty',()=>{const x=setup(),i=link(x);reject(()=>Q.saveDraft(x.o,{items:[],discount:0,terms:{}}),'Retire a peça vinculada pela operação de estoque.',x);const d={type:i.type,name:i.name,quantity:2,unit:i.unit,lineId:i.lineId};reject(()=>Q.saveDraft(x.o,{items:[d],discount:0,terms:{}}),'Retire a peça vinculada pela operação de estoque.',x)});
test('editor price only retains stock identity and no debit',()=>{const x=setup(),i=link(x),before=snap(x.stock);Q.saveDraft(x.o,{items:[{type:i.type,name:i.name,quantity:i.quantity,unit:2000,lineId:i.lineId}],discount:0,terms:{}});eq(Q.init(x.o).draft.items[0].stockSku,'P-001');eq(Q.init(x.o).draft.items[0].stockCost,450);eq(snap(x.stock),before)});
test('forged link rejected',()=>{const x=setup();Q.init(x.o);reject(()=>Q.saveDraft(x.o,{items:[{type:'Peça',name:'IGBT',quantity:1,unit:1,stockSku:'P-001'}],discount:0,terms:{}}),'Vincule peças pelo estoque.',x)});
test('ordinary removal restores proven balance and id never reused',()=>{const x=setup(),i=link(x),k=S.orderKey(x.o,x.stock);const p=S.unlink(x.stock,x.o,i.lineId,k,now,actor);eq(p.returned,3);eq(x.stock[0].quantity,8);eq(S.balance(x.stock[0],1,i.lineId),0);reject(()=>S.unlink(x.stock,x.o,i.lineId,k,now,actor),'A OS ou estoque mudou. Reabra a operação.',x);ok(link(x).lineId>i.lineId)});
test('partial unused returns only proven quantity',()=>{const x=setup(),i=link(x);request(x);const e=remove(x,i,1,'unused');eq(e.stockReturned,1);eq(x.stock[0].quantity,6);eq(C.lines(x.o)[0].lineId,i.lineId);eq(S.balance(x.stock[0],1,i.lineId),2);eq(remove(x,C.lines(x.o)[0],2,'unused').stockReturned,2);eq(x.stock[0].quantity,8)});
test('consumption never increases stock and retains cost',()=>{const x=setup(),i=link(x);request(x);const e=remove(x,i,2,'lost','IGBT queimou');eq(e.item.stockCost,450);eq(e.stockReturned,0);eq(x.stock[0].quantity,5);eq(x.stock[0].movements.at(-1).type,'os_consumo');eq(S.balance(x.stock[0],1,i.lineId),1)});
test('partial proof reconciles without return',()=>{const x=setup(),i=link(x);x.stock[0].movements[0].quantity=-1;request(x);const e=remove(x,i,2,'unused');eq(e.stockReturned,0);eq(x.stock[0].quantity,5);eq(x.stock[0].movements.at(-1).type,'os_conciliacao');eq(x.stock[0].movements.at(-1).quantity,1);eq(S.balance(x.stock[0],1,i.lineId),0)});
test('foreign OS and warranty movement not proof',()=>{const x=setup(),i=link(x);x.stock[0].movements[0].osId=99;x.stock[0].movements.push({type:'troca_saida',quantity:3,osId:1,lineId:i.lineId,sku:'P-001'});request(x);const n=x.stock[0].movements.length;eq(remove(x,i,3,'unused').stockReturned,0);eq(x.stock[0].movements.length,n);eq(x.stock[0].quantity,5)});
test('stale cancel key cannot replay partial return',()=>{const x=setup(),i=link(x);request(x);const k=C.itemKey(x.o,i);remove(x,i,1,'unused');reject(()=>C.remove(x.o,i.lineId,1,'unused','',now,[],k,x.stock,actor),'O item ou pedido mudou. Reabra a conferência.',x)});
test('manual rows do not debit stock',()=>{const x=setup();Q.saveDraft(x.o,{items:[{type:'Peça',name:'IGBT',quantity:1,unit:100}],discount:0,terms:{}});request(x);const before=snap(x.stock);eq(remove(x,C.lines(x.o)[0],1,'unused').stockReturned,0);eq(snap(x.stock),before)});
test('public snapshot allowlist excludes stock identity/cost',()=>{const x=setup();link(x);const v=Q.publish(x.o,now);eq(v.items[0].stockCost,450);const p=BancadaPortal.projection(x.o);ok(!snap(p).includes('stockSku'));ok(!snap(p).includes('stockCost'));ok(!snap(p).includes('P-001'))});
test('pending cancel prevents ordinary link/unlink',()=>{const x=setup(),i=link(x);request(x);reject(()=>link(x),'Inclusão de peça indisponível neste atendimento.',x);reject(()=>S.unlink(x.stock,x.o,i.lineId,S.orderKey(x.o,x.stock),now,actor),'Retirada de peça indisponível neste atendimento.',x)});
count;
`;
console.log(vm.runInNewContext(src+'\n'+checks)+' stock domain checks passed.');
