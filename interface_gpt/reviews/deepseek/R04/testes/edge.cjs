'use strict';
/* R04 — casos de borda: concorrência de abas, revogação/expiração, inválidos, perfis e textos longos. */
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const CHROME = process.env.CHROME_PATH || '/home/dragonblue/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8130';
const OUT = path.resolve(__dirname, '..');
const results = [];
const rec = (id, desc, ok, detail = '') => { const s = ok === 'INFO' ? 'INFO' : ok ? 'PASS' : 'FAIL'; results.push({ id, desc, status: s, detail }); console.log(`${s} ${id} — ${desc} :: ${detail}`); };
const norm = s => String(s).replace(/\u00a0/g, ' ');
async function session(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR' });
  const a = await ctx.newPage();
  await a.goto(BASE + '/?edge-r04=' + Date.now(), { waitUntil: 'networkidle' }); await a.evaluate(() => localStorage.clear()); await a.reload({ waitUntil: 'networkidle' });
  await a.evaluate(() => location.hash = '#os/23/orcamento'); await a.waitForTimeout(220);
  return { ctx, a };
}
async function open(a, kind, id = 23) { const s = `[data-action="modal:${kind}:${id}"]`; if (!(await a.locator(s).count())) return false; await a.locator(s).first().click(); await a.waitForTimeout(120); return a.evaluate(() => document.querySelector('#modal').open); }
async function submit(a) { await a.locator('#action-form button[type=submit]').click(); await a.waitForTimeout(280); }
async function issue(a) { if (!(await a.evaluate(() => !!db.orders.find(o => o.id === 23).publicLink))) { await open(a, 'issuelink'); await a.check('#action-form input[name=confirm]'); await submit(a); } return a.evaluate(() => db.orders.find(o => o.id === 23).publicLink.token); }
async function linkDetails(a) { const d = a.locator('.portal-controls details'); if (await d.count() && !(await d.first().evaluate(e => e.open))) await d.first().locator('summary').click(); await a.waitForTimeout(80); }
async function portal(ctx, token) { const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE + '/portal.html#' + token, { waitUntil: 'networkidle' }); await p.waitForTimeout(180); return { p, errs }; }
async function approve(p) { await p.check('input[name=answer][value="Aprovado"]'); await p.fill('input[name=name]', 'Marina Alves'); await p.check('input[name=confirm]'); await p.locator('#customer-response button[type=submit]').click(); await p.waitForTimeout(400); }
async function setDraftLong(a) {
  await open(a, 'quote');
  while (await a.locator('.quote-edit-row').count()) await a.locator('.quote-edit-row [data-quote-remove]').first().click();
  await a.locator('[data-quote-add]').click();
  const r = a.locator('.quote-edit-row').first();
  await r.locator('input[name=itemName]').fill('P' + 'X'.repeat(490)); await r.locator('input[name=itemUnit]').fill('100.00');
  const d = a.locator('#action-form details').filter({ hasText: 'Condições da proposta' }); if (await d.count()) await d.locator('summary').click();
  await a.fill('textarea[name=diagnosis]', 'DIAGNOSTICO <img src=x onerror="window.__xss=1"> ' + 'Y'.repeat(1700));
  await a.fill('input[name=equipment]', 'EQUIPAMENTO ' + 'Z'.repeat(1800));
  await submit(a);
}
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, headless: true });

  // 1. revogação propagada sem reload
  {
    const { ctx, a } = await session(b); const token = await issue(a); const { p } = await portal(ctx, token);
    await linkDetails(a); await open(a, 'revokelink'); await a.check('#action-form input[name=confirm]'); await submit(a);
    await p.waitForTimeout(500);
    const t = norm(await p.locator('#customer-main').innerText());
    rec('R04-X01', 'Revogação chega à outra aba sem reload', /Link indisponível/.test(t) && !(await p.locator('#customer-response').count()), t.slice(0, 120));
    await ctx.close();
  }

  // 2. link revogado entre abertura e envio
  {
    const { ctx, a } = await session(b); const token = await issue(a); const { p } = await portal(ctx, token);
    await p.check('input[name=answer][value="Aprovado"]'); await p.fill('input[name=name]', 'Cliente Fictício'); await p.check('input[name=confirm]');
    await linkDetails(a); await open(a, 'revokelink'); await a.check('#action-form input[name=confirm]'); await submit(a);
    await p.waitForTimeout(500);
    const t = norm(await p.locator('#customer-main').innerText());
    const direct = await p.evaluate(() => { const db = BancadaPortal.read(localStorage); try { BancadaPortal.respond(db, db.orders.find(o => o.id === 23).publicLink?.token || '', 1, { answer: 'Aprovado', name: 'Cliente', confirm: true }); return 'aceitou'; } catch (e) { return e.message; } });
    rec('R04-X02', 'Revogação no meio do preenchimento remove o formulário e bloqueia envio', /Link indisponível/.test(t) && !(await p.locator('#customer-response').count()) && /indisponível|link/i.test(direct), JSON.stringify({ direct }));
    await ctx.close();
  }

  // 3. expiração propagada sem reload
  {
    const { ctx, a } = await session(b); const token = await issue(a); const { p } = await portal(ctx, token);
    await a.evaluate(() => { const o = db.orders.find(x => x.id === 23); o.publicLink.expires = Date.now() - 1; save(); render(); });
    await p.waitForTimeout(500);
    rec('R04-X03', 'Expiração chega à outra aba e remove o formulário', /Link indisponível/.test(norm(await p.locator('#customer-main').innerText())) && !(await p.locator('#customer-response').count()), 'expired cross-tab');
    await ctx.close();
  }

  // 4. decisão do portal atualiza a UI administrativa, não só o objeto
  {
    const { ctx, a } = await session(b); const token = await issue(a); const { p } = await portal(ctx, token);
    await approve(p); await a.waitForTimeout(300);
    const t = norm(await a.locator('#main').innerText());
    rec('R04-X04', 'Decisão do portal atualiza a aba administrativa', /Aprovado/.test(t) && !/Registrar resposta do cliente/.test(t) && /Formalizar cobrança/.test(t), t.slice(-260));
    await ctx.close();
  }

  // 5. token inválido e armazenamento corrompido
  {
    const { ctx } = await session(b);
    const bad = await portal(ctx, 'a'.repeat(64));
    rec('R04-X05', 'Token válido em formato, mas inexistente, mostra link indisponível', /Link indisponível/.test(norm(await bad.p.locator('#customer-main').innerText())) && !(await bad.p.locator('#customer-response').count()), 'bad token');
    await bad.p.evaluate(() => localStorage.setItem(BancadaPortal.key, '{'));
    await bad.p.reload({ waitUntil: 'networkidle' }); await bad.p.waitForTimeout(150);
    rec('R04-X06', 'JSON local corrompido não quebra a página', /Link indisponível/.test(norm(await bad.p.locator('#customer-main').innerText())) && bad.errs.length === 0, JSON.stringify(bad.errs));
    await ctx.close();
  }

  // 6. formulário inválido e sem pré-seleção
  {
    const { ctx, a } = await session(b); const token = await issue(a); const { p } = await portal(ctx, token);
    const checked = await p.evaluate(() => [...document.querySelectorAll('input[name=answer]')].filter(x => x.checked).length);
    await p.locator('#customer-response button[type=submit]').click(); await p.waitForTimeout(200);
    const st = await p.evaluate(() => ({ invalid: document.querySelectorAll('#customer-response :invalid').length, decision: (BancadaPortal.read(localStorage).orders.find(o => o.id === 23).quote.versions[0].decision || null) }));
    rec('R04-X07', 'Formulário inválido não registra decisão e não tem escolha inicial', checked === 0 && st.invalid > 0 && st.decision === null, JSON.stringify(st));
    await ctx.close();
  }

  // 7. modal de endereço copiável
  {
    const { ctx, a } = await session(b); const token = await issue(a);
    await linkDetails(a); await a.locator('[data-action="copyportal:23"]').click(); await a.waitForTimeout(120);
    const url = await a.locator('#portal-url').inputValue();
    const modalOpen = await a.evaluate(() => document.querySelector('#modal').open);
    rec('R04-X08', 'Endereço local contém portal.html e o token ativo', modalOpen && url.includes('portal.html#') && url.includes(token), url.slice(0, 80) + '…');
    await a.locator('#modal button[data-action=close]').click();
    await open(a, 'renewlink'); await a.keyboard.press('Escape'); await a.waitForTimeout(150);
    const focus = await a.evaluate(() => ({ open: document.querySelector('#modal').open, active: document.activeElement?.getAttribute('data-action') || document.activeElement?.tagName }));
    rec('R04-X15', 'Escape no modal de renovação fecha e devolve foco ao gatilho', !focus.open && /modal:renewlink:23/.test(focus.active || ''), JSON.stringify(focus));
    await ctx.close();
  }

  // 8. perfis simulados e ausência do simulador antigo
  {
    const { ctx, a } = await session(b); await issue(a);
    const adminText = norm(await a.locator('#main').innerText());
    rec('R04-X09', 'Administrativo não oferece mais “Simular resposta pelo link”', !/Simular resposta pelo link/.test(adminText), 'legacy removed');
    await a.selectOption('#role', 'Técnico'); await a.waitForTimeout(200);
    const tech = norm(await a.locator('#main').innerText());
    const techBtn = await a.locator('[data-action="modal:issuelink:23"]').count();
    await a.evaluate(() => openModal('issuelink', 23));
    const techModal = await a.evaluate(() => document.querySelector('#modal').open);
    rec('R04-X10', 'Técnico não vê nem abre o gerador de link', !/Link do cliente/.test(tech) && techBtn === 0 && !techModal, JSON.stringify({ techBtn, techModal }));
    await a.selectOption('#role', 'Financeiro'); await a.waitForTimeout(200);
    const fin = norm(await a.locator('#main').innerText());
    rec('R04-X11', 'Financeiro vê o link do cliente', /Link do cliente/.test(fin), 'finance');
    const internal = await a.evaluate(() => { openModal('approval', 23); const s = document.querySelector('#action-form select[name=answer]'); return { open: document.querySelector('#modal').open, value: s?.value, required: s?.required }; });
    rec('R04-X16', 'Modal interno de resposta não pré-seleciona decisão', internal.open && internal.value === '' && internal.required === true, JSON.stringify(internal));
    await a.locator('#modal button[data-action=close]').click();
    const legacy = await a.evaluate(() => { openModal('publicresponse', 23); return document.querySelector('#modal').open; });
    rec('R04-X17', 'Caminho legado publicresponse não abre modal', !legacy, String(legacy));
    await ctx.close();
  }

  // 9. textos longos/XSS no portal em 320
  {
    const { ctx, a } = await session(b); const token = await issue(a); await setDraftLong(a); await open(a, 'publish'); await a.check('#action-form input[name=confirm]'); await submit(a);
    await a.waitForTimeout(250);
    const { p, errs } = await portal(ctx, token);
    await p.setViewportSize({ width: 320, height: 568 }); await p.waitForTimeout(200);
    const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const html = await p.locator('#customer-main').innerHTML();
    rec('R04-X12', 'Conteúdo longo do portal não cria overflow em 320', over <= 1 && errs.length === 0, JSON.stringify({ over, errs }));
    rec('R04-X13', 'HTML publicado é escapado no portal em 320', html.includes('&lt;img') && !html.includes('<img src=x') && (await p.evaluate(() => window.__xss || 0)) === 0, 'escaping');
    // texto longo legítimo não tem tags; o diagnóstico contém Ys e deve estar no HTML
    rec('R04-X14', 'Diagnóstico longo publicado permanece no HTML', html.includes('DIAGNOSTICO '), 'long diagnosis');
    await ctx.close();
  }

  fs.writeFileSync(path.join(OUT, 'testes', 'edge-resultados.json'), JSON.stringify({ generatedAt: new Date().toISOString(), codeSha: process.env.CODE_SHA || '', incrementSha: process.env.INCREMENT_SHA || '', results }, null, 2));
  console.log(`TOTAL ${results.length} · PASS ${results.filter(r => r.status === 'PASS').length} · FAIL ${results.filter(r => r.status === 'FAIL').length} · INFO ${results.filter(r => r.status === 'INFO').length}`);
  await b.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
