'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
const assets = path.resolve(__dirname, '../../../../assets');
const src = ['quote.js', 'stock.js', 'finance.js', 'cancel.js'].map(f => fs.readFileSync(path.join(assets, f), 'utf8')).join('\n');
const result = vm.runInNewContext(src + `\n(()=>{const o={id:1,status:'Aberto',total:0,paid:0,history:[],cancellation:{events:[{id:1,type:'request'}]}};const before=JSON.stringify(o);let error;try{BancadaCancel.remove(o,999,1,'unused','','2026-11-26',[],'bad',[],'Admin')}catch(e){error=e.message}return {error,unchanged:before===JSON.stringify(o),before:JSON.parse(before),after:o}})()`);
console.log(JSON.stringify(result, null, 2));
if (result.error !== 'Item não encontrado.' || !result.unchanged) process.exitCode = 1;
