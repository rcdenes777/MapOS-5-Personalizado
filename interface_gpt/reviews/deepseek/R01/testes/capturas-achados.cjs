'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const CHROME = process.env.CHROME_PATH || '/home/dragonblue/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8130';
const OUT = path.resolve(__dirname, '..');

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, locale: 'pt-BR' });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });

  const go = async h => {
    await page.evaluate(x => { const d = document.querySelector('#modal'); if (d && d.open) d.close(); if (location.hash === x) render(); else location.hash = x; }, h);
    await page.waitForTimeout(150);
  };
  const shot = async (dir, name, w, h) => {
    const rel = `${dir}/${name}-${w}x${h}.png`;
    fs.mkdirSync(path.join(OUT, dir), { recursive: true });
    await page.screenshot({ path: path.join(OUT, rel), animations: 'disabled' });
    console.log(rel, fs.statSync(path.join(OUT, rel)).size);
  };

  // 1. Cartão comprimido no painel desktop
  await go('#inicio');
  await page.evaluate(() => scrollTo(0, 470));
  await page.waitForTimeout(120);
  await shot('desktop', '91-achado-cartao-lista-estreita', 1440, 900);

  // 2. Submit da Nova OS fora da primeira tela (desktop)
  await go('#nova');
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(120);
  await shot('desktop', '92-achado-nova-os-submit-fora-da-tela', 1440, 900);

  // 3. Entrega disponível em OS não finalizada (OS 22 Em Andamento)
  await go('#os/22');
  await shot('desktop', '93-achado-entrega-os-nao-finalizada', 1440, 900);

  // 4. Mobile 390 — filtros empilhados
  await ctx.close();
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, locale: 'pt-BR' });
  const mp = await mctx.newPage();
  await mp.goto(BASE + '/', { waitUntil: 'networkidle' });
  await mp.evaluate(() => localStorage.clear());
  await mp.reload({ waitUntil: 'networkidle' });
  const mgo = async h => {
    await mp.evaluate(x => { const d = document.querySelector('#modal'); if (d && d.open) d.close(); window.scrollTo(0, 0); if (location.hash === x) render(); else location.hash = x; }, h);
    await mp.waitForTimeout(150);
  };
  const mshot = async name => {
    const rel = `mobile/${name}-390x844.png`;
    await mp.screenshot({ path: path.join(OUT, rel), animations: 'disabled' });
    console.log(rel, fs.statSync(path.join(OUT, rel)).size);
  };
  await mgo('#ordens');
  await mshot('98-achado-filtros-empilhados');

  // 5. Mobile 390 — submit da Nova OS no fim do formulário
  await mgo('#nova');
  await mp.evaluate(() => scrollTo(0, document.body.scrollHeight));
  await mp.waitForTimeout(120);
  await mshot('99-achado-nova-os-submit-fora-da-tela');

  // 6. Mobile 390 — modal de entrega para terceiro
  await mgo('#os/20');
  await mp.click('[data-action="modal:delivery:20"]');
  await mp.check('#action-form input[name=third][value="1"]');
  await mp.fill('#action-form input[name=receiver]', 'Carlos Entregador (fictício)');
  await mp.fill('#action-form textarea[name=authorization]', 'Autorizado por telefone, protocolo fictício 123.');
  await mp.waitForTimeout(120);
  await mshot('95-achado-modal-entrega-terceiro');

  // 7. Mobile 390 — abas abaixo da dobra no detalhe da OS
  await mgo('#os/20');
  await mph();
  async function mph() {
    const rel = 'mobile/94-achado-tabs-abaixo-da-dobra-390x844.png';
    await mp.screenshot({ path: path.join(OUT, rel), animations: 'disabled' });
    console.log(rel, fs.statSync(path.join(OUT, rel)).size);
  }

  // 8. Cupom 80 mm em 320
  await mp.setViewportSize({ width: 320, height: 568 });
  await mgo('#imprimir/20/cupom');
  const rel = 'mobile/93-achado-cupom-80mm-320x568.png';
  await mp.screenshot({ path: path.join(OUT, rel), animations: 'disabled' });
  console.log(rel, fs.statSync(path.join(OUT, rel)).size);

  await mctx.close();
  await browser.close();
})();
