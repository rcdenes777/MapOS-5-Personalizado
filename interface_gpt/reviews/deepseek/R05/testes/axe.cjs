'use strict';
/* R05 — axe-core e teclado nas telas financeiras, recibos e portal. */
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const axe = require('axe-core');
const CHROME = process.env.CHROME_PATH || '/home/dragonblue/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8130';
const OUT = path.resolve(__dirname, '..');
const norm = s => String(s).replace(/\u00a0/g, ' ');
const results = [], scans = [];
const rec = (id, desc, ok, detail = '') => {
  const s = ok === 'INFO' ? 'INFO' : ok ? 'PASS' : 'FAIL';
  results.push({ id, desc, status: s, detail }); console.log(`${s} ${id} — ${desc} :: ${detail}`);
};
async function session(browser, w = 1440, h = 900) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: 'pt-BR' });
  const a = await ctx.newPage();
  await a.goto(BASE + '/?r05axe=' + Date.now(), { waitUntil: 'networkidle' });
  await a.evaluate(() => localStorage.clear()); await a.reload({ waitUntil: 'networkidle' });
  await a.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  return { ctx, a };
}
async function goto(a, hash) { await a.evaluate(h => { location.hash = h; }, hash); await a.waitForTimeout(250); }
async function open(a, kind, id, eventId = null) {
  const action = eventId === null ? `modal:${kind}:${id}` : `modal:${kind}:${id}:${eventId}`;
  const loc = a.locator(`[data-action="${action}"]`); if (!(await loc.count())) return false;
  await loc.last().click(); await a.waitForTimeout(180); return a.evaluate(() => document.querySelector('#modal').open);
}
async function scan(a, viewport, label) {
  const res = await a.evaluate(async () => await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }));
  const v = res.violations.map(x => ({ id: x.id, impact: x.impact, help: x.help, nodes: x.nodes.slice(0, 4).map(n => ({ target: n.target, summary: n.failureSummary })) }));
  scans.push({ viewport, label, violations: v });
  rec('R05-AXE-' + label + '-' + viewport, `axe sem violações: ${label}`, v.length === 0, JSON.stringify(v).slice(0, 900));
}
async function seedFinance(a) {
  await a.evaluate(() => {
    const ds = d => [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
    const y = new Date(); y.setDate(y.getDate() - 1);
    db.orders.find(o => o.id === 22).billing = { due: ds(y) };
    db.orders.find(o => o.id === 21).billing = { due: today() };
    const f = new Date(); f.setDate(f.getDate() + 5);
    db.orders.find(o => o.id === 20).billing = { due: ds(f) };
    const o = db.orders.find(x => x.id === 20);
    BancadaFinance.receive(o, 5000, today(), 'Pix', new Date().toISOString());
    save();
  });
}
(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  try {
    const { ctx, a } = await session(browser);
    await seedFinance(a);
    for (const [w, h] of [[1440, 900], [320, 568], [390, 844], [768, 1024]]) {
      await a.setViewportSize({ width: w, height: h }); await goto(a, '#financeiro'); await a.waitForTimeout(150);
      await scan(a, `${w}x${h}`, 'central');
      await goto(a, '#os/20/financeiro'); await a.waitForTimeout(150);
      await scan(a, `${w}x${h}`, 'os-finance');
    }
    await a.setViewportSize({ width: 1440, height: 900 }); await goto(a, '#os/20/financeiro');
    await open(a, 'pay', 20); await scan(a, '1440x900', 'pagamento');
    await a.setViewportSize({ width: 320, height: 568 }); await a.waitForTimeout(140); await scan(a, '320x568', 'pagamento');
    await a.locator('#modal button[data-action=close]').click();
    await a.setViewportSize({ width: 390, height: 844 }); await a.waitForTimeout(140);
    await open(a, 'reverse', 20, 1); await scan(a, '390x844', 'estorno');
    const focusSeq = await (async () => {
      await a.locator('#action-form textarea[name=reason]').focus(); const seq = [];
      for (let i = 0; i < 4; i++) {
        seq.push(await a.evaluate(() => {
          const el = document.activeElement;
          return { tag: el.tagName, name: el.name || '', text: (el.innerText || el.value || '').trim().slice(0, 40), label: (el.getAttribute('aria-label') || '') };
        }));
        await a.keyboard.press('Tab'); await a.waitForTimeout(80);
      }
      return seq;
    })();
    rec('R05-K01', 'Tab percorre data, justificativa, confirmação e submit no estorno', focusSeq.some(x => x.name === 'reason') && focusSeq.some(x => x.name === 'confirm') && focusSeq.some(x => x.tag === 'BUTTON' && x.text.includes('Confirmar estorno')), JSON.stringify(focusSeq));
    await a.keyboard.press('Escape'); await a.waitForTimeout(160);
    const invokerFocus = await a.evaluate(() => ({ open: document.querySelector('#modal').open, active: document.activeElement?.getAttribute('data-action') || document.activeElement?.tagName }));
    rec('R05-K02', 'Escape no estorno fecha o modal e devolve foco ao gatilho', invokerFocus.open === false && /modal:reverse:20:1/.test(invokerFocus.active || ''), JSON.stringify(invokerFocus));
    await goto(a, '#os/20/financeiro');
    // normal and reversed receipts are reached by the receipt list; create and reverse a second event for state variety
    await a.evaluate(() => { const o = db.orders.find(x => x.id === 20); const e = BancadaFinance.receive(o, 5000, today(), 'Dinheiro', new Date().toISOString()); save(); return e.id; });
    await goto(a, '#recibo/20/2'); await a.setViewportSize({ width: 390, height: 844 }); await a.waitForTimeout(150);
    await scan(a, '390x844', 'recibo-normal');
    await a.setViewportSize({ width: 1440, height: 900 }); await a.waitForTimeout(120); await scan(a, '1440x900', 'recibo-normal');
    await a.evaluate(() => { const o = db.orders.find(x => x.id === 20); BancadaFinance.reverse(o, 1, today(), 'Estorno visual', new Date().toISOString()); save(); });
    await goto(a, '#recibo/20/1'); await scan(a, '1440x900', 'recibo-estornado');
    // Portal with finance and R04 conditions/balance state.
    const token = await a.evaluate(() => { const o = db.orders.find(x => x.id === 23); if (!o.total) { o.total = 24000; o.paid = 0; o.billing = { due: today() }; } if (!o.publicLink) BancadaPortal.issue(o, BancadaPortal.token()); save(); return o.publicLink.token; });
    const p = await ctx.newPage(); await p.goto(BASE + '/portal.html#' + token, { waitUntil: 'networkidle' }); await p.waitForTimeout(250); await p.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
    await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(120); await scan(p, '390x844', 'portal-financeiro');
    await p.setViewportSize({ width: 1440, height: 900 }); await p.waitForTimeout(120); await scan(p, '1440x900', 'portal-financeiro');
    rec('R05-K03', 'Portal financeiro mantém região viva e saldo destacado', (await p.locator('#customer-live').count()) === 1 && (await p.locator('.customer-balance').count()) === 1, 'portal');

    const byId = {}; const all = scans.flatMap(s => s.violations);
    for (const v of all) { byId[v.id] = byId[v.id] || { count: 0, impact: v.impact, help: v.help }; byId[v.id].count++; }
    const md = ['# axe — R05', '', `Varreduras: ${scans.length}`, `Violações: ${all.length}`, '', '| Viewport | Tela | Violações |', '| --- | --- | --- |', ...scans.map(s => `| ${s.viewport} | ${s.label} | ${s.violations.length} |`)];
    fs.writeFileSync(path.join(OUT, 'testes', 'axe.md'), md.join('\n'));
    fs.writeFileSync(path.join(OUT, 'testes', 'a11y-resultados.json'), JSON.stringify({ generatedAt: new Date().toISOString(), codeSha: process.env.CODE_SHA || '', incrementSha: process.env.INCREMENT_SHA || '', results, scans, violations: all.length }, null, 2));
    console.log(`scans ${scans.length} violations ${all.length}`);
    await ctx.close();
  } finally { await browser.close(); }
})().catch(e => { console.error('FATAL', e); process.exit(1); });
