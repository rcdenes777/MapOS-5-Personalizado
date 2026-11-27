'use strict';
/* R06 — helpers for real-browser validation of the cancellation increment. */
const path = require('node:path');
const { chromium } = require('playwright-core');

const CHROME = process.env.CHROME_PATH || '/home/dragonblue/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8130';
const OUT = path.resolve(__dirname, '..');
const norm = s => String(s).replace(/\u00a0/g, ' ');

function makeRecorder() {
  const results = [];
  const rec = (id, desc, ok, detail = '') => {
    const status = ok === 'INFO' ? 'INFO' : ok ? 'PASS' : 'FAIL';
    results.push({ id, desc, status, detail: String(detail).slice(0, 1200) });
    console.log(`${status} ${id} — ${desc}${detail ? ' :: ' + String(detail).slice(0, 240) : ''}`);
  };
  return { results, rec };
}

async function launch() {
  return chromium.launch({ executablePath: CHROME, headless: true });
}

async function session(browser, w = 1440, h = 900, q = 'r06') {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: 'pt-BR' });
  const a = await ctx.newPage();
  const errors = [], consoleErrors = [], requests = [];
  a.on('pageerror', e => errors.push(e.message));
  a.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  a.on('request', r => requests.push(r.url()));
  await a.goto(`${BASE}/?${q}=${Date.now()}`, { waitUntil: 'networkidle' });
  await a.evaluate(() => localStorage.clear());
  await a.reload({ waitUntil: 'networkidle' });
  return { ctx, a, errors, consoleErrors, requests };
}

async function goto(a, hash) {
  await a.evaluate(h => {
    const m = document.querySelector('#modal');
    if (m && m.open) m.close();
    location.hash = h;
  }, hash);
  await a.waitForTimeout(240);
}

async function open(a, kind, id, eventId = null) {
  const action = eventId === null ? `modal:${kind}:${id}` : `modal:${kind}:${id}:${eventId}`;
  const loc = a.locator(`[data-action="${action}"]`);
  if (!(await loc.count())) return false;
  await loc.last().click();
  await a.waitForTimeout(160);
  return a.evaluate(() => document.querySelector('#modal').open);
}

async function closeModal(a) {
  const isOpen = await a.evaluate(() => document.querySelector('#modal').open);
  if (!isOpen) return;
  await a.locator('#modal button[data-action=close]').click();
  await a.waitForTimeout(140);
}

async function submit(a) {
  await a.locator('#action-form button[type=submit]').click();
  await a.waitForTimeout(360);
  return a.evaluate(() => {
    const m = document.querySelector('#modal');
    const err = document.querySelector('#modal-error');
    const toast = document.querySelector('#toast');
    return { open: m.open, error: err && !err.hidden ? err.textContent : '', toast: toast && !toast.hidden ? toast.textContent : '' };
  });
}

async function modalState(a) {
  return a.evaluate(() => {
    const m = document.querySelector('#modal');
    const err = document.querySelector('#modal-error');
    return { open: m.open, error: err && !err.hidden ? err.textContent : '', title: document.querySelector('#modal-title')?.textContent || '' };
  });
}

async function order(a, id) {
  return a.evaluate(i => {
    const o = db.orders.find(x => x.id === i);
    if (!o) return null;
    return JSON.parse(JSON.stringify({
      id: o.id, status: o.status, total: o.total, paid: o.paid, billing: o.billing || null,
      delivery: o.delivery || null, approval: o.approval, proposal: o.proposal,
      quote: o.quote ? { current: o.quote.current, active: o.quote.active, draft: o.quote.draft, versions: o.quote.versions.map(v => ({ number: v.number, total: v.total, items: v.items, discount: v.discount, decision: v.decision || null, source: v.source })) } : null,
      cancellation: o.cancellation || null, ledger: o.financeLedger || null, history: o.history
    }));
  }, id);
}

async function stock(a) {
  return a.evaluate(() => db.stock.map(p => ({ name: p.name, quantity: p.quantity })));
}

async function createOrder(a, { client = '1', brand = 'Bancada', model = 'R06', defect = 'Defeito fictício da bancada R06.' } = {}) {
  await goto(a, '#nova');
  await a.selectOption('#new-form select[name=client]', String(client));
  await a.fill('#new-form input[name=brand]', brand);
  await a.fill('#new-form input[name=model]', model);
  await a.fill('#new-form textarea[name=defect]', defect);
  await a.locator('#new-form button[type=submit]').click();
  await a.waitForTimeout(420);
  const created = await a.evaluate(() => {
    const o = db.orders.at(-1);
    return { id: o.id, hash: location.hash, status: o.status };
  });
  return created;
}

async function setQuote(a, id, items, discountCents = 0) {
  await goto(a, `#os/${id}/orcamento`);
  if (!(await open(a, 'quote', id))) throw new Error('editor de orçamento não abriu para OS ' + id);
  while (await a.locator('.quote-edit-row').count()) {
    await a.locator('.quote-edit-row [data-quote-remove]').first().click();
    await a.waitForTimeout(40);
  }
  for (const it of items) {
    await a.locator('[data-quote-add]').click();
    await a.waitForTimeout(40);
    const row = a.locator('.quote-edit-row').last();
    await row.locator('select[name=itemType]').selectOption(it.type);
    await row.locator('input[name=itemName]').fill(it.name);
    await row.locator('input[name=itemQty]').fill(String(it.quantity));
    await row.locator('input[name=itemUnit]').fill((it.unit / 100).toFixed(2));
  }
  await a.fill('#action-form input[name=discount]', (discountCents / 100).toFixed(2));
  return submit(a);
}

async function publish(a, id) {
  await goto(a, `#os/${id}/orcamento`);
  if (!(await open(a, 'publish', id))) return { open: false, error: 'publicar ausente' };
  await a.check('#action-form input[name=confirm]');
  return submit(a);
}

async function formalize(a, id, due = null) {
  await goto(a, `#os/${id}/orcamento`);
  if (!(await open(a, 'billing', id))) return { open: false, error: 'formalizar ausente' };
  const day = due || await a.evaluate(() => today());
  await a.fill('#action-form input[name=due]', day);
  await a.check('#action-form input[name=confirm]');
  return submit(a);
}

async function requestCancel(a, id, origin = 'cliente', reason = 'Solicitação fictícia da bancada R06.') {
  await goto(a, `#os/${id}/cancelamento`);
  if (!(await open(a, 'cancelrequest', id))) return false;
  await a.selectOption('#action-form select[name=origin]', origin);
  await a.fill('#action-form textarea[name=reason]', reason);
  if (await a.locator('#action-form input[name=confirm]').count()) await a.check('#action-form input[name=confirm]');
  return submit(a);
}

async function withdrawCancel(a, id, reason = 'Pedido retirado na bancada R06.') {
  await goto(a, `#os/${id}/cancelamento`);
  if (!(await open(a, 'cancelwithdraw', id))) return false;
  await a.fill('#action-form textarea[name=reason]', reason);
  await a.check('#action-form input[name=confirm]');
  return submit(a);
}

async function lineIdAt(a, id, index) {
  return a.evaluate(({ id, index }) => {
    const line = BancadaCancel.lines(db.orders.find(x => x.id === id))[index];
    return line ? line.lineId : null;
  }, { id, index });
}
async function lineIdByName(a, id, name) {
  return a.evaluate(({ id, name }) => {
    const line = BancadaCancel.lines(db.orders.find(x => x.id === id)).find(l => l.name === name);
    return line ? line.lineId : null;
  }, { id, name });
}
async function conferPiece(a, id, lineRef, { disposition = 'unused', quantity = 1, reason = '' } = {}) {
  await goto(a, `#os/${id}/cancelamento`);
  // R08: the action identifies the line by its stable lineId; resolve the current line at open time.
  const lineId = await a.evaluate(({ id, ref }) => {
    const lines = BancadaCancel.lines(db.orders.find(x => x.id === id));
    const line = lines.find(l => l.lineId === ref);
    return line ? line.lineId : null;
  }, { id, ref: lineRef });
  if (lineId === null) return { open: false, error: 'linha inexistente' };
  if (!(await open(a, 'cancelitem', id, lineId))) return false;
  const hasDisposition = await a.locator('#action-form select[name=disposition]').count();
  if (hasDisposition && disposition) {
    await a.selectOption('#action-form select[name=disposition]', disposition);
    await a.fill('#action-form input[name=quantity]', String(quantity));
  }
  if (reason) await a.fill('#action-form textarea[name=reason]', reason);
  await a.check('#action-form input[name=confirm]');
  return submit(a);
}

async function conferTechnical(a, id, notes = 'Peças conciliadas e serviços executados conferidos na bancada R06.') {
  await goto(a, `#os/${id}/cancelamento`);
  if (!(await open(a, 'canceltechnical', id))) return false;
  await a.check('#action-form input[name=confirm]');
  if (notes) await a.fill('#action-form textarea[name=reason]', notes);
  return submit(a);
}

async function confirmAcerto(a, id, { gross = 0, discount = 0, reason = 'Acerto fictício negociado na bancada R06.', refund = null, date = null, method = 'Pix', ref = null } = {}) {
  await goto(a, `#os/${id}/cancelamento`);
  if (!(await open(a, 'cancelconfirm', id))) return false;
  await a.fill('#action-form input[name=gross]', (gross / 100).toFixed(2));
  await a.fill('#action-form input[name=discount]', (discount / 100).toFixed(2));
  await a.waitForTimeout(120);
  if (refund !== null) {
    await a.fill('#action-form input[name=refund]', (refund / 100).toFixed(2));
    await a.fill('#action-form input[name=date]', date || await a.evaluate(() => today()));
    await a.selectOption('#action-form select[name=method]', method);
    await a.fill('#action-form input[name=ref]', ref === null ? 'Comprovante fictício R06' : ref);
  }
  if (reason) await a.fill('#action-form textarea[name=reason]', reason);
  await a.check('#action-form input[name=settlementConfirmed]');
  await a.check('#action-form input[name=financialConfirmed]');
  await a.check('#action-form input[name=confirm]');
  return submit(a);
}

async function pay(a, id, amountCents, { date = null, method = 'Pix' } = {}) {
  await goto(a, `#os/${id}/financeiro`);
  if (!(await open(a, 'pay', id))) return false;
  await a.fill('#action-form input[name=amount]', (amountCents / 100).toFixed(2));
  if (date) await a.fill('#action-form input[name=date]', date);
  await a.selectOption('#action-form select[name=method]', method);
  return submit(a);
}

async function reverse(a, id, eventId, reason = 'Lançamento incorreto na bancada R06.') {
  await goto(a, `#os/${id}/financeiro`);
  if (!(await open(a, 'reverse', id, eventId))) return false;
  await a.fill('#action-form textarea[name=reason]', reason);
  await a.check('#action-form input[name=confirm]');
  return submit(a);
}

async function rectify(a, id, eventId, { type = 'lancamento_incorreto', date = null, reason = 'Retificação autorizada na bancada R06.' } = {}) {
  await goto(a, `#os/${id}/financeiro`);
  if (!(await open(a, 'rectify', id, eventId))) return false;
  await a.selectOption('#action-form select[name=rectification]', type);
  if (date) await a.fill('#action-form input[name=date]', date);
  await a.fill('#action-form textarea[name=reason]', reason);
  await a.check('#action-form input[name=confirm]');
  return submit(a);
}

async function deliver(a, id, { receiver = null, items = 'Equipamento e itens fictícios R06' } = {}) {
  await goto(a, `#os/${id}/cancelamento`);
  if (!(await open(a, 'delivery', id))) {
    await goto(a, `#os/${id}`);
    if (!(await open(a, 'delivery', id))) return false;
  }
  if (receiver) await a.fill('#action-form input[name=receiver]', receiver);
  await a.fill('#action-form textarea[name=items]', items);
  await a.check('#action-form input[name=confirm]');
  return submit(a);
}

async function role(a, name) {
  await a.selectOption('#role', name);
  await a.waitForTimeout(200);
}

async function itemIndex(a, id, name) {
  return a.evaluate(({ id, name }) => {
    const o = db.orders.find(x => x.id === id);
    return BancadaCancel.lines(o).findIndex(i => i.name === name);
  }, { id, name });
}
async function lineNames(a, id) {
  return a.evaluate(i => {
    const o = db.orders.find(x => x.id === i);
    return BancadaCancel.lines(o).map(x => x.name);
  }, id);
}

const mainText = async a => norm(await a.locator('#main').innerText());
const toastText = async a => a.evaluate(() => { const t = document.querySelector('#toast'); return t && !t.hidden ? t.textContent : ''; });
const actionCount = async (a, action) => a.locator(`[data-action="${action}"]`).count();
const queueCount = async (a, name) => a.evaluate(n => db.orders.filter(queues.find(q => q[0] === n)[2]).length, name);
const portalProjection = async (a, id) => a.evaluate(i => JSON.parse(JSON.stringify(BancadaPortal.projection(db.orders.find(o => o.id === i)))), id);

module.exports = {
  CHROME, BASE, OUT, norm, makeRecorder, launch, session, goto, open, closeModal, submit, modalState,
  order, stock, createOrder, setQuote, publish, formalize, requestCancel, withdrawCancel, conferPiece,
  conferTechnical, confirmAcerto, pay, reverse, rectify, deliver, role, mainText, toastText, actionCount,
  queueCount, portalProjection, itemIndex, lineNames, lineIdAt, lineIdByName
};
