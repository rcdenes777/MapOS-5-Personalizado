'use strict';
/*
 * R06-002 — handler real de andamento (app.js) + cancelLive + confirmação de
 * cancelamento ainda possível. Chromium real, dados fictícios em localStorage.
 */
const fs = require('node:fs');
const path = require('node:path');
const {
  BASE, OUT, makeRecorder, launch, session, goto, open, closeModal, order,
  requestCancel, withdrawCancel, conferTechnical, confirmAcerto, mainText
} = require('./lib.cjs');

const { results, rec } = makeRecorder();
const EXACT = 'Resolva ou retire o pedido de cancelamento antes de finalizar a OS.';

const state = async (a, id) => a.evaluate(i => {
  const o = db.orders.find(x => x.id === i);
  return JSON.parse(JSON.stringify({
    status: o.status, conclusion: o.conclusion || null, total: o.total, paid: o.paid,
    approval: o.approval, delivery: o.delivery || null, history: o.history.map(h => h.text),
    cancellation: o.cancellation || null, ledger: o.financeLedger || null,
    stored: localStorage.getItem('mapos-bancada-prototype-v1')
  }));
}, id);

async function techFinalize(a, id) {
  if (!(await open(a, 'tech', id))) throw new Error('modal de andamento não abriu para OS ' + id);
  await a.selectOption('#action-form select[name=status]', 'Finalizado');
  await a.check('#action-form input[name=confirm]');
  const before = await state(a, id);
  await a.locator('#action-form button[type=submit]').click();
  await a.waitForTimeout(320);
  const ui = await a.evaluate(() => {
    const m = document.querySelector('#modal'), t = document.querySelector('#toast');
    return {
      open: m.open,
      toast: t && !t.hidden ? t.textContent : '',
      error: document.querySelector('#modal-error')?.hidden === false ? document.querySelector('#modal-error').textContent : ''
    };
  });
  return { ui, before, after: await state(a, id) };
}

(async () => {
  const browser = await launch();
  try {
    const { ctx, a, errors, consoleErrors, requests } = await session(browser, 1440, 900, 'r06b-handler');

    /* ---- OS #022 aprovada, pedido pendente e conferência técnica feita ---- */
    let st = await requestCancel(a, 22, 'cliente', 'Pedido pendente para o handler R06-002.');
    rec('R06B-01', 'OS aprovada recebe pedido de cancelamento pendente',
      !st.open && (await a.evaluate(() => BancadaCancel.pending(db.orders.find(o => o.id === 22)))),
      JSON.stringify(st));

    st = await conferTechnical(a, 22, 'Peças conciliadas e serviço executado conferido — R06-002.');
    rec('R06B-02', 'Conferência técnica concluída antes do teste do handler',
      !st.open && (await a.evaluate(() => BancadaCancel.technical(db.orders.find(o => o.id === 22)))),
      JSON.stringify(st));

    /* ---- cancelLive: cálculo, bloco de devolução e entrada inválida ---- */
    await goto(a, '#os/22/cancelamento');
    const opened = await open(a, 'cancelconfirm', 22);
    rec('R06B-03', 'Modal de acerto abre após a conferência técnica', opened === true, String(opened));
    const live = {};
    if (opened) {
      await a.fill('#action-form input[name=gross]', '320.00');
      await a.fill('#action-form input[name=discount]', '0.00');
      await a.waitForTimeout(180);
      live.balance = await a.evaluate(() => ({
        text: document.querySelector('#cancel-calculation').innerText,
        hidden: document.querySelector('#cancel-refund').hidden,
        refundDisabled: document.querySelector('#action-form input[name=refund]').disabled
      }));
      await a.fill('#action-form input[name=gross]', '0.00');
      await a.waitForTimeout(180);
      live.refund = await a.evaluate(() => ({
        text: document.querySelector('#cancel-calculation').innerText,
        hidden: document.querySelector('#cancel-refund').hidden,
        refundDisabled: document.querySelector('#action-form input[name=refund]').disabled,
        dateRequired: document.querySelector('#action-form input[name=date]').required,
        refRequired: document.querySelector('#action-form input[name=ref]').required
      }));
      await a.evaluate(() => {
        const i = document.querySelector('#action-form input[name=gross]');
        i.value = 'abc';
        i.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await a.waitForTimeout(160);
      live.invalid = await a.evaluate(() => ({
        text: document.querySelector('#cancel-calculation').innerText,
        hidden: document.querySelector('#cancel-refund').hidden,
        refundDisabled: document.querySelector('#action-form input[name=refund]').disabled
      }));
      await closeModal(a);
    }
    const norm = s => String(s).replace(/\u00a0/g, ' ');
    rec('R06B-04', 'cancelLive calcula saldo a receber sem bloco de devolução',
      opened && /A receber:\s*R\$\s*220,00/.test(norm(live.balance?.text)) && live.balance.hidden === true && live.balance.refundDisabled === true,
      JSON.stringify(live.balance));
    rec('R06B-05', 'cancelLive calcula devolução e habilita data/forma/referência',
      opened && /A devolver:\s*R\$\s*100,00/.test(norm(live.refund?.text)) && live.refund.hidden === false && live.refund.refundDisabled === false && live.refund.dateRequired === true && live.refund.refRequired === true,
      JSON.stringify(live.refund));
    rec('R06B-06', 'cancelLive rejeita valor não monetário e volta a ocultar a devolução',
      opened && /Confira valor e desconto\./.test(norm(live.invalid?.text)) && live.invalid.hidden === true && live.invalid.refundDisabled === true,
      JSON.stringify(live.invalid));

    /* ---- handler real: Finalizado com pedido pendente deve ser bloqueado antes de mutar ---- */
    const blocked = await techFinalize(a, 22);
    rec('R06B-07', 'Handler real rejeita Finalizado com pedido pendente e mensagem original exata',
      blocked.ui.open === true && blocked.ui.toast === EXACT && !blocked.ui.error,
      JSON.stringify(blocked.ui));
    rec('R06B-08', 'Finalização bloqueada não altera status, conclusão, histórico, financeiro ou pedido',
      blocked.after.status === blocked.before.status && blocked.after.conclusion === blocked.before.conclusion &&
      JSON.stringify(blocked.after.history) === JSON.stringify(blocked.before.history) &&
      JSON.stringify(blocked.after.cancellation) === JSON.stringify(blocked.before.cancellation) &&
      JSON.stringify(blocked.after.ledger) === JSON.stringify(blocked.before.ledger) &&
      blocked.after.total === blocked.before.total && blocked.after.paid === blocked.before.paid &&
      blocked.after.delivery === blocked.before.delivery,
      JSON.stringify({ before: blocked.before, after: blocked.after }).slice(0, 900));
    rec('R06B-09', 'Finalização bloqueada não grava no localStorage', blocked.after.stored === blocked.before.stored,
      'stored bytes ' + String(blocked.before.stored || '').length);
    await closeModal(a);

    /* ---- controle positivo: retirar o pedido e então finalizar ---- */
    st = await withdrawCancel(a, 22, 'Pedido retirado para o controle positivo R06-002.');
    const afterWithdraw = await state(a, 22);
    rec('R06B-10', 'Controle positivo: pedido retirado deixa a OS sem pendência',
      !st.open && afterWithdraw.cancellation.events.at(-1).type === 'withdraw' &&
      (await a.evaluate(() => !BancadaCancel.pending(db.orders.find(o => o.id === 22)))),
      JSON.stringify(st));

    const positive = await techFinalize(a, 22);
    rec('R06B-11', 'Controle positivo: após a retirada, Finalizado é aceito e grava conclusão',
      positive.ui.open === false && positive.after.status === 'Finalizado' && !!positive.after.conclusion &&
      positive.after.history.at(-1) === 'Andamento: Finalizado' &&
      positive.after.cancellation.events.at(-1).type === 'withdraw',
      JSON.stringify({ ui: positive.ui, status: positive.after.status, conclusion: positive.after.conclusion, last: positive.after.history.at(-1) }));

    /* ---- confirmação de cancelamento ainda possível (outra OS) ---- */
    st = await requestCancel(a, 21, 'assistencia', 'Cancelamento para provar que a confirmação segue possível — R06-002.');
    rec('R06B-12', 'OS #021 recebe pedido pendente para o fluxo completo',
      !st.open && (await a.evaluate(() => BancadaCancel.pending(db.orders.find(o => o.id === 21)))),
      JSON.stringify(st));
    st = await conferTechnical(a, 21, 'Serviço/peças conferidos no fluxo de confirmação R06-002.');
    rec('R06B-13', 'Conferência técnica da OS #021 concluída',
      !st.open && (await a.evaluate(() => BancadaCancel.technical(db.orders.find(o => o.id === 21)))),
      JSON.stringify(st));
    st = await confirmAcerto(a, 21, { gross: 28000, discount: 0, reason: 'Acerto fictício R06-002; confirmação ainda possível.' });
    const confirmed = await order(a, 21);
    const text = await mainText(a);
    rec('R06B-14', 'Confirmação de cancelamento continua possível após a correção',
      !st.open && confirmed.status === 'Cancelado' &&
      confirmed.cancellation.events.at(-1).type === 'confirm' &&
      confirmed.cancellation.events.at(-1).settlement.total === 28000 &&
      !confirmed.delivery,
      JSON.stringify({ status: confirmed.status, last: confirmed.cancellation.events.at(-1)?.type, total: confirmed.cancellation.events.at(-1)?.settlement?.total }));
    rec('R06B-15', 'Painel concluído exibe o acerto e mantém a retirada independente',
      /Cancelamento concluído/.test(text) && /Valor final devido/.test(text) && /O cancelamento não registra a retirada física/.test(text),
      text.slice(0, 260));

    rec('R06B-16', 'Sem exceções, erros de console ou requisições externas no handler R06-002',
      errors.length === 0 && consoleErrors.length === 0 && requests.every(u => u.startsWith(BASE) || u.startsWith('data:')),
      JSON.stringify({ errors, consoleErrors, external: requests.filter(u => !u.startsWith(BASE) && !u.startsWith('data:')).slice(0, 4) }));

    await ctx.close();

    fs.writeFileSync(process.env.RESULT_PATH || path.join(OUT, 'testes', 'handler-tech-resultados.json'), JSON.stringify({
      generatedAt: new Date().toISOString(), codeSha: process.env.CODE_SHA || '', results
    }, null, 2));
    const pass = results.filter(r => r.status === 'PASS').length;
    const fail = results.filter(r => r.status === 'FAIL').length;
    console.log(`\nTOTAL ${results.length} · PASS ${pass} · FAIL ${fail}`);
    if (fail) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch(e => { console.error('FATAL', e); process.exit(1); });
