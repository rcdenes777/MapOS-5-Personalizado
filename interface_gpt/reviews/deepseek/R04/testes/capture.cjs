'use strict';
/*
 * R04 — capturas e medidas responsivas do portal e do orçamento administrativo.
 * Saída: R04/desktop, R04/mobile, R04/tablet + testes/responsivo.{json,md}
 */
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const CHROME = process.env.CHROME_PATH || '/home/dragonblue/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8130';
const OUT = path.resolve(__dirname, '..');
const results = [], shots = [];
const rec = (id, desc, ok, detail = '') => { const s = ok === 'INFO' ? 'INFO' : ok ? 'PASS' : 'FAIL'; results.push({ id, desc, status: s, detail }); console.log(`${s} ${id} — ${desc} :: ${detail}`); };
const norm = s => String(s).replace(/\u00a0/g, ' ');

async function session(browser, w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: 'pt-BR', reducedMotion: 'reduce' });
  const a = await ctx.newPage();
  await a.goto(BASE + '/?cap-r04=' + Date.now(), { waitUntil: 'networkidle' }); await a.evaluate(() => localStorage.clear()); await a.reload({ waitUntil: 'networkidle' });
  await a.evaluate(() => location.hash = '#os/23/orcamento'); await a.waitForTimeout(220);
  return { ctx, a };
}
async function open(a, kind, id = 23) { const s = `[data-action="modal:${kind}:${id}"]`; if (!(await a.locator(s).count())) return false; await a.locator(s).first().click(); await a.waitForTimeout(130); return a.evaluate(() => document.querySelector('#modal').open); }
async function submit(a) { await a.locator('#action-form button[type=submit]').click(); await a.waitForTimeout(300); }
async function issue(a) { if (!(await a.evaluate(() => !!db.orders.find(o => o.id === 23).publicLink))) { await open(a, 'issuelink'); await a.check('#action-form input[name=confirm]'); await submit(a); } return a.evaluate(() => db.orders.find(o => o.id === 23).publicLink.token); }
async function linkDetails(a) { const d = a.locator('.portal-controls details'); if (await d.count() && !(await d.first().evaluate(e => e.open))) await d.first().locator('summary').click(); await a.waitForTimeout(90); }
async function portal(ctx, token) { const p = await ctx.newPage(); await p.goto(BASE + '/portal.html#' + token, { waitUntil: 'networkidle' }); await p.waitForTimeout(200); return p; }
async function approve(p) { await p.check('input[name=answer][value="Aprovado"]'); await p.fill('input[name=name]', 'Marina Alves (fictícia)'); await p.check('input[name=confirm]'); await p.locator('#customer-response button[type=submit]').click(); await p.waitForTimeout(400); }
async function recuse(p) { await p.check('input[name=answer][value="Recusado"]'); await p.fill('input[name=name]', 'Marina Alves (fictícia)'); await p.check('input[name=confirm]'); await p.locator('#customer-response button[type=submit]').click(); await p.waitForTimeout(400); }
async function setDraft(a) { if (!(await open(a, 'quote'))) return; while (await a.locator('.quote-edit-row').count()) await a.locator('.quote-edit-row [data-quote-remove]').first().click(); await a.locator('[data-quote-add]').click(); const r = a.locator('.quote-edit-row').first(); await r.locator('input[name=itemName]').fill('Peça revisada'); await r.locator('input[name=itemUnit]').fill('300.00'); await submit(a); }
async function shot(p, dir, name, scrollText = null, full = false, top = false) {
  await p.evaluate(() => { const t = document.querySelector('#toast'); if (t) t.hidden = true; });
  if (top) { await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(80); }
  if (scrollText) { await p.evaluate(txt => { const h = [...document.querySelectorAll('h1,h2')].find(e => e.textContent.includes(txt)); if (h) { h.scrollIntoView({ block: 'start' }); window.scrollBy(0, -18); } }, scrollText); await p.waitForTimeout(120); }
  const vp = p.viewportSize(); const rel = `${dir}/${name}-${vp.width}x${vp.height}${full ? '-full' : ''}.png`; const abs = path.join(OUT, rel); fs.mkdirSync(path.dirname(abs), { recursive: true });
  await p.screenshot({ path: abs, animations: 'disabled', fullPage: full }); shots.push(rel); console.log('shot', rel);
}
async function portalMeasure(p) {
  return p.evaluate(() => {
    const q = s => document.querySelector(s), r = s => q(s)?.getBoundingClientRect();
    const demo = q('.customer-demo'), hero = r('.customer-hero'), card = r('.customer-card'), choice = q('.customer-choice'), header = r('.customer-header');
    return { overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, header: header ? [Math.round(header.left), Math.round(header.right)] : null, heroH: hero ? Math.round(hero.height) : null, cardW: card ? Math.round(card.width) : null, choiceCols: choice ? getComputedStyle(choice).gridTemplateColumns.split(/\s+/).filter(Boolean).length : 0, demoOneLine: demo ? demo.scrollHeight <= demo.clientHeight + 1 : null, demoText: demo?.textContent || '' };
  });
}
async function adminMeasure(a) {
  return a.evaluate(() => {
    const ws = document.querySelector('.quote-workspace'); const kids = ws ? [...ws.children] : [];
    return { overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, cols: ws ? getComputedStyle(ws).gridTemplateColumns.split(/\s+/).filter(Boolean).length : 0, order: kids.map(x => x.className), primaries: [...document.querySelectorAll('#main .btn.primary')].map(x => x.textContent.trim()), link: !!document.querySelector('.portal-controls') };
  });
}
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, headless: true });
  for (const [w, h, dir, prefix] of [[320, 568, 'mobile', '320'], [360, 800, 'mobile', '360'], [390, 844, 'mobile', '390'], [412, 915, 'mobile', '412'], [768, 1024, 'tablet', '768'], [1024, 900, 'desktop', '1024'], [1366, 768, 'desktop', '1366'], [1440, 900, 'desktop', '1440'], [1920, 1080, 'desktop', '1920']]) {
    const { ctx, a } = await session(b, w, h);
    const am = await adminMeasure(a);
    rec('R04-RESP-ADMIN-' + prefix, `Admin em ${w}px sem overflow, ${am.cols} coluna(s) e um primário`, am.overflow <= 1 && (w > 1150 ? am.cols === 2 : am.cols === 1) && am.primaries.length === 1, JSON.stringify(am));
    await shot(a, dir, 'admin-inicial-' + prefix, null, w <= 390, true);
    await issue(a); await linkDetails(a);
    const amLink = await adminMeasure(a);
    rec('R04-RESP-LINK-' + prefix, `Link do cliente visível em ${w}px`, amLink.link && amLink.overflow <= 1, JSON.stringify(amLink));
    await shot(a, dir, 'admin-link-ativo-' + prefix, 'Link do cliente', w <= 390);
    const token = await a.evaluate(() => db.orders.find(o => o.id === 23).publicLink.token);
    const p = await portal(ctx, token);
    const pm = await portalMeasure(p);
    const expectedChoice = w >= 600 ? 2 : 1;
    rec('R04-RESP-PORTAL-' + prefix, `Portal em ${w}px sem overflow, header contido e escolha em ${expectedChoice} coluna(s)`, pm.overflow <= 1 && pm.header[0] >= 0 && pm.header[1] <= w && pm.choiceCols === expectedChoice && pm.demoOneLine === true, JSON.stringify(pm));
    await shot(p, dir, 'portal-inicial-' + prefix, null, false, true);
    await shot(p, dir, 'portal-pagina-inteira-' + prefix, null, true, true);
    await p.evaluate(() => { const h = [...document.querySelectorAll('h2')].find(x => x.textContent.includes('Sua decisão')); if (h) h.scrollIntoView({ block: 'start' }); window.scrollBy(0, -20); }); await p.waitForTimeout(120);
    await shot(p, dir, 'portal-decisao-' + prefix);
    await ctx.close();
  }

  // estados completos em 390 e 1440
  for (const [w, h, dir, prefix] of [[390, 844, 'mobile', '390'], [1440, 900, 'desktop', '1440']]) {
    const { ctx, a } = await session(b, w, h); await issue(a);
    const token = await a.evaluate(() => db.orders.find(o => o.id === 23).publicLink.token);
    const p = await portal(ctx, token);
    await approve(p); await a.waitForTimeout(300);
    await shot(p, dir, 'portal-aprovado-' + prefix, null, false, true);
    await shot(p, dir, 'portal-aprovado-pagina-inteira-' + prefix, null, true, true);
    await a.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 5); return d.toISOString().slice(0, 10); }).then(async due => { await open(a, 'billing'); await a.fill('#action-form input[name=due]', due); await a.check('#action-form input[name=confirm]'); await submit(a); });
    await p.waitForTimeout(300); await shot(p, dir, 'portal-cobranca-' + prefix, 'Pagamento');
    await open(a, 'pay'); await a.fill('#action-form input[name=amount]', '100.00'); await submit(a); await p.waitForTimeout(300); await shot(p, dir, 'portal-cobranca-parcial-' + prefix, 'Pagamento');
    await open(a, 'delivery'); await a.check('#action-form input[name=confirm]'); await submit(a); await p.waitForTimeout(300); await shot(p, dir, 'portal-apos-entrega-' + prefix, 'Seu orçamento');
    await shot(p, dir, 'portal-apos-entrega-inteira-' + prefix, null, true, true);
    await ctx.close();
  }

  // estados de recusa, retirada e orçamento ausente
  for (const [w, h, dir, prefix] of [[390, 844, 'mobile', '390'], [1440, 900, 'desktop', '1440']]) {
    const { ctx, a } = await session(b, w, h); await issue(a);
    const token = await a.evaluate(() => db.orders.find(o => o.id === 23).publicLink.token);
    const p = await portal(ctx, token); await recuse(p); await a.waitForTimeout(300); await shot(p, dir, 'portal-recusado-' + prefix, null, false, true); await shot(a, dir, 'admin-recusa-aviso-' + prefix, 'Cobrança');
    await open(a, 'withdraw'); await a.check('#action-form input[name=confirm]'); await submit(a); await p.waitForTimeout(300); await shot(p, dir, 'portal-sem-orcamento-' + prefix, null, false, true);
    await ctx.close();
  }

  // admin: rascunho divergente, gerenciamento de link e cobrança
  {
    const { ctx, a } = await session(b, 1440, 900); await issue(a); await setDraft(a); await a.waitForTimeout(200);
    await shot(a, 'desktop', 'admin-rascunho-divergente-1440', 'Peças e serviços');
    await open(a, 'billing'); await shot(a, 'desktop', 'admin-cobranca-aviso-1440'); await a.locator('#modal button[data-action=close]').click(); await ctx.close();
  }
  {
    const { ctx, a } = await session(b, 1440, 900); await issue(a); await linkDetails(a);
    await open(a, 'renewlink'); await shot(a, 'desktop', 'admin-renovar-link-1440'); await a.locator('#modal button[data-action=close]').click();
    await a.locator('[data-action="copyportal:23"]').click(); await a.waitForTimeout(120); await shot(a, 'desktop', 'admin-copiar-endereco-1440'); await a.locator('#modal button[data-action=close]').click(); await ctx.close();
  }
  {
    const { ctx, a } = await session(b, 1440, 900); await issue(a); await linkDetails(a);
    await open(a, 'revokelink'); await shot(a, 'desktop', 'admin-revogar-link-1440'); await ctx.close();
  }
  for (const [role, name] of [['Técnico', 'tecnico'], ['Atendente', 'atendente'], ['Financeiro', 'financeiro']]) {
    const { ctx, a } = await session(b, 1440, 900); await a.selectOption('#role', role); await a.waitForTimeout(180); await shot(a, 'desktop', 'admin-perfil-' + name + '-1440'); await ctx.close();
  }
  // link inválido
  {
    const { ctx } = await session(b, 390, 844); const bad = await portal(ctx, 'a'.repeat(64)); await shot(bad, 'mobile', 'portal-link-invalido-390', null, false, true); await ctx.close();
  }

  fs.writeFileSync(path.join(OUT, 'testes', 'responsivo.json'), JSON.stringify({ generatedAt: new Date().toISOString(), codeSha: process.env.CODE_SHA || '', incrementSha: process.env.INCREMENT_SHA || '', results, shots }, null, 2));
  const md = ['# Responsividade e capturas — R04', '', `Gerado em ${new Date().toISOString()}`, '', '| Status | ID | Verificação | Detalhe |', '| --- | --- | --- | --- |', ...results.map(r => `| ${r.status} | ${r.id} | ${r.desc.replace(/\|/g, '\\|')} | ${String(r.detail).replace(/\|/g, '\\|').replace(/\n/g, ' ')} |`), '', `Capturas: ${shots.length}`, ...shots.map(s => `- ${s}`)].join('\n');
  fs.writeFileSync(path.join(OUT, 'testes', 'responsivo.md'), md);
  console.log(`RESP TOTAL ${results.length} · PASS ${results.filter(r => r.status === 'PASS').length} · FAIL ${results.filter(r => r.status === 'FAIL').length} · INFO ${results.filter(r => r.status === 'INFO').length} · SHOTS ${shots.length}`);
  await b.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
