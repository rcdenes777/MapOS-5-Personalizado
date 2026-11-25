'use strict';
/*
 * R05 — bordas financeiras: valores, datas, justificativa, duplicidade,
 * permissões diretas, extremos e impressão. Requer Playwright.
 */
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const CHROME = process.env.CHROME_PATH || '/home/dragonblue/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8130';
const OUT = path.resolve(__dirname, '..');
const norm = s => String(s).replace(/\u00a0/g, ' ');
const results = [];
const rec = (id, desc, ok, detail = '') => {
  const status = ok === 'INFO' ? 'INFO' : ok ? 'PASS' : 'FAIL';
  results.push({ id, desc, status, detail }); console.log(`${status} ${id} — ${desc}${detail ? ' :: ' + detail : ''}`);
};
async function session(browser, w = 1440, h = 900) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: 'pt-BR' });
  const a = await ctx.newPage(); const errors = [], consoleErrors = [], requests = [];
  a.on('pageerror', e => errors.push(e.message)); a.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); }); a.on('request', r => requests.push(r.url()));
  await a.goto(BASE + '/?r05edge=' + Date.now(), { waitUntil: 'networkidle' }); await a.evaluate(() => localStorage.clear()); await a.reload({ waitUntil: 'networkidle' });
  return { ctx, a, errors, consoleErrors, requests };
}
async function goto(a, hash) { await a.evaluate(h => { location.hash = h; }, hash); await a.waitForTimeout(250); }
async function open(a, kind, id, eventId = null) {
  const action = eventId === null ? `modal:${kind}:${id}` : `modal:${kind}:${id}:${eventId}`;
  const loc = a.locator(`[data-action="${action}"]`); if (!(await loc.count())) return false;
  await loc.last().click(); await a.waitForTimeout(140); return a.evaluate(() => document.querySelector('#modal').open);
}
async function submit(a) { await a.locator('#action-form button[type=submit]').click(); await a.waitForTimeout(300); }
const state = (a, id = 20) => a.evaluate(i => { const o = db.orders.find(x => x.id === i); return JSON.parse(JSON.stringify({ total: o.total, paid: o.paid, status: o.status, ledger: o.financeLedger })); }, id);

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  try {
    /* X01–X06: validação de recebimentos e estornos no domínio e na UI. */
    {
      const { ctx, a, errors, consoleErrors, requests } = await session(browser);
      await goto(a, '#os/20/financeiro');
      const before = await state(a);
      const domain = await a.evaluate(() => {
        const o = db.orders.find(x => x.id === 20); const out = [];
        for (const c of [
          { amount: '0', date: today(), method: 'Pix' },
          { amount: '-1', date: today(), method: 'Pix' },
          { amount: '1.234', date: today(), method: 'Pix' },
          { amount: '999999', date: today(), method: 'Pix' },
          { amount: '50.00', date: '2026-02-30', method: 'Pix' },
          { amount: '50.00', date: today(), method: 'Cheque' },
          { amount: '', date: today(), method: 'Pix' }
        ]) {
          try { financialSubmit('pay', o, c); out.push('aceitou:' + c.amount); } catch (e) { out.push(e.message); }
        }
        return { out, after: JSON.parse(JSON.stringify(o.financeLedger)), paid: o.paid };
      });
      rec('R05-X01', 'Recebimentos inválidos são rejeitados sem criar eventos', domain.after.events.length === 0 && domain.paid === 20000 && domain.out.every(x => !x.startsWith('aceitou')), JSON.stringify(domain));
      // UI native validation: zero/above max/three decimals do not submit
      await open(a, 'pay', 20);
      const uiResults = [];
      for (const v of ['0', '999', '50.001']) {
        await a.fill('#action-form input[name=amount]', v);
        await a.locator('#action-form button[type=submit]').click();
        await a.waitForTimeout(180);
        uiResults.push({ v, open: await a.evaluate(() => document.querySelector('#modal').open), paid: (await state(a)).paid });
      }
      rec('R05-X02', 'UI bloqueia zero, valor acima do saldo e fração além de centavos', uiResults.every(x => x.open && x.paid === 20000), JSON.stringify(uiResults));
      await a.locator('#modal button[data-action=close]').click();

      const receipt = await a.evaluate(() => {
        const o = db.orders.find(x => x.id === 20);
        const e = BancadaFinance.receive(o, 5000, today(), 'Pix', new Date().toISOString());
        return { eventId: e.id, paid: o.paid };
      });
      const inv = await a.evaluate(() => {
        const o = db.orders.find(x => x.id === 20); const out = [];
        for (const c of [
          { id: 1, date: today(), reason: ' ' },
          { id: 1, date: today(), reason: 'X'.repeat(501) },
          { id: 1, date: '2026-02-30', reason: 'Data inválida' },
          { id: 1, date: '2020-01-01', reason: 'Data anterior' },
          { id: 999, date: today(), reason: 'Inexistente' },
          { id: 2, date: today(), reason: 'Alvo é estorno' }
        ]) {
          try { BancadaFinance.reverse(o, c.id, c.date, c.reason, new Date().toISOString()); out.push('aceitou:' + c.id); } catch (e) { out.push(e.message); }
        }
        return { out, events: o.financeLedger.events.length, paid: o.paid };
      });
      rec('R05-X03', 'Estorno rejeita justificativa vazia/501, data inválida/anterior, receptor inexistente e alvo que não é recebimento', inv.out.every(x => !x.startsWith('aceitou')) && inv.events === 1 && inv.paid === 25000, JSON.stringify(inv));
      const uiInvalid = await a.evaluate(() => {
        const o = db.orders.find(x => x.id === 20);
        openModal('reverse', 20, 1);
        return { open: document.querySelector('#modal').open, required: document.querySelector('#action-form textarea[name=reason]')?.required, max: document.querySelector('#action-form textarea[name=reason]')?.getAttribute('maxlength') };
      });
      rec('R05-X04', 'Modal de estorno exige justificativa e limita a 500 caracteres', uiInvalid.open && uiInvalid.required === true && uiInvalid.max === '500', JSON.stringify(uiInvalid));
      await a.locator('#modal button[data-action=close]').click();
      const exact = await a.evaluate(() => {
        const o = db.orders.find(x => x.id === 20); const s = BancadaFinance.summary(o);
        const e = BancadaFinance.receive(o, s.balance, today(), 'Transferência', new Date().toISOString());
        return { amount: e.amount, paid: o.paid, balance: BancadaFinance.summary(o).balance };
      });
      rec('R05-X05', 'Recebimento do saldo exato quita sem exceder', exact.amount === 10000 && exact.paid === 35000 && exact.balance === 0, JSON.stringify(exact));
      rec('R05-X06', 'Central e OS sem exceções/erros de console e sem rede externa', errors.length === 0 && consoleErrors.length === 0 && requests.every(u => u.startsWith(BASE) || u.startsWith('data:')), JSON.stringify({ errors, consoleErrors, external: requests.filter(u => !u.startsWith(BASE)).slice(0, 3) }));
      await ctx.close();
    }

    /* X07–X10: datas longas, motivo de 500, duplicidade e teto. */
    {
      const { ctx, a } = await session(browser);
      await goto(a, '#os/20/financeiro');
      const reason = await a.evaluate(() => {
        const o = db.orders.find(x => x.id === 20);
        BancadaFinance.receive(o, 5000, today(), 'Pix', new Date().toISOString());
        const e = BancadaFinance.receive(o, 5000, today(), 'Pix', new Date().toISOString());
        const r = 'R'.repeat(500);
        const ev = BancadaFinance.reverse(o, e.id, today(), r, new Date().toISOString());
        return { reasonLength: ev.reason.length, eventId: e.id, paid: o.paid, events: o.financeLedger.events.length };
      });
      rec('R05-X07', 'Justificativa de exatamente 500 caracteres é aceita', reason.reasonLength === 500 && reason.paid === 25000 && reason.events === 3, JSON.stringify(reason));
      const duplicate = await a.evaluate(id => {
        const o = db.orders.find(x => x.id === 20); const before = o.financeLedger.events.length;
        let msg = ''; try { BancadaFinance.reverse(o, id, today(), 'Duplicado', new Date().toISOString()); } catch (e) { msg = e.message; }
        return { msg, before, after: o.financeLedger.events.length, open: (() => { openModal('reverse', 20, id); return document.querySelector('#modal').open; })() };
      }, reason.eventId);
      rec('R05-X08', 'Segundo estorno do mesmo evento é rejeitado e não abre modal', /já estornado|inexistente/.test(duplicate.msg) && duplicate.before === duplicate.after && duplicate.open === false, JSON.stringify(duplicate));
      await a.evaluate(() => {
        const o = db.orders.find(x => x.id === 22);
        o.total = 999999999; o.paid = 0; o.billing = { due: today() }; o.financeLedger = { opening: 0, events: [] };
        save(); render();
      });
      await goto(a, '#financeiro');
      const ceiling = await a.evaluate(() => ({ text: document.querySelector('#main').innerText, over: document.documentElement.scrollWidth - document.documentElement.clientWidth }));
      rec('R05-X09', 'Valor extremo é formatado e não cria overflow em 1440', /R\$ 9\.999\.999,99/.test(norm(ceiling.text)) && ceiling.over <= 1, JSON.stringify({ over: ceiling.over, has: /R\$ 9\.999\.999,99/.test(norm(ceiling.text)) }));
      await a.setViewportSize({ width: 320, height: 568 }); await a.waitForTimeout(180);
      const narrow = await a.evaluate(() => ({ over: document.documentElement.scrollWidth - document.documentElement.clientWidth, text: document.querySelector('#main').innerText }));
      rec('R05-X10', 'Valor extremo não cria overflow em 320', narrow.over <= 1 && /R\$ 9\.999\.999,99/.test(norm(narrow.text)), JSON.stringify({ over: narrow.over }));
      await ctx.close();
    }

    /* X11–X14: status sem obrigação/cancelada e rotas diretas restritas. */
    {
      const { ctx, a } = await session(browser);
      const guards = await a.evaluate(() => {
        const out = {};
        for (const [label, r] of [['zero', { id: 99, status: 'Aprovado', total: 0, paid: 0 }], ['cancel', { id: 98, status: 'Cancelado', total: 1000, paid: 0 }]]) {
          try { BancadaFinance.receive(r, 100, today(), 'Pix', new Date().toISOString()); out[label] = 'aceitou'; } catch (e) { out[label] = e.message; }
        }
        return out;
      });
      rec('R05-X11', 'OS sem obrigação ou cancelada não aceita recebimento', /indisponível|cancelamento/i.test(guards.zero) && /cancelamento|indisponível/i.test(guards.cancel), JSON.stringify(guards));
      await a.selectOption('#role', 'Técnico'); await a.waitForTimeout(180);
      await goto(a, '#financeiro');
      const home = norm(await a.locator('#main').innerText());
      await goto(a, '#os/20/financeiro');
      const order = norm(await a.locator('#main').innerText());
      await goto(a, '#recibo/20/1');
      const receipt = norm(await a.locator('#main').innerText());
      rec('R05-X12', 'Técnico em rotas diretas não vê valores financeiros', !/R\$/.test(home) && !/R\$/.test(order) && !/R\$/.test(receipt), JSON.stringify({ home: home.slice(0, 50), order: order.slice(0, 50), receipt: receipt.slice(0, 50) }));
      await a.selectOption('#role', 'Atendente'); await a.waitForTimeout(180);
      await goto(a, '#os/20/financeiro');
      rec('R05-X13', 'Atendente em rota direta não vê valores nem ações de estorno', !/R\$/.test(norm(await a.locator('#main').innerText())) && (await a.locator('[data-action^="modal:reverse"]').count()) === 0, 'atendente');
      await a.selectOption('#role', 'Financeiro'); await a.waitForTimeout(150);
      await goto(a, '#os/20/financeiro');
      const noRev = await a.evaluate(() => { openModal('reverse', 20, 1); return document.querySelector('#modal').open; });
      rec('R05-X14', 'Financeiro não abre estorno por rota direta', noRev === false, 'direct');
      await ctx.close();
    }

    /* X15–X17: impressão normal e estornada, e conteúdo longo em 320. */
    {
      const { ctx, a } = await session(browser);
      await goto(a, '#os/20/financeiro');
      const setup = await a.evaluate(() => {
        const o = db.orders.find(x => x.id === 20);
        BancadaFinance.receive(o, 5000, today(), 'Pix', new Date().toISOString());
        save(); render();
        return { paid: o.paid, events: o.financeLedger.events.length };
      });
      await goto(a, '#recibo/20/1');
      const receiptNormal = norm(await a.locator('#main').innerText());
      await a.emulateMedia({ media: 'print' });
      const pdf1 = path.join(OUT, 'recibos', 'recibo-normal-os20.pdf');
      await a.pdf({ path: pdf1, format: 'A4', printBackground: true });
      await a.emulateMedia({ media: 'screen' });
      await goto(a, '#os/20/financeiro');
      await a.evaluate(() => { const o = db.orders.find(x => x.id === 20); BancadaFinance.reverse(o, 1, today(), 'Impressão de teste', new Date().toISOString()); save(); render(); });
      await goto(a, '#recibo/20/1');
      const receiptReversedText = norm(await a.locator('#main').innerText());
      await a.emulateMedia({ media: 'print' });
      const pdf2 = path.join(OUT, 'recibos', 'recibo-estornado-os20.pdf');
      await a.pdf({ path: pdf2, format: 'A4', printBackground: true });
      await a.emulateMedia({ media: 'screen' });
      rec('R05-X15', 'Recibo normal e estornado imprimem com marcas distintas', setup.events === 1 && /Recebimento registrado/.test(receiptNormal) && /ESTORNADO/.test(receiptReversedText) && fs.statSync(pdf1).size > 1000 && fs.statSync(pdf2).size > 1000, JSON.stringify({ normal: fs.statSync(pdf1).size, reversed: fs.statSync(pdf2).size }));
      rec('R05-X16', 'Recibo estornado preserva o valor original no PDF', /R\$ 50,00/.test(receiptReversedText), 'amount');
      await a.setViewportSize({ width: 320, height: 568 }); await a.waitForTimeout(180);
      const over = await a.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      rec('R05-X17', 'Recibo em 320 não cria overflow horizontal', over <= 1, JSON.stringify({ over }));
      await a.evaluate(() => { const c = db.clients.find(x => x.id === 1); c.name = 'Cliente ' + 'A'.repeat(180); const o = db.orders.find(x => x.id === 20); o.brand = 'Marca ' + 'B'.repeat(100); o.model = 'Modelo ' + 'C'.repeat(100); save(); render(); });
      await goto(a, '#financeiro'); await a.setViewportSize({ width: 320, height: 568 }); await a.waitForTimeout(150);
      const longText = await a.evaluate(() => ({ over: document.documentElement.scrollWidth - document.documentElement.clientWidth, text: document.querySelector('#finance-results').innerText }));
      rec('R05-X18', 'Cliente/equipamento longos não criam overflow em 320', longText.over <= 1 && /Cliente AAAAA/.test(longText.text) && /Marca BBBBB/.test(longText.text), JSON.stringify({ over: longText.over }));
      await ctx.close();
    }

    fs.writeFileSync(path.join(OUT, 'testes', 'edge-resultados.json'), JSON.stringify({ generatedAt: new Date().toISOString(), codeSha: process.env.CODE_SHA || '', incrementSha: process.env.INCREMENT_SHA || '', results }, null, 2));
    const pass = results.filter(r => r.status === 'PASS').length, fail = results.filter(r => r.status === 'FAIL').length;
    console.log(`TOTAL ${results.length} · PASS ${pass} · FAIL ${fail}`);
  } finally { await browser.close(); }
})().catch(e => { console.error('FATAL', e); process.exit(1); });
