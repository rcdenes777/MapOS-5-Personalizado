'use strict';
/*
 * R03 — axe-core (WCAG 2.2 A/AA) nas telas novas de orçamento.
 * Requer playwright-core + axe-core; servidor em BASE_URL.
 */
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const axe = require('axe-core');

const CHROME = process.env.CHROME_PATH || '/home/dragonblue/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8130';
const OUT = path.resolve(__dirname, '..');
const results = [];
const rec = (id, desc, ok, detail = '') => { const s = ok === 'INFO' ? 'INFO' : ok ? 'PASS' : 'FAIL'; results.push({ id, desc, status: s, detail }); console.log(`${s} ${id} — ${desc} :: ${detail}`); };

async function scan(page, label, viewport) {
  const violations = await page.evaluate(async () => {
    const r = await axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      resultTypes: ['violations'],
    });
    return r.violations.map(v => ({ id: v.id, impact: v.impact, help: v.help, description: v.description, nodes: v.nodes.map(n => ({ target: n.target, html: n.html.slice(0, 180), summary: n.failureSummary })) }));
  });
  return { label, viewport, violations };
}

async function open(page, kind) {
  const sel = `[data-action="modal:${kind}:23"]`;
  if (!(await page.locator(sel).count())) return false;
  await page.locator(sel).first().click();
  await page.waitForTimeout(180);
  return page.evaluate(() => document.querySelector('#modal').open);
}
async function submit(page) { await page.locator('#action-form button[type=submit]').click(); await page.waitForTimeout(240); }
async function setupState(page) {
  await open(page, 'quote');
  while (await page.locator('.quote-edit-row').count()) await page.locator('.quote-edit-row [data-quote-remove]').first().click();
  await page.locator('[data-quote-add]').click();
  await page.locator('[data-quote-add]').click();
  let rows = page.locator('.quote-edit-row');
  await rows.nth(0).locator('input[name=itemName]').fill('IGBT 650 V');
  await rows.nth(0).locator('input[name=itemUnit]').fill('50.00');
  await rows.nth(1).locator('input[name=itemName]').fill('Reparo em bancada');
  await rows.nth(1).locator('select[name=itemType]').selectOption('Serviço');
  await rows.nth(1).locator('input[name=itemUnit]').fill('220.00');
  await page.fill('input[name=discount]', '20.00');
  await submit(page);
  await open(page, 'publish');
  await page.check('#action-form input[name=confirm]');
  await submit(page);
  await open(page, 'publicresponse');
  await page.selectOption('#action-form select[name=answer]', 'Aprovado');
  await page.fill('#action-form input[name=name]', 'Marina Alves (fictícia)');
  await page.check('#action-form input[name=confirm]');
  await submit(page);
  await page.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 5); return d.toISOString().slice(0, 10); }).then(async due => {
    await open(page, 'billing');
    await page.fill('#action-form input[name=due]', due);
    await page.check('#action-form input[name=confirm]');
    await submit(page);
  });
  await page.evaluate(() => { document.querySelectorAll('details.quote-version').forEach(d => d.open = true); });
  await page.waitForTimeout(120);
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const out = { generatedAt: new Date().toISOString(), engine: 'axe-core ' + require('axe-core/package.json').version, codeSha: process.env.CODE_SHA || '', incrementSha: process.env.INCREMENT_SHA || '', scans: [] };
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, locale: 'pt-BR' });
    const page = await ctx.newPage();
    await page.goto(BASE + '/?axe-r03=' + Date.now(), { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });
    await page.addScriptTag({ content: axe.source });
    const vp = `${w}x${h}`;
    await page.evaluate(() => location.hash = '#os/23/orcamento');
    await page.waitForTimeout(180);
    out.scans.push(await scan(page, 'orcamento-inicial', vp));

    if (await open(page, 'quote')) { out.scans.push(await scan(page, 'modal-editor', vp)); await page.keyboard.press('Escape'); }
    if (await open(page, 'publish')) { out.scans.push(await scan(page, 'modal-publicar', vp)); await page.keyboard.press('Escape'); }
    if (await open(page, 'approval')) { out.scans.push(await scan(page, 'modal-resposta-interna', vp)); await page.keyboard.press('Escape'); }
    if (await open(page, 'billing')) { out.scans.push(await scan(page, 'modal-cobranca', vp)); await page.keyboard.press('Escape'); }
    if (await open(page, 'publicresponse')) {
      out.scans.push(await scan(page, 'modal-resposta-link', vp));
      // Teclado: percorre o modal do link até o submit e confirma o retorno do foco.
      let foundSubmit = false;
      for (let i = 0; i < 24; i++) {
        await page.keyboard.press('Tab');
        const a = await page.evaluate(() => {
          const m = document.querySelector('#modal'), el = document.activeElement;
          return { inside: m.contains(el), text: el.textContent?.trim() || '', tag: el.tagName };
        });
        if (a.inside && a.tag === 'BUTTON' && /Registrar resposta/.test(a.text)) foundSubmit = true;
      }
      rec('A11Y-LINK-FOCO-' + vp, 'Botão de ação do modal do link é alcançável por Tab', foundSubmit, JSON.stringify({ foundSubmit }));
      await page.keyboard.press('Escape');
      const linkRestored = await page.evaluate(() => ({ open: document.querySelector('#modal').open, active: document.activeElement?.getAttribute('data-action') || document.activeElement?.tagName }));
      rec('A11Y-LINK-RETORNO-' + vp, 'Escape no modal do link devolve foco ao gatilho', !linkRestored.open && /modal:publicresponse:23/.test(linkRestored.active || ''), JSON.stringify(linkRestored));
    }

    // Foco: Tab real não deve escapar do dialog do editor.
    await open(page, 'quote');
    const escaped = [];
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');
      const a = await page.evaluate(() => {
        const m = document.querySelector('#modal'), el = document.activeElement;
        return { inside: m.contains(el), tag: el.tagName, name: el.name || el.id || el.className || '' };
      });
      if (!a.inside) escaped.push(a.tag + '#' + a.name);
    }
    rec('A11Y-FOCO-' + vp, 'Foco permanece no modal do editor', (await page.evaluate(() => document.querySelector('#modal').open)) && escaped.length === 0, JSON.stringify({ escaped: escaped.slice(0, 5) }));
    await page.keyboard.press('Escape');
    const restored = await page.evaluate(() => ({ open: document.querySelector('#modal').open, active: document.activeElement?.getAttribute('data-action') || document.activeElement?.tagName }));
    rec('A11Y-RETORNO-' + vp, 'Escape fecha e devolve foco ao gatilho', !restored.open && /modal:quote:23/.test(restored.active || ''), JSON.stringify(restored));

    await setupState(page);
    out.scans.push(await scan(page, 'orcamento-decidido-historico', vp));

    await ctx.close();
  }
  fs.writeFileSync(path.join(OUT, 'testes', 'axe.json'), JSON.stringify(out, null, 2));
  const all = out.scans.flatMap(s => s.violations.map(v => ({ ...v, label: s.label, viewport: s.viewport })));
  const byId = {};
  for (const v of all) byId[v.id] = (byId[v.id] || 0) + 1;
  const md = ['# axe-core — R03', '', `Engine: ${out.engine}`, `Varreduras: ${out.scans.length}`, '', '## Ocorrências por regra', '', '| Regra | Impacto | Ocorrências | Ajuda |', '| --- | --- | --- | --- |'];
  for (const id of Object.keys(byId).sort()) { const v = all.find(x => x.id === id); md.push(`| ${id} | ${v.impact} | ${byId[id]} | ${v.help} |`); }
  md.push('', '## Detalhe', '');
  for (const s of out.scans) {
    md.push(`### ${s.viewport} — ${s.label}`, '');
    if (!s.violations.length) md.push('Sem violações WCAG A/AA.');
    for (const v of s.violations) { md.push(`- **${v.id}** (${v.impact}): ${v.help}`); for (const n of v.nodes.slice(0, 5)) md.push(`  - \`${n.target.join(' ')}\` — ${n.summary.split('\n')[0]}`); }
    md.push('');
  }
  fs.writeFileSync(path.join(OUT, 'testes', 'axe.md'), md.join('\n'));
  console.log('scans', out.scans.length, 'violations', all.length, 'rules', Object.keys(byId));
  console.log(JSON.stringify(byId, null, 2));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
