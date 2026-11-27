'use strict';
/*
 * R08-001 — navegador real (Chromium): identidade estável de linhas, cancelamento
 * por lineId/chave, N1/N2/N5/N6, FormData, localStorage, duas abas, responsividade,
 * teclado, axe, impressão e portal. Dados fictícios; nenhum backend.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const axe = require('axe-core');
const { BASE, OUT, makeRecorder, launch, session, goto, open, closeModal, submit, createOrder, setQuote, publish, role, mainText, order, actionCount } = require('./lib.cjs');

const { results, rec: recRaw } = makeRecorder();
const rec = (id, desc, ok, detail = '') => recRaw(id, desc, ok, typeof detail === 'string' ? detail : JSON.stringify(detail));
const DIR = path.join(OUT, 'capturas');
const manifest = [];
const scans = [];
const today = a => a.evaluate(() => today());

async function shot(a, dir, name, width) {
  const file = path.join(DIR, dir, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await a.waitForTimeout(160);
  await a.screenshot({ path: file, fullPage: true });
  const buf = fs.readFileSync(file);
  const dim = await a.evaluate(() => ({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight }));
  manifest.push({ file: path.relative(OUT, file), sha256: crypto.createHash('sha256').update(buf).digest('hex'), bytes: buf.length, width, ...dim });
}
async function axeScan(a, label, viewport) {
  const res = await a.evaluate(async () => await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }));
  const v = res.violations.map(x => ({ id: x.id, impact: x.impact, help: x.help, nodes: x.nodes.slice(0, 4).map(n => ({ target: n.target, summary: n.failureSummary })) }));
  scans.push({ label, viewport, violations: v });
  rec(`R08-AXE-${label}-${viewport}`, `axe sem violações: ${label} ${viewport}`, v.length === 0, v);
}
const lines = async (a, id) => a.evaluate(i => BancadaCancel.lines(db.orders.find(x => x.id === i)).map(l => ({ lineId: l.lineId, type: l.type, name: l.name, quantity: l.quantity, unit: l.unit })), id);
const draftIds = async (a, id) => (await lines(a, id)).map(l => l.lineId);
const quoteVersions = async (a, id) => a.evaluate(i => JSON.parse(JSON.stringify(db.orders.find(x => x.id === i).quote?.versions || [])), id);
const st = async (a, id) => a.evaluate(i => { const o = db.orders.find(x => x.id === i); return { status: o.status, total: o.total, paid: o.paid, billing: o.billing || null, approval: o.approval, ledger: o.financeLedger || null }; }, id);

async function editQuote(a, id, fn) {
  await goto(a, `#os/${id}/orcamento`);
  if (!(await open(a, 'quote', id))) throw new Error('editor de orçamento não abriu');
  await fn();
  return submit(a);
}
async function addRow(a, item) {
  await a.locator('[data-quote-add]').click();
  await a.waitForTimeout(60);
  const row = a.locator('.quote-edit-row').last();
  await row.locator('select[name=itemType]').selectOption(item.type);
  await row.locator('input[name=itemName]').fill(item.name);
  await row.locator('input[name=itemQty]').fill(String(item.quantity));
  await row.locator('input[name=itemUnit]').fill((item.unit / 100).toFixed(2));
}
async function requestCancel(a, id) {
  await goto(a, `#os/${id}/cancelamento`);
  if (!(await open(a, 'cancelrequest', id))) return false;
  await a.selectOption('#action-form select[name=origin]', 'cliente');
  await a.fill('#action-form textarea[name=reason]', 'Pedido fictício R08.');
  return submit(a);
}
async function openItem(a, id, lineId) {
  await goto(a, `#os/${id}/cancelamento`);
  const ok = await open(a, 'cancelitem', id, lineId);
  if (!ok) return null;
  return a.evaluate(() => ({ lineId: Number(document.querySelector('#action-form input[name=lineId]').value), key: document.querySelector('#action-form input[name=itemKey]').value }));
}
async function submitItem(a, { quantity = 1, disposition = 'unused', reason = '', confirm = true } = {}) {
  if (await a.locator('#action-form select[name=disposition]').count()) await a.selectOption('#action-form select[name=disposition]', disposition);
  const qty = a.locator('#action-form input[name=quantity]');
  if (await qty.count() && await qty.isVisible()) await qty.fill(String(quantity));
  if (reason) await a.fill('#action-form textarea[name=reason]', reason);
  if (confirm && await a.locator('#action-form input[name=confirm]').count()) await a.check('#action-form input[name=confirm]');
  return submit(a);
}

(async () => {
  const browser = await launch();
  try {
    /* ============ B1 — identidade no editor, FormData e publicação ============ */
    {
      const { ctx, a, errors, consoleErrors } = await session(browser, 1440, 900, 'r08b1');
      await role(a, 'Administrador');
      const created = await createOrder(a, { client: '1', brand: 'LG', model: 'R08', defect: 'Placa sem sinal — fixture R08.' });
      const id = created.id;
      let res = await setQuote(a, id, [
        { type: 'Peça', name: 'IGBT', quantity: 3, unit: 1000 },
        { type: 'Peça', name: 'IGBT', quantity: 3, unit: 1000 },
        { type: 'Serviço', name: 'Diagnóstico', quantity: 1, unit: 2000 }
      ]);
      let L = await lines(a, id);
      rec('R08-B01', 'Duas linhas idênticas + serviço recebem IDs distintos no editor real', !res.open && L.length === 3 && new Set(L.map(l => l.lineId)).size === 3, { L, res });

      // FormData carries the IDs and reopening the editor keeps them
      await goto(a, `#os/${id}/orcamento`); await open(a, 'quote', id);
      const formIds = await a.evaluate(() => [...document.querySelectorAll('#action-form input[name=itemId]')].map(i => i.value));
      const fm = await a.evaluate(() => new FormData(document.querySelector('#action-form')).getAll('itemId'));
      rec('R08-B02', 'FormData preserva os IDs e o editor reabre com a identidade gravada', JSON.stringify(formIds) === JSON.stringify(L.map(l => String(l.lineId))) && JSON.stringify(fm) === JSON.stringify(L.map(l => String(l.lineId))), { formIds, fm });
      await shot(a, 'desktop', '01-editor-duas-linhas-identicas-1440.png', 1440);

      // edit qty/name/price of row 0 -> same ID
      res = await editQuote(a, id, async () => {
        const row = a.locator('.quote-edit-row').nth(0);
        await row.locator('input[name=itemName]').fill('IGBT revisado');
        await row.locator('input[name=itemQty]').fill('2');
        await row.locator('input[name=itemUnit]').fill('12.00');
      });
      const L2 = await lines(a, id);
      rec('R08-B03', 'Editar nome, quantidade e preço no navegador preserva o ID da linha', !res.open && L2[0].lineId === L[0].lineId && L2[0].name === 'IGBT revisado' && L2[0].quantity === 2, { L2, res });

      // add a line -> new ID; remove it; add again -> no recycle
      res = await editQuote(a, id, async () => { await addRow(a, { type: 'Peça', name: 'Novo', quantity: 1, unit: 500 }); });
      const added = (await lines(a, id)).at(-1);
      await editQuote(a, id, async () => { await a.locator('.quote-edit-row [data-quote-remove]').last().click(); });
      res = await editQuote(a, id, async () => { await addRow(a, { type: 'Peça', name: 'Outro', quantity: 1, unit: 500 }); });
      const added2 = (await lines(a, id)).at(-1);
      rec('R08-B04', 'Inclusão posterior não recicla o ID da linha removida', added2.lineId > added.lineId && added.lineId > L[1].lineId, { added, added2 });

      // change type -> new ID
      res = await editQuote(a, id, async () => { await a.locator('.quote-edit-row').nth(0).locator('select[name=itemType]').selectOption('Serviço'); });
      const L3 = await lines(a, id);
      rec('R08-B05', 'Trocar o tipo no navegador aloca novo ID', !res.open && L3[0].lineId !== L[0].lineId && !L3.some(l => l.lineId === L[0].lineId), { before: L[0].lineId, after: L3[0].lineId });

      // tampered ID -> exact rejection, draft intact
      const beforeTamper = JSON.stringify(await lines(a, id));
      await goto(a, `#os/${id}/orcamento`); await open(a, 'quote', id);
      await a.evaluate(() => { document.querySelectorAll('#action-form input[name=itemId]')[0].value = '999'; });
      res = await submit(a);
      const afterTamper = JSON.stringify(await lines(a, id));
      rec('R08-B06', 'ID forjado no FormData é rejeitado com mensagem exata e rascunho intacto', res.open === true && res.error === 'O item mudou ou não pertence a esta OS. Reabra o orçamento.' && afterTamper === beforeTamper, { res, same: afterTamper === beforeTamper });
      await closeModal(a);

      // publish v1, edit, v1 immutable, publish v2 and approve without charge
      res = await publish(a, id);
      const v1 = (await quoteVersions(a, id))[0];
      const v1json = JSON.stringify(v1);
      await editQuote(a, id, async () => { await a.locator('.quote-edit-row').nth(1).locator('input[name=itemQty]').fill('5'); });
      const afterEdit = (await quoteVersions(a, id))[0];
      const labelTxt = await mainText(a);
      rec('R08-B07', 'Publicação anterior imutável; rascunho alterado muda a vigência', JSON.stringify(afterEdit) === v1json && /Itens alterados/.test(labelTxt), { v1: v1.number, changed: JSON.stringify(afterEdit) !== v1json });
      res = await publish(a, id);
      const versions = await quoteVersions(a, id);
      rec('R08-B08', 'Nova publicação preserva a v1 e cria a v2', versions.length === 2 && JSON.stringify(versions[0]) === v1json, { count: versions.length });

      await goto(a, `#os/${id}/orcamento`);
      await open(a, 'approval', id);
      await a.selectOption('#action-form select[name=answer]', 'Aprovado');
      await a.fill('#action-form input[name=name]', 'Cliente Fictício R08');
      await a.selectOption('#action-form select[name=channel]', 'presencial');
      await a.fill('#action-form input[name=date]', await today(a));
      await a.check('#action-form input[name=confirm]');
      res = await submit(a);
      const s1 = await st(a, id);
      rec('R08-B09', 'Aprovação não vira cobrança nem recebimento', !res.open && s1.approval === 'Aprovado' && s1.total === 0 && s1.billing === null && !s1.ledger, { res, s1 });
      await goto(a, `#os/${id}/orcamento`);
      await open(a, 'billing', id);
      await a.fill('#action-form input[name=due]', await today(a));
      await a.check('#action-form input[name=confirm]');
      res = await submit(a);
      const s2 = await st(a, id);
      const billingIds = s2.billing ? s2.billing.items.map(i => i.lineId) : [];
      rec('R08-B10', 'Cobrança formalizada carrega os lineIds e o total vigente', !res.open && s2.total > 0 && JSON.stringify(billingIds) === JSON.stringify((await lines(a, id)).map(l => l.lineId)), { s2, billingIds });
      rec('R08-B11', 'Sem exceções ou erros de console no fluxo de identidade', errors.length === 0 && consoleErrors.length === 0, { errors, consoleErrors });

      // print regression of the created order
      await goto(a, `#imprimir/${id}`);
      const printTxt = await mainText(a);
      rec('R08-B12', 'Impressão A4 renderiza a OS sem erro', /Ordem de serviço/i.test(printTxt) && /Total cobrado/.test(printTxt), printTxt.slice(0, 160));
      await shot(a, 'desktop', '02-impressao-os-1440.png', 1440);
      await ctx.close();
    }

    /* ============ B2 — cancelamento por identidade ============ */
    {
      const { ctx, a, errors, consoleErrors } = await session(browser, 1440, 900, 'r08b2');
      await role(a, 'Administrador');
      const created = await createOrder(a, { client: '2', brand: 'Midea', model: 'R08C', defect: 'Fixture R08 cancelamento.' });
      const id = created.id;
      await setQuote(a, id, [
        { type: 'Peça', name: 'IGBT', quantity: 3, unit: 1000 },
        { type: 'Peça', name: 'IGBT', quantity: 3, unit: 1000 },
        { type: 'Serviço', name: 'Diagnóstico', quantity: 1, unit: 2000 }
      ]);
      await requestCancel(a, id);
      let L = await lines(a, id);

      // modal A captured, A removed by another tab, old modal must not hit B
      const bId = L[1].lineId;
      const modalA = await openItem(a, id, L[0].lineId);
      const removeA = await a.evaluate(({ id, L }) => {
        const o = db.orders.find(x => x.id === id), line = BancadaCancel.lines(o).find(l => l.lineId === L[0].lineId);
        BancadaCancel.remove(o, line.lineId, 3, 'unused', '', new Date().toISOString(), db.orders, BancadaCancel.itemKey(o, line));
        return BancadaCancel.lines(o).map(l => l.lineId);
      }, { id, L });
      let res = await submitItem(a, { quantity: 1 });
      L = await lines(a, id);
      rec('R08-B13', 'Modal stale de A é recusado quando A já saiu; B não é atingida', res.error === 'Item não encontrado.' && L.length === 2 && L[0].lineId === bId && L[0].quantity === 3, { res, L, modalA, removeA, bId });
      await closeModal(a);

      // partial withdrawal keeps ID; stale key replay rejected; new key accepted
      const before = await lines(a, id);
      const modalB = await openItem(a, id, before[0].lineId);
      res = await submitItem(a, { quantity: 1 });
      const afterPartial = await lines(a, id);
      const replay = await a.evaluate(({ id, modalB }) => {
        const o = db.orders.find(x => x.id === id), before = JSON.stringify(o);
        let err = ''; try { cancelSubmit('cancelitem', o, { lineId: String(modalB.lineId), itemKey: modalB.key, quantity: '1', disposition: 'unused', confirm: true }); } catch (e) { err = e.message; }
        return { err, same: JSON.stringify(o) === before };
      }, { id, modalB });
      rec('R08-B14', 'Retirada parcial preserva ID; replay da chave antiga é rejeitado', !res.open && afterPartial[0].lineId === before[0].lineId && afterPartial[0].quantity === 2 && replay.err === 'O item ou pedido mudou. Reabra a conferência.' && replay.same, { res, afterPartial, replay });
      const modalB2 = await openItem(a, id, afterPartial[0].lineId);
      res = await submitItem(a, { quantity: 1 });
      rec('R08-B15', 'Nova chave após retirada parcial permite continuar', !res.open && (await lines(a, id))[0].lineId === before[0].lineId && (await lines(a, id))[0].quantity === 1, { res, modalB2 });

      // reorder keeps the selected line exact
      const Lr = await lines(a, id);
      await a.evaluate(({ id, Lr }) => {
        const o = db.orders.find(x => x.id === id), q = BancadaQuote.init(o);
        BancadaQuote.saveDraft(o, { items: [...q.draft.items].reverse(), discount: q.draft.discount, terms: q.draft.terms });
      }, { id, Lr });
      const target = (await lines(a, id))[0];
      const modalR = await openItem(a, id, target.lineId);
      res = await submitItem(a, { quantity: 1 });
      const afterReorder = await lines(a, id);
      rec('R08-B16', 'Reordenar não redireciona a seleção: a linha escolhida é removida', !res.open && !afterReorder.some(l => l.lineId === target.lineId), { target, res, modalR });

      // another OS key, forged key, nonexistent id, double submit
      const probe = await a.evaluate(({ id }) => {
        const o = db.orders.find(x => x.id === id);
        const line = BancadaCancel.lines(o)[0];
        const other = db.orders.find(x => x.id !== id && x.client === o.client && !x.origin);
        const otherKey = other && BancadaCancel.lines(other)[0] ? BancadaCancel.itemKey(other, BancadaCancel.lines(other)[0]) : 'x';
        const before = JSON.stringify(o), out = {};
        const run = (k, v) => { try { cancelSubmit('cancelitem', o, { lineId: String(line.lineId), itemKey: k, quantity: String(v), disposition: 'unused', confirm: true }); out[k] = 'accepted'; } catch (e) { out[k] = e.message; } };
        run(otherKey, 1); run('forjada', 1);
        try { cancelSubmit('cancelitem', o, { lineId: '999', itemKey: BancadaCancel.itemKey(o, line), quantity: '1', disposition: 'unused', confirm: true }); out.missing = 'accepted'; } catch (e) { out.missing = e.message; }
        return { out, same: JSON.stringify(o) === before };
      }, { id });
      rec('R08-B17', 'Chave de outra OS, chave forjada e ID inexistente são rejeitados sem estado', probe.same && probe.out[Object.keys(probe.out)[0]] === 'O item ou pedido mudou. Reabra a conferência.' && probe.out.forjada === 'O item ou pedido mudou. Reabra a conferência.' && probe.out.missing === 'Item não encontrado.', probe);

      const Lx = await lines(a, id);
      const m = await openItem(a, id, Lx[0].lineId);
      res = await submitItem(a, { quantity: 1 });
      const evCount = await a.evaluate(i => BancadaCancel.events(db.orders.find(x => x.id === i)).length, id);
      const replay2 = await a.evaluate(({ id, m }) => {
        let err = ''; try { cancelSubmit('cancelitem', db.orders.find(x => x.id === id), { lineId: String(m.lineId), itemKey: m.key, quantity: '1', disposition: 'unused', confirm: true }); } catch (e) { err = e.message; }
        return { err, events: BancadaCancel.events(db.orders.find(x => x.id === id)).length };
      }, { id, m });
      rec('R08-B18', 'Duplo envio do mesmo item não duplica evento', !res.open && replay2.err === 'Item não encontrado.' && replay2.events === evCount, { res, replay2 });

      rec('R08-B19', 'Sem exceções ou erros de console no cancelamento por identidade', errors.length === 0 && consoleErrors.length === 0, { errors, consoleErrors });
      await ctx.close();
    }

    /* ============ B3 — duas abas, legado e N1/N2/N5/N6 ============ */
    {
      const { ctx, a: p1, errors, consoleErrors } = await session(browser, 1440, 900, 'r08b3');
      await role(p1, 'Administrador');
      const created = await createOrder(p1, { client: '1', brand: 'Philco', model: 'R08T', defect: 'Fixture duas abas.' });
      const id = created.id;
      await setQuote(p1, id, [{ type: 'Serviço', name: 'Diagnóstico', quantity: 1, unit: 2000 }, { type: 'Serviço', name: 'Reparo', quantity: 1, unit: 3000 }]);
      await requestCancel(p1, id);
      const modal = await openItem(p1, id, (await lines(p1, id))[0].lineId);
      const p2 = await ctx.newPage();
      await p2.goto(`${BASE}/?r08b3b=${Date.now()}`, { waitUntil: 'networkidle' });
      await p2.evaluate(i => {
        const o = db.orders.find(x => x.id === i), line = BancadaCancel.lines(o)[0];
        BancadaCancel.remove(o, line.lineId, 1, 'notdone', '', new Date().toISOString(), db.orders, BancadaCancel.itemKey(o, line)); save();
      }, id);
      const otherTab = await p1.evaluate(() => localStorage.getItem(key));
      const res = await submitItem(p1, { quantity: 1 });
      const post = await p1.evaluate(i => ({ toast: (() => { const t = document.querySelector('#toast'); return t && !t.hidden ? t.textContent : ''; })(), raw: localStorage.getItem(key), lines: BancadaCancel.lines(db.orders.find(x => x.id === i)).length }), id);
      rec('R08-B20', 'Duas abas: envio obsoleto é interrompido com a mensagem exata e sem sobrescrever a outra aba', res.open === false && post.toast === 'Dados alterados em outra aba. Reabra a operação para evitar sobrescrever a atualização.' && post.raw === otherTab && post.lines === 1, { res, post, same: post.raw === otherTab });
      await p2.close();

      // legacy snapshot/billing untouched; draft gets IDs; portal has no private IDs
      const legacy = await p1.evaluate(i => {
        const o = db.orders.find(x => x.id === i);
        const item = { type: 'Peça', name: 'IGBT legado', quantity: 2, unit: 1000 };
        o.quote = { draft: { items: [{ ...item }], discount: 0, terms: {} }, versions: [{ number: 1, items: [{ ...item }], discount: 0, terms: {}, total: 2000, created: o.entry, decision: null }], current: 1, active: true };
        o.billing = { due: '2026-12-20', items: [{ ...item }], discount: 0 };
        o.total = 2000; o.paid = 0;
        save(); render();
        return { v: JSON.stringify(o.quote.versions), b: JSON.stringify(o.billing) };
      }, id);
      await goto(p1, `#os/${id}/orcamento`);
      const legacyAfter = await p1.evaluate(i => {
        const o = db.orders.find(x => x.id === i);
        return { v: JSON.stringify(o.quote.versions), b: JSON.stringify(o.billing), draft: BancadaCancel.lines(o).map(l => l.lineId), portal: JSON.stringify(BancadaPortal.projection(o)) };
      }, id);
      rec('R08-B21', 'Legado sem IDs: snapshot/cobrança intactos, rascunho identificado, portal sem IDs privados', legacyAfter.v === legacy.v && legacyAfter.b === legacy.b && legacyAfter.draft.every(v => Number.isSafeInteger(v) && v > 0) && !legacyAfter.portal.includes('lineId'), { legacyAfter });

      // N1 — fallback only for finalized root
      const n1 = await p1.evaluate(i => {
        const o = db.orders.find(x => x.id === i);
        o.status = 'Aberto'; o.conclusion = '2026-11-20'; o.warrantyDays = 90; save(); location.hash = 'os/' + i; render();
        const openText = document.querySelector('#main').innerText;
        const open = warrantyOriginRef(o) === null && !/Dentro do prazo|Prazo expirado/.test(openText);
        o.status = 'Finalizado'; save(); render();
        const finalText = document.querySelector('#main').innerText;
        return { open, final: !!warrantyOriginRef(o), text: /Dentro do prazo|Prazo expirado/.test(finalText) };
      }, id);
      rec('R08-B22', 'N1: raiz aberta/cancelada não usa fallback temporal; finalizada conserva o prazo', n1.open && n1.final && n1.text, n1);

      // N2 — active return from another origin is labelled as such
      const n2 = await p1.evaluate(i => {
        const base = db.orders.find(x => x.id === i);
        base.status = 'Aberto'; base.origin = 999; base.conclusion = '2026-11-20';
        db.orders.push({ id: 90, client: base.client, brand: base.brand, model: base.model, unit: base.unit, status: 'Aberto', origin: 777, entry: '2026-11-25', total: 0, paid: 0, history: [] });
        location.hash = 'os/' + i + '/garantia'; render();
        const text = document.querySelector('#main').innerText;
        const href = [...document.querySelectorAll('#main a')].find(a => a.textContent.includes('outra origem'))?.getAttribute('href') || '';
        const period = /Dentro do prazo|Prazo expirado/.test(text);
        location.hash = 'retorno/' + i; render();
        const direct = document.querySelector('#main').innerText;
        base.origin = undefined; db.orders.find(x => x.id === 90).origin = i; save();
        location.hash = 'os/' + i + '/garantia'; render();
        const sameOrigin = document.querySelector('#main').innerText.includes('outra origem');
        return { text: text.slice(0, 300), label: text.includes('outra origem'), href, period, direct: direct.includes('Retorno em andamento · outra origem'), sameOrigin };
      }, id);
      rec('R08-B23', 'N2: retorno de outra origem é identificado no link/rota direta, sem herdar prazo; mesma origem mantém o texto normal', n2.label && n2.href === '#os/90/garantia' && n2.direct && !n2.period && n2.sameOrigin === false, n2);

      // N5 — zero stock excluded and stale injection rejected
      await p1.evaluate(() => { db = seed(); save(); render(); role = 'Administrador'; });
      await p1.evaluate(() => { const r = db.orders.find(x => x.id === 18); warrantySubmit('warrantyAssess', r, { coverage: 'coberto', solution: 'troca', diagnosis: 'Teste N5', reason: 'Acordo', previous: 0, confirm: true }); db.stock.find(x => x.sku === 'P-002').quantity = 0; save(); });
      await goto(p1, '#os/18/garantia'); await open(p1, 'warrantySwap', 18);
      await p1.selectOption('#action-form select[name=source]', 'estoque'); await p1.waitForTimeout(120);
      const zero = await p1.evaluate(() => [...document.querySelectorAll('#action-form select[name=sku] option')].map(o => o.value));
      const offered = !zero.includes('P-002') && zero.includes('P-001');
      await p1.evaluate(() => {
        const f = document.querySelector('#action-form');
        f.elements.sku.insertAdjacentHTML('beforeend', '<option value="P-002">zero stale</option>'); f.elements.sku.value = 'P-002';
        for (const [k, v] of Object.entries({ type: 'Placa', brand: 'X', model: 'Y', seal: 'NOVA-N5' })) f.elements[k].value = v;
        f.elements.destination.value = 'retida_assistencia'; f.elements.reason.value = 'Motivo N5'; f.elements.confirm.checked = true;
      });
      const n5res = await p1.evaluate(() => { const f = document.querySelector('#action-form'); f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); return new Promise(r => setTimeout(() => { const e = document.querySelector('#modal-error'); r({ open: document.querySelector('#modal').open, error: e && !e.hidden ? e.textContent : '' }); }, 300)); });
      rec('R08-B24', 'N5: produto zerado não é oferecido e injeção direta é recusada', offered && n5res.open && n5res.error === 'Produto inexistente ou sem estoque disponível.', { zero, n5res });

      // N6 — duplicate normalized seal rejected before write; existing unit accepted
      await p1.evaluate(() => { db = seed(); save(); render(); });
      const mk = async (seal, mode = 'new', unit = null) => {
        await goto(p1, '#ordens');
        await goto(p1, '#nova');
        await p1.selectOption('#new-form select[name=client]', '1');
        await p1.selectOption('#new-form select[name=mode]', mode);
        await p1.waitForTimeout(140);
        if (mode === 'existing') await p1.selectOption('#new-form select[name=unit]', String(unit));
        else {
          await p1.fill('#new-form input[name=brand]', 'Marca N6'); await p1.fill('#new-form input[name=model]', 'Modelo N6');
          await p1.evaluate(s => { document.querySelector('#new-form input[name=seal]').value = s; }, seal);
        }
        await p1.fill('#new-form textarea[name=defect]', 'Defeito fictício N6.');
        const before = await p1.evaluate(() => db.orders.length);
        await p1.locator('#new-form button[type=submit]').click();
        await p1.waitForTimeout(360);
        return p1.evaluate(b => ({ before: b, after: db.orders.length, id: db.orders.at(-1).id, toast: (() => { const t = document.querySelector('#toast'); return t && !t.hidden ? t.textContent : ''; })(), seal: db.orders.at(-1).seal }), before);
      };
      const first = await mk('ABC 123');
      const dup = await mk('abc123');
      const existing = await mk('', 'existing', first.id);
      rec('R08-B25', 'N6: selo normalizado duplicado no modo novo é recusado; unidade existente é aceita', first.after === first.before + 1 && dup.after === dup.before && /Selo já cadastrado/.test(dup.toast) && existing.after === existing.before + 1, { first, dup, existing });

      const otherClient = async () => {
        await goto(p1, '#ordens'); await goto(p1, '#nova');
        await p1.selectOption('#new-form select[name=client]', '2');
        await p1.selectOption('#new-form select[name=mode]', 'new'); await p1.waitForTimeout(140);
        await p1.fill('#new-form input[name=brand]', 'Marca N6'); await p1.fill('#new-form input[name=model]', 'Modelo N6');
        await p1.evaluate(() => { document.querySelector('#new-form input[name=seal]').value = ' aBc 123 '; });
        await p1.fill('#new-form textarea[name=defect]', 'Defeito fictício N6.');
        const before = await p1.evaluate(() => db.orders.length);
        await p1.locator('#new-form button[type=submit]').click(); await p1.waitForTimeout(340);
        return p1.evaluate(b => ({ before: b, after: db.orders.length, toast: (() => { const t = document.querySelector('#toast'); return t && !t.hidden ? t.textContent : ''; })() }), before);
      };
      const other = await otherClient();
      const later = await (async () => {
        await goto(p1, '#ordens'); await goto(p1, '#nova');
        await p1.selectOption('#new-form select[name=client]', '1');
        await p1.selectOption('#new-form select[name=mode]', 'later'); await p1.waitForTimeout(140);
        await p1.evaluate(() => {
          const f = document.querySelector('#new-form');
          f.insertAdjacentHTML('beforeend', '<input type="hidden" name="brand" value="Marca N6"><input type="hidden" name="model" value="Modelo N6"><input type="hidden" name="seal" value="abc123">');
        });
        await p1.fill('#new-form textarea[name=defect]', 'Defeito fictício N6.');
        const before = await p1.evaluate(() => db.orders.length);
        await p1.locator('#new-form button[type=submit]').click(); await p1.waitForTimeout(340);
        return p1.evaluate(b => ({ before: b, after: db.orders.length, toast: (() => { const t = document.querySelector('#toast'); return t && !t.hidden ? t.textContent : ''; })() }), before);
      })();
      await p1.evaluate(() => { const o = db.orders.find(x => x.id === 16); o.warranty = { ...(o.warranty || {}), operations: [{ id: 1, type: 'troca', replacement: { unit: 999, brand: 'X', model: 'Y', seal: 'SUB 9' } }] }; save(); });
      const sub = await mk(' sub9 ');
      rec('R08-B25b', 'N6: outro cliente, modo "identificar depois" e selo de substituta também são recusados', other.after === other.before && /Selo já cadastrado/.test(other.toast) && later.after === later.before && /Selo já cadastrado/.test(later.toast) && sub.after === sub.before && /Selo já cadastrado/.test(sub.toast), { other, later, sub });
      rec('R08-B26', 'Sem exceções ou erros de console nas ressalvas N1/N2/N5/N6', errors.length === 0 && consoleErrors.length === 0, { errors, consoleErrors });
      await ctx.close();
    }

    /* ============ B4 — responsividade, teclado, axe e capturas ============ */
    {
      const { ctx, a, errors, consoleErrors } = await session(browser, 1440, 900, 'r08b4');
      await a.addScriptTag({ content: axe.source });
      await role(a, 'Administrador');
      const created = await createOrder(a, { client: '3', brand: 'Gree', model: 'R08R', defect: 'Fixture responsiva R08.' });
      const id = created.id;
      await setQuote(a, id, [
        { type: 'Peça', name: 'IGBT', quantity: 3, unit: 1000 },
        { type: 'Peça', name: 'IGBT', quantity: 3, unit: 1000 },
        { type: 'Serviço', name: 'Diagnóstico', quantity: 1, unit: 2000 }
      ]);
      await requestCancel(a, id);
      const lineId = (await lines(a, id))[0].lineId;
      for (const w of [1440, 768, 390, 320]) {
        await a.setViewportSize({ width: w, height: w <= 390 ? 780 : 900 });
        await goto(a, `#os/${id}/orcamento`); await open(a, 'quote', id);
        const overflow = await a.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
        rec(`R08-B27-${w}`, `Editor de orçamento sem overflow horizontal em ${w}px`, !overflow, { overflow });
        if (w === 1440 || w === 390) await shot(a, w === 1440 ? 'desktop' : 'mobile', `0${w === 1440 ? 3 : 4}-editor-orcamento-${w}.png`, w);
        await closeModal(a);
        await goto(a, `#os/${id}/cancelamento`); await open(a, 'cancelitem', id, lineId);
        const ov2 = await a.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
        rec(`R08-B28-${w}`, `Modal de conferência sem overflow horizontal em ${w}px`, !ov2, { overflow: ov2 });
        if (w === 1440 || w === 768 || w === 320) await shot(a, w === 1440 ? 'desktop' : w === 768 ? 'tablet' : 'mobile320', `0${w === 1440 ? 5 : w === 768 ? 6 : 7}-modal-conferencia-${w}.png`, w);
        if ([1440, 768, 390].includes(w)) await axeScan(a, 'modal-cancelitem', w);
        await closeModal(a);
      }
      // keyboard: focus trap + Escape returns focus
      await a.setViewportSize({ width: 1440, height: 900 });
      await goto(a, `#os/${id}/cancelamento`);
      const opener = a.locator(`[data-action="modal:cancelitem:${id}:${lineId}"]`);
      await opener.focus(); await opener.click(); await a.waitForTimeout(160);
      const firstFocus = await a.evaluate(() => document.querySelector('#modal').contains(document.activeElement));
      for (let i = 0; i < 8; i++) await a.keyboard.press('Tab');
      const trapped = await a.evaluate(() => document.querySelector('#modal').contains(document.activeElement));
      await a.keyboard.press('Escape'); await a.waitForTimeout(160);
      const closed = await a.evaluate(() => !document.querySelector('#modal').open);
      const focusBack = await a.evaluate(() => document.activeElement?.dataset?.action || '');
      rec('R08-B29', 'Teclado: foco entra e permanece no modal; Escape fecha e devolve o foco', firstFocus && trapped && closed && focusBack.includes('cancelitem'), { firstFocus, trapped, closed, focusBack });
      rec('R08-B30', 'Sem exceções ou erros de console na responsividade', errors.length === 0 && consoleErrors.length === 0, { errors, consoleErrors });
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
  const summary = results.reduce((s, r) => { s[r.status] = (s[r.status] || 0) + 1; return s; }, {});
  fs.writeFileSync(path.join(OUT, 'testes', 'r08-browser-resultados.json'), JSON.stringify({
    generatedAt: new Date().toISOString(), codeSha: process.env.CODE_SHA || '', incrementSha: process.env.INCREMENT_SHA || '', total: results.length, summary, results, axe: scans
  }, null, 2));
  fs.writeFileSync(path.join(OUT, 'capturas', 'manifesto.json'), JSON.stringify(manifest, null, 2));
  console.log(`\nTOTAL ${results.length} · PASS ${summary.PASS || 0} · FAIL ${summary.FAIL || 0}`);
  if (summary.FAIL) process.exitCode = 1;
})().catch(e => { console.error('FATAL', e); process.exit(1); });
