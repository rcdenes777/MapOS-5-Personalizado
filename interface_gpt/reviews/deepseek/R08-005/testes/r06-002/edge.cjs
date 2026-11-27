'use strict';
/*
 * R06 — bordas, limites, privacidade, responsividade e operações diretas.
 * Navegador real; servidor estático em BASE_URL.
 */
const fs = require('node:fs');
const path = require('node:path');
const {
  BASE, OUT, makeRecorder, launch, session, goto, open, closeModal, submit, order, stock,
  createOrder, setQuote, publish, formalize, requestCancel, withdrawCancel, conferPiece,
  conferTechnical, confirmAcerto, pay, reverse, rectify, deliver, role, mainText, actionCount,
  portalProjection, lineIdByName
} = require('./lib.cjs');

const { results, rec } = makeRecorder();
const today = a => a.evaluate(() => today());

(async () => {
  const browser = await launch();
  try {
    /* E1 — limites do pedido, item, conferência e acerto. */
    {
      const { ctx, a, errors, consoleErrors, requests } = await session(browser, 1440, 900, 'r06e1');
      const created = await createOrder(a, { brand: 'Limites', model: 'R06', defect: 'Bordas de cancelamento R06.' });
      const id = created.id;
      await setQuote(a, id, [
        { type: 'Peça', name: 'Peça limite', quantity: 2, unit: 1000 },
        { type: 'Serviço', name: 'Serviço limite', quantity: 2, unit: 1000 }
      ], 100);
      await publish(a, id);
      const limits = await a.evaluate(i => {
        const o = db.orders.find(x => x.id === i);
        const now = new Date().toISOString();
        const out = {};
        const check = (name, fn) => { try { fn(); out[name] = 'accepted'; } catch (e) { out[name] = e.message; } };
        check('origin', () => BancadaCancel.request(o, 'telefone', 'Motivo', now, db.orders));
        check('reason2001', () => BancadaCancel.request(o, 'cliente', 'X'.repeat(2001), now, db.orders));
        BancadaCancel.request(o, 'cliente', 'Motivo válido R06', now, db.orders);
        const lineP = BancadaCancel.lines(o).find(x => x.name === 'Peça limite');
        const lineS = BancadaCancel.lines(o).find(x => x.name === 'Serviço limite');
        const rm = (line, qty, disposition, reason) => BancadaCancel.remove(o, line.lineId, qty, disposition, reason, now, db.orders, BancadaCancel.itemKey(o, line));
        for (const q of [0, -1, 1.5, 3, 9999]) check('qty' + q, () => rm(lineP, q, 'unused', ''));
        check('disposition', () => rm(lineP, 1, 'recycled', ''));
        check('servicePartial', () => rm(lineS, 1, 'notdone', ''));
        check('lostReason2001', () => rm(lineP, 1, 'lost', 'Y'.repeat(2001)));
        check('conferNoPieces', () => BancadaCancel.confer(o, true, 'Z'.repeat(2001), now, db.orders));
        return out;
      }, id);
      rec('R06-E01', 'Pedido rejeita origem inválida e motivo acima de 2000', /quem solicitou/i.test(limits.origin) && /motivo|observa/i.test(limits.reason2001), JSON.stringify(limits));
      rec('R06-E02', 'Quantidade inválida e destino inválido são rejeitados', ['qty0', 'qty-1', 'qty1.5', 'qty3', 'qty9999', 'disposition', 'servicePartial'].every(k => /inválid|Destino/.test(limits[k])), JSON.stringify(limits));
      rec('R06-E03', 'Motivo de perda acima de 2000 é rejeitado', /motivo|observa/i.test(limits.lostReason2001), JSON.stringify({ lost: limits.lostReason2001 }));

      // Finish the piece conference through the UI to reach the acerto.
      await conferPiece(a, id, await lineIdByName(a, id, 'Peça limite'), { disposition: 'lost', quantity: 2, reason: 'Peça limite consumida R06.' });
      await conferPiece(a, id, await lineIdByName(a, id, 'Serviço limite'), { disposition: null });
      const notes2001 = await a.evaluate(i => {
        const o = db.orders.find(x => x.id === i); const before = o.cancellation.events.length;
        let err = ''; try { BancadaCancel.confer(o, true, 'Z'.repeat(2001), new Date().toISOString(), db.orders); } catch (e) { err = e.message; }
        return { err, before, after: o.cancellation.events.length };
      }, id);
      await conferTechnical(a, id, 'Limites de conferência R06.');
      const tech = await a.evaluate(i => BancadaCancel.technical(db.orders.find(x => x.id === i)), id);
      rec('R06-E04', 'Observação técnica acima de 2000 é rejeitada e a conferência válida é concluída', /motivo|observa/i.test(notes2001.err) && notes2001.before === notes2001.after && tech === true, JSON.stringify({ notes2001, tech }));

      const calc = await a.evaluate(i => {
        const o = db.orders.find(x => x.id === i);
        const out = {};
        const run = (name, fn) => { try { out[name] = fn(); } catch (e) { out[name] = e.message; } };
        run('negativeDiscount', () => BancadaCancel.calculate(o, 1000, -1));
        run('discountAboveGross', () => BancadaCancel.calculate(o, 1000, 1001));
        run('fraction', () => BancadaCancel.calculate(o, 1.5, 0));
        run('tooLarge', () => BancadaCancel.calculate(o, 1000000000, 0));
        out.zero = BancadaCancel.calculate(o, 0, 0);
        out.full = BancadaCancel.calculate(o, 999999999, 0);
        return out;
      }, id);
      rec('R06-E05', 'Cálculo rejeita desconto negativo/maior e valor fora do limite', /inválid/i.test(calc.negativeDiscount) && /inválid/i.test(calc.discountAboveGross) && /inválid/i.test(calc.fraction) && /inválid/i.test(calc.tooLarge) && calc.zero.refund === 0 && calc.full.total === 999999999, JSON.stringify(calc));

      const confirmLimits = await a.evaluate(i => {
        const o = db.orders.find(x => x.id === i);
        const key = BancadaCancel.financialKey(o);
        const base = { key, gross: 1000, discount: 0, refund: 0, date: today(), method: 'Pix', ref: 'X', confirm: true, financialConfirmed: true, settlementConfirmed: true, reason: 'Acerto R06' };
        const out = {};
        const run = (name, patch) => { try { BancadaCancel.confirm(o, { ...base, ...patch }, new Date().toISOString(), today(), db.orders); out[name] = 'accepted'; } catch (e) { out[name] = e.message; } };
        run('noReason', { reason: '' });
        run('reason2001', { reason: 'R'.repeat(2001) });
        run('grossTooLarge', { gross: 1000000000 });
        run('discountAboveGross', { gross: 100, discount: 101 });
        return { out, status: o.status, events: o.cancellation.events.map(e => e.type) };
      }, id);
      rec('R06-E06', 'Confirmação exige justificativa e rejeita valor/desconto fora do limite', /motivo|observa/i.test(confirmLimits.out.reason2001) && /inválid/i.test(confirmLimits.out.grossTooLarge) && /inválid/i.test(confirmLimits.out.discountAboveGross) && confirmLimits.status !== 'Cancelado', JSON.stringify(confirmLimits));

      // UI: 2000-character reason at 320 px must wrap without horizontal overflow.
      await a.setViewportSize({ width: 320, height: 568 });
      await goto(a, `#os/${id}/cancelamento`);
      const longReason = 'Motivo longo R06 ' + 'palavra '.repeat(240);
      await a.evaluate(({ i, text }) => {
        const o = db.orders.find(x => x.id === i);
        // Replace the acceptably-sized request reason through the model for layout stress.
        o.cancellation.events.find(e => e.type === 'request').reason = text.slice(0, 2000);
        save(); render();
      }, { i: id, text: longReason });
      await a.waitForTimeout(200);
      const overflow320 = await a.evaluate(() => ({ doc: document.documentElement.scrollWidth, win: innerWidth, main: document.querySelector('#main').scrollWidth, mainClient: document.querySelector('#main').clientWidth }));
      rec('R06-E07', 'Motivo de 2000 caracteres não cria overflow em 320 px', overflow320.doc <= overflow320.win && overflow320.main <= overflow320.mainClient + 1, JSON.stringify(overflow320));

      // Escaping of user text in the panel and history.
      const xss = await a.evaluate(i => {
        const o = db.orders.find(x => x.id === i);
        o.cancellation.events.find(e => e.type === 'request').reason = '<img src=x onerror="window.__r06xss=1">R06';
        save(); render();
        return { flag: window.__r06xss, html: document.querySelector('#main').innerHTML };
      }, id);
      rec('R06-E08', 'Motivo é escapado e não executa HTML', xss.flag === undefined && xss.html.includes('&lt;img') && !xss.html.includes('<img src=x'), JSON.stringify({ flag: xss.flag, escaped: xss.html.includes('&lt;img') }));

      // Responsive widths of the full flow.
      const widths = [[320, 568], [390, 844], [768, 1024], [1440, 900]];
      const overflows = [];
      for (const [w, h] of widths) {
        await a.setViewportSize({ width: w, height: h });
        for (const hash of [`#os/${id}/cancelamento`, `#os/${id}`]) {
          await goto(a, hash);
          const m = await a.evaluate(() => ({ doc: document.documentElement.scrollWidth, win: innerWidth }));
          if (m.doc > m.win) overflows.push({ w, hash, m });
        }
      }
      rec('R06-E09', 'Cancelamento e detalhe não têm overflow horizontal em 320/390/768/1440', overflows.length === 0, JSON.stringify(overflows));

      rec('R06-E10', 'Sem exceções ou erros de console nas bordas E1', errors.length === 0 && consoleErrors.length === 0, JSON.stringify({ errors, consoleErrors }));
      rec('R06-E11', 'Bordas E1 não fizeram requisições externas', requests.every(u => u.startsWith(BASE) || u.startsWith('data:')), JSON.stringify(requests.filter(u => !u.startsWith(BASE)).slice(0, 3)));
      await ctx.close();
    }

    /* E2 — privacidade entre perfis e limites do legado. */
    {
      const { ctx, a, errors, consoleErrors } = await session(browser, 1440, 900, 'r06e2');
      const created = await createOrder(a, { brand: 'Privacidade', model: 'R06', defect: 'Privacidade do acerto R06.' });
      const id = created.id;
      await setQuote(a, id, [{ type: 'Serviço', name: 'Serviço reservado', quantity: 1, unit: 10000 }], 0);
      await publish(a, id); await formalize(a, id); await pay(a, id, 10000, { method: 'Pix' });
      await requestCancel(a, id, 'cliente', 'Pedido privado R06.');
      await conferTechnical(a, id, 'Conferência privada R06.');
      const sentinel = 'JUSTIFICATIVA-PRIVADA-R06-9f3c';
      await confirmAcerto(a, id, { gross: 10000, discount: 0, reason: sentinel });
      let o = await order(a, id);
      rec('R06-E12', 'Cancelamento sem pendência confirmado para a prova de privacidade', o.status === 'Cancelado' && o.total === 10000 && o.paid === 10000, JSON.stringify({ status: o.status, total: o.total, paid: o.paid }));

      await role(a, 'Técnico');
      await goto(a, `#os/${id}/cancelamento`);
      await a.evaluate(() => { document.querySelectorAll('#main details').forEach(d => { d.open = true; }); });
      const techText = await mainText(a);
      const techHtml = await a.evaluate(() => document.querySelector('#main').innerHTML);
      rec('R06-E13', 'Técnico não vê justificativa financeira nem valores do acerto', !techText.includes(sentinel) && !/R\$/.test(techText) && !techHtml.includes(sentinel), techText.slice(0, 220));

      await role(a, 'Financeiro');
      await goto(a, `#os/${id}/cancelamento`);
      await a.evaluate(() => { document.querySelectorAll('#main details').forEach(d => { d.open = true; }); });
      const finText = await mainText(a);
      rec('R06-E14', 'Financeiro vê a justificativa e os valores do acerto', finText.includes(sentinel) && /R\$ 100,00/.test(finText), finText.slice(0, 260));

      await role(a, 'Técnico');
      const normalReverse = await a.evaluate(i => {
        const o = db.orders.find(x => x.id === i); const before = o.financeLedger.events.length;
        let err = ''; try { financialSubmit('reverse', o, { eventId: '1', date: today(), reason: 'Tentativa', confirm: true }); } catch (e) { err = e.message; }
        return { err, before, after: o.financeLedger.events.length };
      }, id);
      const payTech = await a.evaluate(i => {
        const o = db.orders.find(x => x.id === i); const before = o.financeLedger.events.length;
        let err = ''; try { financialSubmit('pay', o, { amount: '10.00', date: today(), method: 'Pix' }); } catch (e) { err = e.message; }
        return { err, before, after: o.financeLedger.events.length, modal: (openModal('pay', i), document.querySelector('#modal').open) };
      }, id);
      await role(a, 'Atendente');
      const payAtt = await a.evaluate(i => {
        const o = db.orders.find(x => x.id === i); const before = o.financeLedger.events.length;
        let err = ''; try { financialSubmit('pay', o, { amount: '10.00', date: today(), method: 'Pix' }); } catch (e) { err = e.message; }
        return { err, before, after: o.financeLedger.events.length };
      }, id);
      await role(a, 'Administrador');
      const legacyReverse = await a.evaluate(i => {
        const o = db.orders.find(x => x.id === i); const before = o.financeLedger.events.length;
        let err = ''; try { financialSubmit('reverse', o, { eventId: '1', date: today(), reason: 'Tentativa', confirm: true }); } catch (e) { err = e.message; }
        return { err, before, after: o.financeLedger.events.length };
      }, id);
      rec('R06-E15', 'Estorno normal é bloqueado em acerto sem pendência; só a retificação é oferecida', /autorizada|permissão/i.test(normalReverse.err) && /retificação/i.test(legacyReverse.err) && legacyReverse.before === legacyReverse.after, JSON.stringify({ normalReverse, legacyReverse }));
      rec('R06-E15-B', 'Recebimento direto é bloqueado para Técnico e Atendente', /autorizada/i.test(payTech.err) && !payTech.modal && payTech.before === payTech.after && /autorizada/i.test(payAtt.err) && payAtt.before === payAtt.after, JSON.stringify({ payTech, payAtt }));

      // Legacy order with scalar paid and no ledger.
      await goto(a, '#os/20/financeiro');
      const legacy = await a.evaluate(() => {
        const o = db.orders.find(x => x.id === 20);
        return { status: o.status, ledger: o.financeLedger, rectify: document.querySelectorAll('[data-action^="modal:rectify:20"]').length, reverse: document.querySelectorAll('[data-action^="modal:reverse:20"]').length };
      });
      rec('R06-E16', 'Caso legado não oferece retificação nem estorno sem recibos individuais', legacy.status === 'Finalizado' && legacy.rectify === 0 && legacy.reverse === 0, JSON.stringify(legacy));
      rec('R06-E17', 'Sem exceções ou erros de console na E2', errors.length === 0 && consoleErrors.length === 0, JSON.stringify({ errors, consoleErrors }));
      await ctx.close();
    }

    /* E3 — acerto com valor extremo e resposta do portal. */
    {
      const { ctx, a, errors, consoleErrors } = await session(browser, 1440, 900, 'r06e3');
      const created = await createOrder(a, { brand: 'Extremo', model: 'R06', defect: 'Valor extremo R06.' });
      const id = created.id;
      await requestCancel(a, id, 'cliente', 'Cancelamento de valor extremo R06.');
      await conferTechnical(a, id, 'Conferência de valor extremo R06.');
      const confirm = await a.evaluate(i => {
        const o = db.orders.find(x => x.id === i);
        try {
          BancadaCancel.confirm(o, { key: BancadaCancel.financialKey(o), gross: 999999999, discount: 0, refund: 0, confirm: true, financialConfirmed: true, settlementConfirmed: true, reason: 'Valor extremo R06' }, new Date().toISOString(), today(), db.orders);
          return { ok: true, total: o.total, paid: o.paid, status: o.status };
        } catch (e) { return { ok: false, error: e.message }; }
      }, id);
      rec('R06-E18', 'Acerto aceita o teto de R$ 9.999.999,99 sem overflow de cálculo', confirm.ok && confirm.total === 999999999 && confirm.status === 'Cancelado', JSON.stringify(confirm));
      await a.setViewportSize({ width: 320, height: 568 });
      await goto(a, `#os/${id}/cancelamento`);
      await a.evaluate(() => render());
      await a.waitForTimeout(150);
      const extreme = await a.evaluate(() => ({ doc: document.documentElement.scrollWidth, win: innerWidth, text: document.querySelector('#main').innerText }));
      rec('R06-E19', 'Valor extremo não cria overflow em 320 px', extreme.doc <= extreme.win && /9\.999\.999,99/.test(extreme.text), JSON.stringify({ doc: extreme.doc, win: extreme.win, has: /9\.999\.999,99/.test(extreme.text) }));

      const token = await a.evaluate(i => {
        const o = db.orders.find(x => x.id === i);
        BancadaPortal.issue(o, BancadaPortal.token());
        save(); return o.publicLink.token;
      }, id);
      const p = await ctx.newPage();
      const pErrors = [];
      p.on('pageerror', e => pErrors.push(e.message));
      await p.goto(`${BASE}/portal.html#${token}`, { waitUntil: 'networkidle' });
      await p.waitForTimeout(250);
      const pt = (await p.locator('#customer-main').innerText()).replace(/\u00a0/g, ' ');
      rec('R06-E20', 'Portal mostra o total extremo sem orçamento disponível', /R\$ 9\.999\.999,99/.test(pt) && /Não há orçamento publicado/.test(pt), pt.slice(0, 500));
      rec('R06-E21', 'Portal sem exceções', pErrors.length === 0 && errors.length === 0 && consoleErrors.length === 0, JSON.stringify({ pErrors, errors, consoleErrors }));
      await p.close();
      await ctx.close();
    }

    /* E4 — modelo: motivo no limite, pedido duplicado e persistência de eventos. */
    {
      const { ctx, a } = await session(browser, 1440, 900, 'r06e4');
      const exact = 'E'.repeat(2000);
      const created = await createOrder(a, { brand: 'Limite', model: '2000', defect: 'Motivo exato R06.' });
      const id = created.id;
      const st = await requestCancel(a, id, 'cliente', exact);
      let o = await order(a, id);
      rec('R06-E22', 'Motivo com exatamente 2000 caracteres é aceito e persistido', !st.open && o.cancellation.events[0].reason.length === 2000, JSON.stringify({ open: st.open, len: o.cancellation.events[0]?.reason?.length }));
      await goto(a, '#inicio');
      await a.reload({ waitUntil: 'networkidle' });
      await goto(a, `#os/${id}/cancelamento`);
      o = await order(a, id);
      rec('R06-E23', 'Pedido e motivo persistem após recarregar', o.cancellation.events[0].reason.length === 2000 && (await a.evaluate(() => BancadaCancel.pending(db.orders.find(x => x.id === Number(location.hash.split('/')[1]))))), 'reload');
      const dupDirect = await a.evaluate(i => {
        const o = db.orders.find(x => x.id === i); const before = o.cancellation.events.length;
        let err = ''; try { BancadaCancel.request(o, 'cliente', 'Duplicado', new Date().toISOString(), db.orders); } catch (e) { err = e.message; }
        return { err, before, after: o.cancellation.events.length };
      }, id);
      rec('R06-E24', 'Pedido duplicado após recarregar continua bloqueado', /pendente/i.test(dupDirect.err) && dupDirect.before === dupDirect.after, JSON.stringify(dupDirect));
      await ctx.close();
    }

    fs.writeFileSync(path.join(OUT, 'testes', 'edge-resultados.json'), JSON.stringify({
      generatedAt: new Date().toISOString(), codeSha: process.env.CODE_SHA || '', incrementSha: process.env.INCREMENT_SHA || '', results
    }, null, 2));
    const pass = results.filter(r => r.status === 'PASS').length, fail = results.filter(r => r.status === 'FAIL').length;
    console.log(`\nTOTAL ${results.length} · PASS ${pass} · FAIL ${fail}`);
    if (fail) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch(e => { console.error('FATAL', e); process.exit(1); });
