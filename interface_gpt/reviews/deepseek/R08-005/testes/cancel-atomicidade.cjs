'use strict';
// Synthetic OS/stock fixtures; optionally ASSETS_DIR points to another exact tree.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const assets=process.env.ASSETS_DIR||path.resolve(__dirname,'../../../../assets');
const src=['quote.js','stock.js','finance.js','cancel.js'].map(f=>fs.readFileSync(path.join(assets,f),'utf8')).join('\n');
const code=String.raw`
const Q=BancadaQuote,S=BancadaStock,C=BancadaCancel,now='2026-11-26T12:00:00Z',snapshot=x=>JSON.stringify(x);
const assert=(x,m)=>{if(!x)throw Error(m)};
function fixture(){const x={o:{id:1,status:'Aberto',total:0,paid:0,history:[]},stock:[{sku:'P-001',name:'IGBT',quantity:8,min:0,cost:450,movements:[]}]};S.link(x.stock,x.o,{expected:S.orderKey(x.o,x.stock),sku:'P-001',quantity:3,unit:1000},now,'Admin');C.request(x.o,'cliente','Pedido',now);return x}
function rejectUnchanged(x,f,message){const before=snapshot(x);let error;try{f()}catch(e){error=e.message}assert(error===message,'wrong rejection '+error);assert(snapshot(x)===before,'OS or stock changed on rejection')}
const result=[];function test(name,f){try{f();result.push({name,status:'PASS'})}catch(e){result.push({name,status:'FAIL',detail:e.message})}}
test('no request rejects without initializing cancellation',()=>{const x={o:{id:1,status:'Aberto',total:0,paid:0,history:[]},stock:[]};rejectUnchanged(x,()=>C.remove(x.o,1,1,'unused','',now,[],'bad',x.stock,'Admin'),'Não há pedido pendente.')});
test('missing legacy quote remains untouched',()=>{const x={o:{id:1,status:'Aberto',total:0,paid:0,history:[],cancellation:{events:[{id:1,type:'request'}]}},stock:[]};rejectUnchanged(x,()=>C.remove(x.o,999,1,'unused','',now,[],'bad',x.stock,'Admin'),'Item não encontrado.')});
test('corrupted other line cannot cause partial removal or stock return',()=>{const x=fixture(),i=x.o.quote.draft.items[0],key=C.itemKey(x.o,i);x.o.quote.draft.items.push({lineId:2,type:'Peça',name:'Inválida',quantity:1,unit:-1});x.o.quote.nextLineId=3;rejectUnchanged(x,()=>C.remove(x.o,i.lineId,1,'unused','',now,[],key,x.stock,'Admin'),'Quantidade ou valor inválido.')});
test('valid partial return keeps live line reference and ledger',()=>{const x=fixture(),i=x.o.quote.draft.items[0],key=C.itemKey(x.o,i),e=C.remove(x.o,i.lineId,1,'unused','',now,[],key,x.stock,'Admin');assert(x.o.quote.draft.items[0]===i,'reference replaced');assert(i.quantity===2,'incorrect quantity');assert(e.stockReturned===1&&x.stock[0].quantity===6,'incorrect stock return');assert(S.balance(x.stock[0],x.o.id,i.lineId)===2,'incorrect ledger balance')});
result;
`;
const results=vm.runInNewContext(src+'\n'+code);console.log(JSON.stringify(results,null,2));if(results.some(x=>x.status==='FAIL'))process.exitCode=1;
