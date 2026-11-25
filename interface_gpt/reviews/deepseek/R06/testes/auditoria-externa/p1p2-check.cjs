'use strict';
/* Independent post-fix verification of P1/P2; scratch only. */
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const CHROME = '/home/dragonblue/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const BASE = 'http://127.0.0.1:8130';
const OUT = __dirname;
const results = [];
function rec(id, desc, ok, detail = '') {
  const status = ok === 'INFO' ? 'INFO' : ok ? 'PASS' : 'FAIL';
  results.push({ id, desc, status, detail: String(detail).replace(/\s+/g, ' ').slice(0, 1000) });
  console.log(`${status} ${id} — ${desc}${detail ? ' :: ' + String(detail).replace(/\s+/g, ' ').slice(0, 260) : ''}`);
}
async function session(browser, w = 1440, h = 900, tag = 'v') {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: 'pt-BR' });
  const a = await ctx.newPage(); const errors = [], consoleErrors = [];
  a.on('pageerror', e => errors.push(e.message));
  a.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  await a.goto(`${BASE}/?${tag}=${Date.now()}`, { waitUntil: 'networkidle' });
  await a.evaluate(() => localStorage.clear()); await a.reload({ waitUntil: 'networkidle' });
  return { ctx, a, errors, consoleErrors };
}
async function go(a, hash) { await a.evaluate(h => { const m = document.querySelector('#modal'); if (m && m.open) m.close(); location.hash = h; }, hash); await a.waitForTimeout(260); }
async function openAction(a, action) { const l = a.locator(`[data-action="${action}"]`); if (!(await l.count())) return false; await l.last().click(); await a.waitForTimeout(180); return a.evaluate(() => document.querySelector('#modal').open); }
async function submit(a) { await a.locator('#action-form button[type=submit]').click(); await a.waitForTimeout(420); return a.evaluate(() => { const m = document.querySelector('#modal'), e = document.querySelector('#modal-error'); return { open: m.open, error: e && !e.hidden ? e.textContent : '' }; }); }
async function role(a, n) { await a.selectOption('#role', n); await a.waitForTimeout(220); }
async function snap(a, id) { return a.evaluate(i => { const o = db.orders.find(x => x.id === i); return o ? JSON.parse(JSON.stringify({ id: o.id, status: o.status, total: o.total, paid: o.paid, billing: o.billing || null, ledger: o.financeLedger || null, cancellation: o.cancellation || null })) : null; }, id); }
async function createOrder(a, { brand = 'VF', model = 'R06', defect = 'Fictício VF.' } = {}) {
  await go(a, '#nova'); await a.selectOption('#new-form select[name=client]', '1');
  await a.fill('#new-form input[name=brand]', brand); await a.fill('#new-form input[name=model]', model);
  await a.fill('#new-form textarea[name=defect]', defect);
  await a.locator('#new-form button[type=submit]').click(); await a.waitForTimeout(460);
  return a.evaluate(() => db.orders.at(-1).id);
}
async function setQuote(a, id, items, discount = 0) {
  await go(a, `#os/${id}/orcamento`); if (!(await openAction(a, `modal:quote:${id}`))) throw Error('quote');
  while (await a.locator('.quote-edit-row').count()) { await a.locator('.quote-edit-row [data-quote-remove]').first().click(); await a.waitForTimeout(30); }
  for (const it of items) {
    await a.locator('[data-quote-add]').click(); await a.waitForTimeout(30);
    const r = a.locator('.quote-edit-row').last();
    await r.locator('select[name=itemType]').selectOption(it.type);
    await r.locator('input[name=itemName]').fill(it.name);
    await r.locator('input[name=itemQty]').fill(String(it.quantity));
    await r.locator('input[name=itemUnit]').fill((it.unit / 100).toFixed(2));
  }
  await a.fill('#action-form input[name=discount]', (discount / 100).toFixed(2)); return submit(a);
}
async function publish(a, id) { await go(a, `#os/${id}/orcamento`); await openAction(a, `modal:publish:${id}`); await a.check('#action-form input[name=confirm]'); return submit(a); }
async function formalize(a, id) { await go(a, `#os/${id}/orcamento`); await openAction(a, `modal:billing:${id}`); await a.fill('#action-form input[name=due]', await a.evaluate(() => today())); await a.check('#action-form input[name=confirm]'); return submit(a); }
async function request(a, id) { await go(a, `#os/${id}/cancelamento`); if (!(await openAction(a, `modal:cancelrequest:${id}`))) throw Error('req'); await a.selectOption('#action-form select[name=origin]', 'cliente'); await a.fill('#action-form textarea[name=reason]', 'Pedido VF.'); return submit(a); }
async function confer(a, id) { await go(a, `#os/${id}/cancelamento`); if (!(await openAction(a, `modal:canceltechnical:${id}`))) throw Error('tech'); await a.check('#action-form input[name=confirm]'); return submit(a); }
async function confirmAcerto(a, id, { gross = 0, discount = 0, refund = null, ref = null, reason = 'Acerto VF.' } = {}) {
  await go(a, `#os/${id}/cancelamento`); if (!(await openAction(a, `modal:cancelconfirm:${id}`))) throw Error('confirm');
  await a.fill('#action-form input[name=gross]', (gross / 100).toFixed(2)); await a.fill('#action-form input[name=discount]', (discount / 100).toFixed(2)); await a.waitForTimeout(160);
  if (refund !== null) { await a.fill('#action-form input[name=refund]', (refund / 100).toFixed(2)); await a.fill('#action-form input[name=ref]', ref || 'Comp VF'); }
  await a.fill('#action-form textarea[name=reason]', reason);
  await a.check('#action-form input[name=settlementConfirmed]'); await a.check('#action-form input[name=financialConfirmed]'); await a.check('#action-form input[name=confirm]');
  return submit(a);
}
async function payUI(a, id, cents) { await go(a, `#os/${id}/financeiro`); if (!(await openAction(a, `modal:pay:${id}`))) throw Error('pay ui'); await a.fill('#action-form input[name=amount]', (cents / 100).toFixed(2)); return submit(a); }
async function metric(a) {
  return a.evaluate(() => {
    const box = document.querySelector('#cancel-refund'), dlg = document.querySelector('#modal');
    if (!box) return null;
    const cs = getComputedStyle(box), r = box.getBoundingClientRect();
    return { hidden: box.hidden, display: cs.display, height: r.height, disabled: [...box.querySelectorAll('input,select')].map(x => ({ name: x.name, disabled: x.disabled, visible: !!x.offsetParent })), modalH: dlg.getBoundingClientRect().height, docW: document.documentElement.scrollWidth, win: innerWidth };
  });
}
(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  try {
    /* P1 — no-refund hidden state at four widths, done text, tech button. */
    {
      const { ctx, a, errors, consoleErrors } = await session(browser, 1440, 900, 'p1');
      try {
        await go(a, '#os/23/cancelamento');
        rec('VF-P1-00', 'OS ativa ainda oferece Atualizar andamento', (await a.locator('[data-action="modal:tech:23"]').count()) === 1, 'active');
        await request(a, 23); await confer(a, 23);
        const measurements = [];
        for (const [w, h] of [[320, 568], [390, 844], [768, 1024], [1440, 900]]) {
          await a.setViewportSize({ width: w, height: h });
          await go(a, '#os/23/cancelamento');
          const opened = await openAction(a, 'modal:cancelconfirm:23');
          await a.fill('#action-form input[name=gross]', '0.00');
          await a.fill('#action-form input[name=discount]', '0.00');
          await a.waitForTimeout(180);
          const m = await metric(a);
          measurements.push({ w, opened, ...m });
          await a.evaluate(() => document.querySelector('#modal').close());
        }
        rec('VF-P1-01', 'Sem devolução: bloco #cancel-refund oculto (display none, altura 0) em 320/390/768/1440', measurements.every(x => x.opened && x.hidden === true && x.display === 'none' && x.height === 0), JSON.stringify(measurements));
        rec('VF-P1-02', 'Sem devolução: campos de devolução desabilitados e invisíveis', measurements.every(x => x.disabled.every(y => y.disabled === true && y.visible === false)), JSON.stringify(measurements.map(x => ({ w: x.w, disabled: x.disabled }))));
        await a.setViewportSize({ width: 1440, height: 900 });
        const st = await confirmAcerto(a, 23, { gross: 0, discount: 0, reason: '' });
        await go(a, '#os/23/cancelamento');
        const done = (await a.locator('#main').innerText()).replace(/\u00a0/g, ' ');
        rec('VF-P1-03', 'Acerto sem devolução conclui e não anuncia "Devolução registrada"', !st.open && !/Devolução registrada/.test(done) && /Valor final devido/.test(done) && /R\$ 0,00/.test(done), done.slice(0, 400));
        rec('VF-P1-04', 'OS cancelada não oferece Atualizar andamento', (await a.locator('[data-action="modal:tech:23"]').count()) === 0, 'cancelled');
        rec('VF-P1-05', 'Sem erros de console na P1', errors.length === 0 && consoleErrors.length === 0, JSON.stringify({ errors, consoleErrors }));
      } catch (e) { rec('VF-P1-ERR', 'Erro inesperado P1', false, e.stack || e.message); }
      await ctx.close();
    }

    /* P1 — refund still shows fields and done row. */
    {
      const { ctx, a, errors, consoleErrors } = await session(browser, 1440, 900, 'p1r');
      try {
        const id = await createOrder(a, { brand: 'VF', model: 'Devolução' });
        await setQuote(a, id, [{ type: 'Serviço', name: 'Reparo VF', quantity: 1, unit: 24000 }], 0);
        await publish(a, id); await formalize(a, id);
        await go(a, `#os/${id}/financeiro`); await payUI(a, id, 10000); await payUI(a, id, 14000);
        await request(a, id); await confer(a, id);
        await go(a, `#os/${id}/cancelamento`); await openAction(a, `modal:cancelconfirm:${id}`);
        await a.fill('#action-form input[name=gross]', '100.00'); await a.fill('#action-form input[name=discount]', '20.00'); await a.waitForTimeout(200);
        const m = await metric(a);
        rec('VF-P1-06', 'Com devolução: bloco visível, display grid, altura >0', m && m.hidden === false && m.display !== 'none' && m.height > 0, JSON.stringify(m));
        rec('VF-P1-07', 'Com devolução: campos habilitados e visíveis', m && m.disabled.every(y => !y.disabled && y.visible), JSON.stringify(m?.disabled));
        await a.fill('#action-form input[name=refund]', '160.00'); await a.fill('#action-form input[name=ref]', 'Comp VF');
        await a.fill('#action-form textarea[name=reason]', 'Acerto com devolução VF.');
        await a.check('#action-form input[name=settlementConfirmed]'); await a.check('#action-form input[name=financialConfirmed]'); await a.check('#action-form input[name=confirm]');
        const st = await submit(a);
        await go(a, `#os/${id}/cancelamento`);
        const done = (await a.locator('#main').innerText()).replace(/\u00a0/g, ' ');
        const o = await snap(a, id);
        rec('VF-P1-08', 'Com devolução: painel anuncia Devolução registrada R$ 160,00', !st.open && /Devolução registrada/.test(done) && /R\$ 160,00/.test(done) && o.ledger.events.some(e => e.type === 'refund' && e.amount === 16000), JSON.stringify({ st, total: o.total, paid: o.paid, events: o.ledger.events.map(e => e.type), done: done.slice(0, 300) }));
        rec('VF-P1-09', 'Sem erros de console na P1R', errors.length === 0 && consoleErrors.length === 0, JSON.stringify({ errors, consoleErrors }));
      } catch (e) { rec('VF-P1R-ERR', 'Erro inesperado P1R', false, e.stack || e.message); }
      await ctx.close();
    }

    /* P2 — direct pay roles. */
    {
      const { ctx, a, errors, consoleErrors } = await session(browser, 1440, 900, 'p2');
      try {
        await role(a, 'Financeiro');
        await go(a, '#os/20/financeiro');
        const uiOpenFinance = await a.locator('[data-action="modal:pay:20"]').count();
        const stFinance = await payUI(a, 20, 1000);
        let o = await snap(a, 20);
        rec('VF-P2-01', 'Financeiro recebe via UI normalmente', uiOpenFinance >= 1 && !stFinance.open && o.paid === 21000, JSON.stringify({ uiOpenFinance, stFinance, paid: o.paid }));
        const admin = await a.evaluate(() => {
          role = 'Administrador';
          const o = db.orders.find(x => x.id === 20); const before = o.paid;
          let err = '', ok = false;
          try { financialSubmit('pay', o, { amount: '10.00', date: today(), method: 'Pix' }); ok = true; } catch (e) { err = e.message; }
          return { before, ok, err, after: o.paid, events: o.financeLedger.events.length };
        });
        rec('VF-P2-02', 'Administrador recebe por chamada direta', admin.ok && admin.after === admin.before + 1000, JSON.stringify(admin));
        const tech = await a.evaluate(() => {
          role = 'Técnico';
          const o = db.orders.find(x => x.id === 20); const before = { paid: o.paid, events: o.financeLedger.events.length };
          let err = '', ok = false;
          try { financialSubmit('pay', o, { amount: '10.00', date: today(), method: 'Pix' }); ok = true; } catch (e) { err = e.message; }
          const ui = (openModal('pay', 20), document.querySelector('#modal').open);
          return { before, ok, err, ui, after: { paid: o.paid, events: o.financeLedger.events.length } };
        });
        rec('VF-P2-03', 'Técnico: chamada direta de pagamento é rejeitada e ledger não muda', !tech.ok && /autorizada/i.test(tech.err) && tech.before.paid === tech.after.paid && tech.before.events === tech.after.events && tech.ui === false, JSON.stringify(tech));
        const att = await a.evaluate(() => {
          role = 'Atendente';
          const o = db.orders.find(x => x.id === 20); const before = { paid: o.paid, events: o.financeLedger.events.length };
          let err = '', ok = false;
          try { financialSubmit('pay', o, { amount: '10.00', date: today(), method: 'Pix' }); ok = true; } catch (e) { err = e.message; }
          const ui = (openModal('pay', 20), document.querySelector('#modal').open);
          return { before, ok, err, ui, after: { paid: o.paid, events: o.financeLedger.events.length } };
        });
        rec('VF-P2-04', 'Atendente: chamada direta de pagamento é rejeitada e ledger não muda', !att.ok && /autorizada/i.test(att.err) && att.before.paid === att.after.paid && att.before.events === att.after.events && att.ui === false, JSON.stringify(att));
        rec('VF-P2-05', 'Sem erros de console na P2', errors.length === 0 && consoleErrors.length === 0, JSON.stringify({ errors, consoleErrors }));
      } catch (e) { rec('VF-P2-ERR', 'Erro inesperado P2', false, e.stack || e.message); }
      await ctx.close();
    }

    fs.writeFileSync(path.join(OUT, 'p1p2-resultados.json'), JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));
    const pass = results.filter(r => r.status === 'PASS').length, fail = results.filter(r => r.status === 'FAIL').length;
    console.log(`\nTOTAL ${results.length} · PASS ${pass} · FAIL ${fail}`);
    if (fail) process.exitCode = 1;
  } finally { await browser.close(); }
})().catch(e => { console.error('FATAL', e); process.exit(1); });
