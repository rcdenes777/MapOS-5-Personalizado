'use strict';
/*
 * R07-001 — laboratório de navegador real do incremento de garantia.
 * Chromium via playwright-core; dados fictícios em localStorage.
 * Requer servidor estático em BASE_URL.
 */
const fs = require('node:fs');
const path = require('node:path');
const {
  BASE, OUT, makeRecorder, launch, session, goto, open, closeModal, submit, modalState,
  order, stock, role, mainText, toastText, actionCount, setQuote
} = require('./lib.cjs');

const { results, rec } = makeRecorder();
const todayOf = async a => a.evaluate(() => today());

/* ---------- helpers específicos da garantia ---------- */
async function warranty(a, id) {
  return a.evaluate(i => {
    const o = db.orders.find(x => x.id === i);
    if (!o) return null;
    return JSON.parse(JSON.stringify({
      id: o.id, status: o.status, coverage: o.coverage || null, origin: o.origin || null,
      unit: o.unit ?? null, client: o.client, brand: o.brand, model: o.model,
      total: o.total, paid: o.paid, approval: o.approval, conclusion: o.conclusion || null,
      warrantyDays: o.warrantyDays ?? null, delivery: o.delivery || null,
      report: o.report ?? null, items: o.items ?? null, condition: o.condition ?? null,
      publicLink: o.publicLink || null,      quote: o.quote || null, billing: o.billing || null,
      financeLedger: o.financeLedger || null, warranty: o.warranty || null,
      events: o.warranty?.events || [], operations: o.warranty?.operations || [], history: o.history || []
    }));
  }, id);
}
async function snapshot(a, id) {
  return a.evaluate(i => {
    const o = db.orders.find(x => x.id === i);
    return o ? JSON.stringify(o) : null;
  }, id);
}
async function count(a) { return a.evaluate(() => db.orders.length); }
async function costs(a, id) {
  return a.evaluate(i => {
    const o = db.orders.find(x => x.id === i);
    return BancadaWarranty.costs(o);
  }, id);
}
async function assessmentId(a, id) {
  return a.evaluate(i => {
    const o = db.orders.find(x => x.id === i);
    return BancadaWarranty.assessment(o)?.id || 0;
  }, id);
}
async function fillReturn(a, { defect = 'Novo defeito fictício R07.', items = '', condition = '', confirm = true } = {}) {
  await a.fill('#new-form textarea[name=defect]', defect);
  if (items || condition) {
    await a.evaluate(({ items, condition }) => {
      const f = document.querySelector('#new-form');
      if (items) { f.elements.items.value = items; f.elements.items.dispatchEvent(new Event('input', { bubbles: true })); }
      if (condition) { f.elements.condition.value = condition; f.elements.condition.dispatchEvent(new Event('input', { bubbles: true })); }
    }, { items, condition });
  }
  if (confirm) await a.check('#new-form input[name=confirm]');
}
async function submitReturn(a) {
  await a.locator('#new-form button[type=submit]').click();
  await a.waitForTimeout(420);
  return a.evaluate(() => ({ hash: location.hash, toast: (() => { const t = document.querySelector('#toast'); return t && !t.hidden ? t.textContent : ''; })() }));
}
async function createReturn(a, originId, data = {}) {
  await goto(a, `#retorno/${originId}`);
  await fillReturn(a, data);
  return submitReturn(a);
}
async function assess(a, id, { coverage = 'coberto', solution = 'reparo_sem_cobranca', diagnosis = 'Diagnóstico fictício R07.', reason = 'Justificativa fictícia R07.', previous = null, confirm = true, submitIt = true } = {}) {
  await goto(a, `#os/${id}/garantia`);
  if (!(await open(a, 'warrantyAssess', id))) return { opened: false };
  const prev = previous === null ? await a.inputValue('#action-form input[name=previous]') : String(previous);
  if (previous !== null) await a.evaluate(v => { document.querySelector('#action-form input[name=previous]').value = v; }, String(previous));
  await a.selectOption('#action-form select[name=coverage]', coverage);
  await a.selectOption('#action-form select[name=solution]', solution);
  await a.fill('#action-form textarea[name=diagnosis]', diagnosis);
  await a.fill('#action-form textarea[name=reason]', reason);
  if (confirm) await a.check('#action-form input[name=confirm]');
  if (!submitIt) return { opened: true, previous: prev };
  const st = await submit(a);
  return { opened: true, previous: prev, ...st };
}
async function addCost(a, id, { amount = '25.50', minutes = '30', reason = 'Custo interno fictício R07.', confirm = true, submitIt = true } = {}) {
  await goto(a, `#os/${id}/garantia`);
  if (!(await open(a, 'warrantyCost', id))) return { opened: false };
  await a.fill('#action-form input[name=amount]', amount);
  await a.fill('#action-form input[name=minutes]', minutes);
  await a.fill('#action-form textarea[name=reason]', reason);
  if (confirm) await a.check('#action-form input[name=confirm]');
  if (!submitIt) return { opened: true };
  return { opened: true, ...(await submit(a)) };
}
async function correctCost(a, id, eventId, { reason = 'Correção fictícia R07.', confirm = true } = {}) {
  await goto(a, `#os/${id}/garantia`);
  if (!(await open(a, 'warrantyCorrect', id, eventId))) return { opened: false };
  await a.fill('#action-form textarea[name=reason]', reason);
  if (confirm) await a.check('#action-form input[name=confirm]');
  return { opened: true, ...(await submit(a)) };
}
async function tech(a, id, status, { days = null, confirm = true } = {}) {
  await goto(a, `#os/${id}`);
  if (!(await open(a, 'tech', id))) return { opened: false };
  await a.selectOption('#action-form select[name=status]', status);
  if (days !== null && (await a.locator('#action-form input[name=warrantyDays]').count())) {
    await a.fill('#action-form input[name=warrantyDays]', String(days));
  }
  if (confirm) await a.check('#action-form input[name=confirm]');
  return { opened: true, ...(await submit(a)) };
}
async function publishQuote(a, id) {
  await goto(a, `#os/${id}/orcamento`);
  if (!(await open(a, 'publish', id))) return { opened: false };
  await a.check('#action-form input[name=confirm]');
  return { opened: true, ...(await submit(a)) };
}
async function approveQuote(a, id, { answer = 'Aprovado', name = 'Cliente Fictício R07', channel = 'presencial', date = null, note = '' } = {}) {
  await goto(a, `#os/${id}/orcamento`);
  if (!(await open(a, 'approval', id))) return { opened: false };
  await a.selectOption('#action-form select[name=answer]', answer);
  await a.fill('#action-form input[name=name]', name);
  await a.selectOption('#action-form select[name=channel]', channel);
  if (date) await a.fill('#action-form input[name=date]', date);
  if (note) await a.fill('#action-form textarea[name=note]', note);
  await a.check('#action-form input[name=confirm]');
  return { opened: true, ...(await submit(a)) };
}
async function billing(a, id, due = null) {
  await goto(a, `#os/${id}/orcamento`);
  if (!(await open(a, 'billing', id))) return { opened: false };
  await a.fill('#action-form input[name=due]', due || await a.evaluate(() => today()));
  await a.check('#action-form input[name=confirm]');
  return { opened: true, ...(await submit(a)) };
}
async function withdrawQuote(a, id) {
  await goto(a, `#os/${id}/orcamento`);
  if (!(await open(a, 'withdraw', id))) return { opened: false };
  await a.check('#action-form input[name=confirm]');
  return { opened: true, ...(await submit(a)) };
}
async function issueLink(a, id) {
  await goto(a, `#os/${id}/orcamento`);
  if (!(await open(a, 'issuelink', id))) return null;
  await a.check('#action-form input[name=confirm]');
  await submit(a);
  return a.evaluate(i => db.orders.find(x => x.id === i).publicLink?.token || null, id);
}
const noOverflow = async (a, label) => a.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth).then(over => ({ over, label }));

(async () => {
  const browser = await launch();
  try {
    /* ============ S1 — entrada em garantia a partir da origem #020 ============ */
    {
      const { ctx, a, errors, consoleErrors } = await session(browser, 1440, 900, 'r07s1');
      await goto(a, '#os/20');
      let text = await mainText(a);
      rec('R07-S1-01', 'Origem #020 finalizada mostra garantia, conclusão e ação de retorno',
        text.includes('Garantia') && text.includes('Conclusão em') && (await a.locator('a[href="#retorno/20"]').count()) === 1,
        JSON.stringify({ hasGarantia: text.includes('Garantia'), hasConclusao: text.includes('Conclusão em'), links: await a.locator('a[href="#retorno/20"]').count() }));

      const before20 = await snapshot(a, 20);
      await goto(a, '#retorno/20');
      text = await mainText(a);
      const form = await a.evaluate(() => {
        const f = document.querySelector('#new-form');
        return f ? {
          origin: f.dataset.origin, fields: [...f.elements].map(e => e.name),
          hasClient: !!f.elements.client, hasMode: !!f.elements.mode,
          confirm: !!f.elements.confirm, scope: f.querySelector('.panel')?.innerText || ''
        } : null;
      });
      rec('R07-S1-02', 'Formulário de retorno traz origem, prazo, defeito obrigatório e opcionais, sem seletor de cliente',
        !!form && form.origin === '20' && form.hasClient === false && form.hasMode === false && form.confirm &&
        form.fields.includes('defect') && form.fields.includes('items') && form.fields.includes('condition') &&
        text.includes('Prazo original') && text.includes('Novo defeito relatado') && text.includes('Itens, acessórios e estado'),
        JSON.stringify(form));

      const n0 = await count(a);
      await fillReturn(a, { defect: 'Falha fictícia sem confirmação R07.', confirm: false });
      let st = await submitReturn(a);
      const blockedConfirm = await a.evaluate(() => { const f = document.querySelector('#new-form'); return { valid: f.checkValidity(), missing: f.elements.confirm.validity.valueMissing }; });
      rec('R07-S1-03', 'Sem confirmação o retorno não é criado e o envio é barrado',
        (await count(a)) === n0 && blockedConfirm.missing === true && st.toast === '',
        JSON.stringify({ n0, n1: await count(a), st, blockedConfirm }));

      await goto(a, '#retorno/20');
      const validity = await a.evaluate(() => { const f = document.querySelector('#new-form'); f.reset(); return { valid: f.checkValidity(), defect: f.elements.defect.validity.valueMissing }; });
      rec('R07-S1-04', 'Defeito vazio é barrado pela validação nativa do formulário',
        validity.valid === false && validity.defect === true, JSON.stringify(validity));

      await fillReturn(a, { defect: 'Placa voltou a falhar após o reparo.', items: 'Cabo de força', condition: 'Embalagem amassada' });
      await a.check('#new-form input[name=confirm]');
      st = await submitReturn(a);
      const created = await a.evaluate(() => {
        const o = db.orders.at(-1);
        return {
          id: o.id, status: o.status, origin: o.origin, unit: o.unit, client: o.client, brand: o.brand, model: o.model,
          total: o.total, paid: o.paid, approval: o.approval, conclusion: o.conclusion, warrantyDays: o.warrantyDays,
          defect: o.defect, items: o.items, condition: o.condition, report: o.report ?? null,
          publicLink: o.publicLink ?? null, quote: o.quote ?? null, delivery: o.delivery ?? null,
          warranty: o.warranty, history: o.history
        };
      });
      const after20 = await snapshot(a, 20);
      rec('R07-S1-05', 'Retorno criado preserva origem e não copia financeiro, laudo, anexos, token ou orçamento',
        created.id === 25 && created.status === 'Aberto' && created.origin === 20 && created.client === 1 &&
        created.brand === 'Midea' && created.model === 'Xtreme Save' && created.total === 0 && created.paid === 0 &&
        created.conclusion === null && created.warrantyDays === 0 && created.delivery === null &&
        created.report === null && created.publicLink === null && created.quote === null &&
        created.defect === 'Placa voltou a falhar após o reparo.' && created.items === 'Cabo de força' && created.condition === 'Embalagem amassada' &&
        created.warranty?.root === 20 && created.warranty?.previous === 20 && created.warranty?.unit === 20 &&
        created.warranty?.days === 90 && created.warranty?.end != null && created.history?.length === 1 &&
        after20 === before20,
        JSON.stringify({ created, unchanged: after20 === before20 }));

      await goto(a, '#os/20');
      text = await mainText(a);
      const linkText = await a.evaluate(() => [...document.querySelectorAll('a[href="#os/25/garantia"]')].map(x => x.textContent));
      rec('R07-S1-06', 'Origem passa a apontar para o retorno em andamento',
        text.includes('Abrir retorno em andamento #025') && linkText.some(t => t.includes('Abrir retorno em andamento')),
        JSON.stringify(linkText));

      await goto(a, '#retorno/20');
      text = await mainText(a);
      rec('R07-S1-07', 'Segunda entrada pela origem é bloqueada com link para o retorno ativo',
        text.includes('Retorno em andamento') && text.includes('#025') && !(await a.locator('#new-form').count()),
        text.slice(0, 140));

      await goto(a, '#retorno/999');
      rec('R07-S1-08', 'URL direta de retorno inexistente não abre formulário',
        (await a.locator('#new-form').count()) === 0 && (await mainText(a)).includes('Ação indisponível'));

      await goto(a, '#retorno/24');
      rec('R07-S1-09', 'Origem sem conclusão não permite retorno',
        (await a.locator('#new-form').count()) === 0 && (await mainText(a)).includes('Retorno indisponível'),
        (await mainText(a)).slice(0, 120));

      await a.evaluate(() => {
        db.orders.push({ id: 29, client: 1, brand: '', model: '', type: 'Placa eletrônica', defect: 'Sem identificação.', entry: '2026-11-01', status: 'Finalizado', total: 0, paid: 0, approval: 'Aprovado', delivery: null, conclusion: '2026-11-02', warrantyDays: 90, history: [], unit: 29 });
        save();
      });
      await goto(a, '#retorno/29');
      rec('R07-S1-14', 'Unidade sem marca/modelo não permite retorno',
        (await a.locator('#new-form').count()) === 0 && (await mainText(a)).includes('Retorno indisponível'),
        (await mainText(a)).slice(0, 120));

      const stockBefore = await stock(a);
      const link19 = await issueLink(a, 19);
      const before19 = await snapshot(a, 19);
      await createReturn(a, 19, { defect: 'Falha fictícia na unidade entregue.', confirm: true });
      const id19r = await a.evaluate(() => db.orders.at(-1).id);
      const o19r = await warranty(a, id19r);
      const after19 = await snapshot(a, 19);
      rec('R07-S1-10', 'Retorno de origem entregue e com link não herda token, laudo nem dados financeiros',
        !!link19 && o19r.origin === 19 && o19r.publicLink === null && o19r.report === null && o19r.total === 0 && o19r.paid === 0 && o19r.delivery === null &&
        after19 === before19 && JSON.stringify(stockBefore) === JSON.stringify(await stock(a)),
        JSON.stringify({ link19: !!link19, created: o19r.id, publicLink: o19r.publicLink, report: o19r.report }));

      /* prazo expirado e desconhecido em origens sintéticas sem retorno ativo */
      await a.evaluate(() => {
        const mk = (id, conclusion, days) => {
          const o = { id, client: 1, brand: 'Synthetic', model: 'Warranty ' + id, type: 'Placa eletrônica', defect: 'Origem sintética de prazo.', entry: '2019-12-01', items: '', condition: '', status: 'Finalizado', total: 0, paid: 0, approval: 'Aprovado', delivery: null, conclusion, history: [{ time: '2019-12-01T12:00:00Z', text: 'Entrada registrada' }], unit: id };
          if (days !== undefined) o.warrantyDays = days;
          db.orders.push(o); return o;
        };
        mk(27, '2020-01-01', 90);
        mk(28, '2026-10-01', undefined);
        save();
      });
      await goto(a, '#retorno/27');
      const expiredForm = await mainText(a);
      const exp = await a.evaluate(() => {
        const o = db.orders.find(x => x.id === 27);
        return BancadaWarranty.reference(o, db.orders);
      });
      await fillReturn(a, { defect: 'Retorno com prazo expirado.', confirm: true });
      await submitReturn(a);
      const idExp = await a.evaluate(() => db.orders.at(-1).id);
      const expiredCreated = await warranty(a, idExp);
      rec('R07-S1-11', 'Prazo vencido é exibido e não presume cobertura automática',
        expiredForm.includes('Prazo expirado') && exp.end === '2020-03-31' && expiredCreated.coverage === 'Em avaliação' && expiredCreated.warranty?.end === '2020-03-31',
        JSON.stringify({ exp, coverage: expiredCreated.coverage, end: expiredCreated.warranty?.end }));

      await goto(a, '#retorno/28');
      const unknownForm = await mainText(a);
      await fillReturn(a, { defect: 'Retorno com prazo desconhecido.', confirm: true });
      await submitReturn(a);
      const idUnknown = await a.evaluate(() => db.orders.at(-1).id);
      const unknownCreated = await warranty(a, idUnknown);
      rec('R07-S1-12', 'Prazo desconhecido mostra não informado e não inventa vencimento',
        unknownForm.includes('Prazo não informado') && unknownCreated.warranty?.days === null && unknownCreated.warranty?.end === null,
        JSON.stringify({ days: unknownCreated.warranty?.days, end: unknownCreated.warranty?.end }));

      rec('R07-S1-13', 'Sem erros de página ou console no fluxo de entrada',
        errors.length === 0 && consoleErrors.length === 0, JSON.stringify({ errors, consoleErrors }));
      await ctx.close();
    }

    /* ============ S2 — duas abas na entrada ============ */
    {
      const { ctx, a, errors, consoleErrors } = await session(browser, 1440, 900, 'r07s2');
      const b = await ctx.newPage();
      const errsB = []; b.on('pageerror', e => errsB.push(e.message));
      await b.goto(`${BASE}/?r07s2b=${Date.now()}`, { waitUntil: 'networkidle' });
      await goto(a, '#retorno/20'); await fillReturn(a, { defect: 'Retorno da aba A.' });
      await goto(b, '#retorno/20'); await fillReturn(b, { defect: 'Retorno da aba B.' });
      const n0 = await count(a);
      await submitReturn(a);
      const n1 = await count(a);
      const stB = await submitReturn(b);
      const n2 = await count(a);
      const ids = await a.evaluate(() => db.orders.filter(o => o.origin === 20).map(o => o.id));
      rec('R07-S2-01', 'Duas abas: a segunda gravação é bloqueada e não duplica o retorno',
        n1 === n0 + 1 && n2 === n1 && ids.length === 1 && /Dados alterados em outra aba/.test(stB.toast),
        JSON.stringify({ n0, n1, n2, ids, stB: stB.toast }));
      rec('R07-S2-02', 'Duas abas: nenhuma exceção de página',
        errors.length === 0 && errsB.length === 0 && consoleErrors.length === 0, JSON.stringify({ errors, errsB, consoleErrors }));
      await ctx.close();
    }

    /* ============ S3 — ciclo #016/#018: avaliação, revisão, conclusão e segundo retorno ============ */
    {
      const { ctx, a, errors, consoleErrors } = await session(browser, 1440, 900, 'r07s3');
      await goto(a, '#os/16');
      let text = await mainText(a);
      rec('R07-S3-01', 'Origem #016 com #018 ativo exibe vínculo e impede novo retorno',
        text.includes('Abrir retorno em andamento') && text.includes('#018') && (await a.locator('a[href="#retorno/16"]').count()) === 0,
        JSON.stringify({ text: text.slice(-260) }));

      await goto(a, '#os/18/garantia');
      text = await mainText(a);
      const ref = await a.evaluate(() => { const o = db.orders.find(x => x.id === 18); return BancadaWarranty.binding(o, db.orders); });
      rec('R07-S3-02', 'Retorno legado #018 resolve vínculo com #016 sem inventar dados',
        ref?.root === 16 && ref?.previous === 16 && ref?.days === 90 && ref?.end != null &&
        text.includes('Referência original') && text.includes('OS de origem') && text.includes('#016') &&
        text.includes('Concluão original'.replace('Concluão', 'Conclusão')) && text.includes('Prazo original') && text.includes('Avaliação da cobertura'),
        JSON.stringify(ref));

      let r = await assess(a, 18, { coverage: 'avaliacao', solution: 'reparo_sem_cobranca', diagnosis: '', reason: 'Decisão sem cobertura.' });
      rec('R07-S3-03', 'Avaliação sem cobertura concluída não escolhe solução',
        r.error === 'Conclua a avaliação de cobertura antes de escolher a solução.' && (await warranty(a, 18)).events.length === 0,
        JSON.stringify(r));

      r = await assess(a, 18, { coverage: 'coberto', solution: 'reparo_sem_cobranca', diagnosis: '', reason: 'Diagnóstico sem texto.' });
      rec('R07-S3-04', 'Diagnóstico é obrigatório quando a cobertura é concluída',
        r.error === 'Confira os textos obrigatórios e seus limites.' && (await warranty(a, 18)).events.length === 0,
        JSON.stringify(r));

      const before18 = await snapshot(a, 18);
      r = await assess(a, 18, { coverage: 'coberto', solution: 'reparo_sem_cobranca', diagnosis: 'Falha do reparo original.', reason: 'Conferido na bancada.' });
      let w = await warranty(a, 18);
      rec('R07-S3-05', 'Avaliação registrada não muda andamento, cobrança, entrega nem histórico financeiro',
        w.events.length === 1 && w.coverage === 'Coberto' && w.status === 'Aberto' && w.total === 0 && w.paid === 0 && w.delivery === null &&
        w.events[0].type === 'avaliar' && w.events[0].coverage === 'coberto' && w.events[0].solution === 'reparo_sem_cobranca' &&
        w.history?.some(h => h.text === 'Garantia: avaliação registrada') && w.financeLedger === null,
        JSON.stringify({ events: w.events.length, coverage: w.coverage, status: w.status, total: w.total, paid: w.paid, delivery: w.delivery }));

      r = await assess(a, 18, { previous: 0, coverage: 'nao_coberto', solution: 'novo_orcamento', reason: 'Stale.' });
      rec('R07-S3-06', 'Avaliação com versão anterior obsoleta é recusada e não altera o histórico',
        r.error === 'Outra avaliação foi registrada. Recarregue antes de decidir.' && (await warranty(a, 18)).events.length === 1,
        JSON.stringify(r));

      r = await assess(a, 18, { previous: 1, coverage: 'nao_coberto', solution: 'novo_orcamento', diagnosis: 'Falha nova fora da cobertura.', reason: 'Revisão da decisão.' });
      w = await warranty(a, 18);
      rec('R07-S3-07', 'Revisão cria novo evento e preserva o anterior imutável',
        w.events.length === 2 && w.coverage === 'Não coberto' && w.events[0].coverage === 'coberto' && w.events[0].diagnosis === 'Falha do reparo original.' &&
        w.events[1].coverage === 'nao_coberto' && w.events[1].id === 2,
        JSON.stringify(w.events));

      /* duas abas na avaliação */
      const b = await ctx.newPage();
      const errsB = []; b.on('pageerror', e => errsB.push(e.message));
      await b.goto(`${BASE}/?r07s3b=${Date.now()}`, { waitUntil: 'networkidle' });
      await goto(a, '#os/18/garantia'); await open(a, 'warrantyAssess', 18);
      await a.selectOption('#action-form select[name=coverage]', 'coberto');
      await a.selectOption('#action-form select[name=solution]', 'reparo_sem_cobranca');
      await a.fill('#action-form textarea[name=diagnosis]', 'Avaliação da aba A.');
      await a.fill('#action-form textarea[name=reason]', 'Aba A.');
      await a.check('#action-form input[name=confirm]');
      await b.evaluate(() => { location.hash = '#os/18/garantia'; });
      await b.waitForTimeout(220);
      await b.evaluate(() => handleAction('modal:warrantyAssess:18'));
      await b.waitForTimeout(160);
      await b.evaluate(() => {
        const f = document.querySelector('#action-form');
        f.elements.coverage.value = 'coberto';
        f.elements.solution.value = 'reparo_sem_cobranca';
        f.elements.diagnosis.value = 'Avaliação da aba B.';
        f.elements.reason.value = 'Aba B.';
        f.elements.confirm.checked = true;
      });
      await submit(a);
      const stB = await b.evaluate(() => {
        document.querySelector('#action-form button[type=submit]').click();
        return new Promise(res => setTimeout(() => {
          const t = document.querySelector('#toast');
          res({ toast: t && !t.hidden ? t.textContent : '', events: db.orders.find(x => x.id === 18).warranty.events.length });
        }, 420));
      });
      rec('R07-S3-08', 'Duas abas na avaliação: segunda gravação bloqueada, sem evento extra',
        stB.events === 3 && /Dados alterados em outra aba/.test(stB.toast),
        JSON.stringify(stB));

      /* finalizar reparo sem cobrança (após revisão voltar a reparo) */
      r = await assess(a, 18, { previous: 3, coverage: 'coberto', solution: 'reparo_sem_cobranca', diagnosis: 'Reparo coberto.', reason: 'Volta ao reparo.' });
      const originBefore = await snapshot(a, 16);
      const st = await tech(a, 18, 'Finalizado');
      w = await warranty(a, 18);
      rec('R07-S3-09', 'Concluir reparo sem cobrança grava conclusão e não concede nova garantia',
        w.status === 'Finalizado' && w.conclusion != null && w.total === 0 && w.paid === 0 && w.delivery === null && w.warrantyDays === 0 &&
        w.coverage === 'Coberto' && (await snapshot(a, 16)) === originBefore,
        JSON.stringify({ status: w.status, conclusion: w.conclusion, total: w.total, paid: w.paid, days: w.warrantyDays, st }));

      await goto(a, '#os/16');
      const link16 = await a.evaluate(() => [...document.querySelectorAll('a[href^="#retorno/"]')].map(x => x.getAttribute('href')));
      await goto(a, '#retorno/16');
      const formBase = await a.evaluate(() => document.querySelector('#new-form')?.dataset.origin || null);
      rec('R07-S3-10a', 'Origem com retorno finalizado aponta para o atendimento anterior, não cria irmão',
        link16.length === 1 && link16[0] === '#retorno/18' && formBase === '18',
        JSON.stringify({ link16, formBase }));

      await goto(a, '#nova');
      await a.selectOption('#new-form select[name=client]', '3');
      await a.selectOption('#new-form select[name=mode]', 'existing');
      await a.waitForTimeout(180);
      // R07-003: a lista deduplica por unidade física (physical().unit), então a OS legada
      // #018 (sem `unit`, origin 16) representa a mesma unidade da raiz #016. Seleciona a
      // opção cuja unidade física é a 16, sem presumir o id da OS que a representa.
      const unitOpt = await a.evaluate(() => {
        const f = document.querySelector('#new-form');
        const want = BancadaWarranty.physical(db.orders.find(x => x.id === 16)).unit;
        const hit = [...f.elements.unit.options].find(opt => {
          const ord = db.orders.find(x => String(x.id) === opt.value);
          return ord && BancadaWarranty.physical(ord).unit === want;
        });
        return hit ? hit.value : null;
      });
      if (!unitOpt) throw new Error('unidade 16 ausente na seleção de OS existente');
      await a.selectOption('#new-form select[name=unit]', unitOpt);
      await a.fill('#new-form textarea[name=defect]', 'OS ordinária ativa da mesma unidade.');
      await a.locator('#new-form button[type=submit]').click();
      await a.waitForTimeout(420);
      const ordId = await a.evaluate(() => db.orders.at(-1).id);
      await goto(a, '#os/' + ordId);
      const ordLinks = await a.evaluate(() => [...document.querySelectorAll('a[href^="#retorno/"]')].map(x => x.getAttribute('href')));
      await goto(a, '#retorno/' + ordId);
      const ordForm = await a.locator('#new-form').count();
      rec('R07-S3-10b', 'OS ordinária ativa da mesma unidade não oferece nem abre retorno',
        ordLinks.length === 0 && ordForm === 0 && (await mainText(a)).includes('Retorno indisponível'),
        JSON.stringify({ ordId, ordLinks, ordForm }));

      const after18 = await snapshot(a, 18);
      const created = await createReturn(a, 16, { defect: 'Segundo retorno fictício da unidade.', confirm: true });
      const idSecond = await a.evaluate(() => db.orders.at(-1).id);
      const second = await warranty(a, idSecond);
      const after18b = await snapshot(a, 18);
      const rootRef = await a.evaluate(() => BancadaWarranty.reference(db.orders.find(x => x.id === 16), db.orders));
      rec('R07-S3-10', 'Segundo retorno herda raiz e prazo original e preserva o anterior',
        second.origin === 16 && second.warranty?.previous === 18 && second.warranty?.root === 16 && second.warranty?.days === 90 &&
        second.warranty?.end === rootRef.end && after18b === after18,
        JSON.stringify({ idSecond, origin: second.origin, warranty: second.warranty, rootEnd: rootRef.end, st: created }));

      /* fim sem avaliação em retorno novo */
      const pre = await warranty(a, idSecond);
      await tech(a, idSecond, 'Finalizado');
      const noAssess = await warranty(a, idSecond);
      rec('R07-S3-11', 'Retorno sem avaliação pode concluir e continua sem cobertura presumida',
        pre.events.length === 0 && noAssess.status === 'Finalizado' && noAssess.coverage === 'Em avaliação' &&
        noAssess.conclusion != null && noAssess.warrantyDays === 0 && noAssess.total === 0,
        JSON.stringify({ status: noAssess.status, coverage: noAssess.coverage, events: noAssess.events.length }));

      /* retorno anterior não reabre com irmão ativo */
      await createReturn(a, idSecond, { defect: 'Terceiro retorno fictício da unidade.', confirm: true });
      const b18 = await snapshot(a, 18);
      const sib = await tech(a, 18, 'Em Andamento');
      const activeNow = await a.evaluate(() => db.orders.filter(o => (o.origin === 16 || o.id === 16) && !['Finalizado', 'Cancelado'].includes(o.status)).map(o => o.id));
      rec('R07-S3-12a', 'Retorno anterior com irmão ativo não reabre e mantém um único ativo',
        sib.error === 'Esta OS já originou retorno. Preserve o atendimento encerrado e use a nova OS.' && (await snapshot(a, 18)) === b18 && activeNow.length === 1,
        JSON.stringify({ sib, activeNow }));
      await closeModal(a);

      /* origem sem entrega (#020) não reabre com derivado */
      await createReturn(a, 20, { defect: 'Retorno fictício para bloquear a origem.', confirm: true });
      await goto(a, '#os/20');
      const before20 = await snapshot(a, 20);
      const reopen = await tech(a, 20, 'Em Andamento');
      rec('R07-S3-12', 'Origem sem entrega com retorno derivado não reabre',
        reopen.error === 'Esta OS já originou retorno. Preserve o atendimento encerrado e use a nova OS.' && (await snapshot(a, 20)) === before20,
        JSON.stringify(reopen));

      rec('R07-S3-13', 'Sem erros de página ou console no ciclo de avaliação',
        errors.length === 0 && errsB.length === 0 && consoleErrors.length === 0, JSON.stringify({ errors, errsB, consoleErrors }));
      await ctx.close();
    }

    /* ============ S4 — bloqueios de conclusão e prazo da OS ordinária ============ */
    {
      const { ctx, a, errors, consoleErrors } = await session(browser, 1440, 900, 'r07s4');
      await assess(a, 18, { coverage: 'nao_coberto', solution: 'troca', diagnosis: 'Falha não coberta.', reason: 'Troca indicada.' });
      const before = await snapshot(a, 18);
      let r = await tech(a, 18, 'Finalizado');
      rec('R07-S4-01', 'Concluir retorno com troca pendente é bloqueado antes de qualquer mutação',
        r.error === 'Execute a solução de garantia escolhida antes de concluir o retorno.' && (await snapshot(a, 18)) === before,
        JSON.stringify(r));

      await assess(a, 18, { previous: 1, coverage: 'nao_coberto', solution: 'devolucao_valor', diagnosis: 'Falha não coberta.', reason: 'Devolução indicada.' });
      const before2 = await snapshot(a, 18);
      r = await tech(a, 18, 'Finalizado');
      rec('R07-S4-02', 'Concluir retorno com devolução pendente é bloqueado',
        r.error === 'Execute a solução de garantia escolhida antes de concluir o retorno.' && (await snapshot(a, 18)) === before2,
        JSON.stringify(r));

      /* origem #016 com entrega e derivado não reabre */
      const b16 = await snapshot(a, 16);
      r = await tech(a, 16, 'Em Andamento');
      rec('R07-S4-03', 'Origem entregue com derivado não reabre',
        r.error === 'Esta OS já originou retorno. Preserve o atendimento encerrado e use a nova OS.' && (await snapshot(a, 16)) === b16,
        JSON.stringify(r));
      await closeModal(a);

      /* OS ordinária: campo de prazo e preservação */
      const created = await a.evaluate(() => {
        const id = Math.max(0, ...db.orders.map(o => o.id)) + 1;
        db.orders.push({ id, client: 1, brand: 'Teste', model: 'Prazo', type: 'Placa eletrônica', defect: 'Defeito fictício de prazo.', entry: today(), items: '', condition: '', status: 'Aberto', total: 10000, paid: 0, approval: 'Aprovado', delivery: null, conclusion: null, history: [], warrantyDays: 0, unit: id });
        save(); return id;
      });
      await a.evaluate(id => { location.hash = '#os/' + id; }, created);
      await a.waitForTimeout(220);
      await open(a, 'tech', created);
      const hasField = await a.locator('#action-form input[name=warrantyDays]').count();
      await closeModal(a);
      const st = await tech(a, created, 'Finalizado', { days: 180 });
      const o1 = await warranty(a, created);
      await goto(a, '#os/' + created);
      await open(a, 'tech', created);
      const hasAfter = await a.locator('#action-form input[name=warrantyDays]').count();
      await closeModal(a);
      const c1 = o1.conclusion;
      await tech(a, created, 'Em Andamento');
      await tech(a, created, 'Finalizado', { days: 9999 });
      const o2 = await warranty(a, created);
      rec('R07-S4-04', 'OS ordinária pede prazo antes da conclusão e o preserva depois',
        hasField === 1 && o1.warrantyDays === 180 && o1.conclusion != null && hasAfter === 0 &&
        o2.warrantyDays === 180 && o2.conclusion === c1,
        JSON.stringify({ hasField, days: o1.warrantyDays, conclusion: o1.conclusion, hasAfter, after: { days: o2.warrantyDays, conclusion: o2.conclusion }, st }));

      rec('R07-S4-05', 'Sem erros de página ou console nos bloqueios',
        errors.length === 0 && consoleErrors.length === 0, JSON.stringify({ errors, consoleErrors }));
      await ctx.close();
    }

    /* ============ S5 — custos privados e permissões ============ */
    {
      const { ctx, a, errors, consoleErrors } = await session(browser, 1440, 900, 'r07s5');
      await goto(a, '#os/18/garantia');
      let text = await mainText(a);
      rec('R07-S5-01', 'Admin vê custos privados e ação de registrar',
        text.includes('Custos internos declarados') && (await actionCount(a, 'modal:warrantyCost:18')) === 1,
        text.slice(-200));

      const ledgerBefore = await a.evaluate(() => JSON.stringify(db.orders.find(x => x.id === 18).financeLedger || null));
      const stockBefore = await stock(a);
      let r = await addCost(a, 18, { amount: '25.50', minutes: '30', reason: 'Custo interno fictício R07.' });
      let c = await costs(a, 18);
      const ledgerAfter = await a.evaluate(() => JSON.stringify(db.orders.find(x => x.id === 18).financeLedger || null));
      rec('R07-S5-02', 'Custo 25,50 e 30 min é registrado sem caixa nem estoque',
        r.error === '' && c.amount === 2550 && c.minutes === 30 && ledgerAfter === ledgerBefore && JSON.stringify(stockBefore) === JSON.stringify(await stock(a)) &&
        (await mainText(a)).includes('Custo interno fictício R07.'),
        JSON.stringify({ c, ledgerAfter, stock: await stock(a) }));

      r = await addCost(a, 18, { amount: '0', minutes: '30', reason: 'Somente tempo de bancada.' });
      c = await costs(a, 18);
      rec('R07-S5-03', 'Zero reais com tempo válido é aceito',
        r.error === '' && c.amount === 2550 && c.minutes === 60, JSON.stringify({ c, r }));

      const before0 = await snapshot(a, 18);
      r = await addCost(a, 18, { amount: '0', minutes: '0', reason: 'Registro vazio.' });
      rec('R07-S5-04', 'Custo e tempo zerados são rejeitados com mensagem específica',
        r.error === 'Informe custo interno ou tempo de trabalho válido.' && (await snapshot(a, 18)) === before0, JSON.stringify(r));

      const limitState = await snapshot(a, 18);
      r = await addCost(a, 18, { amount: '10000000.00', minutes: '10', reason: 'Acima do limite.' });
      const domLimit = await a.evaluate(() => {
        const o = db.orders.find(x => x.id === 18);
        try { warrantySubmit('warrantyCost', o, { amount: '10000000.00', minutes: '10', reason: 'Acima do limite.', confirm: true }); return 'sem erro'; }
        catch (e) { return e.message; }
      });
      rec('R07-S5-05', 'Valor acima do limite é rejeitado no formulário e no handler',
        r.open === true && r.error === '' && domLimit === 'Informe custo interno ou tempo de trabalho válido.' &&
        (await snapshot(a, 18)) === limitState && (await costs(a, 18)).amount === 2550,
        JSON.stringify({ r, domLimit }));

      r = await addCost(a, 18, { amount: '10.00', minutes: '100001', reason: 'Tempo acima do limite.' });
      const domMinutes = await a.evaluate(() => {
        const o = db.orders.find(x => x.id === 18);
        try { warrantySubmit('warrantyCost', o, { amount: '10.00', minutes: '100001', reason: 'Tempo acima do limite.', confirm: true }); return 'sem erro'; }
        catch (e) { return e.message; }
      });
      rec('R07-S5-06', 'Tempo acima do limite é rejeitado no formulário e no handler',
        r.open === true && r.error === '' && domMinutes === 'Informe custo interno ou tempo de trabalho válido.' && (await costs(a, 18)).minutes === 60,
        JSON.stringify({ r, domMinutes }));

      r = await correctCost(a, 18, 1, { reason: 'Custo duplicado na bancada.' });
      c = await costs(a, 18);
      const ev = (await warranty(a, 18)).events;
      rec('R07-S5-07', 'Correção única zera o custo e preserva o registro original',
        r.error === '' && c.amount === 0 && c.minutes === 30 && ev[0].amount === 2550 && ev.some(e => e.type === 'corrigir_custo' && e.reference === 1),
        JSON.stringify({ c, ev: ev.map(e => ({ id: e.id, type: e.type, amount: e.amount, reference: e.reference })) }));

      r = await correctCost(a, 18, 1, { reason: 'Segunda correção.' });
      const domSecond = await a.evaluate(() => {
        const o = db.orders.find(x => x.id === 18);
        try { warrantySubmit('warrantyCorrect', o, { reference: 1, reason: 'Segunda correção.', confirm: true }); return 'sem erro'; }
        catch (e) { return e.message; }
      });
      rec('R07-S5-08', 'Segunda correção do mesmo custo é recusada e o controle desaparece',
        r.opened === false && domSecond === 'Custo inexistente ou já corrigido.' && (await costs(a, 18)).amount === 0,
        JSON.stringify({ r, domSecond }));

      /* perfis restritos */
      const beforeR = await snapshot(a, 18);
      for (const profile of ['Técnico', 'Atendente', 'Financeiro']) {
        await role(a, profile);
        await goto(a, '#os/18/garantia');
        const h = await mainText(a);
        const modal = await a.evaluate(() => warrantyModal('warrantyCost', db.orders.find(o => o.id === 18)));
        const direct = await a.evaluate(() => {
          const o = db.orders.find(x => x.id === 18);
          try { warrantySubmit('warrantyCost', o, { amount: '1.00', minutes: '1', reason: 'Não autorizado.', confirm: true }); return 'sem erro'; }
          catch (e) { return e.message; }
        });
        rec(`R07-S5-09${profile[0]}`, `${profile} não vê custo, valores, controle nem consegue gravar por handler direto`,
          !h.includes('Custos internos declarados') && (profile === 'Financeiro' || !h.includes('R$')) && modal === null && direct === 'Ação indisponível neste perfil.' &&
          (await snapshot(a, 18)) === beforeR,
          JSON.stringify({ hasCostPanel: h.includes('Custos internos declarados'), hasMoney: h.includes('R$'), modal, direct }));
      }

      /* avaliação: Técnico e Admin; entrada: Admin e Atendente */
      await role(a, 'Técnico');
      const techAssess = await a.evaluate(() => !!warrantyModal('warrantyAssess', db.orders.find(o => o.id === 18)));
      await a.evaluate(() => { location.hash = '#retorno/20'; });
      await a.waitForTimeout(200);
      const techEntryDenied = await a.evaluate(() => !document.querySelector('#new-form'));
      await role(a, 'Atendente');
      const attAssess = await a.evaluate(() => warrantyModal('warrantyAssess', db.orders.find(o => o.id === 18)));
      await a.evaluate(() => { location.hash = '#retorno/20'; });
      await a.waitForTimeout(240);
      const attEntry = await a.locator('#new-form').count();
      await role(a, 'Financeiro');
      const finAssess = await a.evaluate(() => warrantyModal('warrantyAssess', db.orders.find(o => o.id === 18)));
      rec('R07-S5-10', 'Permissões efetivas: avaliação Admin/Técnico, entrada Admin/Atendente, sem ampliar perfis',
        techAssess === true && techEntryDenied === true && attAssess === null && attEntry === 1 && finAssess === null,
        JSON.stringify({ techAssess, techEntryDenied, attAssess, attEntry, finAssess }));

      rec('R07-S5-11', 'Sem erros de página ou console nos custos e permissões',
        errors.length === 0 && consoleErrors.length === 0, JSON.stringify({ errors, consoleErrors }));
      await ctx.close();
    }

    /* ============ S6 — novo orçamento do retorno ============ */
    {
      const { ctx, a, errors, consoleErrors } = await session(browser, 1440, 900, 'r07s6');
      await goto(a, '#os/18/orcamento');
      let text = await mainText(a);
      const noEdit = await a.evaluate(() => warrantyModal('quote', db.orders.find(o => o.id === 18)));
      rec('R07-S6-01', 'Sem decisão de novo orçamento o retorno não edita nem publica',
        text.includes('Orçamento') && noEdit === null && (await actionCount(a, 'modal:quote:18')) === 0 && (await actionCount(a, 'modal:billing:18')) === 0,
        text.slice(0, 160));

      await assess(a, 18, { coverage: 'nao_coberto', solution: 'novo_orcamento', diagnosis: 'Falha não coberta.', reason: 'Novo orçamento aprovado na avaliação.' });
      await goto(a, '#os/18/orcamento');
      text = await mainText(a);
      rec('R07-S6-02', 'Após a decisão o orçamento próprio fica editável e não cobra automaticamente',
        text.includes('Editar itens') && (await actionCount(a, 'modal:quote:18')) === 1 && (await warranty(a, 18)).total === 0,
        text.slice(0, 300));

      await setQuote(a, 18, [{ type: 'Serviço', name: 'Reparo adicional fictício', quantity: 1, unit: 5000 }], 0);
      let w = await warranty(a, 18);
      rec('R07-S6-03', 'Rascunho salvo mantém total zero e origem intocada',
        w.quote?.draft?.items?.[0]?.unit === 5000 && w.total === 0 && (await warranty(a, 16)).total === 41000,
        JSON.stringify(w.quote?.draft));

      let r = await publishQuote(a, 18);
      w = await warranty(a, 18);
      rec('R07-S6-04', 'Publicação cria versão 1 e registra a operação privada',
        r.error === '' && w.quote?.current === 1 && w.quote?.active === true && w.quote?.versions?.length === 1 &&
        w.warranty?.operations?.some(o => o.type === 'orcamento' && o.version === 1),
        JSON.stringify({ current: w.quote?.current, ops: w.warranty?.operations }));

      r = await billing(a, 18);
      rec('R07-S6-05', 'Cobrança antes da aprovação vigente é bloqueada',
        r.opened === false && (await warranty(a, 18)).total === 0, JSON.stringify(r));

      r = await approveQuote(a, 18, { answer: 'Aprovado', name: 'Cliente Fictício R07' });
      w = await warranty(a, 18);
      rec('R07-S6-06', 'Decisão interna aprovada não fatura sozinha',
        r.error === '' && w.quote?.versions?.[0]?.decision?.answer === 'Aprovado' && w.total === 0 && w.paid === 0,
        JSON.stringify({ decision: w.quote?.versions?.[0]?.decision, total: w.total }));

      /* alterar rascunho após aprovação bloqueia faturamento */
      await setQuote(a, 18, [{ type: 'Serviço', name: 'Reparo adicional fictício', quantity: 1, unit: 7000 }], 0);
      r = await billing(a, 18);
      const domBilling = await a.evaluate(() => {
        const o = db.orders.find(x => x.id === 18);
        try { BancadaQuote.formalize(o, today()); return 'sem erro'; } catch (e) { return e.message; }
      });
      rec('R07-S6-07', 'Itens alterados após a aprovação impedem faturar a versão antiga',
        r.opened === false && domBilling === 'Fature o retorno somente com novo orçamento vigente, aprovado e sem alterações nos itens ou valores.' && (await warranty(a, 18)).total === 0,
        JSON.stringify({ r, domBilling }));

      await publishQuote(a, 18);
      r = await billing(a, 18);
      rec('R07-S6-08', 'Nova versão ainda sem aprovação não fatura',
        r.opened === false && (await warranty(a, 18)).quote?.current === 2 && (await warranty(a, 18)).total === 0, JSON.stringify(r));

      await approveQuote(a, 18, { answer: 'Aprovado', name: 'Cliente Fictício R07' });
      const originBefore = await snapshot(a, 16);
      r = await billing(a, 18);
      w = await warranty(a, 18);
      rec('R07-S6-09', 'Cobrança explícita usa a versão vigente e não movimenta a origem',
        r.error === '' && w.total === 7000 && w.paid === 0 && w.billing?.due != null && w.financeLedger === null && (await snapshot(a, 16)) === originBefore,
        JSON.stringify({ total: w.total, paid: w.paid, billing: w.billing }));

      /* recusa + nova versão em outro retorno */
      await createReturn(a, 20, { defect: 'Retorno para recusa fictícia R07.', confirm: true });
      const idRef = await a.evaluate(() => db.orders.at(-1).id);
      await assess(a, idRef, { coverage: 'nao_coberto', solution: 'novo_orcamento', diagnosis: 'Falha nova fora da cobertura.', reason: 'Orçamento para testar recusa.' });
      await setQuote(a, idRef, [{ type: 'Serviço', name: 'Reparo recusado fictício', quantity: 1, unit: 8000 }], 0);
      await publishQuote(a, idRef);
      await approveQuote(a, idRef, { answer: 'Recusado', name: 'Cliente Fictício R07' });
      r = await billing(a, idRef);
      let wRef = await warranty(a, idRef);
      rec('R07-S6-10', 'Recusa não fatura e exige nova versão aprovada',
        r.opened === false && wRef.quote?.versions?.at(-1)?.decision?.answer === 'Recusado' && wRef.total === 0,
        JSON.stringify({ total: wRef.total, last: wRef.quote?.versions?.at(-1)?.decision }));

      await publishQuote(a, idRef);
      await approveQuote(a, idRef, { answer: 'Aprovado', name: 'Cliente Fictício R07' });
      r = await billing(a, idRef);
      wRef = await warranty(a, idRef);
      rec('R07-S6-11', 'Nova versão aprovada após recusa fatura o valor vigente',
        r.error === '' && wRef.total === 8000 && wRef.quote?.versions?.length === 2 &&
        wRef.quote?.versions?.[0]?.decision?.answer === 'Recusado' && wRef.quote?.versions?.[1]?.decision?.answer === 'Aprovado',
        JSON.stringify(wRef.quote?.versions?.map(v => ({ n: v.number, d: v.decision?.answer }))));

      /* portal: projeção, decisão pública sem faturar e cobrança explícita */
      await createReturn(a, 19, { defect: 'Retorno para decisão pública R07.', confirm: true });
      const idPub = await a.evaluate(() => db.orders.at(-1).id);
      await assess(a, idPub, { coverage: 'nao_coberto', solution: 'novo_orcamento', diagnosis: 'Falha privada do portal.', reason: 'Orçamento público.' });
      await setQuote(a, idPub, [{ type: 'Serviço', name: 'Reparo público fictício', quantity: 1, unit: 6000 }], 0);
      await publishQuote(a, idPub);
      const token = await issueLink(a, idPub);
      const proj = await a.evaluate(i => JSON.stringify(BancadaPortal.projection(db.orders.find(x => x.id === i))), idPub);
      rec('R07-S6-12', 'Projeção pública não expõe garantia, origem, avaliação, custos nem laudo',
        !!token && !proj.includes('"origin"') && !proj.includes('"coverage"') && !proj.includes('"warranty":{') && !proj.includes('"events"') &&
        !proj.includes('Falha privada do portal') && !proj.includes('Custo interno') && !proj.includes('Corrigir registro'),
        proj.slice(0, 420));

      const pp = await ctx.newPage();
      const perrs = []; pp.on('pageerror', e => perrs.push(e.message));
      await pp.goto(`${BASE}/portal.html#${token}`, { waitUntil: 'networkidle' });
      const ptext = (await pp.locator('#customer-main').innerText()).replace(/\u00a0/g, ' ');
      await pp.check('#customer-response input[name=answer][value=Aprovado]');
      await pp.fill('#customer-response input[name=name]', 'Cliente Portal Fictício');
      await pp.check('#customer-response input[name=confirm]');
      await pp.locator('#customer-response button[type=submit]').click();
      await pp.waitForTimeout(450);
      const ptextAfter = (await pp.locator('#customer-main').innerText()).replace(/\u00a0/g, ' ');
      const pub = await a.evaluate(i => {
        refreshExternal();
        const o = db.orders.find(x => x.id === i);
        return { total: o.total, paid: o.paid, decision: o.quote?.versions?.at(-1)?.decision || null, delivery: o.delivery, err: (() => { const e = document.querySelector('#customer-error'); return e && !e.hidden ? e.textContent : ''; })() };
      }, idPub);
      rec('R07-S6-13', 'Resposta pública registra decisão, não fatura e não vaza informação privada',
        perrs.length === 0 && pub.decision?.answer === 'Aprovado' && pub.decision?.channel === 'link simulado' && pub.total === 0 && pub.paid === 0 &&
        !ptext.includes('Garantia') && !ptext.includes('Custo interno') && !ptext.includes('Falha privada') && ptextAfter.includes('Aprovado'),
        JSON.stringify({ pub, preview: ptext.slice(0, 200) }));

      const originBefore2 = await snapshot(a, 19);
      await goto(a, '#os/' + idPub + '/orcamento');
      r = await billing(a, idPub);
      const wPub = await warranty(a, idPub);
      rec('R07-S6-14', 'Cobrança do retorno é explícita, separada da decisão e não movimenta a origem',
        r.error === '' && wPub.total === 6000 && wPub.paid === 0 && wPub.financeLedger === null && (await snapshot(a, 19)) === originBefore2,
        JSON.stringify({ total: wPub.total, paid: wPub.paid, billing: wPub.billing }));

      rec('R07-S6-15', 'Sem erros de página ou console no orçamento',
        errors.length === 0 && consoleErrors.length === 0 && perrs.length === 0, JSON.stringify({ errors, consoleErrors, perrs }));
      await ctx.close();
    }
  } finally {
    await browser.close();
    fs.mkdirSync(path.join(OUT, 'testes'), { recursive: true });
    const summary = results.reduce((s, r) => { s[r.status] = (s[r.status] || 0) + 1; return s; }, {});
    fs.writeFileSync(path.join(OUT, 'testes', 'r07-browser-resultados.json'), JSON.stringify({
      generatedAt: new Date().toISOString(), codeSha: process.env.CODE_SHA || '', baseUrl: BASE, total: results.length, summary, results
    }, null, 2));
    console.log(`TOTAL ${results.length} · PASS ${summary.PASS || 0} · FAIL ${summary.FAIL || 0} · INFO ${summary.INFO || 0}`);
  }
})().catch(e => { console.error('ERRO FATAL', e); process.exit(1); });
