'use strict';
/* R02 — capturas comparativas dos estados corrigidos. */
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const CHROME = process.env.CHROME_PATH || '/home/dragonblue/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8130';
const OUT = path.resolve(__dirname, '..');
const KEY = 'mapos-bancada-prototype-v1';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const shot = async (p, dir, name, w, h) => {
    const rel = `${dir}/${name}-${w}x${h}.png`;
    fs.mkdirSync(path.join(OUT, dir), { recursive: true });
    await p.screenshot({ path: path.join(OUT, rel), animations: 'disabled' });
    console.log(rel, fs.statSync(path.join(OUT, rel)).size);
  };
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR' });
  const p = await ctx.newPage();
  await p.goto(BASE + '/', { waitUntil: 'networkidle' });
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: 'networkidle' });
  const go = async x => { await p.evaluate(h => { const d = document.querySelector('#modal'); if (d && d.open) d.close(); window.scrollTo(0, 0); if (location.hash === h) render(); else location.hash = h; }, x); await p.waitForTimeout(180); };

  await go('#inicio'); await p.evaluate(() => scrollTo(0, 470)); await p.waitForTimeout(120);
  await shot(p, 'desktop', '90-r02-cartao-lista-estreita', 1440, 900);
  await go('#nova'); await p.waitForTimeout(120);
  await shot(p, 'desktop', '91-r02-nova-os-barra', 1440, 900);
  await go('#os/22'); await shot(p, 'desktop', '92-r02-entrega-independente', 1440, 900);
  await ctx.close();

  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'pt-BR' });
  const mp = await mctx.newPage();
  await mp.goto(BASE + '/', { waitUntil: 'networkidle' });
  await mp.evaluate(() => localStorage.clear());
  await mp.reload({ waitUntil: 'networkidle' });
  const mgo = async x => { await mp.evaluate(h => { const d = document.querySelector('#modal'); if (d && d.open) d.close(); window.scrollTo(0, 0); if (location.hash === h) render(); else location.hash = h; }, x); await mp.waitForTimeout(180); };
  await mgo('#ordens'); await mp.selectOption('#queue-filter', 'andamento'); await mp.waitForTimeout(180); await shot(mp, 'mobile', '98-r02-filtros-compactos', 390, 844);
  await mgo('#nova'); await shot(mp, 'mobile', '99-r02-nova-os-barra', 390, 844);
  await mgo('#os/20'); await shot(mp, 'mobile', '94-r02-os-compacta', 390, 844);

  await mp.evaluate(() => save());
  await mp.evaluate(k => {
    const d = JSON.parse(localStorage.getItem(k));
    d.clients[0].name = 'Cliente ' + 'X'.repeat(140);
    const o = d.orders.find(x => x.id === 20);
    o.model = 'M'.repeat(160);
    o.defect = 'D'.repeat(400);
    localStorage.setItem(k, JSON.stringify(d));
  }, KEY);
  await mp.reload({ waitUntil: 'networkidle' });
  await mgo('#os/20'); await shot(mp, 'mobile', '96-r02-texto-longo', 390, 844);
  await mgo('#ordens'); await shot(mp, 'mobile', '97-r02-texto-longo-lista', 390, 844);
  await mctx.close();
  await browser.close();
})();
