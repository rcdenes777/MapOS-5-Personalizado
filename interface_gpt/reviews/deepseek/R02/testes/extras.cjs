'use strict';
/*
 * R02 — evidências complementares (fora do fluxo principal).
 * Requer playwright-core + Chromium; servidor estático em BASE_URL.
 */
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');

const CHROME = process.env.CHROME_PATH || '/home/dragonblue/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8130';
const OUT = path.resolve(__dirname, '..');
const KEY = 'mapos-bancada-prototype-v1';
const out = {};

async function fresh(browser, w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, locale: 'pt-BR' });
  const p = await ctx.newPage();
  await p.goto(BASE + '/', { waitUntil: 'networkidle' });
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: 'networkidle' });
  await p.evaluate(() => save());
  return { ctx, p };
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });

  /* 1. Proposta pendente pode ser sobrescrita sem versão/confirmação */
  {
    const { ctx, p } = await fresh(browser, 1440, 900);
    await p.evaluate(() => location.hash = '#os/23/orcamento');
    await p.waitForTimeout(250);
    out.propostaAntes = await p.evaluate(() => { const o = db.orders.find(x => x.id === 23); return { proposal: o.proposal, approval: o.approval, total: o.total }; });
    await p.click('[data-action="modal:quote:23"]');
    await p.fill('#action-form input[name=amount]', '300.00');
    await p.click('#action-form button[type=submit]');
    await p.waitForTimeout(300);
    out.propostaDepois = await p.evaluate(() => { const o = db.orders.find(x => x.id === 23); return { proposal: o.proposal, approval: o.approval, total: o.total, historico: o.history.map(h => h.text) }; });
    await ctx.close();
  }

  /* 2. Impressão: @page e largura da folha vs A4 */
  {
    const { ctx, p } = await fresh(browser, 1440, 900);
    await p.evaluate(() => location.hash = '#imprimir/20');
    await p.waitForTimeout(250);
    out.impressao = await p.evaluate(() => {
      let pageRule = null;
      for (const s of document.styleSheets) {
        try { for (const r of s.cssRules) if (r.type === CSSRule.PAGE_RULE) pageRule = r.cssText; } catch {}
      }
      const sheet = document.querySelector('.print-sheet');
      return { pageRule, larguraFolhaPx: sheet ? Math.round(sheet.getBoundingClientRect().width) : null, larguraA4ConteudoPx: Math.round(210 / 25.4 * 96), larguraCupomPx: Math.round(80 / 25.4 * 96) };
    });
    await ctx.close();
  }

  /* 3. Troca de perfil a partir de uma OS volta ao início */
  {
    const { ctx, p } = await fresh(browser, 1440, 900);
    await p.evaluate(() => location.hash = '#os/20');
    await p.waitForTimeout(250);
    const antes = await p.evaluate(() => location.hash);
    await p.selectOption('#role', 'Técnico');
    await p.waitForTimeout(300);
    out.trocaPerfil = { antes, depois: await p.evaluate(() => ({ hash: location.hash, h1: document.querySelector('#main h1').innerText })) };
    await ctx.close();
  }

  /* 4. Texto longo sem espaços: overflow em 1440, 390 e 320 */
  out.textoLongo = [];
  for (const [w, h] of [[1440, 900], [390, 844], [320, 568]]) {
    const { ctx, p } = await fresh(browser, w, h);
    await p.evaluate(k => {
      const d = JSON.parse(localStorage.getItem(k));
      d.clients[0].name = 'Cliente ' + 'X'.repeat(140);
      const o = d.orders.find(x => x.id === 20);
      o.model = 'M'.repeat(160);
      o.defect = 'D'.repeat(400);
      localStorage.setItem(k, JSON.stringify(d));
    }, KEY);
    await p.reload({ waitUntil: 'networkidle' });
    await p.evaluate(() => location.hash = '#os/20');
    await p.waitForTimeout(250);
    const detalhe = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    await p.evaluate(() => location.hash = '#ordens');
    await p.waitForTimeout(250);
    const lista = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    out.textoLongo.push({ viewport: `${w}x${h}`, overflowDetalhePx: detalhe, overflowListaPx: lista });
    await ctx.close();
  }

  fs.writeFileSync(path.join(OUT, 'testes', 'extras.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})();
