const assert = require('assert/strict');
const { chromium } = require('/home/dragonblue/workspace/interface-gpt-lab/tools/node_modules/playwright');
const { guardLab } = require('./guard.cjs');

(async () => {
  const browser = await chromium.launch({headless:true});
  try {
    const page = await browser.newPage();
    await guardLab(page);
    let navigated = false;
    await assert.rejects(guardLab({request:{get:async()=>({status:()=>200,headers:()=>({})})},goto:async()=>{navigated=true;}}), /unrecognized lab/);
    assert.equal(navigated, false, 'unknown target must be rejected before browser navigation');
    const response = {status:()=>200,headers:()=>({'x-mapos-lab':'synthetic-native-isolated'})};
    await assert.rejects(guardLab({request:{get:async()=>response},goto:async()=>response,url:()=> 'http://127.0.0.1:8100/index.php/login'}), /unexpected target/);
    await assert.rejects(guardLab({request:{get:async()=>response},goto:async()=>response,url:()=> 'http://127.0.0.1:18130/index.php/login',locator:()=>({evaluate:async()=> 'http://127.0.0.1:8100/login'})}), /unexpected origin/);
    console.log('guard: live target and three negative cases PASS');
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode=1; });
