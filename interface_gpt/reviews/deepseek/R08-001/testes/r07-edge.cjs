'use strict';
/*
 * R07-001 — bordas: responsividade 320/390/768/1440, teclado/foco, axe,
 * textos extremos e portal do retorno. Navegador real.
 */
const fs = require('node:fs');
const path = require('node:path');
const axe = require('axe-core');
const {
  BASE, OUT, makeRecorder, launch, session, goto, open, closeModal, submit, role, mainText, toastText, setQuote, publish
} = require('./lib.cjs');

const { results, rec } = makeRecorder();
const scans = [];
const WIDTHS = [320, 390, 768, 1440];
const H = { 320: 568, 390: 844, 768: 1024, 1440: 900 };

async function at(a, hash, w) {
  await a.setViewportSize({ width: w, height: H[w] });
  await goto(a, hash);
}
async function overflow(a) {
  return a.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}
async function scan(a, label, viewport) {
  const res = await a.evaluate(async () => await axe.run(document, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }
  }));
  const v = res.violations.map(x => ({
    id: x.id, impact: x.impact, help: x.help,
    nodes: x.nodes.slice(0, 4).map(n => ({ target: n.target, summary: n.failureSummary }))
  }));
  scans.push({ label, viewport, violations: v });
  rec(`R07-AXE-${label}-${viewport}`, `axe sem violações: ${label} ${viewport}`, v.length === 0, JSON.stringify(v).slice(0, 900));
}
async function assess(a, id, { coverage = 'nao_coberto', solution = 'novo_orcamento', diagnosis = 'Diagnóstico fictício R07.', reason = 'Justificativa fictícia R07.' } = {}) {
  await goto(a, `#os/${id}/garantia`);
  if (!(await open(a, 'warrantyAssess', id))) throw new Error('modal de avaliação não abriu');
  await a.selectOption('#action-form select[name=coverage]', coverage);
  await a.selectOption('#action-form select[name=solution]', solution);
  await a.fill('#action-form textarea[name=diagnosis]', diagnosis);
  await a.fill('#action-form textarea[name=reason]', reason);
  await a.check('#action-form input[name=confirm]');
  return submit(a);
}
async function issueLink(a, id) {
  await goto(a, `#os/${id}/orcamento`);
  if (!(await open(a, 'issuelink', id))) return null;
  await a.check('#action-form input[name=confirm]');
  await submit(a);
  return a.evaluate(i => db.orders.find(x => x.id === i).publicLink?.token || null, id);
}

(async () => {
  const browser = await launch();
  try {
    const { ctx, a, errors, consoleErrors } = await session(browser, 1440, 900, 'r07edge');
    await a.addScriptTag({ content: axe.source });

    await assess(a, 18);
    const long = 'Falha intermitente fictícia ' + 'X'.repeat(1200);
    await goto(a, '#retorno/20');
    await a.fill('#new-form textarea[name=defect]', long);
    await a.evaluate(({ long }) => {
      const f = document.querySelector('#new-form');
      f.elements.items.value = 'Acessório ' + 'Y'.repeat(2000);
      f.elements.condition.value = 'Estado ' + 'Z'.repeat(2000);
    }, { long });
    await a.check('#new-form input[name=confirm]');
    await a.locator('#new-form button[type=submit]').click();
    await a.waitForTimeout(420);
    const idReturn = await a.evaluate(() => db.orders.at(-1).id);

    /* --- larguras nas telas do incremento --- */
    for (const [hash, label] of [
      ['#os/18/garantia', 'garantia-retorno'],
      ['#os/16', 'origem-resumo'],
      ['#os/18/orcamento', 'orcamento-retorno'],
      ['#retorno/20', 'retorno-bloqueado'],
      ['#os/' + idReturn + '/garantia', 'retorno-novo'],
      ['#os/' + idReturn + '/resumo', 'retorno-novo-resumo'],
      ['#imprimir/' + idReturn, 'impressao-retorno']
    ]) {
      for (const w of WIDTHS) {
        await at(a, hash, w);
        const over = await overflow(a);
        const h1 = await a.locator('#main h1').count();
        rec(`R07-E-${label}-${w}`, `${label} sem overflow em ${w}`, over === 0 && h1 === 1, JSON.stringify({ over, h1 }));
      }
    }

    /* --- modais em 320/390/768/1440 --- */
    for (const w of WIDTHS) {
      await at(a, '#os/18/garantia', w);
      const opened = await open(a, 'warrantyAssess', 18);
      const over = await overflow(a);
      const dialog = await a.evaluate(() => {
        const d = document.querySelector('#modal');
        const r = d.getBoundingClientRect();
        return { open: d.open, left: r.left, right: r.right, width: r.width, viewport: innerWidth };
      });
      rec(`R07-E-modal-avaliacao-${w}`, `Modal de avaliação cabe em ${w}`,
        opened && over === 0 && dialog.left >= 0 && dialog.right <= dialog.viewport + 1 && dialog.width > 0,
        JSON.stringify({ over, dialog }));
      await closeModal(a);
      const cost = await open(a, 'warrantyCost', 18);
      const overCost = await overflow(a);
      const costDialog = await a.evaluate(() => {
        const d = document.querySelector('#modal');
        const r = d.getBoundingClientRect();
        return { open: d.open, left: r.left, right: r.right, width: r.width, viewport: innerWidth };
      });
      rec(`R07-E-modal-custo-${w}`, `Modal de custo cabe em ${w}`,
        cost && overCost === 0 && costDialog.left >= 0 && costDialog.right <= costDialog.viewport + 1 && costDialog.width > 0,
        JSON.stringify({ overCost, costDialog }));
      await closeModal(a);
    }

    /* --- teclado e foco --- */
    await at(a, '#os/18/garantia', 1440);
    const opener = a.locator('[data-action="modal:warrantyAssess:18"]');
    await opener.focus();
    const opened = await open(a, 'warrantyAssess', 18);
    const initial = await a.evaluate(() => ({
      tag: document.activeElement.tagName, name: document.activeElement.getAttribute('name'),
      inDialog: document.querySelector('#modal').contains(document.activeElement),
      labelled: document.querySelector('#modal').getAttribute('aria-labelledby')
    }));
    let inside = true;
    for (let i = 0; i < 14; i++) {
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
    rec('R07-KB-01', 'Modal de avaliação prende o foco, fecha com Escape e devolve o foco',
      opened && initial.inDialog && initial.labelled === 'modal-title' && inside && !escaped.open && /modal:warrantyAssess:18/.test(String(escaped.active)),
      JSON.stringify({ initial, inside, escaped }));

    const labels = await a.evaluate(() => {
      const f = document.querySelector('#action-form');
      return [...f.querySelectorAll('input:not([type=hidden]),select,textarea')].map(el => ({
        name: el.name, labelled: !!(el.labels && el.labels.length) || !!el.getAttribute('aria-label'), required: el.required
      }));
    });
    rec('R07-KB-02', 'Todos os campos do modal têm rótulo acessível e os obrigatórios são explícitos',
      labels.length >= 5 && labels.every(x => x.labelled) && labels.filter(x => ['reason', 'confirm'].includes(x.name)).every(x => x.required),
      JSON.stringify(labels));

    /* --- textos extremos --- */
    const extreme = await a.evaluate(() => {
      const o = db.orders.find(x => x.id === 18);
      return {
        defectLen: o.defect.length,
        escaped: !document.querySelector('#main').innerHTML.includes('<script>'),
        maxlength: [...document.querySelectorAll('#action-form textarea')].map(t => t.getAttribute('maxlength'))
      };
    });
    await at(a, '#os/18/garantia', 390);
    const over390 = await overflow(a);
    rec('R07-E-EXT-01', 'Defeito de 1.200 caracteres não cria overflow em 390',
      over390 === 0, JSON.stringify({ over390 }));

    await assess(a, 18, { diagnosis: 'D'.repeat(20000), reason: 'R'.repeat(10000) });
    await at(a, '#os/18/garantia', 390);
    const overLong = await overflow(a);
    const longStored = await a.evaluate(() => {
      const e = db.orders.find(x => x.id === 18).warranty.events.at(-1);
      return { diagnosis: e.diagnosis.length, reason: e.reason.length, raw: document.querySelector('#main').innerHTML.includes('<script>') };
    });
    rec('R07-E-EXT-02', 'Diagnóstico de 20.000 e justificativa de 10.000 são aceitos, escapados e sem overflow',
      overLong === 0 && longStored.diagnosis === 20000 && longStored.reason === 10000 && longStored.raw === false,
      JSON.stringify({ overLong, longStored }));

    await a.evaluate(() => {
      const o = db.orders.find(x => x.id === 18);
      o.defect = '<script>alert(1)</script> ' + 'W'.repeat(3000);
      save(); location.hash = 'os/18';
    });
    await a.waitForTimeout(240);
    const escapedText = await a.evaluate(() => ({
      html: document.querySelector('#main').innerHTML.includes('<script>alert(1)</script>'),
      text: document.querySelector('#main').innerText.includes('<script>alert(1)</script>')
    }));
    rec('R07-E-EXT-03', 'Defeito com HTML é escapado na tela de garantia',
      escapedText.html === false && escapedText.text === true, JSON.stringify(escapedText));

    /* --- axe nas telas principais --- */
    for (const [hash, label] of [
      ['#os/18/garantia', 'garantia'],
      ['#os/16', 'origem'],
      ['#os/18/orcamento', 'orcamento'],
      ['#retorno/20', 'retorno-bloqueado']
    ]) {
      for (const w of [390, 1440]) {
        await at(a, hash, w);
        await scan(a, label, w);
      }
    }
    await at(a, '#os/18/garantia', 390);
    await open(a, 'warrantyAssess', 18);
    await scan(a, 'modal-avaliacao', 390);
    await closeModal(a);
    await open(a, 'warrantyCost', 18);
    await scan(a, 'modal-custo', 390);
    await closeModal(a);

    /* --- portal do retorno --- */
    await setQuote(a, 18, [{ type: 'Serviço', name: 'Reparo do retorno R07', quantity: 1, unit: 4500, terms: {} }], 0);
    await publish(a, 18);
    const token = await issueLink(a, 18);
    const p = await ctx.newPage();
    const perrs = []; p.on('pageerror', e => perrs.push(e.message));
    await p.setViewportSize({ width: 390, height: 844 });
    await p.goto(`${BASE}/portal.html#${token}`, { waitUntil: 'networkidle' });
    await p.addScriptTag({ content: axe.source });
    const pOver = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const pText = (await p.locator('#customer-main').innerText()).replace(/\u00a0/g, ' ');
    const pRes = await p.evaluate(async () => await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }));
    const pv = pRes.violations.map(x => ({ id: x.id, impact: x.impact, nodes: x.nodes.length }));
    rec('R07-E-PORTAL-01', 'Portal do orçamento do retorno não cria overflow em 390',
      pOver === 0 && /Seu orçamento/i.test(pText), JSON.stringify({ pOver, token: !!token, text: pText.slice(0, 160) }));
    rec('R07-E-PORTAL-02', 'Portal do retorno não exibe avaliação, custo, origem nem laudo',
      !pText.includes('Avaliação') && !pText.includes('Custo interno') && !pText.includes('Laudo') && !pText.includes('OS de origem') && !pText.includes('Prazo original'),
      pText.slice(0, 300));
    rec('R07-E-PORTAL-03', 'axe sem violações no portal do retorno em 390', pv.length === 0, JSON.stringify(pv).slice(0, 700));
    rec('R07-E-PORTAL-04', 'Portal sem exceções de página', perrs.length === 0, JSON.stringify(perrs));

    rec('R07-E-HOST-01', 'Sem erros de página ou console no host',
      errors.length === 0 && consoleErrors.length === 0, JSON.stringify({ errors, consoleErrors }));

    const summary = results.reduce((s, r) => { s[r.status] = (s[r.status] || 0) + 1; return s; }, {});
    fs.mkdirSync(path.join(OUT, 'testes'), { recursive: true });
    fs.writeFileSync(path.join(OUT, 'testes', 'r07-edge-resultados.json'), JSON.stringify({
      generatedAt: new Date().toISOString(), codeSha: process.env.CODE_SHA || '', baseUrl: BASE, total: results.length, summary, scans, results
    }, null, 2));
    console.log(`TOTAL ${results.length} · PASS ${summary.PASS || 0} · FAIL ${summary.FAIL || 0} · INFO ${summary.INFO || 0}`);
  } finally {
    await browser.close();
  }
})().catch(e => { console.error('ERRO FATAL', e); process.exit(1); });
