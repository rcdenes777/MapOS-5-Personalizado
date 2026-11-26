'use strict';
/*
 * R06 — validação independente de cancelamentos, conferência técnica e acerto.
 * Navegador real (Chromium), dados fictícios em localStorage.
 * Requer playwright-core; servidor estático em BASE_URL.
 */
const fs = require('node:fs');
const path = require('node:path');
const {
  BASE, OUT, makeRecorder, launch, session, goto, open, closeModal, submit, modalState,
  order, stock, createOrder, setQuote, publish, formalize, requestCancel, withdrawCancel,
  conferPiece, conferTechnical, confirmAcerto, pay, reverse, rectify, deliver, role,
  mainText, toastText, actionCount, queueCount, portalProjection, itemIndex, lineNames
} = require('./lib.cjs');

const { results, rec } = makeRecorder();
const today = async a => a.evaluate(() => today());

async function issueLink(a, id) {
  await goto(a, `#os/${id}/orcamento`);
  const existing = await a.evaluate(i => {
    const o = db.orders.find(x => x.id === i);
    return o.publicLink && BancadaPortal.active(o) ? o.publicLink.token : null;
  }, id);
  if (existing) return existing;
  if (!(await open(a, 'issuelink', id))) throw new Error('gerador de link não abriu para OS ' + id);
  await a.check('#action-form input[name=confirm]');
  await submit(a);
  return a.evaluate(i => db.orders.find(x => x.id === i).publicLink?.token || null, id);
}
async function portalPage(ctx, token) {
  const p = await ctx.newPage();
  const errors = [], consoleErrors = [], requests = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  p.on('request', r => requests.push(r.url()));
  await p.goto(`${BASE}/portal.html#${token}`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(280);
  return { p, errors, consoleErrors, requests, text: async () => (await p.locator('#customer-main').innerText()).replace(/\u00a0/g, ' ') };
}
const direct = (a, fn, ...args) => a.evaluate(({ src, args }) => {
  const f = eval(src);
  try { return { ok: true, value: f(...args) }; } catch (e) { return { ok: false, error: e.message }; }
}, { src: fn, args });

(async () => {
  const browser = await launch();
  try {
    /* ================= S1 — pedido, fila, retirada e bloqueios ================= */
    {
      const { ctx, a, errors, consoleErrors, requests } = await session(browser, 1440, 900, 'r06s1');
      await goto(a, '#os/23/cancelamento');
      let o = await order(a, 23); let text = await mainText(a);
      rec('R06-S1-01', 'OS #023 começa sem pedido, sem cobrança e com ação disponível',
        o.status === 'Orçamento' && o.total === 0 && o.paid === 0 && !o.delivery && !o.cancellation?.events?.length && /Sem pedido/.test(text) && (await actionCount(a, 'modal:cancelrequest:23')) === 1,
        JSON.stringify({ status: o.status, total: o.total, paid: o.paid, delivery: o.delivery, cancel: o.cancellation }));

      await open(a, 'cancelrequest', 23);
      await a.fill('#action-form textarea[name=reason]', 'Motivo fictício sem solicitante R06.');
      let st = await submit(a); o = await order(a, 23);
      rec('R06-S1-02', 'Pedido sem solicitante é bloqueado e não grava evento', st.open && !o.cancellation?.events?.length, JSON.stringify(st));

      await a.selectOption('#action-form select[name=origin]', 'cliente');
      await a.fill('#action-form textarea[name=reason]', '');
      st = await submit(a); o = await order(a, 23);
      rec('R06-S1-03', 'Pedido sem motivo é bloqueado e não grava evento', st.open && !o.cancellation?.events?.length, JSON.stringify(st));

      await a.fill('#action-form textarea[name=reason]', 'Cliente solicitou o cancelamento na bancada R06.');
      st = await submit(a); o = await order(a, 23);
      rec('R06-S1-04', 'Pedido preserva andamento, cobrança e entrega', !st.open && o.cancellation?.events?.length === 1 && o.status === 'Orçamento' && o.total === 0 && o.paid === 0 && !o.delivery,
        JSON.stringify({ status: o.status, total: o.total, paid: o.paid, delivery: o.delivery, events: o.cancellation?.events }));
      rec('R06-S1-05', 'Pedido guarda origem, motivo e registro imutável',
        o.cancellation.events[0].type === 'request' && o.cancellation.events[0].origin === 'cliente' && /bancada R06/.test(o.cancellation.events[0].reason) && o.cancellation.events[0].status === 'Orçamento',
        JSON.stringify(o.cancellation.events[0]));

      await goto(a, '#inicio');
      const metric = await a.locator('[data-action="queue:cancelamentos"]').innerText();
      rec('R06-S1-06', 'Fila de cancelamentos pendentes conta o pedido', (await queueCount(a, 'cancelamentos')) === 1 && /Cancelamentos pendentes/i.test(metric) && /1/.test(metric), metric.replace(/\n/g, ' | '));
      await goto(a, '#ordens');
      await a.locator('[data-action="filter:cancelamentos"]').click();
      await a.waitForTimeout(220);
      const cards = await a.locator('.list .order').count();
      const cardText = cards ? await a.locator('.list .order').first().innerText() : '';
      rec('R06-S1-07', 'Cartão da OS mostra “Cancelamento pendente” na fila', cards === 1 && /Cancelamento pendente/.test(cardText) && /#023/.test(cardText), `cards=${cards} ${cardText.replace(/\n/g, ' | ').slice(0, 200)}`);

      await goto(a, '#os/23/cancelamento');
      rec('R06-S1-08', 'Pedido pendente oculta nova solicitação e oferece retirada',
        (await actionCount(a, 'modal:cancelrequest:23')) === 0 && (await actionCount(a, 'modal:cancelwithdraw:23')) === 1, 'actions');

      const dup = await a.evaluate(() => {
        const o = db.orders.find(x => x.id === 23); const before = o.cancellation.events.length;
        let err = ''; try { BancadaCancel.request(o, 'cliente', 'Duplicado', new Date().toISOString(), db.orders); } catch (e) { err = e.message; }
        return { err, before, after: o.cancellation.events.length };
      });
      rec('R06-S1-09', 'Pedido duplicado é rejeitado sem novo evento', /pendente/i.test(dup.err) && dup.before === dup.after, JSON.stringify(dup));

      st = await withdrawCancel(a, 23, 'Cliente desistiu temporariamente R06.');
      o = await order(a, 23);
      rec('R06-S1-10', 'Retirada encerra a pendência sem desfazer o pedido anterior', !st.open && !(await a.evaluate(() => BancadaCancel.pending(db.orders.find(x => x.id === 23)))) && o.cancellation.events.length === 2 && o.cancellation.events[1].type === 'withdraw' && o.status === 'Orçamento', JSON.stringify(st));
      rec('R06-S1-11', 'Retirada devolve a ação de solicitar', (await actionCount(a, 'modal:cancelrequest:23')) === 1, 'request visible');

      st = await requestCancel(a, 23, 'assistencia', 'Reaberto pela assistência na bancada R06.');
      o = await order(a, 23);
      rec('R06-S1-12', 'Novo pedido após retirada registra nova origem', !st.open && o.cancellation.events.length === 3 && o.cancellation.events[2].type === 'request' && o.cancellation.events[2].origin === 'assistencia' && o.status === 'Orçamento', JSON.stringify(o.cancellation.events.map(e => [e.type, e.origin])));

      const blocked = [
        [20, /concluído, cancelado ou faturado legado/i],
        [19, /entrega física registrada/i],
        [16, /retorno ou solução de garantia vinculada/i]
      ];
      for (const [id, rx] of blocked) {
        await goto(a, `#os/${id}/cancelamento`);
        const t = await mainText(a);
        const btn = await actionCount(a, `modal:cancelrequest:${id}`);
        const d = await a.evaluate(i => {
          const o = db.orders.find(x => x.id === i); const before = JSON.stringify(o.cancellation || null);
          let err = ''; try { BancadaCancel.request(o, 'cliente', 'Teste', new Date().toISOString(), db.orders); } catch (e) { err = e.message; }
          return { err, before, after: JSON.stringify(o.cancellation || null) };
        }, id);
        rec(`R06-S1-13-${id}`, `OS #${String(id).padStart(3, '0')} bloqueada (${rx.source.slice(0, 24)})`, btn === 0 && rx.test(t) && d.err && d.before === d.after, JSON.stringify({ btn, blocked: rx.test(t), err: d.err }));
      }
      // F02 (R07-002): retorno sem solução executada e sem derivados deixou de ser bloqueado pelo vínculo genérico.
      await goto(a, '#os/18/cancelamento');
      const btn18 = await actionCount(a, 'modal:cancelrequest:18');
      rec('R06-S1-13-18', 'OS #018 elegível para pedido de cancelamento (F02)', btn18 === 1, JSON.stringify({ btn: btn18 }));

      await goto(a, '#os/23/cancelamento');
      await role(a, 'Técnico');
      let t = await mainText(a);
      rec('R06-S1-14', 'Técnico solicita/retira/conferem e não vê valores', (await actionCount(a, 'modal:cancelwithdraw:23')) === 1 && !/R\$/.test(t) && /Conferência técnica/.test(t), t.slice(0, 180));
      await role(a, 'Atendente');
      t = await mainText(a);
      rec('R06-S1-15', 'Atendente apenas consulta o cancelamento', (await actionCount(a, 'modal:cancelwithdraw:23')) === 0 && (await actionCount(a, 'modal:canceltechnical:23')) === 0 && !/R\$/.test(t), t.slice(0, 180));
      await role(a, 'Financeiro');
      t = await mainText(a);
      rec('R06-S1-16', 'Financeiro não solicita/retira/conferem e aguarda conferência', (await actionCount(a, 'modal:cancelrequest:23')) === 0 && (await actionCount(a, 'modal:cancelwithdraw:23')) === 0 && (await actionCount(a, 'modal:canceltechnical:23')) === 0 && /Aguardando conferência técnica/.test(t), t.slice(0, 200));
      await role(a, 'Administrador');
      rec('R06-S1-17', 'Administrador recupera todas as ações de cancelamento', (await actionCount(a, 'modal:cancelwithdraw:23')) === 1 && (await actionCount(a, 'modal:canceltechnical:23')) === 1, 'admin');

      rec('R06-S1-18', 'Sem exceções, erros de console ou requisições externas na S1', errors.length === 0 && consoleErrors.length === 0 && requests.every(u => u.startsWith(BASE) || u.startsWith('data:')), JSON.stringify({ errors, consoleErrors, external: requests.filter(u => !u.startsWith(BASE) && !u.startsWith('data:')).slice(0, 3) }));
      await ctx.close();
    }

    /* ================= S2 — peças, perda, serviços e invalidação ================= */
    {
      const { ctx, a, errors, consoleErrors } = await session(browser, 1440, 900, 'r06s2');
      const stockBefore = await stock(a);
      const created = await createOrder(a, { brand: 'Samsung', model: 'Bancada R06', defect: 'Placa sem alimentação — cenário de cancelamento.' });
      const id = created.id;
      const items = [
        { type: 'Peça', name: 'IGBT 650 V', quantity: 3, unit: 3000 },
        { type: 'Peça', name: 'Optoacoplador PC817', quantity: 2, unit: 1000 },
        { type: 'Peça', name: 'Capacitor 450 V', quantity: 1, unit: 500 },
        { type: 'Serviço', name: 'Diagnóstico', quantity: 1, unit: 5000 },
        { type: 'Serviço', name: 'Reparo', quantity: 1, unit: 8000 }
      ];
      await setQuote(a, id, items, 1000);
      await publish(a, id);
      let o = await order(a, id);
      rec('R06-S2-01', 'Orçamento publicado com 3 peças, 2 serviços e desconto', o.quote?.versions?.length === 1 && o.quote.versions[0].items.length === 5 && o.quote.versions[0].discount === 1000 && o.quote.versions[0].total === 23500 && o.status === 'Negociação', JSON.stringify({ status: o.status, version: o.quote?.versions?.[0] && { total: o.quote.versions[0].total, items: o.quote.versions[0].items.length, discount: o.quote.versions[0].discount } }));

      let st = await requestCancel(a, id, 'cliente', 'Cliente pediu cancelamento após orçamento R06.');
      o = await order(a, id);
      rec('R06-S2-02', 'Pedido mantém orçamento, andamento e entrega', !st.open && o.status === 'Negociação' && o.total === 0 && !o.delivery && o.quote.versions[0].items.length === 5 && o.cancellation.events[0].type === 'request', JSON.stringify(st));

      st = await conferPiece(a, id, 0, { disposition: 'unused', quantity: 1 });
      o = await order(a, id);
      const e1 = o.cancellation.events.at(-1);
      rec('R06-S2-03', 'Peça não utilizada conciliada em quantidade parcial sem entrada em estoque', !st.open && e1.type === 'item' && e1.disposition === 'unused' && e1.stockReturned === 0 && /Baixa não comprovada/.test(e1.stockNote) && o.quote.draft.items[0].quantity === 2 && JSON.stringify(await stock(a)) === JSON.stringify(stockBefore), JSON.stringify({ e1, qty: o.quote.draft.items[0].quantity }));

      st = await conferPiece(a, id, 0, { disposition: 'lost', quantity: 2, reason: '' });
      o = await order(a, id);
      rec('R06-S2-04', 'Consumo/perda exige motivo', st.open && /motivo|observa/i.test(st.error) && o.cancellation.events.length === 2 && o.quote.draft.items[0].quantity === 2, JSON.stringify(st));
      st = await conferPiece(a, id, 0, { disposition: 'lost', quantity: 2, reason: 'Peça consumida em teste de bancada R06.' });
      o = await order(a, id);
      const e2 = o.cancellation.events.at(-1);
      rec('R06-S2-05', 'Peça consumida é registrada sem retorno ao estoque', !st.open && e2.disposition === 'lost' && e2.stockReturned === 0 && /não retorna/.test(e2.stockNote) && o.quote.draft.items.length === 4, JSON.stringify({ e2, items: o.quote.draft.items.map(i => [i.name, i.quantity]) }));

      st = await conferPiece(a, id, await itemIndex(a, id, 'Optoacoplador PC817'), { disposition: 'lost', quantity: 2, reason: 'Optoacoplador perdido na bancada R06.' });
      o = await order(a, id);
      rec('R06-S2-06', 'Segunda peça consumida também não movimenta estoque', !st.open && o.quote.draft.items.length === 3 && !(await lineNames(a, id)).includes('Optoacoplador PC817') && JSON.stringify(await stock(a)) === JSON.stringify(stockBefore), JSON.stringify({ items: await lineNames(a, id), st }));

      // Conference must stay blocked while one piece remains.
      const noTech = await order(a, id);
      const techBtn = await actionCount(a, `modal:canceltechnical:${id}`);
      const directTech = await a.evaluate(i => {
        const o = db.orders.find(x => x.id === i); const before = o.cancellation.events.length;
        let err = ''; try { BancadaCancel.confer(o, true, 'Tentativa direta R06', new Date().toISOString(), db.orders); } catch (e) { err = e.message; }
        return { err, before, after: o.cancellation.events.length };
      }, id);
      rec('R06-S2-07', 'Conferência bloqueada enquanto há peça pendente', techBtn === 0 && /Concilie todas as peças/.test(directTech.err) && directTech.before === directTech.after, JSON.stringify({ techBtn, directTech }));

      const invalidQty = await a.evaluate(i => {
        const o = db.orders.find(x => x.id === i); const before = o.cancellation.events.length;
        const idx = BancadaCancel.lines(o).findIndex(x => x.name === 'Capacitor 450 V');
        let err = ''; try { BancadaCancel.remove(o, idx, 2, 'unused', '', new Date().toISOString(), db.orders); } catch (e) { err = e.message; }
        return { err, before, after: o.cancellation.events.length };
      }, id);
      rec('R06-S2-08', 'Quantidade acima do saldo é rejeitada no modelo', /Quantidade inválida/.test(invalidQty.err) && invalidQty.before === invalidQty.after, JSON.stringify(invalidQty));

      st = await conferPiece(a, id, await itemIndex(a, id, 'Capacitor 450 V'), { disposition: 'unused', quantity: 1 });
      o = await order(a, id);
      rec('R06-S2-09', 'Peças restantes conciliadas sem movimentar estoque', !st.open && o.quote.draft.items.length === 2 && !(await lineNames(a, id)).includes('Capacitor 450 V'), JSON.stringify(await lineNames(a, id)));

      st = await conferPiece(a, id, await itemIndex(a, id, 'Diagnóstico'), { disposition: null });
      o = await order(a, id);
      rec('R06-S2-10', 'Serviço não executado é retirado e o realizado permanece', !st.open && o.quote.draft.items.length === 1 && o.quote.draft.items[0].name === 'Reparo' && o.quote.versions[0].items.length === 5, JSON.stringify(o.quote.draft.items.map(i => i.name)));
      rec('R06-S2-11', 'Desconto do rascunho é zerado sem obrigação formalizada', o.quote.draft.discount === 0, 'discount=' + o.quote.draft.discount);

      st = await conferTechnical(a, id, 'Peças conciliadas e serviço de reparo executado — R06.');
      o = await order(a, id);
      rec('R06-S2-12', 'Conferência técnica concluída com peças zeradas e serviço executado', !st.open && (await a.evaluate(i => BancadaCancel.technical(db.orders.find(x => x.id === i)), id)) && o.cancellation.events.at(-1).type === 'technical', JSON.stringify(st));

      // Status change invalidates the conference.
      await goto(a, `#os/${id}`); await open(a, 'tech', id);
      await a.selectOption('#action-form select[name=status]', 'Aguardando Peças');
      await a.check('#action-form input[name=confirm]');
      st = await submit(a);
      const invalidByStatus = await a.evaluate(i => BancadaCancel.technical(db.orders.find(x => x.id === i)), id);
      await goto(a, `#os/${id}/cancelamento`);
      const afterStatus = await mainText(a);
      rec('R06-S2-13', 'Mudança de andamento invalida a conferência técnica', !st.open && invalidByStatus === false && /Conferência técnica/.test(afterStatus) && /Pendente/.test(afterStatus), JSON.stringify({ st, invalidByStatus }));
      await conferTechnical(a, id, 'Reconferência após mudança de andamento R06.');
      rec('R06-S2-14', 'Reconferência restabelece a conferência', await a.evaluate(i => BancadaCancel.technical(db.orders.find(x => x.id === i)), id), 'technical again');

      // Item change invalidates the conference.
      await goto(a, `#os/${id}/orcamento`); await open(a, 'quote', id);
      await a.locator('[data-quote-add]').click(); await a.waitForTimeout(40);
      const row = a.locator('.quote-edit-row').last();
      await row.locator('select[name=itemType]').selectOption('Serviço');
      await row.locator('input[name=itemName]').fill('Serviço extra R06');
      await row.locator('input[name=itemQty]').fill('1');
      await row.locator('input[name=itemUnit]').fill('100.00');
      await submit(a);
      const invalidByItem = await a.evaluate(i => BancadaCancel.technical(db.orders.find(x => x.id === i)), id);
      await goto(a, `#os/${id}/cancelamento`);
      const afterItem = await mainText(a);
      rec('R06-S2-15', 'Alteração de item invalida a conferência e bloqueia o acerto', invalidByItem === false && /Conferência técnica/.test(afterItem) && (await actionCount(a, `modal:cancelconfirm:${id}`)) === 0, JSON.stringify({ invalidByItem }));

      st = await conferPiece(a, id, await itemIndex(a, id, 'Serviço extra R06'), { disposition: null });
      const restored = await a.evaluate(i => BancadaCancel.technical(db.orders.find(x => x.id === i)), id);
      rec('R06-S2-16', 'Remover o item acrescentado restabelece o estado conferido', !st.open && restored === true, JSON.stringify(st));
      rec('R06-S2-17', 'Limitação registrada: a conferência é uma chave do estado atual; voltar ao estado idêntico reativa a chave (INFO)', 'INFO', 'technicalKey compara status+itens; não há evento de revogação. Encaminhado ao GPT como limite, sem alteração de regra.');

      st = await withdrawCancel(a, id, 'Retirada final da bancada R06.');
      o = await order(a, id);
      rec('R06-S2-18', 'Retirar o pedido não restaura os itens removidos', !st.open && o.quote.draft.items.length === 1 && o.quote.draft.items[0].name === 'Reparo' && o.quote.versions[0].items.length === 5 && o.cancellation.events.at(-1).type === 'withdraw', JSON.stringify({ items: o.quote.draft.items.map(i => i.name), versions: o.quote.versions[0].items.length }));

      rec('R06-S2-19', 'Nenhuma entrada em estoque durante toda a conferência', JSON.stringify(await stock(a)) === JSON.stringify(stockBefore), JSON.stringify({ before: stockBefore, after: await stock(a) }));
      rec('R06-S2-20', 'Sem exceções ou erros de console na S2', errors.length === 0 && consoleErrors.length === 0, JSON.stringify({ errors, consoleErrors }));
      await ctx.close();
    }

    /* ================= S3 — acerto sem cobrança anterior, estorno e entrega ================= */
    {
      const { ctx, a, errors, consoleErrors } = await session(browser, 1440, 900, 'r06s3');
      const token = await issueLink(a, 24);
      await role(a, 'Técnico');
      await goto(a, '#os/24/cancelamento');
      let t = await mainText(a);
      rec('R06-S3-01', 'Técnico solicita e não vê valores', (await actionCount(a, 'modal:cancelrequest:24')) === 1 && !/R\$/.test(t), t.slice(0, 160));
      let st = await requestCancel(a, 24, 'cliente', 'Cancelamento sem cobrança anterior — R06.');
      let o = await order(a, 24);
      rec('R06-S3-02', 'Pedido não altera andamento nem cria cobrança', !st.open && o.status === 'Aberto' && o.total === 0 && !o.billing && !o.delivery, JSON.stringify({ status: o.status, total: o.total, billing: o.billing }));
      st = await conferTechnical(a, 24, 'Sem peças; serviços executados conferidos R06.');
      rec('R06-S3-03', 'Técnico conclui a conferência sem valores', !st.open && (await a.evaluate(() => BancadaCancel.technical(db.orders.find(x => x.id === 24)))), JSON.stringify(st));
      const techConfirm = await a.evaluate(() => {
        const o = db.orders.find(x => x.id === 24); const before = o.cancellation.events.length;
        let err = ''; try { cancelSubmit('cancelconfirm', o, { gross: '80', discount: '10', confirm: true, financialConfirmed: true, settlementConfirmed: true, reason: 'Teste' }); } catch (e) { err = e.message; }
        return { err, before, after: o.cancellation.events.length };
      });
      rec('R06-S3-04', 'Técnico não confirma acerto nem por chamada direta', /não autorizada/i.test(techConfirm.err) && techConfirm.before === techConfirm.after, JSON.stringify(techConfirm));

      await role(a, 'Financeiro');
      await goto(a, '#os/24/cancelamento');
      t = await mainText(a);
      rec('R06-S3-05', 'Financeiro vê o acerto após a conferência', /Calcular acerto e confirmar/.test(t) && /R\$/.test(t) && (await actionCount(a, 'modal:cancelrequest:24')) === 0 && (await actionCount(a, 'modal:canceltechnical:24')) === 0, t.slice(0, 220));
      st = await confirmAcerto(a, 24, { gross: 8000, discount: 1000, reason: 'Diagnóstico e deslocamento — R06.' });
      o = await order(a, 24);
      rec('R06-S3-06', 'Acerto sem cobrança cria obrigação de R$ 70,00 e cancela', !st.open && o.status === 'Cancelado' && o.total === 7000 && o.paid === 0 && o.billing?.due === await today(a) && o.cancellation.events.at(-1).type === 'confirm' && o.delivery === null,
        JSON.stringify({ status: o.status, total: o.total, paid: o.paid, billing: o.billing, delivery: o.delivery }));
      rec('R06-S3-07', 'Fila de cancelamentos fica vazia após confirmar', (await queueCount(a, 'cancelamentos')) === 0, 'queue=0');

      await role(a, 'Administrador');
      st = await pay(a, 24, 7000, { method: 'Pix' });
      o = await order(a, 24);
      rec('R06-S3-08', 'Recebimento após cancelado é permitido no saldo a receber', !st.open && o.paid === 7000 && o.status === 'Cancelado' && o.ledger.events.length === 1, JSON.stringify({ paid: o.paid, status: o.status, events: o.ledger.events.length }));
      st = await reverse(a, 24, 1, 'Recebimento lançado em duplicidade — R06.');
      o = await order(a, 24);
      rec('R06-S3-09', 'Estorno corrige o recebimento e preserva o valor devido', !st.open && o.paid === 0 && o.total === 7000 && o.status === 'Cancelado' && o.ledger.events.length === 2 && o.ledger.events[1].type === 'reverse', JSON.stringify({ paid: o.paid, total: o.total, events: o.ledger.events.map(e => e.type) }));
      st = await pay(a, 24, 7000, { method: 'Dinheiro' });
      o = await order(a, 24);
      rec('R06-S3-10', 'Novo recebimento quita o saldo recomposto', !st.open && o.paid === 7000 && o.ledger.events.length === 3 && (await a.evaluate(() => moneyStatus(db.orders.find(x => x.id === 24)))) === 'Sem pendência', JSON.stringify({ paid: o.paid, events: o.ledger.events.length, status: o.status }));

      const p = await portalPage(ctx, token);
      let pt = await p.text();
      rec('R06-S3-11', 'Portal do cancelado oculta o orçamento e mostra a projeção financeira', /Não há orçamento publicado/.test(pt) && !/Versão \d+/.test(pt) && /Quitada/.test(pt) && /R\$ 70,00/.test(pt) && /R\$ 0,00/.test(pt), pt.slice(0, 700));
      rec('R06-S3-12', 'Portal não expõe motivos internos do cancelamento', !/Cancelamento|Diagnóstico e deslocamento|Recebimento lançado/.test(pt), 'privacy');

      await role(a, 'Atendente');
      await goto(a, '#os/24/cancelamento');
      t = await mainText(a);
      rec('R06-S3-13', 'Atendente consulta e pode registrar a entrega sem valores', !/R\$/.test(t) && (await actionCount(a, 'modal:delivery:24')) >= 1, t.slice(0, 180));
      st = await deliver(a, 24);
      o = await order(a, 24);
      rec('R06-S3-14', 'Entrega é operação independente e não altera o cancelamento', !st.open && !!o.delivery && o.status === 'Cancelado' && o.total === 7000 && o.paid === 7000 && o.delivery.date === await today(a), JSON.stringify({ status: o.status, delivery: o.delivery }));
      rec('R06-S3-15', 'OS cancelada e entregue sai da fila de retirada', !(await a.evaluate(() => queues[2][2](db.orders.find(x => x.id === 24)))), 'retirada');
      rec('R06-S3-16', 'Sem exceções, erros de console ou páginas externas na S3', errors.length === 0 && consoleErrors.length === 0 && p.errors.length === 0 && p.consoleErrors.length === 0, JSON.stringify({ errors, consoleErrors, portal: [p.errors, p.consoleErrors] }));
      await p.p.close();
      await ctx.close();
    }

    /* ================= S4 — devolução distinta do estorno ================= */
    {
      const { ctx, a, errors, consoleErrors } = await session(browser, 1440, 900, 'r06s4');
      const created = await createOrder(a, { brand: 'Midea', model: 'Bancada R06 S4', defect: 'Falha de comunicação — devolução R06.' });
      const id = created.id;
      await setQuote(a, id, [{ type: 'Serviço', name: 'Reparo completo', quantity: 1, unit: 24000 }], 0);
      await publish(a, id); await formalize(a, id);
      await pay(a, id, 10000, { method: 'Pix' });
      await pay(a, id, 14000, { method: 'Dinheiro' });
      let o = await order(a, id);
      rec('R06-S4-01', 'Duas entradas somam R$ 240,00 antes do cancelamento', o.total === 24000 && o.paid === 24000 && o.ledger.events.length === 2, JSON.stringify({ total: o.total, paid: o.paid }));
      const token = await issueLink(a, id);
      await requestCancel(a, id, 'cliente', 'Cliente desistiu do reparo após pagamento R06.');
      await conferTechnical(a, id, 'Serviço não executado; conferência R06.');
      o = await order(a, id);
      rec('R06-S4-02', 'Conferência técnica pronta para o acerto', o.cancellation.events.at(-1).type === 'technical' && o.status === 'Negociação', JSON.stringify(o.cancellation.events.map(e => e.type)));

      let st = await confirmAcerto(a, id, { gross: 10000, discount: 2000, refund: 15999, ref: 'Comprovante fictício R06 S4' });
      o = await order(a, id);
      rec('R06-S4-03', 'Devolução com valor divergente é rejeitada', st.open && /exatamente/i.test(st.error) && o.status === 'Negociação' && o.total === 24000 && o.paid === 24000, JSON.stringify(st));
      st = await confirmAcerto(a, id, { gross: 10000, discount: 2000, refund: 16000, ref: '' });
      o = await order(a, id);
      const refInvalid = await a.evaluate(() => {
        const r = document.querySelector('#action-form input[name=ref]');
        return { message: r?.validationMessage || '', valid: r?.checkValidity?.() ?? null };
      });
      rec('R06-S4-04', 'Devolução sem comprovante/referência é bloqueada no formulário', st.open && !!refInvalid.message && o.status === 'Negociação' && o.paid === 24000, JSON.stringify({ st, refInvalid }));
      st = await confirmAcerto(a, id, { gross: 10000, discount: 2000, refund: 16000, ref: 'Comprovante fictício R06 S4', date: await a.evaluate(() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); }) });
      o = await order(a, id);
      rec('R06-S4-05', 'Data da devolução anterior aos recebimentos é rejeitada', st.open && /anterior aos registros financeiros/i.test(st.error) && o.status === 'Negociação' && o.paid === 24000, JSON.stringify(st));
      const invalidDate = await a.evaluate(i => {
        const o = db.orders.find(x => x.id === i); const before = o.cancellation.events.length;
        let err = ''; try { cancelSubmit('cancelconfirm', o, { key: BancadaCancel.financialKey(o), gross: '100', discount: '20', refund: '160', date: '2026-02-30', method: 'Pix', ref: 'X', confirm: true, financialConfirmed: true, settlementConfirmed: true, reason: 'Teste' }); } catch (e) { err = e.message; }
        return { err, before, after: o.cancellation.events.length };
      }, id);
      rec('R06-S4-06', 'Data inválida e forma inválida são rejeitadas no modelo', /data e forma/i.test(invalidDate.err) && invalidDate.before === invalidDate.after && (await a.evaluate(i => { const o = db.orders.find(x => x.id === i); let e = ''; try { BancadaCancel.confirm(o, { key: BancadaCancel.financialKey(o), gross: 10000, discount: 2000, refund: 16000, date: today(), method: 'Cheque', ref: 'X', confirm: true, financialConfirmed: true, settlementConfirmed: true, reason: 'Teste' }, new Date().toISOString(), today(), db.orders); } catch (x) { e = x.message; } return /data e forma/i.test(e); }, id)), JSON.stringify(invalidDate));

      const sentinel = 'Comprovante fictício R06 S4';
      st = await confirmAcerto(a, id, { gross: 10000, discount: 2000, refund: 16000, ref: sentinel, reason: 'Acerto com devolução total do excedente R06.' });
      o = await order(a, id);
      const refundEvent = o.ledger?.events?.find(e => e.type === 'refund');
      rec('R06-S4-07', 'Confirmação calcula total devido de R$ 80,00 e devolução de R$ 160,00', !st.open && o.status === 'Cancelado' && o.total === 8000 && o.paid === 8000 && o.total - o.paid === 0 && o.cancellation.events.at(-1).settlement.result === 'a_devolver', JSON.stringify({ status: o.status, total: o.total, paid: o.paid, settle: o.cancellation.events.at(-1).settlement }));
      rec('R06-S4-08', 'Devolução é evento separado com valor, data, forma e referência', !!refundEvent && refundEvent.amount === 16000 && refundEvent.method === 'Pix' && refundEvent.reference === sentinel && o.ledger.events.length === 3, JSON.stringify(refundEvent));
      rec('R06-S4-09', 'Recibos originais permanecem e não são marcados como estornados', o.ledger.events[0].type === 'receive' && o.ledger.events[1].type === 'receive' && !o.ledger.events.some(e => e.type === 'reverse') && (await a.evaluate(i => { const o = db.orders.find(x => x.id === i); return [BancadaFinance.reversed(o, 1), BancadaFinance.reversed(o, 2)]; }, id)).every(x => x === null), JSON.stringify({ events: o.ledger.events.map(e => e.type) }));
      await goto(a, `#recibo/${id}/1`);
      let rt = await mainText(a);
      rec('R06-S4-10', 'Recibo original continua acessível e sem ESTORNADO', /Recibo #/.test(rt) && /R\$ 100,00/.test(rt) && !/ESTORNADO/.test(rt), rt.slice(0, 180));

      await goto(a, `#os/${id}/financeiro`);
      const fin = await mainText(a);
      rec('R06-S4-11', 'Financeiro mostra a devolução e bloqueia correções posteriores', /Devolução registrada/.test(fin) && /Comprovante:/.test(fin) && (await actionCount(a, `modal:reverse:${id}:1`)) === 0 && (await actionCount(a, `modal:rectify:${id}:1`)) === 0 && (await actionCount(a, `modal:rectify:${id}:2`)) === 0, fin.slice(0, 700));
      const lateReverse = await a.evaluate(i => {
        const o = db.orders.find(x => x.id === i); const before = o.financeLedger.events.length;
        let err = ''; try { BancadaFinance.reverse(o, 1, today(), 'Erro', new Date().toISOString()); } catch (e) { err = e.message; }
        return { err, before, after: o.financeLedger.events.length };
      }, id);
      rec('R06-S4-12', 'Correção após devolução é bloqueada no modelo', /devolução registrada|Retificação/i.test(lateReverse.err) && lateReverse.before === lateReverse.after, JSON.stringify(lateReverse));

      const proj = await portalProjection(a, id);
      rec('R06-S4-13', 'Projeção do portal reflete o líquido de R$ 80,00 e não contém referência privada', proj.finance?.total === 8000 && proj.finance?.paid === 8000 && proj.finance?.balance === 0 && proj.quote === null && !JSON.stringify(proj).includes(sentinel) && !JSON.stringify(proj).includes('Acerto com devolução'), JSON.stringify(proj));
      const p = await portalPage(ctx, token);
      const pt = await p.text();
      rec('R06-S4-14', 'Portal cancelado não mostra orçamento nem comprovante interno', /Não há orçamento publicado/.test(pt) && !/Versão \d+/.test(pt) && !pt.includes(sentinel) && /Quitada/.test(pt) && /R\$ 80,00/.test(pt), pt.slice(0, 700));
      await goto(a, `#imprimir/${id}`);
      const print = await mainText(a);
      rec('R06-S4-15', 'Impressão da OS cancelada não expõe a referência privada', /Cancelado/.test(print) && /R\$ 80,00/.test(print) && !print.includes(sentinel), print.slice(0, 260));
      rec('R06-S4-16', 'Sem exceções, erros de console ou páginas externas na S4', errors.length === 0 && consoleErrors.length === 0 && p.errors.length === 0 && p.consoleErrors.length === 0 && p.requests.every(u => u.startsWith(BASE) || u.startsWith('data:')), JSON.stringify({ errors, consoleErrors, portal: [p.errors, p.consoleErrors], external: p.requests.filter(u => !u.startsWith(BASE)).slice(0, 3) }));
      await p.p.close();
      await ctx.close();
    }

    /* ================= S5 — sem pendência, total zero e retificação ================= */
    {
      const { ctx, a, errors, consoleErrors } = await session(browser, 1440, 900, 'r06s5');
      const created = await createOrder(a, { brand: 'LG', model: 'Bancada R06 S5', defect: 'Retificação e acerto zerado R06.' });
      const id = created.id;
      await setQuote(a, id, [{ type: 'Serviço', name: 'Reparo de placa', quantity: 1, unit: 10000 }], 0);
      await publish(a, id); await formalize(a, id);
      const yesterday = await a.evaluate(() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); });
      await pay(a, id, 10000, { date: yesterday, method: 'Pix' });
      await requestCancel(a, id, 'cliente', 'Cliente cancelou após pagamento integral R06.');
      await conferTechnical(a, id, 'Serviço não executado; conferência R06.');
      let st = await confirmAcerto(a, id, { gross: 10000, discount: 0, reason: 'Acerto sem pendência R06.' });
      let o = await order(a, id);
      rec('R06-S5-01', 'Acerto sem pendência mantém total igual ao pago', !st.open && o.status === 'Cancelado' && o.total === 10000 && o.paid === 10000 && o.cancellation.events.at(-1).settlement.result === 'sem_pendencias', JSON.stringify({ status: o.status, total: o.total, paid: o.paid, settle: o.cancellation.events.at(-1).settlement }));
      await goto(a, `#os/${id}/cancelamento`);
      const doneNoRefund = await mainText(a);
      rec('R06-S5-01-B', 'Cancelamento sem devolução não anuncia “Devolução registrada”', !/Devolução registrada/.test(doneNoRefund) && /Valor final devido/.test(doneNoRefund), doneNoRefund.slice(0, 240));

      await role(a, 'Financeiro');
      await goto(a, `#os/${id}/financeiro`);
      let fin = await mainText(a);
      rec('R06-S5-02', 'Financeiro não recebe ação de retificação', !/Retificar recebimento/.test(fin), fin.slice(0, 200));
      const noPerm = await a.evaluate(i => {
        const o = db.orders.find(x => x.id === i); const before = o.financeLedger.events.length;
        let err = ''; try { financialSubmit('rectify', o, { eventId: '1', date: today(), reason: 'Sem permissão', rectification: 'lancamento_incorreto', confirm: true }); } catch (e) { err = e.message; }
        return { err, before, after: o.financeLedger.events.length };
      }, id);
      rec('R06-S5-03', 'Retificação sem permissão é bloqueada', /autorizada/i.test(noPerm.err) && noPerm.before === noPerm.after, JSON.stringify(noPerm));

      await role(a, 'Administrador');
      await goto(a, `#os/${id}/financeiro`);
      rec('R06-S5-04', 'Administrador vê a retificação autorizada', (await actionCount(a, `modal:rectify:${id}:1`)) === 1, 'rectify button');
      await open(a, 'rectify', id, 1);
      const modal = await a.locator('#action-form').innerText();
      rec('R06-S5-05', 'Retificação exige tipo explícito', (await a.locator('#action-form select[name=rectification]').count()) === 1 && /Selecione/.test(modal) && /Data da correção/.test(modal), modal.slice(0, 240));
      await a.selectOption('#action-form select[name=rectification]', 'lancamento_incorreto');
      await a.fill('#action-form input[name=date]', yesterday);
      await a.fill('#action-form textarea[name=reason]', 'Data anterior à confirmação R06.');
      await a.check('#action-form input[name=confirm]');
      st = await submit(a);
      o = await order(a, id);
      rec('R06-S5-06', 'Data anterior à confirmação do acerto é rejeitada', st.open && /período de retificação/i.test(st.error) && o.paid === 10000 && o.ledger.events.length === 1, JSON.stringify(st));
      await a.fill('#action-form input[name=date]', await today(a));
      await a.fill('#action-form textarea[name=reason]', 'Retificação autorizada após conferência R06.');
      await a.check('#action-form input[name=confirm]');
      st = await submit(a);
      o = await order(a, id);
      const rev = o.ledger.events.find(e => e.type === 'reverse');
      rec('R06-S5-07', 'Retificação autorizada recompõe o saldo e registra o tipo', !st.open && o.paid === 0 && o.total === 10000 && rev?.rectification === 'lancamento_incorreto' && o.ledger.events.length === 2 && (await a.evaluate(i => BancadaFinance.allowsReceive(db.orders.find(x => x.id === i)), id)), JSON.stringify(rev));
      await goto(a, `#recibo/${id}/1`);
      rec('R06-S5-08', 'Recibo retificado permanece e é marcado ESTORNADO', /ESTORNADO/.test(await mainText(a)), 'receipt marked');
      await goto(a, `#os/${id}/financeiro`);
      rec('R06-S5-09', 'Retificação duplicada não oferece ação', (await actionCount(a, `modal:rectify:${id}:1`)) === 0, 'no duplicate');
      const dup = await a.evaluate(i => {
        const o = db.orders.find(x => x.id === i); const before = o.financeLedger.events.length;
        let err = ''; try { financialSubmit('rectify', o, { eventId: '1', date: today(), reason: 'Duplicada', rectification: 'lancamento_incorreto', confirm: true }); } catch (e) { err = e.message; }
        return { err, before, after: o.financeLedger.events.length };
      }, id);
      rec('R06-S5-10', 'Retificação duplicada é rejeitada no modelo', /já estornado|inexistente/i.test(dup.err) && dup.before === dup.after, JSON.stringify(dup));
      st = await pay(a, id, 10000, { method: 'Transferência' });
      o = await order(a, id);
      rec('R06-S5-11', 'Saldo recomposto autoriza novo recebimento', !st.open && o.paid === 10000 && o.ledger.events.length === 3 && o.total === 10000, JSON.stringify({ paid: o.paid, events: o.ledger.events.length }));
      await role(a, 'Financeiro');
      const finRect = await a.evaluate(i => { const o = db.orders.find(x => x.id === i); openModal('rectify', i, 2); return document.querySelector('#modal').open; }, id);
      rec('R06-S5-12', 'Financeiro não abre retificação do novo recebimento', finRect === false, 'direct modal');

      await role(a, 'Administrador');
      // Total zero with a prior obligation.
      const zero = await createOrder(a, { brand: 'Gree', model: 'Bancada R06 S5 zero', defect: 'Acerto zerado com obrigação R06.' });
      const zeroId = zero.id;
      await setQuote(a, zeroId, [{ type: 'Serviço', name: 'Reparo zerado', quantity: 1, unit: 10000 }], 0);
      await publish(a, zeroId); await formalize(a, zeroId); await pay(a, zeroId, 10000, { method: 'Pix' });
      await requestCancel(a, zeroId, 'cliente', 'Cancelamento com devolução integral R06.');
      await conferTechnical(a, zeroId, 'Serviço não executado; conferência R06.');
      st = await confirmAcerto(a, zeroId, { gross: 0, discount: 0, refund: 10000, ref: 'Devolução integral fictícia R06', reason: 'Devolução integral do valor pago R06.' });
      let z = await order(a, zeroId);
      rec('R06-S5-13', 'Total zero com obrigação registra devolução integral', !st.open && z.status === 'Cancelado' && z.total === 0 && z.paid === 0 && z.ledger.events.some(e => e.type === 'refund' && e.amount === 10000) && z.billing?.settlement?.gross === 0, JSON.stringify({ status: z.status, total: z.total, paid: z.paid, billing: z.billing }));
      const zproj = await portalProjection(a, zeroId);
      rec('R06-S5-14', 'Portal do total zero com obrigação mostra Sem cobrança', zproj.finance?.status === 'Sem cobrança' && zproj.finance?.total === 0 && zproj.quote === null, JSON.stringify(zproj.finance));

      // Total zero without any prior obligation.
      const free = await createOrder(a, { brand: 'Philco', model: 'Bancada R06 S5 livre', defect: 'Cancelamento sem orçamento R06.' });
      const freeId = free.id;
      await requestCancel(a, freeId, 'cliente', 'Cancelamento sem orçamento e sem cobrança R06.');
      await conferTechnical(a, freeId, 'Sem itens; conferência R06.');
      await goto(a, `#os/${freeId}/cancelamento`);
      await open(a, 'cancelconfirm', freeId);
      await a.fill('#action-form input[name=gross]', '0.00');
      await a.fill('#action-form input[name=discount]', '0.00');
      await a.waitForTimeout(150);
      const refundBox = await a.evaluate(() => {
        const b = document.querySelector('#cancel-refund');
        return { hidden: b.hidden, display: getComputedStyle(b).display, height: b.getBoundingClientRect().height };
      });
      rec('R06-S5-15-A', 'Bloco de devolução fica oculto quando não há valor a devolver', refundBox.hidden === true && refundBox.display === 'none' && refundBox.height === 0, JSON.stringify(refundBox));
      await closeModal(a);
      st = await confirmAcerto(a, freeId, { gross: 0, discount: 0, reason: '', refund: null });
      let f = await order(a, freeId);
      rec('R06-S5-15', 'Total zero sem obrigação cancela sem criar cobrança', !st.open && f.status === 'Cancelado' && f.total === 0 && f.paid === 0 && !f.billing && f.cancellation.events.at(-1).settlement.result === 'sem_pendencias', JSON.stringify({ status: f.status, total: f.total, billing: f.billing }));
      await goto(a, `#os/${freeId}/cancelamento`);
      const freeText = await mainText(a);
      rec('R06-S5-15-B', 'Concluído sem devolução não exibe a linha “Devolução registrada”', !/Devolução registrada/.test(freeText) && /Valor final devido/.test(freeText), freeText.slice(0, 200));
      const fproj = await portalProjection(a, freeId);
      rec('R06-S5-16', 'Portal sem obrigação não exibe bloco financeiro', fproj.finance === null && fproj.quote === null, JSON.stringify(fproj));
      rec('R06-S5-17', 'Sem exceções, erros de console ou páginas externas na S5', errors.length === 0 && consoleErrors.length === 0, JSON.stringify({ errors, consoleErrors }));
      await ctx.close();
    }

    /* ================= S6 — duas abas, confirmação obsoleta e persistência ================= */
    {
      const { ctx, a, errors, consoleErrors, requests } = await session(browser, 1440, 900, 'r06s6');
      let st, o;
      const created = await createOrder(a, { brand: 'Daikin', model: 'Bancada R06 S6', defect: 'Concorrência entre abas R06.' });
      const id = created.id;
      await setQuote(a, id, [{ type: 'Serviço', name: 'Reparo concorrente', quantity: 1, unit: 24000 }], 0);
      await publish(a, id); await formalize(a, id); await pay(a, id, 10000, { method: 'Pix' });
      await requestCancel(a, id, 'cliente', 'Pedido para concorrência de abas R06.');
      await conferTechnical(a, id, 'Conferência antes da concorrência R06.');
      const b = await ctx.newPage();
      b.on('pageerror', e => errors.push('B: ' + e.message));
      b.on('console', m => { if (m.type() === 'error') consoleErrors.push('B: ' + m.text()); });
      b.on('request', r => requests.push(r.url()));
      await b.goto(`${BASE}/?r06tab=${Date.now()}#os/${id}/financeiro`, { waitUntil: 'networkidle' });
      await goto(a, `#os/${id}/cancelamento`);
      await open(a, 'cancelconfirm', id);
      await a.fill('#action-form input[name=gross]', '100.00');
      await a.fill('#action-form input[name=discount]', '20.00');
      await a.waitForTimeout(120);
      await a.fill('#action-form input[name=refund]', '20.00');
      await a.fill('#action-form input[name=ref]', 'Comprovante obsoleto R06');
      await a.fill('#action-form textarea[name=reason]', 'Acerto que ficará obsoleto R06.');
      await a.check('#action-form input[name=settlementConfirmed]');
      await a.check('#action-form input[name=financialConfirmed]');
      await a.check('#action-form input[name=confirm]');
      await b.waitForTimeout(200);
      await b.evaluate(i => { location.hash = `os/${i}/financeiro`; }, id);
      await b.waitForTimeout(250);
      if (!(await open(b, 'pay', id))) throw new Error('pagamento na segunda aba não abriu');
      await b.fill('#action-form input[name=amount]', '50.00');
      await b.selectOption('#action-form select[name=method]', 'Pix');
      await submit(b);
      await a.waitForTimeout(600);
      const toastA = await toastText(a);
      const stillOpen = await a.evaluate(() => document.querySelector('#modal').open);
      rec('R06-S6-01', 'Segunda aba altera o saldo e a primeira anuncia o conflito', /outra aba/i.test(toastA), JSON.stringify({ toastA, stillOpen }));
      st = await submit(a);
      o = await order(a, id);
      rec('R06-S6-02', 'Confirmação obsoleta é abortada e não grava cancelamento', !st.open && /outra aba/i.test(st.toast) && o.status === 'Negociação' && o.paid === 15000 && !o.cancellation.events.some(e => e.type === 'confirm'), JSON.stringify({ st, status: o.status, paid: o.paid, events: o.cancellation.events.map(e => e.type) }));

      await goto(a, `#os/${id}/cancelamento`);
      st = await confirmAcerto(a, id, { gross: 10000, discount: 2000, refund: 7000, ref: 'Comprovante final R06', reason: 'Acerto após conflito de abas R06.' });
      o = await order(a, id);
      rec('R06-S6-03', 'Acerto recalculado confirma o cancelamento com devolução de R$ 70,00', !st.open && o.status === 'Cancelado' && o.total === 8000 && o.paid === 8000 && o.cancellation.events.at(-1).type === 'confirm' && o.ledger.events.some(e => e.type === 'refund' && e.amount === 7000), JSON.stringify({ status: o.status, total: o.total, paid: o.paid, events: o.ledger.events.map(e => e.type) }));
      await b.waitForTimeout(600);
      const bText = await b.locator('#main').innerText();
      rec('R06-S6-04', 'Segunda aba atualiza para o cancelamento confirmado', /Cancelado/.test(bText) && /Sem pendência/.test(bText), bText.slice(0, 220));

      await a.reload({ waitUntil: 'networkidle' });
      await goto(a, `#os/${id}/cancelamento`);
      o = await order(a, id);
      await a.evaluate(() => { document.querySelectorAll('#main details').forEach(d => { d.open = true; }); });
      await a.waitForTimeout(120);
      const hist = await mainText(a);
      rec('R06-S6-05', 'Cancelamento e devolução persistem após recarregar', o.status === 'Cancelado' && o.total === 8000 && o.paid === 8000 && o.ledger.events.length === 3 && /Cancelamento concluído/.test(hist) && /Cancelamento confirmado/.test(hist), JSON.stringify({ status: o.status, events: o.ledger.events.length, hist: hist.slice(0, 300) }));

      // Stale key at model level on a separate pending order.
      const stale = await createOrder(a, { brand: 'Samsung', model: 'Bancada R06 S6 stale', defect: 'Confirmação obsoleta direta R06.' });
      const sid = stale.id;
      await setQuote(a, sid, [{ type: 'Serviço', name: 'Reparo obsoleto', quantity: 1, unit: 10000 }], 0);
      await publish(a, sid); await formalize(a, sid);
      await requestCancel(a, sid, 'cliente', 'Pedido para chave obsoleta R06.');
      await conferTechnical(a, sid, 'Conferência para chave obsoleta R06.');
      await goto(a, `#os/${sid}/cancelamento`);
      await open(a, 'cancelconfirm', sid);
      const staleRes = await a.evaluate(i => {
        const o = db.orders.find(x => x.id === i);
        const key = o.quote ? JSON.stringify([JSON.stringify([o.status, BancadaQuote.init(o).draft.items.map(x => [x.type, x.name, x.quantity, x.unit])]), BancadaQuote.init(o).draft.discount, o.total, o.paid, o.billing?.due || '', BancadaFinance.events(o), !!o.delivery, o.conclusion || null]) : null;
        const d = { key: document.querySelector('#action-form input[name=key]').value, gross: '100', discount: '0', refund: '0', confirm: true, financialConfirmed: true, settlementConfirmed: true, reason: 'Acerto obsoleto' };
        BancadaFinance.receive(o, 5000, today(), 'Pix', new Date().toISOString()); save();
        let err = ''; try { cancelSubmit('cancelconfirm', o, d); } catch (e) { err = e.message; }
        return { err, key: !!key, confirmed: o.cancellation.events.some(e => e.type === 'confirm') };
      }, sid);
      rec('R06-S6-06', 'Chave financeira obsoleta é rejeitada no modelo', /mudou|reabra/i.test(staleRes.err) && !staleRes.confirmed, JSON.stringify(staleRes));

      await closeModal(a);
      // Direct unauthorized attempts.
      await role(a, 'Técnico');
      const unauthTech = await a.evaluate(i => { const o = db.orders.find(x => x.id === i); openModal('cancelconfirm', i); let err = ''; try { cancelSubmit('cancelconfirm', o, { gross: '1', discount: '0', confirm: true }); } catch (e) { err = e.message; } return { modal: document.querySelector('#modal').open, err }; }, sid);
      rec('R06-S6-07', 'Técnico não abre nem executa o acerto', unauthTech.modal === false && /não autorizada/i.test(unauthTech.err), JSON.stringify(unauthTech));
      await role(a, 'Financeiro');
      const unauthFin = await a.evaluate(i => { const o = db.orders.find(x => x.id === i); openModal('cancelrequest', i); let err = ''; try { cancelSubmit('cancelrequest', o, { origin: 'cliente', reason: 'Tentativa' }); } catch (e) { err = e.message; } return { modal: document.querySelector('#modal').open, err }; }, sid);
      rec('R06-S6-08', 'Financeiro não solicita cancelamento nem por chamada direta', unauthFin.modal === false && /não autorizada/i.test(unauthFin.err), JSON.stringify(unauthFin));
      await role(a, 'Atendente');
      const unauthAtt = await a.evaluate(i => { const o = db.orders.find(x => x.id === i); openModal('cancelitem', i, 0); let err = ''; try { cancelSubmit('cancelitem', o, { index: '0', quantity: '1', disposition: 'unused', confirm: true }); } catch (e) { err = e.message; } return { modal: document.querySelector('#modal').open, err }; }, sid);
      rec('R06-S6-09', 'Atendente não confere itens nem por chamada direta', unauthAtt.modal === false && /não autorizada/i.test(unauthAtt.err), JSON.stringify(unauthAtt));

      rec('R06-S6-10', 'Sem exceções, erros de console ou requisições externas na S6', errors.length === 0 && consoleErrors.length === 0 && requests.every(u => u.startsWith(BASE) || u.startsWith('data:')), JSON.stringify({ errors, consoleErrors, external: requests.filter(u => !u.startsWith(BASE) && !u.startsWith('data:')).slice(0, 4) }));
      await ctx.close();
    }

    fs.writeFileSync(path.join(OUT, 'testes', 'browser-resultados.json'), JSON.stringify({
      generatedAt: new Date().toISOString(), codeSha: process.env.CODE_SHA || '', incrementSha: process.env.INCREMENT_SHA || '', results
    }, null, 2));
    const pass = results.filter(r => r.status === 'PASS').length, fail = results.filter(r => r.status === 'FAIL').length, info = results.filter(r => r.status === 'INFO').length;
    console.log(`\nTOTAL ${results.length} · PASS ${pass} · FAIL ${fail} · INFO ${info}`);
    if (fail) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch(e => { console.error('FATAL', e); process.exit(1); });
