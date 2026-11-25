'use strict';
/*
 * R01 — capturas de evidência (somente leitura sobre o protótipo).
 * Requer: playwright-core + Chromium local.
 * Uso: node capturas.cjs
 */
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');

const CHROME = process.env.CHROME_PATH ||
  '/home/dragonblue/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8130';
const OUT = path.resolve(__dirname, '..');
const only = process.argv[2] || '';

const browserPromise = chromium.launch({ executablePath: CHROME, headless: true });

async function freshPage(width, height, opts = {}) {
  const browser = await browserPromise;
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, locale: 'pt-BR' });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.error('PAGEERROR', e.message));
  page.on('console', m => { if (m.type() === 'error') console.error('CONSOLE', m.text()); });
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  if (!opts.keepData) {
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });
  }
  await page.waitForSelector('#main h1');
  return { ctx, page };
}

async function go(page, hash) {
  await page.evaluate(h => {
    const d = document.querySelector('#modal');
    if (d && d.open) d.close();
    if (location.hash === h) { render(); } else { location.hash = h; }
  }, hash);
  await page.waitForTimeout(140);
  await page.waitForSelector('#main h1', { state: 'attached' });
}

async function role(page, r) {
  await page.selectOption('#role', r);
  await page.waitForTimeout(120);
}

async function shot(page, dir, name, w, h) {
  const rel = path.join(dir, `${name}-${w}x${h}.png`);
  const abs = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  await page.screenshot({ path: abs, animations: 'disabled' });
  console.log('shot', rel, fs.statSync(abs).size);
}

const jobs = [];
const add = (dir, name, w, h, prepare) => jobs.push({ dir, name, w, h, prepare });

/* ---------- desktop 1440x900 ---------- */
const D = 'desktop', W = 1440, H = 900;
add(D, '01-painel', W, H, async p => { await go(p, '#inicio'); });
add(D, '02-filas-operacionais', W, H, async p => { await go(p, '#inicio'); await p.evaluate(() => scrollTo(0, 330)); });
add(D, '03-listagem-os', W, H, async p => { await go(p, '#ordens'); });
add(D, '04-pesquisa-filtros', W, H, async p => { await go(p, '#ordens'); await p.fill('#search', 'Midea'); await p.waitForTimeout(150); });
add(D, '05-nova-os', W, H, async p => { await go(p, '#nova'); });
add(D, '06-nova-os-equipamento-existente', W, H, async p => {
  await go(p, '#nova'); await p.selectOption('select[name=client]', '1');
  await p.selectOption('select[name=mode]', 'existing'); await p.waitForTimeout(150);
});
add(D, '07-nova-os-cadastro-manual', W, H, async p => {
  await go(p, '#nova'); await p.selectOption('select[name=client]', '2');
  await p.fill('input[name=brand]', 'Midea'); await p.fill('input[name=model]', 'Xtreme Save 12k');
  await p.fill('input[name=serial]', 'SN-DEMO-001'); await p.fill('textarea[name=defect]', 'Não liga.');
});
add(D, '08-os-detalhe-resumo', W, H, async p => { await go(p, '#os/20'); });
add(D, '09-os-atendimento', W, H, async p => { await go(p, '#os/20/atendimento'); });
add(D, '10-os-orcamento', W, H, async p => { await go(p, '#os/23/orcamento'); });
add(D, '11-modal-andamento', W, H, async p => { await go(p, '#os/20'); await p.click('[data-action="modal:tech:20"]'); await p.waitForTimeout(150); });
add(D, '12-modal-pagamento', W, H, async p => { await go(p, '#os/22'); await p.click('[data-action="modal:pay:22"]'); await p.waitForTimeout(150); });
add(D, '13-modal-entrega', W, H, async p => { await go(p, '#os/20'); await p.click('[data-action="modal:delivery:20"]'); await p.waitForTimeout(150); });
add(D, '14-modal-entrega-terceiro', W, H, async p => {
  await go(p, '#os/20'); await p.click('[data-action="modal:delivery:20"]'); await p.waitForTimeout(120);
  await p.check('input[name=third][value="1"]'); await p.waitForTimeout(100);
  await p.fill('input[name=receiver]', 'Carlos Entregador (fictício)');
  await p.fill('textarea[name=authorization]', 'Autorizado por telefone, protocolo fictício 123.');
});
add(D, '15-os-entrega', W, H, async p => { await go(p, '#os/19/entrega'); });
add(D, '16-os-historico', W, H, async p => { await go(p, '#os/20/historico'); });
add(D, '17-os-anexos', W, H, async p => { await go(p, '#os/20/anexos'); });
add(D, '18-retorno-garantia', W, H, async p => { await go(p, '#retorno/20'); });
add(D, '19-impressao-a4', W, H, async p => { await go(p, '#imprimir/20'); });
add(D, '20-impressao-80mm', W, H, async p => { await go(p, '#imprimir/20/cupom'); });
add(D, '21-clientes', W, H, async p => { await go(p, '#clientes'); });
add(D, '22-modal-novo-cliente', W, H, async p => { await go(p, '#clientes'); await p.click('[data-action="modal:client:0"]'); await p.waitForTimeout(150); });
add(D, '23-estoque', W, H, async p => { await go(p, '#estoque'); });
add(D, '24-financeiro', W, H, async p => { await go(p, '#financeiro'); });
add(D, '25-relatorios', W, H, async p => { await go(p, '#relatorios'); });
add(D, '26-configuracoes', W, H, async p => { await go(p, '#configuracoes'); });
add(D, '27-perfil-tecnico', W, H, async p => { await role(p, 'Técnico'); await go(p, '#inicio'); });
add(D, '28-perfil-atendente', W, H, async p => { await role(p, 'Atendente'); await go(p, '#inicio'); });
add(D, '29-perfil-financeiro', W, H, async p => { await role(p, 'Financeiro'); await go(p, '#inicio'); });
add(D, '30-os-detalhe-tecnico', W, H, async p => { await role(p, 'Técnico'); await go(p, '#os/20'); });
add(D, '31-os-detalhe-atendente', W, H, async p => { await role(p, 'Atendente'); await go(p, '#os/20'); });
add(D, '32-os-detalhe-financeiro', W, H, async p => { await role(p, 'Financeiro'); await go(p, '#os/20'); });
add(D, '33-modal-orcamento', W, H, async p => { await go(p, '#os/24/orcamento'); await p.click('[data-action="modal:quote:24"]'); await p.waitForTimeout(150); });
add(D, '34-modal-aprovacao', W, H, async p => { await go(p, '#os/23/orcamento'); await p.click('[data-action="modal:approval:23"]'); await p.waitForTimeout(150); });
add(D, '35-mais-modulos', W, H, async p => { await go(p, '#mais'); });
add(D, '36-impressao-a4-midia-print', W, H, async p => { await go(p, '#imprimir/20'); await p.emulateMedia({ media: 'print' }); await p.waitForTimeout(100); });
add(D, '37-impressao-80mm-midia-print', W, H, async p => { await go(p, '#imprimir/20/cupom'); await p.emulateMedia({ media: 'print' }); await p.waitForTimeout(100); });

/* ---------- mobile 390x844 ---------- */
const M = 'mobile', MW = 390, MH = 844;
add(M, '01-painel', MW, MH, async p => { await go(p, '#inicio'); });
add(M, '02-filas-operacionais', MW, MH, async p => { await go(p, '#inicio'); await p.evaluate(() => scrollTo(0, 260)); });
add(M, '03-listagem-os', MW, MH, async p => { await go(p, '#ordens'); });
add(M, '04-nova-os', MW, MH, async p => { await go(p, '#nova'); });
add(M, '05-nova-os-equipamento-existente', MW, MH, async p => { await go(p, '#nova'); await p.selectOption('select[name=client]', '1'); await p.selectOption('select[name=mode]', 'existing'); await p.waitForTimeout(150); });
add(M, '06-os-detalhe-resumo', MW, MH, async p => { await go(p, '#os/20'); });
add(M, '07-os-atendimento', MW, MH, async p => { await go(p, '#os/20/atendimento'); });
add(M, '08-os-orcamento', MW, MH, async p => { await go(p, '#os/23/orcamento'); });
add(M, '09-modal-andamento', MW, MH, async p => { await go(p, '#os/20'); await p.click('[data-action="modal:tech:20"]'); await p.waitForTimeout(150); });
add(M, '10-modal-pagamento', MW, MH, async p => { await go(p, '#os/22'); await p.click('[data-action="modal:pay:22"]'); await p.waitForTimeout(150); });
add(M, '11-modal-entrega', MW, MH, async p => { await go(p, '#os/20'); await p.click('[data-action="modal:delivery:20"]'); await p.waitForTimeout(150); });
add(M, '12-os-entrega', MW, MH, async p => { await go(p, '#os/19/entrega'); });
add(M, '13-os-historico', MW, MH, async p => { await go(p, '#os/20/historico'); });
add(M, '14-os-anexos', MW, MH, async p => { await go(p, '#os/20/anexos'); });
add(M, '15-clientes', MW, MH, async p => { await go(p, '#clientes'); });
add(M, '16-estoque', MW, MH, async p => { await go(p, '#estoque'); });
add(M, '17-financeiro', MW, MH, async p => { await go(p, '#financeiro'); });
add(M, '18-relatorios', MW, MH, async p => { await go(p, '#relatorios'); });
add(M, '19-configuracoes', MW, MH, async p => { await go(p, '#configuracoes'); });
add(M, '20-impressao-a4', MW, MH, async p => { await go(p, '#imprimir/20'); });
add(M, '21-impressao-80mm', MW, MH, async p => { await go(p, '#imprimir/20/cupom'); });
add(M, '22-retorno-garantia', MW, MH, async p => { await go(p, '#retorno/20'); });
add(M, '23-mais-modulos', MW, MH, async p => { await go(p, '#mais'); });
add(M, '24-modal-novo-cliente', MW, MH, async p => { await go(p, '#clientes'); await p.click('[data-action="modal:client:0"]'); await p.waitForTimeout(150); });

/* ---------- tablet 768x1024 ---------- */
const T = 'tablet', TW = 768, TH = 1024;
add(T, '01-painel', TW, TH, async p => { await go(p, '#inicio'); });
add(T, '02-listagem-os', TW, TH, async p => { await go(p, '#ordens'); });
add(T, '03-nova-os', TW, TH, async p => { await go(p, '#nova'); });
add(T, '04-os-detalhe', TW, TH, async p => { await go(p, '#os/20'); });
add(T, '05-financeiro', TW, TH, async p => { await go(p, '#financeiro'); });
add(T, '06-modal-pagamento', TW, TH, async p => { await go(p, '#os/22'); await p.click('[data-action="modal:pay:22"]'); await p.waitForTimeout(150); });
add(T, '07-impressao-a4', TW, TH, async p => { await go(p, '#imprimir/20'); });
add(T, '08-mais-modulos', TW, TH, async p => { await go(p, '#mais'); });

/* ---------- outras resoluções (evidência de responsividade) ---------- */
add('mobile', '90-painel', 320, 568, async p => { await go(p, '#inicio'); });
add('mobile', '91-listagem-os', 320, 568, async p => { await go(p, '#ordens'); });
add('mobile', '92-os-detalhe', 320, 568, async p => { await go(p, '#os/20'); });
add('mobile', '93-painel', 412, 915, async p => { await go(p, '#inicio'); });
add('mobile', '94-os-detalhe', 412, 915, async p => { await go(p, '#os/20'); });
add('mobile', '95-painel', 360, 800, async p => { await go(p, '#inicio'); });
add('desktop', '95-painel', 1366, 768, async p => { await go(p, '#inicio'); });
add('desktop', '96-painel', 1920, 1080, async p => { await go(p, '#inicio'); });

(async () => {
  const groups = {};
  for (const job of jobs) {
    if (only && !(`${job.dir}/${job.name}`).includes(only)) continue;
    const key = `${job.w}x${job.h}`;
    groups[key] = groups[key] || await freshPage(job.w, job.h);
    try {
      await groups[key].page.emulateMedia({ media: 'screen' });
      await job.prepare(groups[key].page);
      await shot(groups[key].page, job.dir, job.name, job.w, job.h);
    } catch (err) {
      console.error('FAIL', job.dir, job.name, err.message);
    }
  }
  for (const k of Object.keys(groups)) await groups[k].ctx.close();
  const browser = await browserPromise;
  await browser.close();
})();
