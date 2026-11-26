'use strict';
/* R06-002 — capturas específicas do handler bloqueado (desktop e mobile). */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { launch, session, goto, open, closeModal, requestCancel, actionCount } = require('./lib.cjs');

const OUT = path.resolve(__dirname, '..');
const DIR = path.join(OUT, 'capturas', 'handler');

async function shot(page, name) {
  const file = path.join(DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false, animations: 'disabled' });
  return { file: path.relative(OUT, file), sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'), bytes: fs.statSync(file).size };
}

(async () => {
  const browser = await launch();
  const shots = [];
  try {
    for (const [w, h, id, label] of [[1440, 900, 22, 'desktop-1440'], [390, 844, 23, 'mobile-390']]) {
      const { ctx, a } = await session(browser, w, h, 'r06b-shot-' + id);
      const st = await requestCancel(a, id, 'cliente', 'Pedido pendente para captura R06-002.');
      if (st.open) throw new Error('pedido de cancelamento não registrou na OS ' + id);
      if (!(await actionCount(a, `modal:tech:${id}`))) throw new Error('ação de andamento ausente na OS ' + id);
      if (!(await open(a, 'tech', id))) throw new Error('modal de andamento não abriu na OS ' + id);
      await a.selectOption('#action-form select[name=status]', 'Finalizado');
      await a.check('#action-form input[name=confirm]');
      await a.locator('#action-form button[type=submit]').click();
      await a.waitForTimeout(900);
      const toast = await a.evaluate(() => {
        const t = document.querySelector('#toast');
        return t && !t.hidden ? t.textContent : '';
      });
      if (toast !== 'Resolva ou retire o pedido de cancelamento antes de finalizar a OS.') throw new Error('mensagem inesperada: ' + toast);
      shots.push(await shot(a, `tech-finalizado-bloqueado-${label}`));
      const toastFile = path.join(DIR, `toast-bloqueio-${label}.png`);
      await a.locator('#toast').screenshot({ path: toastFile, animations: 'disabled' });
      shots.push({ file: path.relative(OUT, toastFile), sha256: crypto.createHash('sha256').update(fs.readFileSync(toastFile)).digest('hex'), bytes: fs.statSync(toastFile).size, element: '#toast' });
      await closeModal(a);
      await ctx.close();
    }
    fs.mkdirSync(path.join(OUT, 'testes'), { recursive: true });
    fs.writeFileSync(path.join(OUT, 'testes', 'capturas-handler.json'), JSON.stringify({
      generatedAt: new Date().toISOString(), codeSha: process.env.CODE_SHA || '', shots
    }, null, 2));
    console.log(`SHOTS ${shots.length}`);
    for (const s of shots) console.log(s.file, s.sha256.slice(0, 16), s.bytes);
  } finally {
    await browser.close();
  }
})().catch(e => { console.error('FATAL', e); process.exit(1); });
