const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const assets=process.env.ASSETS_DIR;
const src=['quote.js','stock.js','finance.js','cancel.js'].map(f=>fs.readFileSync(path.join(assets,f),'utf8')).join('\n');
const code=String.raw`
const C=BancadaCancel,now='2026-11-26T12:00:00Z',out=[];
const J=JSON.stringify;
const o=()=>({id:1,status:'Aberto',total:0,paid:0,history:[]});
const run=(name,fn)=>{const x=o(),b=J(x);try{fn(x)}catch(e){out.push({name,error:e.message,mutated:J(x)!==b,after:J(x)})}};
run('request invalid origin',x=>C.request(x,'bad','x',now));
run('withdraw no request',x=>C.withdraw(x,'x',now));
run('confer no request',x=>C.confer(x,true,'',now));
run('remove no request (target fixed)',x=>C.remove(x,1,1,'unused','',now,[],'bad',[],'Admin'));
out;
`;
console.log(JSON.stringify(vm.runInNewContext(src+'\n'+code),null,2));
