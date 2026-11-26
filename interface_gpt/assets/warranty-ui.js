'use strict';
// R07-001: private warranty workspace. No real authentication or financial movement.
const warrantyKinds=['warrantyAssess','warrantyCost','warrantyCorrect'];
const warrantyCostAllowed=()=>can('settings'); // conservative demo mapping of distinct native cost permissions
function warrantyRef(o){try{return BancadaWarranty.reference(o,db.orders)}catch{return null}}
function warrantyPeriod(w){if(!w)return 'Referência indisponível';if(w.days===null)return 'Prazo não informado';if(!w.days)return 'Sem prazo concedido';return date(w.end)+(w.end<today()?' · Prazo expirado':' · Dentro do prazo')}
function warrantyBase(o){return BancadaWarranty.lastFinalized(o,db.orders)||o}
function warrantyReturnLink(o){
 const base=warrantyBase(o),w=warrantyRef(base);if(!can('return')||!w)return '';
 const a=BancadaWarranty.active(base,db.orders);
 return a?link('Abrir retorno em andamento '+num(a),'#os/'+a.id+'/garantia','btn'):link('Registrar retorno','#retorno/'+base.id,'btn');
}
function warrantySummary(o){
 const w=BancadaWarranty.binding(o,db.orders)||warrantyRef(o);
 return '<section class="panel form-section"><h2>Garantia</h2>'+(o.origin?'<p>'+link('OS de origem '+num({id:o.origin}),'#os/'+o.origin,'btn ghost')+'</p>'+pill(o.coverage||'Em avaliação','amber'):'<p class="muted">'+(o.conclusion?'Conclusão em '+date(o.conclusion):'Prazo depende da conclusão real.')+'</p>')+(w?'<p class="small">'+esc(warrantyPeriod(w))+'</p>':'')+link('Ver garantia e retornos','#os/'+o.id+'/garantia','btn ghost')+warrantyReturnLink(o)+'</section>';
}
function warrantyPanel(o){
 const w=BancadaWarranty.binding(o,db.orders)||warrantyRef(o),a=BancadaWarranty.assessment(o),ev=BancadaWarranty.events(o),c=BancadaWarranty.costs(o);
 const related=db.orders.filter(x=>x.origin&&BancadaWarranty.same(x,o));
 const canAssess=o.origin&&w&&o.status!=='Cancelado'&&can('tech')&&!BancadaWarranty.executed(o);
 const visible=ev.filter(e=>e.type==='avaliar'||warrantyCostAllowed());
 const history=visible.slice().reverse().map(e=>'<li><strong>'+esc(e.type==='avaliar'?'Avaliação '+BancadaWarranty.coverage[e.coverage]:e.type==='custo'?'Custo interno declarado':'Correção de custo')+'</strong><small>'+esc(stamp(e.when))+' · '+esc(e.actor)+'</small>'+(e.type==='avaliar'?facts([['Solução',BancadaWarranty.solutions[e.solution]],['Diagnóstico',e.diagnosis],['Justificativa',e.reason]]):facts([['Valor',brl(e.amount)],['Tempo',e.minutes+' min'],['Descrição',e.reason]])+(e.type==='custo'&&o.status!=='Cancelado'&&!ev.some(x=>x.type==='corrigir_custo'&&x.reference===e.id)?button('Corrigir registro','modal:warrantyCorrect:'+o.id+':'+e.id):''))+'</li>').join('');
 return '<div class="stack"><div class="grid split"><section class="panel form-section"><div class="section-head"><h2>Referência original</h2>'+pill(o.origin?'Retorno':'Atendimento original','blue')+'</div>'+(w?facts([['OS de origem',num({id:w.root})],['Atendimento anterior',num({id:w.previous})],['Conclusão original',date(w.conclusion)],['Prazo original',w.days===null?'Não informado':w.days+' dias'],['Vencimento',warrantyPeriod(w)]]):'<p class="muted">Conclusão e identificação da unidade são necessárias.</p>')+'<p class="note">Prazo é referência temporal; não determina cobertura. Um retorno não concede nova garantia.</p>'+warrantyReturnLink(o)+(o.origin?link('Consultar origem','#os/'+o.origin,'btn ghost'):'')+'</section>'+(o.origin?'<section class="panel form-section"><h2>Avaliação da cobertura</h2>'+pill(o.coverage||'Em avaliação',a?.coverage==='coberto'?'green':'amber')+facts([['Solução',BancadaWarranty.solutions[a?.solution||'']],['Diagnóstico',a?.diagnosis],['Justificativa',a?.reason]])+(canAssess?button(a?'Revisar avaliação':'Registrar avaliação','modal:warrantyAssess:'+o.id,'btn primary'):'')+(a?.solution==='novo_orcamento'&&can('finance')?link('Abrir orçamento do retorno','#os/'+o.id+'/orcamento','btn'):'')+(['troca','devolucao_valor'].includes(a?.solution)?'<p class="note warn">Decisão registrada. A execução desta solução será disponibilizada na próxima etapa do protótipo; nenhum valor ou estoque foi movimentado.</p>':'')+'<p class="small">Avaliar não executa cobrança, troca ou devolução.</p></section>':'<section class="panel form-section"><h2>Histórico de retornos</h2><p class="small">Cada entrada cria uma OS distinta para a mesma unidade.</p>'+list(related)+'</section>')+'</div>'+(o.origin&&warrantyCostAllowed()?'<section class="panel form-section"><h2>Custos internos declarados</h2>'+facts([['Custo líquido neste retorno',brl(c.amount)],['Tempo de trabalho',c.minutes+' min']])+ '<p class="note">Não são cobrança, despesa paga ou movimentação de estoque.</p>'+(o.status!=='Cancelado'?button('Registrar custo','modal:warrantyCost:'+o.id,'btn'):'')+'</section>':'')+(o.origin?'<section class="panel form-section"><h2>Histórico privado da garantia</h2>'+(history?'<ol class="timeline">'+history+'</ol>':'<p class="muted">Nenhuma avaliação registrada.</p>')+'</section><section class="panel form-section"><h2>Atendimentos da unidade</h2>'+list(related)+'</section>':'')+'</div>';
}
function warrantyModal(kind,o,id){
 if(!o.origin||!BancadaWarranty.binding(o,db.orders)||o.status==='Cancelado')return null;
 const a=BancadaWarranty.assessment(o);
 if(kind==='warrantyAssess'&&can('tech')&&!BancadaWarranty.executed(o))return ['Avaliação do retorno','<input type="hidden" name="previous" value="'+(a?.id||0)+'">'+select('Cobertura','coverage',Object.entries(BancadaWarranty.coverage),a?.coverage||'avaliacao')+select('Solução','solution',Object.entries(BancadaWarranty.solutions),a?.solution||'')+textarea('Diagnóstico','diagnosis',a?.diagnosis||'','maxlength="20000"')+textarea('Justificativa *','reason','','required maxlength="10000"')+check('Confirmo a avaliação registrada.')+'<p class="note">A avaliação não executa nenhum pagamento ou movimentação.</p>','Registrar avaliação'];
 if(kind==='warrantyCost'&&warrantyCostAllowed())return ['Custo interno',field('Valor declarado (R$)','amount','0','type="number" min="0" max="9999999.99" step="0.01" required')+field('Tempo (minutos)','minutes','0','type="number" min="0" max="100000" step="1" required')+textarea('Descrição *','reason','','required maxlength="10000"')+check('Conferi o custo ou tempo declarado.'),'Registrar custo'];
 const e=BancadaWarranty.events(o).find(x=>x.id===id&&x.type==='custo');
 if(kind==='warrantyCorrect'&&warrantyCostAllowed()&&e&&!BancadaWarranty.events(o).some(x=>x.type==='corrigir_custo'&&x.reference===e.id))return ['Corrigir custo','<input type="hidden" name="reference" value="'+e.id+'">'+facts([['Registro',brl(e.amount)],['Tempo',e.minutes+' min']])+textarea('Justificativa *','reason','','required maxlength="10000"')+check('Confirmo a correção sem apagar o registro original.'),'Corrigir registro'];
 return null
}
function warrantySubmit(kind,o,d){
 const now=new Date().toISOString();
 if(kind==='warrantyAssess'&&can('tech')){BancadaWarranty.assess(o,db.orders,d,now,role);event(o,'Garantia: avaliação registrada');return}
 if(kind==='warrantyCost'&&warrantyCostAllowed()){
   if(!/^\d+(?:[.,]\d{1,2})?$/.test(d.amount)||!/^\d+$/.test(d.minutes))throw Error('Informe custo interno ou tempo de trabalho válido.');
   const [whole,frac='']=d.amount.replace(',','.').split('.');
   BancadaWarranty.cost(o,db.orders,{...d,amount:Number(whole)*100+Number(frac.padEnd(2,'0')),minutes:Number(d.minutes)},now,role);return
 }
 if(kind==='warrantyCorrect'&&warrantyCostAllowed()){BancadaWarranty.correctCost(o,db.orders,d,now,role);return}
 throw Error('Ação indisponível neste perfil.');
}
