const { chromium } = require('/home/dragonblue/workspace/interface-gpt-lab/tools/node_modules/playwright');
const {guardLab}=require('./guard.cjs');
const fs = require('fs');
const users = JSON.parse(fs.readFileSync('/home/dragonblue/workspace/mapos-r08-006-native-lab/private/users.json', 'utf8'));
const base = 'http://127.0.0.1:18130';
(async () => {
  const browser = await chromium.launch({headless: true});
  const results = [];
  try {
    for (const [role, user] of Object.entries(users)) {
      const context = await browser.newContext();
      const page = await context.newPage();
      await guardLab(page);
      await page.locator('#email').fill(user.email);
      await page.locator('#senha').fill(user.password);
      await page.locator('#btn-acessar').click();
      await page.waitForTimeout(1300);
      const url = new URL(page.url()).pathname;
      const text = await page.locator('body').innerText();
      const login = url === '/index.php/mapos' && !/usuário ou senha inválid|credenciais inválid/i.test(text);
      const nav = [];
      for (const path of ['/index.php/os','/index.php/clientes','/index.php/financeiro','/index.php/usuarios']) {
        const r = await page.goto(base + path, {waitUntil:'domcontentloaded'});
        const body = await page.locator('body').innerText();
        nav.push({path,status:r.status(),denied:/não tem permissão|não possui permissão|permissão para acessar|acesso negado/i.test(body),loginRedirect:new URL(page.url()).pathname.includes('/login')});
      }
      results.push({role,login,loginPath:url,nav});
      await context.close();
    }
  } finally { await browser.close(); }
  console.log(JSON.stringify(results,null,2));
  fs.writeFileSync('/home/dragonblue/workspace/mapos-r08-006-native-lab/runtime/login-results.json', JSON.stringify(results,null,2));
  const expected = {admin:[false,false,false,false],tecnico:[false,false,true,true],atendente:[false,false,true,true],financeiro:[false,false,false,true]};
  if(results.some(r=>!r.login || r.nav.some((n,i)=>n.status!==200 || n.loginRedirect || n.denied!==expected[r.role][i]))) process.exitCode=1;
})().catch(e=>{ console.error(e.message); process.exitCode=1; });
