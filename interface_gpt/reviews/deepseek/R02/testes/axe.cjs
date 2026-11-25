'use strict';
/*
 * R02 — varredura axe-core (WCAG 2.2 A/AA) nas telas principais.
 * Requer playwright-core + axe-core; servidor em BASE_URL.
 */
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const axe = require('axe-core');

const CHROME = process.env.CHROME_PATH || '/home/dragonblue/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8130';
const OUT = path.resolve(__dirname, '..');

const pages = [
  ['#inicio', 'painel'], ['#ordens', 'ordens'], ['#nova', 'nova-os'], ['#os/20', 'os-detalhe'],
  ['#os/20/orcamento', 'os-orcamento'], ['#clientes', 'clientes'], ['#estoque', 'estoque'],
  ['#financeiro', 'financeiro'], ['#relatorios', 'relatorios'], ['#configuracoes', 'configuracoes'],
  ['#imprimir/20', 'impressao-a4'], ['#mais', 'mais'],
];

async function scan(page, label, viewport) {
  const result = await page.evaluate(async () => {
    const r = await axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      resultTypes: ['violations'],
    });
    return r.violations.map(v => ({
      id: v.id, impact: v.impact, help: v.help, description: v.description,
      nodes: v.nodes.map(n => ({ target: n.target, html: n.html.slice(0, 160), summary: n.failureSummary })),
    }));
  });
  return { label, viewport, violations: result };
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const out = { generatedAt: new Date().toISOString(), engine: 'axe-core ' + require('axe-core/package.json').version, scans: [] };
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, locale: 'pt-BR' });
    const page = await ctx.newPage();
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });
    await page.addScriptTag({ content: axe.source });
    for (const [hash, label] of pages) {
      await page.evaluate(x => { const d = document.querySelector('#modal'); if (d && d.open) d.close(); if (location.hash === x) render(); else location.hash = x; }, hash);
      await page.waitForTimeout(180);
      out.scans.push(await scan(page, label, `${w}x${h}`));
    }
    // Modal aberto
    await page.evaluate(() => location.hash = '#os/20');
    await page.waitForTimeout(180);
    await page.click('[data-action="modal:tech:20"]');
    await page.waitForTimeout(150);
    out.scans.push(await scan(page, 'modal-andamento', `${w}x${h}`));
    await ctx.close();
  }
  fs.writeFileSync(path.join(OUT, 'testes', 'axe.json'), JSON.stringify(out, null, 2));

  const all = out.scans.flatMap(s => s.violations.map(v => ({ ...v, label: s.label, viewport: s.viewport })));
  const byId = {};
  for (const v of all) byId[v.id] = (byId[v.id] || 0) + 1;
  const md = ['# axe-core — R02', '', `Engine: ${out.engine}`, `Telas: ${pages.length} × 2 resoluções + modal = ${out.scans.length} varreduras`, '', '## Ocorrências por regra', '', '| Regra | Impacto | Ocorrências | Ajuda |', '| --- | --- | --- | --- |'];
  for (const id of Object.keys(byId).sort()) {
    const v = all.find(x => x.id === id);
    md.push(`| ${id} | ${v.impact} | ${byId[id]} | ${v.help} |`);
  }
  md.push('', '## Detalhe', '');
  for (const s of out.scans) {
    md.push(`### ${s.viewport} — ${s.label}`, '');
    if (!s.violations.length) md.push('Sem violações WCAG A/AA.');
    for (const v of s.violations) {
      md.push(`- **${v.id}** (${v.impact}): ${v.help}`);
      for (const n of v.nodes.slice(0, 5)) md.push(`  - \`${n.target.join(' ')}\` — ${n.summary.split('\n')[0]}`);
    }
    md.push('');
  }
  fs.writeFileSync(path.join(OUT, 'testes', 'axe.md'), md.join('\n'));
  console.log('scans', out.scans.length, 'violations', all.length, 'rules', Object.keys(byId));
  console.log(JSON.stringify(byId, null, 2));
  await browser.close();
})();
