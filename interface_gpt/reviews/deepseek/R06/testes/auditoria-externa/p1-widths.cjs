'use strict';
/* Scratch-only supplemental P1 widths probe. */
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const CHROME = '/home/dragonblue/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const BASE = 'http://127.0.0.1:8130';
const OUT = __dirname;
const results = [];
const rec = (id, desc, ok, detail = '') => { const s = ok === 'INFO' ? 'INFO' : ok ? 'PASS' : 'FAIL'; results.push({ id, desc, status: s, detail: String(detail).replace(/\s+/g, ' ').slice(0, 1200) }); console.log(`${s} ${id} — ${desc}${detail ? ' :: ' + String(detail).replace(/\s+/g, ' ').slice(0, 240) : ''}`); };
async function session(browser, tag) { const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR' }); const a = await ctx.newPage(); await a.goto(`${BASE}/?${tag}=${Date.now()}`, { waitUntil: 'networkidle' }); await a.evaluate(() => localStorage.clear()); await a.reload({ waitUntil: 'networkidle' }); return { ctx, a }; }
async function go(a, h) { await a.evaluate(x => { const m = document.querySelector('#modal'); if (m && m.open) m.close(); location.hash = x; }, h); await a.waitForTimeout(260); }
async function open(a, x) { const l = a.locator(`[data-action="${x}"]`); if (!(await l.count())) return false; await l.last().click(); await a.waitForTimeout(170); return a.evaluate(() => document.querySelector('#modal').open); }
async function submit(a) { await a.locator('#action-form button[type=submit]').click(); await a.waitForTimeout(420); return a.evaluate(() => ({ open: document.querySelector('#modal').open, error: (() => { const e = document.querySelector('#modal-error'); return e && !e.hidden ? e.textContent : ''; })() })); }
async function create(a) { await go(a, '#nova'); await a.selectOption('#new-form select[name=client]', '1'); await a.fill('#new-form input[name=brand]', 'VFW'); await a.fill('#new-form input[name=model]', 'P1'); await a.fill('#new-form textarea[name=defect]', 'Probe P1.'); await a.locator('#new-form button[type=submit]').click(); await a.waitForTimeout(450); return a.evaluate(() => db.orders.at(-1).id); }
async function quote(a, id, items) { await go(a, `#os/${id}/orcamento`); await open(a, `modal:quote:${id}`); while (await a.locator('.quote-edit-row').count()) { await a.locator('.quote-edit-row [data-quote-remove]').first().click(); await a.waitForTimeout(25); } for (const it of items) { await a.locator('[data-quote-add]').click(); await a.waitForTimeout(25); const r = a.locator('.quote-edit-row').last(); await r.locator('select[name=itemType]').selectOption(it.type); await r.locator('input[name=itemName]').fill(it.name); await r.locator('input[name=itemQty]').fill(String(it.quantity)); await r.locator('input[name=itemUnit]').fill((it.unit / 100).toFixed(2)); } await a.fill('#action-form input[name=discount]', '0.00'); return submit(a); }
async function pub(a, id) { await go(a, `#os/${id}/orcamento`); await open(a, `modal:publish:${id}`); await a.check('#action-form input[name=confirm]'); return submit(a); }
async function form(a, id) { await go(a, `#os/${id}/orcamento`); await open(a, `modal:billing:${id}`); await a.fill('#action-form input[name=due]', await a.evaluate(() => today())); await a.check('#action-form input[name=confirm]'); return submit(a); }
async function pay(a, id, cents) { await go(a, `#os/${id}/financeiro`); await open(a, `modal:pay:${id}`); await a.fill('#action-form input[name=amount]', (cents / 100).toFixed(2)); return submit(a); }
async function req(a, id) { await go(a, `#os/${id}/cancelamento`); await open(a, `modal:cancelrequest:${id}`); await a.selectOption('#action-form select[name=origin]', 'cliente'); await a.fill('#action-form textarea[name=reason]', 'Pedido VFW.'); return submit(a); }
async function conf(a, id) { await go(a, `#os/${id}/cancelamento`); await open(a, `modal:canceltechnical:${id}`); await a.check('#action-form input[name=confirm]'); return submit(a); }
async function measure(a) { return a.evaluate(() => { const b = document.querySelector('#cancel-refund'); if (!b) return null; const cs = getComputedStyle(b), r = b.getBoundingClientRect(); return { hidden: b.hidden, display: cs.display, height: r.height, disabled: [...b.querySelectorAll('input,select')].map(x => ({ name: x.name, disabled: x.disabled, visible: !!x.offsetParent })) }; }); }
(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  try {
    // no-refund #23 at 4 widths, then done panel at 4 widths
    const { ctx, a } = await session(browser, 'p1w');
    try {
      await req(a, 23); await conf(a, 23);
      const noRefund = [];
      for (const [w, h] of [[320, 568], [390, 844], [768, 1024], [1440, 900]]) {
        await a.setViewportSize({ width: w, height: h }); await go(a, '#os/23/cancelamento');
        await open(a, 'modal:cancelconfirm:23'); await a.fill('#action-form input[name=gross]', '0.00'); await a.fill('#action-form input[name=discount]', '0.00'); await a.waitForTimeout(150);
        noRefund.push({ w, ...(await measure(a)) });
        await a.evaluate(() => document.querySelector('#modal').close());
      }
      rec('VFW-01', 'Sem devolução: hidden/display none/altura 0 em 320/390/768/1440', noRefund.every(x => x.hidden === true && x.display === 'none' && x.height === 0), JSON.stringify(noRefund));
      await a.setViewportSize({ width: 1440, height: 900 });
      await go(a, '#os/23/cancelamento'); await open(a, 'modal:cancelconfirm:23');
      await a.fill('#action-form input[name=gross]', '0.00'); await a.fill('#action-form input[name=discount]', '0.00'); await a.waitForTimeout(150);
      await a.fill('#action-form textarea[name=reason]', '');
      await a.check('#action-form input[name=settlementConfirmed]'); await a.check('#action-form input[name=financialConfirmed]'); await a.check('#action-form input[name=confirm]');
      const st = await submit(a);
      const done = [];
      for (const [w, h] of [[320, 568], [390, 844], [768, 1024], [1440, 900]]) {
        await a.setViewportSize({ width: w, height: h }); await go(a, '#os/23/cancelamento');
        const text = (await a.locator('#main').innerText()).replace(/\u00a0/g, ' ');
        const tech = await a.locator('[data-action="modal:tech:23"]').count();
        done.push({ w, noRefundRow: !/Devolução registrada/.test(text), hasFinal: /Valor final devido/.test(text), tech });
      }
      rec('VFW-02', 'Painel concluído sem devolução, em 4 larguras, não anuncia Devolução registrada', !st.open && done.every(x => x.noRefundRow && x.hasFinal && x.tech === 0), JSON.stringify(done));
    } finally { await ctx.close(); }

    // refund order at 4 widths
    const { ctx: ctx2, a: a2 } = await session(browser, 'p1rw');
    try {
      const id = await create(a2);
      await quote(a2, id, [{ type: 'Serviço', name: 'Reparo VFW', quantity: 1, unit: 24000 }]);
      await pub(a2, id); await form(a2, id); await pay(a2, id, 10000); await pay(a2, id, 14000); await req(a2, id); await conf(a2, id);
      const ref = [];
      for (const [w, h] of [[320, 568], [390, 844], [768, 1024], [1440, 900]]) {
        await a2.setViewportSize({ width: w, height: h }); await go(a2, `#os/${id}/cancelamento`);
        await open(a2, `modal:cancelconfirm:${id}`);
        await a2.fill('#action-form input[name=gross]', '100.00'); await a2.fill('#action-form input[name=discount]', '20.00'); await a2.waitForTimeout(170);
        ref.push({ w, ...(await measure(a2)) });
        await a2.evaluate(() => document.querySelector('#modal').close());
      }
      rec('VFW-03', 'Com devolução: bloco visível/grid e campos habilitados em 4 larguras', ref.every(x => x.hidden === false && x.display !== 'none' && x.height > 0 && x.disabled.every(y => !y.disabled && y.visible)), JSON.stringify(ref));
    } finally { await ctx2.close(); }

    fs.writeFileSync(path.join(OUT, 'p1-widths-resultados.json'), JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));
    const pass = results.filter(r => r.status === 'PASS').length, fail = results.filter(r => r.status === 'FAIL').length;
    console.log(`\nTOTAL ${results.length} · PASS ${pass} · FAIL ${fail}`);
    if (fail) process.exitCode = 1;
  } finally { await browser.close(); }
})().catch(e => { console.error('FATAL', e); process.exit(1); });
