'use strict';
/*
 * R07-002 — navegador real: devolução de garantia, correção, F02 e raízes.
 * Chromium via playwright-core; dados fictícios em localStorage.
 * Requer servidor estático em BASE_URL.
 */
const fs = require('node:fs');
const path = require('node:path');
const {
  BASE, OUT, makeRecorder, launch, session, goto, open, closeModal, submit, modalState,
  order, role, mainText, toastText, actionCount, portalProjection
} = require('./lib.cjs');

const { results, rec } = makeRecorder();
const todayOf = async a => a.evaluate(() => today());

async function fixture(a) {
  return a.evaluate(() => {
    const now = '2026-11-26T12:00:00Z', day = '2026-11-26';
    db = seed();
    const nextId = () => Math.max(0, ...db.orders.map(o => o.id)) + 1;
    const origin = (opts = {}) => {
      const { total = 50000, paid = 20000, billing = true, ledger = true, days = 90, unit = null, conclusion = '2026-09-01', client = 1, brand = 'LG', model = 'Inverter' } = opts;
      const o = {
        id: nextId(), client, unit: unit || null, brand, model, type: 'Placa eletrônica', status: 'Finalizado',
        entry: '2026-08-20', conclusion, warrantyDays: days, total, paid: 0, approval: 'Aprovado', delivery: null,
        history: [{ time: '2026-08-20T10:00:00Z', text: 'Entrada original fictícia' }]
      };
      if (!o.unit) o.unit = o.id;
      if (billing) o.billing = { due: '2026-12-20', items: [{ type: 'Serviço', name: 'Serviço original', quantity: 1, unit: total }], discount: 0 };
      if (ledger) { if (paid) BancadaFinance.receive(o, paid, '2026-11-25', 'Pix', now); } else { o.paid = paid; }
      db.orders.push(o);
      return o;
    };
    const ret = (o, opts = {}) => {
      const r = BancadaWarranty.create(o, db.orders, { defect: opts.defect || 'Falha após o reparo', confirm: true }, day);
      db.orders.push(r);
      if (opts.assess !== false) {
        BancadaWarranty.assess(r, db.orders, {
          coverage: 'coberto', solution: opts.solution || 'devolucao_valor', diagnosis: 'Falha confirmada', reason: 'Acordo fictício', previous: 0, confirm: true
        }, now, 'Administrador');
      }
      return r;
    };
    const ids = {};
    const o30 = origin(); const r31 = ret(o30); ids.partial = [o30.id, r31.id];
    const o32 = origin(); const r33 = ret(o32); ids.inverse = [o32.id, r33.id];
    const o34 = origin({ paid: 0 }); const r35 = ret(o34); ids.zero = [o34.id, r35.id];
    const o36 = origin(); const r37 = ret(o36); ids.pay = [o36.id, r37.id];
    const o38 = origin({ billing: false, ledger: false }); const r39 = ret(o38); ids.legacy = [o38.id, r39.id];
    const o44 = origin(); const r45 = ret(o44); ids.reverse = [o44.id, r45.id];
    const o46 = origin(); const r47 = ret(o46); ids.neg = [o46.id, r47.id];
    const o50 = origin(); const r51 = ret(o50); ids.f02 = [o50.id, r51.id];
    const o52 = origin(); const r53 = ret(o52); ids.pending = [o52.id, r53.id];
    const o54 = origin(); const r55 = ret(o54); ids.corr = [o54.id, r55.id];
    // raízes independentes: A e B são duas OS finalizadas da mesma unidade (40)
    const rootA = origin({ unit: 40, days: 90, conclusion: '2026-09-01', total: 30000, paid: 30000, client: 3, brand: 'Daikin', model: 'EcoSwing' });
    const retA = ret(rootA); retA.status = 'Finalizado'; retA.conclusion = day;
    const rootB = origin({ unit: 40, days: 180, conclusion: '2026-10-01', total: 40000, paid: 0, client: 3, brand: 'Daikin', model: 'EcoSwing' });
    ids.roots = [rootA.id, retA.id, rootB.id];
    db.orders.find(o => o.id === 18).warranty = undefined;
    db.orders.find(o => o.id === 18).coverage = 'Em avaliação';
    save(); render();
    return ids;
  });
}

async function refundModal(a, retId) {
  await goto(a, `#os/${retId}/garantia`);
  if (!(await open(a, 'warrantyRefund', retId))) return null;
  return a.evaluate(() => {
    const f = document.querySelector('#action-form');
    return {
      mode: f.elements.mode.value, method: f.elements.method.value, amount: f.elements.amount.value,
      amountReadOnly: f.elements.amount.readOnly, amountMax: f.elements.amount.getAttribute('max'),
      date: f.elements.date.value, dateMax: f.elements.date.getAttribute('max'), dateMin: f.elements.date.getAttribute('min'),
      reference: f.elements.reference.value, reason: f.elements.reason.value, confirm: f.elements.confirm.checked,
      preview: (document.querySelector('#warranty-refund-preview')?.textContent || '').replace(/\u00a0/g,' ')
    };
  });
}

async function fillRefund(a, { mode = 'parcial', amount = null, date = null, method = 'Pix', reference = 'COMPROVANTE FICTÍCIO R07-002', reason = 'MOTIVO PRIVADO R07-002', confirm = true } = {}) {
  if (mode) await a.selectOption('#action-form select[name=mode]', mode);
  if (amount !== null) await a.fill('#action-form input[name=amount]', amount);
  if (date !== null) await a.fill('#action-form input[name=date]', date);
  if (method) await a.selectOption('#action-form select[name=method]', method);
  if (reference !== null) await a.fill('#action-form input[name=reference]', reference);
  if (reason !== null) await a.fill('#action-form textarea[name=reason]', reason);
  if (confirm) await a.check('#action-form input[name=confirm]');
}

async function submitRaw(a) {
  await a.evaluate(() => document.querySelector('#action-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  await a.waitForTimeout(380);
  return a.evaluate(() => {
    const m = document.querySelector('#modal'), e = document.querySelector('#modal-error'), t = document.querySelector('#toast');
    return { open: m.open, error: e && !e.hidden ? e.textContent : '', toast: t && !t.hidden ? t.textContent : '' };
  });
}

async function snapOrders(a) { return a.evaluate(() => JSON.stringify(db.orders)); }
async function numbers(a, id) {
  return a.evaluate(i => { const o = db.orders.find(x => x.id === i); const s = BancadaFinance.summary(o); return { total: s.total, paid: s.paid, balance: s.balance, originalTotal: s.originalTotal ?? null, originalPaid: s.originalPaid ?? null, status: moneyStatus(o), billing: o.billing || null, ledger: o.financeLedger || null }; }, id);
}
async function ledgerCount(a, id) { return a.evaluate(i => { const o = db.orders.find(x => x.id === i); return (o.financeLedger?.events || []).length; }, id); }
async function refundButton(a, retId, evId = null) {
  const act = evId === null ? `modal:warrantyRefund:${retId}` : `modal:warrantyRefundCorrect:${retId}:${evId}`;
  return actionCount(a, act);
}
async function correctFirst(a, retId) {
  await goto(a, `#os/${retId}/garantia`);
  const btn = a.locator('[data-action^="modal:warrantyRefundCorrect:"]').first();
  if (!(await btn.count())) return { open: false, error: 'sem botão de correção' };
  await btn.click(); await a.waitForTimeout(160);
  await a.fill('#action-form textarea[name=reason]', 'Registro lançado por engano na bancada R07-002.');
  await a.check('#action-form input[name=confirm]');
  return submit(a);
}
async function refundViaUI(a, retId, opts) {
  await goto(a, `#os/${retId}/garantia`);
  if (!(await open(a, 'warrantyRefund', retId))) return { open: false, error: 'modal não abriu' };
  await fillRefund(a, opts);
  return submit(a);
}
async function pay(a, id, cents) {
  await goto(a, `#os/${id}/financeiro`);
  if (!(await open(a, 'pay', id))) return false;
  await a.fill('#action-form input[name=amount]', (cents / 100).toFixed(2));
  await a.selectOption('#action-form select[name=method]', 'Pix');
  return submit(a);
}

(async () => {
  const browser = await launch();
  try {
    const { ctx, a, errors, consoleErrors, requests } = await session(browser, 1440, 900, 'r07-002');
    const ids = await fixture(a);
    const [P, R] = ids.partial, [I, IR] = ids.inverse, [Z, ZR] = ids.zero, [Y, YR] = ids.pay;
    const [L, LR] = ids.legacy, [V, VR] = ids.reverse, [N, NR] = ids.neg, [F, FR] = ids.f02, [Q, QR] = ids.pending;
    const [RA, RRA, RB] = ids.roots; const [CR, CRR] = ids.corr;
    const day = await todayOf(a);

    /* ===== 1. entrada em garantia e avaliação não movem valores (telas reais) ===== */
    const origin16Before = await order(a, 16);
    await goto(a, '#os/18/garantia');
    let t = await mainText(a);
    rec('R07B-01', 'Retorno #018 abre a garantia com referência à origem #016 e prazo', /OS de origem[\s\S]*#016/.test(t) && /90 dias/.test(t), t.slice(0, 180));
    let st = await open(a, 'warrantyAssess', 18);
    await a.selectOption('#action-form select[name=coverage]', 'coberto');
    await a.selectOption('#action-form select[name=solution]', 'devolucao_valor');
    await a.fill('#action-form textarea[name=diagnosis]', 'Falha confirmada na bancada.');
    await a.fill('#action-form textarea[name=reason]', 'Acordo fictício de devolução.');
    await a.check('#action-form input[name=confirm]');
    let r = await submit(a);
    const o16 = await order(a, 16);
    rec('R07B-02', 'Avaliação devolucao_valor registrada sem mover a origem #016', !r.open && o16.total === origin16Before.total && o16.paid === origin16Before.paid && JSON.stringify(o16.ledger) === JSON.stringify(origin16Before.ledger) && (await ledgerCount(a, 16)) === 0, JSON.stringify({ total: o16.total, paid: o16.paid }));
    t = await mainText(a);
    rec('R07B-03', 'Painel exibe a devolução pendente e o botão de registro', /Devolução de dinheiro/.test(t) && /Registrar devolução ou encerramento/.test(t) && (await refundButton(a, 18)) === 1, t.slice(-420));

    /* ===== 2. modal: sem pré-seleção, total calculado em centavos e readOnly ===== */
    let m = await refundModal(a, 18);
    rec('R07B-04', 'Modal abre sem modalidade/forma pré-escolhidas, campos vazios e confirmação desmarcada', m && m.mode === '' && m.method === '' && m.amount === '' && m.reference === '' && m.reason === '' && m.confirm === false, JSON.stringify(m));
    rec('R07B-05', 'Data limitada a hoje (piso conservador sem ledger) e valor limitado ao recebido (410,00)', m && m.date === day && m.dateMax === day && m.dateMin === '1900-01-01' && m.amountMax === '410' , JSON.stringify({ date: m && m.date, max: m && m.dateMax, min: m && m.dateMin, amountMax: m && m.amountMax }));
    await a.selectOption('#action-form select[name=mode]', 'total');
    await a.waitForTimeout(120);
    m = await a.evaluate(() => { const f = document.querySelector('#action-form'); return { amount: f.elements.amount.value, ro: f.elements.amount.readOnly, preview: document.querySelector('#warranty-refund-preview').textContent.replace(/\u00a0/g,' ') }; });
    rec('R07B-06', 'Modo total calcula o recebido líquido e trava o valor (readOnly)', m.amount === '410.00' && m.ro === true && /Abatimento: R\$ 410,00/.test(m.preview) && /Saldo após registro: R\$ 0,00/.test(m.preview), JSON.stringify(m));
    await a.selectOption('#action-form select[name=mode]', 'parcial');
    await a.waitForTimeout(100);
    m = await a.evaluate(() => { const f = document.querySelector('#action-form'); return { ro: f.elements.amount.readOnly, preview: document.querySelector('#warranty-refund-preview').textContent.replace(/\u00a0/g,' ') }; });
    rec('R07B-07', 'Modo parcial libera o valor e atualiza a prévia', m.ro === false && /Abatimento: R\$ 410,00/.test(m.preview), JSON.stringify(m));
    await closeModal(a);

    /* ===== 3. parcial 50 em 500/200 e preservação ===== */
    const o30Before = await order(a, P);
    const beforeBilling = JSON.stringify(o30Before.billing), beforeHistory = JSON.stringify(o30Before.history);
    const statusOrd = await order(a, P);
    r = await refundViaUI(a, R, { mode: 'parcial', amount: '50.00', date: day });
    let n30 = await numbers(a, P);
    rec('R07B-08', 'Parcial de 50,00 em 500/200 resulta 450/150/saldo 300', !r.open && n30.total === 45000 && n30.paid === 15000 && n30.balance === 30000, JSON.stringify(n30));
    rec('R07B-09', 'Cobrança, histórico e recibo originais preservados após a parcial', JSON.stringify(n30.billing) === beforeBilling && JSON.stringify((await order(a, P)).history) === beforeHistory && n30.originalTotal === 50000 && n30.originalPaid === 20000, JSON.stringify({ billing: n30.billing, originalTotal: n30.originalTotal, originalPaid: n30.originalPaid }));
    const o18After = await order(a, 18);
    rec('R07B-10', 'Retorno permanece sem cobrança própria e com histórico do registro', o18After.total === 0 && o18After.paid === 0 && (await a.evaluate(i => db.orders.find(x => x.id === i).history.map(h => h.text).join(' | '), R)).includes('Garantia: devolução registrada na origem #' + String(P).padStart(3, '0')), JSON.stringify({ total: o18After.total, paid: o18After.paid }));
    await goto(a, `#os/${P}/financeiro`);
    t = await mainText(a);
    rec('R07B-11', 'Financeiro lista a devolução com valor, abatimento e link do retorno', /Devolução de garantia/.test(t) && /R\$\s*50,00/.test(t) && /Abatimento registrado/.test(t) && /Consultar retorno #/.test(t), t.slice(0, 500));
    rec('R07B-12', 'Financeiro preserva cobrança original, recebido original e saldo', /Cobrança original/.test(t) && /R\$\s*500,00/.test(t) && /Recebimentos originais líquidos de estorno/.test(t) && /R\$\s*200,00/.test(t) && /Saldo[\s\S]*R\$\s*300,00/.test(t), t.slice(0, 700));
    rec('R07B-13', 'Resumo do retorno continua sem cobrança (zero à vista)', (await numbers(a, R)).total === 0 && (await numbers(a, R)).balance === 0, JSON.stringify(await numbers(a, R)));

    /* ===== 4. total após parcial: 150 devolvido, 450 abatido, zero ===== */
    m = await refundModal(a, R);
    await a.selectOption('#action-form select[name=mode]', 'total');
    await a.waitForTimeout(120);
    m = await a.evaluate(() => { const f = document.querySelector('#action-form'); return { amount: f.elements.amount.value, ro: f.elements.amount.readOnly, preview: document.querySelector('#warranty-refund-preview').textContent.replace(/\u00a0/g,' ') }; });
    rec('R07B-14', 'Segundo registro calcula 150,00 e abatimento de 450,00', m.amount === '150.00' && m.ro === true && /Abatimento: R\$ 450,00/.test(m.preview), JSON.stringify(m));
    await fillRefund(a, { mode: 'total', amount: null, date: day });
    r = await submit(a);
    n30 = await numbers(a, P);
    rec('R07B-15', 'Encerramento total deixa 0/0/0 e status Reembolsado', !r.open && n30.total === 0 && n30.paid === 0 && n30.balance === 0 && n30.status === 'Reembolsado', JSON.stringify(n30));
    rec('R07B-16', 'Ledger preserva o recibo original e os dois eventos de devolução', (await ledgerCount(a, P)) === 3 && (await a.evaluate(i => { const o = db.orders.find(x => x.id === i); return [BancadaFinance.receipt(o, 1).amount, BancadaFinance.reversed(o, 1)]; }, P))[0] === 20000, JSON.stringify(await a.evaluate(i => db.orders.find(x => x.id === i).financeLedger.events.map(e => e.type), P)));
    await goto(a, `#os/${P}/financeiro`);
    t = await mainText(a);
    rec('R07B-17', 'Financeiro mostra Reembolsado, zero e a composição 200/500', /Reembolsado/.test(t) && /Total cobrado[\s\S]*R\$\s*0,00/.test(t) && /Devolução de garantia[\s\S]*R\$\s*200,00/.test(t) && /Abatimento de garantia[\s\S]*R\$\s*500,00/.test(t), t.slice(0, 900));
    await goto(a, `#os/${P}/orcamento`);
    rec('R07B-18', 'Zero não oferece nova cobrança no orçamento nem pagamento no financeiro', (await actionCount(a, `modal:billing:${P}`)) === 0 && !/Formalizar cobrança/.test(await mainText(a)) && (await actionCount(a, `modal:pay:${P}`)) === 0, 'sem botões de faturar/pagar');
    await goto(a, '#financeiro');
    t = await mainText(a);
    rec('R07B-19', 'Lista financeira mantém a OS zerada com status Reembolsado', t.includes('#' + String(P).padStart(3, '0')) && /Reembolsado/.test(t), t.slice(0, 600));
    const dash = await a.evaluate(() => ({ sum: db.orders.reduce((s, o) => s + o.total - o.paid, 0), agg: BancadaFinance.aggregate(db.orders, today()).balance }));
    rec('R07B-20', 'Painel e agregado financeiro usam o mesmo saldo líquido (OS zerada contribui 0)', dash.sum === dash.agg && (await numbers(a, P)).balance === 0, JSON.stringify(dash));
    await goto(a, `#imprimir/${P}`);
    t = await mainText(a);
    rec('R07B-21', 'Impressão A4 da origem zerada mantém totais, saldo e situação', /Total cobrado[\s\S]*R\$\s*0,00/.test(t) && /Pago[\s\S]*R\$\s*0,00/.test(t) && /Saldo[\s\S]*R\$\s*0,00/.test(t) && /Situação financeira[\s\S]*Reembolsado/.test(t), t.slice(0, 500));
    await goto(a, `#recibo/${P}/1`);
    t = await mainText(a);
    rec('R07B-22', 'Recibo original continua válido, sem estorno', /Recebimento registrado/.test(t) && /R\$\s*200,00/.test(t) && !/ESTORNADO/.test(t), t.slice(0, 300));
    const proj = await portalProjection(a, P);
    rec('R07B-23', 'Portal do cliente mostra Reembolsada 0/0/0 sem dados privados', proj.finance && proj.finance.status === 'Reembolsada' && proj.finance.total === 0 && proj.finance.paid === 0 && !JSON.stringify(proj).includes('COMPROVANTE') && !JSON.stringify(proj).includes('MOTIVO'), JSON.stringify(proj.finance));

    /* ===== 5. correções (ordem direta) ===== */
    r = await correctFirst(a, R);
    n30 = await numbers(a, P);
    rec('R07B-24', 'Corrigir o total primeiro restaura 450/150/saldo 300', !r.open && n30.total === 45000 && n30.paid === 15000 && n30.balance === 30000, JSON.stringify(n30));
    r = await correctFirst(a, R);
    n30 = await numbers(a, P);
    rec('R07B-25', 'Corrigir a parcial depois restaura 500/200/saldo 300', !r.open && n30.total === 50000 && n30.paid === 20000 && n30.balance === 30000, JSON.stringify(n30));
    const corrButtons = await a.locator('[data-action^="modal:warrantyRefundCorrect:"]').count();
    rec('R07B-26', 'Histórico mantém os quatro registros e nenhum botão de correção ativo', (await a.evaluate(i => BancadaWarranty.refundEvents(db.orders.find(x => x.id === i)).length, R)) === 4 && corrButtons === 0 && (await a.evaluate(i => BancadaWarranty.refundEvents(db.orders.find(x => x.id === i)).filter(e => e.type === 'reembolso').every(e => BancadaWarranty.refundCorrected(db.orders.find(x => x.id === i), e.id)), R)) === true, 'quatro operações');
    const pj = await a.evaluate(i => moneyStatus(db.orders.find(x => x.id === i)), P);
    rec('R07B-27', 'Status volta a Parcial após as correções', pj === 'Parcial', pj);

    /* ===== 6. correções em ordem inversa ===== */
    await refundViaUI(a, IR, { mode: 'parcial', amount: '50.00', date: day });
    await refundViaUI(a, IR, { mode: 'total', amount: null, date: day });
    rec('R07B-28', 'Ordem inversa: após parcial e total a origem fica zerada', (await numbers(a, I)).total === 0 && (await numbers(a, I)).paid === 0, JSON.stringify(await numbers(a, I)));
    await correctFirst(a, IR);
    rec('R07B-29', 'Ordem inversa: corrigir o total primeiro restaura 450/150/300', (await numbers(a, I)).total === 45000 && (await numbers(a, I)).paid === 15000, JSON.stringify(await numbers(a, I)));
    await correctFirst(a, IR);
    rec('R07B-29b', 'Ordem inversa: corrigir a parcial depois restaura 500/200/300', (await numbers(a, I)).total === 50000 && (await numbers(a, I)).paid === 20000, JSON.stringify(await numbers(a, I)));

    /* ===== 7. encerramento total sem dinheiro ===== */
    m = await refundModal(a, ZR);
    await a.selectOption('#action-form select[name=mode]', 'total');
    await a.waitForTimeout(120);
    m = await a.evaluate(() => { const f = document.querySelector('#action-form'); return { amount: f.elements.amount.value, ro: f.elements.amount.readOnly, preview: document.querySelector('#warranty-refund-preview').textContent.replace(/\u00a0/g,' ') }; });
    rec('R07B-30', 'Total com zero recebido calcula 0,00 e abatimento integral', m.amount === '0.00' && m.ro === true && /Abatimento: R\$ 500,00/.test(m.preview) && /Saldo após registro: R\$ 0,00/.test(m.preview), JSON.stringify(m));
    await fillRefund(a, { mode: 'total', amount: null, date: day });
    r = await submit(a);
    let nz = await numbers(a, Z);
    rec('R07B-31', 'Encerramento sem dinheiro abate 500 sem criar recibo', !r.open && nz.total === 0 && nz.paid === 0 && nz.status === 'Encerrado por garantia' && (await ledgerCount(a, Z)) === 1, JSON.stringify(nz));
    rec('R07B-32', 'Portal do zero sem caixa mostra Encerrada por garantia', (await portalProjection(a, Z)).finance.status === 'Encerrada por garantia', JSON.stringify(await portalProjection(a, Z).finance));
    await correctFirst(a, ZR);
    rec('R07B-33', 'Correção do zero restaura 500/0/500', (await numbers(a, Z)).total === 50000 && (await numbers(a, Z)).paid === 0 && (await numbers(a, Z)).balance === 50000, JSON.stringify(await numbers(a, Z)));

    /* ===== 8. legado sem billing ===== */
    await refundViaUI(a, LR, { mode: 'total', amount: null, date: day });
    const nl = await numbers(a, L);
    rec('R07B-34', 'Legado 500/200 sem billing preserva valores originais e não cria billing', nl.total === 0 && nl.paid === 0 && nl.billing === null && nl.originalTotal === 50000 && nl.originalPaid === 20000, JSON.stringify(nl));
    await goto(a, '#financeiro');
    rec('R07B-35', 'OS legada zerada permanece na lista financeira', (await mainText(a)).includes('#' + String(L).padStart(3, '0')), 'presente');
    rec('R07B-36', 'Legado não inventa recibos: apenas o evento de devolução', (await ledgerCount(a, L)) === 1 && (await a.evaluate(i => db.orders.find(x => x.id === i).financeLedger.opening, L)) === 20000, 'um evento');
    await goto(a, `#os/${L}/orcamento`);
    rec('R07B-37', 'Orçamento original do legado continua projetado e sem formalizar nova cobrança', (await a.evaluate(i => db.orders.find(x => x.id === i).quote.versions.length, L)) === 1 && (await actionCount(a, `modal:billing:${L}`)) === 0, 'versão preservada');

    /* ===== 9. pagamento posterior à parcial ===== */
    await refundViaUI(a, YR, { mode: 'parcial', amount: '50.00', date: day });
    await pay(a, Y, 30000);
    rec('R07B-38', 'Pagamento posterior de 300 quita o saldo líquido (450/450)', (await numbers(a, Y)).total === 45000 && (await numbers(a, Y)).paid === 45000 && (await numbers(a, Y)).balance === 0, JSON.stringify(await numbers(a, Y)));
    await refundViaUI(a, YR, { mode: 'total', amount: null, date: day });
    rec('R07B-39', 'Encerramento posterior devolve 450 e abate 450', (await numbers(a, Y)).total === 0 && (await numbers(a, Y)).paid === 0, JSON.stringify(await numbers(a, Y)));

    /* ===== 10. estorno de recebimento bloqueado e reabilitado ===== */
    await refundViaUI(a, VR, { mode: 'parcial', amount: '50.00', date: day });
    await goto(a, `#os/${V}/financeiro`);
    rec('R07B-40', 'Com devolução ativa não há botão de estorno', (await actionCount(a, `modal:reverse:${V}:1`)) === 0, 'sem botão');
    const revErr = await a.evaluate(i => { const o = db.orders.find(x => x.id === i); const before = JSON.stringify(db); let err = ''; try { BancadaFinance.reverse(o, 1, today(), 'Erro', new Date().toISOString()); } catch (e) { err = e.message; } return { err, same: before === JSON.stringify(db) }; }, V);
    rec('R07B-41', 'Handler real recusa estorno com devolução ativa e não muda o estado', revErr.err === 'Há devolução ou abatimento registrado nesta OS. Confira o histórico antes de corrigir o recebimento.' && revErr.same, JSON.stringify(revErr));
    await correctFirst(a, VR);
    await goto(a, `#os/${V}/financeiro`);
    rec('R07B-42', 'Após corrigir, o estorno volta a ser oferecido', (await actionCount(a, `modal:reverse:${V}:1`)) === 1, 'botão presente');

    /* ===== 11. negativos com handler real ===== */
    await goto(a, `#os/${NR}/garantia`);
    await open(a, 'warrantyRefund', NR);
    await fillRefund(a, { mode: 'parcial', amount: '500.01', date: day });
    let before = await snapOrders(a);
    let e = await submitRaw(a);
    rec('R07B-43', 'Excesso de valor é recusado no handler com estado intacto', e.open && e.error === 'A devolução deve respeitar o recebido líquido; no encerramento total, devolva exatamente esse valor.' && (await snapOrders(a)) === before, JSON.stringify(e));
    await fillRefund(a, { mode: 'parcial', amount: '10.00', date: '2999-01-01' });
    e = await submitRaw(a);
    rec('R07B-44', 'Data futura é recusada no handler com estado intacto', e.open && e.error === 'Informe a data real da devolução, sem data futura.' && (await snapOrders(a)) === before, JSON.stringify(e));
    await fillRefund(a, { mode: 'parcial', amount: '10.00', date: '2026-11-24' });
    e = await submitRaw(a);
    rec('R07B-45', 'Data anterior ao recibo é recusada no handler', e.open && e.error === 'Data anterior aos registros financeiros da origem.' && (await snapOrders(a)) === before, JSON.stringify(e));
    await fillRefund(a, { mode: 'parcial', amount: '10.00', date: day, reference: '  ' });
    e = await submitRaw(a);
    rec('R07B-46', 'Referência vazia é recusada no handler', e.open && e.error === 'Confira os textos obrigatórios e seus limites.' && (await snapOrders(a)) === before, JSON.stringify(e));
    await fillRefund(a, { mode: 'parcial', amount: '10.00', date: day, reason: '  ' });
    e = await submitRaw(a);
    rec('R07B-47', 'Motivo vazio é recusado no handler', e.open && e.error === 'Confira os textos obrigatórios e seus limites.' && (await snapOrders(a)) === before, JSON.stringify(e));
    // sem confirmação: validação nativa bloqueia o submit
    await closeModal(a);
    await goto(a, `#os/${NR}/garantia`);
    await open(a, 'warrantyRefund', NR);
    await fillRefund(a, { mode: 'parcial', amount: '10.00', date: day, confirm: false });
    await a.locator('#action-form button[type=submit]').click();
    await a.waitForTimeout(250);
    const noConfirm = await a.evaluate(() => ({ open: document.querySelector('#modal').open, invalid: !document.querySelector('#action-form input[name=confirm]').validity.valid }));
    rec('R07B-48', 'Sem confirmação o navegador bloqueia o envio e o estado fica intacto', noConfirm.open && noConfirm.invalid && (await snapOrders(a)) === before, JSON.stringify(noConfirm));
    // própria cobrança: muta o retorno entre abrir e enviar
    await a.check('#action-form input[name=confirm]');
    await a.evaluate(i => { const o = db.orders.find(x => x.id === i); o.total = 1000; o.billing = { due: today(), items: [] }; }, NR);
    e = await submitRaw(a);
    rec('R07B-49', 'Cobrança própria do retorno bloqueia no handler', e.open && e.error === 'Concilie a cobrança própria deste retorno antes de executar outra solução.', JSON.stringify(e));
    await a.evaluate(i => { const o = db.orders.find(x => x.id === i); o.total = 0; delete o.billing; }, NR);
    // entrega
    await a.evaluate(i => { db.orders.find(x => x.id === i).delivery = { date: today() }; }, NR);
    e = await submitRaw(a);
    rec('R07B-50', 'Entrega registrada bloqueia no handler', e.open && e.error === 'Corrija a entrega antes de executar outra solução.', JSON.stringify(e));
    await a.evaluate(i => { db.orders.find(x => x.id === i).delivery = null; }, NR);
    // chave obsoleta: pagamento na origem sem nova chave
    await a.evaluate((i) => { const o = db.orders.find(x => x.id === i); BancadaFinance.receive(o, 100, today(), 'Pix', new Date().toISOString()); }, N);
    e = await submitRaw(a);
    rec('R07B-51', 'Chave financeira obsoleta é recusada no handler', e.open && e.error === 'O financeiro mudou. Recarregue e confira novamente o valor.', JSON.stringify(e));
    await closeModal(a);

    /* ===== 12. duas abas reais: devolução e correção ===== */
    const pageB = await ctx.newPage();
    const errorsB = [];
    pageB.on('pageerror', ex => errorsB.push(ex.message));
    await pageB.goto(`${BASE}/?r07b-b=${Date.now()}`, { waitUntil: 'networkidle' });
    await goto(a, `#os/${FR}/garantia`);
    await open(a, 'warrantyRefund', FR);
    await fillRefund(a, { mode: 'parcial', amount: '20.00', date: day });
    await pay(pageB, F, 10000); // outra aba muda o financeiro e o localStorage
    e = await submitRaw(a);
    const nfAfterTab = await numbers(a, F);
    rec('R07B-52', 'Duas abas: envio antigo do refund é abortado com aviso e sem lançamento', /Dados alterados em outra aba/.test(e.toast) && (await a.evaluate(i => db.orders.find(x => x.id === i).warranty?.operations?.length || 0, FR)) === 0 && nfAfterTab.paid === 30000, JSON.stringify({ e, nfAfterTab }));
    /* ===== 12b. duas abas reais: correção concorrente ===== */
    await refundViaUI(a, CRR, { mode: 'parcial', amount: '20.00', date: day });
    await goto(a, `#os/${CRR}/garantia`);
    await a.locator('[data-action^="modal:warrantyRefundCorrect:"]').first().click();
    await a.waitForTimeout(150);
    await a.fill('#action-form textarea[name=reason]', 'Correção da aba A (deve ser abortada).');
    await a.check('#action-form input[name=confirm]');
    const pageB2 = await ctx.newPage();
    await pageB2.goto(`${BASE}/?r07b-corr=${Date.now()}`, { waitUntil: 'networkidle' });
    await goto(pageB2, `#os/${CRR}/garantia`);
    await pageB2.locator('[data-action^="modal:warrantyRefundCorrect:"]').first().click();
    await pageB2.waitForTimeout(150);
    await pageB2.fill('#action-form textarea[name=reason]', 'Correção da aba B (válida).');
    await pageB2.check('#action-form input[name=confirm]');
    const rB = await submit(pageB2);
    const eCorr = await submit(a);
    const corrCount = await a.evaluate(i => BancadaWarranty.refundEvents(db.orders.find(x => x.id === i)).filter(e => e.type === 'corrigir_reembolso').length, CRR);
    const nCorr = await numbers(a, CR);
    rec('R07B-52b', 'Duas abas: correção concorrente mantém uma única correção e aborta o envio antigo', !rB.open && corrCount === 1 && nCorr.total === 50000 && nCorr.paid === 20000 && /Dados alterados em outra aba/.test(eCorr.toast), JSON.stringify({ rB, eCorr, corrCount, nCorr }));
    await pageB2.close();
    await pageB.close();

    /* ===== 13. F02 via telas ===== */
    await goto(a, '#financeiro');
    await goto(a, '#os/18/cancelamento');
    let req = await open(a, 'cancelrequest', 18);
    if (req) {
      await a.selectOption('#action-form select[name=origin]', 'cliente');
      await a.fill('#action-form textarea[name=reason]', 'Cliente desistiu do reparo fictício.');
      await submit(a);
    }
    rec('R07B-53', 'F02: retorno sem solução executada pode solicitar cancelamento', req === true && (await a.evaluate(() => BancadaCancel.pending(db.orders.find(o => o.id === 18))) === true), String(req));
    await goto(a, '#os/18/cancelamento');
    if (await open(a, 'cancelwithdraw', 18)) { await a.fill('#action-form textarea[name=reason]', 'Retirada na bancada.'); await a.check('#action-form input[name=confirm]'); await submit(a); }
    rec('R07B-54', 'F02: retirada do pedido funciona', (await a.evaluate(() => BancadaCancel.pending(db.orders.find(o => o.id === 18)))) === false, 'retirado');
    await goto(a, '#os/18/cancelamento');
    await open(a, 'cancelrequest', 18);
    await a.selectOption('#action-form select[name=origin]', 'cliente');
    await a.fill('#action-form textarea[name=reason]', 'Pedido definitivo fictício.');
    await submit(a);
    await goto(a, '#os/18/cancelamento');
    await open(a, 'canceltechnical', 18);
    await a.check('#action-form input[name=confirm]');
    await a.fill('#action-form textarea[name=reason]', 'Sem peças pendentes.');
    await submit(a);
    await goto(a, '#os/18/cancelamento');
    await open(a, 'cancelconfirm', 18);
    await a.fill('#action-form input[name=gross]', '0.00');
    await a.fill('#action-form input[name=discount]', '0.00');
    await a.check('#action-form input[name=settlementConfirmed]');
    await a.check('#action-form input[name=financialConfirmed]');
    await a.check('#action-form input[name=confirm]');
    r = await submit(a);
    rec('R07B-55', 'F02: confirmação encerra o retorno sem tocar a origem #016', !r.open && (await a.evaluate(() => db.orders.find(o => o.id === 18).status)) === 'Cancelado' && (await numbers(a, 16)).total === 41000 && (await numbers(a, 16)).paid === 41000, JSON.stringify({ r, n16: await numbers(a, 16) }));
    // solução executada bloqueia; correção reabilita
    await refundViaUI(a, QR, { mode: 'parcial', amount: '10.00', date: day });
    await goto(a, `#os/${QR}/cancelamento`);
    req = await open(a, 'cancelrequest', QR);
    const blockedMsg = await a.evaluate(i => { const o = db.orders.find(x => x.id === i); let err = ''; try { BancadaCancel.request(o, 'cliente', 'Teste', new Date().toISOString(), db.orders); } catch (ex) { err = ex.message; } return err; }, QR);
    rec('R07B-56', 'F02: solução executada remove a ação e o handler recusa o pedido', req === false && blockedMsg === 'Há retorno ou solução de garantia vinculada. Preserve o histórico e concilie a garantia.', JSON.stringify({ req, blockedMsg }));
    await correctFirst(a, QR);
    await goto(a, `#os/${QR}/cancelamento`);
    rec('R07B-57', 'F02: após corrigir a devolução o pedido volta a ser oferecido', (await actionCount(a, `modal:cancelrequest:${QR}`)) === 1, 'oferta restaurada');
    // pendente + devolução: confirmação bloqueada, retirada possível
    await goto(a, `#os/${QR}/cancelamento`);
    await open(a, 'cancelrequest', QR);
    await a.selectOption('#action-form select[name=origin]', 'cliente');
    await a.fill('#action-form textarea[name=reason]', 'Pedido antes da devolução.');
    await submit(a);
    await refundViaUI(a, QR, { mode: 'parcial', amount: '10.00', date: day });
    await goto(a, `#os/${QR}/cancelamento`);
    const confirmBlocked = await a.evaluate(i => { const o = db.orders.find(x => x.id === i); const key = BancadaCancel.financialKey(o); let err = ''; try { BancadaCancel.confirm(o, { key, gross: 0, discount: 0, refund: 0, reason: '', confirm: true, financialConfirmed: true }, new Date().toISOString(), today(), db.orders); } catch (ex) { err = ex.message; } return err; }, QR);
    rec('R07B-58', 'F02: devolução com pedido pendente impede a confirmação', confirmBlocked === 'Há retorno ou solução de garantia vinculada. Preserve o histórico e concilie a garantia.', confirmBlocked);
    await goto(a, `#os/${QR}/cancelamento`);
    if (await open(a, 'cancelwithdraw', QR)) { await a.fill('#action-form textarea[name=reason]', 'Retirada após devolução.'); await a.check('#action-form input[name=confirm]'); await submit(a); }
    rec('R07B-59', 'F02: retirada continua possível após a devolução', (await a.evaluate(i => BancadaCancel.pending(db.orders.find(o => o.id === i)), QR)) === false, 'retirado');
    // derivado cancelado bloqueia origem
    await goto(a, `#os/${RA}/cancelamento`);
    rec('R07B-60', 'F02: origem com derivado (mesmo finalizado) não oferece cancelamento', (await actionCount(a, `modal:cancelrequest:${RA}`)) === 0 && (await a.evaluate(i => { const o = db.orders.find(x => x.id === i); const key = BancadaCancel.financialKey(o); try { BancadaCancel.request(o, 'cliente', 'Teste', new Date().toISOString(), db.orders); return 'aceito'; } catch (e) { return e.message; } }, RA)).includes('retorno ou solução'), 'bloqueado');

    /* ===== 14. raízes independentes: link, URL e submit da segunda ===== */
    await goto(a, `#os/${RB}/garantia`);
    const hrefB = await a.evaluate(i => [...document.querySelectorAll('#main a')].map(x => x.getAttribute('href')).filter(h => h && h.startsWith('#retorno/')), RB);
    rec('R07B-61', 'Raiz B oferece Registrar retorno apontando para ela mesma', hrefB.length === 1 && hrefB[0] === `#retorno/${RB}`, JSON.stringify(hrefB));
    await goto(a, `#retorno/${RB}`);
    const formB = await a.evaluate(() => {
      const f = document.querySelector('#new-form');
      return f ? { origin: f.dataset.origin, text: document.querySelector('#main').innerText.slice(0, 400) } : null;
    });
    rec('R07B-62', 'Formulário da raiz B mantém data-origin da raiz B', formB && formB.origin === String(RB), JSON.stringify(formB));
    await a.selectOption('#new-form select[name=client]', '3').catch(() => {});
    await a.fill('#new-form textarea[name=defect]', 'Novo defeito da raiz B.');
    await a.check('#new-form input[name=confirm]');
    await a.locator('#new-form button[type=submit]').click();
    await a.waitForTimeout(420);
    const createdB = await a.evaluate(() => { const o = db.orders.at(-1); return { id: o.id, origin: o.origin, previous: o.warranty?.previous, days: o.warranty?.days, unit: o.unit }; });
    rec('R07B-63', 'Submit da raiz B cria retorno com origem/anterior/prazo da raiz B (180 dias)', createdB.origin === RB && createdB.previous === RB && createdB.days === 180 && createdB.unit === 40, JSON.stringify(createdB));
    rec('R07B-64', 'Retorno finalizado da raiz A permanece intacto e não foi escolhido', (await a.evaluate(i => db.orders.find(o => o.id === i).status, RRA)) === 'Finalizado' && (await a.evaluate(({ rb, rr }) => db.orders.some(o => o.id === rr && o.origin === rb), { rb: RB, rr: RRA })) === false, 'raiz A intacta');
    // encerra o retorno recém-criado da raiz B para isolar o vínculo da raiz A (retorno ativo único por unidade)
    await a.evaluate(id => { const o = db.orders.find(x => x.id === id); o.status = 'Cancelado'; save(); }, createdB.id);
    await goto(a, `#os/${RA}/garantia`);
    const hrefA = await a.evaluate(() => [...document.querySelectorAll('#main a')].map(x => x.getAttribute('href')).filter(h => h && h.startsWith('#retorno/')));
    rec('R07B-65', 'Raiz A com retorno finalizado encadeia o atendimento anterior da mesma raiz', hrefA.length === 1 && hrefA[0] === `#retorno/${RRA}`, JSON.stringify(hrefA));

    /* ===== 15. permissões na tela ===== */
    await goto(a, `#os/${NR}/garantia`);
    await role(a, 'Financeiro');
    t = await mainText(a);
    rec('R07B-66', 'Financeiro consulta valores da devolução, sem botão de registro', /Devolução de garantia|Recebido líquido|Cobrança líquida/.test(t) && (await refundButton(a, NR)) === 0, t.slice(0, 300));
    const finDirect = await a.evaluate(i => { const before = JSON.stringify(db); let err = ''; try { warrantySubmit('warrantyRefund', db.orders.find(x => x.id === i), { assessment: 1, key: 'x', mode: 'parcial', amount: '1.00', date: today(), method: 'Pix', reference: 'x', reason: 'x', confirm: true }); } catch (e) { err = e.message; } return { err, same: before === JSON.stringify(db) }; }, NR);
    rec('R07B-67', 'Financeiro não executa devolução nem por handler direto', finDirect.err === 'Ação indisponível neste perfil.' && finDirect.same, JSON.stringify(finDirect));
    for (const p of ['Técnico', 'Atendente']) {
      await role(a, p);
      const wp = await a.evaluate(i => warrantyPanel(db.orders.find(x => x.id === i)), NR);
      rec(`R07B-68-${p}`, `${p} não vê valores, comprovante nem motivo financeiro`, !/R\$/.test(wp) && !wp.includes('COMPROVANTE') && !wp.includes('MOTIVO PRIVADO') && !wp.includes('Registrar devolução'), wp.slice(0, 240));
    }
    await role(a, 'Administrador');

    /* ===== 16. portal público real (página separada) ===== */
    const token = await a.evaluate(i => { const o = db.orders.find(x => x.id === i); BancadaPortal.issue(o, 'a'.repeat(64), Date.now()); save(); return o.publicLink.token; }, Y);
    const pp = await ctx.newPage();
    const perrs = []; pp.on('pageerror', ex => perrs.push(ex.message));
    await pp.goto(`${BASE}/portal.html?r07b=${Date.now()}#${token}`, { waitUntil: 'networkidle' });
    await pp.waitForTimeout(250);
    const portalText = (await pp.locator('body').innerText()).replace(/\u00a0/g, ' ');
    rec('R07B-69', 'Portal real mostra o resumo financeiro líquido sem dados privados', /Reembolsada/.test(portalText) && !portalText.includes('COMPROVANTE') && !portalText.includes('MOTIVO PRIVADO') && perrs.length === 0, portalText.slice(0, 400));
    await pp.close();

    /* ===== 17. sem erros de página/console ===== */
    rec('R07B-70', 'Sem erros de página ou console no fluxo completo', errors.length === 0 && consoleErrors.length === 0 && errorsB.length === 0, JSON.stringify({ errors, consoleErrors, errorsB }));
    rec('R07B-71', 'Nenhuma requisição externa durante o fluxo', requests.every(u => u.startsWith(BASE)), JSON.stringify(requests.filter(u => !u.startsWith(BASE)).slice(0, 5)));
    await ctx.close();
  } finally {
    await browser.close();
    fs.mkdirSync(path.join(OUT, 'testes'), { recursive: true });
    const summary = results.reduce((s, r) => { s[r.status] = (s[r.status] || 0) + 1; return s; }, {});
    fs.writeFileSync(path.join(OUT, 'testes', 'r07-002-browser-resultados.json'), JSON.stringify({
      generatedAt: new Date().toISOString(), codeSha: process.env.CODE_SHA || '', baseUrl: BASE, total: results.length, summary, results
    }, null, 2));
    console.log(`TOTAL ${results.length} · PASS ${summary.PASS || 0} · FAIL ${summary.FAIL || 0} · INFO ${summary.INFO || 0}`);
  }
})().catch(e => { console.error('ERRO FATAL', e); process.exit(1); });
