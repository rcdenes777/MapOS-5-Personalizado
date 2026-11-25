'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const CHROME = process.env.CHROME_PATH || '/home/dragonblue/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8130';
const OUT = path.resolve(__dirname, '..');

async function session(browser, w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: 'pt-BR' });
  const p = await ctx.newPage();
  await p.goto(BASE + '/', { waitUntil: 'networkidle' });
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: 'networkidle' });
  const go = async x => { await p.evaluate(h => { const d = document.querySelector('#modal'); if (d && d.open) d.close(); window.scrollTo(0, 0); if (location.hash === h) render(); else location.hash = h; }, x); await p.waitForTimeout(160); };
  return { ctx, p, go };
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const out = { capturedAt: new Date().toISOString(), sha: process.env.SHA_TESTED || '', viewports: {} };
  for (const [w, h] of [[1440, 900], [768, 1024], [390, 844], [320, 568]]) {
    const { ctx, p, go } = await session(browser, w, h);
    const d = {};
    await go('#inicio');
    d.dashboard = await p.evaluate(() => {
      const hero = document.querySelector('.hero'), metrics = document.querySelector('.metrics'), first = document.querySelector('#main .order'),
        nav = document.querySelector('#mobile-nav');
      const navTop = nav && getComputedStyle(nav).display !== 'none' ? Math.round(nav.getBoundingClientRect().top) : null;
      return { hero: Math.round(hero.getBoundingClientRect().height), metrics: Math.round(metrics.getBoundingClientRect().height), firstTop: first ? Math.round(first.getBoundingClientRect().top + scrollY) : null, firstAboveNav: first && navTop ? first.getBoundingClientRect().top < navTop : null, navTop };
    });
    await go('#ordens');
    d.orders = await p.evaluate(() => {
      const first = document.querySelector('#main .order'), sel = document.querySelector('#queue-filter'), chips = document.querySelector('.filters.chips');
      return { firstTop: first ? Math.round(first.getBoundingClientRect().top + scrollY) : null, selectVisible: !!sel && sel.offsetParent !== null, chipsVisible: !!chips && chips.offsetParent !== null, filterHeight: sel ? Math.round(sel.closest('.filter-mobile').getBoundingClientRect().height) : null };
    });
    await go('#os/20');
    d.os = await p.evaluate(() => {
      const stats = document.querySelector('.stats'), tabs = document.querySelector('.tabs');
      return { statsHeight: Math.round(stats.getBoundingClientRect().height), tabsTop: Math.round(tabs.getBoundingClientRect().top + scrollY), firstInfoTop: Math.round(document.querySelector('#main .head').getBoundingClientRect().height) };
    });
    await go('#nova');
    d.nova = await p.evaluate(() => {
      const submit = document.querySelector('#new-form button[type=submit]'), footer = document.querySelector('#new-form .form-footer'), nav = document.querySelector('#mobile-nav');
      const sr = submit.getBoundingClientRect(), fr = footer.getBoundingClientRect(), nr = nav.getBoundingClientRect();
      return { submitVisible: sr.top >= 0 && sr.bottom <= innerHeight, submitTop: Math.round(sr.top), footerTop: Math.round(fr.top), footerBottom: Math.round(fr.bottom), navTop: Math.round(nr.top), position: getComputedStyle(footer).position };
    });
    if (w === 1440) {
      await go('#inicio');
      d.cards = await p.evaluate(() => {
        const narrow = document.querySelector('.grid.split > .stack .order'), full = document.querySelector('.grid.split > .panel .list .order');
        return { narrowWidth: Math.round(narrow.getBoundingClientRect().width), narrowHeight: Math.round(narrow.getBoundingClientRect().height), narrowCols: getComputedStyle(narrow).gridTemplateColumns.split(' ').length, fullCols: getComputedStyle(full).gridTemplateColumns.split(' ').length };
      });
    }
    out.viewports[`${w}x${h}`] = d;
    await ctx.close();
  }
  fs.writeFileSync(path.join(OUT, 'testes', 'medicoes-r02.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})();
