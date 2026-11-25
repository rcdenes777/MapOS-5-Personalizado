'use strict';
let financialFilter='all',financialQuery='';
const financialLabels={all:'Todas as cobranças',open:'A vencer / sem data',overdue:'Vencidas',paid:'Quitadas'};
const canReverse=()=>role==='Administrador'; // conservative simulated permission
function financialRows(o){
 const l=BancadaFinance.init(o);
 const rows=l.events.slice().reverse().map(e=>{
 const reversed=e.type==='receive'?BancadaFinance.reversed(o,e.id):null;
 return '<article class="finance-event"><div><div class="pills">'+pill(e.type==='refund'?'Devolução registrada':e.type==='reverse'?(e.rectification?'Retificação financeira':'Estorno de registro'):reversed?'Recebimento estornado':'Recebimento',e.type==='refund'||e.type==='reverse'||reversed?'amber':'green')+'</div><strong class="money">'+(['reverse','refund'].includes(e.type)?'− ':'')+brl(e.amount)+'</strong><p class="small">'+esc(date(e.date))+' · '+esc(e.method)+' · Registro #'+e.id+'</p>'+(e.type==='reverse'?'<p class="small">Referência #'+e.reference+' · '+esc(e.reason)+'</p>':e.type==='refund'?'<p class="small">Comprovante: '+esc(e.reference)+'</p>':'')+'</div>'+(e.type==='receive'?'<div class="actions">'+link('Recibo','#recibo/'+o.id+'/'+e.id,'btn','print')+(!reversed&&canReverse()&&BancadaFinance.allowsReverse(o)?button('Estornar registro','modal:reverse:'+o.id+':'+e.id,'btn danger'):!reversed&&canReverse()&&o.status==='Cancelado'&&o.total>0&&BancadaFinance.cancellation(o)&&!BancadaFinance.events(o).some(x=>x.type==='refund')?button('Retificar recebimento','modal:rectify:'+o.id+':'+e.id,'btn danger'):'')+'</div>':'')+'</article>';
 }).join('');
 return (l.opening?'<div class="note"><strong>Valor recebido anteriormente: '+brl(l.opening)+'</strong><br>Saldo preservado da demonstração anterior, sem detalhes de recibo. Não há registro individual para estornar.</div>':'')+(rows||(!l.opening?'<p class="muted">Nenhum recebimento registrado.</p>':''));
}
function financialPanel(o){
 if(!can('finance'))return denied();
 const s=BancadaFinance.summary(o),cat=BancadaFinance.category(o,today());
 return '<div class="grid split finance-order"><section class="panel form-section"><div class="section-head"><h2>Recebimentos e correções</h2>'+(s.balance>0&&BancadaFinance.allowsReceive(o)?button('Registrar pagamento','modal:pay:'+o.id,'btn primary'):'')+'</div>'+financialRows(o)+'</section><div class="stack"><section class="panel form-section"><h2>Resumo da cobrança</h2>'+pill(moneyStatus(o),s.total&&!s.balance?'green':s.total?'amber':'')+facts([['Total cobrado',brl(s.total)],['Recebido líquido',brl(s.paid)],['Saldo',brl(s.balance)],['Vencimento',s.due?date(s.due):'Não informado']])+(cat==='overdue'?'<p class="note warn">Cobrança vencida.</p>':'')+(!s.total&&o.status!=='Cancelado'?link('Preparar ou formalizar cobrança','#os/'+o.id+'/orcamento','btn'):'')+'<p class="small">O estorno corrige um lançamento. Não devolve dinheiro ao cliente nem altera o valor devido.</p></section></div></div>';
}
function financeList(){
 const q=financialQuery.trim().toLocaleLowerCase('pt-BR');
 const rows=db.orders.filter(o=>(o.total>0||o.billing)&&(financialFilter==='all'||BancadaFinance.category(o,today())===financialFilter)&&[num(o),o.id,client(o).name,equipment(o)].some(v=>String(v).toLocaleLowerCase('pt-BR').includes(q))).sort((a,b)=>{const sa=BancadaFinance.summary(a),sb=BancadaFinance.summary(b);return (sa.due||'9999').localeCompare(sb.due||'9999')||b.id-a.id});
 return '<p class="small">'+plural(rows.length,'cobrança','cobranças')+'</p><div class="list">'+(rows.length?rows.map(o=>{const s=BancadaFinance.summary(o),cat=BancadaFinance.category(o,today());return '<a class="finance-list-row" href="#os/'+o.id+'/financeiro"><div><span class="order-id">'+num(o)+'</span><strong>'+esc(client(o).name)+'</strong><small>'+esc(equipment(o))+'</small></div><div><span class="small">Vencimento</span><strong>'+esc(s.due?date(s.due):'Não informado')+'</strong>'+pill(cat==='overdue'?'Vencida':moneyStatus(o),cat==='overdue'?'red':cat==='paid'?'green':'amber')+'</div><div class="finance-balance"><span class="small">Saldo</span><strong class="money">'+brl(s.balance)+'</strong><small>Total '+brl(s.total)+'</small></div>'+icon('arrow')+'</a>'}).join(''):'<div class="empty">Nenhuma cobrança nesta seleção.</div>')+'</div>';
}
function financialHome(){
 if(!can('finance'))return denied();
 const a=BancadaFinance.aggregate(db.orders,today());
 const metric=(label,value,detail)=>'<div class="stat"><label>'+label+'</label><strong class="money">'+brl(value)+'</strong><small>'+detail+'</small></div>';
 return head('Contas da oficina','Financeiro','Acompanhe cobranças e recebimentos vinculados às ordens de serviço.')+'<div class="finance-metrics">'+metric('A receber',a.balance,plural(a.count,'cobrança com saldo','cobranças com saldo'))+metric('Vencido',a.overdue,'Saldo com vencimento anterior a hoje')+metric('Recebido líquido',a.paid,'Recebimentos menos estornos e devoluções')+metric('Total cobrado',a.total,'Obrigações registradas')+'</div><section class="panel form-section"><div class="section-head"><h2>Contas a receber</h2></div><div class="search"><input id="finance-search" type="search" aria-label="Buscar cobranças" placeholder="OS, cliente ou equipamento" value="'+esc(financialQuery)+'"><label class="field">Situação<select id="finance-filter">'+Object.entries(financialLabels).map(([k,l])=>'<option value="'+k+'" '+(financialFilter===k?'selected':'')+'>'+l+'</option>').join('')+'</select></label></div><div id="finance-results">'+financeList()+'</div></section><p class="small" style="margin-top:12px">Demonstração das cobranças de OS. Não representa fluxo de caixa, despesas ou conciliação bancária.</p>';
}
function financialModal(kind,o,eventId){
 const s=BancadaFinance.summary(o);
 if(kind==='pay'){
 if(!s.balance||!BancadaFinance.allowsReceive(o))return null;
 return ['Registrar pagamento','<p class="note">Saldo atual: '+brl(s.balance)+'</p>'+field('Valor (R$)','amount','','type="number" min="0.01" max="'+s.balance/100+'" step="0.01" required')+field('Data','date',today(),'type="date" required')+select('Forma','method',BancadaFinance.methods),'Confirmar'];
 }
 if(kind==='reverse'||kind==='rectify'){
 const e=BancadaFinance.receipt(o,eventId);
 if(!canReverse()||!e||BancadaFinance.reversed(o,eventId)||(kind==='reverse'?!BancadaFinance.allowsReverse(o):o.status!=='Cancelado'||!BancadaFinance.cancellation(o)||!o.total||BancadaFinance.events(o).some(x=>x.type==='refund')))return null;
 return [kind==='rectify'?'Retificar recebimento de OS cancelada':'Estornar registro','<p class="note warn">Corrige um recebimento registrado indevidamente. Não realiza reembolso, transferência ou devolução.</p>'+facts([['Recebimento #'+e.id,brl(e.amount)],['Data',date(e.date)],['Forma',e.method],['Saldo após correção',brl(s.balance+e.amount)]])+'<input type="hidden" name="eventId" value="'+e.id+'">'+field('Data da correção','date',today(),'type="date" min="'+e.date+'" required')+(kind==='rectify'?select('Tipo de retificação','rectification',[['','Selecione'],['lancamento_incorreto','Lançamento incorreto'],['nao_compensado','Pagamento não compensado']],'','required'):'')+textarea('Justificativa *','reason','','required maxlength="500"')+check('Confirmo a correção do registro, sem movimentar dinheiro.'),'Confirmar estorno'];
 }
 return null;
}
function financialSubmit(kind,o,d){
 const now=new Date().toISOString();
 if(kind==='pay'){
 if(!can('finance'))throw Error('Operação não autorizada ou confirmação ausente.');
 if(!/^\d+(?:\.\d{1,2})?$/.test(String(d.amount)))throw Error('Informe um valor com até duas casas decimais.');
 const e=BancadaFinance.receive(o,Math.round(Number(d.amount)*100),d.date,d.method,now);
 event(o,'Pagamento registrado · '+e.method+' · registro #'+e.id);
 }else if(kind==='reverse'||kind==='rectify'){
 if(!canReverse()||!d.confirm)throw Error('Confirme a correção autorizada.');
 const e=BancadaFinance.reverse(o,Number(d.eventId),d.date,d.reason,now,kind==='rectify'?(d.rectification||'invalid'):null,today());event(o,'Recebimento #'+e.reference+' estornado (sem devolução de dinheiro)');
 }
}
function receiptView(o,id){
 if(!can('finance'))return denied();
 const e=BancadaFinance.receipt(o,id);if(!e)return denied();
 const reversal=BancadaFinance.reversed(o,id);
 return head('Documento','Recibo de recebimento','Prévia de demonstração, sem validade comercial.',link('Voltar','#os/'+o.id+'/financeiro','btn','back')+button('Imprimir','print','btn primary','print'))+'<article class="print-sheet receipt"><p class="eyebrow">Minha oficina · Demonstração</p><h2>Recibo #'+o.id+' / '+e.id+'</h2>'+(reversal?'<p class="note warn"><strong>ESTORNADO</strong> em '+date(reversal.date)+' — registro corrigido, sem reembolso bancário.</p>':'<p>Recebimento registrado</p>')+'<p class="receipt-amount money">'+brl(e.amount)+'</p><hr>'+facts([['OS',num(o)],['Cliente',client(o).name],['Equipamento',equipment(o)],['Data do recebimento',date(e.date)],['Forma',e.method]])+'<hr><p class="small">Protótipo — sem validade comercial. Não comprova movimentação bancária.</p></article>';
}
document.addEventListener('input',e=>{if(e.target.id==='finance-search'){financialQuery=e.target.value;$('#finance-results').innerHTML=financeList()}});
document.addEventListener('change',e=>{if(e.target.id==='finance-filter'){financialFilter=e.target.value;$('#finance-results').innerHTML=financeList()}});
