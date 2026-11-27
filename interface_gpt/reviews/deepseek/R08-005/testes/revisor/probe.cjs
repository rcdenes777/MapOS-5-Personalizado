'use strict';
// Read-only adversarial probe for the uncommitted R08-005 cancel.js experiment.
// Synthetic fixtures only; loads quote/stock/finance/cancel from ASSETS_DIR.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const assets = process.env.ASSETS_DIR;
if (!assets) { console.error('ASSETS_DIR required'); process.exit(2); }
const src = ['quote.js','stock.js','finance.js','cancel.js']
  .map(f => fs.readFileSync(path.join(assets, f), 'utf8')).join('\n');
const code = String.raw`
const Q=BancadaQuote,S=BancadaStock,C=BancadaCancel;
const now='2026-11-26T12:00:00Z',actor='Administrador';
const J=JSON.stringify;
const out=[];
const ok=(v,m)=>{if(!v)throw Error(m||'assert')};
const eq=(a,b,m)=>{if(a!==b)throw Error((m||'eq')+': '+J(a)+' != '+J(b))};
const thrown=fn=>{try{fn()}catch(e){return e}return null};
function T(name,fn){try{out.push({name,status:'PASS',detail:String(fn()||'')})}catch(e){out.push({name,status:'FAIL',detail:e.message})}}
function O(extra){return Object.assign({id:1,status:'Aberto',entry:'2026-11-25',total:0,paid:0,history:[]},extra||{})}
function ST(){return [{sku:'P-001',name:'IGBT',quantity:8,min:0,cost:450,movements:[]}]}
function req(o){C.request(o,'cliente','Pedido',now)}
function link(o,stock,qty,unit){return S.link(stock,o,{expected:S.orderKey(o,stock),sku:'P-001',quantity:qty,unit},now,actor)}
function expectReject(name,o,stock,fn,msg,after){
  const before=J({o,stock});
  const e=thrown(fn);
  if(!e)throw Error(name+': no error thrown');
  eq(e.message,msg,name+': wrong message');
  eq(J({o,stock}),before,name+': state changed on rejection');
  if(after)after();
  return 'exact "'+msg+'"; full {o,stock} identical';
}

// ---------- rejection vectors ----------
T('R1 no request: cancellation/quote must not be initialized',()=>{
  const o=O(),stock=[];
  return expectReject('R1',o,stock,()=>C.remove(o,1,1,'unused','',now,[],'bad',stock,actor),
    'Não há pedido pendente.',()=>{ok(!('cancellation' in o),'cancellation created');ok(!('quote' in o),'quote created')});
});
T('R2 legacy missing line: no lazy quote/lineId normalization',()=>{
  const o=O({cancellation:{events:[{id:1,type:'request'}]}}),stock=[];
  return expectReject('R2',o,stock,()=>C.remove(o,999,1,'unused','',now,[],'bad',stock,actor),
    'Item não encontrado.',()=>ok(!('quote' in o),'quote created'));
});
T('R15 legacy quote without lineIds + missing target',()=>{
  const o=O({cancellation:{events:[{id:1,type:'request'}]}});
  o.quote={draft:{items:[{type:'Peça',name:'A',quantity:1,unit:100}],discount:0,terms:{}},versions:[],current:null,active:false};
  const before=J(o);const e=thrown(()=>C.remove(o,999,1,'unused','',now,[],'bad',[],actor));
  ok(e,'no error');eq(e.message,'Item não encontrado.');eq(J(o),before,'state changed');
  ok(o.quote.draft.items[0].lineId===undefined,'lineId normalized');ok(o.quote.nextLineId===undefined,'nextLineId normalized');
  return 'lineIds/nextLineId not assigned on rejection';
});
T('R3 invalid sibling after target (linked item)',()=>{
  const stock=ST(),o=O(),i=link(o,stock,3,1000);req(o);
  const key=C.itemKey(o,i),items=o.quote.draft.items,refs=items.slice();
  items.push({lineId:2,type:'Peça',name:'Inválida',quantity:1,unit:-1});o.quote.nextLineId=3;
  return expectReject('R3',o,stock,()=>C.remove(o,i.lineId,1,'unused','',now,[],key,stock,actor),
    'Quantidade ou valor inválido.',()=>{ok(o.quote.draft.items===items,'items array replaced');refs.forEach((r,n)=>ok(items[n]===r,'sibling replaced'));});
});
T('R3b invalid sibling before target (linked item)',()=>{
  const stock=ST(),o=O(),i=link(o,stock,3,1000);req(o);
  const key=C.itemKey(o,i),items=o.quote.draft.items;
  items.unshift({lineId:2,type:'Peça',name:'Inválida',quantity:1,unit:-1});o.quote.nextLineId=3;
  return expectReject('R3b',o,stock,()=>C.remove(o,i.lineId,1,'unused','',now,[],key,stock,actor),
    'Quantidade ou valor inválido.',()=>ok(items.at(-1)===i,'target replaced'));
});
T('R4 sibling quantity 0',()=>{
  const stock=ST(),o=O(),i=link(o,stock,3,1000);req(o);const key=C.itemKey(o,i);
  o.quote.draft.items.push({lineId:2,type:'Peça',name:'Inválida',quantity:0,unit:1});o.quote.nextLineId=3;
  return expectReject('R4',o,stock,()=>C.remove(o,i.lineId,1,'unused','',now,[],key,stock,actor),'Quantidade ou valor inválido.');
});
T('R5 sibling non-integer unit',()=>{
  const stock=ST(),o=O(),i=link(o,stock,3,1000);req(o);const key=C.itemKey(o,i);
  o.quote.draft.items.push({lineId:2,type:'Peça',name:'Inválida',quantity:1,unit:1.5});o.quote.nextLineId=3;
  return expectReject('R5',o,stock,()=>C.remove(o,i.lineId,1,'unused','',now,[],key,stock,actor),'Quantidade ou valor inválido.');
});
T('R6 sibling gross overflow',()=>{
  const stock=ST(),o=O(),i=link(o,stock,3,1000);req(o);const key=C.itemKey(o,i);
  o.quote.draft.items.push({lineId:2,type:'Peça',name:'Inválida',quantity:10000,unit:999999999});o.quote.nextLineId=3;
  return expectReject('R6',o,stock,()=>C.remove(o,i.lineId,1,'unused','',now,[],key,stock,actor),'Valor de item fora do limite.');
});
T('R7 sibling missing type',()=>{
  const stock=ST(),o=O(),i=link(o,stock,3,1000);req(o);const key=C.itemKey(o,i);
  o.quote.draft.items.push({lineId:2,name:'Inválida',quantity:1,unit:1});o.quote.nextLineId=3;
  return expectReject('R7',o,stock,()=>C.remove(o,i.lineId,1,'unused','',now,[],key,stock,actor),'Identifique cada peça ou serviço.');
});
T('R8 malformed legacy discount string with remaining rows',()=>{
  const o=O({total:1000});
  o.quote={draft:{items:[{type:'Serviço',name:'A',quantity:1,unit:500,lineId:1},{type:'Serviço',name:'B',quantity:1,unit:500,lineId:2}],discount:'x',terms:{}},versions:[],current:null,active:false,nextLineId:3};
  req(o);const key=C.itemKey(o,o.quote.draft.items[0]);
  return expectReject('R8',o,[],()=>C.remove(o,1,1,'notdone','',now,[],key,[],actor),'Desconto inválido.');
});
T('R9 draft.items not an array: atomic but TypeError',()=>{
  const o=O({cancellation:{events:[{id:1,type:'request'}]}});
  o.quote={draft:{items:{}},versions:[],current:null,active:false};
  const stock=[],before=J({o,stock});const e=thrown(()=>C.remove(o,1,1,'unused','',now,[],'bad',stock,actor));
  ok(e,'no error');ok(/filter is not a function/.test(e.message),'unexpected: '+e.message);eq(J({o,stock}),before,'state changed');
  return 'TypeError "'+e.message+'"; state identical (non-domain error message)';
});
T('R10 duplicate SKU in catalog',()=>{
  const stock=[{sku:'P-001',name:'IGBT',quantity:8,min:0,cost:450,movements:[]},{sku:'P-001',name:'Dup',quantity:1,min:0,cost:1,movements:[]}];
  const o=O();
  o.quote={draft:{items:[{type:'Peça',name:'IGBT',quantity:2,unit:1000,lineId:1,stockSku:'P-001',stockCost:450}],discount:0,terms:{}},versions:[],current:null,active:false,nextLineId:2};
  req(o);const key=C.itemKey(o,o.quote.draft.items[0]);
  return expectReject('R10',o,stock,()=>C.remove(o,1,1,'unused','',now,[],key,stock,actor),'Produto inexistente ou duplicado.');
});
T('R11 malformed ledger sign',()=>{
  const stock=ST(),o=O(),i=link(o,stock,3,1000);req(o);stock[0].movements[0].quantity=3;
  const key=C.itemKey(o,i);
  return expectReject('R11',o,stock,()=>C.remove(o,i.lineId,1,'unused','',now,[],key,stock,actor),'Histórico de baixa inválido.');
});
T('R12 stale item key',()=>{
  const stock=ST(),o=O(),i=link(o,stock,3,1000);req(o);
  return expectReject('R12',o,stock,()=>C.remove(o,i.lineId,1,'unused','',now,[],'stale',stock,actor),'O item ou pedido mudou. Reabra a conferência.');
});
T('R13 invalid quantity',()=>{
  const stock=ST(),o=O(),i=link(o,stock,3,1000);req(o);const key=C.itemKey(o,i);
  return expectReject('R13',o,stock,()=>C.remove(o,i.lineId,0,'unused','',now,[],key,stock,actor),'Quantidade inválida.');
});
T('R14 invalid disposition',()=>{
  const stock=ST(),o=O(),i=link(o,stock,3,1000);req(o);const key=C.itemKey(o,i);
  return expectReject('R14',o,stock,()=>C.remove(o,i.lineId,1,'notdone','',now,[],key,stock,actor),'Destino inválido para este item.');
});

// ---------- success / identity / ledger ----------
T('S1 partial linked removal: references, stock, ledger, history',()=>{
  const stock=ST(),o=O(),i=link(o,stock,3,1000);req(o);
  const qRef=o.quote,dRef=o.quote.draft,itemsRef=o.quote.draft.items,mov=stock[0].movements.length,ev=o.cancellation.events.length;
  const e=C.remove(o,i.lineId,1,'unused','',now,[],C.itemKey(o,i),stock,actor);
  ok(o.quote===qRef&&o.quote.draft===dRef&&o.quote.draft.items===itemsRef,'structure replaced');
  ok(itemsRef[0]===i,'target replaced');eq(i.quantity,2,'quantity');eq(stock[0].quantity,6,'stock');
  eq(S.balance(stock[0],1,i.lineId),2,'balance');eq(stock[0].movements.length,mov+1,'mov count');
  const m=stock[0].movements.at(-1);
  eq(m.type,'os_devolucao');eq(m.quantity,1);eq(m.before,5);eq(m.after,6);eq(m.osId,1);eq(m.lineId,i.lineId);eq(m.sku,'P-001');
  eq(o.cancellation.events.length,ev+1,'event count');eq(e.type,'item');eq(e.request,1);eq(e.stockReturned,1);eq(e.stockMovement,m.id);
  eq(e.item.quantity,1);eq(e.item.stockCost,450);eq(o.proposal,2000);eq(o.approval,'Rascunho');
  return 'same quote/draft/items/item refs; stock 6; balance 2; one os_devolucao + history event';
});
T('S2 full linked removal returns full proof',()=>{
  const stock=ST(),o=O(),i=link(o,stock,3,1000);req(o);
  const itemsRef=o.quote.draft.items;
  const e=C.remove(o,i.lineId,3,'unused','',now,[],C.itemKey(o,i),stock,actor);
  eq(o.quote.draft.items,itemsRef,'array replaced');eq(itemsRef.length,0,'line not removed');
  eq(stock[0].quantity,8);eq(S.balance(stock[0],1,i.lineId),0);eq(e.stockReturned,3);
  eq(stock[0].movements.at(-1).type,'os_devolucao');eq(stock[0].movements.at(-1).quantity,3);
  return 'line removed in place; stock 8; balance 0; return 3';
});
T('S3 full manual removal keeps surviving sibling references',()=>{
  const o=O();Q.saveDraft(o,{items:[{type:'Peça',name:'A',quantity:2,unit:100},{type:'Peça',name:'B',quantity:1,unit:200},{type:'Serviço',name:'C',quantity:1,unit:300}],discount:0,terms:{}});
  req(o);const [a,b,c]=o.quote.draft.items,items=o.quote.draft.items;
  const e=C.remove(o,a.lineId,2,'unused','',now,[],C.itemKey(o,a),[],actor);
  eq(items.length,2);ok(items[0]===b,'B replaced');ok(items[1]===c,'C replaced');
  eq(e.item.lineId,a.lineId);eq(o.proposal,500);return 'B/C same objects; A gone; proposal 500';
});
T('S4 discount clamp with obligation',()=>{
  const o=O();
  Q.saveDraft(o,{items:[{type:'Serviço',name:'A',quantity:3,unit:1000},{type:'Serviço',name:'B',quantity:1,unit:2000}],discount:2500,terms:{}});
  o.total=5000;req(o);const [a,b]=o.quote.draft.items;
  C.remove(o,a.lineId,3,'notdone','',now,[],C.itemKey(o,a),[],actor);
  eq(o.quote.draft.items.length,1);eq(o.quote.draft.items[0].lineId,b.lineId);
  eq(o.quote.draft.discount,2000);eq(o.proposal,0);eq(o.total,5000);
  return 'discount min(2500,2000)=2000; total unchanged';
});
T('S5 same SKU on two lines: ledger scoped per line',()=>{
  const stock=ST(),o=O(),i1=link(o,stock,2,1000),i2=link(o,stock,3,1000);req(o);
  const line=id=>C.lines(o).find(x=>x.lineId===id);
  eq(stock[0].quantity,3);
  let e=C.remove(o,i1.lineId,1,'unused','',now,[],C.itemKey(o,line(i1.lineId)),stock,actor);
  eq(e.stockReturned,1);eq(stock[0].quantity,4);eq(S.balance(stock[0],1,i1.lineId),1);eq(S.balance(stock[0],1,i2.lineId),3);
  ok(o.quote.draft.items.find(x=>x.lineId===i2.lineId)===i2,'line2 replaced');
  eq(stock[0].movements.at(-1).lineId,i1.lineId);
  e=C.remove(o,i1.lineId,1,'unused','',now,[],C.itemKey(o,line(i1.lineId)),stock,actor);
  eq(stock[0].quantity,5);eq(S.balance(stock[0],1,i1.lineId),0);eq(S.balance(stock[0],1,i2.lineId),3);
  ok(o.quote.draft.items.find(x=>x.lineId===i2.lineId)===i2,'line2 replaced after full removal');
  e=C.remove(o,i2.lineId,3,'unused','',now,[],C.itemKey(o,line(i2.lineId)),stock,actor);
  eq(stock[0].quantity,8);eq(S.balance(stock[0],1,i2.lineId),0);
  return 'line1 return did not consume line2 proof; final stock 8';
});
T('S6 lost consumption never increases stock',()=>{
  const stock=ST(),o=O(),i=link(o,stock,3,1000);req(o);
  const e=C.remove(o,i.lineId,2,'lost','IGBT queimou',now,[],C.itemKey(o,i),stock,actor);
  eq(e.stockReturned,0);eq(stock[0].quantity,5);eq(stock[0].movements.at(-1).type,'os_consumo');
  eq(stock[0].movements.at(-1).quantity,2);eq(S.balance(stock[0],1,i.lineId),1);eq(e.item.stockCost,450);
  return 'stock 5; os_consumo 2; balance 1; cost kept';
});
T('S7 foreign OS movement is not proof and creates no movement',()=>{
  const stock=ST(),o=O(),i=link(o,stock,3,1000);stock[0].movements[0].osId=99;req(o);
  const n=stock[0].movements.length;
  const e=C.remove(o,i.lineId,1,'unused','',now,[],C.itemKey(o,i),stock,actor);
  eq(e.stockReturned,0);eq(stock[0].movements.length,n);eq(stock[0].quantity,5);ok(/não comprovada/.test(e.stockNote),e.stockNote);
  return 'no return, no movement, stock 5, note explicit';
});
T('S8 partial proof reconciles without return',()=>{
  const stock=ST(),o=O(),i=link(o,stock,3,1000);stock[0].movements[0].quantity=-1;req(o);
  const e=C.remove(o,i.lineId,2,'unused','',now,[],C.itemKey(o,i),stock,actor);
  eq(e.stockReturned,0);eq(stock[0].quantity,5);eq(stock[0].movements.at(-1).type,'os_conciliacao');
  eq(stock[0].movements.at(-1).quantity,1);eq(S.balance(stock[0],1,i.lineId),0);
  return 'os_conciliacao 1; stock 5; balance 0';
});

// ---------- residual post-write limits (synthetic, non-JSON objects) ----------
T('P1 JSON-copy divergence: apply happens before sync(o) throws',()=>{
  const o=O();
  o.quote={draft:{items:[{type:'Peça',name:'IGBT',quantity:3,lineId:1,unit:-1,
    toJSON(){return {type:'Peça',name:'IGBT',quantity:3,lineId:1,unit:1000}}}],discount:0,terms:{}},versions:[],current:null,active:false,nextLineId:2};
  req(o);
  const key=C.itemKey(o,{type:'Peça',name:'IGBT',quantity:3,lineId:1,unit:1000});
  const e=thrown(()=>C.remove(o,1,1,'unused','',now,[],key,[],actor));
  ok(e,'no error');eq(e.message,'Quantidade ou valor inválido.');
  eq(o.quote.draft.items[0].quantity,2,'live quantity mutated');
  eq(o.history.length,0,'history event present');eq(o.cancellation.events.length,1);
  return 'OBSERVED partial write: quantity 3->2, no history event, error after write (requires object/toJSON divergence, impossible via localStorage JSON)';
});
T('P2 frozen cancellation.events: add() throws after OS write',()=>{
  const o=O();Q.saveDraft(o,{items:[{type:'Serviço',name:'A',quantity:1,unit:500}],discount:0,terms:{}});req(o);
  Object.freeze(o.cancellation.events);const n=o.cancellation.events.length,items=o.quote.draft.items;
  const e=thrown(()=>C.remove(o,items[0].lineId,1,'notdone','',now,[],C.itemKey(o,items[0]),[],actor));
  ok(e,'no error');eq(items.length,0,'line not removed');eq(o.cancellation.events.length,n,'event appended');
  return 'OBSERVED: line removed, add() threw "'+e.message.slice(0,60)+'"; no rollback (synthetic frozen array)';
});
T('P3 frozen stock movements: commit() throws after OS+stock writes',()=>{
  const stock=ST(),o=O(),i=link(o,stock,3,1000);req(o);
  Object.freeze(stock[0].movements);const n=stock[0].movements.length;
  const e=thrown(()=>C.remove(o,i.lineId,1,'unused','',now,[],C.itemKey(o,i),stock,actor));
  ok(e,'no error');
  eq(o.quote.draft.items[0].quantity,2,'OS line not decremented');eq(stock[0].quantity,6,'stock not mutated');
  eq(stock[0].movements.length,n,'movement appended');eq(o.history.length,0,'history appended');
  return 'OBSERVED: OS line 2, stock quantity 6, but ledger still 1 movement and no history; commit() threw "'+e.message.slice(0,60)+'" (synthetic frozen array)';
});
out;
`;
const results = vm.runInNewContext(src + '\n' + code);
console.log(JSON.stringify(results, null, 2));
