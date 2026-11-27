#!/usr/bin/env python3
"""Targeted isolated mutation probes; never modifies the checkout."""
import hashlib,json,os,pathlib,shutil,subprocess,tempfile
root=pathlib.Path(__file__).resolve().parents[4]
# root = interface_gpt; ensure the expected sources are present.
assets=root/'assets'; tests=root/'tests'
assert (assets/'stock.js').is_file() and (tests/'stock.cjs').is_file(), root
cases=[
 ('M01','stock.js','ensure(p.quantity>=d.quantity,','ensure(true,','stock.cjs','link insufficient leaves state'),
 ('M02','stock.js','d.expected===orderKey(o,stock)','true','stock.cjs','link stale replay'),
 ('M03','stock.js','e.osId!==os','false','stock.cjs','foreign OS and warranty movement not proof'),
 ('M04','stock.js','e.lineId!==line','false','stock.cjs','foreign line debit is not proof'),
 ('M05','stock.js','e.sku!==p.sku','false','stock.cjs','foreign SKU debit is not proof'),
 ('M06','stock.js','outstanding>=i.quantity','outstanding>=quantity','stock.cjs','partial proof for processed quantity cannot justify return of a larger line'),
 ('M07','stock.js',"disposition==='unused'&&outstanding>=i.quantity","outstanding>=i.quantity",'stock.cjs','consumption never increases stock and retains cost'),
 ('M08','stock.js','stockCost:c','stockCost:null','stock.cjs','link debit and immutable cost'),
 ('M09','app.js',"if(!can('settings')||!d.confirm)throw Error('Confirme a operação autorizada.');","if(!d.confirm)throw Error('Confirme a operação autorizada.');",'stock-ui.cjs','denied roles cannot perform otherwise valid stock exit'),
 ('M10','portal.js','items:v.items.map(i=>({type:i.type,name:i.name,quantity:i.quantity,unit:i.unit}))','items:v.items.map(i=>({...i}))','stock.cjs','public snapshot allowlist excludes stock identity/cost'),
 ('M11','cancel.js','const draft=copy(o),request=requestId(draft)','const draft=o,request=requestId(draft)','line-identity.cjs','no request rejects without initializing cancellation'),
 ('M12','cancel.js','BancadaQuote.sync(draft);','void 0;','stock.cjs','invalid sibling row cannot partially remove a linked item'),
]
results=[]
with tempfile.TemporaryDirectory(prefix='r08005-mut-',dir=os.environ['TMPDIR']) as tmp:
 d=pathlib.Path(tmp); shutil.copytree(assets,d/'assets');shutil.copytree(tests,d/'tests')
 for suite in {c[4] for c in cases}:
  r=subprocess.run(['node',str(d/'tests'/suite)],capture_output=True,text=True)
  if r.returncode: raise SystemExit('baseline failed: '+suite+' '+r.stderr)
 for ident,file,old,new,suite,expected in cases:
  target=d/'assets'/file; original=target.read_text(); count=original.count(old)
  if count!=1:
   results.append({'id':ident,'status':'invalid','anchor_count':count});continue
  target.write_text(original.replace(old,new,1))
  r=subprocess.run(['node',str(d/'tests'/suite)],capture_output=True,text=True)
  text=r.stdout+r.stderr
  status='detected' if r.returncode!=0 and expected in text else 'survived' if r.returncode==0 else 'inconclusive'
  results.append({'id':ident,'status':status,'suite':suite,'expected':expected,'exit':r.returncode,'output':text[-1600:]})
  target.write_text(original)
  assert hashlib.sha256(target.read_bytes()).hexdigest()==hashlib.sha256(original.encode()).hexdigest()
summary={s:sum(x['status']==s for x in results) for s in ['detected','survived','invalid','inconclusive']}
out=pathlib.Path(__file__).with_name('mutacoes-direcionadas.json');out.write_text(json.dumps({'summary':summary,'results':results},indent=2,ensure_ascii=False)+'\n')
print(json.dumps(summary,ensure_ascii=False));raise SystemExit(0 if summary['detected']==len(cases) else 1)
