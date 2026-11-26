'use strict';
/*
 * R08-001 — N6 em navegador real: selo normalizado único no handler de nova OS.
 * Cobre modo novo, modo "identificar depois" e ausência de modo (bypass do handler),
 * outro cliente, substituta em garantia, unidade existente e preservação dos campos.
 * Uso: BASE_URL=http://127.0.0.1:8199 node r08-n6.cjs
 */
const fs = require('node:fs');
const path = require('node:path');
const { BASE, makeRecorder, launch, session, goto, role } = require('./lib.cjs');
const { results, rec: recRaw } = makeRecorder();
const rec = (id, desc, ok, detail = '') => recRaw(id, desc, ok, typeof detail === 'string' ? detail : JSON.stringify(detail));
const OUT = process.env.RESULT_PATH || path.join(__dirname, 'r08-n6-resultados.json');

async function formState(a) {
  return a.evaluate(() => ({
    count: db.orders.length,
    raw: localStorage.getItem(key),
    toast: (() => { const t = document.querySelector('#toast'); return t && !t.hidden ? t.textContent : ''; })(),
    ids: db.orders.map(o => o.id),
    last: db.orders.length ? (({ id, unit, seal, brand, model }) => ({ id, unit, seal, brand, model }))(db.orders.at(-1)) : null,
    values: Object.fromEntries(['brand', 'model', 'seal'].map(k => [k, document.querySelector(`#new-form input[name=${k}]`)?.value ?? null]))
  }));
}
async function attempt(a, { mode = 'new', seal = '', client = '1', brand = 'Marca N6', model = 'Modelo N6', inject = false, unit = null } = {}) {
  await goto(a, '#ordens');
  await goto(a, '#nova');
  await a.selectOption('#new-form select[name=client]', client);
  if (mode === null) await a.evaluate(() => { const s = document.querySelector('#new-form select[name=mode]'); if (s) s.remove(); });
  else await a.selectOption('#new-form select[name=mode]', mode);
  await a.waitForTimeout(160);
  if (mode === 'existing') await a.selectOption('#new-form select[name=unit]', String(unit));
  if (inject) await a.evaluate(v => {
    const f = document.querySelector('#new-form');
    for (const [k, val] of Object.entries(v)) {
      if (!f.elements[k]) f.insertAdjacentHTML('beforeend', `<input type="hidden" name="${k}" value="">`);
      f.elements[k].value = val;
    }
  }, { brand, model, seal });
  else if (mode !== 'existing') await a.evaluate(v => {
    const f = document.querySelector('#new-form');
    f.elements.brand.value = v.brand; f.elements.model.value = v.model;
    if (f.elements.seal) f.elements.seal.value = v.seal;
    else f.insertAdjacentHTML('beforeend', `<input type="hidden" name="seal" value="${v.seal}">`);
  }, { brand, model, seal });
  await a.fill('#new-form textarea[name=defect]', 'Defeito fictício N6 R08.');
  const before = await formState(a);
  await a.locator('#new-form button[type=submit]').click();
  await a.waitForTimeout(380);
  const after = await formState(a);
  return { before, after };
}
(async () => {
  const browser = await launch();
  try {
    const { ctx, a, errors, consoleErrors } = await session(browser, 1440, 900, 'r08n6');
    await role(a, 'Administrador');
    const base = await attempt(a, { mode: 'new', seal: 'ABC 123' });
    rec('R08-N6-01', 'Selo novo é cadastrado normalmente', base.after.count === base.before.count + 1, base);
    const baseId = base.after.ids.at(-1);

    const dup = await attempt(a, { mode: 'new', seal: 'abc123' });
    rec('R08-N6-02', 'Selo normalizado duplicado (modo novo) é recusado sem gravar e preserva os campos', dup.after.count === dup.before.count && /Selo já cadastrado/.test(dup.after.toast) && dup.after.values.seal === 'abc123' && dup.after.raw === dup.before.raw, dup);

    const later = await attempt(a, { mode: 'later', seal: 'abc123', inject: true });
    rec('R08-N6-03', 'Bypass por modo "identificar depois" é recusado no handler', later.after.count === later.before.count && /Selo já cadastrado/.test(later.after.toast) && later.after.raw === later.before.raw, later);

    const omitted = await attempt(a, { mode: null, seal: 'abc123', inject: true });
    rec('R08-N6-04', 'Bypass por ausência do campo modo é recusado no handler', omitted.after.count === omitted.before.count && /Selo já cadastrado/.test(omitted.after.toast) && omitted.after.raw === omitted.before.raw, omitted);

    const other = await attempt(a, { mode: 'new', seal: ' aBc 123 ', client: '2' });
    rec('R08-N6-05', 'Mesmo selo normalizado em outro cliente é recusado', other.after.count === other.before.count && /Selo já cadastrado/.test(other.after.toast), other);

    // a substitute already delivered with that seal must also block a new common OS
    await a.evaluate(() => {
      const o = db.orders.find(x => x.id === 16);
      o.warranty = { ...(o.warranty || {}), operations: [{ id: 1, type: 'troca', replacement: { unit: 999, brand: 'X', model: 'Y', seal: 'SUB 9' } }] };
      save();
    });
    const sub = await attempt(a, { mode: 'new', seal: ' sub9 ' });
    rec('R08-N6-06', 'Selo de substituta em garantia também bloqueia o cadastro comum', sub.after.count === sub.before.count && /Selo já cadastrado/.test(sub.after.toast), sub);

    const existing = await attempt(a, { mode: 'existing', client: '1', unit: baseId });
    const copied = existing.after.last && base.after.last && existing.after.last.unit === base.after.last.unit && existing.after.last.seal === base.after.last.seal && existing.after.last.brand === base.after.last.brand && existing.after.last.model === base.after.last.model;
    rec('R08-N6-07', 'Selecionar a própria unidade existente não é bloqueado e copia unidade/selo da unidade', existing.after.count === existing.before.count + 1 && existing.after.ids.at(-1) > baseId && copied, existing);

    rec('R08-N6-08', 'Sem exceções ou erros de console no fluxo N6', errors.length === 0 && consoleErrors.length === 0, { errors, consoleErrors });
    await ctx.close();
  } finally {
    await browser.close();
  }
  const summary = results.reduce((s, r) => { s[r.status] = (s[r.status] || 0) + 1; return s; }, {});
  fs.writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), codeSha: process.env.CODE_SHA || '', base: BASE, total: results.length, summary, results }, null, 2));
  console.log(`TOTAL ${results.length} · PASS ${summary.PASS || 0} · FAIL ${summary.FAIL || 0}`);
  if (summary.FAIL) process.exitCode = 1;
})().catch(e => { console.error('FATAL', e); process.exit(1); });
