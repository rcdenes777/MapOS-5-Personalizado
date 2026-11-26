'use strict';
// R07-001: private warranty workspace. No real authentication or financial movement.
const warrantyKinds=['warrantyAssess','warrantyCost','warrantyCorrect','warrantyRefund','warrantyRefundCorrect','warrantySwap'];
const warrantyRefundAllowed=()=>can('settings'); // distinct native grant, conservatively admin only
const warrantyCostAllowed=()=>can('settings'); // conservative demo mapping of distinct native cost permissions
function warrantyRef(o){try{return BancadaWarranty.reference(o,db.orders)}catch{return null}}
// Referência read-only da própria raiz: preserva conclusão/prazo mesmo quando a unidade
// original foi substituída e `reference` passa a recusá-la de propósito.
function warrantyOriginRef(o){
 if(o.origin||!BancadaFinance.dayValid(o.conclusion))return null;
 const days=Number.isInteger(o.warrantyDays)&&o.warrantyDays>=0&&o.warrantyDays<=9999?o.warrantyDays:null;
 let end=null;if(days>0){const d=new Date(o.conclusion+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+days);end=d.toISOString().slice(0,10)}
 return {root:o.id,previous:o.id,unit:o.unit||o.id,client:o.client,conclusion:o.conclusion,days,end};
}
const warrantyRefOf=o=>BancadaWarranty.binding(o,db.orders)||warrantyRef(o)||warrantyOriginRef(o);
function warrantyPeriod(w){if(!w)return 'Referência indisponível';if(w.days===null)return 'Prazo não informado';if(!w.days)return 'Sem prazo concedido';return date(w.end)+(w.end<today()?' · Prazo expirado':' · Dentro do prazo')}
function warrantyBase(o){return o.status!=='Finalizado'?o:(BancadaWarranty.lastFinalized(o,db.orders)||o)}
function warrantyReturnLink(o){
 const base=warrantyBase(o);if(!can('return'))return '';
 const a=BancadaWarranty.active(base,db.orders);
 if(a)return link('Abrir retorno em andamento '+num(a),'#os/'+a.id+'/garantia','btn');
 const w=warrantyRef(base);if(!w)return '';
 return link('Registrar retorno','#retorno/'+base.id,'btn');
}
function warrantySummary(o){
 const w=warrantyRefOf(o);
 return '<section class="panel form-section"><h2>Garantia</h2>'+(o.origin?'<p>'+link('OS de origem '+num({id:o.origin}),'#os/'+o.origin,'btn ghost')+'</p>'+pill(o.coverage||'Em avaliação','amber'):'<p class="muted">'+(o.conclusion?'Conclusão em '+date(o.conclusion):'Prazo depende da conclusão real.')+'</p>')+(w?'<p class="small">'+esc(warrantyPeriod(w))+'</p>':'')+link('Ver garantia e retornos','#os/'+o.id+'/garantia','btn ghost')+warrantyReturnLink(o)+'</section>';
}
function warrantyPanel(o){
 const w=warrantyRefOf(o),a=BancadaWarranty.assessment(o),ev=BancadaWarranty.events(o),c=BancadaWarranty.costs(o);
 const related=db.orders.filter(x=>x.origin&&(BancadaWarranty.same(x,o)||x.origin===(o.origin||o.id)&&x.client===o.client));
 const canAssess=o.origin&&w&&o.status!=='Cancelado'&&can('tech')&&!BancadaWarranty.executed(o);
 const visible=ev.filter(e=>e.type==='avaliar'||warrantyCostAllowed());
 const history=visible.slice().reverse().map(e=>'<li><strong>'+esc(e.type==='avaliar'?'Avaliação '+BancadaWarranty.coverage[e.coverage]:e.type==='custo'?'Custo interno declarado':'Correção de custo')+'</strong><small>'+esc(stamp(e.when))+' · '+esc(e.actor)+'</small>'+(e.type==='avaliar'?facts([['Solução',BancadaWarranty.solutions[e.solution]],['Diagnóstico',e.diagnosis],['Justificativa',e.reason]]):facts([['Valor',brl(e.amount)],['Tempo',e.minutes+' min'],['Descrição',e.reason]])+(e.type==='custo'&&o.status!=='Cancelado'&&!ev.some(x=>x.type==='corrigir_custo'&&x.reference===e.id)?button('Corrigir registro','modal:warrantyCorrect:'+o.id+':'+e.id):''))+'</li>').join('');
 return '<div class="stack"><div class="grid split"><section class="panel form-section"><div class="section-head"><h2>Referência original</h2>'+pill(o.origin?'Retorno':'Atendimento original','blue')+'</div>'+(w?facts([['OS de origem',num({id:w.root})],...(o.origin?[['Atendimento anterior',num({id:w.previous})]]:[]),['Conclusão original',date(w.conclusion)],['Prazo original',w.days===null?'Não informado':w.days+' dias'],['Vencimento',warrantyPeriod(w)]]):'<p class="muted">Conclusão e identificação da unidade são necessárias.</p>')+'<p class="note">Prazo é referência temporal; não determina cobertura. Um retorno não concede nova garantia.</p>'+warrantyReturnLink(o)+(o.origin?link('Consultar origem','#os/'+o.origin,'btn ghost'):'')+'</section>'+(o.origin?'<section class="panel form-section"><h2>Avaliação da cobertura</h2>'+pill(o.coverage||'Em avaliação',a?.coverage==='coberto'?'green':'amber')+facts([['Solução',BancadaWarranty.solutions[a?.solution||'']],['Diagnóstico',a?.diagnosis],['Justificativa',a?.reason]])+(canAssess?button(a?'Revisar avaliação':'Registrar avaliação','modal:warrantyAssess:'+o.id,'btn primary'):'')+(a?.solution==='novo_orcamento'&&can('finance')?link('Abrir orçamento do retorno','#os/'+o.id+'/orcamento','btn'):'')+'<p class="small">Avaliar não executa cobrança, troca ou devolução.</p></section>':'<section class="panel form-section"><h2>Histórico de retornos</h2><p class="small">Cada entrada cria uma OS distinta para a mesma unidade.</p>'+list(related)+'</section>')+'</div>'+warrantySwapPanel(o)+warrantyRefundPanel(o)+(o.origin&&warrantyCostAllowed()?'<section class="panel form-section"><h2>Custos internos declarados</h2>'+facts([['Custo líquido neste retorno',brl(c.amount)],['Tempo de trabalho',c.minutes+' min']])+ '<p class="note">Não são cobrança, despesa paga ou movimentação de estoque.</p>'+(o.status!=='Cancelado'?button('Registrar custo','modal:warrantyCost:'+o.id,'btn'):'')+'</section>':'')+(o.origin?'<section class="panel form-section"><h2>Histórico privado da garantia</h2>'+(history?'<ol class="timeline">'+history+'</ol>':'<p class="muted">Nenhuma avaliação registrada.</p>')+'</section><section class="panel form-section"><h2>Atendimentos da unidade</h2>'+list(related)+'</section>':'')+'</div>';
}
function warrantyRefundPanel(o){
 if(!o.origin||!can('finance'))return '';
 const a=BancadaWarranty.assessment(o),ev=BancadaWarranty.refundEvents(o);
 if(a?.solution!=='devolucao_valor'&&!ev.length)return '';
 let origin;try{origin=BancadaWarranty.refundOrigin(o,db.orders,true)}catch(err){return '<section class="panel"><h2>Devolução de garantia</h2><p class="note warn">'+esc(err.message)+'</p></section>'}
 const s=BancadaFinance.summary(origin);let blocker='';
 try{BancadaWarranty.refundEligibility(o,db.orders);if(s.total<=0)blocker='A cobrança já está encerrada.'}catch(err){blocker=err.message}
 const history=ev.slice().reverse().map(e=>{
   const corrected=BancadaWarranty.refundCorrected(o,e.id),isRefund=e.type==='reembolso';
   return '<li><strong>'+esc(isRefund?(corrected?'Devolução corrigida':e.mode==='total'?'Encerramento total':'Devolução parcial'):'Correção de devolução')+'</strong><small>'+esc(stamp(e.when))+' · Registro #'+e.id+'</small>'+facts([['Valor',brl(e.amount)],['Abatimento',brl(e.credit)],['Motivo',e.reason],...(isRefund?[['Data da devolução',date(e.date)],['Forma',e.method],['Referência',e.reference]]:[])])+ (isRefund&&!corrected&&warrantyRefundAllowed()&&o.status!=='Cancelado'?button('Corrigir devolução','modal:warrantyRefundCorrect:'+o.id+':'+e.id,'btn danger'):'')+'</li>';
 }).join('');
 return '<section class="panel form-section"><div class="section-head"><h2>Devolução de garantia</h2>'+link('Financeiro da origem '+num(origin),'#os/'+origin.id+'/financeiro','btn')+'</div>'+facts([['Cobrança líquida da origem',brl(s.total)],['Recebido líquido',brl(s.paid)],['Saldo',brl(s.balance)]])+'<p class="note">A devolução é registrada na cobrança da origem. Não gera cobrança no retorno nem faz transferência bancária.</p>'+(blocker?'<p class="note warn">'+esc(blocker)+'</p>':warrantyRefundAllowed()?button('Registrar devolução ou encerramento','modal:warrantyRefund:'+o.id,'btn primary'):'')+(history?'<details open><summary>Histórico de devoluções</summary><ol class="timeline">'+history+'</ol></details>':'')+'</section>';
}
function warrantyRefundLive(){
 const f=$('#action-form');if(!f||f.dataset.kind!=='warrantyRefund')return;
 const o=db.orders.find(x=>x.id===Number(f.dataset.id));let origin;try{origin=BancadaWarranty.refundOrigin(o,db.orders)}catch{return}
 const s=BancadaFinance.summary(origin),mode=f.elements.mode.value;
 if(mode==='total'){f.elements.amount.value=(s.paid/100).toFixed(2);f.elements.amount.readOnly=true}else f.elements.amount.readOnly=false;
 const raw=f.elements.amount.value,amount=Math.round(Number(raw)*100);
 const valid=mode&&/^\d+(?:\.\d{1,2})?$/.test(raw)&&Number.isSafeInteger(amount)&&amount>=0&&amount<=s.paid&&(mode==='total'||amount>0);
 $('#warranty-refund-preview').textContent=valid?'Abatimento: '+brl(mode==='total'?s.total:Math.round(amount))+' · Saldo após registro: '+brl(mode==='total'?0:s.balance):'Selecione a modalidade e confira o valor.';
}
document.addEventListener('input',e=>{if(e.target.form?.dataset.kind==='warrantyRefund')warrantyRefundLive()});
document.addEventListener('change',e=>{if(e.target.form?.dataset.kind==='warrantyRefund')warrantyRefundLive()});
function warrantySwapPanel(o){
 if(!o.origin)return '';
 const a=BancadaWarranty.assessment(o),t=BancadaWarranty.swapEvent(o);
 if(a?.solution!=='troca'&&!t)return '';
 let blocker='';try{BancadaWarranty.swapEligibility(o,db.orders)}catch(e){blocker=e.message}
 if(t)return '<section class="panel form-section"><h2>Troca em garantia</h2>'+pill('Substituição registrada','green')+facts([['Unidade recebida',equipment(o)],['Substituta',deliveryEquipment(o)],['Destino da antiga',t.destination==='retida_assistencia'?'Retida na assistência':'Devolvida ao cliente'],['Origem da substituta',t.source==='estoque'?'Estoque':'Externa'],['Data',stamp(t.when)],['Motivo',t.reason]])+(warrantyCostAllowed()?facts([['Custo interno',t.cost===null?'Não informado':brl(t.cost)],['Produto de estoque',t.sku||'Não se aplica']]):'')+'<p class="note">A entrada original foi preservada. A substituta mantém a garantia de origem, sem reiniciar o prazo.</p></section>';
 return '<section class="panel form-section"><h2>Troca em garantia</h2><p>Registre a nova unidade física e o destino da antiga. A operação não gera cobrança.</p>'+(blocker?'<p class="note warn">'+esc(blocker)+'</p>':can('settings')?button('Registrar troca','modal:warrantySwap:'+o.id,'btn primary'):'<p class="muted">Aguardando responsável autorizado.</p>')+'</section>';
}
function warrantySwapLive(){
 const f=$('#action-form');if(!f||f.dataset.kind!=='warrantySwap')return;
 const stock=f.elements.source.value==='estoque';
 $('#swap-stock').hidden=!stock;f.elements.sku.required=stock;f.elements.sku.disabled=!stock;
 $('#swap-external').hidden=stock;f.elements.cost.disabled=stock;
}
document.addEventListener('change',e=>{if(e.target.form?.dataset.kind==='warrantySwap')warrantySwapLive()});
function warrantyModal(kind,o,id){
 if(!o.origin||!BancadaWarranty.binding(o,db.orders)||o.status==='Cancelado')return null;
 const a=BancadaWarranty.assessment(o);
 if(kind==='warrantySwap'&&can('settings')){
   try{BancadaWarranty.swapEligibility(o,db.orders)}catch{return null}
   return ['Registrar troca em garantia','<p class="note">Entrada preservada: '+esc(equipment(o))+'</p><input type="hidden" name="assessment" value="'+a.id+'">'+select('Origem da substituta','source',[['','Selecione'],['externa','Externa'],['estoque','Estoque']],'','required')+'<div id="swap-stock" hidden>'+select('Produto de estoque','sku',[['','Selecione'],...db.stock.map(p=>[p.sku,p.name+' · '+p.quantity+' disponíveis'])],'')+'</div><div id="swap-external">'+field('Custo externo (R$, opcional)','cost','','type="number" min="0" max="9999999.99" step="0.01"')+'</div>'+field('Tipo *','type',o.type||'','required maxlength="100"')+field('Marca *','brand',o.brand||'','required maxlength="100"')+field('Modelo *','model',o.model||'','required maxlength="100"')+field('Selo','seal','','maxlength="100"')+field('Série','serial','','maxlength="100"')+field('IMEI','imei','','maxlength="100"')+select('Destino da antiga','destination',[['','Selecione'],['retida_assistencia','Retida na assistência'],['devolvida_cliente','Devolvida ao cliente']],'','required')+textarea('Motivo *','reason','','required maxlength="2000"')+'<p class="note warn">Identifique outra unidade por selo, série ou IMEI. A troca preserva o prazo, não movimenta dinheiro e não pode ser repetida.</p>'+check('Confirmo a substituição física e o destino da unidade antiga.'),'Registrar troca'];
 }
 if(kind==='warrantyRefund'&&warrantyRefundAllowed()){
   let origin;try{({origin}=BancadaWarranty.refundEligibility(o,db.orders))}catch{return null}
   const s=BancadaFinance.summary(origin);if(s.total<=0)return null;
   // Native floor mirrors the domain rule (no date before the origin's financial records); handler revalidates.
   const floor=(origin.financeLedger?.events||[]).filter(e=>!String(e.type).startsWith('warranty_')&&BancadaFinance.dayValid(e.date)).map(e=>e.date).sort().at(-1)||'1900-01-01';
   const minDay=floor<=today()?floor:'1900-01-01';
   return ['Registrar devolução de garantia',facts([['OS de origem',num(origin)],['Cobrança líquida',brl(s.total)],['Recebido líquido',brl(s.paid)],['Saldo em aberto',brl(s.balance)]])+'<input type="hidden" name="assessment" value="'+a.id+'"><input type="hidden" name="key" value="'+esc(BancadaWarranty.refundKey(origin))+'">'+select('Modalidade','mode',[['','Selecione'],['parcial','Devolução parcial'],['total','Encerramento total']],'','required')+field('Valor efetivamente devolvido (R$)','amount','','type="number" min="0" max="'+s.paid/100+'" step="0.01" required')+'<p class="note" id="warranty-refund-preview" aria-live="polite">Selecione a modalidade.</p>'+field('Data real','date',today(),'type="date" min="'+minDay+'" max="'+today()+'" required')+select('Forma','method',[['','Selecione'],...BancadaFinance.methods],'','required')+field('Comprovante ou referência *','reference','','required maxlength="300"')+textarea('Motivo *','reason','','required maxlength="2000"')+'<p class="note warn">Encerramento total devolve exatamente o recebido líquido e abate toda a cobrança restante. Se nada foi recebido, o valor devolvido é zero.</p>'+check('Confirmo o registro da devolução já realizada fora do sistema (ou encerramento sem dinheiro) e o abatimento indicado.'),'Confirmar registro'];
 }
 if(kind==='warrantyRefundCorrect'&&warrantyRefundAllowed()){
   const e=BancadaWarranty.refundEvents(o).find(x=>x.id===id&&x.type==='reembolso');
   if(!e||BancadaWarranty.refundCorrected(o,id))return null;
   return ['Corrigir devolução de garantia','<input type="hidden" name="reference" value="'+e.id+'">'+facts([['Valor registrado',brl(e.amount)],['Abatimento registrado',brl(e.credit)]])+textarea('Justificativa *','reason','','required maxlength="2000"')+'<p class="note warn">Corrige um registro indevido e recompõe a cobrança original. Não movimenta dinheiro nem apaga o evento.</p>'+check('Confirmo que a devolução não ocorreu e que o registro foi lançado por engano.'),'Corrigir registro'];
 }
 if(kind==='warrantyAssess'&&can('tech')&&!BancadaWarranty.executed(o))return ['Avaliação do retorno','<input type="hidden" name="previous" value="'+(a?.id||0)+'">'+select('Cobertura','coverage',Object.entries(BancadaWarranty.coverage),a?.coverage||'avaliacao')+select('Solução','solution',Object.entries(BancadaWarranty.solutions),a?.solution||'')+textarea('Diagnóstico','diagnosis',a?.diagnosis||'','maxlength="20000"')+textarea('Justificativa *','reason','','required maxlength="10000"')+check('Confirmo a avaliação registrada.')+'<p class="note">A avaliação não executa nenhum pagamento ou movimentação.</p>','Registrar avaliação'];
 if(kind==='warrantyCost'&&warrantyCostAllowed())return ['Custo interno',field('Valor declarado (R$)','amount','0','type="number" min="0" max="9999999.99" step="0.01" required')+field('Tempo (minutos)','minutes','0','type="number" min="0" max="100000" step="1" required')+textarea('Descrição *','reason','','required maxlength="10000"')+check('Conferi o custo ou tempo declarado.'),'Registrar custo'];
 const e=BancadaWarranty.events(o).find(x=>x.id===id&&x.type==='custo');
 if(kind==='warrantyCorrect'&&warrantyCostAllowed()&&e&&!BancadaWarranty.events(o).some(x=>x.type==='corrigir_custo'&&x.reference===e.id))return ['Corrigir custo','<input type="hidden" name="reference" value="'+e.id+'">'+facts([['Registro',brl(e.amount)],['Tempo',e.minutes+' min']])+textarea('Justificativa *','reason','','required maxlength="10000"')+check('Confirmo a correção sem apagar o registro original.'),'Corrigir registro'];
 return null
}
function warrantySubmit(kind,o,d){
 const now=new Date().toISOString();
 if(kind==='warrantySwap'&&can('settings')){let cost=null;if(d.source==='externa'&&d.cost){if(!/^\d+(?:[.,]\d{1,2})?$/.test(d.cost))throw Error('Informe um custo externo válido.');cost=Math.round(Number(d.cost.replace(',','.'))*100)}BancadaWarranty.swap(o,db.orders,db.stock,{...d,cost},now,role);event(o,'Garantia: substituição física registrada');return}
 if(kind==='warrantyRefund'&&warrantyRefundAllowed()){
   if(!/^\d+(?:[.,]\d{1,2})?$/.test(d.amount))throw Error('Informe valor válido com até dois centavos.');
   const [whole,frac='']=d.amount.replace(',','.').split('.');
   const e=BancadaWarranty.refund(o,db.orders,{...d,amount:Number(whole)*100+Number(frac.padEnd(2,'0'))},now,today(),role);
   event(o,'Garantia: devolução registrada na origem '+num({id:e.origin}));return;
 }
 if(kind==='warrantyRefundCorrect'&&warrantyRefundAllowed()){BancadaWarranty.correctRefund(o,db.orders,d,now,role);event(o,'Garantia: registro de devolução corrigido');return}
 if(kind==='warrantyAssess'&&can('tech')){BancadaWarranty.assess(o,db.orders,d,now,role);event(o,'Garantia: avaliação registrada');return}
 if(kind==='warrantyCost'&&warrantyCostAllowed()){
   if(!/^\d+(?:[.,]\d{1,2})?$/.test(d.amount)||!/^\d+$/.test(d.minutes))throw Error('Informe custo interno ou tempo de trabalho válido.');
   const [whole,frac='']=d.amount.replace(',','.').split('.');
   BancadaWarranty.cost(o,db.orders,{...d,amount:Number(whole)*100+Number(frac.padEnd(2,'0')),minutes:Number(d.minutes)},now,role);return
 }
 if(kind==='warrantyCorrect'&&warrantyCostAllowed()){BancadaWarranty.correctCost(o,db.orders,d,now,role);return}
 throw Error('Ação indisponível neste perfil.');
}
