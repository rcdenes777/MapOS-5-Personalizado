'use strict';
/*
 * R03 — validação de navegador do orçamento versionado.
 * Requer playwright-core e servidor em BASE_URL.
 */
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');

const CHROME = process.env.CHROME_PATH || '/home/dragonblue/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8130';
const OUT = path.resolve(__dirname, '..');
const results = [];

function rec(id, desc, ok, detail = '') {
  const status = ok === 'INFO' ? 'INFO' : ok ? 'PASS' : 'FAIL';
  results.push({ id, desc, status, detail });
  console.log(`${status} ${id} — ${desc}${detail ? ' :: ' + detail : ''}`);
}

async function session(browser, w = 1440, h = 900) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, locale: 'pt-BR' });
  const p = await ctx.newPage();
  const consoleErrors = [], pageErrors = [], requests = [];
  p.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  p.on('pageerror', e => pageErrors.push(e.message));
  p.on('request', r => requests.push(r.url()));
  await p.goto(BASE + '/?r03=' + Date.now(), { waitUntil: 'networkidle' });
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: 'networkidle' });
  await p.evaluate(() => save());
  const go = async hash => {
    await p.evaluate(x => { const d = document.querySelector('#modal'); if (d && d.open) d.close(); window.scrollTo(0, 0); if (location.hash === x) render(); else location.hash = x; }, hash);
    await p.waitForTimeout(180);
    await p.waitForSelector('#main h1', { state: 'attached' });
  };
  return { ctx, p, go, consoleErrors, pageErrors, requests };
}

const dbQuote = (p, id = 23) => p.evaluate(i => {
  const o = db.orders.find(x => x.id === i);
  return o.quote ? JSON.parse(JSON.stringify(o.quote)) : null;
}, id);

async function open(p, kind, id = 23) {
  const sel = `[data-action="modal:${kind}:${id}"]`;
  const n = await p.locator(sel).count();
  if (!n) return false;
  await p.locator(sel).first().click();
  await p.waitForTimeout(150);
  return await p.evaluate(() => document.querySelector('#modal').open);
}

async function submit(p) {
  await p.locator('#action-form button[type=submit]').click();
  await p.waitForTimeout(260);
}

async function setDraft(p, items, discount, terms = {}) {
  const ok = await open(p, 'quote');
  if (!ok) throw new Error('editor não abriu');
  while (await p.locator('.quote-edit-row').count()) await p.locator('.quote-edit-row [data-quote-remove]').first().click();
  for (let i = 0; i < items.length; i++) await p.locator('[data-quote-add]').click();
  const rows = p.locator('.quote-edit-row');
  for (let i = 0; i < items.length; i++) {
    const r = rows.nth(i);
    await r.locator('select[name=itemType]').selectOption(items[i].type);
    await r.locator('input[name=itemName]').fill(items[i].name);
    await r.locator('input[name=itemQty]').fill(String(items[i].qty));
    await r.locator('input[name=itemUnit]').fill(items[i].unit.toFixed(2));
  }
  await p.fill('input[name=discount]', discount.toFixed(2));
  if (Object.keys(terms).length) {
    const details = p.locator('#action-form details').filter({ hasText: 'Condições da proposta' });
    if (await details.count()) await details.locator('summary').click();
    for (const [k, v] of Object.entries(terms)) await p.fill(`input[name=${k}], textarea[name=${k}]`, v);
  }
  await submit(p);
}

async function publish(p) {
  const ok = await open(p, 'publish');
  if (!ok) throw new Error('publicar não abriu');
  await p.check('#action-form input[name=confirm]');
  await submit(p);
}

async function respond(p, kind, answer, { name = 'Cliente fictício', channel = 'whatsapp', date = null, note = '' } = {}) {
  const ok = await open(p, kind);
  if (!ok) throw new Error(kind + ' não abriu');
  await p.selectOption('#action-form select[name=answer]', answer);
  await p.fill('#action-form input[name=name]', name);
  if (kind === 'approval') {
    await p.selectOption('#action-form select[name=channel]', channel);
    if (date) await p.fill('#action-form input[name=date]', date);
  }
  if (note) await p.fill('#action-form textarea[name=note]', note);
  await p.check('#action-form input[name=confirm]');
  await submit(p);
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });

  /* Cenário 1 — rascunho v1 -> v2 sem reescrever a versão */
  {
    const { ctx, p, go } = await session(browser);
    await go('#os/23/orcamento');
    const q0 = await dbQuote(p);
    rec('Q1-01', 'OS #023 abre orçamento v1 de R$ 240,00', q0.versions.length === 1 && q0.versions[0].total === 24000 && /Versão 1/.test(await p.locator('#main').innerText()), JSON.stringify(q0.versions?.[0]));
    await setDraft(p, [
      { type: 'Peça', name: 'IGBT 650 V', qty: 1, unit: 50 },
      { type: 'Peça', name: 'Optoacoplador PC817', qty: 1, unit: 50 },
      { type: 'Serviço', name: 'Reparo em bancada', qty: 1, unit: 220 },
    ], 20, { payment: 'Pix', deadline: '5 dias', warranty: '90 dias', diagnosis: 'Fonte e IGBT.' });
    const q1 = await dbQuote(p);
    const t1 = await p.locator('#main').innerText();
    rec('Q1-02', 'Rascunho calcula R$ 300,00 com duas peças, serviço e desconto', q1.draft.items.length === 3 && (await p.evaluate(() => BancadaQuote.totals(db.orders.find(o => o.id === 23).quote.draft.items, 2000).total)) === 30000, JSON.stringify(q1.draft));
    rec('Q1-03', 'Versão 1 continua R$ 240,00 após editar o rascunho', q1.versions[0].total === 24000 && /Itens alterados/.test(t1), `v1=${q1.versions[0].total}`);
    rec('Q1-04', 'Rascunho não é publicado automaticamente', q1.current === 1 && q1.versions.length === 1 && q1.active === true, `current=${q1.current}, versions=${q1.versions.length}`);
    await ctx.close();
  }

  /* Cenário 2 — publicar v2, aprovar, cobrança separada, pagamento e entrega */
  {
    const { ctx, p, go, requests, consoleErrors, pageErrors } = await session(browser);
    await go('#os/23/orcamento');
    await setDraft(p, [
      { type: 'Peça', name: 'IGBT 650 V', qty: 1, unit: 50 },
      { type: 'Peça', name: 'Optoacoplador PC817', qty: 1, unit: 50 },
      { type: 'Serviço', name: 'Reparo em bancada', qty: 1, unit: 220 },
    ], 20);
    await publish(p);
    let q = await dbQuote(p);
    let o = await p.evaluate(() => { const x = db.orders.find(o => o.id === 23); return { status: x.status, total: x.total, paid: x.paid, approval: x.approval }; });
    rec('Q2-01', 'Publicar cria v2 com R$ 300,00 e status Negociação', q.versions.length === 2 && q.current === 2 && q.versions[1].total === 30000 && o.status === 'Negociação', JSON.stringify({ versions: q.versions.length, current: q.current, total: q.versions[1]?.total, status: o.status }));

    await respond(p, 'publicresponse', 'Aprovado', { name: 'Marina Alves (fictícia)' });
    q = await dbQuote(p);
    o = await p.evaluate(() => { const x = db.orders.find(o => o.id === 23); return { status: x.status, total: x.total, paid: x.paid, approval: x.approval }; });
    rec('Q2-02', 'Aprovação do link não cria cobrança', q.versions[1].decision?.answer === 'Aprovado' && o.status === 'Aprovado' && o.total === 0 && o.paid === 0, JSON.stringify(o));
    rec('Q2-03', 'Cobrança continua “Sem cobrança” após aprovar', /Sem cobrança/.test(await p.locator('#main').innerText()) && o.total === 0, `total=${o.total}`);

    const due = await p.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 5); return d.toISOString().slice(0, 10); });
    const okBill = await open(p, 'billing');
    rec('Q2-04', 'Formalizar cobrança é ação explícita', okBill, `modal=${okBill}`);
    await p.fill('#action-form input[name=due]', due);
    await p.check('#action-form input[name=confirm]');
    await submit(p);
    o = await p.evaluate(() => { const x = db.orders.find(o => o.id === 23); return { status: x.status, total: x.total, paid: x.paid, billing: x.billing }; });
    rec('Q2-05', 'Formalização cria R$ 300,00 em aberto e preserva o andamento', o.total === 30000 && o.paid === 0 && o.status === 'Aprovado' && o.billing?.due === due, JSON.stringify(o));

    await open(p, 'pay');
    await p.fill('#action-form input[name=amount]', '100.00');
    await p.selectOption('#action-form select[name=method]', 'Pix');
    await submit(p);
    o = await p.evaluate(() => { const x = db.orders.find(o => o.id === 23); return { status: x.status, total: x.total, paid: x.paid }; });
    rec('Q2-06', 'Pagamento parcial após cobrança', o.paid === 10000 && o.total === 30000, JSON.stringify(o));

    await open(p, 'tech');
    await p.selectOption('#action-form select[name=status]', 'Em Andamento');
    await p.check('#action-form input[name=confirm]');
    await submit(p);
    await open(p, 'tech');
    await p.selectOption('#action-form select[name=status]', 'Finalizado');
    await p.check('#action-form input[name=confirm]');
    await submit(p);
    o = await p.evaluate(() => { const x = db.orders.find(o => o.id === 23); return { status: x.status, total: x.total, paid: x.paid, delivery: !!x.delivery }; });
    rec('Q2-07', 'Andamento segue independente da cobrança', o.status === 'Finalizado' && o.total === 30000, JSON.stringify(o));

    await open(p, 'delivery');
    await p.check('#action-form input[name=confirm]');
    await submit(p);
    await open(p, 'pay');
    await p.fill('#action-form input[name=amount]', '200.00');
    await submit(p);
    o = await p.evaluate(() => { const x = db.orders.find(o => o.id === 23); return { status: x.status, total: x.total, paid: x.paid, delivery: !!x.delivery, billing: !!x.billing }; });
    rec('Q2-08', 'Entrega e quitação independentes da cobrança', o.delivery && o.paid === 30000 && o.status === 'Finalizado', JSON.stringify(o));
    rec('Q2-09', 'Sem requisições externas na operação', requests.every(u => u.startsWith(BASE) || u.startsWith('data:') || u === 'about:blank'), JSON.stringify(requests.filter(u => !u.startsWith(BASE)).slice(0, 3)));
    rec('Q2-10', 'Sem exceções JavaScript', pageErrors.length === 0, JSON.stringify(pageErrors));
    rec('Q2-11', 'Sem erros de console', consoleErrors.length === 0, JSON.stringify(consoleErrors));
    await p.reload({ waitUntil: 'networkidle' });
    const persisted = await p.evaluate(() => { const x = db.orders.find(o => o.id === 23); return { total: x.total, paid: x.paid, delivery: !!x.delivery, versions: x.quote?.versions.length, current: x.quote?.current }; });
    rec('Q2-12', 'Versões, cobrança e pagamento persistem após reload', persisted.total === 30000 && persisted.paid === 30000 && persisted.delivery && persisted.versions === 2, JSON.stringify(persisted));
    await ctx.close();
  }

  /* Cenário 3 — recusa, retirada, nova versão e resposta interna sobre rascunho */
  {
    const { ctx, p, go } = await session(browser);
    await go('#os/23/orcamento');
    await respond(p, 'publicresponse', 'Recusado', { name: 'Marina Alves (fictícia)' });
    let o = await p.evaluate(() => { const x = db.orders.find(o => o.id === 23); return { status: x.status, total: x.total, approval: x.approval, decision: x.quote?.versions[0]?.decision?.answer }; });
    rec('Q3-01', 'Recusa pública registra decisão e não cobra', o.status === 'Orçamento recusado' && o.total === 0 && o.decision === 'Recusado', JSON.stringify(o));

    const okW = await open(p, 'withdraw');
    await p.check('#action-form input[name=confirm]');
    await submit(p);
    let q = await dbQuote(p);
    rec('Q3-02', 'Retirar publicação preserva a versão e desativa o compartilhamento', okW && q.active === false && q.versions.length === 1 && /Publicação retirada/.test(await p.locator('#main').innerText()), JSON.stringify({ active: q.active, versions: q.versions.length }));

    await publish(p);
    q = await dbQuote(p);
    o = await p.evaluate(() => { const x = db.orders.find(o => o.id === 23); return { status: x.status }; });
    rec('Q3-03', 'Nova versão após retirada reabre o compartilhamento', q.versions.length === 2 && q.current === 2 && q.active === true && o.status === 'Negociação', JSON.stringify({ versions: q.versions.length, current: q.current, status: o.status }));

    await setDraft(p, [
      { type: 'Peça', name: 'IGBT 650 V', qty: 1, unit: 50 },
      { type: 'Peça', name: 'Optoacoplador PC817', qty: 1, unit: 50 },
      { type: 'Serviço', name: 'Reparo em bancada', qty: 1, unit: 250 },
    ], 20);
    q = await dbQuote(p);
    const txt = await p.locator('#main').innerText();
    rec('Q3-04', 'Mudança de itens sem publicação deixa a versão anterior indisponível', /Itens alterados/.test(txt) && !(await p.locator('[data-action="modal:publicresponse:23"]').count()), JSON.stringify({ label: txt.includes('Itens alterados') }));
    rec('Q3-05', 'Resposta interna continua disponível no rascunho alterado', (await p.locator('[data-action="modal:approval:23"]').count()) === 1, 'approval button');

    await respond(p, 'approval', 'Aprovado', { name: 'Marina Alves (fictícia)', channel: 'telefone' });
    q = await dbQuote(p);
    o = await p.evaluate(() => { const x = db.orders.find(o => o.id === 23); return { status: x.status, total: x.total }; });
    rec('Q3-06', 'Resposta interna cria novo retrato com os itens atuais', q.versions.length === 3 && q.versions[2].total === 33000 && q.versions[1].total === 24000 && q.versions[1].decision === null && q.versions[2].decision?.answer === 'Aprovado' && o.status === 'Aprovado' && o.total === 0, JSON.stringify({ versions: q.versions.length, v2: q.versions[1].total, v3: q.versions[2].total, v3decision: q.versions[2].decision?.answer, status: o.status, total: o.total }));
    await ctx.close();
  }

  /* Cenário 4 — após entrega: sem publicação/link; comunicação interna preserva andamento */
  {
    const { ctx, p, go } = await session(browser);
    await go('#os/23/orcamento');
    await open(p, 'delivery');
    await p.check('#action-form input[name=confirm]');
    await submit(p);
    await go('#os/23/orcamento');
    const txt = await p.locator('#main').innerText();
    rec('Q4-01', 'Após entrega não há publicar nem resposta pelo link', (await p.locator('[data-action="modal:publish:23"]').count()) === 0 && (await p.locator('[data-action="modal:publicresponse:23"]').count()) === 0, `publish=${await p.locator('[data-action="modal:publish:23"]').count()}, public=${await p.locator('[data-action="modal:publicresponse:23"]').count()}`);
    rec('Q4-02', 'Após entrega o registro interno continua oferecido', (await p.locator('[data-action="modal:approval:23"]').count()) === 1, 'approval button');
    const withdrawAfterDelivery = await p.locator('[data-action="modal:withdraw:23"]').count();
    rec('Q4-03', 'Retirada de publicação após entrega', 'INFO', `botão presente=${withdrawAfterDelivery}`);
    const before = await p.evaluate(() => { const x = db.orders.find(o => o.id === 23); return { status: x.status, total: x.total }; });
    await respond(p, 'approval', 'Aprovado', { name: 'Marina Alves (fictícia)', channel: 'telefone' });
    const after = await p.evaluate(() => { const x = db.orders.find(o => o.id === 23); return { status: x.status, total: x.total, decision: x.quote?.versions[0]?.decision, afterDelivery: x.quote?.versions[0]?.decision?.afterDelivery }; });
    rec('Q4-04', 'Comunicação interna após entrega preserva andamento e não cobra', after.status === before.status && after.total === 0 && after.decision?.answer === 'Aprovado' && after.afterDelivery === true, JSON.stringify(after));
    await ctx.close();
  }

  /* Cenário 4b — datas após a entrega e guards de domínio */
  {
    const { ctx, p, go } = await session(browser);
    await go('#os/23/orcamento');
    await open(p, 'delivery');
    await p.check('#action-form input[name=confirm]');
    await submit(p);
    await go('#os/23/orcamento');
    const statusBefore = await p.evaluate(() => db.orders.find(o => o.id === 23).status);
    const future = await p.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); });
    await open(p, 'approval');
    await p.fill('#action-form input[name=date]', future);
    await p.check('#action-form input[name=confirm]');
    await submit(p);
    const afterFuture = await p.evaluate(() => { const o = db.orders.find(x => x.id === 23); return { open: document.querySelector('#modal').open, decision: o.quote.versions[0].decision, status: o.status }; });
    rec('Q4-05', 'Data futura de comunicação é recusada', afterFuture.open && afterFuture.decision === null && afterFuture.status === statusBefore, JSON.stringify(afterFuture));

    const earlier = await p.evaluate(() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); });
    await p.fill('#action-form input[name=date]', earlier);
    await p.check('#action-form input[name=confirm]');
    await submit(p);
    const afterEarlier = await p.evaluate(() => { const o = db.orders.find(x => x.id === 23); const v = o.quote.versions[0]; return { open: document.querySelector('#modal').open, status: o.status, total: o.total, answer: v.decision?.answer, date: v.decision?.date, afterDelivery: v.decision?.afterDelivery }; });
    rec('Q4-06', 'Comunicação anterior à entrega é aceita e preserva andamento', !afterEarlier.open && afterEarlier.status === statusBefore && afterEarlier.total === 0 && afterEarlier.answer === 'Aprovado' && afterEarlier.date === earlier && afterEarlier.afterDelivery === true, JSON.stringify(afterEarlier));

    const guard = await p.evaluate(() => {
      const o = db.orders.find(x => x.id === 23); const now = new Date().toISOString();
      const run = f => { try { f(); return 'aceitou'; } catch (e) { return e.message; } };
      return {
        publish: run(() => BancadaQuote.publish(o, now)),
        publicResponse: run(() => BancadaQuote.respond(o, 1, { answer: 'Aprovado', name: 'X', confirm: true }, now, false, now.slice(0, 10))),
      };
    });
    rec('Q4-07', 'Guards de domínio bloqueiam publicação e resposta pública após entrega', /indisponível/i.test(guard.publish) && /entregue/i.test(guard.publicResponse), JSON.stringify(guard));
    await ctx.close();
  }

  /* Cenário 5 — perfis, modal e responsividade básica */
  {
    const { ctx, p, go } = await session(browser, 390, 844);
    await go('#os/23/orcamento');
    const scroll = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    rec('Q5-01', 'Orçamento mobile sem overflow horizontal', scroll <= 1, `overflow=${scroll}`);
    const okEditor = await open(p, 'quote');
    const modalMetrics = await p.evaluate(() => {
      const f = document.querySelector('#action-form').getBoundingClientRect(), nav = document.querySelector('#mobile-nav').getBoundingClientRect(), sub = document.querySelector('#action-form button[type=submit]').getBoundingClientRect();
      return { left: Math.round(f.left), right: Math.round(f.right), submitBottom: Math.round(sub.bottom), navTop: Math.round(nav.top), scrollW: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    rec('Q5-02', 'Editor mobile abre sem overflow e com salvar acessível', okEditor && modalMetrics.left >= 0 && modalMetrics.right <= 390 && modalMetrics.submitBottom <= 844 && modalMetrics.scrollW <= 1, JSON.stringify(modalMetrics));
    await p.keyboard.press('Escape');
    await ctx.close();
  }

  {
    const { ctx, p, go } = await session(browser, 1440, 900);
    await go('#os/23/orcamento');
    await p.selectOption('#role', 'Técnico');
    await p.waitForTimeout(200);
    const tech = await p.locator('#main').innerText();
    const techQuoteBtn = await p.locator('[data-action="modal:quote:23"]').count();
    await p.evaluate(() => openModal('quote', 23));
    const techModal = await p.evaluate(() => document.querySelector('#modal').open);
    rec('Q5-03', 'Técnico vê orçamento restrito e não abre editor', /Valores e versões restritos/.test(tech) && techQuoteBtn === 0 && !techModal, JSON.stringify({ restricted: /Valores e versões restritos/.test(tech), btn: techQuoteBtn, modal: techModal }));
    await go('#os/23/orcamento');
    await p.selectOption('#role', 'Atendente');
    await p.waitForTimeout(200);
    const at = await p.locator('#main').innerText();
    rec('Q5-04', 'Atendente vê orçamento restrito', /Valores e versões restritos/.test(at), 'restricted');
    await p.selectOption('#role', 'Financeiro');
    await p.waitForTimeout(200);
    const fin = await p.locator('#main').innerText();
    rec('Q5-05', 'Financeiro vê itens e não vê ação técnica', /Peças e serviços/.test(fin) && (await p.locator('[data-action="modal:tech:23"]').count()) === 0, `quote=${/Peças e serviços/.test(fin)}`);
    await ctx.close();
  }

  fs.writeFileSync(path.join(OUT, 'testes', 'quote-browser-resultados.json'), JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));
  const pass = results.filter(r => r.status === 'PASS').length, fail = results.filter(r => r.status === 'FAIL').length;
  console.log(`\nTOTAL ${results.length} · PASS ${pass} · FAIL ${fail}`);
  await browser.close();
})().catch(err => { console.error('FATAL', err); process.exit(1); });
