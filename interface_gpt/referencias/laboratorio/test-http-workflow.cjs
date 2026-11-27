// Synthetic lab HTTP workflow; no Docker or privileged commands.
const {guardLab}=require('./guard.cjs');
const {chromium}=require('/home/dragonblue/workspace/interface-gpt-lab/tools/node_modules/playwright');
const fs=require('fs');const assert=require('assert/strict');
const root='/home/dragonblue/workspace/mapos-r08-006-native-lab';
const user=JSON.parse(fs.readFileSync(root+'/private/users.json','utf8')).admin;
const base='http://127.0.0.1:18130';
async function send(page, selector, values={}) {
  return page.evaluate(async ({selector,values})=>{
    const f=document.querySelector(selector);if(!f)throw Error('Required form not found: '+selector);
    const data=new FormData(f);for(const [k,v] of Object.entries(values))data.set(k,v);
    const r=await fetch(f.action,{method:'POST',body:data,redirect:'follow'});
    const text=await r.text();return {status:r.status,path:new URL(r.url).pathname,text};
  },{selector,values});
}
function stock(body){const m=body.match(/Saldo atual:\s*(\d+)/);if(!m)throw Error('Stock balance not visible');return Number(m[1]);}
(async()=>{const browser=await chromium.launch({headless:true});try{const p=await browser.newPage();
await guardLab(p);await p.locator('#email').fill(user.email);await p.locator('#senha').fill(user.password);await p.locator('#btn-acessar').click();await p.waitForURL('**/index.php/mapos');
await p.goto(base+'/index.php/os/adicionar');const date=await p.locator('[name=dataInicial]').inputValue();assert.match(date,/^\d{4}-\d\d-\d\d$/);
const marker='LAB-WORKFLOW-'+Date.now();
let r=await send(p,'form[action$="/os/adicionar"]',{cliente:'Cliente Fictício Alfa',clientes_id:'1',tecnico:'Administrador laboratório',usuarios_id:'1',status:'Aberto',dataInicial:date,dataFinal:date,garantia:'90',descricaoProduto:marker,defeito:'Teste sintetico',equipamento_modo:'existente',equipamento_id:''});
assert.equal(r.status,200);assert.match(r.path,/^\/index\.php\/os\/visualizar\/\d+$/);assert.match(r.text,/OS #\d+ criada/);const os=Number(r.path.split('/').pop());
await p.goto(base+r.path);assert.ok((await p.locator('body').innerText()).includes(marker),'OS did not survive reload');
await p.goto(base+'/index.php/trifase_estoque/produto/1');const before=stock(await p.locator('body').innerText());
r=await send(p,'form:has(#campo-quantidade)',{tipo:'entrada',quantidade:'1',custo:'50,00',data:date,motivo:'Entrada sintetica de teste',confirmar:'1'});
assert.equal(r.status,200);assert.ok(r.text.includes('Movimentação registrada com histórico.'));
await p.goto(base+'/index.php/trifase_estoque/produto/1');const after=stock(await p.locator('body').innerText());assert.equal(after,before+1);
const cancelPage=base+'/index.php/trifase_cancelamentos/visualizar/'+os;
await p.goto(cancelPage);r=await send(p,'form[action*="/trifase_cancelamentos/solicitar/"]',{origem:'cliente',motivo:'Pedido sintetico de teste'});assert.equal(r.status,200);assert.ok(r.text.includes('Pedido registrado.'));
await p.goto(cancelPage);r=await send(p,'form[action*="/trifase_cancelamentos/tecnica/"]',{observacoes_tecnicas:'Conferencia sintetica'});assert.equal(r.status,200);assert.ok(r.text.includes('Conferência técnica registrada.'));
await p.goto(cancelPage);r=await send(p,'form[action*="/trifase_cancelamentos/confirmar/"]',{valor_devido:'0,00',desconto:'0,00',conferencia:'Conferencia sintetica',financeiro_conferido:'1',confirmar:'1'});assert.equal(r.status,200);assert.ok(r.text.includes('Cancelamento confirmado após as conferências técnica e financeira'));
await p.goto(base+'/index.php/os/visualizar/'+os);assert.match(await p.locator('body').innerText(),/Cancelado/);
console.log(JSON.stringify({login:'PASS',os,createdAndReloaded:true,stockBefore:before,stockAfter:after,cancellation:'Cancelado after reload'}));
}finally{await browser.close()}})().catch(e=>{console.error(e.message);process.exitCode=1});
