'use strict';
/*
 * R07-002 — negativos isolados da devolução de garantia e F02.
 * Cada caso: mensagem exata, estado (JSON de todas as OS) intacto e controle positivo.
 * Suporta ASSETS_DIR/RESULT_PATH para mutation testing em cópia scratch.
 * Uso: node r07-002-negativos.cjs
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const ASSETS = process.env.ASSETS_DIR || path.resolve(__dirname, '../../../../assets');
const OUT = process.env.RESULT_PATH || path.join(__dirname, 'r07-002-negativos-resultados.json');
const FILES = ['quote.js', 'portal.js', 'finance.js', 'cancel.js', 'warranty.js'];
const src = FILES.map(f => fs.readFileSync(path.join(ASSETS, f), 'utf8')).join('\n');

const checks = String.raw`
const F=BancadaFinance,W=BancadaWarranty,Q=BancadaQuote,C=BancadaCancel,P=BancadaPortal;
const day='2026-11-26',now=day+'T12:00:00Z';
const out=[];
const ok=(v,m)=>{if(!v)throw Error(m||'assertion failed')};
const eq=(a,b,m)=>{if(a!==b)throw Error((m?m+': ':'')+'expected '+JSON.stringify(b)+' got '+JSON.stringify(a))};
const snap=x=>JSON.stringify(x);
const clone=x=>JSON.parse(JSON.stringify(x));
const test=(id,name,fn)=>{try{fn();out.push({id,name,status:'PASS'})}catch(e){out.push({id,name,status:'FAIL',detail:String(e&&e.message||e)})}};
function origin(opts={}){
  const {id=1,unit=7,client=1,total=50000,paid=20000,conclusion='2026-09-01',days=90,billing=true,ledger=true}=opts;
  const o={id,unit,client,brand:'LG',model:'Inverter',type:'Placa eletrônica',status:'Finalizado',entry:'2026-08-20',conclusion,
    warrantyDays:days,total,paid:0,approval:'Aprovado',delivery:null,history:[]};
  if(billing)o.billing={due:'2026-12-20',items:[{type:'Serviço',name:'Original',quantity:1,unit:total}],discount:0};
  if(ledger){if(paid)F.receive(o,paid,'2026-11-25','Pix',now)}else{o.paid=paid}
  return o;
}
function setup(opts={}){
  const o=origin(opts);const r=W.create(o,[o],{defect:'Falha após o reparo',confirm:true},day);const all=[o,r];
  W.assess(r,all,{coverage:'coberto',solution:'devolucao_valor',diagnosis:'Falha confirmada',reason:'Acordo',previous:0,confirm:true},now,'Administrador');
  return {o,r,all};
}
const payload=(x,more={})=>({assessment:W.assessment(x.r).id,key:W.refundKey(x.o),mode:'parcial',amount:5000,date:day,method:'Pix',reference:'COMPROVANTE FICTÍCIO',reason:'MOTIVO FICTÍCIO',confirm:true,...more});
const givePayload=(x,p)=>W.refund(x.r,x.all,p,now,day,'Administrador');
const correctionPayload=(x,id,more={})=>({reference:id,reason:'Registro lançado por engano',confirm:true,...more});
const rejectCase=(id,name,x,p,msg,positive)=>{
  const before=snap(x.all);
  let err=null;try{givePayload(x,p)}catch(e){err=e}
  eq(err&&err.message,msg,'mensagem');
  eq(snap(x.all),before,'estado intacto');
  if(positive)positive();
};
const rejectCorrection=(id,name,x,p,msg,positive)=>{
  const before=snap(x.all);let err=null;
  try{W.correctRefund(x.r,x.all,p,now,'Administrador')}catch(e){err=e}
  eq(err&&err.message,msg,'mensagem');
  eq(snap(x.all),before,'estado intacto');
  if(positive)positive();
};

/* ---------- avaliação e chave ---------- */
test('N01','Solução diferente de devolução é recusada e a correta é aceita',()=>{
  const x=setup();W.assess(x.r,x.all,{coverage:'coberto',solution:'reparo_sem_cobranca',diagnosis:'Outro',reason:'Revisão',previous:1,confirm:true},now,'Administrador');
  const p=payload(x);const before=snap(x.all);let err;try{givePayload(x,p)}catch(e){err=e}
  eq(err.message,'A avaliação mudou ou não permite esta solução. Reabra e confira.');eq(snap(x.all),before);
  W.assess(x.r,x.all,{coverage:'coberto',solution:'devolucao_valor',diagnosis:'Acordo',reason:'Revisão',previous:2,confirm:true},now,'Administrador');
  givePayload(x,payload(x));
});
test('N02','Avaliação com cobertura em avaliação é recusada',()=>{
  const x=setup();x.r.warranty.events.push({id:99,type:'avaliar',coverage:'avaliacao',solution:'devolucao_valor',diagnosis:'',reason:'legado',when:now,actor:'Legado'});
  const p=payload(x);const before=snap(x.all);let err;try{givePayload(x,p)}catch(e){err=e}
  eq(err.message,'A avaliação mudou ou não permite esta solução. Reabra e confira.');eq(snap(x.all),before);
  x.r.warranty.events.pop();givePayload(x,payload(x));
});
test('N03','Avaliação obsoleta é recusada e a vigente aceita',()=>{const x=setup();rejectCase('N03','Avaliação obsoleta é recusada e a vigente aceita',x,payload(x,{assessment:0}),'A avaliação mudou ou não permite esta solução. Reabra e confira.',()=>givePayload(x,payload(x)));});
test('N04','Chave financeira obsoleta é recusada e a atual aceita',()=>{
  const x=setup();const key=W.refundKey(x.o);F.receive(x.o,1000,day,'Pix',now);
  const p=payload(x,{key});
  rejectCase('N04','Chave financeira obsoleta é recusada e a atual aceita',x,p,'O financeiro mudou. Recarregue e confira novamente o valor.',()=>{givePayload(x,payload(x));eq(F.summary(x.o).balance,29000)});
});
/* ---------- modalidade, valor, data, forma, textos ---------- */
test('N05','Valor acima do recebido é recusado e o limite exato aceito',()=>{
  const x=setup();rejectCase('N05','Valor acima do recebido é recusado e o limite exato aceito',x,payload(x,{amount:20001}),'A devolução deve respeitar o recebido líquido; no encerramento total, devolva exatamente esse valor.',()=>{givePayload(x,payload(x,{amount:20000}));eq(F.summary(x.o).paid,0)});
});
test('N06','Encerramento total inexato é recusado e o exato aceito',()=>{
  const x=setup();rejectCase('N06','Encerramento total inexato é recusado e o exato aceito',x,payload(x,{mode:'total',amount:19999}),'A devolução deve respeitar o recebido líquido; no encerramento total, devolva exatamente esse valor.',()=>{givePayload(x,payload(x,{mode:'total',amount:20000}));eq(F.summary(x.o).total,0)});
});
test('N07','Parcial zero é recusada e o total zero aceito',()=>{
  const y=setup({paid:0});rejectCase('N07','Parcial zero é recusada e o total zero aceito',y,payload(y,{amount:0}),'Confira modalidade e valor devolvido.',()=>{givePayload(y,payload(y,{mode:'total',amount:0}));eq(F.summary(y.o).total,0)});
});
test('N08','Modalidade inválida é recusada',()=>{
  const x=setup();rejectCase('N08','Modalidade inválida é recusada',x,payload(x,{mode:'metade'}),'Confira modalidade e valor devolvido.',()=>givePayload(x,payload(x)));
});
test('N09','Forma inválida é recusada e Pix aceito',()=>{
  const x=setup();rejectCase('N09','Forma inválida é recusada e Pix aceito',x,payload(x,{method:'Cheque'}),'Forma de devolução inválida.',()=>givePayload(x,payload(x)));
});
test('N10','Data futura é recusada e hoje aceito',()=>{
  const x=setup();rejectCase('N10','Data futura é recusada e hoje aceito',x,payload(x,{date:'2026-11-27'}),'Informe a data real da devolução, sem data futura.',()=>givePayload(x,payload(x,{date:day})));
});
test('N11','Data impossível é recusada',()=>{
  const x=setup();rejectCase('N11','Data impossível é recusada',x,payload(x,{date:'2026-02-30'}),'Informe a data real da devolução, sem data futura.',()=>givePayload(x,payload(x,{date:day})));
});
test('N12','Data anterior ao recibo é recusada e a data do recibo aceita',()=>{
  const x=setup();rejectCase('N12','Data anterior ao recibo é recusada e a data do recibo aceita',x,payload(x,{date:'2026-11-24'}),'Data anterior aos registros financeiros da origem.',()=>givePayload(x,payload(x,{date:'2026-11-25'})));
});
test('N13','Referência vazia é recusada',()=>{
  const x=setup();rejectCase('N13','Referência vazia é recusada',x,payload(x,{reference:'  '}),'Confira os textos obrigatórios e seus limites.',()=>givePayload(x,payload(x)));
});
test('N14','Motivo vazio é recusado',()=>{
  const x=setup();rejectCase('N14','Motivo vazio é recusado',x,payload(x,{reason:'  '}),'Confira os textos obrigatórios e seus limites.',()=>givePayload(x,payload(x)));
});
test('N15','Confirmação ausente é recusada',()=>{
  const x=setup();rejectCase('N15','Confirmação ausente é recusada',x,payload(x,{confirm:false}),'Confirme que o dinheiro já foi devolvido fora do sistema e confira o abatimento.',()=>givePayload(x,payload(x)));
});
test('N16','Referência acima do limite é recusada',()=>{
  const x=setup();rejectCase('N16','Referência acima do limite é recusada',x,payload(x,{reference:'x'.repeat(301)}),'Confira os textos obrigatórios e seus limites.',()=>givePayload(x,payload(x)));
});
test('N17','Motivo acima do limite é recusado',()=>{
  const x=setup();rejectCase('N17','Motivo acima do limite é recusado',x,payload(x,{reason:'x'.repeat(2001)}),'Confira os textos obrigatórios e seus limites.',()=>givePayload(x,payload(x)));
});
/* ---------- indisponibilidade do retorno ---------- */
test('N18','Cobrança própria do retorno bloqueia e a conciliação libera',()=>{
  const x=setup();x.r.total=1000;x.r.billing={due:day,items:[]};
  rejectCase('N18','Cobrança própria do retorno bloqueia e a conciliação libera',x,payload(x),'Concilie a cobrança própria deste retorno antes de executar outra solução.',()=>{x.r.total=0;delete x.r.billing;givePayload(x,payload(x))});
});
test('N19','Entrega registrada bloqueia e a correção libera',()=>{
  const x=setup();x.r.delivery={date:day};
  rejectCase('N19','Entrega registrada bloqueia e a correção libera',x,payload(x),'Corrija a entrega antes de executar outra solução.',()=>{x.r.delivery=null;givePayload(x,payload(x))});
});
test('N20','Retorno finalizado bloqueia',()=>{
  const x=setup();x.r.status='Finalizado';
  rejectCase('N20','Retorno finalizado bloqueia',x,payload(x),'Execute a solução antes de concluir ou entregar o retorno.',()=>{x.r.status='Aberto';givePayload(x,payload(x))});
});
test('N21','Publicação ativa bloqueia e a retirada libera preservando a versão',()=>{
  const x=setup();
  W.assess(x.r,x.all,{coverage:'coberto',solution:'novo_orcamento',diagnosis:'Novo',reason:'Revisão',previous:1,confirm:true},now,'Administrador');
  Q.saveDraft(x.r,{items:[{type:'Serviço',name:'Reparo',quantity:1,unit:5000}],discount:0,terms:{}});const v=Q.publish(x.r,now);
  W.assess(x.r,x.all,{coverage:'coberto',solution:'devolucao_valor',diagnosis:'Acordo',reason:'Revisão',previous:2,confirm:true},now,'Administrador');
  rejectCase('N21','Publicação ativa bloqueia e a retirada libera preservando a versão',x,payload(x),'Retire a publicação do orçamento antes de executar troca ou devolução.',()=>{Q.withdraw(x.r,v.number);givePayload(x,payload(x));eq(x.r.quote.versions.length,1)});
});
test('N22','Cobrança já encerrada recusa nova devolução',()=>{
  const x=setup();givePayload(x,payload(x,{mode:'total',amount:20000}));
  const p=payload(x,{mode:'total',amount:0});const before=snap(x.all);let err;try{givePayload(x,p)}catch(e){err=e}
  eq(err.message,'A cobrança já está encerrada.');eq(snap(x.all),before);
});
/* ---------- correção ---------- */
test('N23','Correção sem confirmação é recusada',()=>{
  const x=setup();const e=givePayload(x,payload(x));
  rejectCorrection('N23','Correção sem confirmação é recusada',x,correctionPayload(x,e.id,{confirm:false}),'Confirme que o dinheiro não foi devolvido e que o registro foi lançado por engano.',()=>W.correctRefund(x.r,x.all,correctionPayload(x,e.id),now,'Administrador'));
});
test('N24','Correção com motivo vazio é recusada',()=>{
  const x=setup();const e=givePayload(x,payload(x));
  rejectCorrection('N24','Correção com motivo vazio é recusada',x,correctionPayload(x,e.id,{reason:'  '}),'Confira os textos obrigatórios e seus limites.',()=>W.correctRefund(x.r,x.all,correctionPayload(x,e.id),now,'Administrador'));
});
test('N25','Correção de devolução inexistente é recusada',()=>{
  const x=setup();const e=givePayload(x,payload(x));
  rejectCorrection('N25','Correção de devolução inexistente é recusada',x,correctionPayload(x,999),'Devolução inexistente ou já corrigida.',()=>W.correctRefund(x.r,x.all,correctionPayload(x,e.id),now,'Administrador'));
});
test('N26','Correção duplicada é recusada',()=>{
  const x=setup();const e=givePayload(x,payload(x));W.correctRefund(x.r,x.all,correctionPayload(x,e.id),now,'Administrador');
  const before=snap(x.all);let err;try{W.correctRefund(x.r,x.all,correctionPayload(x,e.id),now,'Administrador')}catch(e2){err=e2}
  eq(err.message,'Devolução inexistente ou já corrigida.');eq(snap(x.all),before);
  eq(F.warrantyCredits(x.o).count,0,'correction removes credit');eq(F.warrantyStatus(x.o),null);
});
/* ---------- proteção do financeiro ---------- */
test('N27','Estorno de recebimento bloqueado com devolução ativa e liberado após correção',()=>{
  const x=setup();const e=givePayload(x,payload(x));
  const before=snap(x.all);let err;try{F.reverse(x.o,1,day,'Erro',now)}catch(e2){err=e2}
  eq(err.message,'Há devolução ou abatimento registrado nesta OS. Confira o histórico antes de corrigir o recebimento.');eq(snap(x.all),before);
  W.correctRefund(x.r,x.all,correctionPayload(x,e.id),now,'Administrador');F.reverse(x.o,1,day,'Erro',now);eq(F.summary(x.o).paid,0);
});
test('N28','Acerto de cancelamento bloqueado com crédito de garantia',()=>{
  const x=setup();givePayload(x,payload(x));
  const before=snap(x.all);let err;try{F.settle(x.o,{gross:0,discount:0,total:0,paid:15000,refund:0,balance:0,result:'sem_pendencias'},null,day)}catch(e){err=e}
  eq(err.message,'Há devolução de garantia vinculada a esta OS. Preserve a cobrança de garantia.');eq(snap(x.all),before);
});
test('N29','Recebimento após encerramento total é recusado',()=>{
  const x=setup();givePayload(x,payload(x,{mode:'total',amount:20000}));
  const before=snap(x.all);let err;try{F.receive(x.o,1,day,'Pix',now)}catch(e){err=e}
  eq(err.message,'Cobrança indisponível. Acerto de cancelamento não autoriza recebimento.');eq(snap(x.all),before);
});
test('N30','Nova cobrança e edição após encerramento total são recusadas',()=>{
  const x=setup();givePayload(x,payload(x,{mode:'total',amount:20000}));
  const before=snap(x.all);let e1,e2;
  try{Q.formalize(x.o,day)}catch(e){e1=e}
  try{Q.saveDraft(x.o,{items:[{type:'Serviço',name:'Novo',quantity:1,unit:100}],discount:0,terms:{}})}catch(e){e2=e}
  eq(e1.message,'Confira os itens e o vencimento da cobrança.');eq(e2.message,'Edição de itens indisponível neste atendimento.');eq(snap(x.all),before);
});
/* ---------- F02 ---------- */
test('N31','F02: pedido de cancelamento bloqueado com solução executada',()=>{
  const x=setup();const e=givePayload(x,payload(x));
  const before=snap(x.all);let err;try{C.request(x.r,'cliente','Teste',now,x.all)}catch(e2){err=e2}
  eq(err.message,'Há retorno ou solução de garantia vinculada. Preserve o histórico e concilie a garantia.');eq(snap(x.all),before);
  W.correctRefund(x.r,x.all,correctionPayload(x,e.id),now,'Administrador');C.request(x.r,'cliente','Teste',now,x.all);
});
test('N32','F02: confirmação do cancelamento bloqueada com devolução executada; retirada permitida',()=>{
  const x=setup();C.request(x.r,'cliente','Pedido',now,x.all);const e=givePayload(x,payload(x));
  const cd={key:C.financialKey(x.r),gross:0,discount:0,refund:0,reason:'',confirm:true,financialConfirmed:true};
  const before=snap(x.all);let err;try{C.confirm(x.r,cd,now,day,x.all)}catch(e2){err=e2}
  eq(err.message,'Há retorno ou solução de garantia vinculada. Preserve o histórico e concilie a garantia.');eq(snap(x.all),before);
  C.withdraw(x.r,'Retirada após devolução',now);ok(!C.pending(x.r));
  W.correctRefund(x.r,x.all,correctionPayload(x,e.id),now,'Administrador');
});
test('N33','F02: derivado cancelado por origem bloqueia o cancelamento da origem',()=>{
  const x=setup();x.o.status='Aprovado';x.o.conclusion=null;x.r.status='Cancelado';
  const before=snap(x.all);let err;try{C.request(x.o,'cliente','Teste',now,x.all)}catch(e){err=e}
  ok(err&&/retorno ou solução/.test(err.message));eq(snap(x.all),before);
  // controle positivo: sem o derivado, o pedido é aceito
  C.request(x.o,'cliente','Teste',now,[x.o]);ok(C.pending(x.o));
});
test('N34','F02: derivado por anterior cancelado bloqueia o cancelamento do retorno',()=>{
  const x=setup();
  const child={...clone(x.r),id:3,status:'Cancelado',warranty:{...clone(x.r.warranty),previous:x.r.id}};
  const before=snap(x.all);let err;try{C.request(x.r,'cliente','Teste',now,[...x.all,child])}catch(e){err=e}
  ok(err&&/retorno ou solução/.test(err.message));eq(snap(x.all),before);
  C.request(x.r,'cliente','Teste',now,x.all);ok(C.pending(x.r));
});
/* ---------- raízes e reabertura ---------- */
test('N35','Último finalizado não cruza raízes da mesma unidade',()=>{
  const x=setup();x.r.status='Finalizado';x.r.conclusion=day;
  const b={...clone(x.o),id:11,total:60000,paid:0,conclusion:'2026-10-01',warrantyDays:180,billing:{due:day,items:[],discount:0}};
  eq(W.lastFinalized(b,[...x.all,b]),null,'raiz B sem retorno');eq(W.lastFinalized(x.o,[...x.all,b]).id,x.r.id,'raiz A mantém');
  ok(!W.lastFinalized(b,[...x.all,b]));
});
test('N36','Retorno ativo único por unidade entre raízes distintas',()=>{
  const x=setup();
  const b={...clone(x.o),id:11,total:1000,paid:0,conclusion:'2026-10-01',warrantyDays:30,billing:{due:day,items:[],discount:0}};
  const before=snap([...x.all,b]);let err;try{W.create(b,[...x.all,b],{defect:'Outro',confirm:true},day)}catch(e){err=e}
  eq(err.message,'Já existe retorno em andamento para esta unidade.');eq(snap([...x.all,b]),before);
});
test('N37','Reabertura de retorno finalizado com irmão ativo é bloqueada',()=>{
  const x=setup();x.r.status='Finalizado';x.r.conclusion=day;
  const sib={...clone(x.r),id:3,status:'Aberto',warranty:{...clone(x.r.warranty),events:[],operations:[]}};
  const all=[...x.all,sib];const before=snap(all);let err;try{W.transition(x.r,all,'Em Andamento')}catch(e){err=e}
  eq(err.message,'Esta OS já originou retorno. Preserve o atendimento encerrado e use a nova OS.');eq(snap(all),before);
});
/* ---------- privacidade ---------- */
test('N38','Projeção pública não contém referência, motivo, retorno nem ledger',()=>{
  const x=setup();givePayload(x,payload(x));const p=snap(P.projection(x.o)),before=snap(x.all);
  for(const bad of ['COMPROVANTE','MOTIVO','returnId','ledgerId','warranty_refund'])ok(!p.includes(bad),'vazou '+bad);
  eq(snap(x.all),before,'projection é somente leitura');
});
JSON.stringify(out);
`;
const results = JSON.parse(vm.runInNewContext(src + '\n' + checks, { console }));
const summary = results.reduce((s, r) => { s[r.status] = (s[r.status] || 0) + 1; return s; }, {});
const assets = {};
for (const f of FILES) assets[f] = crypto.createHash('sha256').update(fs.readFileSync(path.join(ASSETS, f))).digest('hex');
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), codeSha: process.env.CODE_SHA || '', assetsDir: ASSETS, assets, total: results.length, summary, results }, null, 2));
for (const r of results) console.log(`${r.status} ${r.id} — ${r.name}${r.detail ? ' :: ' + r.detail : ''}`);
console.log(`TOTAL ${results.length} · PASS ${summary.PASS || 0} · FAIL ${summary.FAIL || 0}`);
