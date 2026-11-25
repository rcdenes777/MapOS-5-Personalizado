'use strict';
/* R04 — axe-core e teclado nas telas do portal e no orçamento administrativo. */
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const axe = require('axe-core');
const CHROME = process.env.CHROME_PATH || '/home/dragonblue/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8130';
const OUT = path.resolve(__dirname, '..');
const results = [];
const rec = (id, desc, ok, detail = '') => { const s = ok === 'INFO' ? 'INFO' : ok ? 'PASS' : 'FAIL'; results.push({ id, desc, status: s, detail }); console.log(`${s} ${id} — ${desc} :: ${detail}`); };
async function scan(p, label, vp) {
  const violations = await p.evaluate(async () => {
    const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'] });
    return r.violations.map(v => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.map(n => ({ target: n.target, html: n.html.slice(0, 180), summary: n.failureSummary })) }));
  });
  return { label, viewport: vp, violations };
}
async function session(browser, w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: 'pt-BR' });
  const a = await ctx.newPage();
  await a.goto(BASE + '/?axe-r04=' + Date.now(), { waitUntil: 'networkidle' });
  await a.evaluate(() => localStorage.clear()); await a.reload({ waitUntil: 'networkidle' });
  await a.evaluate(() => location.hash = '#os/23/orcamento'); await a.waitForTimeout(220);
  await a.addScriptTag({ content: axe.source });
  return { ctx, a };
}
async function open(a, kind, id = 23) { const s = `[data-action="modal:${kind}:${id}"]`; if (!(await a.locator(s).count())) return false; await a.locator(s).first().click(); await a.waitForTimeout(120); return a.evaluate(() => document.querySelector('#modal').open); }
async function submit(a) { await a.locator('#action-form button[type=submit]').click(); await a.waitForTimeout(280); }
async function issue(a) { if (!(await open(a, 'issuelink'))) return; await a.check('#action-form input[name=confirm]'); await submit(a); }
async function linkDetails(a) { const d = a.locator('.portal-controls details'); if (await d.count()) { if (!(await d.first().evaluate(e => e.open))) await d.first().locator('summary').click(); await a.waitForTimeout(80); } }
async function setDraft(a) {
  if (!(await open(a, 'quote'))) return;
  while (await a.locator('.quote-edit-row').count()) await a.locator('.quote-edit-row [data-quote-remove]').first().click();
  await a.locator('[data-quote-add]').click();
  const r = a.locator('.quote-edit-row').first();
  await r.locator('input[name=itemName]').fill('Peça revisada'); await r.locator('input[name=itemUnit]').fill('300.00');
  await submit(a);
}
async function portal(ctx, token) { const p = await ctx.newPage(); await p.goto(BASE + '/portal.html#' + token, { waitUntil: 'networkidle' }); await p.waitForTimeout(180); await p.addScriptTag({ content: axe.source }); return p; }
async function approve(p) { await p.check('input[name=answer][value="Aprovado"]'); await p.fill('input[name=name]', 'Marina Alves'); await p.check('input[name=confirm]'); await p.locator('#customer-response button[type=submit]').click(); await p.waitForTimeout(400); }

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const out = { generatedAt: new Date().toISOString(), engine: 'axe-core ' + require('axe-core/package.json').version, codeSha: process.env.CODE_SHA || '', incrementSha: process.env.INCREMENT_SHA || '', scans: [] };
  for (const [w, h] of [[1440, 900], [390, 844], [320, 568]]) {
    const vp = `${w}x${h}`;
    const { ctx, a } = await session(browser, w, h);
    await scan(a, 'admin-orcamento-inicial', vp).then(s => out.scans.push(s));
    await issue(a); await a.waitForTimeout(200);
    await linkDetails(a);
    out.scans.push(await scan(a, 'admin-link-gerenciar', vp));
    await a.keyboard.press('Escape').catch(() => {});

    const token = await a.evaluate(() => db.orders.find(o => o.id === 23).publicLink.token);
    const p = await portal(ctx, token);
    await p.evaluate(() => { const h = [...document.querySelectorAll('h2')].find(x => x.textContent.includes('Sua decisão')); if (h) { h.scrollIntoView({ block: 'start' }); window.scrollBy(0, -20); } });
    await p.waitForTimeout(120);
    out.scans.push(await scan(p, 'portal-decisao-pendente', vp));
    // Foco do formulário: alcança os dois radios, nome, confirmação e submit.
    const formFocus = await p.evaluate(() => {
      const f = document.querySelector('#customer-response');
      const names = [...f.querySelectorAll('input,button')].map(e => e.name || e.type);
      return { controls: names, checked: [...f.querySelectorAll('input[name=answer]')].filter(x => x.checked).length };
    });
    rec('R04-A11Y-PORTAL-' + vp, 'Formulário do portal tem controles e nenhuma escolha inicial', formFocus.controls.length >= 5 && formFocus.checked === 0, JSON.stringify(formFocus));
    await p.focus('input[name=answer][value="Aprovado"]');
    let submitReached = false;
    const tabSequence = [];
    for (let i = 0; i < 8; i++) {
      await p.keyboard.press('Tab');
      const active = await p.evaluate(() => {
        const el = document.activeElement;
        return { name: el?.name || '', type: el?.type || '', text: el?.textContent?.trim() || '', submit: el?.closest('#customer-response')?.querySelector('button[type=submit]') === el };
      });
      if (!tabSequence.includes(active.name || active.type)) tabSequence.push(active.name || active.type);
      if (active.submit) { submitReached = true; break; }
    }
    rec('R04-A11Y-SUBMIT-' + vp, 'Tab alcança o botão de resposta do portal', submitReached, String(submitReached));
    rec('R04-A11Y-TAB-' + vp, 'Ordem de Tab passa por nome, confirmação e submit', ['name', 'confirm', 'submit'].every(x => tabSequence.includes(x)), JSON.stringify(tabSequence));

    await approve(p);
    await p.evaluate(() => { const h = [...document.querySelectorAll('h2')].find(x => x.textContent.includes('Resposta registrada')); if (h) { h.scrollIntoView({ block: 'start' }); window.scrollBy(0, -20); } });
    out.scans.push(await scan(p, 'portal-aprovado', vp));

    const due = await a.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 5); return d.toISOString().slice(0, 10); });
    await open(a, 'billing'); await a.fill('#action-form input[name=due]', due); await a.check('#action-form input[name=confirm]'); await submit(a);
    await p.waitForTimeout(250); await p.evaluate(() => { const h = [...document.querySelectorAll('h2')].find(x => x.textContent.includes('Pagamento')); if (h) h.scrollIntoView({ block: 'start' }); });
    out.scans.push(await scan(p, 'portal-pagamento', vp));
    await open(a, 'delivery'); await a.check('#action-form input[name=confirm]'); await submit(a); await p.waitForTimeout(300);
    await p.evaluate(() => { const h = [...document.querySelectorAll('h2')].find(x => x.textContent.includes('Seu orçamento')); if (h) h.scrollIntoView({ block: 'start' }); });
    out.scans.push(await scan(p, 'portal-apos-entrega', vp));
    await linkDetails(a); await open(a, 'revokelink'); await a.check('#action-form input[name=confirm]'); await submit(a); await p.waitForTimeout(300);
    out.scans.push(await scan(p, 'portal-link-indisponivel', vp));
    await ctx.close();
  }
  // Aviso de divergência em modal de cobrança, em contexto isolado (sem entrega/cobrança).
  {
    const { ctx, a } = await session(browser, 1440, 900);
    await issue(a); await setDraft(a); await a.waitForTimeout(200); await open(a, 'billing');
    out.scans.push(await scan(a, 'admin-cobranca-com-aviso', '1440x900'));
    await ctx.close();
  }
  fs.writeFileSync(path.join(OUT, 'testes', 'axe.json'), JSON.stringify(out, null, 2));
  const all = out.scans.flatMap(s => s.violations.map(v => ({ ...v, label: s.label, viewport: s.viewport })));
  const byId = {}; for (const v of all) byId[v.id] = (byId[v.id] || 0) + 1;
  const md = ['# axe-core — R04', '', `Engine: ${out.engine}`, `Varreduras: ${out.scans.length}`, '', '| Regra | Impacto | Ocorrências | Ajuda |', '| --- | --- | --- | --- |'];
  for (const id of Object.keys(byId).sort()) { const v = all.find(x => x.id === id); md.push(`| ${id} | ${v.impact} | ${byId[id]} | ${v.help} |`); }
  md.push('', '## Detalhe', '');
  for (const s of out.scans) { md.push(`### ${s.viewport} — ${s.label}`, ''); if (!s.violations.length) md.push('Sem violações WCAG A/AA.'); for (const v of s.violations) { md.push(`- **${v.id}** (${v.impact}): ${v.help}`); for (const n of v.nodes.slice(0, 4)) md.push(`  - \`${n.target.join(' ')}\` — ${n.summary.split('\n')[0]}`); } md.push(''); }
  fs.writeFileSync(path.join(OUT, 'testes', 'axe.md'), md.join('\n'));
  fs.writeFileSync(path.join(OUT, 'testes', 'a11y-resultados.json'), JSON.stringify({ generatedAt: new Date().toISOString(), codeSha: out.codeSha, incrementSha: out.incrementSha, results, scans: out.scans.length, violations: all.length }, null, 2));
  console.log('scans', out.scans.length, 'violations', all.length, 'rules', Object.keys(byId));
  console.log(JSON.stringify(byId, null, 2));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
