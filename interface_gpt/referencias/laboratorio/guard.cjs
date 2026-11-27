// Fail closed before sending credentials or changing synthetic state.
const fs=require('fs');const {execFileSync}=require('child_process');const assert=require('assert/strict');
const base='http://127.0.0.1:18130';
const socket='/home/dragonblue/workspace/mapos-r08-006-native-lab/runtime/socket/web.sock';
async function guardLab(page){
  const state=execFileSync('systemctl',['--user','show','mapos-native-lab-proxy.service','-p','ActiveState','-p','MainPID','--value'],{encoding:'utf8'}).trim().split('\n');
  // systemd outputs properties in its own order, so identify by shape rather than position.
  assert.ok(state.includes('active'),'lab proxy is not active');
  const pid=state.find(v=>/^\d+$/.test(v) && Number(v)>1);assert.ok(pid,'lab proxy PID absent');
  const args=fs.readFileSync('/proc/'+pid+'/cmdline','utf8').split('\0').filter(Boolean);
  assert.equal(args[0],'/usr/bin/socat');
  assert.ok(args.includes('TCP-LISTEN:18130,bind=127.0.0.1,reuseaddr,fork'));
  assert.ok(args.includes('UNIX-CONNECT:'+socket));
  const st=fs.statSync(socket);assert.ok(st.isSocket());assert.equal(st.uid,process.getuid());
  const dir=fs.statSync(require('path').dirname(socket));assert.equal(dir.mode & 0o077,0,'socket directory must be private');
  const r=await page.request.get(base+'/index.php/login',{maxRedirects:0});
  assert.equal(r.status(),200);assert.equal(r.headers()['x-mapos-lab'],'synthetic-native-isolated','unrecognized lab');
  const login=await page.goto(base+'/index.php/login');
  assert.equal(page.url(),base+'/index.php/login','login redirected to an unexpected target');
  assert.equal(login.status(),200);assert.equal(login.headers()['x-mapos-lab'],'synthetic-native-isolated');
  const action=await page.locator('#senha').evaluate(el=>el.form && el.form.action);
  assert.equal(new URL(action).origin,base,'login form targets an unexpected origin');
}
module.exports={guardLab};
