'use strict';
/*
 * R02 — medições "antes" (protótipo R01) para comparação.
 * Somente leitura; grava baseline-r01.json em R02/testes.
 */
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');

const CHROME = process.env.CHROME_PATH || '/home/dragonblue/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8130';
const OUT = path.resolve(__dirname, '..');

async function session(browser, w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, locale: 'pt-BR' });
  const p = await ctx.newPage();
  await p.goto(BASE + '/', { waitUntil: 'networkidle' });
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: 'networkidle' });
  const go = async hash => {
    await p.evaluate(x => { const d = document.querySelector('#modal'); if (d && d.open) d.close(); if (location.hash === x) render(); else location.hash = x; }, hash);
    await p.waitForTimeout(180);
  };
  return { ctx, p, go };
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const out = { capturedAt: new Date().toISOString(), sha: process.env.SHA_TESTED || '', viewports: {} };

  for (const [w, h] of [[1920, 1080], [1440, 900], [1366, 768], [768, 1024], [412, 915], [390, 844], [360, 800], [320, 568]]) {
    const { ctx, p, go } = await session(browser, w, h);
    const data = {};
    await go('#inicio');
    data.dashboard = await p.evaluate(() => {
      const hero = document.querySelector('.hero');
      const metrics = document.querySelector('.metrics');
      const firstOrder = document.querySelector('#main .order');
      return {
        heroHeight: hero ? Math.round(hero.getBoundingClientRect().height) : null,
        metricsHeight: metrics ? Math.round(metrics.getBoundingClientRect().height) : null,
        firstOrderTop: firstOrder ? Math.round(firstOrder.getBoundingClientRect().top + scrollY) : null,
        firstOrderHeight: firstOrder ? Math.round(firstOrder.getBoundingClientRect().height) : null,
        ordersInFirstViewport: [...document.querySelectorAll('#main .order')].filter(o => o.getBoundingClientRect().top < innerHeight).length,
      };
    });
    await go('#ordens');
    data.orders = await p.evaluate(() => {
      const first = document.querySelector('#main .order');
      const filters = document.querySelector('.filters');
      return {
        firstOrderTop: first ? Math.round(first.getBoundingClientRect().top + scrollY) : null,
        filtersHeight: filters ? Math.round(filters.getBoundingClientRect().height) : null,
        chips: document.querySelectorAll('.filters .chip').length,
        queueSelect: !!document.querySelector('#queue-filter'),
        placeholder: document.querySelector('#search')?.getAttribute('placeholder') || '',
      };
    });
    await go('#os/20');
    data.osDetail = await p.evaluate(() => {
      const stats = document.querySelector('.stats');
      const tabs = document.querySelector('.tabs');
      return {
        statsHeight: stats ? Math.round(stats.getBoundingClientRect().height) : null,
        tabsTop: tabs ? Math.round(tabs.getBoundingClientRect().top + scrollY) : null,
        headHeight: Math.round(document.querySelector('#main .head').getBoundingClientRect().height),
        activeMobileNav: [...document.querySelectorAll('#mobile-nav a.active')].map(a => a.getAttribute('href')),
      };
    });
    await go('#nova');
    data.newOrder = await p.evaluate(() => {
      const submit = document.querySelector('#new-form button[type=submit]');
      const footer = document.querySelector('#new-form .form-footer');
      const nav = document.querySelector('#mobile-nav');
      return {
        docHeight: document.documentElement.scrollHeight,
        submitTop: submit ? Math.round(submit.getBoundingClientRect().top + scrollY) : null,
        footerTop: footer ? Math.round(footer.getBoundingClientRect().top + scrollY) : null,
        navTop: nav && getComputedStyle(nav).display !== 'none' ? Math.round(nav.getBoundingClientRect().top) : null,
        activeMobileNav: [...document.querySelectorAll('#mobile-nav a.active')].map(a => a.getAttribute('href')),
      };
    });
    await ctx.close();
    out.viewports[`${w}x${h}`] = data;
  }

  // Cartão em contêiner estreito, desktop 1440
  {
    const { ctx, p, go } = await session(browser, 1440, 900);
    await go('#inicio');
    out.narrowCard = await p.evaluate(() => {
      const stack = document.querySelector('.grid.split > .stack');
      const order = stack?.querySelector('.order');
      const title = order?.querySelector('.order-title strong');
      return {
        cardWidth: order ? Math.round(order.getBoundingClientRect().width) : null,
        cardHeight: order ? Math.round(order.getBoundingClientRect().height) : null,
        titleLines: title ? Math.round(title.getBoundingClientRect().height / parseFloat(getComputedStyle(title).lineHeight)) : null,
        gridColumns: order ? getComputedStyle(order).gridTemplateColumns.split(' ').length : null,
      };
    });
    await ctx.close();
  }

  // Long text overflow nas oito resoluções
  out.longText = {};
  for (const [w, h] of [[1920, 1080], [1440, 900], [1366, 768], [768, 1024], [412, 915], [390, 844], [360, 800], [320, 568]]) {
    const { ctx, p, go } = await session(browser, w, h);
    await p.evaluate(() => {
      const k = 'mapos-bancada-prototype-v1';
      const db = JSON.parse(localStorage.getItem(k) || 'null') || seed();
      db.clients[0].name = 'Cliente ' + 'X'.repeat(140);
      const o = db.orders.find(x => x.id === 20);
      o.model = 'M'.repeat(160);
      o.defect = 'D'.repeat(400);
      localStorage.setItem(k, JSON.stringify(db));
    });
    await p.reload({ waitUntil: 'networkidle' });
    await go('#os/20');
    const detail = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    await go('#ordens');
    const list = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    out.longText[`${w}x${h}`] = { detail, list };
    await ctx.close();
  }

  // Impressão e atalho/foco
  {
    const { ctx, p, go } = await session(browser, 1440, 900);
    await go('#imprimir/20');
    out.print = await p.evaluate(() => {
      let pageRules = [];
      for (const s of document.styleSheets) { try { for (const r of s.cssRules) if (r.type === CSSRule.PAGE_RULE) pageRules.push(r.cssText); } catch {} }
      return { pageRules, sheetWidth: Math.round(document.querySelector('.print-sheet').getBoundingClientRect().width) };
    });
    await p.goto(BASE + '/?before=' + Date.now(), { waitUntil: 'networkidle' });
    await p.keyboard.press('Tab');
    out.skipLink = await p.evaluate(() => ({ href: document.activeElement.getAttribute('href'), cls: document.activeElement.className }));
    await p.keyboard.press('Enter');
    await p.waitForTimeout(250);
    out.skipLink.after = await p.locator('#main h1').innerText();
    out.skipLink.hash = await p.evaluate(() => location.hash);
    await go('#os/20');
    await p.click('[data-action="modal:tech:20"]');
    let escapeAt = null;
    for (let i = 1; i <= 8; i++) {
      await p.keyboard.press('Tab');
      const st = await p.evaluate(() => ({ inside: document.querySelector('#modal').contains(document.activeElement), tag: document.activeElement.tagName }));
      if (!st.inside && !escapeAt) escapeAt = { i, ...st };
    }
    out.modalFocus = { escapeAt };
    await ctx.close();
  }

  fs.writeFileSync(path.join(OUT, 'testes', 'baseline-r01.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})();
