'use strict';
/*
 * R07-001 — capturas do incremento de garantia em 1440/768/390/320.
 * Hashes SHA-256 e dimensões no manifesto; nada é sobrescrito em R01–R06.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {
  BASE, OUT, makeRecorder, launch, session, goto, open, closeModal, submit, setQuote, publish
} = require('./lib.cjs');

const { results, rec } = makeRecorder();
const manifest = [];
const CH = { 1440: 900, 768: 1024, 390: 844, 320: 568 };

function pngSize(file) {
  const b = fs.readFileSync(file);
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}
async function hideToast(a) {
  await a.evaluate(() => { const t = document.querySelector('#toast'); if (t) t.hidden = true; });
}
async function shot(page, dir, name, w, { full = true, hash = null, modal = null, id = null } = {}) {
  if (hash) { await page.setViewportSize({ width: w, height: CH[w] }); await goto(page, hash); }
  if (modal) { if (!(await open(page, modal, id))) throw new Error('modal ' + modal + ' não abriu em ' + name); }
  await hideToast(page);
  await page.waitForTimeout(160);
  const d = path.join(OUT, 'capturas', dir);
  fs.mkdirSync(d, { recursive: true });
  const file = path.join(d, name + '.png');
  await page.screenshot({ path: file, fullPage: full, animations: 'disabled' });
  const size = pngSize(file);
  const sha = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  manifest.push({ file: path.relative(OUT, file), sha256: sha, bytes: fs.statSync(file).size, ...size, width: w });
  return file;
}
async function assess(a, id) {
  await goto(a, `#os/${id}/garantia`);
  if (!(await open(a, 'warrantyAssess', id))) throw new Error('avaliação não abriu');
  await a.selectOption('#action-form select[name=coverage]', 'nao_coberto');
  await a.selectOption('#action-form select[name=solution]', 'novo_orcamento');
  await a.fill('#action-form textarea[name=diagnosis]', 'Falha fora da cobertura — captura R07.');
  await a.fill('#action-form textarea[name=reason]', 'Avaliação fictícia para captura.');
  await a.check('#action-form input[name=confirm]');
  return submit(a);
}

(async () => {
  const browser = await launch();
  try {
    const { ctx, a, errors, consoleErrors } = await session(browser, 1440, 900, 'r07cap');
    await assess(a, 18);
    await goto(a, '#os/18/garantia');
    await open(a, 'warrantyCost', 18);
    await a.fill('#action-form input[name=amount]', '25.50');
    await a.fill('#action-form input[name=minutes]', '30');
    await a.fill('#action-form textarea[name=reason]', 'Custo interno fictício — captura R07.');
    await a.check('#action-form input[name=confirm]');
    await submit(a);
    await setQuote(a, 18, [{ type: 'Serviço', name: 'Reparo adicional fictício', quantity: 1, unit: 5000 }], 0);
    await publish(a, 18);
    await goto(a, '#retorno/20');
    await a.fill('#new-form textarea[name=defect]', 'Placa voltou a falhar após o reparo — captura R07.');
    await a.evaluate(() => {
      const f = document.querySelector('#new-form');
      f.elements.items.value = 'Cabo de força';
      f.elements.condition.value = 'Embalagem amassada';
    });
    await a.check('#new-form input[name=confirm]');
    await a.locator('#new-form button[type=submit]').click();
    await a.waitForTimeout(420);
    const idReturn = await a.evaluate(() => db.orders.at(-1).id);

    await a.setViewportSize({ width: 1440, height: 900 });
    await shot(a, 'desktop', '01-os18-garantia-1440', 1440, { hash: '#os/18/garantia' });
    await shot(a, 'desktop', '02-os16-origem-1440', 1440, { hash: '#os/16' });
    await shot(a, 'desktop', '03-retorno20-bloqueado-1440', 1440, { hash: '#retorno/20' });
    await shot(a, 'desktop', '04-os18-orcamento-1440', 1440, { hash: '#os/18/orcamento' });
    await shot(a, 'desktop', '05-retorno-novo-garantia-1440', 1440, { hash: '#os/' + idReturn + '/garantia' });
    await shot(a, 'desktop', '06-fila-retornos-1440', 1440, { hash: '#ordens' });
    await a.locator('[data-action="filter:retornos"]').click();
    await a.waitForTimeout(220);
    await shot(a, 'desktop', '07-fila-retornos-filtrada-1440', 1440, { full: true });
    await shot(a, 'desktop', '08-modal-avaliacao-1440', 1440, { full: false, hash: '#os/18/garantia', modal: 'warrantyAssess', id: 18 });
    await shot(a, 'desktop', '09-modal-custo-1440', 1440, { full: false, hash: '#os/18/garantia', modal: 'warrantyCost', id: 18 });
    await closeModal(a);

    await a.locator('[data-action="modal:issuelink:18"]').count();
    await goto(a, '#os/18/orcamento');
    if (await open(a, 'issuelink', 18)) { await a.check('#action-form input[name=confirm]'); await submit(a); }
    const token = await a.evaluate(() => db.orders.find(x => x.id === 18).publicLink?.token || null);
    if (token) {
      const p = await ctx.newPage();
      await p.setViewportSize({ width: 1440, height: 900 });
      await p.goto(`${BASE}/portal.html#${token}`, { waitUntil: 'networkidle' });
      await p.waitForTimeout(220);
      const pf = path.join(OUT, 'capturas', 'desktop', '10-portal-retorno-1440.png');
      await p.screenshot({ path: pf, fullPage: true, animations: 'disabled' });
      const size = pngSize(pf);
      manifest.push({ file: path.relative(OUT, pf), sha256: crypto.createHash('sha256').update(fs.readFileSync(pf)).digest('hex'), bytes: fs.statSync(pf).size, ...size, width: 1440 });
      await p.close();
    }

    await shot(a, 'tablet', '11-os18-garantia-768', 768, { hash: '#os/18/garantia' });
    await shot(a, 'tablet', '12-retorno20-bloqueado-768', 768, { hash: '#retorno/20' });
    await shot(a, 'mobile', '13-os18-garantia-390', 390, { hash: '#os/18/garantia' });
    await shot(a, 'mobile', '14-retorno-novo-garantia-390', 390, { hash: '#os/' + idReturn + '/garantia' });
    await shot(a, 'mobile', '15-retorno20-bloqueado-390', 390, { hash: '#retorno/20' });
    await shot(a, 'mobile', '16-os18-orcamento-390', 390, { hash: '#os/18/orcamento' });
    await shot(a, 'mobile', '17-modal-avaliacao-390', 390, { full: false, hash: '#os/18/garantia', modal: 'warrantyAssess', id: 18 });
    await shot(a, 'mobile', '18-modal-custo-390', 390, { full: false, hash: '#os/18/garantia', modal: 'warrantyCost', id: 18 });
    await closeModal(a);
    await shot(a, 'mobile320', '19-os18-garantia-320', 320, { hash: '#os/18/garantia' });
    await shot(a, 'mobile320', '20-retorno20-bloqueado-320', 320, { hash: '#retorno/20' });
    await shot(a, 'mobile320', '21-modal-avaliacao-320', 320, { full: false, hash: '#os/18/garantia', modal: 'warrantyAssess', id: 18 });
    await closeModal(a);

    const byHash = new Map();
    for (const m of manifest) {
      const list = byHash.get(m.sha256) || [];
      list.push(m.file);
      byHash.set(m.sha256, list);
    }
    const duplicates = [...byHash.values()].filter(x => x.length > 1);
    rec('R07-CAP-01', 'Capturas geradas com hashes únicos e dimensões registradas',
      manifest.length === 21 && duplicates.length === 0 && manifest.every(m => m.width >= 320 && m.height > 0),
      JSON.stringify({ total: manifest.length, unique: byHash.size, duplicates }));
    rec('R07-CAP-02', 'Sem erros de página ou console durante as capturas',
      errors.length === 0 && consoleErrors.length === 0, JSON.stringify({ errors, consoleErrors }));

    const summary = results.reduce((s, r) => { s[r.status] = (s[r.status] || 0) + 1; return s; }, {});
    fs.mkdirSync(path.join(OUT, 'testes'), { recursive: true });
    fs.writeFileSync(path.join(OUT, 'testes', 'r07-capturas.json'), JSON.stringify({
      generatedAt: new Date().toISOString(), codeSha: process.env.CODE_SHA || '', total: manifest.length, summary, manifest, results
    }, null, 2));
    console.log(`TOTAL ${results.length} · PASS ${summary.PASS || 0} · FAIL ${summary.FAIL || 0} · capturas ${manifest.length}`);
  } finally {
    await browser.close();
  }
})().catch(e => { console.error('ERRO FATAL', e); process.exit(1); });
