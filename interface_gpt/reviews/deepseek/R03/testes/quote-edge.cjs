'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const CHROME = process.env.CHROME_PATH || '/home/dragonblue/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8130';
const OUT = path.resolve(__dirname, '..');
const results = [];
const rec = (id, desc, ok, detail = '') => { const s = ok === 'INFO' ? 'INFO' : ok ? 'PASS' : 'FAIL'; results.push({ id, desc, status: s, detail }); console.log(`${s} ${id} — ${desc} :: ${detail}`); };
fs.mkdirSync(OUT, { recursive: true });

async function session(browser, w = 1440, h = 900) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: 'pt-BR' });
  const p = await ctx.newPage();
  await p.goto(BASE + '/?edge=' + Date.now(), { waitUntil: 'networkidle' });
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: 'networkidle' });
  await p.evaluate(() => save());
  const go = async x => { await p.evaluate(h => { const d = document.querySelector('#modal'); if (d && d.open) d.close(); window.scrollTo(0, 0); if (location.hash === h) render(); else location.hash = h; }, x); await p.waitForTimeout(180); };
  return { ctx, p, go };
}
async function open(p, kind, id = 23) { const sel = `[data-action="modal:${kind}:${id}"]`; if (!(await p.locator(sel).count())) return false; await p.locator(sel).first().click(); await p.waitForTimeout(150); return p.evaluate(() => document.querySelector('#modal').open); }
async function submit(p) { await p.locator('#action-form button[type=submit]').click(); await p.waitForTimeout(260); }
async function setOne(p, name, unit, discount = 0) {
  await open(p, 'quote');
  while (await p.locator('.quote-edit-row').count()) await p.locator('.quote-edit-row [data-quote-remove]').first().click();
  await p.locator('[data-quote-add]').click();
  const r = p.locator('.quote-edit-row').first();
  await r.locator('input[name=itemName]').fill(name);
  await r.locator('input[name=itemQty]').fill('1');
  await r.locator('input[name=itemUnit]').fill(String(unit));
  await p.fill('input[name=discount]', String(discount));
}
(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });

  // 1. desconto maior que o total
  {
    const { ctx, p, go } = await session(browser); await go('#os/23/orcamento');
    await setOne(p, 'Peça teste', 100, 200); await submit(p);
    const st = await p.evaluate(() => ({ open: document.querySelector('#modal').open, error: document.querySelector('#modal-error')?.innerText, hidden: document.querySelector('#modal-error')?.hidden, draft: db.orders.find(o => o.id === 23).quote.draft.items.length }));
    rec('E1', 'Desconto acima do total é rejeitado no modal', st.open && !st.hidden && /desconto/i.test(st.error || '') && st.draft === 1, JSON.stringify(st));
    await ctx.close();
  }
  // 2. item vazio
  {
    const { ctx, p, go } = await session(browser); await go('#os/23/orcamento');
    await open(p, 'quote');
    while (await p.locator('.quote-edit-row').count()) await p.locator('.quote-edit-row [data-quote-remove]').first().click();
    await p.locator('[data-quote-add]').click();
    await submit(p);
    const inv = await p.locator('#action-form :invalid').count();
    rec('E2', 'Item sem descrição não salva', (await p.evaluate(() => document.querySelector('#modal').open)) && inv > 0, `invalid=${inv}`);
    await ctx.close();
  }
  // 3. texto longo de item em 390
  {
    const { ctx, p, go } = await session(browser, 390, 844); await go('#os/23/orcamento');
    await setOne(p, 'Peça ' + 'X'.repeat(495), 100); await submit(p);
    const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    rec('E3', 'Item com 500 caracteres sem overflow em 390', over <= 1, `overflow=${over}`);
    await p.screenshot({ path: path.join(OUT, 'mobile', 'e3-item-longo-390.png'), animations: 'disabled' });
    await ctx.close();
  }
  // 4. cobrança antes da decisão
  {
    const { ctx, p, go } = await session(browser); await go('#os/23/orcamento');
    const ok = await open(p, 'billing');
    const due = await p.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 3); return d.toISOString().slice(0, 10); });
    await p.fill('#action-form input[name=due]', due); await p.check('#action-form input[name=confirm]'); await submit(p);
    const st = await p.evaluate(() => { const o = db.orders.find(x => x.id === 23); return { total: o.total, status: o.status, approval: o.approval }; });
    rec('E4', 'Cobrança explícita antes da decisão é permitida (não condicionada)', ok && st.total === 24000 && st.status === 'Orçamento', JSON.stringify(st));
    await ctx.close();
  }
  // 5. recusa e depois cobrança
  {
    const { ctx, p, go } = await session(browser); await go('#os/23/orcamento');
    await open(p, 'publicresponse'); await p.selectOption('#action-form select[name=answer]', 'Recusado'); await p.fill('#action-form input[name=name]', 'Cliente fictício'); await p.check('#action-form input[name=confirm]'); await submit(p);
    const billingBtn = await p.locator('[data-action="modal:billing:23"]').count();
    let total = null, status = null;
    if (billingBtn) {
      await open(p, 'billing'); const due = await p.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 3); return d.toISOString().slice(0, 10); }); await p.fill('#action-form input[name=due]', due); await p.check('#action-form input[name=confirm]'); await submit(p);
      const st = await p.evaluate(() => { const o = db.orders.find(x => x.id === 23); return { total: o.total, status: o.status }; }); total = st.total; status = st.status;
    }
    rec('E5', 'Cobrança após recusa é oferecida pelo protótipo', 'INFO', JSON.stringify({ billingBtn, total, status }));
    await ctx.close();
  }
  // 6. cobrança e depois publicar/retirar
  {
    const { ctx, p, go } = await session(browser); await go('#os/23/orcamento');
    await open(p, 'billing'); const due = await p.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 3); return d.toISOString().slice(0, 10); }); await p.fill('#action-form input[name=due]', due); await p.check('#action-form input[name=confirm]'); await submit(p);
    const pub = await p.locator('[data-action="modal:publish:23"]').count(), wd = await p.locator('[data-action="modal:withdraw:23"]').count();
    rec('E6', 'Após cobrança ainda há publicar/retirar', 'INFO', JSON.stringify({ publishBtn: pub, withdrawBtn: wd, total: await p.evaluate(() => db.orders.find(o => o.id === 23).total) }));
    await ctx.close();
  }
  // 7. após entrega, botão de retirada
  {
    const { ctx, p, go } = await session(browser); await go('#os/23/orcamento');
    await open(p, 'delivery'); await p.check('#action-form input[name=confirm]'); await submit(p); await go('#os/23/orcamento');
    rec('E7', 'Após entrega, retirada de publicação permanece disponível', 'INFO', `botão=${await p.locator('[data-action="modal:withdraw:23"]').count()}`);
    await ctx.close();
  }
  // 8. resposta pública obsoleta após mudança de itens
  {
    const { ctx, p, go } = await session(browser); await go('#os/23/orcamento');
    await setOne(p, 'Peça alterada', 300); await submit(p);
    const r = await p.evaluate(() => { const o = db.orders.find(x => x.id === 23); try { BancadaQuote.respond(o, 1, { answer: 'Aprovado', name: 'X', confirm: true }, new Date().toISOString(), false, new Date().toISOString().slice(0, 10)); return 'aceitou'; } catch (e) { return e.message; } });
    rec('E8', 'Resposta pública em versão desatualizada é rejeitada', /indisponível|atualizad|versão/i.test(r), r);
    await ctx.close();
  }
  // 9. editor em 320
  {
    const { ctx, p, go } = await session(browser, 320, 568); await go('#os/23/orcamento');
    const ok = await open(p, 'quote');
    const m = await p.evaluate(() => { const f = document.querySelector('#action-form').getBoundingClientRect(), sub = document.querySelector('#action-form button[type=submit]').getBoundingClientRect(); return { open: document.querySelector('#modal').open, left: Math.round(f.left), right: Math.round(f.right), submitBottom: Math.round(sub.bottom), vh: innerHeight, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth }; });
    rec('E9', 'Editor em 320 sem overflow e com salvar no viewport', ok && m.left >= 0 && m.right <= 320 && m.submitBottom <= 568 && m.overflow <= 1, JSON.stringify(m));
    const r0 = p.locator('.quote-edit-row').first();
    await r0.locator('input[name=itemName]').fill('Peça teste de 320');
    await r0.locator('input[name=itemQty]').fill('1');
    await r0.locator('input[name=itemUnit]').fill('100.00');
    await p.fill('input[name=discount]', '200.00');
    await submit(p);
    await p.screenshot({ path: path.join(OUT, 'mobile', 'e9-editor-320-erro-desconto.png'), animations: 'disabled' });
    await ctx.close();
  }
  // 10. teto exato e valor acima do limite
  {
    const { ctx, p, go } = await session(browser); await go('#os/23/orcamento');
    await setOne(p, 'Serviço extremo', 9999999.99); await submit(p);
    const st = await p.evaluate(() => { const o = db.orders.find(x => x.id === 23); return { total: o.quote.draft.items[0]?.unit, text: document.querySelector('#main').innerText, open: document.querySelector('#modal').open }; });
    rec('E10', 'Teto de R$ 9.999.999,99 é aceito e formatado', !st.open && st.total === 999999999 && /9\.999\.999,99/.test(st.text), JSON.stringify({ total: st.total, open: st.open }));
    await ctx.close();
  }
  {
    const { ctx, p, go } = await session(browser); await go('#os/23/orcamento');
    await setOne(p, 'Serviço acima do limite', 1000); await p.fill('input[name=itemQty]', '10000'); await submit(p);
    const st = await p.evaluate(() => ({ open: document.querySelector('#modal').open, error: document.querySelector('#modal-error')?.innerText, hidden: document.querySelector('#modal-error')?.hidden, total: db.orders.find(x => x.id === 23).total }));
    rec('E11', 'Total acima de R$ 9.999.999,99 é rejeitado no modal', st.open && !st.hidden && /limite/i.test(st.error || '') && st.total === 0, JSON.stringify(st));
    await ctx.close();
  }
  // 12. formalização sobre rascunho não publicado
  {
    const { ctx, p, go } = await session(browser); await go('#os/23/orcamento');
    await setOne(p, 'Peça revisada', 300); await submit(p);
    const ok = await open(p, 'billing');
    const due = await p.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 3); return d.toISOString().slice(0, 10); });
    await p.fill('#action-form input[name=due]', due); await p.check('#action-form input[name=confirm]'); await submit(p);
    const st = await p.evaluate(() => { const o = db.orders.find(x => x.id === 23); return { total: o.total, active: o.quote.active ? o.quote.versions.find(v => v.number === o.quote.current)?.total : null, label: BancadaQuote.label(o) }; });
    rec('E12', 'Formalização usa o rascunho atual, mesmo sem publicar', 'INFO', JSON.stringify({ offered: ok, ...st }));
    await ctx.close();
  }
  fs.writeFileSync(path.join(OUT, 'testes', 'edge-resultados.json'), JSON.stringify({ generatedAt: new Date().toISOString(), codeSha: process.env.CODE_SHA || '', incrementSha: process.env.INCREMENT_SHA || '', results }, null, 2));
  console.log(`TOTAL ${results.length} · PASS ${results.filter(r => r.status === 'PASS').length} · FAIL ${results.filter(r => r.status === 'FAIL').length} · INFO ${results.filter(r => r.status === 'INFO').length}`);
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
