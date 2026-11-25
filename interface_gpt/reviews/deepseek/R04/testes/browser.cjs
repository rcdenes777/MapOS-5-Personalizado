'use strict';
/*
 * R04 — validação de navegador do portal do cliente e dos refinamentos administrativos.
 * Requer playwright-core e servidor estático em BASE_URL.
 */
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');

const CHROME = process.env.CHROME_PATH || '/home/dragonblue/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8130';
const OUT = path.resolve(__dirname, '..');
const norm = s => String(s).replace(/\u00a0/g, ' ');
const results = [];
const rec = (id, desc, ok, detail = '') => { const status = ok === 'INFO' ? 'INFO' : ok ? 'PASS' : 'FAIL'; results.push({ id, desc, status, detail }); console.log(`${status} ${id} — ${desc}${detail ? ' :: ' + detail : ''}`); };

async function session(browser, w = 1440, h = 900) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: 'pt-BR' });
  const a = await ctx.newPage();
  const errors = [], consoleErrors = [], requests = [];
  a.on('pageerror', e => errors.push(e.message));
  a.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  a.on('request', r => requests.push(r.url()));
  await a.goto(BASE + '/?r04=' + Date.now(), { waitUntil: 'networkidle' });
  await a.evaluate(() => localStorage.clear());
  await a.reload({ waitUntil: 'networkidle' });
  await a.evaluate(() => location.hash = '#os/23/orcamento');
  await a.waitForTimeout(220);
  return { ctx, a, errors, consoleErrors, requests };
}
async function open(a, kind, id = 23) {
  const sel = `[data-action="modal:${kind}:${id}"]`;
  if (!(await a.locator(sel).count())) return false;
  await a.locator(sel).first().click();
  await a.waitForTimeout(140);
  return a.evaluate(() => document.querySelector('#modal').open);
}
async function submit(a) { await a.locator('#action-form button[type=submit]').click(); await a.waitForTimeout(300); }
async function issue(a) {
  let token = await a.evaluate(() => { const o = db.orders.find(o => o.id === 23); return o.publicLink && BancadaPortal.active(o) ? o.publicLink.token : null; });
  if (token) return token;
  if (!(await open(a, 'issuelink'))) throw new Error('gerador de link não abriu');
  await a.check('#action-form input[name=confirm]');
  await submit(a);
  token = await a.evaluate(() => db.orders.find(o => o.id === 23).publicLink?.token || null);
  if (!token) throw new Error('link não gerado');
  return token;
}
async function openLinkDetails(a) {
  const d = a.locator('.portal-controls details');
  if (!(await d.count())) return false;
  const isOpen = await d.first().evaluate(el => el.open);
  if (!isOpen) await d.first().locator('summary').click();
  await a.waitForTimeout(80);
  return true;
}
async function setDraft(a, items, discount, terms = {}) {
  if (!(await open(a, 'quote'))) throw new Error('editor de orçamento não abriu');
  while (await a.locator('.quote-edit-row').count()) await a.locator('.quote-edit-row [data-quote-remove]').first().click();
  for (let i = 0; i < items.length; i++) await a.locator('[data-quote-add]').click();
  const rows = a.locator('.quote-edit-row');
  for (let i = 0; i < items.length; i++) {
    const r = rows.nth(i);
    await r.locator('select[name=itemType]').selectOption(items[i].type);
    await r.locator('input[name=itemName]').fill(items[i].name);
    await r.locator('input[name=itemQty]').fill(String(items[i].qty));
    await r.locator('input[name=itemUnit]').fill(items[i].unit.toFixed(2));
  }
  await a.fill('input[name=discount]', discount.toFixed(2));
  if (Object.keys(terms).length) {
    const d = a.locator('#action-form details').filter({ hasText: 'Condições da proposta' });
    if (await d.count()) await d.locator('summary').click();
    for (const [k, v] of Object.entries(terms)) await a.fill(`input[name=${k}], textarea[name=${k}]`, v);
  }
  await submit(a);
}
async function publish(a) { if (!(await open(a, 'publish'))) throw new Error('publicação não abriu'); await a.check('#action-form input[name=confirm]'); await submit(a); }
async function withdraw(a) { if (!(await open(a, 'withdraw'))) throw new Error('retirada não abriu'); await a.check('#action-form input[name=confirm]'); await submit(a); }
async function formalize(a, due = null) { if (!(await open(a, 'billing'))) throw new Error('cobrança não abriu'); if (due) await a.fill('#action-form input[name=due]', due); await a.check('#action-form input[name=confirm]'); await submit(a); }
async function pay(a, amount) { if (!(await open(a, 'pay'))) throw new Error('pagamento não abriu'); await a.fill('#action-form input[name=amount]', String(amount)); await submit(a); }
async function deliver(a) { if (!(await open(a, 'delivery'))) throw new Error('entrega não abriu'); await a.check('#action-form input[name=confirm]'); await submit(a); }
async function portal(ctx, token) {
  const p = await ctx.newPage();
  const errors = [], consoleErrors = [], requests = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  p.on('request', r => requests.push(r.url()));
  await p.goto(BASE + '/portal.html#' + token, { waitUntil: 'networkidle' });
  await p.waitForTimeout(180);
  return { p, errors, consoleErrors, requests };
}
async function portalDecision(p, answer, name = 'Marina Alves (fictícia)') {
  if (!(await p.locator('#customer-response').count())) throw new Error('formulário do portal ausente');
  await p.check(`input[name=answer][value="${answer}"]`);
  await p.fill('#customer-response input[name=name]', name);
  await p.check('#customer-response input[name=confirm]');
  await p.locator('#customer-response button[type=submit]').click();
  await p.waitForTimeout(400);
}
const dbOrder = (a, id = 23) => a.evaluate(i => {
  const o = db.orders.find(x => x.id === i);
  return { status: o.status, total: o.total, paid: o.paid, approval: o.approval, link: o.publicLink ? { token: o.publicLink.token, expires: o.publicLink.expires } : null, versions: o.quote?.versions.length, current: o.quote?.current, decision: o.quote?.versions?.find(v => v.number === o.quote.current)?.decision || null, delivery: !!o.delivery };
}, id);
const primaryTexts = a => a.evaluate(() => [...document.querySelectorAll('#main .btn.primary')].map(x => x.textContent.trim()));

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });

  /* A. Ciclo do link: geração, renovação, expiração, revogação e novo link */
  {
    const { ctx, a } = await session(browser);
    const before = await dbOrder(a);
    rec('R04-L01', 'OS #023 começa sem link', before.link === null && /Sem link ativo/.test(norm(await a.locator('#main').innerText())), JSON.stringify(before));
    const token1 = await issue(a);
    const link1 = await dbOrder(a);
    const diff = link1.link.expires - Date.now();
    rec('R04-L02', 'Gerar link cria token de 64 hex e validade de 120 dias', /^[a-f0-9]{64}$/.test(token1) && diff > 119 * 86400000 && diff <= 120 * 86400000 + 60000, JSON.stringify({ len: token1.length, days: Math.round(diff / 86400000) }));
    rec('R04-L03', 'Link ativo exibe abrir e gerenciar, sem botão de gerar', /Link ativo/.test(norm(await a.locator('#main').innerText())) && (await a.locator('a[href="portal.html#' + token1 + '"]').count()) === 1 && (await a.locator('[data-action="modal:issuelink:23"]').count()) === 0, 'ui');
    const p1 = await portal(ctx, token1);
    const t1 = norm(await p1.p.locator('#customer-main').innerText());
    rec('R04-L04', 'Portal mostra OS, equipamento, orçamento v1 e total R$ 240,00', /Samsung · Digital Inverter/.test(t1) && /Versão 1/.test(t1) && /R\$ 240,00/.test(t1), t1.slice(0, 180));
    const checks = await p1.p.evaluate(() => [...document.querySelectorAll('input[name=answer]')].map(x => x.checked));
    rec('R04-L05', 'Portal abre sem decisão pré-selecionada', checks.length === 2 && checks.every(x => !x), JSON.stringify(checks));
    rec('R04-L06', 'Portal não tem navegação administrativa', !/Ordens de serviço|Clientes|Financeiro|Configurações|Nova OS/.test(t1), 'admin nav');

    await openLinkDetails(a);
    const renewed = await open(a, 'renewlink');
    await a.check('#action-form input[name=confirm]'); await submit(a);
    const link2 = await dbOrder(a);
    rec('R04-L07', 'Renovar mantém o endereço e estende a validade', renewed && link2.link.token === token1 && link2.link.expires > link1.link.expires, JSON.stringify({ same: link2.link.token === token1, delta: link2.link.expires - link1.link.expires }));

    await openLinkDetails(a);
    const revoked = await open(a, 'revokelink');
    await a.check('#action-form input[name=confirm]'); await submit(a);
    const afterRevoke = await dbOrder(a);
    await p1.p.reload({ waitUntil: 'networkidle' }); await p1.p.waitForTimeout(180);
    rec('R04-L08', 'Revogar invalida o portal e preserva a versão', revoked && afterRevoke.link === null && afterRevoke.versions === 1 && /Link indisponível/.test(norm(await p1.p.locator('#customer-main').innerText())), JSON.stringify(afterRevoke));

    const token2 = await issue(a);
    const oldPortal = await portal(ctx, token1);
    const newPortal = await portal(ctx, token2);
    rec('R04-L09', 'Novo link não reutiliza o token revogado', token2 !== token1 && /Link indisponível/.test(norm(await oldPortal.p.locator('#customer-main').innerText())) && /Versão 1/.test(norm(await newPortal.p.locator('#customer-main').innerText())), JSON.stringify({ old: token2 === token1 }));

    await a.evaluate(() => { const o = db.orders.find(x => x.id === 23); o.publicLink.expires = Date.now() - 1; save(); render(); });
    await newPortal.p.reload({ waitUntil: 'networkidle' }); await newPortal.p.waitForTimeout(180);
    const expiredUi = norm(await a.locator('#main').innerText());
    rec('R04-L10', 'Expiração invalida o portal e volta a oferecer geração', /Sem link ativo/.test(expiredUi) && /Link indisponível/.test(norm(await newPortal.p.locator('#customer-main').innerText())), 'expired');
    const token3 = await issue(a);
    rec('R04-L11', 'Novo link após expiração é diferente e resolve', token3 !== token2 && (await dbOrder(a)).link.token === token3, token3 === token2 ? 'same' : 'new');
    await ctx.close();
  }

  /* B. Aprovação e recusa direto no portal */
  {
    const { ctx, a } = await session(browser);
    const token = await issue(a);
    const p = (await portal(ctx, token)).p;
    const before = await dbOrder(a);
    await p.locator('#customer-response button[type=submit]').click(); await p.waitForTimeout(180);
    rec('R04-B01', 'Resposta vazia não é aceita', (await p.locator('#customer-response').count()) === 1 && (await dbOrder(a)).decision === null, 'native required');
    await portalDecision(p, 'Aprovado');
    const approved = await dbOrder(a);
    const t = norm(await p.locator('#customer-main').innerText());
    rec('R04-B02', 'Aprovação pelo portal grava decisão e não cria cobrança', approved.status === 'Aprovado' && approved.total === 0 && approved.paid === 0 && approved.decision?.answer === 'Aprovado' && approved.decision?.channel === 'link simulado', JSON.stringify(approved));
    rec('R04-B03', 'Portal mostra resposta registrada, nome e ausência de Pagamento', /Resposta registrada/.test(t) && /Marina Alves/.test(t) && !/Pagamento/.test(t) && !(await p.locator('#customer-response').count()), 'portal state');
    await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(200);
    const tReload = norm(await p.locator('#customer-main').innerText());
    rec('R04-B04', 'Decisão persiste após recarregar o portal', /Resposta registrada/.test(tReload) && !/Sua decisão/.test(tReload), 'reload');
    const rejected = await p.evaluate(() => { const db = BancadaPortal.read(localStorage); const o = db.orders.find(x => x.id === 23); try { BancadaPortal.respond(db, o.publicLink.token, 1, { answer: 'Aprovado', name: 'Outra Pessoa', confirm: true }); return 'aceitou'; } catch (e) { return e.message; } });
    rec('R04-B05', 'Segunda resposta pelo portal é rejeitada', /disponível|versão|resposta/i.test(rejected), rejected);
    await ctx.close();
  }

  {
    const { ctx, a } = await session(browser);
    const token = await issue(a);
    const p = (await portal(ctx, token)).p;
    await portalDecision(p, 'Recusado', 'Cliente Fictício');
    const state = await dbOrder(a);
    rec('R04-B06', 'Recusa pelo portal registra Orçamento recusado e total zero', state.status === 'Orçamento recusado' && state.total === 0 && state.decision?.answer === 'Recusado', JSON.stringify(state));
    const t = norm(await p.locator('#customer-main').innerText());
    rec('R04-B07', 'Portal mostra recusa registrada sem formulário', /Resposta registrada/.test(t) && /Recusado/.test(t) && !(await p.locator('#customer-response').count()), 'recused');
    await ctx.close();
  }

  /* C. Versões, rascunho desatualizado, resposta antiga e retirada */
  {
    const { ctx, a } = await session(browser);
    const token = await issue(a);
    const p = (await portal(ctx, token)).p;
    await setDraft(a, [
      { type: 'Peça', name: 'IGBT 650 V', qty: 1, unit: 50 },
      { type: 'Serviço', name: 'Reparo em bancada', qty: 1, unit: 250 },
    ], 0, { diagnosis: 'Diagnóstico publicado da v2', equipment: 'Samsung · Digital Inverter', defect: 'Placa sem alimentação.' });
    await a.waitForTimeout(250);
    const draftState = await dbOrder(a);
    const noQuote = norm(await p.locator('#customer-main').innerText());
    rec('R04-C01', 'Rascunho não publicado não aparece no portal', draftState.current === 1 && draftState.versions === 1 && /Não há orçamento publicado/.test(noQuote) && !(await p.locator('#customer-response').count()), 'draft hidden');
    rec('R04-C02', 'Portal não responde a versão desatualizada', /indisponível|atualizad|versão/i.test(await p.evaluate(() => { const db = BancadaPortal.read(localStorage); const o = db.orders.find(x => x.id === 23); try { BancadaPortal.respond(db, o.publicLink.token, 1, { answer: 'Aprovado', name: 'Cliente Fictício', confirm: true }); return 'aceitou'; } catch (e) { return e.message; } })), 'stale');
    const warn = norm(await a.locator('#main').innerText());
    rec('R04-C03', 'Painel avisa divergência entre rascunho e versão publicada', /Os itens atuais somam R\$ 300,00/.test(warn) && /A versão publicada soma R\$ 240,00/.test(warn), 'warning');

    await publish(a);
    await a.waitForTimeout(250);
    const published = await dbOrder(a);
    const v2 = norm(await p.locator('#customer-main').innerText());
    const v2html = await p.locator('#customer-main').innerHTML();
    rec('R04-C04', 'Publicar v2 atualiza o portal e preserva a v1', published.versions === 2 && published.current === 2 && /Versão 2/.test(v2) && /R\$ 300,00/.test(v2) && /Diagnóstico publicado da v2/.test(v2html), JSON.stringify({ versions: published.versions, current: published.current, hasVersion: /Versão 2/.test(v2), hasTotal: /R\$ 300,00/.test(v2), hasDiag: /Diagnóstico publicado da v2/.test(v2html) }));

    const staleAnswer = await p.evaluate(() => {
      const f = document.querySelector('#customer-response'); if (!f) return 'sem formulário';
      f.dataset.version = '1';
      document.querySelector('input[name=answer][value="Aprovado"]').checked = true;
      document.querySelector('input[name=name]').value = 'Cliente Fictício';
      document.querySelector('input[name=confirm]').checked = true;
      f.querySelector('button[type=submit]').click();
      return new Promise(r => setTimeout(() => r(document.querySelector('#customer-error')?.innerText || 'sem erro'), 250));
    });
    rec('R04-C05', 'Envio de versão antiga no formulário é bloqueado', /disponível|versão|atualizad/i.test(staleAnswer) && (await dbOrder(a)).decision === null, staleAnswer);

    await withdraw(a);
    await a.waitForTimeout(250);
    const afterWithdraw = await dbOrder(a);
    const noQuote2 = norm(await p.locator('#customer-main').innerText());
    rec('R04-C06', 'Retirar publicação esconde orçamento mas mantém o link', afterWithdraw.link !== null && /Não há orçamento publicado/.test(noQuote2) && !(await p.locator('#customer-response').count()), JSON.stringify(afterWithdraw));
    rec('R04-C07', 'Resposta após retirada é rejeitada', /disponível|versão|atualizad/i.test(await p.evaluate(() => { const db = BancadaPortal.read(localStorage); const o = db.orders.find(x => x.id === 23); try { BancadaPortal.respond(db, o.publicLink.token, 2, { answer: 'Aprovado', name: 'Cliente Fictício', confirm: true }); return 'aceitou'; } catch (e) { return e.message; } })), 'withdrawn');
    await ctx.close();
  }

  /* D. Entrega e modo somente consulta */
  {
    const { ctx, a } = await session(browser);
    const token = await issue(a);
    const p = (await portal(ctx, token)).p;
    await portalDecision(p, 'Aprovado');
    await a.waitForTimeout(250);
    await open(a, 'delivery');
    await a.fill('#action-form input[name=receiver]', 'RECEBEDOR_PRIVADO');
    await a.check('#action-form input[name=confirm]');
    await submit(a);
    await a.waitForTimeout(300);
    const t = norm(await p.locator('#customer-main').innerText());
    const htmlAfterDelivery = await p.locator('body').innerHTML();
    const state = await dbOrder(a);
    rec('R04-D01', 'Após entrega o portal fica somente consulta, sem formulário', state.delivery && /Equipamento entregue\. Orçamento disponível somente para consulta\./.test(t) && !(await p.locator('#customer-response').count()), JSON.stringify(state));
    rec('R04-D02', 'Entrega não expõe recebedor nem data de retirada', !/RECEBEDOR_PRIVADO|Data da retirada/i.test(t) && !htmlAfterDelivery.includes('RECEBEDOR_PRIVADO'), t.slice(-220));
    rec('R04-D03', 'Resposta após entrega é rejeitada', /entregue|disponível|versão/i.test(await p.evaluate(() => { const db = BancadaPortal.read(localStorage); const o = db.orders.find(x => x.id === 23); try { BancadaPortal.respond(db, o.publicLink.token, 1, { answer: 'Aprovado', name: 'Cliente Fictício', confirm: true }); return 'aceitou'; } catch (e) { return e.message; } })), 'delivery guard');
    await ctx.close();
  }

  /* E. Independência entre aprovação, cobrança e pagamento */
  {
    const { ctx, a } = await session(browser);
    const token = await issue(a);
    const p = (await portal(ctx, token)).p;
    await portalDecision(p, 'Aprovado');
    const beforeBill = norm(await p.locator('#customer-main').innerText());
    rec('R04-E01', 'Aprovação não mostra Pagamento antes da formalização', !/Pagamento/.test(beforeBill) && (await dbOrder(a)).total === 0, 'no billing');
    const due = await a.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 5); return d.toISOString().slice(0, 10); });
    await formalize(a, due);
    await a.waitForTimeout(300);
    let t = norm(await p.locator('#customer-main').innerText());
    rec('R04-E02', 'Formalização cria Pagamento de R$ 240,00 em aberto', /Pagamento/.test(t) && /Em aberto/.test(t) && /240,00/.test(t) && (await dbOrder(a)).total === 24000, 'billing');
    await pay(a, '100.00');
    await a.waitForTimeout(300);
    t = norm(await p.locator('#customer-main').innerText());
    rec('R04-E03', 'Pagamento parcial atualiza Pago e Saldo no portal', /100,00/.test(t) && /140,00/.test(t) && /Parcialmente paga/.test(t), 'partial');
    await pay(a, '140.00');
    await a.waitForTimeout(300);
    t = norm(await p.locator('#customer-main').innerText());
    const paid = await dbOrder(a);
    rec('R04-E04', 'Quitação atualiza o portal e não altera o orçamento', /Quitada/.test(t) && /0,00/.test(t) && paid.paid === 24000 && paid.total === 24000, 'paid');
    await ctx.close();
  }

  /* F. Privacidade e escaping de conteúdo publicado */
  {
    const { ctx, a } = await session(browser);
    const token = await issue(a);
    const p = (await portal(ctx, token)).p;
    await a.evaluate(() => {
      const o = db.orders.find(x => x.id === 23);
      db.clients.push({ id: 999, name: 'CLIENTE_PRIVADO', phone: '11999999999' });
      o.client = 999; o.defect = 'DEFEITO_PRIVADO'; o.report = 'LAUDO_PRIVADO'; o.serial = 'SERIE_PRIVADA'; o.imei = 'IMEI_PRIVADO'; o.items = 'ITENS_PRIVADOS';
      o.history.push({ time: new Date().toISOString(), text: 'HISTORICO_PRIVADO' });
      o.quote.versions[0].terms.diagnosis = '<img src=x onerror="window.__xss=1">';
      o.quote.versions[0].decision = { answer: 'Aprovado', name: 'Marina Alves', channel: 'telefone', date: '2026-11-24', registered: new Date().toISOString(), note: 'OBSERVACAO_PRIVADA', afterDelivery: false };
      save(); render();
    });
    await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(250);
    const body = await p.locator('body').innerText();
    const html = await p.locator('body').innerHTML();
    const privateHits = ['CLIENTE_PRIVADO', '11999999999', 'DEFEITO_PRIVADO', 'LAUDO_PRIVADO', 'SERIE_PRIVADA', 'IMEI_PRIVADO', 'ITENS_PRIVADOS', 'HISTORICO_PRIVADO', 'OBSERVACAO_PRIVADA', token].filter(x => body.includes(x) || html.includes(x));
    const attrs = await p.evaluate(() => [...document.querySelectorAll('*')].flatMap(e => [...e.attributes].map(a => a.name + '=' + a.value)));
    const attrHits = [token, 'CLIENTE_PRIVADO', 'OBSERVACAO_PRIVADA'].filter(x => attrs.some(a => a.includes(x)));
    rec('R04-F01', 'Projeção pública não expõe dados internos nem o token', privateHits.length === 0 && attrHits.length === 0, JSON.stringify({ privateHits, attrHits }));
    rec('R04-F02', 'Conteúdo publicado é escapado no portal', html.includes('&lt;img') && !html.includes('<img src=x') && (await p.evaluate(() => window.__xss || 0)) === 0, 'xss');
    rec('R04-F03', 'Decisão autorizada aparece sem observação interna', /Resposta registrada/.test(body) && !body.includes('OBSERVACAO_PRIVADA') && !html.includes('OBSERVACAO_PRIVADA'), 'decision visibility');
    await ctx.close();
  }

  /* G. Hierarquia administrativa e avisos */
  {
    const { ctx, a } = await session(browser);
    await issue(a);
    let prim = await primaryTexts(a);
    rec('R04-G01', 'Estado inicial tem um único primário', prim.length === 1 && prim[0] === 'Registrar resposta do cliente', JSON.stringify(prim));
    await setDraft(a, [{ type: 'Peça', name: 'Peça revisada', qty: 1, unit: 300 }], 0);
    prim = await primaryTexts(a);
    const warning = norm(await a.locator('#main').innerText());
    rec('R04-G02', 'Rascunho alterado prioriza publicar e avisa a divergência', prim.length === 1 && prim[0] === 'Publicar nova versão' && /Os itens atuais somam R\$ 300,00/.test(warning) && /A versão publicada soma R\$ 240,00/.test(warning), JSON.stringify({ prim, warning: warning.slice(-180) }));
    await publish(a);
    prim = await primaryTexts(a);
    rec('R04-G03', 'Após publicar, resposta é o primário', prim.length === 1 && prim[0] === 'Registrar resposta do cliente', JSON.stringify(prim));
    await portal(ctx, (await dbOrder(a)).link.token).then(async ({ p }) => { await portalDecision(p, 'Recusado', 'Cliente Fictício'); });
    await a.waitForTimeout(300);
    prim = await primaryTexts(a);
    const warn2 = norm(await a.locator('#main').innerText());
    rec('R04-G04', 'Após recusa, cobrança é primária e recebe aviso', prim.length === 1 && prim[0] === 'Formalizar cobrança' && /A proposta foi recusada/.test(warn2), JSON.stringify(prim));
    await ctx.close();
  }

  {
    const { ctx, a, errors, consoleErrors, requests } = await session(browser);
    const token = await issue(a);
    const p1 = await portal(ctx, token);
    const t = norm(await p1.p.locator('#customer-main').innerText());
    rec('R04-N01', 'Sem exceções JavaScript na página administrativa', errors.length === 0, JSON.stringify(errors));
    rec('R04-N02', 'Sem erros de console na página administrativa', consoleErrors.length === 0, JSON.stringify(consoleErrors));
    rec('R04-N03', 'Sem requisições externas nas duas páginas', [...requests, ...p1.requests].every(u => u.startsWith(BASE) || u.startsWith('data:') || u === 'about:blank'), JSON.stringify([...requests, ...p1.requests].filter(u => !u.startsWith(BASE)).slice(0, 3)));
    rec('R04-N04', 'Portal é página independente, sem shell administrativo', t.length > 0 && !/Ordens de serviço/.test(t), 'standalone');
    rec('R04-N05', 'Sem exceções de página ou erros de console no portal', p1.errors.length === 0 && p1.consoleErrors.length === 0, JSON.stringify({ errors: p1.errors, console: p1.consoleErrors }));
    await ctx.close();
  }

  fs.writeFileSync(path.join(OUT, 'testes', 'browser-resultados.json'), JSON.stringify({ generatedAt: new Date().toISOString(), codeSha: process.env.CODE_SHA || '', incrementSha: process.env.INCREMENT_SHA || '', results }, null, 2));
  const pass = results.filter(r => r.status === 'PASS').length, fail = results.filter(r => r.status === 'FAIL').length, info = results.filter(r => r.status === 'INFO').length;
  console.log(`\nTOTAL ${results.length} · PASS ${pass} · FAIL ${fail} · INFO ${info}`);
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
