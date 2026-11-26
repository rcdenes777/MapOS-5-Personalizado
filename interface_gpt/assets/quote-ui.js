'use strict';
// Quote presentation: reuses the R02 components and modal shell.
function quoteRows(items){
  return '<div class="quote-items">'+(items.length?items.map(i=>'<div class="quote-line"><div><strong>'+esc(i.name)+'</strong><small>'+esc(i.type)+' · '+esc(i.quantity)+' × '+brl(i.unit)+'</small></div><strong class="money">'+brl(Math.round(i.quantity*i.unit))+'</strong></div>').join(''):'<p class="muted">Nenhum item informado.</p>')+'</div>';
}
function quoteTotals(items,discount){
  const t=BancadaQuote.totals(items,discount);
  return '<dl class="quote-totals"><div><dt>Peças</dt><dd>'+brl(t.parts)+'</dd></div><div><dt>Serviços</dt><dd>'+brl(t.services)+'</dd></div><div><dt>Desconto</dt><dd>'+brl(t.discount)+'</dd></div><div class="grand"><dt>Total da proposta</dt><dd>'+brl(t.total)+'</dd></div></dl>';
}
function quoteTerms(terms){
  return facts([['Pagamento',terms.payment],['Prazo',terms.deadline],['Garantia',terms.warranty],['Diagnóstico compartilhado',terms.diagnosis],['Equipamento compartilhado',terms.equipment],['Defeito compartilhado',terms.defect]]);
}
function portalControls(o){
  const active=BancadaPortal.active(o),url=active?'portal.html#'+o.publicLink.token:'';
  return '<section class="panel form-section portal-controls"><div class="section-head"><h2>Link do cliente</h2>'+pill(active?'Link ativo':'Sem link ativo',active?'green':'')+'</div>'+(active?'<a class="btn" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">Abrir visão do cliente '+icon('arrow')+'</a><details class="quote-version"><summary>Gerenciar link</summary><div class="quote-version-body"><p class="small">Válido até '+esc(stamp(new Date(o.publicLink.expires).toISOString()))+'</p>'+button('Ver endereço para copiar','copyportal:'+o.id)+button('Renovar validade','modal:renewlink:'+o.id)+button('Revogar link','modal:revokelink:'+o.id,'btn danger')+'</div></details>':button('Gerar link de demonstração','modal:issuelink:'+o.id,'btn'))+'<p class="small">Funciona somente neste navegador e na mesma origem. Não é um link real para enviar por WhatsApp.</p></section>';
}
function billingWarning(o,d,v){
  const total=BancadaQuote.totals(d.items,d.discount).total;
  if(v&&(!BancadaQuote.vigente(o)||v.total!==total))return '<p class="note warn">Os itens atuais somam '+brl(total)+'. A versão publicada soma '+brl(v.total)+'. A cobrança usa os itens atuais da OS.</p>';
  if(v?.decision?.answer==='Recusado')return '<p class="note warn">A proposta foi recusada. Confira o motivo da cobrança antes de formalizar.</p>';
  if(!v?.decision||v.decision.answer!=='Aprovado')return '<p class="small">Ainda não há aprovação vigente. Formalização é uma operação independente.</p>';
  return '';
}
function quotePanel(o){
  if(!can('finance'))return '<section class="panel"><h2>Orçamento</h2><p>'+pill(o.approval,o.approval==='Aprovado'?'green':'amber')+'</p><p class="muted">Valores e versões restritos neste perfil.</p></section>';
  const q=BancadaQuote.init(o),v=BancadaQuote.active(o),current=BancadaQuote.vigente(o),d=q.draft;
  const publishable=BancadaQuote.returnAllowed(o)&&!o.delivery&&o.status!=='Cancelado'&&d.items.length>0;
  const billingAllowed=!o.total&&BancadaQuote.returnAllowed(o)&&(!o.origin||(!o.billing&&current?.decision?.answer==='Aprovado'))&&!['Cancelado','Faturado'].includes(o.status)&&BancadaQuote.totals(d.items,d.discount).total>0;
  const responseAllowed=v&&o.status!=='Cancelado'&&(!current||!v.decision);
  const edit=BancadaQuote.editable(o);
  const next=publishable&&!current?'publish':responseAllowed?'response':billingAllowed?'billing':'';
  const cls=k=>'btn'+(next===k?' primary':'');
  const history=q.versions.slice().reverse().map(x=>'<details class="quote-version"><summary><span><strong>Versão '+x.number+'</strong><small>'+esc(stamp(x.created))+' · '+(x.source==='seed'?'Amostra inicial':x.source==='resposta interna'?'Registro interno':'Publicação')+'</small></span>'+pill(x.decision?.answer||(v?.number===x.number?'Aguardando resposta':'Sem decisão'),x.decision?.answer==='Aprovado'?'green':x.decision?.answer==='Recusado'?'red':'')+'</summary><div class="quote-version-body">'+quoteRows(x.items)+quoteTotals(x.items,x.discount)+quoteTerms(x.terms)+(x.decision?facts([['Decisão',x.decision.answer],['Responsável',x.decision.name],['Canal',x.decision.channel],['Comunicação em',date(x.decision.date)],['Observação',x.decision.note],['Registro',stamp(x.decision.registered)]]):'')+'</div></details>').join('');
  return '<div class="grid quote-layout quote-workspace"><section class="panel form-section quote-proposal"><div class="section-head"><div><div class="eyebrow">Proposta atual</div><h2>Peças e serviços</h2></div>'+(edit?button('Editar itens','modal:quote:'+o.id,'btn','plus'):'')+'</div>'+quoteRows(d.items)+quoteTotals(d.items,d.discount)+'<details class="quote-version"><summary>Condições e diagnóstico</summary><div class="quote-version-body">'+quoteTerms(d.terms)+'</div></details>'+(publishable?button(v?'Publicar nova versão':'Publicar orçamento','modal:publish:'+o.id,cls('publish')):'')+(o.delivery?'<p class="note">Equipamento entregue. Novas publicações indisponíveis; a equipe pode registrar comunicação anterior à retirada.</p>':'')+'</section><div class="stack quote-operations"><section class="panel form-section"><h2>Compartilhamento do orçamento</h2><div class="pills">'+pill(BancadaQuote.label(o),current?.decision?.answer==='Aprovado'?'green':'amber')+(v?pill('Versão '+v.number,'blue'):'')+'</div>'+(v&&!current?'<p class="note warn">Os itens mudaram. A versão anterior está preservada, mas indisponível para nova resposta pelo link.</p>':'')+(responseAllowed?button('Registrar resposta do cliente','modal:approval:'+o.id,cls('response')):'')+(v?button('Retirar publicação','modal:withdraw:'+o.id,'btn danger'):'')+'</section>'+portalControls(o)+'<section class="panel form-section"><h2>Cobrança</h2>'+pill(moneyStatus(o),o.total&&o.paid===o.total?'green':o.total?'amber':'')+facts([['Total cobrado',brl(o.total)],['Pago',brl(o.paid)],['Saldo',brl(o.total-o.paid)],['Vencimento',o.billing?date(o.billing.due):'Não informado']])+(billingAllowed?billingWarning(o,d,v)+button('Formalizar cobrança','modal:billing:'+o.id,cls('billing')):'')+'<p class="small">A proposta não é um recebimento nem cria automaticamente uma cobrança.</p></section></div><section class="panel form-section quote-history"><div class="section-head"><h2>Versões e decisões</h2><span class="small">'+plural(q.versions.length,'versão','versões')+'</span></div>'+(history||'<p class="muted">Nenhuma versão publicada.</p>')+'</section></div>';
}
function quoteEditorRow(i={type:'Serviço',name:'',quantity:1,unit:0}){
  return '<fieldset class="quote-edit-row"><legend class="sr">Item do orçamento</legend><div class="form-grid">'+select('Tipo','itemType',['Peça','Serviço'],i.type)+field('Descrição *','itemName',i.name,'required maxlength="500"')+field('Quantidade *','itemQty',i.quantity,'type="number" min="1" max="10000" step="1" required')+field('Valor unitário (R$) *','itemUnit',i.unit?i.unit/100:'','type="number" min="0" max="9999999.99" step="0.01" required')+'</div><button type="button" class="btn ghost danger" data-quote-remove>Remover item</button></fieldset>';
}
function quoteEditor(o){
 const d=BancadaQuote.init(o).draft;
 return '<p class="small">As alterações no rascunho não reescrevem versões anteriores.</p><div id="quote-edit-rows" class="stack">'+(d.items.length?d.items:[undefined]).map(i=>quoteEditorRow(i)).join('')+'</div><button type="button" class="btn" data-quote-add>'+icon('plus')+'Adicionar peça ou serviço</button>'+field('Desconto total (R$)','discount',d.discount/100,'type="number" min="0" step="0.01" required')+'<div id="quote-live" aria-live="polite"></div><details class="quote-version"><summary>Condições da proposta</summary><div class="quote-version-body form-section">'+field('Pagamento','payment',d.terms.payment,'maxlength="2000"')+field('Prazo','deadline',d.terms.deadline,'maxlength="2000"')+field('Garantia','warranty',d.terms.warranty,'maxlength="2000"')+textarea('Diagnóstico compartilhado','diagnosis',d.terms.diagnosis,'maxlength="2000"')+field('Equipamento para o orçamento público','equipment',d.terms.equipment||'','maxlength="2000"')+textarea('Defeito para o orçamento público','defect',d.terms.defect||'','maxlength="2000"')+'</div></details>';
}
function quoteDraftFromForm(f){
  const fd=new FormData(f),names=fd.getAll('itemName'),types=fd.getAll('itemType'),quantities=fd.getAll('itemQty'),units=fd.getAll('itemUnit');
  const cents=v=>Math.round(Number(v)*100);
  return {items:names.map((name,i)=>({name:String(name).trim(),type:String(types[i]),quantity:Number(quantities[i]),unit:units[i]===''?NaN:cents(units[i])})),discount:cents(fd.get('discount')),terms:Object.fromEntries(['payment','deadline','warranty','diagnosis','equipment','defect'].map(k=>[k,String(fd.get(k)||'')]))};
}
function quoteLive(){
  const f=$('#action-form'),out=$('#quote-live');if(!out||!f)return;
  try{const d=quoteDraftFromForm(f);out.innerHTML=quoteTotals(d.items,d.discount)}catch{out.textContent='Preencha os itens e confira os valores para calcular o total.'}
}
function quoteModal(kind,o){
 const q=BancadaQuote.init(o),v=BancadaQuote.active(o),d=q.draft;
 if(kind==='issuelink')return BancadaPortal.active(o)?null:['Gerar link de demonstração','<p>O endereço permite acompanhar esta OS neste navegador por 120 dias simulados.</p>'+check('Entendo que o endereço é somente para demonstração local.'),'Gerar link'];
 if(kind==='renewlink')return BancadaPortal.active(o)?['Renovar validade','<p>Manter o endereço e renovar a validade por 120 dias.</p>'+check('Confirmo a renovação.'),'Renovar']:null;
 if(kind==='revokelink')return BancadaPortal.active(o)?['Revogar link','<p>O endereço deixará de funcionar. O orçamento e seu histórico serão preservados.</p>'+check('Confirmo a revogação.'),'Revogar link']:null;
 if(kind==='quote'){if(!BancadaQuote.editable(o))return null;return ['Preparar orçamento',quoteEditor(o),'Salvar rascunho']}
 if(kind==='publish'){if(o.delivery||!BancadaQuote.returnAllowed(o)||o.status==='Cancelado'||!d.items.length)return null;return ['Publicar versão '+(q.versions.length+1),quoteRows(d.items)+quoteTotals(d.items,d.discount)+quoteTerms(d.terms)+check('Conferi os textos, itens e valores e autorizo o compartilhamento desta versão.')+'<p class="note">A publicação anterior, se houver, será preservada no histórico.</p>','Publicar versão']}
 if(kind==='withdraw'){if(!v)return null;return ['Retirar publicação','<input type="hidden" name="version" value="'+v.number+'">'+check('Retirar a publicação e preservar versões e respostas no histórico.'),'Retirar publicação']}
 if(kind==='approval'){
   const current=BancadaQuote.vigente(o);
   if(!v||o.status==='Cancelado'||current?.decision)return null;
   const shown=current||{items:d.items,discount:d.discount,terms:d.terms};
   return ['Registrar resposta do cliente','<div class="note">'+(current?'Versão '+v.number:'Os itens foram alterados; o registro interno criará uma versão com os itens atuais.')+'</div><input type="hidden" name="version" value="'+v.number+'">'+quoteRows(shown.items)+quoteTotals(shown.items,shown.discount)+quoteTerms(shown.terms)+select('Resposta','answer',[['','Selecione a resposta'],['Aprovado','Aprovado'],['Recusado','Recusado']],'','required')+field('Nome de quem respondeu *','name',client(o).name,'required maxlength="150"')+select('Canal','channel',[['whatsapp','WhatsApp'],['telefone','Telefone'],['presencial','Presencial']])+field('Data da comunicação *','date',o.delivery?.date||today(),'type="date" max="'+(o.delivery?.date||today())+'" required')+textarea('Observação (opcional)','note','','maxlength="2000"')+check('Confirmo a decisão sobre estes itens e valores.'),'Registrar resposta'];
 }
 if(kind==='billing'){if(o.total||!BancadaQuote.returnAllowed(o)||o.origin&&(o.billing||BancadaQuote.vigente(o)?.decision?.answer!=='Aprovado')||['Cancelado','Faturado'].includes(o.status))return null;return ['Formalizar cobrança',quoteTotals(d.items,d.discount)+billingWarning(o,d,v)+field('Vencimento *','due',today(),'type="date" required')+check('Conferi o valor e confirmo a criação da cobrança.'),'Formalizar cobrança']}
 return null;
}
function handleQuoteSubmit(kind,o,f,d){
 const now=new Date().toISOString();
 if(['issuelink','renewlink','revokelink'].includes(kind)){if(!d.confirm)throw Error('Confirme a operação.');if(kind==='issuelink')BancadaPortal.issue(o,BancadaPortal.token());if(kind==='renewlink')BancadaPortal.renew(o);if(kind==='revokelink')BancadaPortal.revoke(o);event(o,'Link: '+({issuelink:'gerado',renewlink:'renovado',revokelink:'revogado'}[kind]));return}
 if(kind==='quote'){BancadaQuote.saveDraft(o,quoteDraftFromForm(f));event(o,'Rascunho de orçamento atualizado')}
 if(kind==='publish'){if(!d.confirm)throw Error('Confirme a publicação.');const v=BancadaQuote.publish(o,now);event(o,'Orçamento: versão '+v.number+' publicada')}
 if(kind==='withdraw'){if(!d.confirm)throw Error('Confirme a retirada.');BancadaQuote.withdraw(o,Number(d.version));event(o,'Orçamento: publicação retirada')}
 if(kind==='approval'){const v=BancadaQuote.respond(o,Number(d.version),d,now,true,today());event(o,'Orçamento: versão '+v.number+' — '+v.decision.answer)}
 if(kind==='billing'){if(!d.confirm)throw Error('Confirme a cobrança.');BancadaQuote.formalize(o,d.due);event(o,'Cobrança formalizada')}
}
document.addEventListener('click',e=>{
 const add=e.target.closest('[data-quote-add]'),remove=e.target.closest('[data-quote-remove]');
 if(add){const rows=$('#quote-edit-rows');if(rows&&rows.children.length<100){rows.insertAdjacentHTML('beforeend',quoteEditorRow());rows.lastElementChild.querySelector('input').focus();quoteLive()}}
 if(remove){remove.closest('.quote-edit-row').remove();quoteLive()}
});
document.addEventListener('input',e=>{if(e.target.form?.dataset.kind==='quote')quoteLive()});
document.addEventListener('change',e=>{if(e.target.form?.dataset.kind==='quote')quoteLive()});
