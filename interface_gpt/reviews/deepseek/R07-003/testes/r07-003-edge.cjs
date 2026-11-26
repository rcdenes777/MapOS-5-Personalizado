'use strict';
/*
 * R07-003 — bordas: responsividade 320/390/768/1440, teclado/foco, axe,
 * campos condicionais, textos extremos, modal e portal da substituta.
 */
const fs = require('node:fs');
const path = require('node:path');
const axe = require('axe-core');
const { BASE, OUT, makeRecorder, launch, session, goto, open, closeModal, role, mainText, actionCount } = require('./lib.cjs');

const { results, rec: recRaw } = makeRecorder();
const rec = (id, desc, ok, detail = '') => recRaw(id, desc, ok, typeof detail === 'string' ? detail : JSON.stringify(detail));
const scans = [];
const WIDTHS = [320, 390, 768, 1440];
const H = { 320: 568, 390: 844, 768: 1024, 1440: 900 };
const norm = s => String(s).replace(/\u00a0/g, ' ');
const overflow = a => a.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

async function scan(a, label, viewport) {
  const res = await a.evaluate(async () => await axe.run(document, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }
  }));
  const v = res.violations.map(x => ({ id: x.id, impact: x.impact, help: x.help, nodes: x.nodes.slice(0, 4).map(n => ({ target: n.target, summary: n.failureSummary })) }));
  scans.push({ label, viewport, violations: v });
  rec(`R07E3-AXE-${label}-${viewport}`, `axe sem violações: ${label} ${viewport}`, v.length === 0, v);
}

async function fixture(a) {
  return a.evaluate(() => {
    const now = '2026-11-26T12:00:00Z';
    db = seed();
    const r = db.orders.find(x => x.id === 18);
    BancadaWarranty.assess(r, db.orders, { coverage: 'coberto', solution: 'troca', diagnosis: 'Falha confirmada', reason: 'Acordo fictício', previous: 0, confirm: true }, now, 'Administrador');
    save(); render();
    return { r: 18, o: 16 };
  });
}
async function fillSwap(a, o = {}) {
  const v = { source: 'externa', destination: 'retida_assistencia', type: 'Placa', brand: 'Midea', model: 'Nova', seal: 'NOVA-1', serial: '', imei: '', reason: 'Motivo fictício', cost: '45.00', ...o };
  await a.selectOption('#action-form select[name=source]', v.source);
  await a.waitForTimeout(120);
  if (v.source === 'estoque') await a.selectOption('#action-form select[name=sku]', v.sku || 'P-001');
  else await a.fill('#action-form input[name=cost]', v.cost === null ? '' : String(v.cost));
  for (const k of ['type', 'brand', 'model', 'seal', 'serial', 'imei']) await a.fill(`#action-form input[name=${k}]`, v[k] || '');
  await a.selectOption('#action-form select[name=destination]', v.destination);
  await a.fill('#action-form textarea[name=reason]', v.reason);
}

(async () => {
  const browser = await launch();
  try {
    const { ctx, a, errors, consoleErrors } = await session(browser, 1440, 900, 'r07-003e');
    await a.addScriptTag({ content: axe.source });
    const ids = await fixture(a);
    const R = ids.r;

    /* ===== responsividade e modal ===== */
    for (const w of WIDTHS) {
      await a.setViewportSize({ width: w, height: H[w] });
      await goto(a, `#os/${R}/garantia`);
      const over = await overflow(a);
      const t = norm(await mainText(a));
      const btn = a.locator(`[data-action="modal:warrantySwap:${R}"]`);
      const box = await btn.boundingBox();
      rec(`R07E3-R-${w}`, `Garantia e ação de troca utilizáveis em ${w}px`, over === 0 && /Troca em garantia/.test(t) && box && box.height >= 40 && box.x >= 0 && box.x + box.width <= w + 1, { over, box });
      await btn.click();
      await a.waitForTimeout(160);
      const mod = await a.evaluate(() => {
        const d = document.querySelector('#modal'), c = document.querySelector('#modal-content');
        const r = d.getBoundingClientRect();
        return { open: d.open, w: r.width, h: r.height, vw: innerWidth, vh: innerHeight, sw: d.scrollWidth, cw: d.clientWidth, sh: d.scrollHeight, ch: d.clientHeight, over: document.documentElement.scrollWidth - document.documentElement.clientWidth };
      });
      rec(`R07E3-M-${w}`, `Modal de troca cabe na tela e não cria overflow em ${w}px`, mod.open && mod.w <= mod.vw + 1 && mod.h <= mod.vh + 1 && mod.over === 0 && mod.sw <= mod.cw + 1, mod);
      if (w === 320) {
        rec('R07E3-M-SCROLL', 'Conteúdo do modal de troca rola verticalmente em 320px', mod.sh > mod.ch, { sh: mod.sh, ch: mod.ch });
        await a.evaluate(() => document.querySelector('#modal').scrollTo(0, 99999));
        const atBottom = await a.evaluate(() => { const c = document.querySelector('#modal'); return c.scrollTop + c.clientHeight >= c.scrollHeight - 2; });
        rec('R07E3-M-SCROLL-2', 'Rodapé com confirmação e envio alcançável por rolagem', atBottom, String(atBottom));
      }
      await closeModal(a);
      rec(`R07E3-C-${w}`, `Modal fecha pelo botão Fechar em ${w}px`, (await a.evaluate(() => document.querySelector('#modal').open)) === false, 'fechado');
    }

    /* ===== teclado, foco e Escape ===== */
    await a.setViewportSize({ width: 390, height: 844 });
    await goto(a, `#os/${R}/garantia`);
    await a.locator(`[data-action="modal:warrantySwap:${R}"]`).click();
    await a.waitForTimeout(180);
    const initialFocus = await a.evaluate(() => ({ tag: document.activeElement.tagName, inside: document.querySelector('#modal').contains(document.activeElement) }));
    rec('R07E3-K-01', 'Foco inicial entra no diálogo de troca', initialFocus.inside, initialFocus);
    let trapped = true;
    for (let i = 0; i < 16; i++) {
      await a.keyboard.press('Tab');
      const inside = await a.evaluate(() => document.querySelector('#modal').contains(document.activeElement));
      if (!inside) trapped = false;
    }
    rec('R07E3-K-02', 'Tab mantém o foco dentro do diálogo (16 passos)', trapped, String(trapped));
    await a.evaluate(() => { const f = document.querySelector('#modal').querySelectorAll('button,input,select,textarea,summary,a[href]'); f[0].focus(); });
    await a.keyboard.press('Shift+Tab');
    const wrapped = await a.evaluate(() => document.querySelector('#modal').contains(document.activeElement));
    rec('R07E3-K-03', 'Shift+Tab no primeiro campo permanece no diálogo', wrapped, String(wrapped));
    await a.keyboard.press('Escape');
    await a.waitForTimeout(160);
    rec('R07E3-K-04', 'Escape fecha o diálogo', (await a.evaluate(() => document.querySelector('#modal').open)) === false, 'fechado');
    const focusBack = await a.evaluate(() => ({ action: document.activeElement.getAttribute && document.activeElement.getAttribute('data-action') }));
    rec('R07E3-K-05', 'Foco retorna ao acionador após fechar', focusBack.action === `modal:warrantySwap:${R}`, focusBack);

    /* ===== campos condicionais ===== */
    await goto(a, `#os/${R}/garantia`);
    await open(a, 'warrantySwap', R);
    const ext = await a.evaluate(() => { const f = document.querySelector('#action-form'); return { stockHidden: document.querySelector('#swap-stock').hidden, extHidden: document.querySelector('#swap-external').hidden, skuDisabled: f.elements.sku.disabled, costDisabled: f.elements.cost.disabled }; });
    await a.selectOption('#action-form select[name=source]', 'estoque');
    await a.waitForTimeout(160);
    const stock = await a.evaluate(() => { const f = document.querySelector('#action-form'); return { stockHidden: document.querySelector('#swap-stock').hidden, extHidden: document.querySelector('#swap-external').hidden, skuDisabled: f.elements.sku.disabled, costDisabled: f.elements.cost.disabled, skuRequired: f.elements.sku.required, options: f.elements.sku.options.length }; });
    await a.selectOption('#action-form select[name=source]', 'externa');
    await a.waitForTimeout(160);
    const back = await a.evaluate(() => { const f = document.querySelector('#action-form'); return { stockHidden: document.querySelector('#swap-stock').hidden, skuDisabled: f.elements.sku.disabled, costDisabled: f.elements.cost.disabled }; });
    rec('R07E3-COND', 'Seleção estoque/externa alterna campos condicionais e obrigatoriedade', ext.stockHidden === true && ext.extHidden === false && stock.stockHidden === false && stock.extHidden === true && stock.skuDisabled === false && stock.costDisabled === true && stock.skuRequired === true && stock.options > 1 && back.stockHidden === true && back.skuDisabled === true && back.costDisabled === false, { ext, stock, back });
    await closeModal(a);

    /* ===== axe: painel e modal ===== */
    await goto(a, `#os/${R}/garantia`);
    await scan(a, 'garantia-390', 390);
    await open(a, 'warrantySwap', R);
    await scan(a, 'modal-troca-390', 390);
    await closeModal(a);
    await a.setViewportSize({ width: 1440, height: 900 });
    await goto(a, `#os/${R}/garantia`);
    await scan(a, 'garantia-1440', 1440);
    await open(a, 'warrantySwap', R);
    await scan(a, 'modal-troca-1440', 1440);
    await closeModal(a);

    /* ===== textos extremos e limite de custo ===== */
    await a.setViewportSize({ width: 390, height: 844 });
    await goto(a, `#os/${R}/garantia`);
    await open(a, 'warrantySwap', R);
    await fillSwap(a, { brand: 'B'.repeat(100), model: 'M'.repeat(100), seal: 'S'.repeat(100), reason: 'R'.repeat(2000), cost: '9999999.99' });
    await a.waitForTimeout(160);
    const extremes = await a.evaluate(() => {
      const f = document.querySelector('#action-form');
      return { over: document.documentElement.scrollWidth - document.documentElement.clientWidth, brand: f.elements.brand.value.length, model: f.elements.model.value.length, seal: f.elements.seal.value.length, reason: f.elements.reason.value.length, costMax: f.elements.cost.getAttribute('max'), costW: f.elements.cost.getBoundingClientRect().width, panelW: document.querySelector('#modal-content').clientWidth };
    });
    rec('R07E3-X-01', 'Textos extremos e custo máximo não estouram o modal em 390', extremes.over === 0 && extremes.brand === 100 && extremes.model === 100 && extremes.seal === 100 && extremes.reason === 2000 && extremes.costMax === '9999999.99' && extremes.costW <= extremes.panelW, extremes);

    // erro visível no modal (sem gravar)
    await a.check('#action-form input[name=confirm]');
    await a.evaluate(() => { document.querySelector('#action-form input[name=brand]').value = ''; });
    await a.evaluate(() => document.querySelector('#action-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    await a.waitForTimeout(260);
    const errState = await a.evaluate(() => {
      const m = document.querySelector('#modal-error');
      return { open: document.querySelector('#modal').open, text: m && !m.hidden ? m.textContent : '', over: document.documentElement.scrollWidth - document.documentElement.clientWidth, ops: (db.orders.find(x => x.id === 18).warranty.operations || []).length };
    });
    rec('R07E3-X-02', 'Erro de campo aparece dentro do modal rolável e não grava a troca', errState.open === true && /Confira os textos obrigatórios/.test(errState.text) && errState.over === 0 && errState.ops === 0, errState);
    await closeModal(a);

    /* ===== portal da substituta em 390 ===== */
    await a.evaluate(() => {
      const now = '2026-11-26T12:00:00Z';
      const r = db.orders.find(x => x.id === 18);
      BancadaWarranty.swap(r, db.orders, db.stock, { assessment: BancadaWarranty.assessment(r).id, source: 'externa', destination: 'retida_assistencia', type: 'Placa', brand: 'Midea', model: 'Nova', seal: 'NOVA-1', serial: '', imei: '', reason: 'MOTIVO PRIVADO', cost: 4500, confirm: true }, now, 'Administrador');
      BancadaPortal.issue(db.orders.find(x => x.id === 18), 'c'.repeat(64), Date.now());
      save();
    });
    const token = 'c'.repeat(64);
    const pp = await ctx.newPage();
    const perrs = []; pp.on('pageerror', e => perrs.push(e.message));
    await pp.setViewportSize({ width: 390, height: 844 });
    await pp.goto(`${BASE}/portal.html?r07e3=${Date.now()}#${token}`, { waitUntil: 'networkidle' });
    await pp.waitForTimeout(200);
    const portalOver = await pp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const portalText = norm(await pp.locator('body').innerText());
    rec('R07E3-P-01', 'Portal em 390 mostra a substituta sem overflow nem dados privados', portalOver === 0 && /Midea/.test(portalText) && /Nova/.test(portalText) && !/NOVA-1/.test(portalText) && !/MOTIVO PRIVADO/.test(portalText) && !/45,00/.test(portalText) && perrs.length === 0, portalText.slice(0, 400));
    await pp.addScriptTag({ content: axe.source });
    const pres = await pp.evaluate(async () => await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }));
    scans.push({ label: 'portal-substituta-390', viewport: 390, violations: pres.violations.map(x => ({ id: x.id, impact: x.impact, help: x.help })) });
    rec('R07E3-P-02', 'axe sem violações no portal da substituta em 390', pres.violations.length === 0, pres.violations.map(x => x.id));
    await pp.close();

    /* ===== perfil restrito ===== */
    await role(a, 'Técnico');
    await goto(a, `#os/${R}/garantia`);
    const techText = norm(await mainText(a));
    rec('R07E3-P-03', 'Técnico não vê custo nem ação de troca', !/Custo interno/.test(techText) && !/R\$ 45,00/.test(techText) && (await actionCount(a, `modal:warrantySwap:${R}`)) === 0, techText.slice(0, 300));
    await role(a, 'Administrador');

    rec('R07E3-ERR', 'Sem erros de página ou console nas bordas', errors.length === 0 && consoleErrors.length === 0, { errors, consoleErrors });
    await ctx.close();
  } finally {
    await browser.close();
    const summary = results.reduce((s, r) => { s[r.status] = (s[r.status] || 0) + 1; return s; }, {});
    fs.writeFileSync(path.join(OUT, 'testes', 'r07-003-edge-resultados.json'), JSON.stringify({ generatedAt: new Date().toISOString(), codeSha: process.env.CODE_SHA || '', baseUrl: BASE, total: results.length, summary, scans, results }, null, 2));
    fs.writeFileSync(path.join(OUT, 'testes', 'axe-r07-003.md'), '# axe R07-003\n\n' + scans.map(s => `## ${s.label} @ ${s.viewport}\n\n${s.violations.length ? s.violations.map(v => `- **${v.id}** (${v.impact}): ${v.help}`).join('\n') : '0 violações.'}\n`).join('\n'), 'utf8');
    console.log(`TOTAL ${results.length} · PASS ${summary.PASS || 0} · FAIL ${summary.FAIL || 0} · INFO ${summary.INFO || 0}`);
  }
})().catch(e => { console.error('ERRO FATAL', e); process.exit(1); });
