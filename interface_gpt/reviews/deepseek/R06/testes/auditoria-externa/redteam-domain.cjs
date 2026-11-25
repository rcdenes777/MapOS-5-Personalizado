'use strict';
/*
 * R06 independent red-team — functional/browser sample.
 * Written from scratch for this review; does not import R06 evidence helpers.
 * Read-only on the repo; writes only to this scratch directory.
 */
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const CHROME = '/home/dragonblue/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const BASE = 'http://127.0.0.1:8130';
const OUT = __dirname;
const results = [];
function rec(id, desc, ok, detail = '') {
  const status = ok === 'INFO' ? 'INFO' : ok ? 'PASS' : 'FAIL';
  results.push({ id, desc, status, detail: String(detail).replace(/\s+/g, ' ').slice(0, 900) });
  console.log(`${status} ${id} — ${desc}${detail ? ' :: ' + String(detail).replace(/\s+/g, ' ').slice(0, 220) : ''}`);
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function session(browser, w = 1440, h = 900, tag = 'rt') {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: 'pt-BR' });
  const a = await ctx.newPage();
  const errors = [], consoleErrors = [], requests = [];
  a.on('pageerror', e => errors.push(e.message));
  a.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  a.on('request', r => requests.push(r.url()));
  await a.goto(`${BASE}/?${tag}=${Date.now()}`, { waitUntil: 'networkidle' });
  await a.evaluate(() => localStorage.clear());
  await a.reload({ waitUntil: 'networkidle' });
  return { ctx, a, errors, consoleErrors, requests };
}
async function go(a, hash) {
  await a.evaluate(h => {
    const m = document.querySelector('#modal');
    if (m && m.open) m.close();
    location.hash = h;
  }, hash);
  await a.waitForTimeout(260);
}
async function openAction(a, action) {
  const loc = a.locator(`[data-action="${action}"]`);
  if (!(await loc.count())) return false;
  await loc.last().click();
  await a.waitForTimeout(180);
  return a.evaluate(() => document.querySelector('#modal').open);
}
async function submit(a) {
  await a.locator('#action-form button[type=submit]').click();
  await a.waitForTimeout(420);
  return a.evaluate(() => {
    const m = document.querySelector('#modal'), e = document.querySelector('#modal-error'), t = document.querySelector('#toast');
    return { open: m.open, error: e && !e.hidden ? e.textContent : '', toast: t && !t.hidden ? t.textContent : '' };
  });
}
async function snap(a, id) {
  return a.evaluate(i => {
    const o = db.orders.find(x => x.id === i);
    if (!o) return null;
    return JSON.parse(JSON.stringify({
      id: o.id, status: o.status, total: o.total, paid: o.paid, proposal: o.proposal, billing: o.billing || null,
      delivery: o.delivery || null, approval: o.approval, origin: o.origin || null, conclusion: o.conclusion || null,
      quote: o.quote ? { current: o.quote.current, active: o.quote.active, draft: o.quote.draft, versions: o.quote.versions.map(v => ({ number: v.number, total: v.total, items: v.items, discount: v.discount })) } : null,
      cancellation: o.cancellation || null, ledger: o.financeLedger || null, history: o.history
    }));
  }, id);
}
const stock = a => a.evaluate(() => db.stock.map(p => ({ name: p.name, quantity: p.quantity })));
const actionCount = (a, x) => a.locator(`[data-action="${x}"]`).count();
const queueCount = (a, n) => a.evaluate(n => db.orders.filter(queues.find(q => q[0] === n)[2]).length, n);
async function mainText(a) { return (await a.locator('#main').innerText()).replace(/\u00a0/g, ' '); }
async function role(a, name) { await a.selectOption('#role', name); await a.waitForTimeout(240); }

async function createOrder(a, { client = '1', brand = 'RT', model = 'R06', defect = 'Defeito fictício RT R06.' } = {}) {
  await go(a, '#nova');
  await a.selectOption('#new-form select[name=client]', String(client));
  await a.fill('#new-form input[name=brand]', brand);
  await a.fill('#new-form input[name=model]', model);
  await a.fill('#new-form textarea[name=defect]', defect);
  await a.locator('#new-form button[type=submit]').click();
  await a.waitForTimeout(480);
  return a.evaluate(() => { const o = db.orders.at(-1); return { id: o.id, hash: location.hash, status: o.status }; });
}
async function setQuote(a, id, items, discountCents = 0) {
  await go(a, `#os/${id}/orcamento`);
  if (!(await openAction(a, `modal:quote:${id}`))) throw new Error('quote modal did not open');
  while (await a.locator('.quote-edit-row').count()) {
    await a.locator('.quote-edit-row [data-quote-remove]').first().click();
    await a.waitForTimeout(35);
  }
  for (const it of items) {
    await a.locator('[data-quote-add]').click();
    await a.waitForTimeout(35);
    const row = a.locator('.quote-edit-row').last();
    await row.locator('select[name=itemType]').selectOption(it.type);
    await row.locator('input[name=itemName]').fill(it.name);
    await row.locator('input[name=itemQty]').fill(String(it.quantity));
    await row.locator('input[name=itemUnit]').fill((it.unit / 100).toFixed(2));
  }
  await a.fill('#action-form input[name=discount]', (discountCents / 100).toFixed(2));
  return submit(a);
}
async function publish(a, id) {
  await go(a, `#os/${id}/orcamento`);
  if (!(await openAction(a, `modal:publish:${id}`))) return { open: false, error: 'publish absent' };
  await a.check('#action-form input[name=confirm]');
  return submit(a);
}
async function formalize(a, id) {
  await go(a, `#os/${id}/orcamento`);
  if (!(await openAction(a, `modal:billing:${id}`))) return { open: false, error: 'billing absent' };
  await a.fill('#action-form input[name=due]', await a.evaluate(() => today()));
  await a.check('#action-form input[name=confirm]');
  return submit(a);
}
async function requestCancel(a, id, origin = 'cliente', reason = 'Pedido fictício RT R06.') {
  await go(a, `#os/${id}/cancelamento`);
  if (!(await openAction(a, `modal:cancelrequest:${id}`))) return false;
  await a.selectOption('#action-form select[name=origin]', origin);
  await a.fill('#action-form textarea[name=reason]', reason);
  return submit(a);
}
async function withdrawCancel(a, id, reason = 'Retirada fictícia RT R06.') {
  await go(a, `#os/${id}/cancelamento`);
  if (!(await openAction(a, `modal:cancelwithdraw:${id}`))) return false;
  await a.fill('#action-form textarea[name=reason]', reason);
  await a.check('#action-form input[name=confirm]');
  return submit(a);
}
async function conferPiece(a, id, index, { disposition = 'unused', quantity = 1, reason = '' } = {}) {
  await go(a, `#os/${id}/cancelamento`);
  if (!(await openAction(a, `modal:cancelitem:${id}:${index}`))) return false;
  if (await a.locator('#action-form select[name=disposition]').count()) {
    await a.selectOption('#action-form select[name=disposition]', disposition);
    await a.fill('#action-form input[name=quantity]', String(quantity));
  }
  if (reason) await a.fill('#action-form textarea[name=reason]', reason);
  await a.check('#action-form input[name=confirm]');
  return submit(a);
}
async function conferTechnical(a, id, notes = 'Conferência técnica fictícia RT R06.') {
  await go(a, `#os/${id}/cancelamento`);
  if (!(await openAction(a, `modal:canceltechnical:${id}`))) return false;
  await a.check('#action-form input[name=confirm]');
  if (notes) await a.fill('#action-form textarea[name=reason]', notes);
  return submit(a);
}
async function confirmAcerto(a, id, { gross = 0, discount = 0, reason = 'Acerto fictício RT R06.', refund = null, date = null, method = 'Pix', ref = null } = {}) {
  await go(a, `#os/${id}/cancelamento`);
  if (!(await openAction(a, `modal:cancelconfirm:${id}`))) return false;
  await a.fill('#action-form input[name=gross]', (gross / 100).toFixed(2));
  await a.fill('#action-form input[name=discount]', (discount / 100).toFixed(2));
  await a.waitForTimeout(180);
  if (refund !== null) {
    await a.fill('#action-form input[name=refund]', (refund / 100).toFixed(2));
    await a.fill('#action-form input[name=date]', date || await a.evaluate(() => today()));
    await a.selectOption('#action-form select[name=method]', method);
    await a.fill('#action-form input[name=ref]', ref === null ? 'Comprovante fictício RT R06' : ref);
  }
  if (reason) await a.fill('#action-form textarea[name=reason]', reason);
  await a.check('#action-form input[name=settlementConfirmed]');
  await a.check('#action-form input[name=financialConfirmed]');
  await a.check('#action-form input[name=confirm]');
  return submit(a);
}
async function pay(a, id, amountCents, { date = null, method = 'Pix' } = {}) {
  await go(a, `#os/${id}/financeiro`);
  if (!(await openAction(a, `modal:pay:${id}`))) return false;
  await a.fill('#action-form input[name=amount]', (amountCents / 100).toFixed(2));
  if (date) await a.fill('#action-form input[name=date]', date);
  await a.selectOption('#action-form select[name=method]', method);
  return submit(a);
}
async function reverse(a, id, eventId, reason = 'Lançamento incorreto fictício RT R06.') {
  await go(a, `#os/${id}/financeiro`);
  if (!(await openAction(a, `modal:reverse:${id}:${eventId}`))) return false;
  await a.fill('#action-form textarea[name=reason]', reason);
  await a.check('#action-form input[name=confirm]');
  return submit(a);
}
async function rectify(a, id, eventId, { type = 'lancamento_incorreto', date = null, reason = 'Retificação fictícia RT R06.' } = {}) {
  await go(a, `#os/${id}/financeiro`);
  if (!(await openAction(a, `modal:rectify:${id}:${eventId}`))) return false;
  await a.selectOption('#action-form select[name=rectification]', type);
  if (date) await a.fill('#action-form input[name=date]', date);
  await a.fill('#action-form textarea[name=reason]', reason);
  await a.check('#action-form input[name=confirm]');
  return submit(a);
}
async function deliver(a, id, { receiver = null, items = 'Equipamento e itens fictícios RT R06' } = {}) {
  await go(a, `#os/${id}/cancelamento`);
  if (!(await openAction(a, `modal:delivery:${id}`))) {
    await go(a, `#os/${id}`);
    if (!(await openAction(a, `modal:delivery:${id}`))) return false;
  }
  if (receiver) await a.fill('#action-form input[name=receiver]', receiver);
  await a.fill('#action-form textarea[name=items]', items);
  await a.check('#action-form input[name=confirm]');
  return submit(a);
}
const direct = (a, src, ...args) => a.evaluate(({ src, args }) => {
  try { const f = eval(src); return { ok: true, value: f(...args) }; }
  catch (e) { return { ok: false, error: e.message }; }
}, { src, args });

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  try {
    /* ================= P1 — request, queue, withdraw, blockers, profiles ================= */
    {
      const { ctx, a, errors, consoleErrors, requests } = await session(browser, 1440, 900, 'rt1');
      try {
        await go(a, '#os/23/cancelamento');
        let o = await snap(a, 23), text = await mainText(a);
        rec('RT-P1-01', 'OS #023 inicia sem pedido e sem cobrança', !o.cancellation?.events?.length && o.status === 'Orçamento' && o.total === 0 && o.paid === 0 && !o.delivery && (await actionCount(a, 'modal:cancelrequest:23')) === 1, JSON.stringify({ status: o.status, total: o.total, paid: o.paid, events: o.cancellation?.events?.length || 0 }));
        rec('RT-P1-02', 'Motivo vazio e origem vazia são rejeitados no modelo', /motivo|observa/i.test((await direct(a, "BancadaCancel.request(db.orders.find(x=>x.id===23),'cliente','',new Date().toISOString(),db.orders)")).error) && /quem solicitou/i.test((await direct(a, "BancadaCancel.request(db.orders.find(x=>x.id===23),'telefone','x',new Date().toISOString(),db.orders)")).error), 'direct model');

        const st1 = await requestCancel(a, 23, 'cliente', 'Cliente pediu o cancelamento — RT R06.');
        o = await snap(a, 23);
        rec('RT-P1-03', 'Pedido preserva status, total, pago e entrega', !st1.open && o.cancellation?.events?.length === 1 && o.cancellation.events[0].type === 'request' && o.cancellation.events[0].origin === 'cliente' && o.status === 'Orçamento' && o.total === 0 && o.paid === 0 && !o.delivery, JSON.stringify({ st: st1, status: o.status, total: o.total, paid: o.paid, events: o.cancellation?.events?.map(e => e.type) }));
        rec('RT-P1-04', 'Pedido entra na fila e no cartão da OS', (await queueCount(a, 'cancelamentos')) === 1 && (await a.evaluate(() => orderCard(db.orders.find(x => x.id === 23)))).includes('Cancelamento pendente'), 'queue/card');
        rec('RT-P1-05', 'Pedido duplicado é rejeitado', /pendente/i.test((await direct(a, "BancadaCancel.request(db.orders.find(x=>x.id===23),'cliente','dup',new Date().toISOString(),db.orders)")).error), 'direct duplicate');

        const st2 = await withdrawCancel(a, 23, 'Cliente desistiu por ora — RT R06.');
        o = await snap(a, 23);
        rec('RT-P1-06', 'Retirada encerra a pendência sem mudar a OS', !st2.open && !(await a.evaluate(() => BancadaCancel.pending(db.orders.find(x => x.id === 23)))) && o.cancellation.events.length === 2 && o.cancellation.events[1].type === 'withdraw' && o.status === 'Orçamento' && o.total === 0, JSON.stringify({ st: st2, events: o.cancellation.events.map(e => e.type) }));
        const st3 = await requestCancel(a, 23, 'assistencia', 'Reaberto pela assistência — RT R06.');
        o = await snap(a, 23);
        rec('RT-P1-07', 'Novo pedido após retirada registra nova origem', !st3.open && o.cancellation.events.length === 3 && o.cancellation.events[2].type === 'request' && o.cancellation.events[2].origin === 'assistencia', JSON.stringify(o.cancellation.events.map(e => [e.type, e.origin])));

        const blockers = [];
        for (const [id, rx] of [[20, /concluído|faturado|finalizado/i], [19, /entrega física/i], [18, /garantia/i], [16, /garantia/i]]) {
          await go(a, `#os/${id}/cancelamento`);
          const txt = await mainText(a);
          const btn = await actionCount(a, `modal:cancelrequest:${id}`);
          const d = await a.evaluate(i => { const o = db.orders.find(x => x.id === i); const before = JSON.stringify(o.cancellation || null); let err = ''; try { BancadaCancel.request(o, 'cliente', 'Teste RT', new Date().toISOString(), db.orders); } catch (e) { err = e.message; } return { err, same: before === JSON.stringify(o.cancellation || null) }; }, id);
          blockers.push({ id, btn, blocked: rx.test(txt), err: d.err, same: d.same });
        }
        rec('RT-P1-08', 'Finalizada, entregue e garantia ficam bloqueadas (UI e modelo)', blockers.every(x => x.btn === 0 && x.blocked && x.err && x.same), JSON.stringify(blockers));

        await go(a, '#os/23/cancelamento');
        await role(a, 'Técnico');
        let t = await mainText(a); let acts = { req: await actionCount(a, 'modal:cancelrequest:23'), wd: await actionCount(a, 'modal:cancelwithdraw:23'), tech: await actionCount(a, 'modal:canceltechnical:23') };
        rec('RT-P1-09', 'Técnico solicita/retira/conferem e não vê valores', acts.wd === 1 && acts.req === 0 && !/R\$/.test(t) && /Conferência técnica/.test(t), t.slice(0, 160));
        await role(a, 'Atendente');
        t = await mainText(a); acts = { req: await actionCount(a, 'modal:cancelrequest:23'), wd: await actionCount(a, 'modal:cancelwithdraw:23'), tech: await actionCount(a, 'modal:canceltechnical:23') };
        rec('RT-P1-10', 'Atendente apenas consulta o cancelamento', acts.req === 0 && acts.wd === 0 && acts.tech === 0 && !/R\$/.test(t), t.slice(0, 160));
        await role(a, 'Financeiro');
        t = await mainText(a); acts = { req: await actionCount(a, 'modal:cancelrequest:23'), wd: await actionCount(a, 'modal:cancelwithdraw:23'), tech: await actionCount(a, 'modal:canceltechnical:23') };
        rec('RT-P1-11', 'Financeiro não solicita/retira/conferem e aguarda conferência', acts.req === 0 && acts.wd === 0 && acts.tech === 0 && /Aguardando conferência técnica/.test(t), t.slice(0, 160));
        await role(a, 'Administrador');
        rec('RT-P1-12', 'Administrador recupera as ações', (await actionCount(a, 'modal:cancelwithdraw:23')) === 1 && (await actionCount(a, 'modal:canceltechnical:23')) === 1, 'admin');

        const unauth = await a.evaluate(() => {
          const o = db.orders.find(x => x.id === 23); const out = {};
          role = 'Técnico'; try { cancelSubmit('cancelconfirm', o, { gross: '1', discount: '0', confirm: true }); out.tech = 'accepted'; } catch (e) { out.tech = e.message; }
          role = 'Financeiro'; try { cancelSubmit('cancelrequest', o, { origin: 'cliente', reason: 'x' }); out.fin = 'accepted'; } catch (e) { out.fin = e.message; }
          role = 'Atendente'; try { cancelSubmit('cancelitem', o, { index: '0', quantity: '1', disposition: 'unused', confirm: true }); out.att = 'accepted'; } catch (e) { out.att = e.message; }
          role = 'Administrador'; return out;
        });
        rec('RT-P1-13', 'Perfis não autorizados falham em chamadas diretas de cancelamento', /não autorizada/i.test(unauth.tech) && /não autorizada/i.test(unauth.fin) && /não autorizada/i.test(unauth.att), JSON.stringify(unauth));

        const boundary = await a.evaluate(() => {
          const o = db.orders.find(x => x.id === 23); const now = new Date().toISOString(); const out = {};
          try { BancadaCancel.withdraw(o, 'x', now); out.wd = 'ok'; } catch (e) { out.wd = e.message; }
          try { BancadaCancel.request(o, 'cliente', 'X'.repeat(2001), now, db.orders); out.long = 'accepted'; } catch (e) { out.long = e.message; }
          try { BancadaCancel.request(o, 'cliente', 'X'.repeat(2000), now, db.orders); out.exact = 'accepted'; } catch (e) { out.exact = e.message; }
          return out;
        });
        rec('RT-P1-14', 'Motivo no limite de 2000 é aceito; 2001 é rejeitado', boundary.wd === 'ok' && /motivo|observa/i.test(boundary.long) && boundary.exact === 'accepted', JSON.stringify(boundary));

        rec('RT-P1-15', 'Sem exceções, erros de console ou requisições externas na P1', errors.length === 0 && consoleErrors.length === 0 && requests.every(u => u.startsWith(BASE) || u.startsWith('data:')), JSON.stringify({ errors, consoleErrors, external: requests.filter(u => !u.startsWith(BASE) && !u.startsWith('data:')).slice(0, 3) }));
      } catch (e) { rec('RT-P1-ERR', 'Falha inesperada na P1', false, e.message); }
      await ctx.close();
    }

    /* ================= P2 — pieces, stock, conference blocking/invalidation ================= */
    {
      const { ctx, a, errors, consoleErrors } = await session(browser, 1440, 900, 'rt2');
      try {
        const stockBefore = await stock(a);
        const created = await createOrder(a, { brand: 'RT', model: 'Peças', defect: 'Placa sem alimentação — RT R06.' });
        const id = created.id;
        let st = await setQuote(a, id, [
          { type: 'Peça', name: 'IGBT RT', quantity: 3, unit: 3000 },
          { type: 'Peça', name: 'Opto RT', quantity: 2, unit: 1000 },
          { type: 'Peça', name: 'Capacitor RT', quantity: 1, unit: 500 },
          { type: 'Serviço', name: 'Diagnóstico RT', quantity: 1, unit: 5000 },
          { type: 'Serviço', name: 'Reparo RT', quantity: 1, unit: 8000 }
        ], 1000);
        let o = await snap(a, id);
        rec('RT-P2-01', 'Rascunho de 3 peças, 2 serviços e desconto salvo (total R$235)', !st.open && o.quote?.draft?.items?.length === 5 && o.quote.draft.discount === 1000 && o.proposal === 23500 && o.quote.versions.length === 0, JSON.stringify({ st, draft: { items: o.quote?.draft?.items?.length, discount: o.quote?.draft?.discount, proposal: o.proposal } }));
        st = await publish(a, id); o = await snap(a, id);
        rec('RT-P2-02', 'Publicação cria versão com 5 itens, total R$235 e status Negociação', !st.open && o.status === 'Negociação' && o.quote.versions.length === 1 && o.quote.versions[0].items.length === 5 && o.quote.versions[0].total === 23500, JSON.stringify({ st, status: o.status, version: o.quote?.versions?.[0] && { total: o.quote.versions[0].total, items: o.quote.versions[0].items.length } }));
        st = await requestCancel(a, id, 'cliente', 'Cliente pediu cancelamento com peças — RT R06.');
        o = await snap(a, id);
        rec('RT-P2-03', 'Pedido não altera orçamento nem entrega', !st.open && o.status === 'Negociação' && o.total === 0 && !o.delivery && o.quote.versions[0].items.length === 5, JSON.stringify({ st, status: o.status, total: o.total }));

        st = await conferPiece(a, id, 0, { disposition: 'unused', quantity: 1 });
        o = await snap(a, id); let ev = o.cancellation.events.at(-1);
        rec('RT-P2-04', 'Peça não utilizada parcial: sem entrada em estoque', !st.open && ev.type === 'item' && ev.disposition === 'unused' && ev.stockReturned === 0 && /Baixa não comprovada/.test(ev.stockNote || '') && o.quote.draft.items[0].quantity === 2 && JSON.stringify(await stock(a)) === JSON.stringify(stockBefore), JSON.stringify(ev));

        st = await conferPiece(a, id, 0, { disposition: 'lost', quantity: 2, reason: '' });
        o = await snap(a, id);
        rec('RT-P2-05', 'Consumo/perda sem motivo é rejeitado e não grava', st.open && /motivo|observa/i.test(st.error) && o.cancellation.events.length === 2 && o.quote.draft.items[0].quantity === 2, JSON.stringify(st));
        st = await conferPiece(a, id, 0, { disposition: 'lost', quantity: 2, reason: 'Peça consumida em teste RT R06.' });
        o = await snap(a, id); ev = o.cancellation.events.at(-1);
        rec('RT-P2-06', 'Peça consumida é registrada sem retorno ao estoque', !st.open && ev.disposition === 'lost' && ev.stockReturned === 0 && /não retorna/.test(ev.stockNote || '') && o.quote.draft.items.length === 4 && JSON.stringify(await stock(a)) === JSON.stringify(stockBefore), JSON.stringify(ev));
        st = await conferPiece(a, id, await a.evaluate(i => BancadaCancel.lines(db.orders.find(x => x.id === i)).findIndex(x => x.name === 'Opto RT'), id), { disposition: 'lost', quantity: 2, reason: 'Opto perdido na bancada RT R06.' });
        o = await snap(a, id);
        rec('RT-P2-07', 'Segunda peça consumida também não movimenta estoque', !st.open && o.quote.draft.items.length === 3 && !(await a.evaluate(i => BancadaCancel.lines(db.orders.find(x => x.id === i)).map(x => x.name), id)).includes('Opto RT') && JSON.stringify(await stock(a)) === JSON.stringify(stockBefore), JSON.stringify(o.quote.draft.items.map(i => i.name)));

        const blocked = await a.evaluate(i => {
          const o = db.orders.find(x => x.id === i); const before = o.cancellation.events.length;
          let err = ''; try { BancadaCancel.confer(o, true, 'Tentativa RT', new Date().toISOString(), db.orders); } catch (e) { err = e.message; }
          return { err, before, after: o.cancellation.events.length };
        }, id);
        rec('RT-P2-08', 'Conferência bloqueada enquanto há peça pendente', (await actionCount(a, `modal:canceltechnical:${id}`)) === 0 && /Concilie todas as peças/.test(blocked.err) && blocked.before === blocked.after, JSON.stringify(blocked));

        st = await conferPiece(a, id, await a.evaluate(i => BancadaCancel.lines(db.orders.find(x => x.id === i)).findIndex(x => x.name === 'Capacitor RT'), id), { disposition: 'unused', quantity: 1 });
        o = await snap(a, id);
        rec('RT-P2-09', 'Última peça conciliada sem estoque; itens 2', !st.open && o.quote.draft.items.length === 2 && !(await a.evaluate(i => BancadaCancel.lines(db.orders.find(x => x.id === i)).map(x => x.name), id)).includes('Capacitor RT') && JSON.stringify(await stock(a)) === JSON.stringify(stockBefore), JSON.stringify(o.quote.draft.items.map(i => i.name)));
        st = await conferPiece(a, id, await a.evaluate(i => BancadaCancel.lines(db.orders.find(x => x.id === i)).findIndex(x => x.name === 'Diagnóstico RT'), id), { disposition: null });
        o = await snap(a, id);
        rec('RT-P2-10', 'Serviço não executado sai; executado permanece; versão preservada', !st.open && o.quote.draft.items.length === 1 && o.quote.draft.items[0].name === 'Reparo RT' && o.quote.versions[0].items.length === 5 && o.quote.draft.discount === 0, JSON.stringify({ items: o.quote.draft.items.map(i => i.name), version: o.quote.versions[0].items.length, discount: o.quote.draft.discount }));

        st = await conferTechnical(a, id, 'Peças conciliadas e reparo executado — RT R06.');
        o = await snap(a, id);
        rec('RT-P2-11', 'Conferência técnica concluída', !st.open && (await a.evaluate(i => BancadaCancel.technical(db.orders.find(x => x.id === i)), id)) && o.cancellation.events.at(-1).type === 'technical', JSON.stringify(st));

        await go(a, `#os/${id}`); await openAction(a, `modal:tech:${id}`);
        await a.selectOption('#action-form select[name=status]', 'Aguardando Peças');
        await a.check('#action-form input[name=confirm]'); st = await submit(a);
        const invalidByStatus = await a.evaluate(i => BancadaCancel.technical(db.orders.find(x => x.id === i)), id);
        await go(a, `#os/${id}/cancelamento`); const afterStatus = await mainText(a);
        rec('RT-P2-12', 'Mudança de andamento invalida a conferência e o acerto', !st.open && invalidByStatus === false && /Pendente/.test(afterStatus) && (await actionCount(a, `modal:cancelconfirm:${id}`)) === 0, JSON.stringify({ st, invalidByStatus }));

        await go(a, `#os/${id}`); await openAction(a, `modal:tech:${id}`);
        await a.selectOption('#action-form select[name=status]', 'Negociação');
        await a.check('#action-form input[name=confirm]'); st = await submit(a);
        const back = await a.evaluate(i => BancadaCancel.technical(db.orders.find(x => x.id === i)), id);
        rec('RT-P2-13', 'Limitação declarada: voltar ao estado idêntico reativa a conferência (INFO)', 'INFO', JSON.stringify({ technicalAfterReturn: back, note: 'technicalKey é hash do estado atual; não há evento de revogação' }));

        await go(a, `#os/${id}/orcamento`); await openAction(a, `modal:quote:${id}`);
        await a.locator('[data-quote-add]').click(); await a.waitForTimeout(35);
        const row = a.locator('.quote-edit-row').last();
        await row.locator('select[name=itemType]').selectOption('Serviço');
        await row.locator('input[name=itemName]').fill('Serviço extra RT');
        await row.locator('input[name=itemQty]').fill('1');
        await row.locator('input[name=itemUnit]').fill('10.00');
        st = await submit(a);
        const invalidByItem = await a.evaluate(i => BancadaCancel.technical(db.orders.find(x => x.id === i)), id);
        await go(a, `#os/${id}/cancelamento`);
        rec('RT-P2-14', 'Alteração de item invalida a conferência e bloqueia o acerto', !st.open && invalidByItem === false && (await actionCount(a, `modal:cancelconfirm:${id}`)) === 0, JSON.stringify({ st, invalidByItem }));
        st = await conferPiece(a, id, await a.evaluate(i => BancadaCancel.lines(db.orders.find(x => x.id === i)).findIndex(x => x.name === 'Serviço extra RT'), id), { disposition: null });
        const restored = await a.evaluate(i => BancadaCancel.technical(db.orders.find(x => x.id === i)), id);
        rec('RT-P2-15', 'Limitação declarada: remover o item restaura a chave anterior (INFO)', 'INFO', JSON.stringify({ restored, note: 'mesmo limite da P2-13' }));

        st = await withdrawCancel(a, id, 'Retirada final RT R06.');
        o = await snap(a, id);
        rec('RT-P2-16', 'Retirada não restaura itens e preserva versão', !st.open && !(await a.evaluate(i => BancadaCancel.pending(db.orders.find(x => x.id === i)), id)) && o.quote.draft.items.length === 1 && o.quote.draft.items[0].name === 'Reparo RT' && o.quote.versions[0].items.length === 5, JSON.stringify({ items: o.quote.draft.items.map(i => i.name), versions: o.quote.versions[0].items.length }));
        rec('RT-P2-17', 'Estoque permanece intocado durante todo o fluxo', JSON.stringify(await stock(a)) === JSON.stringify(stockBefore), JSON.stringify({ before: stockBefore, after: await stock(a) }));
        rec('RT-P2-18', 'Sem exceções ou erros de console na P2', errors.length === 0 && consoleErrors.length === 0, JSON.stringify({ errors, consoleErrors }));
      } catch (e) { rec('RT-P2-ERR', 'Falha inesperada na P2', false, e.message); }
      await ctx.close();
    }

    /* ================= P3 — settlement without prior charge, receive/reverse, delivery, portal ================= */
    {
      const { ctx, a, errors, consoleErrors, requests } = await session(browser, 1440, 900, 'rt3');
      try {
        let st = await requestCancel(a, 23, 'cliente', 'Cancelamento sem cobrança — RT R06 <img src=x onerror="window.__rtx=1">.');
        st = await conferTechnical(a, 23, 'Sem peças; serviço conferido — RT R06.');
        await role(a, 'Financeiro');
        st = await confirmAcerto(a, 23, { gross: 8000, discount: 1000, reason: 'Diagnóstico e deslocamento — RT R06.' });
        let o = await snap(a, 23);
        rec('RT-P3-01', 'Acerto sem cobrança prévia cria obrigação de R$70 e cancela', !st.open && o.status === 'Cancelado' && o.total === 7000 && o.paid === 0 && o.billing?.due === await a.evaluate(() => today()) && o.cancellation.events.at(-1).settlement.result === 'a_receber' && !o.delivery, JSON.stringify({ st, status: o.status, total: o.total, paid: o.paid, settlement: o.cancellation.events.at(-1).settlement }));
        rec('RT-P3-02', 'Fila de cancelamentos fica vazia após confirmar', (await queueCount(a, 'cancelamentos')) === 0, 'queue=0');
        rec('RT-P3-03', 'Técnico/Atendente não veem valores; Financeiro vê saldo', await (async () => { await role(a, 'Técnico'); const t = await mainText(a); await role(a, 'Atendente'); const t2 = await mainText(a); await role(a, 'Financeiro'); const t3 = await mainText(a); return !/R\$/.test(t) && !/R\$/.test(t2) && /R\$ 70,00/.test(t3); })(), 'profile visibility');
        st = await pay(a, 23, 7000, { method: 'Pix' });
        o = await snap(a, 23);
        rec('RT-P3-04', 'Recebimento posterior quita o saldo e preserva status cancelado', !st.open && o.paid === 7000 && o.status === 'Cancelado' && o.ledger.events.length === 1 && o.ledger.events[0].type === 'receive', JSON.stringify({ st, paid: o.paid, events: o.ledger.events.map(e => e.type) }));
        const noPay = await a.evaluate(() => { const o = db.orders.find(x => x.id === 23); let err = ''; try { BancadaFinance.receive(o, 100, today(), 'Pix', new Date().toISOString()); } catch (e) { err = e.message; } return err; });
        rec('RT-P3-05', 'Pagamento em saldo zero é bloqueado (UI e modelo)', (await actionCount(a, 'modal:pay:23')) === 0 && /excede|indispon/i.test(noPay), noPay);
        await role(a, 'Administrador');
        st = await reverse(a, 23, 1, 'Recebimento lançado em duplicidade — RT R06.');
        o = await snap(a, 23);
        rec('RT-P3-06', 'Estorno normal reabre saldo sem alterar total e marca recibo', !st.open && o.paid === 0 && o.total === 7000 && o.status === 'Cancelado' && o.ledger.events.length === 2 && o.ledger.events[1].type === 'reverse' && (await a.evaluate(() => receiptView(db.orders.find(x => x.id === 23), 1).includes('ESTORNADO'))), JSON.stringify({ st, paid: o.paid, events: o.ledger.events.map(e => e.type) }));
        st = await pay(a, 23, 7000, { method: 'Dinheiro' });
        o = await snap(a, 23);
        rec('RT-P3-07', 'Saldo recomposto aceita novo recebimento', !st.open && o.paid === 7000 && o.ledger.events.length === 3, JSON.stringify({ st, paid: o.paid }));

        await role(a, 'Atendente');
        st = await deliver(a, 23);
        o = await snap(a, 23);
        rec('RT-P3-08', 'Entrega é operação independente do cancelamento', !st.open && !!o.delivery && o.status === 'Cancelado' && o.total === 7000 && o.paid === 7000, JSON.stringify({ st, delivery: o.delivery, status: o.status }));

        const token = await a.evaluate(() => { const o = db.orders.find(x => x.id === 23); if (!o.publicLink) { BancadaPortal.issue(o, BancadaPortal.token()); save(); } return o.publicLink.token; });
        const p = await ctx.newPage(); const pErr = [], pReq = [];
        p.on('pageerror', e => pErr.push(e.message));
        p.on('request', r => pReq.push(r.url()));
        await p.goto(`${BASE}/portal.html#${token}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(300);
        const pt = (await p.locator('#customer-main').innerText()).replace(/\u00a0/g, ' ');
        const proj = await a.evaluate(() => JSON.parse(JSON.stringify(BancadaPortal.projection(db.orders.find(x => x.id === 23)))));
        rec('RT-P3-09', 'Portal do cancelado oculta orçamento e mostra projeção financeira', /Não há orçamento publicado/.test(pt) && /Quitada/.test(pt) && /R\$ 70,00/.test(pt) && /R\$ 0,00/.test(pt) && proj.quote === null && proj.finance?.total === 7000 && proj.finance?.paid === 7000 && proj.finance?.balance === 0, pt.slice(0, 500));
        rec('RT-P3-10', 'Portal não expõe motivo, histórico, token ou referência privada', !pt.includes('Cancelamento') && !pt.includes('Diagnóstico e deslocamento') && !JSON.stringify(proj).includes('Cancelamento') && !JSON.stringify(proj).includes(token) && !JSON.stringify(proj).includes('__rtx'), JSON.stringify({ keys: Object.keys(proj).sort(), quote: proj.quote, finance: proj.finance }));
        rec('RT-P3-11', 'Escaping do motivo injetado no painel/histórico', await a.evaluate(() => { const h = document.querySelector('#main').innerHTML; return window.__rtx === undefined && h.includes('&lt;img') && !h.includes('<img src=x'); }), 'injected request reason');
        rec('RT-P3-12', 'Sem exceções, console errors ou páginas externas na P3', errors.length === 0 && consoleErrors.length === 0 && pErr.length === 0 && pReq.every(u => u.startsWith(BASE) || u.startsWith('data:')), JSON.stringify({ errors, consoleErrors, pErr, external: pReq.filter(u => !u.startsWith(BASE) && !u.startsWith('data:')).slice(0, 3) }));
        await p.close();
      } catch (e) { rec('RT-P3-ERR', 'Falha inesperada na P3', false, e.message); }
      await ctx.close();
    }

    /* ================= P4 — refund distinct from reversal, privacy, print ================= */
    {
      const { ctx, a, errors, consoleErrors } = await session(browser, 1440, 900, 'rt4');
      try {
        const created = await createOrder(a, { brand: 'RT', model: 'Devolução', defect: 'Falha de comunicação — RT R06.' });
        const id = created.id;
        let st = await setQuote(a, id, [{ type: 'Serviço', name: 'Reparo completo RT', quantity: 1, unit: 24000 }], 0);
        await publish(a, id); await formalize(a, id);
        await pay(a, id, 10000, { method: 'Pix' }); await pay(a, id, 14000, { method: 'Dinheiro' });
        let o = await snap(a, id);
        rec('RT-P4-01', 'Duas entradas somam R$240 antes do cancelamento', o.total === 24000 && o.paid === 24000 && o.ledger.events.length === 2, JSON.stringify({ total: o.total, paid: o.paid }));
        await requestCancel(a, id, 'cliente', 'Cliente desistiu após pagamento — RT R06.');
        await conferTechnical(a, id, 'Serviço não executado; conferência RT R06.');
        o = await snap(a, id);
        rec('RT-P4-02', 'Conferência técnica pronta para o acerto', o.cancellation.events.at(-1).type === 'technical' && o.status === 'Negociação', JSON.stringify(o.cancellation.events.map(e => e.type)));
        await role(a, 'Financeiro');
        st = await confirmAcerto(a, id, { gross: 10000, discount: 2000, refund: 15999, ref: 'Comprovante divergente RT' });
        o = await snap(a, id);
        rec('RT-P4-03', 'Devolução com valor divergente é rejeitada', st.open && /exatamente/i.test(st.error) && o.status === 'Negociação' && o.paid === 24000, JSON.stringify(st));
        st = await confirmAcerto(a, id, { gross: 10000, discount: 2000, refund: 16000, ref: '' });
        o = await snap(a, id);
        const refValid = await a.evaluate(() => { const r = document.querySelector('#action-form input[name=ref]'); return r ? { message: r.validationMessage, valid: r.checkValidity() } : null; });
        rec('RT-P4-04', 'Devolução sem comprovante é bloqueada no formulário', st.open && refValid && !refValid.valid && o.paid === 24000, JSON.stringify({ st, refValid }));
        const yest = await a.evaluate(() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); });
        st = await confirmAcerto(a, id, { gross: 10000, discount: 2000, refund: 16000, ref: 'Comprovante data RT', date: yest });
        o = await snap(a, id);
        rec('RT-P4-05', 'Data da devolução anterior aos recebimentos é rejeitada', st.open && /anterior aos registros financeiros/i.test(st.error) && o.paid === 24000, JSON.stringify(st));
        const badDate = await a.evaluate(i => { const o = db.orders.find(x => x.id === i); const before = o.cancellation.events.length; let err = ''; try { cancelSubmit('cancelconfirm', o, { key: BancadaCancel.financialKey(o), gross: '100', discount: '20', refund: '160', date: '2026-02-30', method: 'Pix', ref: 'X', confirm: true, financialConfirmed: true, settlementConfirmed: true, reason: 'Teste' }); } catch (e) { err = e.message; } return { err, before, after: o.cancellation.events.length }; }, id);
        const badMethod = await a.evaluate(i => { const o = db.orders.find(x => x.id === i); let err = ''; try { BancadaCancel.confirm(o, { key: BancadaCancel.financialKey(o), gross: 10000, discount: 2000, refund: 16000, date: today(), method: 'Cheque', ref: 'X', confirm: true, financialConfirmed: true, settlementConfirmed: true, reason: 'Teste' }, new Date().toISOString(), today(), db.orders); } catch (e) { err = e.message; } return err; }, id);
        rec('RT-P4-06', 'Data inválida e forma inválida são rejeitadas', /data e forma/i.test(badDate.err) && badDate.before === badDate.after && /data e forma/i.test(badMethod), JSON.stringify({ badDate, badMethod }));

        const sentinel = 'REF-PRIVADA-RT-R06 <img src=x onerror="window.__rty=1">';
        st = await confirmAcerto(a, id, { gross: 10000, discount: 2000, refund: 16000, ref: sentinel, reason: 'Acerto com devolução do excedente — RT R06.' });
        o = await snap(a, id);
        const refundEvent = o.ledger?.events?.find(e => e.type === 'refund');
        rec('RT-P4-07', 'Confirmação calcula total R$80 e devolução R$160', !st.open && o.status === 'Cancelado' && o.total === 8000 && o.paid === 8000 && o.cancellation.events.at(-1).settlement.result === 'a_devolver', JSON.stringify({ st, status: o.status, total: o.total, paid: o.paid, settle: o.cancellation.events.at(-1).settlement }));
        rec('RT-P4-08', 'Devolução é evento separado; recibos originais não são estornados', !!refundEvent && refundEvent.amount === 16000 && refundEvent.reference === sentinel && o.ledger.events.length === 3 && o.ledger.events[0].type === 'receive' && o.ledger.events[1].type === 'receive' && !o.ledger.events.some(e => e.type === 'reverse') && (await a.evaluate(i => { const o = db.orders.find(x => x.id === i); return [BancadaFinance.reversed(o, 1), BancadaFinance.reversed(o, 2)]; }, id)).every(x => x === null), JSON.stringify({ events: o.ledger.events.map(e => e.type), refundEvent }));
        await go(a, `#recibo/${id}/1`);
        const rt = await mainText(a);
        rec('RT-P4-09', 'Recibo original continua normal e sem ESTORNADO', /Recibo #/.test(rt) && /R\$ 100,00/.test(rt) && !/ESTORNADO/.test(rt), rt.slice(0, 180));
        await go(a, `#os/${id}/financeiro`);
        const fin = await mainText(a);
        rec('RT-P4-10', 'Financeiro mostra devolução e bloqueia correções', /Devolução registrada/.test(fin) && /Comprovante:/.test(fin) && (await actionCount(a, `modal:reverse:${id}:1`)) === 0 && (await actionCount(a, `modal:rectify:${id}:1`)) === 0 && (await actionCount(a, `modal:rectify:${id}:2`)) === 0, fin.slice(0, 500));
        const late = await a.evaluate(i => { const o = db.orders.find(x => x.id === i); role = 'Administrador'; const b = o.financeLedger.events.length; let e1 = '', e2 = ''; try { BancadaFinance.reverse(o, 1, today(), 'Erro RT', new Date().toISOString()); } catch (e) { e1 = e.message; } try { financialSubmit('rectify', o, { eventId: '1', date: today(), reason: 'Erro RT', rectification: 'lancamento_incorreto', confirm: true }); } catch (e) { e2 = e.message; } return { e1, e2, same: b === o.financeLedger.events.length, status: o.status }; }, id);
        rec('RT-P4-11', 'Correção após devolução é bloqueada no modelo', /devolução|retifica/i.test(late.e1) && /devolução|retifica/i.test(late.e2) && late.same, JSON.stringify(late));
        const noPay = await a.evaluate(i => { const o = db.orders.find(x => x.id === i); let err = ''; try { BancadaFinance.receive(o, 100, today(), 'Pix', new Date().toISOString()); } catch (e) { err = e.message; } return err; }, id);
        rec('RT-P4-12', 'Pagamento em acerto com devolução/saldo zero é bloqueado', (await actionCount(a, `modal:pay:${id}`)) === 0 && /indispon|excede/i.test(noPay), noPay);

        const proj = await a.evaluate(i => JSON.parse(JSON.stringify(BancadaPortal.projection(db.orders.find(x => x.id === i)))), id);
        rec('RT-P4-13', 'Portal reflete líquido R$80 e não contém referência privada', proj.finance?.total === 8000 && proj.finance?.paid === 8000 && proj.finance?.balance === 0 && proj.quote === null && !JSON.stringify(proj).includes('REF-PRIVADA-RT-R06') && !JSON.stringify(proj).includes('Acerto com devolução'), JSON.stringify(proj.finance));
        const token = await a.evaluate(i => { const o = db.orders.find(x => x.id === i); BancadaPortal.issue(o, BancadaPortal.token()); save(); return o.publicLink.token; }, id);
        const p = await ctx.newPage(); const pErr = [];
        p.on('pageerror', e => pErr.push(e.message));
        await p.goto(`${BASE}/portal.html#${token}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(300);
        const pt = (await p.locator('#customer-main').innerText()).replace(/\u00a0/g, ' ');
        rec('RT-P4-14', 'Portal cancelado não mostra orçamento nem comprovante interno', /Não há orçamento publicado/.test(pt) && !pt.includes('REF-PRIVADA-RT-R06') && /Quitada/.test(pt) && /R\$ 80,00/.test(pt) && pErr.length === 0, pt.slice(0, 500));
        await p.close();

        await go(a, `#imprimir/${id}`); const pr = await mainText(a);
        rec('RT-P4-15', 'Impressão da OS cancelada não expõe referência privada', /Cancelado/.test(pr) && /R\$ 80,00/.test(pr) && !pr.includes('REF-PRIVADA-RT-R06'), pr.slice(0, 220));
        rec('RT-P4-16', 'Referência privada é escapada no financeiro', await a.evaluate(i => { const h = document.querySelector('#main').innerHTML; return window.__rty === undefined && h.indexOf('<img src=x onerror') === -1; }, id), 'finance escaping');
        rec('RT-P4-17', 'Sem exceções ou console errors na P4', errors.length === 0 && consoleErrors.length === 0, JSON.stringify({ errors, consoleErrors }));
      } catch (e) { rec('RT-P4-ERR', 'Falha inesperada na P4', false, e.message); }
      await ctx.close();
    }

    /* ================= P5 — total zero, rectification ================= */
    {
      const { ctx, a, errors, consoleErrors } = await session(browser, 1440, 900, 'rt5');
      try {
        // zero with prior obligation, no payment
        let created = await createOrder(a, { brand: 'RT', model: 'Zero obrigação', defect: 'Total zero com obrigação RT.' });
        let id = created.id;
        await setQuote(a, id, [{ type: 'Serviço', name: 'Serviço zero RT', quantity: 1, unit: 10000 }], 0);
        await publish(a, id); await formalize(a, id);
        await requestCancel(a, id, 'cliente', 'Cancelamento total zero RT.');
        await conferTechnical(a, id, 'Serviço não executado RT.');
        let st = await confirmAcerto(a, id, { gross: 0, discount: 0, reason: 'Acerto zero com obrigação RT.' });
        let o = await snap(a, id);
        rec('RT-P5-01', 'Total zero com obrigação anterior: sem devolução e billing preservado', !st.open && o.status === 'Cancelado' && o.total === 0 && o.paid === 0 && !!o.billing && o.billing.settlement?.gross === 0 && o.cancellation.events.at(-1).settlement.result === 'sem_pendencias' && !o.ledger?.events?.some(e => e.type === 'refund'), JSON.stringify({ st, status: o.status, total: o.total, paid: o.paid, billing: o.billing, settle: o.cancellation.events.at(-1).settlement }));
        rec('RT-P5-02', 'Portal do total zero com obrigação mostra Sem cobrança', await a.evaluate(i => { const p = BancadaPortal.projection(db.orders.find(x => x.id === i)); return p.finance?.status === 'Sem cobrança' && p.finance?.total === 0 && p.quote === null; }, id), 'portal finance');

        // zero with prior obligation and full refund
        created = await createOrder(a, { brand: 'RT', model: 'Zero devolução', defect: 'Total zero com devolução RT.' });
        id = created.id;
        await setQuote(a, id, [{ type: 'Serviço', name: 'Serviço zero dev RT', quantity: 1, unit: 10000 }], 0);
        await publish(a, id); await formalize(a, id); await pay(a, id, 10000, { method: 'Pix' });
        await requestCancel(a, id, 'cliente', 'Cancelamento total zero com devolução RT.');
        await conferTechnical(a, id, 'Serviço não executado RT.');
        st = await confirmAcerto(a, id, { gross: 0, discount: 0, refund: 10000, ref: 'Devolução integral RT', reason: 'Devolução integral RT.' });
        o = await snap(a, id);
        rec('RT-P5-03', 'Total zero com obrigação e devolução integral', !st.open && o.status === 'Cancelado' && o.total === 0 && o.paid === 0 && o.ledger.events.some(e => e.type === 'refund' && e.amount === 10000) && o.billing?.settlement?.gross === 0, JSON.stringify({ st, total: o.total, paid: o.paid, events: o.ledger.events.map(e => e.type) }));

        // zero without obligation
        created = await createOrder(a, { brand: 'RT', model: 'Zero livre', defect: 'Cancelamento sem orçamento RT.' });
        id = created.id;
        await requestCancel(a, id, 'cliente', 'Cancelamento sem orçamento RT.');
        await conferTechnical(a, id, 'Sem itens; conferência RT.');
        st = await confirmAcerto(a, id, { gross: 0, discount: 0, reason: '' });
        o = await snap(a, id);
        rec('RT-P5-04', 'Total zero sem obrigação não cria cobrança', !st.open && o.status === 'Cancelado' && o.total === 0 && o.paid === 0 && !o.billing && o.cancellation.events.at(-1).settlement.result === 'sem_pendencias', JSON.stringify({ st, status: o.status, total: o.total, billing: o.billing }));
        rec('RT-P5-05', 'Portal sem obrigação não exibe bloco financeiro', await a.evaluate(i => { const p = BancadaPortal.projection(db.orders.find(x => x.id === i)); return p.finance === null && p.quote === null; }, id), 'portal null');

        // rectification on a settled cancelled order
        created = await createOrder(a, { brand: 'RT', model: 'Retificação', defect: 'Retificação RT.' });
        id = created.id;
        await setQuote(a, id, [{ type: 'Serviço', name: 'Reparo retificação RT', quantity: 1, unit: 10000 }], 0);
        await publish(a, id); await formalize(a, id);
        const yest = await a.evaluate(() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); });
        await pay(a, id, 10000, { date: yest, method: 'Pix' });
        await requestCancel(a, id, 'cliente', 'Cancelamento para retificação RT.');
        await conferTechnical(a, id, 'Serviço não executado RT.');
        st = await confirmAcerto(a, id, { gross: 10000, discount: 0, reason: 'Acerto sem pendência RT.' });
        o = await snap(a, id);
        rec('RT-P5-06', 'Acerto sem pendência mantém total igual ao pago', !st.open && o.status === 'Cancelado' && o.total === 10000 && o.paid === 10000 && o.cancellation.events.at(-1).settlement.result === 'sem_pendencias', JSON.stringify({ st, total: o.total, paid: o.paid }));
        await role(a, 'Financeiro'); await go(a, `#os/${id}/financeiro`);
        const finNo = await mainText(a);
        rec('RT-P5-07', 'Financeiro não vê estorno nem retificação', !/Retificar recebimento/.test(finNo) && !/Estornar registro/.test(finNo), finNo.slice(0, 220));
        await role(a, 'Administrador'); await go(a, `#os/${id}/financeiro`);
        const finAdm = await mainText(a);
        rec('RT-P5-08', 'Administrador vê retificação (não estorno normal)', /Retificar recebimento/.test(finAdm) && !/Estornar registro/.test(finAdm) && (await actionCount(a, `modal:rectify:${id}:1`)) === 1, finAdm.slice(0, 260));
        st = await rectify(a, id, 1, { type: 'lancamento_incorreto', date: yest, reason: 'Data anterior à confirmação RT.' });
        o = await snap(a, id);
        rec('RT-P5-09', 'Data anterior à confirmação do acerto é rejeitada', st.open && /período de retificação/i.test(st.error) && o.paid === 10000 && o.ledger.events.length === 1, JSON.stringify(st));
        st = await rectify(a, id, 1, { type: 'nao_compensado', date: await a.evaluate(() => today()), reason: 'Retificação autorizada RT.' });
        o = await snap(a, id);
        const rev = o.ledger.events.find(e => e.type === 'reverse');
        rec('RT-P5-10', 'Retificação autorizada recompõe saldo e registra tipo', !st.open && o.paid === 0 && o.total === 10000 && rev?.rectification === 'nao_compensado' && o.ledger.events.length === 2 && (await a.evaluate(i => BancadaFinance.allowsReceive(db.orders.find(x => x.id === i)), id)), JSON.stringify(rev));
        await go(a, `#recibo/${id}/1`);
        rec('RT-P5-11', 'Recibo retificado é marcado ESTORNADO', /ESTORNADO/.test(await mainText(a)), 'receipt');
        await go(a, `#os/${id}/financeiro`);
        rec('RT-P5-12', 'Retificação duplicada não é oferecida nem aceita', (await actionCount(a, `modal:rectify:${id}:1`)) === 0 && /já estornado|inexistente/i.test((await direct(a, "financialSubmit('rectify',db.orders.find(x=>x.id===" + id + "),{eventId:'1',date:today(),reason:'Dup',rectification:'lancamento_incorreto',confirm:true})")).error), 'duplicate');
        st = await pay(a, id, 10000, { method: 'Transferência' });
        o = await snap(a, id);
        rec('RT-P5-13', 'Saldo recomposto autoriza novo recebimento', !st.open && o.paid === 10000 && o.ledger.events.length === 3, JSON.stringify({ st, paid: o.paid }));
        await role(a, 'Financeiro');
        const finRect = await a.evaluate(i => { const o = db.orders.find(x => x.id === i); openModal('rectify', i, 2); return document.querySelector('#modal').open; }, id);
        rec('RT-P5-14', 'Financeiro não abre retificação do novo recebimento', finRect === false, 'direct modal');
        rec('RT-P5-15', 'Sem exceções ou console errors na P5', errors.length === 0 && consoleErrors.length === 0, JSON.stringify({ errors, consoleErrors }));
      } catch (e) { rec('RT-P5-ERR', 'Falha inesperada na P5', false, e.message); }
      await ctx.close();
    }

    /* ================= P6 — two tabs, stale key, persistence, direct pay permission ================= */
    {
      const { ctx, a, errors, consoleErrors } = await session(browser, 1440, 900, 'rt6');
      try {
        const created = await createOrder(a, { brand: 'RT', model: 'Abas', defect: 'Concorrência entre abas RT.' });
        const id = created.id;
        await setQuote(a, id, [{ type: 'Serviço', name: 'Reparo concorrente RT', quantity: 1, unit: 24000 }], 0);
        await publish(a, id); await formalize(a, id); await pay(a, id, 10000, { method: 'Pix' });
        await requestCancel(a, id, 'cliente', 'Pedido para concorrência RT.');
        await conferTechnical(a, id, 'Conferência antes da concorrência RT.');
        await go(a, `#os/${id}/cancelamento`);
        await openAction(a, `modal:cancelconfirm:${id}`);
        await a.fill('#action-form input[name=gross]', '100.00');
        await a.fill('#action-form input[name=discount]', '20.00');
        await a.waitForTimeout(180);
        await a.fill('#action-form input[name=refund]', '20.00');
        await a.fill('#action-form input[name=ref]', 'Comprovante obsoleto RT');
        await a.fill('#action-form textarea[name=reason]', 'Acerto que ficará obsoleto RT.');
        await a.check('#action-form input[name=settlementConfirmed]');
        await a.check('#action-form input[name=financialConfirmed]');
        await a.check('#action-form input[name=confirm]');
        const b = await ctx.newPage(); const bErr = [];
        b.on('pageerror', e => bErr.push(e.message));
        await b.goto(`${BASE}/?rttab=${Date.now()}#os/${id}/financeiro`, { waitUntil: 'networkidle' });
        await b.waitForTimeout(250);
        if (!(await openAction(b, `modal:pay:${id}`))) throw new Error('pay modal did not open in tab B');
        await b.fill('#action-form input[name=amount]', '50.00');
        await b.selectOption('#action-form select[name=method]', 'Pix');
        const bst = await submit(b);
        await a.waitForTimeout(650);
        const toastA = await a.evaluate(() => { const t = document.querySelector('#toast'); return t && !t.hidden ? t.textContent : ''; });
        rec('RT-P6-01', 'Segunda aba altera o saldo e a primeira anuncia conflito', !bst.open && /outra aba/i.test(toastA), JSON.stringify({ bst, toastA }));
        let st = await submit(a);
        let o = await snap(a, id);
        rec('RT-P6-02', 'Confirmação obsoleta é abortada e não grava cancelamento', !st.open && /outra aba/i.test(st.toast) && o.status === 'Negociação' && o.paid === 15000 && !o.cancellation.events.some(e => e.type === 'confirm'), JSON.stringify({ st, status: o.status, paid: o.paid, events: o.cancellation.events.map(e => e.type) }));
        st = await confirmAcerto(a, id, { gross: 10000, discount: 2000, refund: 7000, ref: 'Comprovante final RT', reason: 'Acerto após conflito RT.' });
        o = await snap(a, id);
        rec('RT-P6-03', 'Acerto recalculado confirma com devolução R$70', !st.open && o.status === 'Cancelado' && o.total === 8000 && o.paid === 8000 && o.ledger.events.some(e => e.type === 'refund' && e.amount === 7000), JSON.stringify({ st, total: o.total, paid: o.paid, events: o.ledger.events.map(e => e.type) }));
        await b.waitForTimeout(650);
        const bt = await b.locator('#main').innerText();
        rec('RT-P6-04', 'Segunda aba atualiza para o cancelamento', /Cancelado/.test(bt) && /Sem pendência/.test(bt), bt.slice(0, 180));
        await a.reload({ waitUntil: 'networkidle' }); await go(a, `#os/${id}/cancelamento`);
        o = await snap(a, id);
        await a.evaluate(() => { document.querySelectorAll('#main details').forEach(d => { d.open = true; }); });
        const hist = await mainText(a);
        rec('RT-P6-05', 'Cancelamento e devolução persistem após recarregar', o.status === 'Cancelado' && o.total === 8000 && o.paid === 8000 && o.ledger.events.length === 3 && /Cancelamento concluído/.test(hist) && /Cancelamento confirmado/.test(hist), JSON.stringify({ status: o.status, events: o.ledger.events.length }));

        // stale key at model level
        const s = await createOrder(a, { brand: 'RT', model: 'Stale', defect: 'Stale key RT.' });
        const sid = s.id;
        await setQuote(a, sid, [{ type: 'Serviço', name: 'Reparo stale RT', quantity: 1, unit: 10000 }], 0);
        await publish(a, sid); await formalize(a, sid);
        await requestCancel(a, sid, 'cliente', 'Pedido stale RT.');
        await conferTechnical(a, sid, 'Conferência stale RT.');
        await go(a, `#os/${sid}/cancelamento`); await openAction(a, `modal:cancelconfirm:${sid}`);
        const stale = await a.evaluate(i => {
          const o = db.orders.find(x => x.id === i);
          const d = { key: document.querySelector('#action-form input[name=key]').value, gross: '100', discount: '0', refund: '0', confirm: true, financialConfirmed: true, settlementConfirmed: true, reason: 'Acerto stale RT' };
          BancadaFinance.receive(o, 5000, today(), 'Pix', new Date().toISOString()); save();
          let err = ''; try { cancelSubmit('cancelconfirm', o, d); } catch (e) { err = e.message; }
          return { err, confirmed: o.cancellation.events.some(e => e.type === 'confirm'), paid: o.paid };
        }, sid);
        rec('RT-P6-06', 'Chave financeira obsoleta é rejeitada no modelo', /mudou|reabra/i.test(stale.err) && !stale.confirmed && stale.paid === 5000, JSON.stringify(stale));

        // direct pay permission gap (action layer)
        const payGap = await a.evaluate(() => {
          document.querySelector('#modal').close();
          const o = db.orders.find(x => x.id === 20); // Finalizado, total 35000, paid 20000
          const out = {};
          for (const profile of ['Técnico', 'Atendente']) {
            role = profile;
            const before = { paid: o.paid, events: (o.financeLedger?.events || []).length, canFinance: can('finance') };
            let err = ''; let ok = false;
            try { financialSubmit('pay', o, { amount: '10.00', date: today(), method: 'Pix' }); ok = true; } catch (e) { err = e.message; }
            openModal('pay', 20);
            const uiModal = document.querySelector('#modal').open;
            document.querySelector('#modal').close();
            out[profile] = { before, ok, err, uiModal, after: { paid: o.paid, events: (o.financeLedger?.events || []).length } };
          }
          role = 'Administrador';
          return out;
        });
        rec('RT-P6-07', 'AÇÃO DIRETA: perfil sem financeiro não deveria registrar pagamento', !payGap['Técnico'].ok && !payGap['Atendente'].ok && payGap['Técnico'].after.paid === payGap['Técnico'].before.paid && payGap['Atendente'].after.paid === payGap['Atendente'].before.paid, JSON.stringify(payGap));
        rec('RT-P6-08', 'Sem exceções ou console errors na P6', errors.length === 0 && consoleErrors.length === 0 && bErr.length === 0, JSON.stringify({ errors, consoleErrors, bErr }));
      } catch (e) { rec('RT-P6-ERR', 'Falha inesperada na P6', false, e.message); }
      await ctx.close();
    }

    fs.writeFileSync(path.join(OUT, 'redteam-domain-resultados.json'), JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));
    const pass = results.filter(r => r.status === 'PASS').length, fail = results.filter(r => r.status === 'FAIL').length, info = results.filter(r => r.status === 'INFO').length;
    console.log(`\nTOTAL ${results.length} · PASS ${pass} · FAIL ${fail} · INFO ${info}`);
    if (fail) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch(e => { console.error('FATAL', e); process.exit(1); });
