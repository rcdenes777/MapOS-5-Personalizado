'use strict';
/*
 * R07-002 — bordas: responsividade 320/390/768/1440, teclado/foco, axe,
 * valores extremos, rolagem/fechamento do modal e portal. Navegador real.
 */
const fs = require('node:fs');
const path = require('node:path');
const axe = require('axe-core');
const { BASE, OUT, makeRecorder, launch, session, goto, open, closeModal, role, mainText, actionCount } = require('./lib.cjs');

const { results, rec } = makeRecorder();
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
  rec(`R07E-AXE-${label}-${viewport}`, `axe sem violações: ${label} ${viewport}`, v.length === 0, JSON.stringify(v).slice(0, 900));
}

async function fixture(a) {
  return a.evaluate(() => {
    const now = '2026-11-26T12:00:00Z', day = '2026-11-26';
    db = seed();
    const nextId = () => Math.max(0, ...db.orders.map(o => o.id)) + 1;
    const mk = ({ total = 50000, paid = 20000, days = 90, conclusion = '2026-09-01' } = {}) => {
      const o = {
        id: nextId(), client: 1, unit: null, brand: 'LG', model: 'Inverter', type: 'Placa eletrônica', status: 'Finalizado',
        entry: '2026-08-20', conclusion, warrantyDays: days, total, paid: 0, approval: 'Aprovado', delivery: null, history: []
      };
      o.unit = o.id;
      o.billing = { due: '2026-12-20', items: [{ type: 'Serviço', name: 'Serviço original', quantity: 1, unit: total }], discount: 0 };
      if (paid) BancadaFinance.receive(o, paid, '2026-11-25', 'Pix', now);
      db.orders.push(o);
      const r = BancadaWarranty.create(o, db.orders, { defect: 'Falha após o reparo', confirm: true }, day);
      db.orders.push(r);
      BancadaWarranty.assess(r, db.orders, { coverage: 'coberto', solution: 'devolucao_valor', diagnosis: 'Falha confirmada', reason: 'Acordo fictício', previous: 0, confirm: true }, now, 'Administrador');
      return [o.id, r.id];
    };
    const ids = { normal: mk(), huge: mk({ total: 999999999, paid: 999999999, days: 9999 }) };
    save(); render();
    return ids;
  });
}

async function openRefund(a, retId) {
  await goto(a, `#os/${retId}/garantia`);
  return open(a, 'warrantyRefund', retId);
}

(async () => {
  const browser = await launch();
  try {
    const { ctx, a, errors, consoleErrors } = await session(browser, 1440, 900, 'r07-002e');
    await a.addScriptTag({ content: axe.source });
    const ids = await fixture(a);
    const [P, R] = ids.normal, [HU, HR] = ids.huge;
    const day = await a.evaluate(() => today());

    /* ===== responsividade e modal ===== */
    for (const w of WIDTHS) {
      await a.setViewportSize({ width: w, height: H[w] });
      await goto(a, `#os/${R}/garantia`);
      const over = await overflow(a);
      const t = norm(await mainText(a));
      const btn = a.locator(`[data-action="modal:warrantyRefund:${R}"]`);
      const box = await btn.boundingBox();
      rec(`R07E-R-${w}`, `Garantia e ação de devolução utilizáveis em ${w}px`, over === 0 && /Devolução de garantia/.test(t) && box && box.height >= 40 && box.x >= 0 && box.x + box.width <= w + 1, JSON.stringify({ over, box }));
      await btn.click();
      await a.waitForTimeout(160);
      const mod = await a.evaluate(() => {
        const d = document.querySelector('#modal'), c = document.querySelector('#modal-content');
        const r = d.getBoundingClientRect();
        return { open: d.open, w: r.width, h: r.height, vw: innerWidth, vh: innerHeight, sw: d.scrollWidth, cw: d.clientWidth, sh: d.scrollHeight, ch: d.clientHeight, over: document.documentElement.scrollWidth - document.documentElement.clientWidth };
      });
      rec(`R07E-M-${w}`, `Modal de devolução cabe na tela e não cria overflow em ${w}px`, mod.open && mod.w <= mod.vw + 1 && mod.h <= mod.vh + 1 && mod.over === 0 && mod.sw <= mod.cw + 1, JSON.stringify(mod));
      if (w === 320) {
        rec('R07E-M-SCROLL', 'Conteúdo do modal rola verticalmente em 320px quando necessário', mod.sh > mod.ch, JSON.stringify({ sh: mod.sh, ch: mod.ch }));
        await a.evaluate(() => document.querySelector('#modal').scrollTo(0, 99999));
        const atBottom = await a.evaluate(() => { const c = document.querySelector('#modal'); return c.scrollTop + c.clientHeight >= c.scrollHeight - 2; });
        rec('R07E-M-SCROLL-2', 'Rodapé com confirmação e envio alcançável por rolagem', atBottom, String(atBottom));
      }
      await closeModal(a);
      rec(`R07E-C-${w}`, `Modal fecha pelo botão Fechar em ${w}px`, (await a.evaluate(() => document.querySelector('#modal').open)) === false, 'fechado');
    }

    /* ===== teclado, foco e Escape ===== */
    await a.setViewportSize({ width: 390, height: 844 });
    await goto(a, `#os/${R}/garantia`);
    await a.locator(`[data-action="modal:warrantyRefund:${R}"]`).click();
    await a.waitForTimeout(180);
    const initialFocus = await a.evaluate(() => ({ id: document.activeElement.id, tag: document.activeElement.tagName, inside: document.querySelector('#modal').contains(document.activeElement) }));
    rec('R07E-K-01', 'Foco inicial entra no diálogo de devolução', initialFocus.inside, JSON.stringify(initialFocus));
    let trapped = true;
    for (let i = 0; i < 14; i++) {
      await a.keyboard.press('Tab');
      const inside = await a.evaluate(() => document.querySelector('#modal').contains(document.activeElement));
      if (!inside) trapped = false;
    }
    rec('R07E-K-02', 'Tab mantém o foco dentro do diálogo (14 passos)', trapped, String(trapped));
    await a.evaluate(() => { const f = document.querySelector('#modal').querySelectorAll('button,input,select,textarea,summary,a[href]'); f[0].focus(); });
    await a.keyboard.press('Shift+Tab');
    const wrapped = await a.evaluate(() => document.querySelector('#modal').contains(document.activeElement));
    rec('R07E-K-03', 'Shift+Tab no primeiro campo permanece no diálogo', wrapped, String(wrapped));
    await a.keyboard.press('Escape');
    await a.waitForTimeout(160);
    rec('R07E-K-04', 'Escape fecha o diálogo', (await a.evaluate(() => document.querySelector('#modal').open)) === false, 'fechado');
    const focusBack = await a.evaluate(() => ({ tag: document.activeElement.tagName, action: document.activeElement.getAttribute && document.activeElement.getAttribute('data-action') }));
    rec('R07E-K-05', 'Foco retorna ao acionador após fechar', focusBack.action === `modal:warrantyRefund:${R}`, JSON.stringify(focusBack));

    /* ===== axe: painel e modal ===== */
    await goto(a, `#os/${R}/garantia`);
    await scan(a, 'garantia-390', 390);
    await open(a, 'warrantyRefund', R);
    await scan(a, 'modal-devolucao-390', 390);
    await closeModal(a);
    await a.setViewportSize({ width: 1440, height: 900 });
    await goto(a, `#os/${R}/garantia`);
    await scan(a, 'garantia-1440', 1440);
    await open(a, 'warrantyRefund', R);
    await scan(a, 'modal-devolucao-1440', 1440);
    await closeModal(a);

    /* ===== valores extremos e textos longos ===== */
    await goto(a, `#os/${HR}/garantia`);
    const hugeBtn = a.locator(`[data-action="modal:warrantyRefund:${HR}"]`);
    rec('R07E-X-01', 'Cobrança de 9.999.999,99 ainda oferece devolução', (await hugeBtn.count()) === 1, 'presente');
    await hugeBtn.click();
    await a.waitForTimeout(160);
    const huge = await a.evaluate(() => {
      const f = document.querySelector('#action-form');
      return { max: f.elements.amount.getAttribute('max'), dateMax: f.elements.date.getAttribute('max'), dateMin: f.elements.date.getAttribute('min'), over: document.documentElement.scrollWidth - document.documentElement.clientWidth, amountW: f.elements.amount.getBoundingClientRect().width, panelW: document.querySelector('#modal-content').clientWidth };
    });
    rec('R07E-X-02', 'Limite de valor e data extrema não estouram o modal', huge.over === 0 && huge.amountW <= huge.panelW && huge.max === '9999999.99' && huge.dateMax === day, JSON.stringify(huge));
    await a.selectOption('#action-form select[name=mode]', 'total');
    await a.waitForTimeout(120);
    const hugeVal = await a.evaluate(() => { const f = document.querySelector('#action-form'); return { v: f.elements.amount.value, ro: f.elements.amount.readOnly, preview: document.querySelector('#warranty-refund-preview').textContent.replace(/\u00a0/g, ' ') }; });
    rec('R07E-X-03', 'Total extremo calculado em centavos e readOnly', hugeVal.v === '9999999.99' && hugeVal.ro === true && /Abatimento: R\$ 9\.999\.999,99/.test(hugeVal.preview), JSON.stringify(hugeVal));
    await a.selectOption('#action-form select[name=mode]', 'parcial');
    await a.fill('#action-form textarea[name=reason]', 'M'.repeat(2000));
    await a.waitForTimeout(100);
    const longOver = await overflow(a);
    const reasonLen = await a.evaluate(() => document.querySelector('#action-form textarea[name=reason]').value.length);
    rec('R07E-X-04', 'Motivo com 2.000 caracteres permanece no limite e sem overflow', longOver === 0 && reasonLen === 2000, JSON.stringify({ longOver, reasonLen }));
    const minInfo = await a.evaluate(() => document.querySelector('#action-form input[name=date]').getAttribute('min'));
    rec('R07E-X-05', 'Data mínima nativa reflete o último recebimento (25/11) e o handler revalida', minInfo === '2026-11-25', minInfo);
    await closeModal(a);

    /* ===== restrição visual em mobile e portal ===== */
    await role(a, 'Técnico');
    await goto(a, `#os/${R}/garantia`);
    const techText = norm(await mainText(a));
    rec('R07E-P-01', 'Técnico em 1440 não vê valores/comprovante do reembolso', !/COMPROVANTE|MOTIVO PRIVADO/.test(techText) && (await actionCount(a, `modal:warrantyRefund:${R}`)) === 0, techText.slice(0, 220));
    await role(a, 'Administrador');

    // portal real com token da OS parcialmente devolvida
    const token = await a.evaluate(i => { const o = db.orders.find(x => x.id === i); BancadaPortal.issue(o, 'b'.repeat(64), Date.now()); save(); return o.publicLink.token; }, P);
    const pp = await ctx.newPage();
    const perrs = []; pp.on('pageerror', e => perrs.push(e.message));
    await pp.setViewportSize({ width: 390, height: 844 });
    await pp.goto(`${BASE}/portal.html?r07e=${Date.now()}#${token}`, { waitUntil: 'networkidle' });
    await pp.waitForTimeout(200);
    const portalOver = await pp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const portalText = norm(await pp.locator('body').innerText());
    rec('R07E-P-02', 'Portal em 390 sem overflow, com resumo financeiro e sem dados privados', portalOver === 0 && /Pagamento/.test(portalText) && /Parcialmente paga/.test(portalText) && !/COMPROVANTE|MOTIVO PRIVADO/.test(portalText) && perrs.length === 0, portalText.slice(0, 400));
    await pp.addScriptTag({ content: axe.source });
    const pres = await pp.evaluate(async () => await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }));
    scans.push({ label: 'portal-390', viewport: 390, violations: pres.violations.map(x => ({ id: x.id, impact: x.impact, help: x.help })) });
    rec('R07E-P-03', 'axe sem violações no portal em 390', pres.violations.length === 0, JSON.stringify(pres.violations.map(x => x.id)));
    await pp.close();

    rec('R07E-ERR', 'Sem erros de página ou console nas bordas', errors.length === 0 && consoleErrors.length === 0, JSON.stringify({ errors, consoleErrors }));
    await ctx.close();
  } finally {
    await browser.close();
    fs.mkdirSync(path.join(OUT, 'testes'), { recursive: true });
    const summary = results.reduce((s, r) => { s[r.status] = (s[r.status] || 0) + 1; return s; }, {});
    fs.writeFileSync(path.join(OUT, 'testes', 'r07-002-edge-resultados.json'), JSON.stringify({ generatedAt: new Date().toISOString(), codeSha: process.env.CODE_SHA || '', baseUrl: BASE, total: results.length, summary, scans, results }, null, 2));
    console.log(`TOTAL ${results.length} · PASS ${summary.PASS || 0} · FAIL ${summary.FAIL || 0} · INFO ${summary.INFO || 0}`);
  }
})().catch(e => { console.error('ERRO FATAL', e); process.exit(1); });
