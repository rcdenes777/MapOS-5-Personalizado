'use strict';
/*
 * R05 — validação de navegador do financeiro, recebimentos e estornos.
 * Requer playwright-core e servidor estático em BASE_URL.
 * Não altera o protótipo; grava apenas resultados nesta pasta.
 */
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');

const CHROME = process.env.CHROME_PATH || '/home/dragonblue/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8130';
const OUT = path.resolve(__dirname, '..', '..');
const norm = s => String(s).replace(/\u00a0/g, ' ');
const results = [];
const rec = (id, desc, ok, detail = '') => {
  const status = ok === 'INFO' ? 'INFO' : ok ? 'PASS' : 'FAIL';
  results.push({ id, desc, status, detail });
  console.log(`${status} ${id} — ${desc}${detail ? ' :: ' + detail : ''}`);
};

async function session(browser, w = 1440, h = 900) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: 'pt-BR' });
  const a = await ctx.newPage();
  const errors = [], consoleErrors = [], requests = [];
  a.on('pageerror', e => errors.push(e.message));
  a.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  a.on('request', r => requests.push(r.url()));
  await a.goto(BASE + '/?r05=' + Date.now(), { waitUntil: 'networkidle' });
  await a.evaluate(() => localStorage.clear());
  await a.reload({ waitUntil: 'networkidle' });
  return { ctx, a, errors, consoleErrors, requests };
}

async function goto(a, hash) {
  await a.evaluate(h => { location.hash = h; }, hash);
  await a.waitForTimeout(260);
}
async function open(a, kind, id = 23, eventId = null) {
  const action = eventId === null ? `modal:${kind}:${id}` : `modal:${kind}:${id}:${eventId}`;
  const loc = a.locator(`[data-action="${action}"]`);
  if (!(await loc.count())) return false;
  await loc.last().click();
  await a.waitForTimeout(160);
  return a.evaluate(() => document.querySelector('#modal').open);
}
async function submit(a) {
  await a.locator('#action-form button[type=submit]').click();
  await a.waitForTimeout(330);
}
async function issue(a, id = 23) {
  await goto(a, `#os/${id}/orcamento`);
  const existing = await a.evaluate(i => {
    const o = db.orders.find(x => x.id === i);
    return o.publicLink && BancadaPortal.active(o) ? o.publicLink.token : null;
  }, id);
  if (existing) return existing;
  if (!(await open(a, 'issuelink', id))) throw new Error('gerador de link não abriu para OS ' + id);
  await a.check('#action-form input[name=confirm]');
  await submit(a);
  const token = await a.evaluate(i => db.orders.find(x => x.id === i).publicLink?.token || null, id);
  if (!token) throw new Error('link não gerado');
  return token;
}
async function portal(ctx, token) {
  const p = await ctx.newPage();
  const errors = [], consoleErrors = [], requests = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  p.on('request', r => requests.push(r.url()));
  await p.goto(BASE + '/portal.html#' + token, { waitUntil: 'networkidle' });
  await p.waitForTimeout(220);
  return { p, errors, consoleErrors, requests };
}
async function portalDecision(p, answer = 'Aprovado', name = 'Marina Alves (fictícia)') {
  await p.locator(`input[name=answer][value="${answer}"]`).check();
  await p.fill('input[name=name]', name);
  await p.check('#customer-response input[name=confirm]');
  await p.locator('#customer-response button[type=submit]').click();
  await p.waitForTimeout(340);
}
async function formalize(a, id = 23, due = null) {
  if (!(await open(a, 'billing', id))) throw new Error('formalização não abriu');
  if (due) await a.fill('#action-form input[name=due]', due);
  await a.check('#action-form input[name=confirm]');
  await submit(a);
}
async function pay(a, id, amount, method = 'Pix', date = null) {
  if (!(await open(a, 'pay', id))) throw new Error('pagamento não abriu');
  await a.fill('#action-form input[name=amount]', String(amount).replace(',', '.'));
  if (date) await a.fill('#action-form input[name=date]', date);
  await a.selectOption('#action-form select[name=method]', method);
  await submit(a);
}
async function reverse(a, id, eventId, reason = 'Lançamento incorreto na demonstração') {
  if (!(await open(a, 'reverse', id, eventId))) throw new Error('estorno não abriu');
  await a.fill('#action-form textarea[name=reason]', reason);
  await a.check('#action-form input[name=confirm]');
  await submit(a);
}
const dbOrder = (a, id) => a.evaluate(i => {
  const o = db.orders.find(x => x.id === i);
  return o ? JSON.parse(JSON.stringify({ id: o.id, status: o.status, total: o.total, paid: o.paid, delivery: o.delivery, billing: o.billing, ledger: o.financeLedger, publicLink: o.publicLink, quote: o.quote })) : null;
}, id);
const portalText = async p => norm(await p.locator('#customer-main').innerText());
const rowCount = async a => a.locator('#finance-results .finance-list-row').count();

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  try {
    /* A. Central financeira, busca, filtros e vencimentos. */
    {
      const { ctx, a, errors, consoleErrors, requests } = await session(browser);
      await goto(a, '#financeiro');
      let text = norm(await a.locator('#main').innerText());
      const initial = await a.evaluate(() => BancadaFinance.aggregate(db.orders, today()));
      rec('R05-F01', 'Central lista cinco cobranças e exclui OS sem obrigação', (await rowCount(a)) === 5 && /Contas a receber/.test(text), JSON.stringify({ rows: await rowCount(a) }));
      rec('R05-F02', 'Totais iniciais: 650 a receber, 930 recebido, 1.580 cobrado, 0 vencido', /R\$ 650,00/.test(text) && /R\$ 930,00/.test(text) && /R\$ 1\.580,00/.test(text) && /R\$ 0,00/.test(text), JSON.stringify(initial));
      rec('R05-F03', 'Sem vencimento não é classificado como vencido', initial.overdue === 0 && /Não informado/.test(text) && (await a.locator('.finance-list-row .pill', { hasText: 'Vencida' }).count()) === 0, JSON.stringify(initial));

      await a.evaluate(() => {
        const ds = d => [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
        const y = new Date(); y.setDate(y.getDate() - 1);
        const t = new Date(); const f = new Date(); f.setDate(f.getDate() + 5);
        db.orders.find(o => o.id === 22).billing = { due: ds(y) };
        db.orders.find(o => o.id === 21).billing = { due: ds(t) };
        db.orders.find(o => o.id === 20).billing = { due: ds(f) };
        save(); render();
      });
      await a.waitForTimeout(180);
      const due = await a.evaluate(() => BancadaFinance.aggregate(db.orders, today()));
      const dueLabels = await a.evaluate(() => {
        const ds = d => [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
        const y = new Date(); y.setDate(y.getDate() - 1);
        return { yesterday: date(ds(y)) };
      });
      text = norm(await a.locator('#main').innerText());
      rec('R05-F04', 'Vencimento passado entra em Vencido; hoje e futuro não', due.overdue === 22000 && /R\$ 220,00/.test(text) && text.includes(dueLabels.yesterday), JSON.stringify({ due, yesterday: dueLabels.yesterday }));

      await a.selectOption('#finance-filter', 'overdue'); await a.waitForTimeout(130);
      let ft = norm(await a.locator('#finance-results').innerText());
      rec('R05-F05', 'Filtro Vencidas mostra #022 e exclui #021', /#022/.test(ft) && !/#021/.test(ft) && (await rowCount(a)) === 1, ft.slice(0, 180));

      await a.selectOption('#finance-filter', 'open'); await a.waitForTimeout(130);
      ft = norm(await a.locator('#finance-results').innerText());
      rec('R05-F06', 'Filtro A vencer/sem data inclui hoje e futuro, não a vencida', /#021/.test(ft) && /#020/.test(ft) && !/#022/.test(ft) && (await rowCount(a)) === 2, JSON.stringify({ rows: await rowCount(a) }));

      await a.selectOption('#finance-filter', 'paid'); await a.waitForTimeout(130);
      ft = norm(await a.locator('#finance-results').innerText());
      rec('R05-F07', 'Filtro Quitadas mostra #019 e #016, sem saldo', /#019/.test(ft) && /#016/.test(ft) && !/#020/.test(ft) && (await rowCount(a)) === 2, JSON.stringify({ rows: await rowCount(a) }));

      await a.selectOption('#finance-filter', 'all'); await a.waitForTimeout(100);
      await a.fill('#finance-search', 'Midea'); await a.waitForTimeout(150);
      rec('R05-F08', 'Busca por equipamento encontra #020', (await rowCount(a)) === 1 && /#020/.test(norm(await a.locator('#finance-results').innerText())), 'Midea');
      await a.fill('#finance-search', 'Gree'); await a.waitForTimeout(150);
      rec('R05-F09', 'Busca por equipamento encontra #022', (await rowCount(a)) === 1 && /#022/.test(norm(await a.locator('#finance-results').innerText())), 'Gree');
      await a.fill('#finance-search', '#019'); await a.waitForTimeout(150);
      rec('R05-F10', 'Busca por número de OS encontra #019', (await rowCount(a)) === 1 && /#019/.test(norm(await a.locator('#finance-results').innerText())), '#019');
      await a.fill('#finance-search', 'sem resultado fictício'); await a.waitForTimeout(150);
      rec('R05-F11', 'Busca vazia mostra estado vazio', (await rowCount(a)) === 0 && /Nenhuma cobrança nesta seleção/.test(norm(await a.locator('#finance-results').innerText())), 'empty');
      await a.fill('#finance-search', ''); await a.waitForTimeout(100);
      rec('R05-F12', 'Sem exceções ou erros de console na central', errors.length === 0 && consoleErrors.length === 0, JSON.stringify({ errors, consoleErrors }));
      rec('R05-F13', 'Central não fez requisições externas', requests.every(u => u.startsWith(BASE) || u.startsWith('data:')), JSON.stringify(requests.filter(u => !u.startsWith(BASE)).slice(0, 3)));
      await ctx.close();
    }

    /* B. OS #023: decisão, formalização, parcelas, recibos e estorno. */
    {
      const { ctx, a } = await session(browser);
      const token = await issue(a, 23);
      const p1 = await portal(ctx, token);
      const beforeQuote = await portalText(p1.p);
      rec('R05-B01', 'Portal mostra condições vazias como texto único, sem fatos vazios', /Condições de pagamento, prazo e garantia a confirmar/.test(beforeQuote) && !/Condições de pagamento\s*\n\s*Não informado/.test(beforeQuote), beforeQuote.slice(-260));
      await portalDecision(p1.p);
      await a.reload({ waitUntil: 'networkidle' }); await goto(a, '#os/23/orcamento');
      let s = await dbOrder(a, 23);
      rec('R05-B02', 'Aprovação via portal não cria cobrança nem pagamento', s.status === 'Aprovado' && s.total === 0 && s.paid === 0, JSON.stringify({ status: s.status, total: s.total, paid: s.paid }));
      rec('R05-B03', 'Decisão aprovada no portal persiste após recarregar, ainda sem cobrança', s.status === 'Aprovado' && s.total === 0 && s.paid === 0, JSON.stringify({ status: s.status, total: s.total, paid: s.paid }));
      await formalize(a, 23, await a.evaluate(() => today()));
      s = await dbOrder(a, 23);
      rec('R05-B04', 'Formalização cria obrigação de R$ 240,00 sem recebimento', s.total === 24000 && s.paid === 0 && s.billing?.due === await a.evaluate(() => today()), JSON.stringify(s.billing));
      await goto(a, '#os/23/financeiro');
      rec('R05-B05', 'Aba financeira começa em aberto e sem recibos', /Em aberto/.test(norm(await a.locator('#main').innerText())) && /Nenhum recebimento registrado/.test(norm(await a.locator('#main').innerText())), 'initial finance');

      await pay(a, 23, '100,00', 'Pix');
      s = await dbOrder(a, 23);
      rec('R05-B06', 'Recebimento parcial de R$ 100,00 (Pix) cria evento e saldo R$ 140,00', s.paid === 10000 && (s.total - s.paid) === 14000 && s.ledger?.events?.length === 1 && s.ledger.events[0].method === 'Pix', JSON.stringify(s.ledger));
      let portalReload = await portalText(p1.p);
      rec('R05-B07', 'Portal atualiza Pago e Saldo após recebimento parcial', /100,00/.test(portalReload) && /140,00/.test(portalReload) && /Parcialmente paga/.test(portalReload), portalReload.slice(-260));

      await pay(a, 23, '140,00', 'Dinheiro');
      s = await dbOrder(a, 23);
      rec('R05-B08', 'Segundo recebimento quita a OS sem alterar andamento', s.paid === 24000 && s.total === 24000 && s.status === 'Aprovado' && s.ledger?.events?.length === 2, JSON.stringify({ paid: s.paid, status: s.status, events: s.ledger?.events?.length }));
      await goto(a, '#recibo/23/1');
      const receipt1 = norm(await a.locator('#main').innerText());
      rec('R05-B09', 'Recibo normal #1 tem valor, OS e forma, sem ESTORNADO', /Recibo #23 \/ 1/.test(receipt1) && /R\$ 100,00/.test(receipt1) && /Pix/.test(receipt1) && !/ESTORNADO/.test(receipt1), receipt1.slice(0, 220));
      await goto(a, '#recibo/23/2');
      rec('R05-B10', 'Recibo normal #2 tem valor e forma Dinheiro', /Recibo #23 \/ 2/.test(norm(await a.locator('#main').innerText())) && /R\$ 140,00/.test(norm(await a.locator('#main').innerText())), 'receipt 2');

      await goto(a, '#os/23/financeiro');
      if (!(await open(a, 'reverse', 23, 1))) throw new Error('estorno #1 não abriu');
      const preview = norm(await a.locator('#action-form').innerText());
      rec('R05-B11', 'Prévia de estorno explica que não há devolução e mostra saldo recomposto', /Não realiza reembolso/.test(preview) && /Saldo após correção/.test(preview) && /R\$ 100,00/.test(preview), preview.slice(0, 260));
      await a.fill('#action-form textarea[name=reason]', 'Lançamento incorreto na demonstração');
      await a.check('#action-form input[name=confirm]');
      await submit(a);
      s = await dbOrder(a, 23);
      const reverseEvent = s.ledger?.events?.find(e => e.type === 'reverse');
      rec('R05-B12', 'Estorno preserva obrigação de R$ 240,00 e recompõe saldo para R$ 100,00', s.total === 24000 && s.paid === 14000 && (s.total - s.paid) === 10000 && !!reverseEvent, JSON.stringify(s.ledger));
      rec('R05-B13', 'Evento de estorno referencia o recebimento original, mantém valor e justificativa', reverseEvent?.reference === 1 && reverseEvent?.amount === 10000 && /Lançamento incorreto/.test(reverseEvent?.reason || '') && s.ledger.events[0]?.amount === 10000, JSON.stringify(reverseEvent));
      const afterReverse = norm(await a.locator('#main').innerText());
      rec('R05-B14', 'Histórico mostra estorno, original marcado e saldo parcial', /Estorno de registro/.test(afterReverse) && /Referência #1/.test(afterReverse) && /Recebimento estornado/.test(afterReverse) && /R\$ 100,00/.test(afterReverse), afterReverse.slice(0, 420));
      await goto(a, '#recibo/23/1');
      const receiptReversed = norm(await a.locator('#main').innerText());
      rec('R05-B15', 'Recibo original permanece acessível e marcado ESTORNADO', /Recibo #23 \/ 1/.test(receiptReversed) && /ESTORNADO/.test(receiptReversed) && /R\$ 100,00/.test(receiptReversed), receiptReversed.slice(0, 220));
      await goto(a, '#os/23/financeiro');
      rec('R05-B16', 'Original não oferece segundo estorno', (await a.locator('[data-action="modal:reverse:23:1"]').count()) === 0, 'duplicate hidden');
      const duplicate = await a.evaluate(() => {
        const o = db.orders.find(x => x.id === 23); const before = o.financeLedger.events.length;
        openModal('reverse', 23, 1);
        let err = ''; try { financialSubmit('reverse', o, { eventId: '1', date: today(), reason: 'Duplicado', confirm: true }); } catch (e) { err = e.message; }
        return { open: document.querySelector('#modal').open, err, before, after: o.financeLedger.events.length };
      });
      rec('R05-B17', 'Estorno duplicado é rejeitado e não abre modal', duplicate.open === false && /já estornado|inexistente/.test(duplicate.err) && duplicate.before === duplicate.after, JSON.stringify(duplicate));
      const priv = await a.evaluate(() => JSON.stringify(BancadaPortal.projection(db.orders.find(x => x.id === 23))));
      rec('R05-B18', 'Justificativa privada não entra na projeção do portal', !priv.includes('Lançamento incorreto') && !priv.includes('financeLedger'), 'private');
      const portalAfterReverse = await portalText(p1.p);
      rec('R05-B19', 'Portal mostra saldo recomposto e não expõe motivo privado', /140,00/.test(portalAfterReverse) && /100,00/.test(portalAfterReverse) && !/Lançamento incorreto/.test(portalAfterReverse), portalAfterReverse.slice(-300));

      await pay(a, 23, '100,00', 'Transferência');
      s = await dbOrder(a, 23);
      rec('R05-B20', 'Novo recebimento após estorno quita o saldo recomposto', s.paid === 24000 && (s.total - s.paid) === 0 && s.ledger.events.length === 4, JSON.stringify({ paid: s.paid, events: s.ledger.events.length }));
      const portalPaid = await portalText(p1.p);
      rec('R05-B21', 'Portal fica quitado após novo recebimento', /Quitada/.test(portalPaid) && /0,00/.test(portalPaid), portalPaid.slice(-200));
      await a.reload({ waitUntil: 'networkidle' }); await goto(a, '#os/23/financeiro');
      rec('R05-B22', 'Persistência mantém quatro eventos e saldo zero após recarregar', (await dbOrder(a, 23)).ledger.events.length === 4 && (await dbOrder(a, 23)).paid === 24000, 'reload');

      /* R04 refinements inside the same portal. */
      const live = p1.p.locator('#customer-live');
      rec('R05-R01', 'Portal tem região viva para atualização entre abas', (await live.count()) === 1 && (await live.getAttribute('role')) === 'status' && (await live.getAttribute('aria-live')) === 'polite', 'live');
      rec('R05-R02', 'Saldo do portal é destacado em bloco próprio', (await p1.p.locator('.customer-balance').count()) === 1, 'balance');
      rec('R05-R03', 'Condições vazias são agrupadas, sem repetição de fatos vazios', /Condições de pagamento, prazo e garantia a confirmar/.test(beforeQuote) && (beforeQuote.match(/a confirmar com a assistência/g) || []).length === 1, beforeQuote.slice(-160));
      await goto(a, '#os/23/orcamento');
      const portalDetails = a.locator('.portal-controls details').first();
      if (await portalDetails.count() && !(await portalDetails.evaluate(el => el.open))) {
        await portalDetails.locator('summary').click(); await a.waitForTimeout(100);
      }
      const copy = a.locator('[data-action="copyportal:23"]');
      if (await copy.count()) {
        await copy.first().click(); await a.waitForTimeout(160);
        const copyState = await a.evaluate(() => ({
          open: document.querySelector('#modal').open,
          value: document.querySelector('#portal-url')?.value || '',
          selected: document.querySelector('#portal-url')?.selectionEnd > 0
        }));
        rec('R05-R04', 'Ação de copiar abre endereço local e seleciona o campo', copyState.open && copyState.value.startsWith(BASE + '/portal.html#') && copyState.selected, JSON.stringify(copyState));
        await a.locator('#modal button[data-action=close]').click();
      } else rec('R05-R04', 'Ação de copiar endereço existe no painel', false, 'botão ausente');
      await ctx.close();
    }

    /* C. Dados legados e preservação do valor anterior. */
    {
      const { ctx, a } = await session(browser);
      await goto(a, '#os/20/financeiro');
      let text = norm(await a.locator('#main').innerText());
      let s = await dbOrder(a, 20);
      rec('R05-L01', 'OS #020 mostra valor anterior sem recibo individual', /Valor recebido anteriormente: R\$ 200,00/.test(text) && /Não há registro individual para estornar/.test(text) && s.ledger?.events?.length === 0, JSON.stringify(s.ledger));
      rec('R05-L02', 'Valor legado não oferece estorno', (await a.locator('[data-action^="modal:reverse:20"]').count()) === 0, 'no reverse');
      await pay(a, 20, '50,00', 'Pix');
      s = await dbOrder(a, 20);
      rec('R05-L03', 'Novo recebimento soma ao valor anterior', s.paid === 25000 && s.ledger?.opening === 20000 && s.ledger.events.length === 1, JSON.stringify({ paid: s.paid, opening: s.ledger?.opening }));
      await reverse(a, 20, 1, 'Estorno do novo recebimento');
      s = await dbOrder(a, 20);
      rec('R05-L04', 'Estornar o novo recebimento preserva o valor anterior', s.paid === 20000 && s.ledger?.opening === 20000 && s.ledger.events.length === 2, JSON.stringify({ paid: s.paid, events: s.ledger.events.length }));
      rec('R05-L05', 'Valor anterior continua sem recibo artificial', /Valor recebido anteriormente: R\$ 200,00/.test(norm(await a.locator('#main').innerText())) && !/Recibo #20 \/ 1/.test(norm(await a.locator('#main').innerText())), 'opening preserved');
      await ctx.close();
    }

    /* D. Permissões simuladas, inclusive rotas diretas. */
    {
      const { ctx, a } = await session(browser);
      await goto(a, '#os/20/financeiro');
      await pay(a, 20, '50,00', 'Pix');
      await a.selectOption('#role', 'Financeiro'); await a.waitForTimeout(180);
      await goto(a, '#financeiro');
      const fin = norm(await a.locator('#main').innerText());
      rec('R05-P01', 'Financeiro acessa central e recebe, sem estorno', /Financeiro/.test(fin) && !/Estornar registro/.test(fin), 'finance role');
      await goto(a, '#os/20/financeiro');
      const finOrder = norm(await a.locator('#main').innerText());
      rec('R05-P02', 'Financeiro consulta a aba financeira da OS', /Recebimentos e correções/.test(finOrder) && /R\$ 350,00/.test(finOrder), 'order finance');
      rec('R05-P03', 'Financeiro não vê ação de estorno', !/Estornar registro/.test(finOrder) && (await a.locator('[data-action^="modal:reverse:20"]').count()) === 0, 'no reverse finance');
      await goto(a, '#recibo/20/1');
      rec('R05-P04', 'Financeiro consulta recibo autorizado', /Recibo de recebimento/.test(norm(await a.locator('#main').innerText())), 'receipt finance');
      const noRev = await a.evaluate(() => { openModal('reverse', 20, 1); return document.querySelector('#modal').open; });
      rec('R05-P05', 'Financeiro não abre estorno por chamada direta', noRev === false, 'direct reverse');

      for (const role of ['Técnico', 'Atendente']) {
        await a.selectOption('#role', role); await a.waitForTimeout(180);
        await goto(a, '#financeiro');
        const home = norm(await a.locator('#main').innerText());
        await goto(a, '#os/20/financeiro');
        const order = norm(await a.locator('#main').innerText());
        await goto(a, '#recibo/20/1');
        const receipt = norm(await a.locator('#main').innerText());
        rec(`R05-P06-${role}`, `${role} não vê valores em central, OS ou recibo`, !/R\$/.test(home) && !/R\$/.test(order) && !/R\$/.test(receipt), JSON.stringify({ home: home.slice(0, 40), order: order.slice(0, 40), receipt: receipt.slice(0, 40) }));
      }
      await a.selectOption('#role', 'Financeiro'); await a.waitForTimeout(150);
      await goto(a, '#os/20/financeiro');
      await a.selectOption('#role', 'Técnico'); await a.waitForTimeout(180);
      const afterRole = norm(await a.locator('#main').innerText());
      rec('R05-P07', 'Troca de perfil remove conteúdo financeiro sem expor valores', !/R\$/.test(afterRole) && /Acesso restrito|Ação indisponível/.test(afterRole) && (await a.locator('#main').innerText()).includes('Acesso restrito'), JSON.stringify({ url: a.url(), text: afterRole.slice(0, 120) }));
      await ctx.close();
    }

    /* E. Duas abas: persistência e anúncio no portal. */
    {
      const { ctx, a } = await session(browser);
      const b = await ctx.newPage();
      await b.goto(BASE + '/?r05tab=' + Date.now() + '#os/20/financeiro', { waitUntil: 'networkidle' });
      await b.waitForTimeout(200);
      await goto(a, '#os/20/financeiro');
      await pay(a, 20, '50,00', 'Pix');
      await b.waitForTimeout(500);
      const bText = norm(await b.locator('#main').innerText());
      rec('R05-T01', 'Segunda aba recebe o novo saldo por storage', /R\$ 250,00/.test(bText) && /Recebido líquido/.test(bText), bText.slice(0, 220));
      const token = await issue(a, 20);
      const p = await portal(ctx, token);
      const before = await portalText(p.p);
      await pay(a, 20, '50,00', 'Dinheiro');
      await p.p.waitForTimeout(550);
      const after = await portalText(p.p);
      const live = norm(await p.p.locator('#customer-live').innerText());
      rec('R05-T02', 'Portal atualiza o saldo após recebimento em outra aba', /300,00/.test(after) && /50,00/.test(after) && /Parcialmente paga/.test(after), after.slice(-240));
      rec('R05-T03', 'Portal anuncia atualização na região viva', /Informações do atendimento atualizadas/.test(live), live);
      await a.reload({ waitUntil: 'networkidle' }); await goto(a, '#os/20/financeiro');
      rec('R05-T04', 'Recebimentos persistem após recarregar', (await dbOrder(a, 20)).paid === 30000 && (await dbOrder(a, 20)).ledger.events.length === 2, JSON.stringify(await dbOrder(a, 20)));
      await ctx.close();
    }

    fs.writeFileSync(path.join(OUT, 'testes', 'regressao-r05-browser-resultados.json'), JSON.stringify({
      generatedAt: new Date().toISOString(), codeSha: process.env.CODE_SHA || '', incrementSha: process.env.INCREMENT_SHA || '', results
    }, null, 2));
    const pass = results.filter(r => r.status === 'PASS').length, fail = results.filter(r => r.status === 'FAIL').length, info = results.filter(r => r.status === 'INFO').length;
    console.log(`\nTOTAL ${results.length} · PASS ${pass} · FAIL ${fail} · INFO ${info}`);
  } finally {
    await browser.close();
  }
})().catch(e => { console.error('FATAL', e); process.exit(1); });
