'use strict';
/* R05 — capturas focadas no delta financeiro, recibos e refinamentos do portal. */
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const CHROME = process.env.CHROME_PATH || '/home/dragonblue/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8130';
const OUT = path.resolve(__dirname, '..');
let n = 0;
async function shot(page, dir, name, full = true) {
  const d = path.join(OUT, dir); fs.mkdirSync(d, { recursive: true });
  const file = path.join(d, name + '.png');
  await page.screenshot({ path: file, fullPage: full, animations: 'disabled' });
  n++; console.log('SHOT', path.relative(OUT, file)); return path.relative(OUT, file);
}
async function goto(a, hash) { await a.evaluate(h => { location.hash = h; }, hash); await a.waitForTimeout(280); }
async function open(a, kind, id, eventId = null) {
  const action = eventId === null ? `modal:${kind}:${id}` : `modal:${kind}:${id}:${eventId}`;
  const loc = a.locator(`[data-action="${action}"]`); if (!(await loc.count())) return false;
  await loc.last().click(); await a.waitForTimeout(180); return a.evaluate(() => document.querySelector('#modal').open);
}
(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR' });
    const a = await ctx.newPage();
    await a.goto(BASE + '/?r05cap=' + Date.now(), { waitUntil: 'networkidle' }); await a.evaluate(() => localStorage.clear()); await a.reload({ waitUntil: 'networkidle' });
    // Controlled due dates and a legacy finance row.
    await a.evaluate(() => {
      const ds = d => [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
      const y = new Date(); y.setDate(y.getDate() - 1); const t = new Date(); const f = new Date(); f.setDate(f.getDate() + 5);
      db.orders.find(o => o.id === 22).billing = { due: ds(y) };
      db.orders.find(o => o.id === 21).billing = { due: ds(t) };
      db.orders.find(o => o.id === 20).billing = { due: ds(f) };
      save();
    });
    for (const [w, h, dir] of [[1440, 900, 'desktop'], [768, 1024, 'tablet'], [390, 844, 'mobile'], [320, 568, 'mobile']]) {
      await a.setViewportSize({ width: w, height: h }); await goto(a, '#financeiro');
      await shot(a, dir, `central-${w}`);
    }
    for (const [w, h, dir] of [[1440, 900, 'desktop'], [768, 1024, 'tablet'], [390, 844, 'mobile'], [320, 568, 'mobile']]) {
      await a.setViewportSize({ width: w, height: h }); await goto(a, '#os/20/financeiro');
      await shot(a, dir, `os20-legado-${w}`);
    }
    // Payment and reverse modals at desktop and narrow widths.
    await a.setViewportSize({ width: 1440, height: 900 }); await goto(a, '#os/20/financeiro');
    await open(a, 'pay', 20); await shot(a, 'desktop', 'pagamento-1440', false);
    await a.locator('#modal button[data-action=close]').click();
    await a.evaluate(() => { const o = db.orders.find(x => x.id === 20); if (!o.financeLedger?.events?.length) BancadaFinance.receive(o, 5000, today(), 'Pix', new Date().toISOString()); save(); render(); });
    await goto(a, '#os/20/financeiro'); await open(a, 'reverse', 20, 1); await shot(a, 'desktop', 'estorno-1440', false);
    await a.locator('#modal button[data-action=close]').click();
    await a.setViewportSize({ width: 390, height: 844 }); await a.waitForTimeout(140); await goto(a, '#os/20/financeiro'); await open(a, 'pay', 20); await shot(a, 'mobile', 'pagamento-390', false);
    await a.locator('#modal button[data-action=close]').click();
    await open(a, 'reverse', 20, 1); await shot(a, 'mobile', 'estorno-390', false);
    await a.fill('#action-form textarea[name=reason]', 'J'.repeat(500)); await shot(a, 'mobile', 'estorno-motivo-500-390', false);
    await a.locator('#modal button[data-action=close]').click();
    await a.setViewportSize({ width: 320, height: 568 }); await a.waitForTimeout(140); await open(a, 'reverse', 20, 1); await shot(a, 'mobile', 'estorno-320', false);
    await a.locator('#modal button[data-action=close]').click();

    // OS #023: approved/formalized, partial, reversed, repaid.
    await a.setViewportSize({ width: 1440, height: 900 });
    await a.evaluate(() => {
      const o = db.orders.find(x => x.id === 23);
      BancadaQuote.init(o); o.status = 'Aprovado'; o.total = 24000; o.paid = 0;
      o.billing = { due: today(), items: [{ type: 'Serviço', name: 'Serviço de reparo (demonstração inicial)', quantity: 1, unit: 24000 }], discount: 0 };
      o.financeLedger = { opening: 0, events: [] };
      if (!o.publicLink) BancadaPortal.issue(o, BancadaPortal.token());
      BancadaFinance.receive(o, 10000, today(), 'Pix', new Date().toISOString());
      save(); render();
    });
    await goto(a, '#os/23/financeiro'); await shot(a, 'desktop', 'os23-parcial-1440');
    await a.evaluate(() => { const o = db.orders.find(x => x.id === 23); BancadaFinance.receive(o, 14000, today(), 'Dinheiro', new Date().toISOString()); save(); render(); });
    await goto(a, '#os/23/financeiro'); await shot(a, 'desktop', 'os23-quitado-1440');
    await goto(a, '#recibo/23/1'); await shot(a, 'desktop', 'recibo-normal-1440');
    await a.emulateMedia({ media: 'print' }); await a.pdf({ path: path.join(OUT, 'recibos', 'recibo-normal.pdf'), format: 'A4', printBackground: true }); await a.emulateMedia({ media: 'screen' });
    await a.evaluate(() => { const o = db.orders.find(x => x.id === 23); BancadaFinance.reverse(o, 1, today(), 'Lançamento incorreto na demonstração', new Date().toISOString()); save(); render(); });
    await goto(a, '#os/23/financeiro'); await shot(a, 'desktop', 'os23-estornado-1440');
    await goto(a, '#recibo/23/1'); await shot(a, 'desktop', 'recibo-estornado-1440');
    await a.emulateMedia({ media: 'print' }); await a.pdf({ path: path.join(OUT, 'recibos', 'recibo-estornado.pdf'), format: 'A4', printBackground: true }); await a.emulateMedia({ media: 'screen' });
    await a.evaluate(() => { const o = db.orders.find(x => x.id === 23); BancadaFinance.receive(o, 10000, today(), 'Transferência', new Date().toISOString()); save(); render(); });
    await goto(a, '#os/23/financeiro'); await shot(a, 'desktop', 'os23-recomposto-1440');
    for (const [w, h, dir] of [[390, 844, 'mobile'], [320, 568, 'mobile'], [768, 1024, 'tablet']]) {
      await a.setViewportSize({ width: w, height: h }); await a.waitForTimeout(140); await goto(a, '#os/23/financeiro'); await shot(a, dir, `os23-recomposto-${w}`);
    }
    await a.setViewportSize({ width: 390, height: 844 }); await goto(a, '#recibo/23/1'); await shot(a, 'mobile', 'recibo-estornado-390');
    // Portal: partial balance is computed from the paid value; after reverse it shows 140/100, after repay 240/0.
    const token = await a.evaluate(() => db.orders.find(x => x.id === 23).publicLink.token);
    const p = await ctx.newPage(); await p.goto(BASE + '/portal.html#' + token, { waitUntil: 'networkidle' }); await p.waitForTimeout(260);
    // Reopen portal at the current state explicitly for each viewport.
    for (const [w, h, dir] of [[1440, 900, 'desktop'], [390, 844, 'mobile'], [320, 568, 'mobile']]) {
      await p.setViewportSize({ width: w, height: h }); await p.goto(BASE + '/portal.html#' + token, { waitUntil: 'networkidle' }); await p.waitForTimeout(220); await shot(p, dir, `portal-recomposto-${w}`);
    }
    // R04 refinement: empty conditions and balance block on the quote screen.
    await a.setViewportSize({ width: 1440, height: 900 }); await goto(a, '#os/23/orcamento'); await shot(a, 'desktop', 'orcamento-refinamentos-1440');
    await a.setViewportSize({ width: 390, height: 844 }); await a.waitForTimeout(120); await shot(a, 'mobile', 'orcamento-refinamentos-390');
    // Extreme value and long text at narrow width.
    await a.setViewportSize({ width: 1440, height: 900 }); await a.evaluate(() => { const o = db.orders.find(x => x.id === 22); o.total = 999999999; o.paid = 0; o.financeLedger = { opening: 0, events: [] }; o.billing = { due: today() }; save(); render(); });
    await goto(a, '#financeiro'); await shot(a, 'desktop', 'central-valor-extremo-1440');
    await a.setViewportSize({ width: 320, height: 568 }); await a.waitForTimeout(150); await shot(a, 'mobile', 'central-valor-extremo-320');

    // Additional mobile/portal states: partial (100), reversed (140), normal receipt #4.
    await a.evaluate(() => { const o = db.orders.find(x => x.id === 23); BancadaFinance.reverse(o, 2, today(), 'Correção do segundo recebimento', new Date().toISOString()); save(); render(); });
    await a.setViewportSize({ width: 390, height: 844 }); await a.waitForTimeout(130); await goto(a, '#os/23/financeiro'); await shot(a, 'mobile', 'os23-parcial-390');
    await p.setViewportSize({ width: 390, height: 844 }); await p.goto(BASE + '/portal.html#' + token, { waitUntil: 'networkidle' }); await p.waitForTimeout(220); await shot(p, 'mobile', 'portal-parcial-390');
    await p.setViewportSize({ width: 1440, height: 900 }); await p.goto(BASE + '/portal.html#' + token, { waitUntil: 'networkidle' }); await p.waitForTimeout(180); await shot(p, 'desktop', 'portal-parcial-1440');
    await a.evaluate(() => { const o = db.orders.find(x => x.id === 23); BancadaFinance.receive(o, 14000, today(), 'Dinheiro', new Date().toISOString()); save(); render(); });
    await a.setViewportSize({ width: 390, height: 844 }); await a.waitForTimeout(130); await goto(a, '#os/23/financeiro'); await shot(a, 'mobile', 'os23-recomposto-390');
    await goto(a, '#recibo/23/4'); await shot(a, 'mobile', 'recibo-normal-390');
    await p.setViewportSize({ width: 390, height: 844 }); await p.goto(BASE + '/portal.html#' + token, { waitUntil: 'networkidle' }); await p.waitForTimeout(200); await shot(p, 'mobile', 'portal-recomposto-390');
    fs.writeFileSync(path.join(OUT, 'testes', 'capturas.json'), JSON.stringify({ generatedAt: new Date().toISOString(), count: n, counts: { desktop: fs.readdirSync(path.join(OUT, 'desktop')).filter(f => f.endsWith('.png')).length, mobile: fs.readdirSync(path.join(OUT, 'mobile')).filter(f => f.endsWith('.png')).length, tablet: fs.readdirSync(path.join(OUT, 'tablet')).filter(f => f.endsWith('.png')).length } }, null, 2));
    console.log('TOTAL SHOTS', n);
    await ctx.close();
  } finally { await browser.close(); }
})().catch(e => { console.error('FATAL', e); process.exit(1); });
