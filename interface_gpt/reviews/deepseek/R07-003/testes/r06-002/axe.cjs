'use strict';
/*
 * R06 — axe-core e teclado nos estados de cancelamento, acerto, financeiro e portal.
 * Requer axe-core + playwright-core.
 */
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const axe = require('axe-core');
const {
  BASE, OUT, makeRecorder, session, goto, open, closeModal, submit, createOrder, setQuote,
  publish, formalize, requestCancel, conferPiece, conferTechnical, confirmAcerto, pay, role,
  itemIndex
} = require('./lib.cjs');

const { results, rec } = makeRecorder();
const scans = [];
const CHROME = process.env.CHROME_PATH || '/home/dragonblue/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';

async function scan(a, viewport, label) {
  const res = await a.evaluate(async () => await axe.run(document, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }
  }));
  const v = res.violations.map(x => ({
    id: x.id, impact: x.impact, help: x.help,
    nodes: x.nodes.slice(0, 5).map(n => ({ target: n.target, summary: n.failureSummary }))
  }));
  scans.push({ viewport, label, violations: v });
  rec('R06-AXE-' + label + '-' + viewport, `axe sem violações: ${label}`, v.length === 0, JSON.stringify(v).slice(0, 900));
}

async function keyboard(a) {
  // Request modal: focus trap, Escape and focus return.
  await goto(a, '#os/23/cancelamento');
  const opener = a.locator('[data-action="modal:cancelrequest:23"]');
  await opener.focus();
  const opened = await open(a, 'cancelrequest', 23);
  const initial = await a.evaluate(() => ({
    tag: document.activeElement.tagName,
    name: document.activeElement.getAttribute('name'),
    inDialog: document.querySelector('#modal').contains(document.activeElement),
    labelled: document.querySelector('#modal').getAttribute('aria-labelledby')
  }));
  let inside = true;
  for (let i = 0; i < 12; i++) {
    await a.keyboard.press('Tab');
    const now = await a.evaluate(() => document.querySelector('#modal').contains(document.activeElement));
    if (!now) inside = false;
  }
  await a.keyboard.press('Escape');
  await a.waitForTimeout(180);
  const escaped = await a.evaluate(() => ({
    open: document.querySelector('#modal').open,
    active: document.activeElement?.getAttribute?.('data-action') || document.activeElement?.tagName
  }));
  rec('R06-KB-01', 'Modal de pedido prende o foco, fecha com Escape e devolve o foco ao acionador', opened && initial.inDialog && inside && !escaped.open && /modal:cancelrequest:23/.test(String(escaped.active)), JSON.stringify({ opened, initial, inside, escaped }));

  // Confirm modal: refund fields reachable by keyboard.
  await closeModal(a);
  const { id } = await setupRefundOrder(a);
  await goto(a, `#os/${id}/cancelamento`);
  await open(a, 'cancelconfirm', id);
  await a.fill('#action-form input[name=gross]', '100.00');
  await a.fill('#action-form input[name=discount]', '20.00');
  await a.waitForTimeout(140);
  const reachable = await a.evaluate(() => {
    const form = document.querySelector('#action-form');
    const fields = ['gross', 'discount', 'refund', 'date', 'method', 'ref', 'reason', 'settlementConfirmed', 'financialConfirmed', 'confirm'];
    return fields.map(n => {
      const el = form.querySelector(`[name="${n}"]`);
      return { n, exists: !!el, disabled: !!el?.disabled, visible: !!el && el.offsetParent !== null };
    });
  });
  let focusedRefund = false;
  for (let i = 0; i < 18; i++) {
    await a.keyboard.press('Tab');
    const isRefund = await a.evaluate(() => document.activeElement?.name === 'refund');
    if (isRefund) { focusedRefund = true; break; }
  }
  rec('R06-KB-02', 'Campos de devolução ficam habilitados e alcançáveis por teclado', reachable.find(x => x.n === 'refund')?.visible && reachable.find(x => x.n === 'refund')?.disabled === false && reachable.find(x => x.n === 'ref')?.visible && focusedRefund, JSON.stringify({ reachable, focusedRefund }));
  await closeModal(a);
  return { id };
}

async function setupRefundOrder(a) {
  const created = await createOrder(a, { brand: 'Axe', model: 'Devolução', defect: 'Ordem para varredura de devolução R06.' });
  const id = created.id;
  await setQuote(a, id, [{ type: 'Serviço', name: 'Reparo para devolução', quantity: 1, unit: 24000 }], 0);
  await publish(a, id); await formalize(a, id);
  await pay(a, id, 10000, { method: 'Pix' });
  await pay(a, id, 14000, { method: 'Dinheiro' });
  await requestCancel(a, id, 'cliente', 'Pedido para varredura de devolução R06.');
  await conferTechnical(a, id, 'Conferência para varredura de devolução R06.');
  return { id };
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  try {
    const { ctx, a } = await session(browser, 1440, 900, 'r06axe');
    await a.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });

    // Initial queue and request tab.
    await goto(a, '#inicio');
    await scan(a, '1440x900', 'inicio');
    await goto(a, '#os/23/cancelamento');
    await scan(a, '1440x900', 'pedido-vazio');

    // Keyboard over the request modal.
    const kb = await keyboard(a);

    // Pending cancellation with a piece row.
    await goto(a, '#os/23/cancelamento');
    await requestCancel(a, 23, 'cliente', 'Pedido para varredura de acessibilidade R06.');
    await scan(a, '1440x900', 'pedido-pendente');
    await goto(a, '#os/23/cancelamento');
    await open(a, 'canceltechnical', 23);
    await scan(a, '1440x900', 'conferencia-tecnica-modal');
    await closeModal(a);

    // New order with pieces/services for item and pending states.
    const piece = await createOrder(a, { brand: 'Axe', model: 'Peças', defect: 'Ordem com peças para varredura R06.' });
    const pid = piece.id;
    await setQuote(a, pid, [
      { type: 'Peça', name: 'Peça de varredura', quantity: 2, unit: 2500 },
      { type: 'Serviço', name: 'Serviço de varredura', quantity: 1, unit: 5000 }
    ], 500);
    await publish(a, pid);
    await requestCancel(a, pid, 'cliente', 'Pedido com peças para varredura R06.');
    await goto(a, `#os/${pid}/cancelamento`);
    await open(a, 'cancelitem', pid, 0);
    await scan(a, '1440x900', 'item-peca-modal');
    await closeModal(a);

    // Refund confirm modal and done state.
    const rid = kb.id;
    await goto(a, `#os/${rid}/cancelamento`);
    await open(a, 'cancelconfirm', rid);
    await a.fill('#action-form input[name=gross]', '100.00');
    await a.fill('#action-form input[name=discount]', '20.00');
    await a.waitForTimeout(150);
    await scan(a, '1440x900', 'acerto-devolucao-modal');
    await closeModal(a);
    await confirmAcerto(a, rid, { gross: 10000, discount: 2000, refund: 16000, ref: 'Comprovante axe R06', reason: 'Acerto para varredura R06.' });
    await goto(a, `#os/${rid}/cancelamento`);
    await a.evaluate(() => { document.querySelectorAll('#main details').forEach(d => { d.open = true; }); });
    await scan(a, '1440x900', 'cancelado-concluido-historico');
    await goto(a, `#os/${rid}/financeiro`);
    await scan(a, '1440x900', 'financeiro-cancelado');
    await goto(a, `#os/${rid}/cancelamento`);
    await open(a, 'delivery', rid);
    await scan(a, '1440x900', 'entrega-modal');
    await closeModal(a);

    // Portal on desktop and mobile.
    const token = await a.evaluate(i => { const o = db.orders.find(x => x.id === i); return o.publicLink?.token || null; }, rid) ||
      await a.evaluate(i => { const o = db.orders.find(x => x.id === i); BancadaPortal.issue(o, BancadaPortal.token()); save(); return o.publicLink.token; }, rid);
    const p = await ctx.newPage();
    await p.goto(`${BASE}/portal.html#${token}`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(250);
    await p.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
    await scan(p, '1440x900', 'portal-cancelado');
    await p.setViewportSize({ width: 390, height: 844 });
    await p.waitForTimeout(150);
    await scan(p, '390x844', 'portal-cancelado');

    // Narrow widths: pending, item modal, confirm modal, done and history.
    for (const [w, h] of [[320, 568], [390, 844], [768, 1024]]) {
      const v = `${w}x${h}`;
      await a.setViewportSize({ width: w, height: h });
      await goto(a, `#os/${pid}/cancelamento`);
      await scan(a, v, 'pedido-pendente-pecas');
      await open(a, 'cancelitem', pid, 0);
      await scan(a, v, 'item-peca-modal');
      await closeModal(a);

      await goto(a, `#os/${rid}/cancelamento`);
      await a.evaluate(() => { document.querySelectorAll('#main details').forEach(d => { d.open = true; }); });
      await scan(a, v, 'cancelado-concluido');
    }

    // Print preview.
    await a.setViewportSize({ width: 1440, height: 900 });
    await goto(a, `#os/${rid}`);
    await goto(a, `#imprimir/${rid}`);
    await scan(a, '1440x900', 'impressao-cancelada');

    fs.writeFileSync(path.join(OUT, 'testes', 'a11y-resultados.json'), JSON.stringify({
      generatedAt: new Date().toISOString(), codeSha: process.env.CODE_SHA || '', incrementSha: process.env.INCREMENT_SHA || '', results, scans
    }, null, 2));
    const md = ['# axe-core R06', '', `Gerado: ${new Date().toISOString()}`, '',
      '| Varredura | Estados | Violações |', '| --- | --- | --- |',
      ...scans.map(s => `| ${s.viewport} | ${s.label} | ${s.violations.length ? s.violations.map(v => v.id).join(', ') : '0'} |`), ''].join('\n');
    fs.writeFileSync(path.join(OUT, 'testes', 'axe.md'), md);
    const pass = results.filter(r => r.status === 'PASS').length, fail = results.filter(r => r.status === 'FAIL').length;
    console.log(`\nTOTAL ${results.length} · PASS ${pass} · FAIL ${fail} · SCANS ${scans.length}`);
    if (fail) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch(e => { console.error('FATAL', e); process.exit(1); });
