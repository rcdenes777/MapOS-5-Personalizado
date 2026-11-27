'use strict';
// Synthetic two-fault precedence probe: not a single-condition validation test.
const fs=require('fs'),path=require('path'),vm=require('vm');
const dir=process.env.ASSETS_DIR; const src=['quote.js','stock.js'].map(f=>fs.readFileSync(path.join(dir,f),'utf8')).join('\n');
const result=vm.runInNewContext(src+String.raw`
(()=>{const o={id:1,status:'Aberto',total:0,paid:0,history:[]}, stock=[{sku:'P-001',name:'IGBT',quantity:8,cost:450,movements:[]}];
 const q=BancadaQuote.init(o);q.draft.items.push({type:'Peça',name:'corrompida',quantity:1,unit:-1,lineId:1});q.nextLineId=2;
 const d={sku:'P-001',quantity:9,unit:100,expected:BancadaStock.orderKey(o,stock)};const before=JSON.stringify({o,stock});let error='';
 try{BancadaStock.link(stock,o,d,'2026-11-26T12:00:00Z','Admin')}catch(e){error=e.message};return {error,unchanged:before===JSON.stringify({o,stock})};})()
`);console.log(JSON.stringify(result));
