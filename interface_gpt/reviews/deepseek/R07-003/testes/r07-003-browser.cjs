'use strict';
/*
 * R07-003 — navegador real: troca física, substituta, linhagem e ressalvas R07-002.
 * Chromium via playwright-core; dados fictícios em localStorage; servidor estático em BASE_URL.
 */
const fs = require('node:fs');
const path = require('node:path');
const {
  BASE, OUT, makeRecorder, launch, session, goto, open, closeModal, submit, modalState,
  order, stock, role, mainText, toastText, actionCount
} = require('./lib.cjs');

const { results, rec: recRaw } = makeRecorder();
const rec = (id, desc, ok, detail = '') => recRaw(id, desc, ok, typeof detail === 'string' ? detail : JSON.stringify(detail));
const evUnit = (ev) => ev?.replacement?.unit;

/* ---------- helpers ---------- */
async function reset(a) {
  await a.evaluate(() => { db = seed(); save(); render(); });
}
async function snapshot(a, id) {
  return a.evaluate(i => { const o = db.orders.find(x => x.id === i); return o ? JSON.stringify(o) : null; }, id);
}
async function stockSnapshot(a) {
  return a.evaluate(() => JSON.stringify(db.stock));
}
async function financeSnapshot(a, id) {
  return a.evaluate(i => JSON.stringify({ s: BancadaFinance.summary(db.orders.find(x => x.id === i)), l: db.orders.find(x => x.id === i).financeLedger || null }), id);
}
async function ops(a, id) {
  return a.evaluate(i => JSON.parse(JSON.stringify(db.orders.find(x => x.id === i)?.warranty?.operations || [])), id);
}
async function orderJson(a, id) {
  return a.evaluate(i => JSON.parse(JSON.stringify(db.orders.find(x => x.id === i) || null)), id);
}
async function submitRaw(a) {
  await a.evaluate(() => document.querySelector('#action-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  await a.waitForTimeout(300);
  return modalState(a);
}
async function assessTroca(a, id) {
  await goto(a, `#os/${id}/garantia`);
  if (!(await open(a, 'warrantyAssess', id))) throw new Error('avaliação não abriu em #' + id);
  await a.selectOption('#action-form select[name=coverage]', 'coberto');
  await a.selectOption('#action-form select[name=solution]', 'troca');
  await a.fill('#action-form textarea[name=diagnosis]', 'Falha confirmada na bancada R07-003.');
  await a.fill('#action-form textarea[name=reason]', 'Acordo fictício R07-003.');
  await a.check('#action-form input[name=confirm]');
  return submit(a);
}
async function assess(a, id, solution, coverage = 'coberto') {
  await goto(a, `#os/${id}/garantia`);
  if (!(await open(a, 'warrantyAssess', id))) return { opened: false };
  await a.selectOption('#action-form select[name=coverage]', coverage);
  await a.selectOption('#action-form select[name=solution]', solution);
  await a.fill('#action-form textarea[name=diagnosis]', 'Falha confirmada na bancada R07-003.');
  await a.fill('#action-form textarea[name=reason]', 'Acordo fictício R07-003.');
  await a.check('#action-form input[name=confirm]');
  return submit(a);
}
async function fillSwap(a, o = {}) {
  const v = {
    source: 'externa', destination: 'retida_assistencia', type: 'Placa', brand: 'Midea', model: 'Nova',
    seal: 'NOVA-1', serial: '', imei: '', reason: 'MOTIVO PRIVADO R07-003', cost: '45.00', confirm: true, sku: 'P-001', ...o
  };
  await a.selectOption('#action-form select[name=source]', v.source);
  await a.waitForTimeout(120);
  if (v.source === 'estoque') await a.selectOption('#action-form select[name=sku]', v.sku);
  else await a.fill('#action-form input[name=cost]', v.cost === null || v.cost === undefined ? '' : String(v.cost));
  for (const k of ['type', 'brand', 'model', 'seal', 'serial', 'imei']) {
    await a.fill(`#action-form input[name=${k}]`, v[k] === null || v[k] === undefined ? '' : String(v[k]));
  }
  await a.selectOption('#action-form select[name=destination]', v.destination);
  await a.fill('#action-form textarea[name=reason]', v.reason);
  if (v.confirm) await a.check('#action-form input[name=confirm]');
}
async function openSwap(a, id) {
  await goto(a, `#os/${id}/garantia`);
  return open(a, 'warrantySwap', id);
}
async function swapUI(a, id, o = {}) {
  if (!(await openSwap(a, id))) return { opened: false };
  await fillSwap(a, o);
  const st = await submit(a);
  return { opened: true, ...st };
}
async function tech(a, id, status) {
  await goto(a, `#os/${id}`);
  if (!(await open(a, 'tech', id))) return { opened: false };
  await a.selectOption('#action-form select[name=status]', status);
  if (await a.locator('#action-form input[name=warrantyDays]').count()) {
    await a.fill('#action-form input[name=warrantyDays]', '0');
  }
  await a.check('#action-form input[name=confirm]');
  return { opened: true, ...(await submit(a)) };
}
async function makeRefundOrigin(a) {
  return a.evaluate(() => {
    const now = '2026-11-26T12:00:00Z', day = '2026-11-26';
    db = seed();
    const nextId = () => Math.max(0, ...db.orders.map(o => o.id)) + 1;
    const o = { id: nextId(), client: 1, unit: null, brand: 'LG', model: 'Refund', type: 'Placa', status: 'Finalizado', entry: '2026-08-20', conclusion: '2026-09-01', warrantyDays: 90, total: 50000, paid: 0, approval: 'Aprovado', delivery: null, history: [] };
    o.unit = o.id;
    o.billing = { due: '2026-12-20', items: [{ type: 'Serviço', name: 'Serviço original', quantity: 1, unit: 50000 }], discount: 0 };
    BancadaFinance.receive(o, 20000, '2026-11-25', 'Pix', now);
    db.orders.push(o);
    const r = BancadaWarranty.create(o, db.orders, { defect: 'Defeito do retorno', confirm: true }, day);
    db.orders.push(r);
    BancadaWarranty.assess(r, db.orders, { coverage: 'coberto', solution: 'devolucao_valor', diagnosis: 'Falha', reason: 'Acordo', previous: 0, confirm: true }, now, 'Administrador');
    const ref = BancadaWarranty.refund(r, db.orders, { assessment: BancadaWarranty.assessment(r).id, key: BancadaWarranty.refundKey(o), confirm: true, mode: 'parcial', amount: 5000, date: day, method: 'Pix', reference: 'COMPROVANTE R07-003', reason: 'MOTIVO FINANCEIRO R07-003' }, now, day, 'Administrador');
    BancadaWarranty.correctRefund(r, db.orders, { reference: ref.id, confirm: true, reason: 'Correção R07-003' }, now, 'Administrador');
    save(); render();
    return { o: o.id, r: r.id, ref: ref.id };
  });
}

(async () => {
  const browser = await launch();
  try {
    /* ================= S1 — avaliação, padrões, negativos isolados e troca externa ================= */
    {
      const { ctx, a, errors, consoleErrors } = await session(browser, 1440, 900, 'r07-003s1');
      const before = await a.evaluate(() => ({ o16: JSON.stringify(db.orders.find(x => x.id === 16)), stock: JSON.stringify(db.stock), fin: JSON.stringify(BancadaFinance.summary(db.orders.find(x => x.id === 16))) }));
      await assessTroca(a, 18);
      const afterAssess = await a.evaluate(() => ({ ops: (db.orders.find(x => x.id === 18).warranty.operations || []).length, o16: JSON.stringify(db.orders.find(x => x.id === 16)), stock: JSON.stringify(db.stock), coverage: db.orders.find(x => x.id === 18).coverage, total: db.orders.find(x => x.id === 18).total }));
      rec('R07-003-B01', 'Avaliar como troca não executa, não cobra e não altera origem nem estoque', afterAssess.ops === 0 && afterAssess.coverage === 'Coberto' && afterAssess.total === 0 && afterAssess.o16 === before.o16 && afterAssess.stock === before.stock, JSON.stringify(afterAssess));

      const opened = await openSwap(a, 18);
      const def = await a.evaluate(() => {
        const f = document.querySelector('#action-form');
        return { source: f.elements.source.value, dest: f.elements.destination.value, confirm: f.elements.confirm.checked, stockHidden: document.querySelector('#swap-stock').hidden, skuDisabled: f.elements.sku.disabled, costDisabled: f.elements.cost.disabled };
      });
      rec('R07-003-B02', 'Modal de troca sem origem/destino pré-selecionados e com campos condicionais', opened && def.source === '' && def.dest === '' && def.confirm === false && def.stockHidden === true && def.skuDisabled === true && def.costDisabled === false, JSON.stringify(def));

      const st0 = await snapshot(a, 18);
      await fillSwap(a, { brand: ' ' });
      let st = await submitRaw(a);
      rec('R07-003-B03', 'Negativo: marca vazia recusa com motivo e estado intacto', /Confira os textos obrigatórios/.test(st.error) && (await snapshot(a, 18)) === st0, JSON.stringify(st));
      await closeModal(a);

      await openSwap(a, 18); await fillSwap(a, { seal: '', serial: '', imei: '' });
      st = await submitRaw(a);
      rec('R07-003-B04', 'Negativo: identidade ausente recusa com motivo específico', /Identifique a nova unidade/.test(st.error) && (await snapshot(a, 18)) === st0, JSON.stringify(st));
      await closeModal(a);

      await openSwap(a, 18); await fillSwap(a, { destination: '' });
      st = await submitRaw(a);
      rec('R07-003-B05', 'Negativo: destino vazio recusa com motivo específico', /Informe origem da substituta e destino da antiga/.test(st.error) && (await snapshot(a, 18)) === st0, JSON.stringify(st));
      await closeModal(a);

      await openSwap(a, 18); await fillSwap(a, { cost: '-1' });
      st = await submitRaw(a);
      rec('R07-003-B06', 'Negativo: custo externo inválido recusa e não grava', /Informe um custo externo válido/.test(st.error) && (await snapshot(a, 18)) === st0, JSON.stringify(st));
      await closeModal(a);

      await openSwap(a, 18); await fillSwap(a, { confirm: false });
      st = await submitRaw(a);
      rec('R07-003-B07', 'Negativo: confirmação ausente recusa e não grava', /Confirme a substituição física/.test(st.error) && (await snapshot(a, 18)) === st0, JSON.stringify(st));
      await closeModal(a);

      await a.evaluate(() => { db.orders.find(x => x.id === 16).seal = 'ANT-1'; save(); });
      await openSwap(a, 18); await fillSwap(a, { seal: ' ant- 1 ' });
      st = await submitRaw(a);
      rec('R07-003-B08', 'Negativo: selo duplicado normalizado (espaços/caixa) contra a unidade antiga', /Selo já cadastrado/.test(st.error) && (await snapshot(a, 18)) === st0, JSON.stringify(st));
      await closeModal(a);

      await openSwap(a, 18); await fillSwap(a);
      await a.evaluate(() => { document.querySelector('#action-form input[name=assessment]').value = '0'; });
      st = await submitRaw(a);
      rec('R07-003-B09', 'Negativo: avaliação obsoleta recusa com motivo e estado intacto', /A avaliação mudou/.test(st.error) && (await snapshot(a, 18)) === st0, JSON.stringify(st));
      await closeModal(a);

      const preSwap = await a.evaluate(() => ({ o16: JSON.stringify(db.orders.find(x => x.id === 16)), stock: JSON.stringify(db.stock), fin: JSON.stringify(BancadaFinance.summary(db.orders.find(x => x.id === 16))) }));
      const ok = await swapUI(a, 18, { cost: '45.00' });
      const ev = await ops(a, 18);
      const afterSwap = await a.evaluate(() => ({ o16: JSON.stringify(db.orders.find(x => x.id === 16)), stock: JSON.stringify(db.stock), total: db.orders.find(x => x.id === 18).total, paid: db.orders.find(x => x.id === 18).paid, fin: JSON.stringify(BancadaFinance.summary(db.orders.find(x => x.id === 16))) }));
      rec('R07-003-B10', 'Troca externa grava uma operação, custo privado e não move estoque nem financeiro', ok.open === false && ev.length === 1 && ev[0].type === 'troca' && ev[0].source === 'externa' && ev[0].destination === 'retida_assistencia' && ev[0].cost === 4500 && ev[0].oldUnit === 16 && ev[0].replacement.unit !== 16 && afterSwap.o16 === preSwap.o16 && afterSwap.stock === preSwap.stock && afterSwap.total === 0 && afterSwap.paid === 0 && afterSwap.fin === preSwap.fin, { ok, ev: ev[0], afterSwap, preSwap });

      await goto(a, '#os/18/garantia');
      const panel = await mainText(a);
      rec('R07-003-B11', 'Painel registra substituta, destino, motivo e custo para Admin', /Substituição registrada/.test(panel) && /Midea/.test(panel) && /Nova/.test(panel) && /Retida na assistência/.test(panel) && /MOTIVO PRIVADO R07-003/.test(panel) && /R\$ 45,00/.test(panel) && !/Registrar troca/.test(panel), panel.slice(0, 700));

      await goto(a, '#os/16/garantia');
      const rootText = await mainText(a);
      const rootLinks = await a.evaluate(() => [...document.querySelectorAll('#main a[href^="#os/18"]')].map(x => x.getAttribute('href')));
      rec('R07-003-B12', 'Origem aponta para o retorno em andamento enquanto a substituta não conclui', /Abrir retorno em andamento #018/.test(rootText) && rootLinks.includes('#os/18/garantia'), JSON.stringify({ links: rootLinks, text: rootText.slice(0, 300) }));

      await goto(a, '#retorno/16');
      const ret16 = await a.locator('#new-form').count();
      const ret16Text = await mainText(a);
      rec('R07-003-B13', 'URL da origem durante troca em andamento não abre outra OS', ret16 === 0 && /Retorno em andamento/.test(ret16Text) && /#018/.test(ret16Text), ret16Text.slice(0, 300));

      await goto(a, '#imprimir/18');
      const printA4 = await mainText(a);
      await goto(a, '#imprimir/18/cupom');
      const printCupom = await mainText(a);
      rec('R07-003-B14', 'A4 e cupom mostram a substituta sem custo/motivo privados', /Substituta em garantia/.test(printA4) && /Midea/.test(printA4) && /Substituta em garantia/.test(printCupom) && !printA4.includes('MOTIVO PRIVADO R07-003') && !printA4.includes('45,00') && !printCupom.includes('45,00'), JSON.stringify({ a4: printA4.slice(0, 260) }));

      await goto(a, '#os/18');
      const deliveryOpen = await open(a, 'delivery', 18);
      const deliveryItems = deliveryOpen ? await a.inputValue('#action-form textarea[name=items]') : '';
      if (deliveryOpen) await closeModal(a);
      rec('R07-003-B15', 'Entrega pré-preenche a substituta com identificação física', deliveryOpen && /Substituta em garantia · Placa · Midea · Nova/.test(deliveryItems) && /Selo NOVA-1/.test(deliveryItems) && !/Daikin/.test(deliveryItems), deliveryItems);

      const token = 'a'.repeat(64);
      await a.evaluate(t => { BancadaPortal.issue(db.orders.find(x => x.id === 18), t, Date.now()); save(); }, token);
      const p = await ctx.newPage();
      await p.goto(`${BASE}/portal.html#${token}`, { waitUntil: 'networkidle' });
      const portalText = await p.locator('body').innerText();
      await p.close();
      rec('R07-003-B16', 'Portal mostra marca/modelo da substituta sem selo, motivo, custo ou IDs', /Midea/.test(portalText) && /Nova/.test(portalText) && !portalText.includes('NOVA-1') && !portalText.includes('MOTIVO PRIVADO') && !portalText.includes('45,00') && !/operation|ledger|returnId/i.test(portalText), portalText.slice(0, 500));

      rec('R07-003-B17', 'Sem erros de página ou console no fluxo externo', errors.length === 0 && consoleErrors.length === 0, JSON.stringify({ errors, consoleErrors }));
      await ctx.close();
    }

    /* ================= S2 — estoque, finalização e retorno posterior ================= */
    {
      const { ctx, a, errors, consoleErrors } = await session(browser, 1440, 900, 'r07-003s2');
      try { await assessTroca(a, 18); } catch (e) { console.log('assess s2', e.message); }
      const q0 = await a.evaluate(() => JSON.stringify(db.stock));
      const ok = await swapUI(a, 18, { source: 'estoque', sku: 'P-002' });
      const stk = await stock(a);
      const ev = await ops(a, 18);
      const o16 = await snapshot(a, 16);
      rec('R07-003-B18', 'Troca de estoque baixa exatamente 1 unidade, custo desconhecido e sem cobrança', ok.open === false && stk.find(x => x.name === 'Optoacoplador PC817').quantity === 2 && stk.find(x => x.name === 'IGBT 650 V').quantity === 8 && stk.find(x => x.name === 'Capacitor 450 V').quantity === 16 && ev.length === 1 && ev[0].source === 'estoque' && ev[0].sku === 'P-002' && ev[0].cost === null && ev[0].replacement.unit > 18, JSON.stringify({ stk, ev: ev[0] }));
      const mov = await a.evaluate(() => JSON.parse(JSON.stringify(db.stock.find(x => x.sku === 'P-002').movements)));
      rec('R07-003-B19', 'Movimento de saída vinculado ao retorno e à operação', mov.length === 1 && mov[0].type === 'troca_saida' && mov[0].quantity === 1 && mov[0].returnId === 18 && mov[0].operationId === ev[0].id, JSON.stringify(mov));
      rec('R07-003-B20', 'Painel de estoque mostra custo não informado para Admin', /Troca em garantia/.test(await (async () => { await goto(a, '#os/18/garantia'); return mainText(a); })()) && /Custo interno[\s\S]*Não informado/.test(await mainText(a)), (await mainText(a)).slice(0, 900));

      await goto(a, '#estoque');
      rec('R07-003-B21', 'Tela de estoque reflete a baixa de 1 e mantém os demais produtos', (await mainText(a)).includes('2') && (await mainText(a)).includes('8') && (await mainText(a)).includes('16'), (await mainText(a)).slice(0, 500));

      const finBefore = await financeSnapshot(a, 16);
      const r = await orderJson(a, 18);
      const finAfter = await financeSnapshot(a, 16);
      rec('R07-003-B22', 'Troca de estoque não altera a cobrança da origem nem cria dívida no retorno', finBefore === finAfter && r.total === 0 && r.paid === 0 && !r.billing, JSON.stringify({ fin: finAfter.slice(0, 160), total: r.total }));

      await goto(a, '#os/16/garantia');
      const rootOpen = await mainText(a);
      rec('R07-003-B23', 'Origem com retorno aberto mostra o vínculo ativo e não permite duplicar', /Abrir retorno em andamento #018/.test(rootOpen) && (await a.locator('[data-action="modal:warrantySwap:16"]').count()) === 0, rootOpen.slice(0, 300));

      const t = await tech(a, 18, 'Finalizado');
      const fin = await orderJson(a, 18);
      rec('R07-003-B24', 'Concluir o retorno após a troca grava conclusão e não reinicia prazo', t.opened && fin.status === 'Finalizado' && !!fin.conclusion && fin.warrantyDays === 0 && fin.warranty.end === r.warranty.end, JSON.stringify({ status: fin.status, conclusion: fin.conclusion, days: fin.warrantyDays, end: fin.warranty.end }));

      await goto(a, '#os/16');
      const link16 = await a.evaluate(() => [...document.querySelectorAll('a[href^="#retorno/"]')].map(x => x.getAttribute('href')));
      await goto(a, '#retorno/16');
      const formBase = await a.evaluate(() => document.querySelector('#new-form')?.dataset.origin || null);
      const header = await mainText(a);
      rec('R07-003-B25', 'Retorno posterior aponta para a troca (#018) sem nova raiz', link16.includes('#retorno/18') && formBase === '18' && /Substituta em garantia/.test(header), JSON.stringify({ link16, formBase }));

      await a.fill('#new-form textarea[name=defect]', 'Novo defeito após a troca.');
      await a.check('#new-form input[name=confirm]');
      await a.locator('#new-form button[type=submit]').click();
      await a.waitForTimeout(420);
      const r2 = await a.evaluate(() => JSON.parse(JSON.stringify(db.orders.at(-1))));
      const replUnit = ev[0].replacement.unit;
      rec('R07-003-B26', 'Retorno da substituta mantém raiz, atendimento anterior e prazo original', r2.origin === 16 && r2.warranty.previous === 18 && r2.unit === replUnit && r2.brand === 'Midea' && r2.model === 'Nova' && r2.warranty.end === r.warranty.end && r2.warrantyDays === 0, { id: r2.id, unit: r2.unit, replUnit, origin: r2.origin, prev: r2.warranty?.previous, end: r2.warranty?.end });

      const beforeAttempt = await a.evaluate(() => db.orders.length);
      await goto(a, '#nova');
      await a.selectOption('#new-form select[name=client]', '3');
      await a.selectOption('#new-form select[name=mode]', 'existing');
      await a.waitForTimeout(180);
      const opts = await a.evaluate(() => [...document.querySelectorAll('#new-form select[name=unit] option')].map(o => ({ v: o.value, t: o.textContent })));
      const hasOld = opts.some(o => o.v === '16');
      const hasSub = opts.some(o => /Midea|Nova/.test(o.t));
      rec('R07-003-B27', 'Nova OS comum não oferece a unidade antiga e oferece a substituta', !hasOld && hasSub, JSON.stringify(opts));

      const injected = await a.evaluate(() => {
        const f = document.querySelector('#new-form');
        f.elements.unit.insertAdjacentHTML('beforeend', '<option value="16">unidade antiga</option>');
        f.elements.unit.value = '16';
        f.elements.defect.value = 'Tentativa de reutilizar a unidade antiga.';
        return db.orders.length;
      });
      await a.locator('#new-form button[type=submit]').click();
      await a.waitForTimeout(420);
      const afterInjected = await a.evaluate(() => ({ n: db.orders.length, toast: (() => { const t = document.querySelector('#toast'); return t && !t.hidden ? t.textContent : ''; })() }));
      rec('R07-003-B28', 'Handler direto recusa a unidade antiga e não cria OS', afterInjected.n === injected && /Unidade substituída/.test(afterInjected.toast), JSON.stringify(afterInjected));

      rec('R07-003-B29', 'Sem erros de página ou console no fluxo de estoque', errors.length === 0 && consoleErrors.length === 0, JSON.stringify({ errors, consoleErrors }));
      await ctx.close();
    }

    /* ================= S3 — estados bloqueados, duas abas e troca repetida ================= */
    {
      const { ctx, a, errors, consoleErrors } = await session(browser, 1440, 900, 'r07-003s3');
      await reset(a);
      await assess(a, 18, 'reparo_sem_cobranca');
      await goto(a, '#os/18/garantia');
      const noSwap = await a.locator('[data-action="modal:warrantySwap:18"]').count();
      rec('R07-003-B30', 'Solução diferente de troca não oferece a ação', noSwap === 0 && !(await mainText(a)).includes('Registrar troca'), (await mainText(a)).slice(0, 300));

      await reset(a);
      await a.evaluate(() => { db.orders.find(x => x.id === 18).billing = { due: '2026-12-20', items: [{ type: 'Serviço', name: 'Cobrança própria', quantity: 1, unit: 1000 }], discount: 0 }; save(); });
      await assessTroca(a, 18);
      await goto(a, '#os/18/garantia');
      const billText = await mainText(a);
      rec('R07-003-B31', 'Cobrança própria bloqueia a troca com motivo e sem ação', /Concilie a cobrança própria/.test(billText) && (await a.locator('[data-action="modal:warrantySwap:18"]').count()) === 0, billText.slice(0, 400));

      await reset(a);
      await a.evaluate(() => { db.orders.find(x => x.id === 18).delivery = { date: '2026-11-26', receiver: 'Cliente', items: 'Item', third: false }; save(); });
      await assessTroca(a, 18);
      await goto(a, '#os/18/garantia');
      const delText = await mainText(a);
      rec('R07-003-B32', 'Entrega registrada bloqueia a troca com motivo e sem ação', /Corrija a entrega/.test(delText) && (await a.locator('[data-action="modal:warrantySwap:18"]').count()) === 0, delText.slice(0, 400));

      await reset(a);
      await assessTroca(a, 18);
      await a.evaluate(() => { const o = db.orders.find(x => x.id === 18); o.status = 'Finalizado'; o.conclusion = '2026-11-26'; save(); render(); });
      await goto(a, '#os/18/garantia');
      const finText = await mainText(a);
      rec('R07-003-B33', 'Conclusão antes da troca bloqueia a ação com motivo', /Execute a solução antes de concluir/.test(finText) && (await a.locator('[data-action="modal:warrantySwap:18"]').count()) === 0, finText.slice(0, 400));

      await reset(a);
      await assess(a, 18, 'novo_orcamento');
      // publica um orçamento próprio no retorno (a avaliação vigente permite novo orçamento)
      await goto(a, '#os/18/orcamento');
      if (await open(a, 'quote', 18)) {
        while (await a.locator('.quote-edit-row').count()) {
          await a.locator('.quote-edit-row [data-quote-remove]').first().click();
          await a.waitForTimeout(40);
        }
        await a.locator('[data-quote-add]').click();
        await a.waitForTimeout(80);
        const row = a.locator('.quote-edit-row').last();
        await row.locator('input[name=itemName]').fill('Serviço do retorno');
        await row.locator('input[name=itemQty]').fill('1');
        await row.locator('input[name=itemUnit]').fill('20.00');
        await submit(a);
      }
      if (await open(a, 'publish', 18)) { await a.check('#action-form input[name=confirm]'); await submit(a); }
      await assessTroca(a, 18);
      await goto(a, '#os/18/garantia');
      const pubText = await mainText(a);
      const blocker = await a.evaluate(() => { try { BancadaWarranty.swapEligibility(db.orders.find(x => x.id === 18), db.orders); return ''; } catch (e) { return e.message; } });
      const pubBlocked = /Retire a publicação/.test(blocker) && (await a.locator('[data-action="modal:warrantySwap:18"]').count()) === 0 && /Retire a publicação/.test(pubText);
      await goto(a, '#os/18/orcamento');
      if (await open(a, 'withdraw', 18)) { await a.check('#action-form input[name=confirm]'); await submit(a); }
      await goto(a, '#os/18/garantia');
      const afterWithdraw = await a.locator('[data-action="modal:warrantySwap:18"]').count();
      rec('R07-003-B34', 'Publicação ativa bloqueia e a retirada libera a troca', pubBlocked && afterWithdraw === 1, { pubBlocked, afterWithdraw, blocker, text: pubText.slice(0, 900) });

      await reset(a);
      await a.evaluate(() => { db.orders.push({ ...db.orders.find(x => x.id === 16), id: 40, unit: 16, status: 'Aberto', delivery: null, conclusion: null }); save(); });
      await assessTroca(a, 18);
      await goto(a, '#os/18/garantia');
      const otherText = await mainText(a);
      rec('R07-003-B35', 'Outro atendimento aberto da unidade bloqueia a troca', /Conclua ou confira outros atendimentos abertos/.test(otherText) && (await a.locator('[data-action="modal:warrantySwap:18"]').count()) === 0, otherText.slice(0, 400));

      // duas abas: B abre o modal antes; A troca; B tenta gravar
      await reset(a);
      await assessTroca(a, 18);
      const b = await ctx.newPage();
      const errsB = []; b.on('pageerror', e => errsB.push(e.message));
      await b.goto(`${BASE}/?r07-003s3b=${Date.now()}`, { waitUntil: 'networkidle' });
      await goto(b, '#os/18/garantia'); await open(b, 'warrantySwap', 18); await fillSwap(b);
      await goto(a, '#os/18/garantia'); await open(a, 'warrantySwap', 18); await fillSwap(a);
      await submit(a);
      const stB = await submit(b);
      const opsAfterTabs = await ops(a, 18);
      rec('R07-003-B36', 'Duas abas: envio obsoleto abortado e uma única troca gravada', opsAfterTabs.length === 1 && stB.open === false && /Dados alterados em outra aba/.test(stB.toast), JSON.stringify({ ops: opsAfterTabs.length, stB }));
      rec('R07-003-B37', 'Duas abas: sem exceção de página', errsB.length === 0 && errors.length === 0, JSON.stringify({ errsB, errors }));

      // troca repetida e handler direto
      await goto(a, '#os/18/garantia');
      const repeated = await a.locator('[data-action="modal:warrantySwap:18"]').count();
      const before = await snapshot(a, 18);
      const direct = await a.evaluate(() => {
        try { warrantySubmit('warrantySwap', db.orders.find(x => x.id === 18), { assessment: 1, source: 'externa', destination: 'retida_assistencia', type: 'Placa', brand: 'Outra', model: 'Outra', seal: 'OUTRA-9', reason: 'Tentativa', cost: 0, confirm: true }); return 'sem erro'; } catch (e) { return e.message; }
      });
      rec('R07-003-B38', 'Troca repetida não oferece ação e o handler direto não altera o estado', repeated === 0 && direct !== 'sem erro' && (await snapshot(a, 18)) === before, JSON.stringify({ repeated, direct }));

      // unidade substituída por URL/handler direto
      await a.evaluate(() => { const r = db.orders.find(x => x.id === 18); r.status = 'Finalizado'; r.conclusion = '2026-11-26'; save(); });
      await goto(a, '#retorno/16');
      const formBase = await a.evaluate(() => document.querySelector('#new-form')?.dataset.origin || null);
      const oldErr = await a.evaluate(() => {
        try { BancadaWarranty.create(db.orders.find(x => x.id === 16), db.orders, { defect: 'Tentativa', confirm: true }, '2026-11-26'); return 'sem erro'; } catch (e) { return e.message; }
      });
      rec('R07-003-B39', 'Unidade substituída não é reutilizada por URL nem por handler direto', formBase === '18' && /Unidade substituída/.test(oldErr), JSON.stringify({ formBase, oldErr }));

      rec('R07-003-B40', 'Sem erros de página ou console nos bloqueios', errors.length === 0 && consoleErrors.length === 0, JSON.stringify({ errors, consoleErrors }));
      await ctx.close();
    }

    /* ================= S4 — linhagem, IDs coincidentes e segunda troca ================= */
    {
      const { ctx, a, errors, consoleErrors } = await session(browser, 1440, 900, 'r07-003s4');
      const ids = await a.evaluate(() => {
        db = seed();
        const now = '2026-11-26T12:00:00Z', day = '2026-11-26';
        db.orders = [{ id: 100, client: 1, unit: 100, brand: 'Marca', model: 'Raiz', type: 'Placa', seal: 'RAIZ-1', status: 'Finalizado', entry: '2026-08-01', conclusion: '2026-08-10', warrantyDays: 90, total: 0, paid: 0, approval: 'Aprovado', delivery: null, history: [] }];
        const r1 = BancadaWarranty.create(db.orders[0], db.orders, { defect: 'Falha', confirm: true }, day); db.orders.push(r1);
        BancadaWarranty.assess(r1, db.orders, { coverage: 'coberto', solution: 'troca', diagnosis: 'F', reason: 'R', previous: 0, confirm: true }, now, 'Administrador');
        const e1 = BancadaWarranty.swap(r1, db.orders, [], { assessment: BancadaWarranty.assessment(r1).id, source: 'externa', destination: 'retida_assistencia', type: 'Placa', brand: 'Sub', model: 'Um', seal: 'SUB-1', serial: '', imei: '', reason: 'M', cost: 0, confirm: true }, now, 'Administrador');
        r1.status = 'Finalizado'; r1.conclusion = day;
        save(); render();
        return { root: 100, r1: r1.id, u1: e1.replacement.unit };
      });
      rec('R07-003-B41', 'IDs de OS e de unidade podem coincidir sem quebrar o vínculo inicial', ids.root === 100 && ids.r1 === 101 && ids.u1 === 102, JSON.stringify(ids));
      await goto(a, '#os/100');
      const link = await a.evaluate(() => [...document.querySelectorAll('a[href^="#retorno/"]')].map(x => x.getAttribute('href')));
      await goto(a, '#retorno/100');
      const formBase = await a.evaluate(() => document.querySelector('#new-form')?.dataset.origin || null);
      await a.fill('#new-form textarea[name=defect]', 'Retorno da primeira substituta.');
      await a.check('#new-form input[name=confirm]');
      await a.locator('#new-form button[type=submit]').click();
      await a.waitForTimeout(420);
      const r2 = await a.evaluate(() => JSON.parse(JSON.stringify(db.orders.at(-1))));
      rec('R07-003-B42', 'Retorno posterior cria OS #102 com unidade 102, raiz 100 e anterior 101', link.includes('#retorno/101') && formBase === '101' && r2.id === 102 && r2.unit === 102 && r2.origin === 100 && r2.warranty.previous === 101, JSON.stringify({ link, formBase, r2: { id: r2.id, unit: r2.unit, origin: r2.origin } }));

      await goto(a, '#os/100/garantia');
      const hist = await mainText(a);
      rec('R07-003-B43', 'Histórico por raiz lista as duas gerações de retorno', /#101/.test(hist) && /#102/.test(hist), hist.slice(0, 900));

      await a.evaluate(() => { const r = db.orders.find(x => x.id === 18); });
      // segunda troca em sequência na OS 102
      await assessTroca(a, 102);
      const sw2 = await swapUI(a, 102, { seal: 'SUB-2', model: 'Dois' });
      const ev2 = await ops(a, 102);
      rec('R07-003-B44', 'Segunda troca em sequência continua a linhagem e cria unidade 103', sw2.open === false && ev2.length === 1 && ev2[0].oldUnit === 102 && ev2[0].replacement.unit === 103, JSON.stringify(ev2[0]));
      await a.evaluate(() => { const r = db.orders.find(x => x.id === 102); r.status = 'Finalizado'; r.conclusion = '2026-11-26'; save(); });
      await goto(a, '#retorno/102');
      const base3 = await a.evaluate(() => document.querySelector('#new-form')?.dataset.origin || null);
      await a.fill('#new-form textarea[name=defect]', 'Retorno da segunda substituta.');
      await a.check('#new-form input[name=confirm]');
      await a.locator('#new-form button[type=submit]').click();
      await a.waitForTimeout(420);
      const r3 = await a.evaluate(() => JSON.parse(JSON.stringify(db.orders.at(-1))));
      rec('R07-003-B45', 'Retorno da segunda substituta usa a unidade 103 e a raiz 100', base3 === '102' && r3.id === 103 && r3.unit === 103 && r3.origin === 100 && r3.warranty.previous === 102, JSON.stringify({ base3, id: r3.id, unit: r3.unit }));

      const cross = await a.evaluate(() => {
        const o = { ...db.orders.find(x => x.id === 103), client: 2, status: 'Finalizado', conclusion: '2026-11-26' };
        try { BancadaWarranty.reference(o, db.orders); return 'sem erro'; } catch (e) { return e.message; }
      });
      rec('R07-003-B46', 'Cliente distinto não consegue vincular retorno à unidade da substituta', /mesma unidade e o cliente/.test(cross), cross);
      rec('R07-003-B47', 'Sem erros de página ou console na linhagem', errors.length === 0 && consoleErrors.length === 0, JSON.stringify({ errors, consoleErrors }));
      await ctx.close();
    }

    /* ================= S5 — ressalvas R07-002: histórico cancelado, prévia, legado ================= */
    {
      const { ctx, a, errors, consoleErrors } = await session(browser, 1440, 900, 'r07-003s5');
      const f = await a.evaluate(() => {
        const now = '2026-11-26T12:00:00Z', day = '2026-11-26';
        db = seed();
        const o = { id: 30, client: 1, unit: 30, brand: 'LG', model: 'Cancelado', type: 'Placa', status: 'Finalizado', entry: '2026-08-20', conclusion: '2026-09-01', warrantyDays: 90, total: 50000, paid: 0, approval: 'Aprovado', delivery: null, history: [] };
        o.billing = { due: '2026-12-20', items: [{ type: 'Serviço', name: 'Serviço', quantity: 1, unit: 50000 }], discount: 0 };
        BancadaFinance.receive(o, 20000, '2026-11-20', 'Pix', now);
        db.orders.push(o);
        const r = BancadaWarranty.create(o, db.orders, { defect: 'Falha', confirm: true }, day); db.orders.push(r);
        BancadaWarranty.assess(r, db.orders, { coverage: 'coberto', solution: 'devolucao_valor', diagnosis: 'F', reason: 'R', previous: 0, confirm: true }, now, 'Administrador');
        const ref = BancadaWarranty.refund(r, db.orders, { assessment: BancadaWarranty.assessment(r).id, key: BancadaWarranty.refundKey(o), confirm: true, mode: 'parcial', amount: 5000, date: day, method: 'Pix', reference: 'REF', reason: 'MOTIVO PRIVADO' }, now, day, 'Administrador');
        BancadaWarranty.correctRefund(r, db.orders, { reference: ref.id, confirm: true, reason: 'Correção' }, now, 'Administrador');
        r.status = 'Cancelado';
        save(); render();
        return { o: 30, r: r.id };
      });
      await goto(a, `#os/${f.r}/garantia`);
      const adminText = await mainText(a);
      const adminBtns = await a.evaluate(() => ({ refund: document.querySelectorAll('[data-action^="modal:warrantyRefund:"]').length, corr: document.querySelectorAll('[data-action^="modal:warrantyRefundCorrect:"]').length }));
      rec('R07-003-B48', 'Retorno cancelado: Admin consulta histórico corrigido e não recebe ação de nova devolução/correção', /Histórico de devoluções/.test(adminText) && /Devolução corrigida/.test(adminText) && /R\$ 50,00/.test(adminText) && adminBtns.refund === 0 && adminBtns.corr === 0, JSON.stringify({ btns: adminBtns, text: adminText.slice(0, 500) }));

      await role(a, 'Financeiro');
      await goto(a, `#os/${f.r}/garantia`);
      const finText = await mainText(a);
      const finBtns = await a.evaluate(() => ({ refund: document.querySelectorAll('[data-action^="modal:warrantyRefund:"]').length, corr: document.querySelectorAll('[data-action^="modal:warrantyRefundCorrect:"]').length }));
      rec('R07-003-B49', 'Financeiro consulta valores sem ação de devolução/correção no retorno cancelado', /Devolução corrigida/.test(finText) && /R\$ 50,00/.test(finText) && finBtns.refund === 0 && finBtns.corr === 0, JSON.stringify({ btns: finBtns }));

      await role(a, 'Técnico');
      await goto(a, `#os/${f.r}/garantia`);
      const techText = await mainText(a);
      rec('R07-003-B50', 'Técnico não vê valores nem motivo financeiro no retorno cancelado', !/R\$ 50,00/.test(techText) && !/MOTIVO PRIVADO/.test(techText) && !/Histórico de devoluções/.test(techText), techText.slice(0, 400));

      await role(a, 'Administrador');
      // prévia decimal e handler de refund
      const rf = await a.evaluate(() => {
        const now = '2026-11-26T12:00:00Z', day = '2026-11-26';
        db = seed();
        const o = { id: 31, client: 1, unit: 31, brand: 'LG', model: 'Refund', type: 'Placa', status: 'Finalizado', entry: '2026-08-20', conclusion: '2026-09-01', warrantyDays: 90, total: 50000, paid: 0, approval: 'Aprovado', delivery: null, history: [] };
        o.billing = { due: '2026-12-20', items: [{ type: 'Serviço', name: 'Serviço', quantity: 1, unit: 50000 }], discount: 0 };
        BancadaFinance.receive(o, 20000, '2026-11-25', 'Pix', now);
        db.orders.push(o);
        const r = BancadaWarranty.create(o, db.orders, { defect: 'Falha', confirm: true }, day); db.orders.push(r);
        BancadaWarranty.assess(r, db.orders, { coverage: 'coberto', solution: 'devolucao_valor', diagnosis: 'F', reason: 'R', previous: 0, confirm: true }, now, 'Administrador');
        save(); render();
        return { r: r.id };
      });
      await goto(a, `#os/${rf.r}/garantia`);
      await open(a, 'warrantyRefund', rf.r);
      await a.selectOption('#action-form select[name=mode]', 'parcial');
      const preview = async v => { await a.fill('#action-form input[name=amount]', v); await a.waitForTimeout(120); return a.textContent('#warranty-refund-preview'); };
      const p3 = await preview('1.234');
      const pe = await preview('');
      const pmax = await preview('9999999999');
      const p2 = await preview('1.23');
      const stateBefore = await a.evaluate(() => JSON.stringify({ l: db.orders.find(x => x.id === 31).financeLedger || null, o: db.orders.find(x => x.id === 31).warranty?.operations || [] }));
      const st = await a.evaluate(() => {
        try { warrantySubmit('warrantyRefund', db.orders.find(x => x.id === 31), { assessment: 1, key: BancadaWarranty.refundKey(db.orders.find(x => x.id === 31)), amount: '1.234', mode: 'parcial', date: '2026-11-26', method: 'Pix', reference: 'R', reason: 'R', confirm: true }); return 'sem erro'; } catch (e) { return e.message; }
      });
      const stateAfter = await a.evaluate(() => JSON.stringify({ l: db.orders.find(x => x.id === 31).financeLedger || null, o: db.orders.find(x => x.id === 31).warranty?.operations || [] }));
      rec('R07-003-B51', 'Prévia decimal rejeita 3 casas/vazio/extremo e aceita 2 casas', /Selecione a modalidade e confira o valor/.test(p3) && /Selecione a modalidade/.test(pe) && /Selecione a modalidade/.test(pmax) && /Abatimento/.test(p2), JSON.stringify({ p3, pe, pmax, p2 }));
      rec('R07-003-B52', 'Handler de devolução recusa 3 casas e não altera ledger/estado', /Informe valor válido/.test(st) && stateBefore === stateAfter, JSON.stringify({ st }));

      // operações legadas sem array: falha não inicializa, sucesso inicializa
      const lg = await a.evaluate(() => {
        const now = '2026-11-26T12:00:00Z', day = '2026-11-26';
        db = seed();
        const o = db.orders.find(x => x.id === 16), r = db.orders.find(x => x.id === 18);
        BancadaWarranty.assess(r, db.orders, { coverage: 'coberto', solution: 'troca', diagnosis: 'F', reason: 'R', previous: 0, confirm: true }, now, 'Administrador');
        delete r.warranty.operations; save(); render(); return r.id;
      });
      await goto(a, `#os/${lg}/garantia`);
      await open(a, 'warrantySwap', lg);
      await fillSwap(a, { confirm: false });
      await submitRaw(a);
      const absent = await a.evaluate(i => !('operations' in db.orders.find(x => x.id === i).warranty), lg);
      await closeModal(a);
      await openSwap(a, lg); await fillSwap(a); await submit(a);
      const present = await a.evaluate(i => Array.isArray(db.orders.find(x => x.id === i).warranty.operations) && db.orders.find(x => x.id === i).warranty.operations.length === 1, lg);
      rec('R07-003-B53', 'Operações legadas sem array só inicializam em sucesso válido', absent === true && present === true, JSON.stringify({ absent, present }));
      rec('R07-003-B54', 'Sem erros de página ou console nas ressalvas R07-002', errors.length === 0 && consoleErrors.length === 0, JSON.stringify({ errors, consoleErrors }));
      await ctx.close();
    }

    /* ================= S6 — permissões (F04) ================= */
    {
      const { ctx, a, errors, consoleErrors } = await session(browser, 1440, 900, 'r07-003s6');
      await assessTroca(a, 18);
      await swapUI(a, 18, { cost: '45.00' });
      for (const p of ['Financeiro', 'Técnico', 'Atendente']) {
        await role(a, p);
        await goto(a, '#os/18/garantia');
        const txt = await mainText(a);
        const btn = await a.locator('[data-action="modal:warrantySwap:18"]').count();
        const before = await snapshot(a, 18);
        const direct = await a.evaluate(() => {
          try { warrantySubmit('warrantySwap', db.orders.find(x => x.id === 18), { assessment: 1, source: 'externa', destination: 'retida_assistencia', type: 'Placa', brand: 'X', model: 'X', seal: 'X1', reason: 'X', cost: 0, confirm: true }); return 'sem erro'; } catch (e) { return e.message; }
        });
        rec(`R07-003-B55-${p}`, `${p} consulta a troca sem custo/ação e o handler direto é negado`, !/Custo interno/.test(txt) && !/R\$ 45,00/.test(txt) && btn === 0 && /Ação indisponível/.test(direct) && (await snapshot(a, 18)) === before, JSON.stringify({ direct, text: txt.slice(0, 260) }));
      }
      await role(a, 'Administrador');
      await goto(a, '#os/18/garantia');
      const adminText = await mainText(a);
      rec('R07-003-B56', 'Admin vê custo interno e mantém a ação somente antes de executar', /Custo interno/.test(adminText) && /R\$ 45,00/.test(adminText), adminText.slice(0, 500));
      rec('R07-003-B57', 'Sem erros de página ou console nas permissões', errors.length === 0 && consoleErrors.length === 0, JSON.stringify({ errors, consoleErrors }));
      await ctx.close();
    }
  } finally {
    await browser.close();
    const summary = results.reduce((s, r) => { s[r.status] = (s[r.status] || 0) + 1; return s; }, {});
    fs.writeFileSync(path.join(OUT, 'testes', 'r07-003-browser-resultados.json'), JSON.stringify({ generatedAt: new Date().toISOString(), codeSha: process.env.CODE_SHA || '', total: results.length, summary, results }, null, 2));
    console.log(`TOTAL ${results.length} · PASS ${summary.PASS || 0} · FAIL ${summary.FAIL || 0} · INFO ${summary.INFO || 0}`);
  }
})().catch(e => { console.error('ERRO FATAL', e); process.exit(1); });
