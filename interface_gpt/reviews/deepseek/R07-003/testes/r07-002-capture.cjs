'use strict';
/*
 * R07-002 — capturas das telas novas/modificadas, estados de erro e índice visual.
 * Manifesto com SHA-256, bytes e dimensões. Navegador real, dados fictícios.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { BASE, OUT, makeRecorder, launch, session, goto, open, closeModal, submit, role } = require('./lib.cjs');

const { results, rec } = makeRecorder();
const manifest = [];
const DIR = path.join(OUT, 'capturas');

async function shot(a, dir, name, width) {
  const file = path.join(DIR, dir, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await a.waitForTimeout(180);
  await a.screenshot({ path: file, fullPage: true });
  const buf = fs.readFileSync(file);
  const dim = await a.evaluate(() => ({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight }));
  manifest.push({ file: path.relative(OUT, file), sha256: crypto.createHash('sha256').update(buf).digest('hex'), bytes: buf.length, width, ...dim });
  return file;
}

async function fixture(a) {
  return a.evaluate(() => {
    const now = '2026-11-26T12:00:00Z', day = '2026-11-26';
    db = seed();
    const nextId = () => Math.max(0, ...db.orders.map(o => o.id)) + 1;
    const mk = ({ total = 50000, paid = 20000, unit = null } = {}) => {
      const o = { id: nextId(), client: 1, unit: null, brand: 'LG', model: 'Inverter', type: 'Placa eletrônica', status: 'Finalizado', entry: '2026-08-20', conclusion: '2026-09-01', warrantyDays: 90, total, paid: 0, approval: 'Aprovado', delivery: null, history: [{ time: '2026-08-20T10:00:00Z', text: 'Entrada original' }] };
      o.unit = unit || o.id;
      o.billing = { due: '2026-12-20', items: [{ type: 'Serviço', name: 'Serviço original', quantity: 1, unit: total }], discount: 0 };
      if (paid) BancadaFinance.receive(o, paid, '2026-11-25', 'Pix', now);
      db.orders.push(o);
      const r = BancadaWarranty.create(o, db.orders, { defect: 'Falha após o reparo', confirm: true }, day);
      db.orders.push(r);
      BancadaWarranty.assess(r, db.orders, { coverage: 'coberto', solution: 'devolucao_valor', diagnosis: 'Falha confirmada', reason: 'Acordo fictício', previous: 0, confirm: true }, now, 'Administrador');
      return [o.id, r.id];
    };
    const ids = { a: mk(), neg: mk(), f02: mk(), roots: [] };
    const rootA = mk({ unit: null, total: 30000, paid: 30000 });
    db.orders.find(o => o.id === rootA[1]).status = 'Finalizado';
    db.orders.find(o => o.id === rootA[1]).conclusion = day;
    const rootB = { ...db.orders.find(o => o.id === rootA[0]), id: nextId(), unit: rootA[0], total: 42000, paid: 0, conclusion: '2026-10-01', warrantyDays: 180, billing: { due: '2026-12-30', items: [{ type: 'Serviço', name: 'Serviço B', quantity: 1, unit: 42000 }], discount: 0 }, history: [], financeLedger: { opening: 0, events: [] } };
    delete rootB.quote;
    db.orders.push(rootB);
    ids.roots = [rootA[0], rootA[1], rootB.id];
    db.orders.find(o => o.id === 18).warranty = undefined;
    db.orders.find(o => o.id === 18).coverage = 'Em avaliação';
    db.orders.find(o => o.id === 18).status = 'Aberto';
    save(); render(); return ids;
  });
}
async function fillRefund(a, { mode, amount, method = 'Pix', reference = 'COMPROVANTE FICTÍCIO R07-002', reason = 'MOTIVO PRIVADO R07-002', confirm = true }) {
  await a.selectOption('#action-form select[name=mode]', mode);
  if (amount !== null) await a.fill('#action-form input[name=amount]', amount);
  await a.selectOption('#action-form select[name=method]', method);
  await a.fill('#action-form input[name=reference]', reference);
  await a.fill('#action-form textarea[name=reason]', reason);
  if (confirm) await a.check('#action-form input[name=confirm]');
}

(async () => {
  const browser = await launch();
  try {
    const { ctx, a } = await session(browser, 1440, 900, 'r07-002c');
    const ids = await fixture(a);
    const [P, R] = ids.a, [N, NR] = ids.neg, [FO, FR] = ids.f02, [ROOT_A, RET_A, ROOT_B] = ids.roots;

    // 01/13 — garantia #018 com avaliação devolucao_valor (mesmo nome da R07-001 para delta)
    await goto(a, '#os/18/garantia');
    await open(a, 'warrantyAssess', 18);
    await a.selectOption('#action-form select[name=coverage]', 'coberto');
    await a.selectOption('#action-form select[name=solution]', 'devolucao_valor');
    await a.fill('#action-form textarea[name=diagnosis]', 'Falha confirmada na bancada fictícia.');
    await a.fill('#action-form textarea[name=reason]', 'Acordo fictício de devolução.');
    await a.check('#action-form input[name=confirm]');
    await submit(a);
    await shot(a, 'desktop', '01-os18-garantia-1440.png', 1440);
    await a.setViewportSize({ width: 390, height: 844 });
    await shot(a, 'mobile', '13-os18-garantia-390.png', 390);
    await a.setViewportSize({ width: 1440, height: 900 });

    // 02/14 — modal vazio; 03/15 — total com prévia e readOnly
    await goto(a, `#os/${R}/garantia`);
    await open(a, 'warrantyRefund', R);
    await shot(a, 'desktop', '02-modal-devolucao-vazio-1440.png', 1440);
    await a.setViewportSize({ width: 390, height: 844 });
    await shot(a, 'mobile', '14-modal-devolucao-vazio-390.png', 390);
    await a.setViewportSize({ width: 1440, height: 900 });
    await a.selectOption('#action-form select[name=mode]', 'total');
    await a.waitForTimeout(150);
    await shot(a, 'desktop', '03-modal-devolucao-total-1440.png', 1440);
    await a.setViewportSize({ width: 390, height: 844 });
    await shot(a, 'mobile', '15-modal-devolucao-total-390.png', 390);
    await a.setViewportSize({ width: 320, height: 568 });
    await shot(a, 'mobile320', '16-modal-devolucao-total-320.png', 320);
    await a.setViewportSize({ width: 1440, height: 900 });
    await closeModal(a);

    // 04/04b — parcial e financeiro
    await fillRefundFromScratch(a, R, 'parcial', '50.00');
    await goto(a, `#os/${P}/financeiro`);
    await shot(a, 'desktop', '04-financeiro-parcial-1440.png', 1440);
    await a.setViewportSize({ width: 390, height: 844 });
    await shot(a, 'mobile', '17-financeiro-parcial-390.png', 390);
    await a.setViewportSize({ width: 1440, height: 900 });
    // 05 — modal de correção
    await goto(a, `#os/${R}/garantia`);
    await a.locator('[data-action^="modal:warrantyRefundCorrect:"]').first().click();
    await a.waitForTimeout(160);
    await shot(a, 'desktop', '05-modal-correcao-1440.png', 1440);
    await closeModal(a);
    // 06 — total e financeiro
    await fillRefundFromScratch(a, R, 'total', null);
    await goto(a, `#os/${P}/financeiro`);
    await shot(a, 'desktop', '06-financeiro-reembolsado-1440.png', 1440);
    await a.setViewportSize({ width: 390, height: 844 });
    await shot(a, 'mobile', '18-financeiro-reembolsado-390.png', 390);
    await a.setViewportSize({ width: 768, height: 1024 });
    await shot(a, 'tablet', '19-financeiro-reembolsado-768.png', 768);
    await a.setViewportSize({ width: 1440, height: 900 });
    // 07/19 — lista financeira
    await goto(a, '#financeiro');
    await shot(a, 'desktop', '07-lista-financeira-1440.png', 1440);
    await a.setViewportSize({ width: 320, height: 568 });
    await shot(a, 'mobile320', '20-lista-financeira-320.png', 320);
    await a.setViewportSize({ width: 1440, height: 900 });
    // 08 — impressão A4
    await goto(a, `#imprimir/${P}`);
    await shot(a, 'desktop', '08-impressao-reembolsado-1440.png', 1440);
    // 09/20 — portal real
    const token = await a.evaluate(i => { const o = db.orders.find(x => x.id === i); BancadaPortal.issue(o, 'c'.repeat(64), Date.now()); save(); return o.publicLink.token; }, P);
    const pp = await ctx.newPage();
    await pp.goto(`${BASE}/portal.html?cap=${Date.now()}#${token}`, { waitUntil: 'networkidle' });
    await pp.waitForTimeout(250);
    fs.mkdirSync(path.join(DIR, 'desktop'), { recursive: true });
    const p1 = path.join(DIR, 'desktop', '09-portal-reembolsada-1440.png');
    await pp.screenshot({ path: p1, fullPage: true });
    const b1 = fs.readFileSync(p1); const d1 = await pp.evaluate(() => ({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight }));
    manifest.push({ file: path.relative(OUT, p1), sha256: crypto.createHash('sha256').update(b1).digest('hex'), bytes: b1.length, width: 1440, ...d1 });
    await pp.setViewportSize({ width: 390, height: 844 });
    const p2 = path.join(DIR, 'mobile', '20-portal-reembolsada-390.png');
    await pp.screenshot({ path: p2, fullPage: true });
    const b2 = fs.readFileSync(p2); const d2 = await pp.evaluate(() => ({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight }));
    manifest.push({ file: path.relative(OUT, p2), sha256: crypto.createHash('sha256').update(b2).digest('hex'), bytes: b2.length, width: 390, ...d2 });
    await pp.close();
    // 10/21 — erro de excesso no handler real
    await goto(a, `#os/${NR}/garantia`);
    await open(a, 'warrantyRefund', NR);
    await fillRefund(a, { mode: 'parcial', amount: '500.01' });
    await a.evaluate(() => document.querySelector('#action-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    await a.waitForTimeout(300);
    await shot(a, 'desktop', '10-modal-erro-excesso-1440.png', 1440);
    await a.setViewportSize({ width: 320, height: 568 });
    await shot(a, 'mobile320', '21-modal-erro-excesso-320.png', 320);
    await a.setViewportSize({ width: 1440, height: 900 });
    await closeModal(a);
    // 11 — F02 retorno elegível
    await goto(a, `#os/${FR}/cancelamento`);
    await shot(a, 'desktop', '11-cancelamento-f02-elegivel-1440.png', 1440);
    // 12/22 — raízes independentes
    await goto(a, `#os/${ROOT_B}/garantia`);
    await shot(a, 'desktop', '12-raiz-b-garantia-1440.png', 1440);
    await a.setViewportSize({ width: 768, height: 1024 });
    await shot(a, 'tablet', '22-raiz-b-garantia-768.png', 768);
    await ctx.close();

    rec('R07C-01', 'Capturei as telas novas/modificadas e estados de erro', manifest.length >= 20, manifest.length + ' PNG');
    const unique = new Set(manifest.map(m => m.file));
    rec('R07C-02', 'Manifesto sem arquivos duplicados e com SHA-256', unique.size === manifest.length && manifest.every(m => /^[a-f0-9]{64}$/.test(m.sha256)), unique.size + ' arquivos');
  } finally {
    await browser.close();
    fs.mkdirSync(path.join(OUT, 'testes'), { recursive: true });
    fs.writeFileSync(path.join(OUT, 'testes', 'r07-002-capturas.json'), JSON.stringify({ generatedAt: new Date().toISOString(), codeSha: process.env.CODE_SHA || '', total: manifest.length, captures: manifest }, null, 2));
    const summary = results.reduce((s, r) => { s[r.status] = (s[r.status] || 0) + 1; return s; }, {});
    fs.writeFileSync(path.join(OUT, 'testes', 'r07-002-capture-resultados.json'), JSON.stringify({ generatedAt: new Date().toISOString(), codeSha: process.env.CODE_SHA || '', total: results.length, summary, results }, null, 2));
    console.log(`TOTAL ${results.length} · PASS ${summary.PASS || 0} · FAIL ${summary.FAIL || 0} · PNG ${manifest.length}`);
  }
})().catch(e => { console.error('ERRO FATAL', e); process.exit(1); });

async function fillRefundFromScratch(a, retId, mode, amount) {
  await goto(a, `#os/${retId}/garantia`);
  if (!(await open(a, 'warrantyRefund', retId))) throw new Error('modal refund não abriu');
  await fillRefund(a, { mode, amount });
  return submit(a);
}
