'use strict';
/*
 * R07-003 — capturas das telas novas/modificadas, estados de erro e índice visual.
 * Manifesto com SHA-256, bytes e dimensões. Navegador real, dados fictícios.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { BASE, OUT, makeRecorder, launch, session, goto, open, closeModal, submit } = require('./lib.cjs');

const { results, rec: recRaw } = makeRecorder();
const rec = (id, desc, ok, detail = '') => recRaw(id, desc, ok, typeof detail === 'string' ? detail : JSON.stringify(detail));
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
async function fillSwap(a, o = {}) {
  const v = { source: 'externa', destination: 'retida_assistencia', type: 'Placa', brand: 'Midea', model: 'Nova', seal: 'NOVA-1', serial: '', imei: '', reason: 'MOTIVO PRIVADO R07-003', cost: '45.00', sku: 'P-001', ...o };
  await a.selectOption('#action-form select[name=source]', v.source);
  await a.waitForTimeout(120);
  if (v.source === 'estoque') await a.selectOption('#action-form select[name=sku]', v.sku);
  else await a.fill('#action-form input[name=cost]', String(v.cost));
  for (const k of ['type', 'brand', 'model', 'seal', 'serial', 'imei']) await a.fill(`#action-form input[name=${k}]`, v[k] || '');
  await a.selectOption('#action-form select[name=destination]', v.destination);
  await a.fill('#action-form textarea[name=reason]', v.reason);
  await a.check('#action-form input[name=confirm]');
}

(async () => {
  const browser = await launch();
  try {
    const { ctx, a } = await session(browser, 1440, 900, 'r07-003c');
    const ids = await a.evaluate(() => {
      const now = '2026-11-26T12:00:00Z';
      db = seed();
      const r = db.orders.find(x => x.id === 18);
      BancadaWarranty.assess(r, db.orders, { coverage: 'coberto', solution: 'troca', diagnosis: 'Falha confirmada na bancada fictícia.', reason: 'Acordo fictício de troca R07-003.', previous: 0, confirm: true }, now, 'Administrador');
      save(); render();
      return { o: 16, r: 18 };
    });
    const R = ids.r;

    await goto(a, `#os/${R}/garantia`);
    await shot(a, 'desktop', '01-os18-garantia-avaliacao-troca-1440.png', 1440);
    await a.setViewportSize({ width: 390, height: 844 });
    await shot(a, 'mobile', '13-os18-garantia-avaliacao-troca-390.png', 390);

    await a.setViewportSize({ width: 1440, height: 900 });
    await goto(a, `#os/${R}/garantia`);
    await open(a, 'warrantySwap', R);
    await shot(a, 'desktop', '02-modal-troca-vazio-1440.png', 1440);
    await a.setViewportSize({ width: 390, height: 844 });
    await shot(a, 'mobile', '14-modal-troca-vazio-390.png', 390);
    await a.setViewportSize({ width: 320, height: 568 });
    await shot(a, 'mobile320', '19-modal-troca-vazio-320.png', 320);
    await a.setViewportSize({ width: 1440, height: 900 });
    await fillSwap(a);
    await shot(a, 'desktop', '03-modal-troca-preenchido-1440.png', 1440);

    // erro de selo duplicado
    await a.evaluate(() => { db.orders.find(x => x.id === 16).seal = 'ANT-1'; save(); });
    await a.fill('#action-form input[name=seal]', ' ant- 1 ');
    await a.evaluate(() => document.querySelector('#action-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    await a.waitForTimeout(280);
    await shot(a, 'desktop', '04-modal-troca-erro-selo-1440.png', 1440);
    await a.setViewportSize({ width: 390, height: 844 });
    await shot(a, 'mobile', '15-modal-troca-erro-selo-390.png', 390);
    await a.setViewportSize({ width: 1440, height: 900 });
    await closeModal(a);

    // modal com origem estoque
    await goto(a, `#os/${R}/garantia`);
    await open(a, 'warrantySwap', R);
    await fillSwap(a, { source: 'estoque', sku: 'P-002' });
    await shot(a, 'desktop', '05-modal-troca-estoque-1440.png', 1440);
    await a.locator('#action-form button[type=submit]').click();
    await a.waitForTimeout(420);
    const post = await a.evaluate(() => {
      const r = db.orders.find(x => x.id === 18);
      return {
        ops: (r.warranty?.operations || []).length,
        qty: db.stock.find(x => x.sku === 'P-002').quantity,
        mov: db.stock.find(x => x.sku === 'P-002').movements?.length || 0,
        toast: (() => { const t = document.querySelector('#toast'); return t && !t.hidden ? t.textContent : ''; })(),
        modal: document.querySelector('#modal').open
      };
    });
    rec('R07C3-03', 'A troca das capturas foi realmente gravada (operação, baixa e modal fechado)', post.ops === 1 && post.qty === 2 && post.mov === 1 && post.modal === false && /Registro atualizado/.test(post.toast), post);

    await goto(a, `#os/${R}/garantia`);
    const panelAfter = await a.evaluate(() => document.querySelector('#main').innerText);
    rec('R07C3-04', 'Painel pós-troca mostra substituição registrada, origem estoque e custo privado', /Substituição registrada/.test(panelAfter) && /Midea/.test(panelAfter) && /Estoque/.test(panelAfter) && /Custo interno/.test(panelAfter), panelAfter.slice(0, 500));
    await shot(a, 'desktop', '06-garantia-substituicao-registrada-1440.png', 1440);
    await a.setViewportSize({ width: 390, height: 844 });
    await shot(a, 'mobile', '16-garantia-substituicao-registrada-390.png', 390);

    await a.setViewportSize({ width: 1440, height: 900 });
    await goto(a, '#estoque');
    await shot(a, 'desktop', '07-estoque-apos-baixa-1440.png', 1440);

    await goto(a, `#os/${ids.o}/garantia`);
    await shot(a, 'desktop', '08-origem-link-retorno-ativo-1440.png', 1440);

    await goto(a, `#imprimir/${R}`);
    await shot(a, 'desktop', '09-impressao-substituta-a4-1440.png', 1440);
    await a.setViewportSize({ width: 768, height: 1024 });
    await shot(a, 'tablet', '21-impressao-substituta-a4-768.png', 768);

    // portal real com token da OS de retorno
    const token = await a.evaluate(i => { const o = db.orders.find(x => x.id === i); BancadaPortal.issue(o, 'd'.repeat(64), Date.now()); save(); return o.publicLink.token; }, R);
    const pp = await ctx.newPage();
    await pp.goto(`${BASE}/portal.html?cap=${Date.now()}#${token}`, { waitUntil: 'networkidle' });
    await pp.waitForTimeout(250);
    const p1 = path.join(DIR, 'desktop', '10-portal-substituta-1440.png');
    await pp.screenshot({ path: p1, fullPage: true });
    const b1 = fs.readFileSync(p1); const d1 = await pp.evaluate(() => ({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight }));
    manifest.push({ file: path.relative(OUT, p1), sha256: crypto.createHash('sha256').update(b1).digest('hex'), bytes: b1.length, width: 1440, ...d1 });
    await pp.setViewportSize({ width: 390, height: 844 });
    const p2 = path.join(DIR, 'mobile', '17-portal-substituta-390.png');
    await pp.screenshot({ path: p2, fullPage: true });
    const b2 = fs.readFileSync(p2); const d2 = await pp.evaluate(() => ({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight }));
    manifest.push({ file: path.relative(OUT, p2), sha256: crypto.createHash('sha256').update(b2).digest('hex'), bytes: b2.length, width: 390, ...d2 });
    await pp.close();

    // finaliza e abre o formulário de retorno da substituta
    await a.setViewportSize({ width: 1440, height: 900 });
    await a.evaluate(() => { const r = db.orders.find(x => x.id === 18); r.status = 'Finalizado'; r.conclusion = '2026-11-26'; save(); });
    await goto(a, `#retorno/${ids.o}`);
    await shot(a, 'desktop', '11-retorno-substituto-form-1440.png', 1440);
    await a.setViewportSize({ width: 390, height: 844 });
    await shot(a, 'mobile', '18-retorno-substituto-form-390.png', 390);

    // estado bloqueado: solução reparo (sem ação de troca)
    await a.setViewportSize({ width: 1440, height: 900 });
    await a.evaluate(() => {
      const now = '2026-11-26T12:00:00Z';
      db = seed();
      const r = db.orders.find(x => x.id === 18);
      BancadaWarranty.assess(r, db.orders, { coverage: 'coberto', solution: 'reparo_sem_cobranca', diagnosis: 'Falha', reason: 'Reparo coberto', previous: 0, confirm: true }, now, 'Administrador');
      save(); render();
    });
    await goto(a, '#os/18/garantia');
    await shot(a, 'desktop', '12-garantia-sem-troca-1440.png', 1440);

    rec('R07C3-01', 'Capturei as telas novas/modificadas e estados de erro', manifest.length >= 18, manifest.length + ' PNG');
    const unique = new Set(manifest.map(m => m.file));
    rec('R07C3-02', 'Manifesto sem arquivos duplicados e com SHA-256', unique.size === manifest.length && manifest.every(m => /^[a-f0-9]{64}$/.test(m.sha256)), unique.size + ' arquivos');
    await ctx.close();
  } finally {
    await browser.close();
    fs.mkdirSync(path.join(OUT, 'testes'), { recursive: true });
    fs.writeFileSync(path.join(OUT, 'testes', 'r07-003-capturas.json'), JSON.stringify({ generatedAt: new Date().toISOString(), codeSha: process.env.CODE_SHA || '', total: manifest.length, captures: manifest }, null, 2));
    const summary = results.reduce((s, r) => { s[r.status] = (s[r.status] || 0) + 1; return s; }, {});
    fs.writeFileSync(path.join(OUT, 'testes', 'r07-003-capture-resultados.json'), JSON.stringify({ generatedAt: new Date().toISOString(), codeSha: process.env.CODE_SHA || '', total: results.length, summary, results }, null, 2));
    console.log(`TOTAL ${results.length} · PASS ${summary.PASS || 0} · FAIL ${summary.FAIL || 0} · PNG ${manifest.length}`);
  }
})().catch(e => { console.error('ERRO FATAL', e); process.exit(1); });
