'use strict';
// Local demonstration domain. No network, authentication or production data.
const BancadaQuote = (() => {
  const stages = ['Aberto','Orçamento','Negociação','Orçamento recusado','Aprovado'];
  const copy = value => JSON.parse(JSON.stringify(value));
  const assert = (ok, message) => { if (!ok) throw new Error(message); };
  const active = o => o.quote?.active ? o.quote.versions.find(v=>v.number===o.quote.current) || null : null;
  function totals(items, discount=0) {
    assert(Array.isArray(items) && items.length<=100,'Confira a quantidade de itens.');
    assert(Number.isSafeInteger(discount)&&discount>=0,'Desconto inválido.');
    let parts=0, services=0;
    for (const i of items) {
      assert(['Peça','Serviço'].includes(i.type)&&typeof i.name==='string'&&i.name.trim()&&i.name.length<=500,'Identifique cada peça ou serviço.');
      assert(Number.isSafeInteger(i.quantity)&&i.quantity>0&&i.quantity<=10000&&Number.isSafeInteger(i.unit)&&i.unit>=0,'Quantidade ou valor inválido.');
      const value=i.quantity*i.unit;
      assert(Number.isSafeInteger(value)&&value<=999999999,'Valor de item fora do limite.');
      if(i.type==='Peça')parts+=value;else services+=value;
    }
    const gross=parts+services;
    assert(gross<=999999999&&discount<=gross,'Confira o total e o desconto.');
    return {parts,services,gross,discount,total:gross-discount};
  }
  function init(o) {
    if(o.quote)return o.quote;
    const amount=o.proposal||o.total||0;
    const items=amount?[{type:'Serviço',name:'Serviço de reparo (demonstração inicial)',quantity:1,unit:amount}]:[];
    const q={draft:{items,discount:0,terms:{payment:'',deadline:'',warranty:'',diagnosis:''}},versions:[],current:null,active:false};
    if(amount){
      q.current=1;q.active=true;
      q.versions.push({number:1,items:copy(items),discount:0,terms:copy(q.draft.terms),total:amount,created:o.entry,decision:['Aprovado','Recusado'].includes(o.approval)?{answer:o.approval,name:'Cliente de demonstração',channel:'presencial',date:o.entry}:null,source:'seed'});
    }
    o.quote=q;return q;
  }
  const validDay=v=>{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;const d=new Date(v+'T00:00:00Z');return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===v};
  const snapshotKey=d=>JSON.stringify([d.items.map(i=>[i.type,i.name,i.quantity,i.unit]),d.discount]);
  function vigente(o){const v=active(o);return o.status!=='Cancelado'&&v&&snapshotKey(v)===snapshotKey(init(o).draft)?v:null}
  function label(o){const q=init(o),v=active(o);if(!v)return q.versions.length?'Publicação retirada':q.draft.items.length?'Rascunho':'Sem orçamento';if(!vigente(o))return 'Itens alterados';return v.decision?.answer||'Aguardando resposta'}
  function sync(o){o.approval=label(o);o.proposal=totals(init(o).draft.items,o.quote.draft.discount).total}
  const returnAllowed=o=>!o.origin||o.warranty?.events?.filter(e=>e.type==='avaliar').at(-1)?.solution==='novo_orcamento';
  function editable(o){return returnAllowed(o)&&o.status!=='Cancelado'&&!o.delivery&&!o.total}
  function saveDraft(o,draft) {
    assert(editable(o),'Edição de itens indisponível neste atendimento.');
    totals(draft.items,draft.discount);
    const terms={};for(const k of ['payment','deadline','warranty','diagnosis','equipment','defect']){const v=String(draft.terms?.[k]||'');assert(v.length<=2000,'Texto muito longo.');terms[k]=v}
    init(o).draft={items:copy(draft.items),discount:draft.discount,terms};sync(o);
  }
  function publish(o,when,{source='publicar',internal=false}={}) {
    assert(returnAllowed(o)&&o.status!=='Cancelado'&&(!o.delivery||internal),'Publicação indisponível neste atendimento.');
    const q=init(o),d=q.draft,t=totals(d.items,d.discount);
    assert(d.items.length>0,'Adicione peças ou serviços.');
    const v={number:q.versions.length+1,items:copy(d.items),discount:d.discount,terms:copy(d.terms),total:t.total,created:when,decision:null,source};
    q.versions.push(v);q.current=v.number;q.active=true;if(o.origin){o.warranty.operations??=[];o.warranty.operations.push({type:'orcamento',version:v.number,when})}
    if(!internal&&stages.includes(o.status))o.status='Negociação';sync(o);return v;
  }
  function withdraw(o,number){
    const v=active(o);assert(v&&v.number===number,'A versão publicada mudou.');
    o.quote.active=false;if(o.status==='Orçamento recusado')o.status='Orçamento';sync(o);
  }
  function respond(o,number,data,now,internal=true,localDay=now.slice(0,10)){
    const v=active(o);
    assert(v&&v.number===number&&o.status!=='Cancelado','Orçamento indisponível ou atualizado.');
    assert(['Aprovado','Recusado'].includes(data.answer)&&String(data.name||'').trim()&&data.name.length<=150&&data.confirm,'Confirme o nome e a decisão.');
    if(internal){
      assert(['telefone','whatsapp','presencial'].includes(data.channel)&&validDay(data.date)&&data.date<=localDay,'Confira canal e data da comunicação.');
      assert(!o.delivery||data.date<=o.delivery.date,'A comunicação não pode ser posterior à entrega.');
    }else{assert(!o.delivery,'Equipamento entregue: somente consulta.')}
    assert(String(data.note||'').length<=2000,'Observação muito longa.');
    let target=vigente(o);
    if(!target&&internal)target=publish(o,now,{source:'resposta interna',internal:true});
    assert(target&&!target.decision,'Versão indisponível ou já respondida.');
    target.decision={answer:data.answer,name:String(data.name).trim(),channel:internal?data.channel:'link simulado',date:internal?data.date:localDay,note:String(data.note||''),registered:now,afterDelivery:!!o.delivery};
    if(!o.delivery&&stages.includes(o.status))o.status=data.answer==='Aprovado'?'Aprovado':'Orçamento recusado';
    sync(o);return target;
  }
  function formalize(o,due){
    const q=init(o),t=totals(q.draft.items,q.draft.discount);
    assert(!o.total&&returnAllowed(o)&&!['Cancelado','Faturado'].includes(o.status)&&t.total>0&&validDay(due),'Confira os itens e o vencimento da cobrança.');
    if(o.origin){const v=vigente(o);assert(!o.billing&&v?.decision?.answer==='Aprovado'&&v.total===t.total,'Fature o retorno somente com novo orçamento vigente, aprovado e sem alterações nos itens ou valores.')}
    o.total=t.total;o.paid=0;o.billing={due,items:copy(q.draft.items),discount:q.draft.discount};
    return t.total;
  }
  return {init,totals,active,vigente,label,sync,returnAllowed,editable,saveDraft,publish,withdraw,respond,formalize};
})();
