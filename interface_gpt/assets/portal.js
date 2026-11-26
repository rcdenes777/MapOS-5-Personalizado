'use strict';
// R04: browser-local simulation only. A local identifier is not a secure server capability.
const BancadaPortal = (() => {
  const key='mapos-bancada-prototype-v1';
  const duration=120*86400000;
  const validToken=t=>typeof t==='string'&&/^[a-f0-9]{64}$/.test(t);
  const active=(o,now=Date.now())=>!!(o?.publicLink&&validToken(o.publicLink.token)&&Number.isFinite(o.publicLink.expires)&&o.publicLink.expires>now);
  function issue(o,token,now=Date.now()){
    if(!validToken(token))throw Error('Identificador de demonstração inválido.');
    if(active(o,now))throw Error('Já existe um link ativo. Renove ou revogue primeiro.');
    o.publicLink={token,expires:now+duration};
  }
  function renew(o,now=Date.now()){
    if(!active(o,now))throw Error('Não há link ativo para renovar.');
    o.publicLink.expires=now+duration;
  }
  function revoke(o){o.publicLink=null}
  function resolve(db,token,now=Date.now()){
    if(!validToken(token)||!Array.isArray(db?.orders))return null;
    return db.orders.find(o=>active(o,now)&&o.publicLink.token===token)||null;
  }
  function projection(o){
    BancadaQuote.init(o);
    const v=BancadaQuote.vigente(o);
    const replacement=o.warranty?.operations?.find(e=>e.type==='troca')?.replacement;
    const eq=replacement?'Substituta em garantia · '+[replacement.brand,replacement.model].filter(Boolean).join(' · '):[o.brand,o.model].filter(Boolean).join(' · ')||o.description||'Identificação pendente';
    const credits=(o.financeLedger?.events||[]).filter(e=>e.type==='warranty_refund'&&!o.financeLedger.events.some(x=>x.type==='warranty_refund_correction'&&x.reference===e.id));
    const warrantyClosed=o.total===0&&credits.some(e=>e.credit>0)?(credits.some(e=>e.amount>0)?'Reembolsada':'Encerrada por garantia'):null;
    const finance=BancadaQuote.hasObligation(o)?{total:o.total,paid:o.paid,balance:o.total-o.paid,status:warrantyClosed||(o.total===0?'Sem cobrança':o.paid===o.total?'Quitada':o.paid>0?'Parcialmente paga':'Em aberto')}:null;
    // Deliberate allowlist. Never return an order, draft, link, private note, or full decision.
    const quote=v?{number:v.number,created:v.created,items:v.items.map(i=>({type:i.type,name:i.name,quantity:i.quantity,unit:i.unit})),discount:v.discount,total:v.total,terms:{payment:v.terms.payment,deadline:v.terms.deadline,warranty:v.terms.warranty,diagnosis:v.terms.diagnosis,equipment:v.terms.equipment||'',defect:v.terms.defect||''},decision:v.decision?{answer:v.decision.answer,name:v.decision.name,channel:v.decision.channel,date:v.decision.date,registered:v.decision.registered,afterDelivery:!!v.decision.afterDelivery}:null,readOnly:!!o.delivery}:null;
    return {id:o.id,status:o.status,entry:o.entry,forecast:o.forecast||'',equipment:eq,finance,quote,attachments:[]};
  }
  function respond(db,token,version,data,now=Date.now(),localDay=new Date(now).toISOString().slice(0,10)){
    const o=resolve(db,token,now);
    if(!o)throw Error('Link indisponível. Solicite um endereço atualizado à assistência.');
    if(typeof data.name!=='string'||data.name.trim().length<3)throw Error('Informe seu nome completo.');
    const v=BancadaQuote.vigente(o);
    if(!v||v.number!==version||v.decision||o.delivery)throw Error('Este orçamento não está mais disponível para resposta. Confira a versão atual.');
    const result=BancadaQuote.respond(o,version,data,new Date(now).toISOString(),false,localDay);
    o.history.push({time:new Date(now).toISOString(),text:'Orçamento: versão '+result.number+' — '+result.decision.answer+' (link simulado)'});
    return result.number;
  }
  function read(storage){try{return JSON.parse(storage.getItem(key))}catch{return null}}
  function token(){const bytes=new Uint8Array(32);crypto.getRandomValues(bytes);return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('')}
  return {key,duration,active,issue,renew,revoke,resolve,projection,respond,read,token};
})();
