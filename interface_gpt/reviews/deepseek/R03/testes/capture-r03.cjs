'use strict';
/*
 * R03 — capturas e medições responsivas do orçamento versionado.
 * Grava em R03/desktop, R03/mobile, R03/tablet e testes/responsivo.json.
 */
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');

const CHROME = process.env.CHROME_PATH || '/home/dragonblue/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8130';
const OUT = path.resolve(__dirname, '..');
const results = [], shots = [];
const rec = (id, desc, ok, detail = '') => { const s = ok === 'INFO' ? 'INFO' : ok ? 'PASS' : 'FAIL'; results.push({ id, desc, status: s, detail }); console.log(`${s} ${id} — ${desc} :: ${detail}`); };

async function session(browser, w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, locale: 'pt-BR', reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(BASE + '/?cap-r03=' + Date.now(), { waitUntil: 'networkidle' });
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: 'networkidle' });
  await p.evaluate(() => save());
  const go = async x => { await p.evaluate(hh => { const d = document.querySelector('#modal'); if (d && d.open) d.close(); window.scrollTo(0, 0); if (location.hash === hh) render(); else location.hash = hh; }, x); await p.waitForTimeout(200); };
  return { ctx, p, go, errors };
}
async function open(p, kind, id = 23) { const sel = `[data-action="modal:${kind}:${id}"]`; if (!(await p.locator(sel).count())) return false; await p.locator(sel).first().click(); await p.waitForTimeout(180); return p.evaluate(() => document.querySelector('#modal').open); }
async function submit(p) { await p.locator('#action-form button[type=submit]').click(); await p.waitForTimeout(300); }
async function shot(p, dir, name, scrollToText = null) {
  await p.evaluate(() => { const t = document.querySelector('#toast'); if (t) t.hidden = true; });
  if (scrollToText) {
    await p.evaluate(txt => {
      const h = [...document.querySelectorAll('h2')].find(e => e.textContent.includes(txt));
      if (h) { h.scrollIntoView({ block: 'start' }); window.scrollBy(0, -68); }
    }, scrollToText);
    await p.waitForTimeout(160);
  }
  const vp = p.viewportSize(); const rel = `${dir}/${name}-${vp.width}x${vp.height}.png`; const abs = path.join(OUT, rel); fs.mkdirSync(path.dirname(abs), { recursive: true });
  await p.screenshot({ path: abs, animations: 'disabled' }); shots.push(rel); console.log('shot', rel);
}
async function setDraft(p, items, discount, terms = {}, onFilled = null) {
  await open(p, 'quote');
  while (await p.locator('.quote-edit-row').count()) await p.locator('.quote-edit-row [data-quote-remove]').first().click();
  for (let i = 0; i < items.length; i++) await p.locator('[data-quote-add]').click();
  const rows = p.locator('.quote-edit-row');
  for (let i = 0; i < items.length; i++) { const r = rows.nth(i); await r.locator('select[name=itemType]').selectOption(items[i].type); await r.locator('input[name=itemName]').fill(items[i].name); await r.locator('input[name=itemQty]').fill(String(items[i].qty)); await r.locator('input[name=itemUnit]').fill(items[i].unit.toFixed(2)); }
  await p.fill('input[name=discount]', discount.toFixed(2));
  if (Object.keys(terms).length) { const d = p.locator('#action-form details').filter({ hasText: 'Condições da proposta' }); if (await d.count()) await d.locator('summary').click(); for (const [k, v] of Object.entries(terms)) await p.fill(`input[name=${k}], textarea[name=${k}]`, v); }
  if (onFilled) await onFilled();
  await submit(p);
}
async function measureQuote(p) {
  return p.evaluate(() => {
    const q = document.querySelector('.quote-layout'), m = document.querySelector('#main');
    const cols = q ? getComputedStyle(q).gridTemplateColumns.split(/\s+/).filter(Boolean).length : 0;
    return { overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, cols, mainWidth: Math.round(m.getBoundingClientRect().width), quoteWidth: q ? Math.round(q.getBoundingClientRect().width) : 0 };
  });
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const views = [
    { dir: 'mobile', w: 320, h: 568, prefix: 'narrow', sectionShot: true },
    { dir: 'mobile', w: 390, h: 844, prefix: 'mobile', sectionShot: true },
    { dir: 'tablet', w: 768, h: 1024, prefix: 'tablet', sectionShot: true },
    { dir: 'desktop', w: 1440, h: 900, prefix: 'desktop', sectionShot: false },
  ];
  for (const v of views.filter(x => !process.env.ONLY_VIEW || x.prefix === process.env.ONLY_VIEW)) {
    const { ctx, p, go, errors } = await session(browser, v.w, v.h);
    await go('#os/23/orcamento');
    const initial = await measureQuote(p);
    rec('R03-RESP-INITIAL-' + v.prefix, `Orçamento em ${v.w}px sem overflow e em ${initial.cols} coluna(s)`, initial.overflow <= 1 && (v.w >= 1151 ? initial.cols === 2 : initial.cols === 1), JSON.stringify(initial));
    await shot(p, v.dir, `01-orcamento-v1-${v.prefix}`, v.sectionShot ? 'Peças e serviços' : null);

    await open(p, 'quote');
    const editor = await p.evaluate(() => {
      const d = document.querySelector('#modal'), form = document.querySelector('#action-form'), grid = document.querySelector('#action-form .form-grid'), close = document.querySelector('.modal-head button'), footer = document.querySelector('#action-form .form-footer'), sub = footer?.querySelector('button');
      const r = el => el ? el.getBoundingClientRect() : null; const dr = r(d), fr = r(form), gr = r(grid), cr = r(close), sr = r(sub);
      return {
        open: d.open, width: Math.round(dr.width), left: Math.round(dr.left), right: Math.round(dr.right), overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        formCols: grid ? getComputedStyle(grid).gridTemplateColumns.split(/\s+/).filter(Boolean).length : 0,
        closeH: Math.round(cr.height), closeText: close.textContent.trim(), closeOneLine: close.scrollHeight <= close.clientHeight + 1,
        footerPosition: footer ? getComputedStyle(footer).position : '', submitBottom: sr ? Math.round(sr.bottom) : 0,
      };
    });
    rec('R03-RESP-EDITOR-' + v.prefix, `Editor em ${v.w}px sem overflow, ${v.w <= 390 ? 'uma coluna' : 'duas colunas'} e salvar acessível`, editor.open && editor.overflow <= 1 && (v.w <= 390 ? editor.formCols === 1 : editor.formCols === 2) && editor.closeOneLine && editor.submitBottom <= v.h + 1, JSON.stringify(editor));
    if (v.w === 320) await shot(p, v.dir, '02-editor-320-antes-de-preencher');
    await p.keyboard.press('Escape');
    await p.waitForTimeout(120);

    await setDraft(p, [
      { type: 'Peça', name: 'IGBT 650 V', qty: 1, unit: 50 },
      { type: 'Peça', name: 'Optoacoplador PC817', qty: 1, unit: 50 },
      { type: 'Serviço', name: 'Reparo em bancada', qty: 1, unit: 220 },
    ], 20, { payment: 'Pix', deadline: '5 dias', warranty: '90 dias', diagnosis: 'Fonte e IGBT.' }, async () => {
      await p.evaluate(() => { const d = document.querySelector('#modal'); if (d) d.scrollTop = 0; });
      await p.waitForTimeout(120);
      await shot(p, v.dir, `02b-editor-preenchido-${v.prefix}`, null);
    });
    await p.waitForTimeout(200);
    await shot(p, v.dir, `03-rascunho-itens-alterados-${v.prefix}`, 'Peças e serviços');
    const draft = await p.evaluate(() => { const o = db.orders.find(x => x.id === 23); const t = BancadaQuote.totals(o.quote.draft.items, o.quote.draft.discount); return { total: t.total, versions: o.quote.versions.length, label: BancadaQuote.label(o), approval: o.approval }; });
    rec('R03-DRAFT-' + v.prefix, 'Rascunho de R$ 300,00 mantém v1 e não publica', draft.total === 30000 && draft.versions === 1 && draft.label === 'Itens alterados', JSON.stringify(draft));

    await open(p, 'publish'); await shot(p, v.dir, `04-publicar-v2-${v.prefix}`); await p.check('#action-form input[name=confirm]'); await submit(p);
    await p.evaluate(() => document.querySelectorAll('details.quote-version').forEach(d => d.open = true)); await p.waitForTimeout(150);
    await shot(p, v.dir, `05-v2-historico-${v.prefix}`, 'Versões e decisões');
    await p.evaluate(() => { const ds = [...document.querySelectorAll('details.quote-version')]; if (ds[1]) ds[1].scrollIntoView({ block: 'start' }); });
    await p.waitForTimeout(150);
    await shot(p, v.dir, `05b-versao-1-${v.prefix}`);

    await open(p, 'publicresponse'); await shot(p, v.dir, `06-aprovacao-link-${v.prefix}`); await p.selectOption('#action-form select[name=answer]', 'Aprovado'); await p.fill('#action-form input[name=name]', 'Marina Alves (fictícia)'); await p.check('#action-form input[name=confirm]'); await submit(p);
    await shot(p, v.dir, `07-aprovado-sem-cobranca-${v.prefix}`, 'Cobrança');
    const approved = await p.evaluate(() => { const o = db.orders.find(x => x.id === 23); return { total: o.total, paid: o.paid, status: o.status, decision: o.quote.versions[1].decision?.answer }; });
    rec('R03-APPROVED-' + v.prefix, 'Aprovação não cobra: total zero e decisão na v2', approved.total === 0 && approved.paid === 0 && approved.status === 'Aprovado' && approved.decision === 'Aprovado', JSON.stringify(approved));

    await open(p, 'billing'); await shot(p, v.dir, `08-formalizar-cobranca-${v.prefix}`);
    const due = await p.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 5); return d.toISOString().slice(0, 10); });
    await p.fill('#action-form input[name=due]', due); await p.check('#action-form input[name=confirm]'); await submit(p);
    await shot(p, v.dir, `09-cobranca-formalizada-${v.prefix}`, 'Cobrança');
    const billed = await p.evaluate(() => { const o = db.orders.find(x => x.id === 23); return { total: o.total, paid: o.paid, status: o.status, due: o.billing?.due, edit: !!document.querySelector('[data-action="modal:quote:23"]') }; });
    rec('R03-BILLED-' + v.prefix, 'Cobrança formalizada de R$ 300,00 e edição bloqueada', billed.total === 30000 && billed.paid === 0 && billed.due === due && !billed.edit, JSON.stringify(billed));
    rec('R03-ERRORS-' + v.prefix, 'Sem exceções de página no fluxo', errors.length === 0, JSON.stringify(errors.slice(0, 3)));
    await ctx.close();
  }

  // 1024: caso intermediário (layout de uma coluna entre 880 e 1150)
  {
    const { ctx, p, go } = await session(browser, 1024, 900); await go('#os/23/orcamento');
    const m = await measureQuote(p);
    rec('R03-RESP-INITIAL-1024', 'Orçamento em 1024px usa uma coluna e não transborda', m.overflow <= 1 && m.cols === 1, JSON.stringify(m));
    await shot(p, 'desktop', '10-orcamento-1024', 'Peças e serviços');
    await ctx.close();
  }

  // recusa + retirada (desktop e mobile)
  for (const v of [{ dir: 'desktop', w: 1440, h: 900, prefix: 'desktop' }, { dir: 'mobile', w: 390, h: 844, prefix: 'mobile' }]) {
    const { ctx, p, go } = await session(browser, v.w, v.h); await go('#os/23/orcamento');
    await open(p, 'publicresponse'); await p.selectOption('#action-form select[name=answer]', 'Recusado'); await p.fill('#action-form input[name=name]', 'Marina Alves (fictícia)'); await p.check('#action-form input[name=confirm]'); await submit(p);
    await p.evaluate(() => document.querySelectorAll('details.quote-version').forEach(d => d.open = true)); await p.waitForTimeout(120);
    await shot(p, v.dir, `11-recusa-${v.prefix}`, 'Versões e decisões');
    const recus = await p.evaluate(() => { const o = db.orders.find(x => x.id === 23); return { status: o.status, total: o.total, decision: o.quote.versions[0].decision?.answer }; });
    rec('R03-REFUSED-' + v.prefix, 'Recusa registra decisão e mantém total zero', recus.status === 'Orçamento recusado' && recus.total === 0 && recus.decision === 'Recusado', JSON.stringify(recus));
    await open(p, 'withdraw'); await p.check('#action-form input[name=confirm]'); await submit(p);
    await shot(p, v.dir, `12-publicacao-retirada-${v.prefix}`, 'Compartilhamento');
    const wd = await p.evaluate(() => { const o = db.orders.find(x => x.id === 23); return { active: o.quote.active, label: BancadaQuote.label(o), publish: !!document.querySelector('[data-action="modal:publish:23"]') }; });
    rec('R03-WITHDRAWN-' + v.prefix, 'Retirada bloqueia link e oferece nova publicação', wd.active === false && wd.label === 'Publicação retirada' && wd.publish, JSON.stringify(wd));
    await ctx.close();
  }

  // Perfis simulados
  {
    const { ctx, p, go } = await session(browser, 1440, 900); await go('#os/23/orcamento');
    for (const role of ['Técnico', 'Atendente', 'Financeiro']) {
      await p.selectOption('#role', role); await p.waitForTimeout(180);
      await shot(p, 'desktop', `13-perfil-${role.toLowerCase().replace('é', 'e')}`, null);
      const t = await p.locator('#main').innerText();
      rec('R03-PROFILE-' + role, `Perfil ${role} renderiza orçamento coerente`, role === 'Financeiro' ? /Peças e serviços/.test(t) : /Valores e versões restritos/.test(t), t.replace(/\n/g, ' | ').slice(0, 180));
    }
    await ctx.close();
  }

  fs.writeFileSync(path.join(OUT, 'testes', 'responsivo.json'), JSON.stringify({ generatedAt: new Date().toISOString(), results, shots }, null, 2));
  const md = ['# Responsividade e capturas — R03', '', `Gerado em ${new Date().toISOString()}`, '', '| Status | ID | Verificação | Detalhe |', '| --- | --- | --- | --- |', ...results.map(r => `| ${r.status} | ${r.id} | ${r.desc.replace(/\|/g, '\\|')} | ${String(r.detail).replace(/\|/g, '\\|').replace(/\n/g, ' ')} |`), '', `Capturas: ${shots.length}`, ...shots.map(s => `- ${s}`)].join('\n');
  fs.writeFileSync(path.join(OUT, 'testes', 'responsivo.md'), md);
  console.log(`RESP TOTAL ${results.length} · PASS ${results.filter(r => r.status === 'PASS').length} · FAIL ${results.filter(r => r.status === 'FAIL').length} · INFO ${results.filter(r => r.status === 'INFO').length} · SHOTS ${shots.length}`);
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
