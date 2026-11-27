// Run: node tests/stock-ui.cjs (DOM stub, not a browser).
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=['quote.js','stock.js','portal.js','quote-ui.js','finance.js','finance-ui.js','cancel.js','cancel-ui.js','warranty.js','warranty-ui.js','app.js'].map(f=>fs.readFileSync(path.join(__dirname,'../assets',f),'utf8')).join('\n');
const nodes=new Map(),document={querySelector(k){if(k==='#new-form')return null;if(!nodes.has(k))nodes.set(k,{innerHTML:'',textContent:'',focus(){}});return nodes.get(k)},addEventListener(){}};
const context={document,window:{addEventListener(){},scrollTo(){}},location:{hash:'#inicio'},localStorage:{getItem(){return null},setItem(){}}};
const checks=`
let count=0;const ok=v=>{if(!v)throw Error('Assertion failed')},eq=(a,b)=>ok(a===b),test=(n,f)=>{try{f();count++}catch(e){throw Error(n+': '+e.message)}};
const S=BancadaStock,Q=BancadaQuote,C=BancadaCancel,o=db.orders.find(x=>x.id===24),p=db.stock[0],snap=x=>JSON.stringify(x);
role='Administrador';
test('catalog and movement modal use stable SKU',()=>{ok(stock().includes('modal:stockmove:0:P-001'));db.stock.reverse();const h=stockModal('stockmove',null,'P-001')[1];ok(h.includes('name="sku" value="P-001"'));ok(h.includes('name="expected"'));db.stock.reverse()});
test('explicit catalog creation then zero-cost receipt',()=>{stockSubmit('stockcreate',null,{name:'Novo componente',min:'2',expected:S.catalogKey(db.stock),confirm:true});const n=db.stock.at(-1);eq(n.quantity,0);stockSubmit('stockmove',null,{sku:n.sku,expected:S.key(n),type:'entrada',quantity:'2',cost:'0',reason:'Entrada fictícia',confirm:true});eq(n.quantity,2);eq(n.cost,0);ok(stock().includes('Entrada fictícia'))});
test('invalid stock submit does not mutate',()=>{const before=snap(db);let err;try{stockSubmit('stockmove',null,{sku:p.sku,expected:S.key(p),type:'saida',quantity:'999',cost:'',reason:'Teste',confirm:true})}catch(e){err=e}eq(err?.message,'Saldo insuficiente ou fora do limite permitido.');eq(snap(db),before)});
test('technical and financial profiles cannot submit stock actions',()=>{for(const r of ['Técnico','Financeiro','Atendente']){role=r;const before=snap(db);eq(stockModal('stockmove',null,p.sku),null);let e;try{stockSubmit('stockmove',null,{sku:p.sku,confirm:true})}catch(err){e=err}ok(e);eq(snap(db),before)}role='Administrador'});
test('explicit linked line and guarded editor',()=>{const h=stockModal('stocklink',o)[1];ok(h.includes('baixa imediata'));stockSubmit('stocklink',o,{sku:p.sku,quantity:'3',unit:'20.00',expected:S.orderKey(o,db.stock),confirm:true});eq(p.quantity,5);const i=Q.init(o).draft.items[0],editor=quoteEditorRow(i);ok(editor.includes('name="itemId" value="'+i.lineId+'"'));ok(!editor.includes('data-quote-remove'));ok(quotePanel(o).includes('modal:stockunlink:'+o.id+':'+i.lineId));eq(o.total,0)});
test('technical cancellation returns only proof and hides cost',()=>{role='Técnico';const i=C.lines(o)[0];cancelSubmit('cancelrequest',o,{origin:'cliente',reason:'Pedido'});const h=cancelModal('cancelitem',o,i.lineId)[1];ok(h.includes('baixa comprovada para toda a linha'));ok(!h.includes('R$'));cancelSubmit('cancelitem',o,{lineId:String(i.lineId),itemKey:C.itemKey(o,i),quantity:'1',disposition:'unused',confirm:true});eq(p.quantity,6);eq(C.lines(o)[0].quantity,2);eq(stockModal('stockunlink',o,i.lineId),null)});
test('technical stock history hides cost and financial route cannot view stock',()=>{role='Técnico';ok(!stock().includes('R$'));ok(!stock().includes('Custo de referência:'));role='Financeiro';location.hash='#estoque';render();ok(!$('#main').innerHTML.includes('Histórico de movimentos'));role='Administrador'});
test('pending cancel prevents ordinary removal',()=>{const i=C.lines(o)[0];eq(stockModal('stockunlink',o,i.lineId),null);ok(!quotePanel(o).includes('modal:stockunlink:'));ok(!quotePanel(o).includes('modal:stocklink:'))});
count;
`;
console.log(vm.runInNewContext(src+'\n'+checks,context)+' stock UI checks passed.');
