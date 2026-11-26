'use strict';
/*
 * R06 — capturas do delta de cancelamentos em 320/390/768/1440.
 * Capturas únicas por estado; hashes SHA-256 em capturas.json.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {
  BASE, OUT, makeRecorder, launch, session, goto, open, closeModal, submit, createOrder, setQuote,
  publish, formalize, requestCancel, conferPiece, conferTechnical, confirmAcerto, pay, reverse, role,
  itemIndex
} = require('./lib.cjs');

const { results, rec } = makeRecorder();
const manifest = [];

async function hideToast(a) {
  await a.evaluate(() => { const t = document.querySelector('#toast'); if (t) t.hidden = true; });
}
async function shot(page, dir, name, full = true, viewport = null) {
  const d = path.join(OUT, 'capturas', dir);
  fs.mkdirSync(d, { recursive: true });
  const file = path.join(d, `${name}.png`);
  if (viewport) await page.setViewportSize(viewport);
  await hideToast(page);
  await page.waitForTimeout(140);
  await page.screenshot({ path: file, fullPage: full, animations: 'disabled' });
  const sha = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  manifest.push({ file: path.relative(OUT, file), sha256: sha, bytes: fs.statSync(file).size });
  return file;
}

(async () => {
  const browser = await launch();
  try {
    const { ctx, a, errors, consoleErrors, requests } = await session(browser, 1440, 900, 'r06cap');

    // Order A — request modal and pending panel without items.
    await goto(a, '#os/23/cancelamento');
    await shot(a, 'desktop', '01-pedido-modal-1440', false);
    await open(a, 'cancelrequest', 23);
    await a.selectOption('#action-form select[name=origin]', 'cliente');
    await a.fill('#action-form textarea[name=reason]', 'Cliente pediu o cancelamento — captura R06.');
    await shot(a, 'desktop', '02-pedido-modal-preenchido-1440', false);
    await submit(a);
    await goto(a, '#inicio');
    await shot(a, 'desktop', '03-fila-cancelamentos-1440');
    await goto(a, '#ordens');
    await a.locator('[data-action="filter:cancelamentos"]').click();
    await a.waitForTimeout(200);
    await shot(a, 'desktop', '04-fila-os-pendente-1440');

    // Order P — pieces, loss and conference.
    const piece = await createOrder(a, { brand: 'Captura', model: 'Peças R06', defect: 'Capturas de conferência R06.' });
    const pid = piece.id;
    await setQuote(a, pid, [
      { type: 'Peça', name: 'IGBT de captura', quantity: 3, unit: 3000 },
      { type: 'Peça', name: 'Optoacoplador de captura', quantity: 2, unit: 1000 },
      { type: 'Serviço', name: 'Diagnóstico de captura', quantity: 1, unit: 5000 },
      { type: 'Serviço', name: 'Reparo de captura', quantity: 1, unit: 8000 }
    ], 1000);
    await publish(a, pid);
    await requestCancel(a, pid, 'cliente', 'Pedido com peças — captura R06.');
    await goto(a, `#os/${pid}/cancelamento`);
    await shot(a, 'desktop', '05-conferencia-pendente-1440');
    await open(a, 'cancelitem', pid, 0);
    await a.selectOption('#action-form select[name=disposition]', 'lost');
    await a.fill('#action-form input[name=quantity]', '2');
    await a.fill('#action-form textarea[name=reason]', 'Peça consumida na bancada — captura R06.');
    await shot(a, 'desktop', '06-item-perda-modal-1440', false);
    await a.check('#action-form input[name=confirm]');
    await submit(a);
    await goto(a, `#os/${pid}/cancelamento`);
    await a.evaluate(() => { document.querySelectorAll('#main details').forEach(d => { d.open = true; }); });
    await shot(a, 'desktop', '07-conferencia-historico-item-1440');

    // Order R — full refund settlement, done state, finance, portal and delivery.
    const refund = await createOrder(a, { brand: 'Captura', model: 'Devolução R06', defect: 'Capturas de acerto R06.' });
    const rid = refund.id;
    await setQuote(a, rid, [{ type: 'Serviço', name: 'Reparo com devolução', quantity: 1, unit: 24000 }], 0);
    await publish(a, rid); await formalize(a, rid);
    await pay(a, rid, 10000, { method: 'Pix' });
    await pay(a, rid, 14000, { method: 'Dinheiro' });
    await requestCancel(a, rid, 'cliente', 'Pedido com devolução — captura R06.');
    await conferTechnical(a, rid, 'Serviço não executado; conferência de captura R06.');
    await goto(a, `#os/${rid}/cancelamento`);
    await open(a, 'cancelconfirm', rid);
    await a.fill('#action-form input[name=gross]', '100.00');
    await a.fill('#action-form input[name=discount]', '20.00');
    await a.waitForTimeout(180);
    await a.fill('#action-form input[name=refund]', '160.00');
    await a.fill('#action-form input[name=ref]', 'Comprovante de captura R06');
    await shot(a, 'desktop', '08-acerto-devolucao-modal-1440', false);
    await a.fill('#action-form textarea[name=reason]', 'Devolução do excedente — captura R06.');
    await a.check('#action-form input[name=settlementConfirmed]');
    await a.check('#action-form input[name=financialConfirmed]');
    await a.check('#action-form input[name=confirm]');
    await submit(a);
    await goto(a, `#os/${rid}/cancelamento`);
    await a.evaluate(() => { document.querySelectorAll('#main details').forEach(d => { d.open = true; }); });
    await shot(a, 'desktop', '09-cancelado-historico-1440');
    await goto(a, `#os/${rid}/financeiro`);
    await shot(a, 'desktop', '10-financeiro-devolucao-1440');
    await goto(a, `#os/${rid}/cancelamento`);
    await open(a, 'delivery', rid);
    await shot(a, 'desktop', '11-entrega-modal-1440', false);
    await closeModal(a);

    // Portal.
    const token = await a.evaluate(i => {
      const o = db.orders.find(x => x.id === i);
      if (!o.publicLink) { BancadaPortal.issue(o, BancadaPortal.token()); save(); }
      return o.publicLink?.token;
    }, rid);
    const p = await ctx.newPage();
    await p.goto(`${BASE}/portal.html#${token}`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(300);
    await shot(p, 'desktop', '12-portal-cancelado-1440');

    // Order Z — zero due without prior obligation.
    const free = await createOrder(a, { brand: 'Captura', model: 'Zero R06', defect: 'Capturas de total zero R06.' });
    const zid = free.id;
    await requestCancel(a, zid, 'assistencia', 'Cancelamento sem obrigação — captura R06.');
    await conferTechnical(a, zid, 'Sem itens; conferência de captura R06.');
    await goto(a, `#os/${zid}/cancelamento`);
    await open(a, 'cancelconfirm', zid);
    await shot(a, 'desktop', '13-acerto-sem-obrigacao-modal-1440', false);
    await closeModal(a);

    // Widths: 768, 390, 320 for the delta states.
    for (const [w, h, dir] of [[768, 1024, 'tablet'], [390, 844, 'mobile'], [320, 568, 'mobile']]) {
      const v = w;
      await a.setViewportSize({ width: w, height: h });
      await goto(a, `#os/${pid}/cancelamento`);
      await shot(a, dir, `14-conferencia-pendente-${v}`);
      await open(a, 'cancelitem', pid, 1);
      await shot(a, dir, `15-item-peca-modal-${v}`, false);
      await closeModal(a);
      await goto(a, `#os/${rid}/cancelamento`);
      await a.evaluate(() => { document.querySelectorAll('#main details').forEach(d => { d.open = true; }); });
      await shot(a, dir, `16-cancelado-${v}`);
      await goto(a, `#os/${rid}/financeiro`);
      await shot(a, dir, `17-financeiro-${v}`);
      await goto(a, '#inicio');
      await shot(a, dir, `18-fila-${v}`);
      await p.setViewportSize({ width: w, height: h });
      await p.waitForTimeout(180);
      await shot(p, dir, `19-portal-${v}`, true, { width: w, height: h });
    }

    // Extreme value at 320.
    const extreme = await createOrder(a, { brand: 'Captura', model: 'Extremo R06', defect: 'Valor extremo R06.' });
    const eid = extreme.id;
    await requestCancel(a, eid, 'cliente', 'Cancelamento de valor extremo — captura R06.');
    await conferTechnical(a, eid, 'Conferência de valor extremo — captura R06.');
    await a.evaluate(i => {
      const o = db.orders.find(x => x.id === i);
      BancadaCancel.confirm(o, { key: BancadaCancel.financialKey(o), gross: 999999999, discount: 0, refund: 0, confirm: true, financialConfirmed: true, settlementConfirmed: true, reason: 'Valor extremo de captura R06.' }, new Date().toISOString(), today(), db.orders);
      save(); render();
    }, eid);
    await a.setViewportSize({ width: 320, height: 568 });
    await goto(a, `#os/${eid}/cancelamento`);
    await shot(a, 'mobile', '20-valor-extremo-320');

    // Finance list with cancelled receivables.
    await a.setViewportSize({ width: 1440, height: 900 });
    await goto(a, '#financeiro');
    await shot(a, 'desktop', '21-financeiro-lista-canceladas-1440');

    // Unique hashes.
    const byHash = new Map();
    for (const m of manifest) {
      const list = byHash.get(m.sha256) || [];
      list.push(m.file);
      byHash.set(m.sha256, list);
    }
    const duplicates = [...byHash.values()].filter(list => list.length > 1);
    fs.writeFileSync(path.join(OUT, 'testes', 'capturas.json'), JSON.stringify({
      generatedAt: new Date().toISOString(), codeSha: process.env.CODE_SHA || '',
      total: manifest.length, unique: byHash.size, duplicates, files: manifest
    }, null, 2));
    rec('R06-CAP-01', 'Capturas do delta geradas com hashes únicos', manifest.length > 0 && duplicates.length === 0, JSON.stringify({ total: manifest.length, unique: byHash.size, duplicates }));
    rec('R06-CAP-02', 'Capturas sem exceções de página', errors.length === 0 && consoleErrors.length === 0, JSON.stringify({ errors, consoleErrors }));
    rec('R06-CAP-03', 'Capturas sem requisições externas', requests.every(u => u.startsWith(BASE) || u.startsWith('data:')), JSON.stringify(requests.filter(u => !u.startsWith(BASE)).slice(0, 3)));

    fs.writeFileSync(path.join(OUT, 'testes', 'capture-resultados.json'), JSON.stringify({
      generatedAt: new Date().toISOString(), codeSha: process.env.CODE_SHA || '', results, total: manifest.length, unique: byHash.size
    }, null, 2));
    const pass = results.filter(r => r.status === 'PASS').length, fail = results.filter(r => r.status === 'FAIL').length;
    console.log(`\nTOTAL ${results.length} · PASS ${pass} · FAIL ${fail} · SHOTS ${manifest.length} · UNIQUE ${byHash.size}`);
    if (fail) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch(e => { console.error('FATAL', e); process.exit(1); });
