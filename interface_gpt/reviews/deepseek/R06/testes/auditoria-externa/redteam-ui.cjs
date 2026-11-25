'use strict';
/* R06 independent red-team — UI, responsive, axe, keyboard and print. */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright-core');
const CHROME = '/home/dragonblue/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const BASE = 'http://127.0.0.1:8130';
const OUT = __dirname;
const results = [];
function rec(id, desc, ok, detail = '') {
  const status = ok === 'INFO' ? 'INFO' : ok ? 'PASS' : 'FAIL';
  results.push({ id, desc, status, detail: String(detail).replace(/\s+/g, ' ').slice(0, 1200) });
  console.log(`${status} ${id} — ${desc}${detail ? ' :: ' + String(detail).replace(/\s+/g, ' ').slice(0, 240) : ''}`);
}
async function session(browser, w = 1440, h = 900, tag = 'rtui') {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: 'pt-BR' });
  const a = await ctx.newPage();
  const errors = [], consoleErrors = [], requests = [];
  a.on('pageerror', e => errors.push(e.message));
  a.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  a.on('request', r => requests.push(r.url()));
  await a.goto(`${BASE}/?${tag}=${Date.now()}`, { waitUntil: 'networkidle' });
  await a.evaluate(() => localStorage.clear());
  await a.reload({ waitUntil: 'networkidle' });
  return { ctx, a, errors, consoleErrors, requests };
}
async function go(a, hash) {
  await a.evaluate(h => { const m = document.querySelector('#modal'); if (m && m.open) m.close(); location.hash = h; }, hash);
  await a.waitForTimeout(260);
}
async function openAction(a, action) {
  const loc = a.locator(`[data-action="${action}"]`);
  if (!(await loc.count())) return false;
  await loc.last().click(); await a.waitForTimeout(180);
  return a.evaluate(() => document.querySelector('#modal').open);
}
async function submit(a) {
  await a.locator('#action-form button[type=submit]').click(); await a.waitForTimeout(420);
  return a.evaluate(() => { const m = document.querySelector('#modal'), e = document.querySelector('#modal-error'), t = document.querySelector('#toast'); return { open: m.open, error: e && !e.hidden ? e.textContent : '', toast: t && !t.hidden ? t.textContent : '' }; });
}
async function role(a, name) { await a.selectOption('#role', name); await a.waitForTimeout(220); }
async function createOrder(a, { brand = 'RTUI', model = 'UI', defect = 'Defeito fictício RTUI R06.' } = {}) {
  await go(a, '#nova'); await a.selectOption('#new-form select[name=client]', '1');
  await a.fill('#new-form input[name=brand]', brand); await a.fill('#new-form input[name=model]', model);
  await a.fill('#new-form textarea[name=defect]', defect);
  await a.locator('#new-form button[type=submit]').click(); await a.waitForTimeout(460);
  return a.evaluate(() => db.orders.at(-1).id);
}
async function setQuote(a, id, items, discountCents = 0) {
  await go(a, `#os/${id}/orcamento`); if (!(await openAction(a, `modal:quote:${id}`))) throw new Error('quote modal');
  while (await a.locator('.quote-edit-row').count()) { await a.locator('.quote-edit-row [data-quote-remove]').first().click(); await a.waitForTimeout(30); }
  for (const it of items) {
    await a.locator('[data-quote-add]').click(); await a.waitForTimeout(30);
    const row = a.locator('.quote-edit-row').last();
    await row.locator('select[name=itemType]').selectOption(it.type);
    await row.locator('input[name=itemName]').fill(it.name);
    await row.locator('input[name=itemQty]').fill(String(it.quantity));
    await row.locator('input[name=itemUnit]').fill((it.unit / 100).toFixed(2));
  }
  await a.fill('#action-form input[name=discount]', (discountCents / 100).toFixed(2));
  return submit(a);
}
async function publish(a, id) { await go(a, `#os/${id}/orcamento`); if (!(await openAction(a, `modal:publish:${id}`))) throw new Error('publish'); await a.check('#action-form input[name=confirm]'); return submit(a); }
async function formalize(a, id) { await go(a, `#os/${id}/orcamento`); if (!(await openAction(a, `modal:billing:${id}`))) throw new Error('billing'); await a.fill('#action-form input[name=due]', await a.evaluate(() => today())); await a.check('#action-form input[name=confirm]'); return submit(a); }
async function requestCancel(a, id, reason = 'Pedido RTUI R06.') { await go(a, `#os/${id}/cancelamento`); if (!(await openAction(a, `modal:cancelrequest:${id}`))) throw new Error('request'); await a.selectOption('#action-form select[name=origin]', 'cliente'); await a.fill('#action-form textarea[name=reason]', reason); return submit(a); }
async function conferPiece(a, id, index, { disposition = 'unused', quantity = 1, reason = '' } = {}) {
  await go(a, `#os/${id}/cancelamento`); if (!(await openAction(a, `modal:cancelitem:${id}:${index}`))) throw new Error('item');
  if (await a.locator('#action-form select[name=disposition]').count()) { await a.selectOption('#action-form select[name=disposition]', disposition); await a.fill('#action-form input[name=quantity]', String(quantity)); }
  if (reason) await a.fill('#action-form textarea[name=reason]', reason);
  await a.check('#action-form input[name=confirm]'); return submit(a);
}
async function conferTechnical(a, id) { await go(a, `#os/${id}/cancelamento`); if (!(await openAction(a, `modal:canceltechnical:${id}`))) throw new Error('technical'); await a.check('#action-form input[name=confirm]'); return submit(a); }
async function confirmAcerto(a, id, { gross = 0, discount = 0, refund = null, ref = null, reason = 'Acerto RTUI R06.' } = {}) {
  await go(a, `#os/${id}/cancelamento`); if (!(await openAction(a, `modal:cancelconfirm:${id}`))) throw new Error('confirm');
  await a.fill('#action-form input[name=gross]', (gross / 100).toFixed(2)); await a.fill('#action-form input[name=discount]', (discount / 100).toFixed(2)); await a.waitForTimeout(150);
  if (refund !== null) { await a.fill('#action-form input[name=refund]', (refund / 100).toFixed(2)); await a.fill('#action-form input[name=ref]', ref || 'Comprovante RTUI'); }
  await a.fill('#action-form textarea[name=reason]', reason);
  await a.check('#action-form input[name=settlementConfirmed]'); await a.check('#action-form input[name=financialConfirmed]'); await a.check('#action-form input[name=confirm]');
  return submit(a);
}
async function pay(a, id, amountCents) { await go(a, `#os/${id}/financeiro`); if (!(await openAction(a, `modal:pay:${id}`))) throw new Error('pay'); await a.fill('#action-form input[name=amount]', (amountCents / 100).toFixed(2)); return submit(a); }
const pdfInfo = file => { const out = execFileSync('pdfinfo', [file], { encoding: 'utf8' }); return { pages: Number((out.match(/^Pages:\s+(\d+)/m) || [])[1] || 0), size: (out.match(/^Page size:\s+(.+)$/m) || [])[1] || '', raw: out }; };
const pdfText = file => execFileSync('pdftotext', ['-layout', file, '-'], { encoding: 'utf8' }).replace(/\u00a0/g, ' ');
const widthMm = size => { const m = size.match(/([\d.]+)\s*x\s*([\d.]+)\s*pts/); return m ? Math.round(Number(m[1]) / 72 * 25.4) : null; };

async function measure(a, label) {
  const m = await a.evaluate(() => {
    const doc = document.documentElement, main = document.querySelector('#main'), dlg = document.querySelector('#modal'), form = document.querySelector('#action-form');
    const f = form ? form.querySelector('.form-footer') : null;
    const box = document.querySelector('#cancel-refund');
    const r = el => el ? el.getBoundingClientRect() : null;
    const check = form ? form.querySelector('input[name=confirm]') : null;
    if (dlg && dlg.open) dlg.scrollTop = dlg.scrollHeight;
    const cr = r(check), fr = r(f);
    const cx = cr ? cr.left + cr.width / 2 : 0, cy = cr ? cr.top + cr.height / 2 : 0;
    const at = cr ? document.elementFromPoint(cx, cy) : null;
    return {
      docW: doc.scrollWidth, win: innerWidth, mainW: main.scrollWidth, mainC: main.clientWidth,
      modalOpen: dlg.open, modalW: dlg.getBoundingClientRect().width, modalSW: dlg.scrollWidth, modalCW: dlg.clientWidth,
      formSW: form ? form.scrollWidth : null, formCW: form ? form.clientWidth : null,
      footerPos: f ? getComputedStyle(f).position : null,
      refundHidden: box ? box.hidden : null, refundDisplay: box ? getComputedStyle(box).display : null, refundH: box ? box.offsetHeight : null,
      checkRect: cr ? { top: cr.top, bottom: cr.bottom, left: cr.left, right: cr.right, w: cr.width, h: cr.height } : null,
      footerRect: fr ? { top: fr.top, bottom: fr.bottom, left: fr.left, right: fr.right } : null,
      overlap: cr && fr ? !(cr.bottom <= fr.top || cr.top >= fr.bottom || cr.right <= fr.left || cr.left >= fr.right) : null,
      checkAtPoint: at ? (at.tagName + '|' + (at.getAttribute('name') || '') + '|' + (at.closest('label') ? 'label' : '')) : null,
      checks: form ? [...form.querySelectorAll('input[type=checkbox]')].map(x => ({ name: x.name, disabled: x.disabled, visible: !!x.offsetParent })) : []
    };
  });
  return { label, ...m };
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  try {
    const { ctx, a, errors, consoleErrors, requests } = await session(browser, 1440, 900, 'rtui');
    try {
      // Seed #23: request, technical modal (before conference), conference, then no-refund confirm modal.
      await go(a, '#os/23/cancelamento');
      await requestCancel(a, 23, 'Pedido RTUI R06.');
      await go(a, '#os/23/cancelamento'); await openAction(a, 'modal:canceltechnical:23');
      const techFooter = await measure(a, 'canceltechnical-1440');
      await a.evaluate(() => document.querySelector('#modal').close());
      await conferTechnical(a, 23);

      // Pending pieces order for item modal.
      const pid = await createOrder(a, { brand: 'RTUI', model: 'Peças' });
      await setQuote(a, pid, [
        { type: 'Peça', name: 'Peça RTUI', quantity: 2, unit: 2500 },
        { type: 'Serviço', name: 'Serviço RTUI', quantity: 1, unit: 5000 }
      ], 500);
      await publish(a, pid); await requestCancel(a, pid, 'Pedido peças RTUI R06.');

      // Refund order for confirm/done/print.
      const rid = await createOrder(a, { brand: 'RTUI', model: 'Devolução' });
      await setQuote(a, rid, [{ type: 'Serviço', name: 'Reparo RTUI', quantity: 1, unit: 24000 }], 0);
      await publish(a, rid); await formalize(a, rid); await pay(a, rid, 10000); await pay(a, rid, 14000);
      await requestCancel(a, rid, 'Pedido devolução RTUI R06.'); await conferTechnical(a, rid);

      const widths = [[320, 568], [390, 844], [768, 1024], [1440, 900]];
      const measures = [];
      for (const [w, h] of widths) {
        await a.setViewportSize({ width: w, height: h });
        await go(a, `#os/${pid}/cancelamento`);
        const page = await measure(a, `pending-${w}`);
        await openAction(a, `modal:cancelitem:${pid}:0`);
        const item = await measure(a, `cancelitem-${w}`);
        await a.evaluate(() => document.querySelector('#modal').close());
        await go(a, `#os/${pid}/cancelamento`); await openAction(a, `modal:cancelwithdraw:${pid}`);
        const wd = await measure(a, `cancelwithdraw-${w}`);
        await a.evaluate(() => document.querySelector('#modal').close());
        await go(a, '#os/23/cancelamento'); await openAction(a, 'modal:cancelconfirm:23');
        const noRefund = await measure(a, `cancelconfirm-norefund-${w}`);
        await a.evaluate(() => document.querySelector('#modal').close());
        await go(a, `#os/${rid}/cancelamento`); await openAction(a, `modal:cancelconfirm:${rid}`);
        await a.fill('#action-form input[name=gross]', '100.00'); await a.fill('#action-form input[name=discount]', '20.00'); await a.waitForTimeout(160);
        const refund = await measure(a, `cancelconfirm-refund-${w}`);
        await a.evaluate(() => document.querySelector('#modal').close());
        measures.push({ w, page, item, wd, noRefund, refund });
      }

      const overflow = measures.flatMap(x => [x.page, x.item, x.wd, x.noRefund, x.refund].filter(m => m.docW > m.win || (m.formSW !== null && m.formSW > m.formCW + 1) || m.modalSW > m.modalCW + 1).map(m => ({ w: x.w, label: m.label, docW: m.docW, win: m.win, formSW: m.formSW, formCW: m.formCW, modalSW: m.modalSW, modalCW: m.modalCW })));
      rec('RT-UI-01', 'Sem overflow horizontal em 320/390/768/1440 (página e modais)', overflow.length === 0, JSON.stringify(overflow.slice(0, 8)));

      const footerBad = [];
      for (const x of measures) {
        if (x.item.footerPos !== 'static') footerBad.push({ w: x.w, kind: 'cancelitem', pos: x.item.footerPos });
        if (x.refund.footerPos !== 'static') footerBad.push({ w: x.w, kind: 'cancelconfirm', pos: x.refund.footerPos });
        if (x.noRefund.footerPos !== 'static') footerBad.push({ w: x.w, kind: 'cancelconfirm-norefund', pos: x.noRefund.footerPos });
      }
      rec('RT-UI-02', 'Footer estático nos modais item/acerto em todas as larguras', footerBad.length === 0, JSON.stringify(footerBad));
      rec('RT-UI-03', 'Footer do modal técnico é estático em 1440', techFooter.footerPos === 'static', JSON.stringify({ pos: techFooter.footerPos }));

      const hiddenBug = measures.map(x => ({ w: x.w, hidden: x.noRefund.refundHidden, display: x.noRefund.refundDisplay, height: x.noRefund.refundH }));
      rec('RT-UI-04', 'DEFEITO: seção de devolução marcada hidden não deveria ser exibida', hiddenBug.every(x => x.hidden === true && x.display === 'none'), JSON.stringify(hiddenBug));

      const overlap = measures.filter(x => x.item.overlap || x.refund.overlap || x.noRefund.overlap || x.wd.overlap).map(x => ({ w: x.w, item: x.item.overlap, refund: x.refund.overlap, noRefund: x.noRefund.overlap, wd: x.wd.overlap }));
      rec('RT-UI-05', 'Último checkbox não é coberto pelo footer ao rolar até o fim', overlap.length === 0, JSON.stringify(overlap));

      const checkVisibility = measures.flatMap(x => [x.item, x.refund, x.noRefund].flatMap(m => m.checks.filter(c => c.disabled || !c.visible).map(c => ({ w: x.w, label: m.label, ...c }))));
      rec('RT-UI-06', 'Checkboxes obrigatórios visíveis e habilitados nos modais', checkVisibility.length === 0, JSON.stringify(checkVisibility.slice(0, 8)));

      // 1440 refund-modal screenshot before confirming the order.
      await a.setViewportSize({ width: 1440, height: 900 });
      await go(a, `#os/${rid}/cancelamento`); await openAction(a, `modal:cancelconfirm:${rid}`);
      await a.fill('#action-form input[name=gross]', '100.00'); await a.fill('#action-form input[name=discount]', '20.00'); await a.waitForTimeout(160);
      await a.screenshot({ path: path.join(OUT, 'rt-1440-cancelconfirm-refund.png') });
      await a.evaluate(() => document.querySelector('#modal').close());

      // Confirm the refund order so print/receipt checks exercise a cancelled OS.
      await role(a, 'Administrador');
      const rst = await confirmAcerto(a, rid, { gross: 10000, discount: 2000, refund: 16000, ref: 'REF-PRIVADA-UI', reason: 'Justificativa privada RTUI.' });
      rec('RT-UI-SETUP', 'Acerto com devolução da OS de impressão confirmado', !rst.open && (await a.evaluate(i => { const o = db.orders.find(x => x.id === i); return o.status === 'Cancelado' && o.total === 8000 && o.paid === 8000; }, rid)), JSON.stringify(rst));

      // Screenshots at 320 and 1440 of the bug / done state.
      await a.setViewportSize({ width: 320, height: 568 });
      await go(a, '#os/23/cancelamento'); await openAction(a, 'modal:cancelconfirm:23');
      await a.screenshot({ path: path.join(OUT, 'rt-320-cancelconfirm-norefund.png') });
      await a.evaluate(() => document.querySelector('#modal').close());
      await confirmAcerto(a, 23, { gross: 0, discount: 0, reason: '' });
      await go(a, '#os/23/cancelamento'); await a.evaluate(() => { document.querySelectorAll('#main details').forEach(d => { d.open = true; }); });
      await a.screenshot({ path: path.join(OUT, 'rt-320-done-norefund.png'), fullPage: true });
      await a.setViewportSize({ width: 1440, height: 900 });
      await go(a, '#os/23/cancelamento'); await a.screenshot({ path: path.join(OUT, 'rt-1440-done-norefund.png'), fullPage: true });

      // Fresh pending order for keyboard/confirm-modal axe (no pieces).
      const kid = await createOrder(a, { brand: 'RTUI', model: 'Teclado' });
      await requestCancel(a, kid, 'Pedido teclado RTUI R06.'); await conferTechnical(a, kid);

      // Keyboard: focus trap and Escape return on no-refund confirm modal (320).
      await a.setViewportSize({ width: 320, height: 568 }); await go(a, `#os/${kid}/cancelamento`);
      await a.locator(`[data-action="modal:cancelconfirm:${kid}"]`).focus();
      await openAction(a, `modal:cancelconfirm:${kid}`);
      const kb = await a.evaluate(() => ({ inDialog: document.querySelector('#modal').contains(document.activeElement), active: document.activeElement.tagName + '|' + (document.activeElement.getAttribute('name') || '') }));
      let inside = true;
      for (let i = 0; i < 30; i++) { await a.keyboard.press('Tab'); const ok = await a.evaluate(() => document.querySelector('#modal').contains(document.activeElement)); if (!ok) inside = false; }
      await a.keyboard.press('Escape'); await a.waitForTimeout(180);
      const esc = await a.evaluate(() => ({ open: document.querySelector('#modal').open, active: document.activeElement?.getAttribute?.('data-action') || document.activeElement?.tagName }));
      rec('RT-UI-07', 'Foco preso no modal e Escape devolve ao acionador', kb.inDialog && inside && !esc.open && new RegExp(`modal:cancelconfirm:${kid}`).test(String(esc.active)), JSON.stringify({ kb, inside, esc }));

      // Axe-core scans.
      await a.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
      async function axeScan(page, label) {
        const res = await page.evaluate(async () => await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }));
        const v = res.violations.map(x => ({ id: x.id, impact: x.impact, help: x.help, nodes: x.nodes.slice(0, 3).map(n => n.target.join(' ')) }));
        rec('RT-AXE-' + label, `axe sem violações: ${label}`, v.length === 0, JSON.stringify(v).slice(0, 1000));
        return v;
      }
      await a.setViewportSize({ width: 320, height: 568 });
      await go(a, `#os/${pid}/cancelamento`); await axeScan(a, '320-pending-pieces');
      await openAction(a, `modal:cancelitem:${pid}:0`); await axeScan(a, '320-item-modal'); await a.evaluate(() => document.querySelector('#modal').close());
      await go(a, `#os/${kid}/cancelamento`); await openAction(a, `modal:cancelconfirm:${kid}`); await axeScan(a, '320-confirm-norefund'); await a.evaluate(() => document.querySelector('#modal').close());
      await a.setViewportSize({ width: 390, height: 844 }); await go(a, '#os/23/cancelamento'); await a.evaluate(() => { document.querySelectorAll('#main details').forEach(d => { d.open = true; }); }); await axeScan(a, '390-done-norefund');
      await a.setViewportSize({ width: 1440, height: 900 }); await go(a, '#os/23/cancelamento'); await axeScan(a, '1440-done-norefund');

      // Portal at 390 (cancelled order with refund and no quote).
      const token = await a.evaluate(i => { const o = db.orders.find(x => x.id === i); if (!o.publicLink) { BancadaPortal.issue(o, BancadaPortal.token()); save(); } return o.publicLink.token; }, rid);
      const p = await ctx.newPage(); const pErr = []; p.on('pageerror', e => pErr.push(e.message));
      await p.goto(`${BASE}/portal.html#${token}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(260);
      await p.addScriptTag({ path: require.resolve('axe-core/axe.min.js') }); await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(150);
      await axeScan(p, '390-portal');
      await p.screenshot({ path: path.join(OUT, 'rt-390-portal.png'), fullPage: true });
      rec('RT-UI-08', 'Sem exceções de página ou console na UI/portal', errors.length === 0 && consoleErrors.length === 0 && pErr.length === 0, JSON.stringify({ errors, consoleErrors, pErr }));
      await p.close();

      // Print checks: A4, receipt, coupon and old #020/#019 coupons.
      await go(a, `#imprimir/${rid}`); await a.emulateMedia({ media: 'print' });
      const a4 = path.join(OUT, 'rt-os-cancelada-a4.pdf'); await a.pdf({ path: a4, printBackground: true, preferCSSPageSize: true });
      const a4i = pdfInfo(a4), a4t = pdfText(a4);
      rec('RT-PR-01', 'A4 da OS cancelada: 1 página A4, valores finais e sem referência privada', a4i.pages === 1 && /A4/.test(a4i.size) && /Cancelado/.test(a4t) && /R\$ 80,00/.test(a4t) && /R\$ 0,00/.test(a4t) && !a4t.includes('REF-PRIVADA'), JSON.stringify({ pages: a4i.pages, size: a4i.size, text: a4t.slice(0, 200) }));
      await go(a, `#recibo/${rid}/1`); await a.emulateMedia({ media: 'print' });
      const rec1 = path.join(OUT, 'rt-recibo-original.pdf'); await a.pdf({ path: rec1, printBackground: true, preferCSSPageSize: true });
      const r1i = pdfInfo(rec1), r1t = pdfText(rec1);
      rec('RT-PR-02', 'Recibo original: 1 página A4, valor original e sem ESTORNADO', r1i.pages === 1 && /A4/.test(r1i.size) && /Recibo #/.test(r1t) && /R\$ 100,00/.test(r1t) && !/ESTORNADO/.test(r1t), JSON.stringify({ pages: r1i.pages, size: r1i.size }));
      await go(a, `#imprimir/${rid}/cupom`); await a.emulateMedia({ media: 'print' });
      const cup = path.join(OUT, 'rt-os-cancelada-cupom.pdf'); await a.pdf({ path: cup, width: '80mm', height: '150mm', printBackground: true });
      const ci = pdfInfo(cup), ct = pdfText(cup), cw = widthMm(ci.size);
      rec('RT-PR-03', 'Cupom 80 mm mantém largura e valores', cw === 80 && ci.pages === 2 && /Cancelado/.test(ct) && /R\$ 80,00/.test(ct), JSON.stringify({ pages: ci.pages, size: ci.size, widthMm: cw }));

      for (const id of [20, 19]) {
        await go(a, `#imprimir/${id}/cupom`); await a.emulateMedia({ media: 'print' });
        const f = path.join(OUT, `rt-os${id}-cupom.pdf`); await a.pdf({ path: f, width: '80mm', height: '150mm', printBackground: true });
        const i = pdfInfo(f), t = pdfText(f);
        rec(`RT-PR-04-${id}`, `Cupom 80 mm da OS antiga #0${id} (limitação declarada)`, i.pages === 2 && widthMm(i.size) === 80, JSON.stringify({ pages: i.pages, size: i.size, widthMm: widthMm(i.size), hasCancelled: /Cancelado|Finalizado/.test(t), text: t.slice(0, 120) }));
      }
      rec('RT-UI-09', 'Sem exceções, console errors ou requisições externas na UI/impressão', errors.length === 0 && consoleErrors.length === 0 && requests.every(u => u.startsWith(BASE) || u.startsWith('data:')), JSON.stringify({ errors, consoleErrors, external: requests.filter(u => !u.startsWith(BASE) && !u.startsWith('data:')).slice(0, 4) }));
      fs.writeFileSync(path.join(OUT, 'redteam-ui-resultados.json'), JSON.stringify({ generatedAt: new Date().toISOString(), measures, results }, null, 2));
    } catch (e) { rec('RT-UI-ERR', 'Falha inesperada na UI', false, e.stack || e.message); }
    await ctx.close();
    const pass = results.filter(r => r.status === 'PASS').length, fail = results.filter(r => r.status === 'FAIL').length, info = results.filter(r => r.status === 'INFO').length;
    console.log(`\nTOTAL ${results.length} · PASS ${pass} · FAIL ${fail} · INFO ${info}`);
    if (fail) process.exitCode = 1;
  } finally { await browser.close(); }
})().catch(e => { console.error('FATAL', e); process.exit(1); });
