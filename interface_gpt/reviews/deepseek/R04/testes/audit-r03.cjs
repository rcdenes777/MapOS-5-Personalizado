'use strict';
/*
 * R03 — auditoria do protótipo MapOS Bancada (bateria R02 adaptada ao orçamento versionado).
 * Somente leitura sobre o protótipo: interage pela UI e grava evidências em R03/.
 * Requer: playwright-core + Chromium local; servidor estático em BASE_URL.
 * Uso: node audit.cjs
 */
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');

const CHROME = process.env.CHROME_PATH ||
  '/home/dragonblue/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8130';
const OUT = path.resolve(__dirname, '..');
const KEY = 'mapos-bancada-prototype-v1';

const results = [];
const consoleLog = [];
const netLog = [];
const httpErrors = [];
const shotIndex = [];

function rec(area, id, desc, ok, detail = '') {
  const status = ok === 'INFO' ? 'INFO' : ok ? 'PASS' : 'FAIL';
  results.push({ area, id, desc, status, detail });
  console.log(`${status} [${area}] ${id} — ${desc}${detail ? ' :: ' + detail : ''}`);
}
function fail(area, id, desc, detail) { rec(area, id, desc, false, detail); }

async function shot(page, dir, name) {
  const vp = page.viewportSize();
  const rel = `${dir}/${name}-${vp.width}x${vp.height}.png`;
  const abs = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  await page.screenshot({ path: abs, animations: 'disabled' });
  shotIndex.push({ file: rel, bytes: fs.statSync(abs).size });
  return rel;
}

async function newSession(width = 1440, height = 900) {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const ctx = await browser.newContext({
    viewport: { width, height }, deviceScaleFactor: 1, locale: 'pt-BR',
    reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  page.on('console', m => {
    const type = m.type();
    if (type === 'error' || type === 'warning') {
      consoleLog.push({ page: `${width}x${height}`, type, text: m.text(), url: page.url() });
    }
  });
  page.on('pageerror', e => {
    consoleLog.push({ page: `${width}x${height}`, type: 'pageerror', text: e.message, url: page.url() });
  });
  page.on('request', r => netLog.push({ url: r.url(), type: r.resourceType() }));
  page.on('response', r => { if (r.status() >= 400) httpErrors.push({ status: r.status(), url: r.url() }); });
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('#main h1');
  return { browser, ctx, page };
}

async function go(page, hash) {
  await page.evaluate(h => {
    const d = document.querySelector('#modal');
    if (d && d.open) d.close();
    window.scrollTo(0, 0);
    if (location.hash === h) render(); else location.hash = h;
  }, hash);
  await page.waitForTimeout(120);
  await page.waitForSelector('#main h1', { state: 'attached' });
}

async function role(page, r) {
  await page.selectOption('#role', r);
  await page.waitForTimeout(120);
}

const h1 = page => page.locator('#main h1').innerText();
const bodyText = page => page.locator('body').innerText();
const norm = s => String(s).replace(/\u00a0/g, ' ').replace(/\u202f/g, ' ');
const orderRows = page => page.locator('#main .order').count();

async function submitModal(page) {
  await page.click('#action-form button[type=submit]');
  await page.waitForTimeout(220);
}

async function ordersDb(page) {
  return page.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), KEY);
}

/* ===================================================================== */
(async () => {
  /* ---------- 1. BASE / REDE / CONSOLE ---------- */
  const s = await newSession(1440, 900);
  const { page } = s;

  const meta = await page.evaluate(() => ({
    title: document.title,
    lang: document.documentElement.lang,
    viewport: document.querySelector('meta[name=viewport]')?.content || '',
    scripts: [...document.scripts].map(x => x.src || 'inline'),
    links: [...document.querySelectorAll('link')].map(x => x.href),
    imgs: [...document.images].map(x => x.src),
    forms: document.forms.length,
  }));
  rec('base', 'B01', 'Documento tem título, lang pt-BR e viewport', meta.title.includes('MapOS') && meta.lang === 'pt-BR' && /width=device-width/.test(meta.viewport), JSON.stringify(meta));
  rec('base', 'B02', 'Sem recursos externos declarados (scripts/links/imagens)', meta.scripts.every(x => x === 'inline' || x.startsWith(BASE)) && meta.links.every(x => x.startsWith(BASE)) && meta.imgs.every(x => x.startsWith(BASE)), JSON.stringify({ scripts: meta.scripts, links: meta.links, imgs: meta.imgs }));

  await go(page, '#inicio');
  const routeTitles = {};
  for (const [r, expected] of [['#inicio', 'O que precisa de atenção?'], ['#ordens', 'Ordens de serviço'], ['#nova', 'Nova ordem de serviço'], ['#os/20', /Midea/], ['#os/20/atendimento', /Midea/], ['#os/20/orcamento', /Midea/], ['#os/20/entrega', /Midea/], ['#os/20/anexos', /Midea/], ['#os/20/historico', /Midea/], ['#retorno/20', 'Retorno em garantia'], ['#imprimir/20', 'Impressão da OS #020'], ['#imprimir/20/cupom', 'Impressão da OS #020'], ['#clientes', 'Clientes'], ['#estoque', 'Estoque'], ['#financeiro', 'Financeiro'], ['#relatorios', 'Relatórios'], ['#configuracoes', 'Configurações'], ['#mais', 'Mais módulos']]) {
    await go(page, r);
    const t = await h1(page);
    routeTitles[r] = t;
    rec('rotas', 'R' + String(Object.keys(routeTitles).length).padStart(2, '0'), `Rota ${r} renderiza`, typeof expected === 'string' ? t === expected : expected.test(t), `h1="${t}"`);
  }

  /* ---------- 2. PERFIS ---------- */
  const profileExpect = {
    Administrador: { nav: ['Hoje', 'Ordens de serviço', 'Clientes', 'Estoque', 'Financeiro', 'Relatórios', 'Configurações'], money: true },
    Técnico: { nav: ['Hoje', 'Ordens de serviço', 'Estoque'], money: false },
    Atendente: { nav: ['Hoje', 'Ordens de serviço', 'Clientes'], money: false },
    Financeiro: { nav: ['Hoje', 'Ordens de serviço', 'Financeiro', 'Relatórios'], money: true },
  };
  for (const [p, exp] of Object.entries(profileExpect)) {
    await role(page, p);
    await go(page, '#inicio');
    const nav = await page.locator('#nav a').allInnerTexts();
    const text = await bodyText(page);
    const hasMoney = /R\$/.test(text);
    rec('perfis', `P-${p}-nav`, `${p}: menu lateral esperado`, JSON.stringify(nav.map(x => x.trim())) === JSON.stringify(exp.nav), nav.join(' | '));
    rec('perfis', `P-${p}-money`, `${p}: exposição financeira coerente`, hasMoney === exp.money, `R$ visível=${hasMoney}`);
  }

  await role(page, 'Técnico');
  const forbidden = [
    ['#financeiro', 'Financeiro'], ['#nova', 'Nova OS'], ['#clientes', 'Clientes'], ['#configuracoes', 'Configurações'], ['#relatorios', 'Relatórios'],
  ];
  for (const [r, label] of forbidden) {
    await go(page, r);
    rec('perfis', `T-bloqueio-${r.slice(1)}`, `Técnico não acessa ${label}`, (await h1(page)) === 'Ação indisponível', `h1="${await h1(page)}"`);
  }
  await go(page, '#estoque');
  rec('perfis', 'T-estoque', 'Técnico acessa Estoque', (await h1(page)) === 'Estoque', `h1="${await h1(page)}"`);

  await role(page, 'Atendente');
  for (const [r, label] of [['#estoque', 'Estoque'], ['#financeiro', 'Financeiro'], ['#relatorios', 'Relatórios'], ['#configuracoes', 'Configurações']]) {
    await go(page, r);
    rec('perfis', `A-bloqueio-${r.slice(1)}`, `Atendente não acessa ${label}`, (await h1(page)) === 'Ação indisponível', `h1="${await h1(page)}"`);
  }
  for (const r of ['#nova', '#clientes', '#retorno/20']) {
    await go(page, r);
    rec('perfis', `A-acesso-${r.replace(/[#/]/g, '-')}`, `Atendente acessa ${r}`, (await h1(page)) !== 'Ação indisponível', `h1="${await h1(page)}"`);
  }

  await role(page, 'Financeiro');
  for (const [r, label] of [['#nova', 'Nova OS'], ['#clientes', 'Clientes'], ['#estoque', 'Estoque'], ['#configuracoes', 'Configurações']]) {
    await go(page, r);
    rec('perfis', `F-bloqueio-${r.slice(1)}`, `Financeiro não acessa ${label}`, (await h1(page)) === 'Ação indisponível', `h1="${await h1(page)}"`);
  }
  for (const r of ['#financeiro', '#relatorios', '#os/20']) {
    await go(page, r);
    rec('perfis', `F-acesso-${r.replace(/[#/]/g, '-')}`, `Financeiro acessa ${r}`, (await h1(page)) !== 'Ação indisponível', `h1="${await h1(page)}"`);
  }

  await role(page, 'Administrador');
  await go(page, '#os/20');
  const financeHidden = await page.locator('.stats').innerText();
  rec('perfis', 'ADM-financeiro', 'Administrador vê valores e ações financeiras', /Saldo:/.test(financeHidden) && /Registrar pagamento/.test(financeHidden), financeHidden.replace(/\n/g, ' | ').slice(0, 160));

  /* ---------- 3. FLUXOS A–I ---------- */
  // Reset limpo para os fluxos.
  await page.evaluate(k => { localStorage.removeItem(k); }, KEY);
  await page.reload({ waitUntil: 'networkidle' });
  await role(page, 'Administrador');

  // A — equipamento novo
  await go(page, '#nova');
  await page.selectOption('select[name=client]', '1');
  const itemsDetails = page.locator('#new-form details').filter({ hasText: 'Itens, acessórios e estado' });
  await itemsDetails.locator('summary').click();
  await page.fill('input[name=brand]', 'Marca Teste');
  await page.fill('input[name=model]', 'Modelo Alfa');
  const optDetails = page.locator('#new-form details').filter({ hasText: 'Dados opcionais' });
  await optDetails.locator('summary').click();
  await page.fill('input[name=serial]', 'SN-ALFA-001');
  await page.fill('textarea[name=defect]', 'Equipamento não liga após queda de energia.');
  await page.fill('textarea[name=items]', 'Cabo de força e controle remoto.');
  await page.fill('textarea[name=condition]', 'Carcaça íntegra, sem sinais de oxidação.');
  await page.click('#new-form button[type=submit]');
  await page.waitForTimeout(260);
  let hash = await page.evaluate(() => location.hash);
  let db = await ordersDb(page);
  rec('fluxoA', 'A01', 'Nova OS de equipamento novo criada', hash === '#os/25' && db.orders.length === 9, `hash=${hash}, ordens=${db.orders?.length}`);
  rec('fluxoA', 'A02', 'OS criada preserva equipamento, cliente e defeito', /Marca Teste · Modelo Alfa/.test(await h1(page)) && (await bodyText(page)).includes('Equipamento não liga'), await h1(page));
  await go(page, '#os/25/historico');
  const histA = await page.locator('.timeline').innerText();
  rec('fluxoA', 'A03', 'Histórico registra a entrada', /Entrada registrada/.test(histA), histA.replace(/\n/g, ' | '));
  await go(page, '#os/25');
  await shot(page, 'desktop', '40-fluxo-a-nova-os-criada');

  // B — equipamento existente
  await go(page, '#nova');
  await page.selectOption('select[name=client]', '1');
  await page.selectOption('select[name=mode]', 'existing');
  await page.waitForTimeout(160);
  const unitOptions = await page.locator('select[name=unit] option').allInnerTexts();
  await page.selectOption('select[name=unit]', '20');
  await page.fill('textarea[name=defect]', 'Mesmo defeito retornou após o reparo.');
  await page.click('#new-form button[type=submit]');
  await page.waitForTimeout(240);
  db = await ordersDb(page);
  const createdB = db.orders.find(o => o.id === 26);
  rec('fluxoB', 'B01', 'Unidades do cliente listadas para reutilização', unitOptions.some(t => /Midea · Xtreme Save/.test(t)), unitOptions.join(' | '));
  rec('fluxoB', 'B02', 'Nova OS vinculada à unidade existente', !!createdB && createdB.brand === 'Midea' && createdB.model === 'Xtreme Save' && createdB.client === 1, JSON.stringify(createdB && { brand: createdB.brand, model: createdB.model, unit: createdB.unit }));
  rec('fluxoB', 'B03', 'Nova OS herda a identificação e mantém o defeito novo', /Midea · Xtreme Save/.test(await h1(page)) && (await bodyText(page)).includes('Mesmo defeito retornou'), await h1(page));

  // C — catálogo e volta ao manual
  await go(page, '#nova');
  await page.selectOption('select[name=catalog]', 'LG|Dual Inverter');
  await page.waitForTimeout(120);
  const filled = { brand: await page.inputValue('input[name=brand]'), model: await page.inputValue('input[name=model]') };
  await page.fill('input[name=brand]', 'Manual');
  await page.waitForTimeout(100);
  const catalogAfter = await page.inputValue('select[name=catalog]');
  rec('fluxoC', 'C01', 'Catálogo preenche marca e modelo', filled.brand === 'LG' && filled.model === 'Dual Inverter', JSON.stringify(filled));
  rec('fluxoC', 'C02', 'Edição manual limpa a seleção do catálogo', catalogAfter === '', `catalog="${catalogAfter}"`);
  await shot(page, 'desktop', '41-fluxo-c-catalogo-manual');

  // D — orçamento, aprovação sem cobrança, atendimento, finalização e cobrança separada (OS 23)
  await go(page, '#os/23/orcamento');
  await page.click('[data-action="modal:approval:23"]');
  await page.selectOption('#action-form select[name=answer]', 'Aprovado');
  await page.check('#action-form input[name=confirm]');
  await submitModal(page);
  let t = norm(await bodyText(page));
  let o23 = (await ordersDb(page)).orders.find(o => o.id === 23);
  rec('fluxoD', 'D01', 'Aprovação fictícia registra decisão sem criar cobrança', t.includes('Aprovado') && /Sem cobrança/.test(t) && o23.total === 0 && o23.paid === 0, JSON.stringify({ total: o23.total, paid: o23.paid, approval: o23.approval, status: o23.status }));
  await go(page, '#os/23');
  await page.click('[data-action="modal:tech:23"]');
  await page.selectOption('#action-form select[name=status]', 'Em Andamento');
  await page.check('#action-form input[name=confirm]');
  await submitModal(page);
  rec('fluxoD', 'D02', 'Andamento técnico alterado para Em Andamento', (await page.locator('.stat').first().innerText()).includes('Em Andamento'), await page.locator('.stat').first().innerText());
  await page.click('[data-action="modal:tech:23"]');
  await page.selectOption('#action-form select[name=status]', 'Finalizado');
  await page.check('#action-form input[name=confirm]');
  await submitModal(page);
  const stat = await page.locator('.stat').first().innerText();
  rec('fluxoD', 'D03', 'OS finalizada com conclusão registrada', stat.includes('Finalizado') && !stat.includes('não registrada'), stat.replace(/\n/g, ' | '));
  await go(page, '#os/23/historico');
  const hist = await page.locator('.timeline').innerText();
  rec('fluxoD', 'D04', 'Histórico registra versão, aprovação e andamento', /Orçamento: versão \d+ — Aprovado/.test(hist) && /Andamento: Em Andamento/.test(hist) && /Andamento: Finalizado/.test(hist), hist.replace(/\n/g, ' | ').slice(0, 260));
  await shot(page, 'desktop', '42-fluxo-d-finalizado');
  await go(page, '#os/23/orcamento');
  await page.click('[data-action="modal:billing:23"]');
  const due23 = await page.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 5); return d.toISOString().slice(0, 10); });
  await page.fill('#action-form input[name=due]', due23);
  await page.check('#action-form input[name=confirm]');
  await submitModal(page);
  o23 = (await ordersDb(page)).orders.find(o => o.id === 23);
  t = norm(await bodyText(page));
  rec('fluxoD', 'D05', 'Cobrança formalizada separadamente após aprovação e finalização', o23.total === 24000 && o23.paid === 0 && o23.status === 'Finalizado' && /Em aberto/.test(t), JSON.stringify({ total: o23.total, paid: o23.paid, status: o23.status, billing: o23.billing }));
  await shot(page, 'desktop', '43-fluxo-d-cobranca');

  // E — pagamento parcial, entrega com saldo e quitação (OS 22)
  await go(page, '#os/22');
  await page.click('[data-action="modal:pay:22"]');
  await page.fill('#action-form input[name=amount]', '100.00');
  await page.selectOption('#action-form select[name=method]', 'Pix');
  await submitModal(page);
  t = norm(await page.locator('.stat').nth(1).innerText());
  rec('fluxoE', 'E01', 'Pagamento parcial atualiza pago e saldo', t.includes('Parcial') && t.includes('R$ 120,00'), t.replace(/\n/g, ' | '));
  const statusBeforeDelivery = await page.locator('.stat').first().innerText();
  await page.click('[data-action="modal:delivery:22"]');
  await page.check('#action-form input[name=confirm]');
  await submitModal(page);
  let d = await ordersDb(page);
  let o22 = d.orders.find(o => o.id === 22);
  rec('fluxoE', 'E02', 'Entrega registrada com saldo pendente', !!o22.delivery && o22.paid === 20000 && o22.total === 32000, JSON.stringify(o22.delivery));
  rec('fluxoE', 'E03', 'Entrega independente do andamento (comportamento intencional)', 'INFO', `status na entrega="${statusBeforeDelivery.replace(/\n/g, ' ')}"; entrega registrada=${!!o22.delivery}`);
  await go(page, '#os/22');
  await page.click('[data-action="modal:pay:22"]');
  await page.fill('#action-form input[name=amount]', '120.00');
  await submitModal(page);
  d = await ordersDb(page);
  o22 = d.orders.find(o => o.id === 22);
  t = norm(await page.locator('.stat').nth(1).innerText());
  rec('fluxoE', 'E04', 'Quitação posterior zera o saldo', o22.paid === 32000 && t.includes('Quitado') && t.includes('R$ 0,00'), t.replace(/\n/g, ' | '));
  await shot(page, 'desktop', '43-fluxo-e-entrega-saldo-quitado');

  // F — entrega para terceiro (OS 20)
  await go(page, '#os/20');
  await page.click('[data-action="modal:delivery:20"]');
  await page.check('#action-form input[name=third][value="1"]');
  await page.fill('#action-form input[name=receiver]', 'Carlos Entregador (fictício)');
  await page.fill('#action-form textarea[name=authorization]', 'Autorizado por telefone, protocolo fictício 123.');
  const authRequired = await page.locator('#authorization').isVisible();
  await page.check('#action-form input[name=confirm]');
  await submitModal(page);
  d = await ordersDb(page);
  const o20 = d.orders.find(o => o.id === 20);
  rec('fluxoF', 'F01', 'Entrega para terceiro exige autorização', authRequired, `authorization visível=${authRequired}`);
  rec('fluxoF', 'F02', 'Entrega registra terceiro, recebedor e autorização', !!o20.delivery && o20.delivery.third === true && o20.delivery.receiver === 'Carlos Entregador (fictício)' && /protocolo fictício 123/.test(o20.delivery.authorization || ''), JSON.stringify(o20.delivery));
  await go(page, '#os/20/entrega');
  t = norm(await bodyText(page));
  rec('fluxoF', 'F03', 'Aba Entrega exibe vínculo de terceiro e autorização', t.includes('Terceiro autorizado') && t.includes('Carlos Entregador'), t.replace(/\n/g, ' | ').slice(0, 220));

  // G — retorno em garantia sem itens/estado (OS 20)
  await go(page, '#os/20');
  const retornoLink = await page.locator('a[href="#retorno/20"]').count();
  rec('fluxoG', 'G01', 'OS finalizada oferece registrar retorno', retornoLink === 1, `links=${retornoLink}`);
  await go(page, '#retorno/20');
  await page.fill('textarea[name=defect]', 'Falha intermitente após o reparo.');
  await page.check('#new-form input[name=confirm]');
  await page.click('#new-form button[type=submit]');
  await page.waitForTimeout(260);
  hash = await page.evaluate(() => location.hash);
  d = await ordersDb(page);
  const o27 = d.orders.find(o => o.id === 27);
  rec('fluxoG', 'G02', 'Retorno abre nova OS sem itens/estado informados', hash === '#os/27' && !!o27 && o27.origin === 20 && o27.items === '' && o27.condition === '', JSON.stringify(o27 && { id: o27.id, origin: o27.origin, items: o27.items, condition: o27.condition }));
  t = norm(await bodyText(page));
  rec('fluxoG', 'G03', 'Retorno preserva a origem e nasce em avaliação', t.includes('OS de origem #020') && t.includes('Em avaliação') && t.includes('R$ 0,00'), t.replace(/\n/g, ' | ').slice(0, 220));
  await shot(page, 'desktop', '44-fluxo-g-retorno-sem-itens');

  // H — alternância de perfis já coberta; checagem de continuidade
  await role(page, 'Financeiro');
  await go(page, '#os/23');
  rec('fluxoH', 'H01', 'Troca de perfil recompõe a interface sem erro', /Samsung/.test(await h1(page)) && (await page.locator('#nav a').count()) === 4, `nav=${await page.locator('#nav a').count()}, h1=${await h1(page)}`);
  await role(page, 'Administrador');

  // I — persistência após recarregar
  await page.reload({ waitUntil: 'networkidle' });
  await go(page, '#ordens');
  const countAfterReload = await orderRows(page);
  await go(page, '#os/22');
  t = await page.locator('.stat').nth(1).innerText();
  const deliveryPill = await page.locator('.stat').nth(2).innerText();
  d = await ordersDb(page);
  rec('fluxoI', 'I01', 'Dados persistem após recarregar', d.orders.length === 11 && countAfterReload === 11, `ordens=${d.orders?.length}, linhas=${countAfterReload}`);
  rec('fluxoI', 'I02', 'Pagamento e entrega persistem', t.includes('Quitado') && deliveryPill.includes('Entregue'), `${t.replace(/\n/g, ' ')} / ${deliveryPill.replace(/\n/g, ' ')}`);
  await shot(page, 'desktop', '45-fluxo-i-persistencia');

  // Reset (contexto separado para não destruir evidências antes)
  const sReset = await newSession(1440, 900);
  await go(sReset.page, '#configuracoes');
  sReset.page.once('dialog', dlg => dlg.accept());
  await sReset.page.click('[data-action="reset"]');
  await sReset.page.waitForTimeout(220);
  const resetDb = await ordersDb(sReset.page);
  rec('reset', 'X01', 'Restaurar dados fictícios volta à amostra inicial', resetDb.orders.length === 8, `ordens=${resetDb.orders?.length}`);
  rec('reset', 'X02', 'Restauração informa o usuário por toast', (await sReset.page.locator('#toast').innerText()).includes('restaurada'), await sReset.page.locator('#toast').innerText());
  await shot(sReset.page, 'desktop', '46-configuracoes-restaurado');
  await sReset.ctx.close(); await sReset.browser.close();

  // Console/rede da sessão principal
  const external = netLog.filter(r => !r.url.startsWith(BASE) && !r.url.startsWith('data:') && r.url !== 'about:blank');
  rec('rede', 'N01', 'Nenhuma requisição para serviço externo', external.length === 0, JSON.stringify(external.slice(0, 5)));
  const errs = consoleLog.filter(c => c.type === 'error' || c.type === 'pageerror');
  const warns = consoleLog.filter(c => c.type === 'warning');
  rec('console', 'C01', 'Sem erros JavaScript durante as operações', errs.filter(e => e.type === 'pageerror').length === 0, JSON.stringify(errs.filter(e => e.type === 'pageerror')));
  rec('console', 'C02', 'Sem avisos de console', warns.length === 0, JSON.stringify(warns.slice(0, 3)));
  rec('console', 'C03', 'Sem recursos HTTP com erro (404 etc.)', httpErrors.length === 0, JSON.stringify(httpErrors.slice(0, 5)));

  /* ---------- 4. TECLADO / A11Y ---------- */
  const a = await newSession(1440, 900);
  const ap = a.page;
  await ap.goto(BASE + '/?focus-check=' + Date.now(), { waitUntil: 'networkidle' });
  await ap.keyboard.press('Tab');
  const firstFocus = await ap.evaluate(() => {
    const el = document.activeElement;
    return { tag: el.tagName, cls: el.className, href: el.getAttribute('href'), text: (el.innerText || '').trim() };
  });
  rec('a11y', 'K01', 'Primeiro Tab alcança o atalho de conteúdo', firstFocus.href === '#main', JSON.stringify(firstFocus));
  await ap.keyboard.press('Enter');
  await ap.waitForTimeout(220);
  const afterSkip = await ap.locator('#main h1').innerText();
  rec('a11y', 'K02', 'Atalho "Pular para o conteúdo" mantém a tela', afterSkip !== 'Ação indisponível', `h1 após Enter="${afterSkip}"`);
  if (afterSkip === 'Ação indisponível') { rec('a11y', 'K02-evidence', 'Atalho de conteúdo ainda cai na rota #main', 'INFO', 'Regressão reproduzida.'); await shot(ap, 'desktop', '90-achado-atalho-conteudo-quebrado'); }

  await go(ap, '#os/20');
  await ap.keyboard.press('Tab');
  const focusStyle = await ap.evaluate(() => {
    const el = document.activeElement, cs = getComputedStyle(el);
    return { tag: el.tagName, text: (el.innerText || '').trim().slice(0, 30), outline: cs.outlineStyle + ' ' + cs.outlineWidth + ' ' + cs.outlineColor };
  });
  rec('a11y', 'K03', 'Foco de teclado é visível', focusStyle.outline !== 'none 0px' && !focusStyle.outline.startsWith('none'), JSON.stringify(focusStyle));

  await ap.click('[data-action="modal:tech:20"]');
  const modalState = await ap.evaluate(() => {
    const dlg = document.querySelector('#modal');
    return { open: dlg.open, activeInside: dlg.contains(document.activeElement), active: document.activeElement.outerHTML.slice(0, 80) };
  });
  rec('a11y', 'K04', 'Modal recebe foco ao abrir', modalState.open && modalState.activeInside, JSON.stringify(modalState));
  let trapped = true, escapeAt = null;
  for (let i = 0; i < 12; i++) {
    await ap.keyboard.press('Tab');
    const st = await ap.evaluate(() => {
      const dlg = document.querySelector('#modal');
      const el = document.activeElement;
      return { inside: dlg.contains(el), tag: el.tagName, cls: String(el.className).slice(0, 30), text: (el.innerText || el.value || '').trim().slice(0, 24) };
    });
    if (!st.inside && !escapeAt) { trapped = false; escapeAt = { i: i + 1, ...st }; }
  }
  rec('a11y', 'K05', 'Foco permanece dentro do modal (Tab)', trapped, escapeAt ? JSON.stringify(escapeAt) : '12 Tabs consecutivos dentro do diálogo');
  await ap.keyboard.press('Escape');
  await ap.waitForTimeout(150);
  const escState = await ap.evaluate(() => ({ open: document.querySelector('#modal').open, active: document.activeElement.dataset.action || document.activeElement.tagName }));
  rec('a11y', 'K06', 'Escape fecha o modal e devolve o foco ao gatilho', !escState.open && escState.active === 'modal:tech:20', JSON.stringify(escState));

  // Nomes acessíveis e ARIA básica
  const aria = await ap.evaluate(() => {
    const unnamed = [...document.querySelectorAll('button,a[href],select,input,textarea')].filter(el => {
      if (el.offsetParent === null) return false;
      const name = (el.getAttribute('aria-label') || el.innerText || el.value || '').trim();
      return !name && el.type !== 'hidden';
    }).map(el => el.outerHTML.slice(0, 80));
    return { unnamed, dialogLabelled: !!document.querySelector('#modal')?.getAttribute('aria-labelledby'), navs: [...document.querySelectorAll('nav')].map(n => n.getAttribute('aria-label')) };
  });
  rec('a11y', 'K07', 'Controles sem nome acessível', aria.unnamed.length === 0, JSON.stringify(aria.unnamed.slice(0, 5)));
  rec('a11y', 'K08', 'Navegações rotuladas e diálogo referenciado', aria.dialogLabelled && aria.navs.every(Boolean), JSON.stringify(aria.navs));

  // Contraste (páginas principais)
  const contrast = async (p, label) => p.evaluate(() => {
    const lum = c => { const [r, g, b] = c.map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; };
    const parse = s => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map(Number); return { c: p.slice(0, 3), a: p.length > 3 ? p[3] : 1 }; };
    const blend = (fg, bg) => fg.map((v, i) => Math.round(v * .5 + bg[i] * .5));
    const effBg = el => {
      let cur = el, stack = [];
      while (cur) {
        const cs = getComputedStyle(cur), bg = parse(cs.backgroundColor);
        if (bg && bg.a > 0) { stack.push(bg); if (bg.a === 1) break; }
        cur = cur.parentElement;
      }
      let base = [255, 255, 255];
      for (let i = stack.length - 1; i >= 0; i--) base = stack[i].c.map((v, j) => Math.round(v * stack[i].a + base[j] * (1 - stack[i].a)));
      return base;
    };
    const ratio = (a, b) => { const L1 = lum(a), L2 = lum(b); return (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05); };
    const bad = [];
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
      if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
      const fg = parse(cs.color); if (!fg) continue;
      const bg = effBg(el);
      const size = parseFloat(cs.fontSize), weight = +cs.fontWeight || 400;
      const large = size >= 24 || (size >= 18.66 && weight >= 700);
      const r = ratio(fg.c, bg);
      if (r < (large ? 3 : 4.5)) bad.push({ tag: el.tagName, cls: String(el.className).slice(0, 40), text: el.textContent.trim().slice(0, 28), ratio: +r.toFixed(2), size, weight });
    }
    return bad.slice(0, 12);
  });
  for (const [route, label] of [['#inicio', 'painel'], ['#ordens', 'ordens'], ['#os/20', 'OS'], ['#financeiro', 'financeiro']]) {
    await go(ap, route);
    const bad = await contrast(ap, label);
    rec('a11y', `K09-${label}`, `Contraste AA em ${label}`, bad.length === 0, JSON.stringify(bad));
  }

  // Alvos de toque em 390x844
  const m = await newSession(390, 844);
  const mp = m.page;
  await go(mp, '#nova');
  const targets = await mp.evaluate(() => {
    const els = [...document.querySelectorAll('a[href],button,input,select,textarea,summary')];
    const out = [];
    for (const el of els) {
      const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;
      if (el.matches('input[type=checkbox],input[type=radio]') && el.closest('label')) continue;
      if (el.closest('.sr, .skip')) continue;
      if (r.height < 44 || r.width < 44) out.push({ tag: el.tagName, type: el.type || '', text: (el.innerText || el.name || '').trim().slice(0, 28), w: Math.round(r.width), h: Math.round(r.height) });
    }
    return out;
  });
  rec('a11y', 'K10', 'Alvos de toque ≥44 px na nova OS (390 px)', targets.length === 0, JSON.stringify(targets.slice(0, 10)));
  const fontSmall = await mp.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      if (el.closest('.sr, .skip')) continue;
      if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
      const s = parseFloat(cs.fontSize);
      if (s < 12) out.push({ tag: el.tagName, cls: String(el.className).slice(0, 30), size: +s.toFixed(1), text: el.textContent.trim().slice(0, 24) });
    }
    return out;
  });
  rec('a11y', 'K11', 'Texto ≥12 px (legibilidade sem zoom)', fontSmall.length === 0, JSON.stringify(fontSmall.slice(0, 10)));
  await m.ctx.close(); await m.browser.close();

  /* ---------- 5. RESPONSIVIDADE ---------- */
  const vps = [[1920, 1080], [1440, 900], [1366, 768], [768, 1024], [412, 915], [390, 844], [360, 800], [320, 568]];
  const routes = ['#inicio', '#ordens', '#nova', '#os/20', '#os/23/orcamento', '#retorno/20', '#clientes', '#estoque', '#financeiro', '#relatorios', '#configuracoes', '#imprimir/20', '#imprimir/20/cupom', '#mais'];
  for (const [w, h] of vps) {
    const v = await newSession(w, h);
    const vp = v.page;
    let overflowRoutes = [], outRoutes = [];
    for (const r of routes) {
      await go(vp, r);
      const mtr = await vp.evaluate(() => {
        const de = document.documentElement;
        const vw = de.clientWidth;
        const over = de.scrollWidth - vw;
        const out = [];
        for (const el of document.querySelectorAll('body *')) {
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
          if (el.closest('.sr, .skip')) continue;
          let sp = el.parentElement, inScroller = false;
          while (sp && sp !== document.body) { const sc = getComputedStyle(sp); if ((sc.overflowX === 'auto' || sc.overflowX === 'scroll') && sp.scrollWidth > sp.clientWidth) { inScroller = true; break; } sp = sp.parentElement; }
          if (inScroller) continue;
          const r = el.getBoundingClientRect();
          if (r.width < 2 || r.height < 2) continue;
          if (r.right > vw + 2 || r.left < -2) out.push({ tag: el.tagName, cls: String(el.className).slice(0, 40), right: Math.round(r.right), left: Math.round(r.left), width: Math.round(r.width) });
        }
        return { over, out: out.slice(0, 6) };
      });
      if (mtr.over > 1) overflowRoutes.push({ r, over: mtr.over });
      if (mtr.out.length) outRoutes.push({ r, out: mtr.out });
    }
    rec('responsivo', `V-${w}x${h}-overflow`, `${w}x${h}: sem rolagem horizontal`, overflowRoutes.length === 0, JSON.stringify(overflowRoutes));
    rec('responsivo', `V-${w}x${h}-bounds`, `${w}x${h}: sem elementos fora da viewport`, outRoutes.length === 0, JSON.stringify(outRoutes.slice(0, 3)));
    await v.ctx.close(); await v.browser.close();
  }

  /* ---------- 6. CASOS-LIMITE ---------- */
  const e = await newSession(390, 844);
  const ep = e.page;
  await ep.evaluate(() => save());
  // Formulário vazio
  await go(ep, '#nova');
  const before = (await ordersDb(ep)).orders.length;
  await ep.click('#new-form button[type=submit]');
  await ep.waitForTimeout(200);
  const afterEmpty = await ordersDb(ep);
  const invalidCount = await ep.locator('#new-form :invalid').count();
  const hashEmpty = await ep.evaluate(() => location.hash);
  rec('limites', 'L01', 'Formulário vazio é bloqueado pela validação nativa', afterEmpty.orders.length === before && hashEmpty === '#nova' && invalidCount > 0, `ordens=${afterEmpty.orders.length}, inválidos=${invalidCount}, hash=${hashEmpty}`);

  // Texto longo sem espaços (nome, modelo, defeito)
  await ep.evaluate(k => {
    const db = JSON.parse(localStorage.getItem(k));
    db.clients[0].name = 'Cliente ' + 'X'.repeat(140);
    const o = db.orders.find(x => x.id === 20);
    o.model = 'M'.repeat(160);
    o.defect = 'D'.repeat(400);
    localStorage.setItem(k, JSON.stringify(db));
  }, KEY);
  await ep.reload({ waitUntil: 'networkidle' });
  await go(ep, '#os/20');
  const longM = await ep.evaluate(() => {
    const de = document.documentElement;
    return { over: de.scrollWidth - de.clientWidth, h1w: document.querySelector('#main h1').getBoundingClientRect().width, h1sw: document.querySelector('#main h1').scrollWidth };
  });
  rec('limites', 'L02', 'Texto longo sem espaços não causa rolagem horizontal', longM.over <= 1, JSON.stringify(longM));
  if (longM.over > 1) await shot(ep, 'mobile', '96-achado-texto-longo');
  await go(ep, '#ordens');
  const longList = await ep.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  rec('limites', 'L03', 'Listagem com nome longo sem espaços não estoura', longList <= 1, `overflow=${longList}`);
  if (longList > 1) await shot(ep, 'mobile', '97-achado-texto-longo-lista');

  // Busca com HTML
  await go(ep, '#ordens');
  await ep.fill('#search', '<img src=x onerror="window.__xss=1">');
  await ep.waitForTimeout(180);
  const xss = await ep.evaluate(() => ({ img: document.querySelectorAll('#results img').length, xss: window.__xss || 0, text: document.querySelector('#results').innerText.slice(0, 60) }));
  rec('limites', 'L04', 'Busca escapa HTML e não executa script', xss.img === 0 && !xss.xss, JSON.stringify(xss));

  // Pagamento inválido (0 e acima do saldo)
  await go(ep, '#os/21');
  await ep.click('[data-action="modal:pay:21"]');
  await ep.fill('#action-form input[name=amount]', '0');
  await ep.click('#action-form button[type=submit]');
  await ep.waitForTimeout(180);
  let paid21 = (await ordersDb(ep)).orders.find(o => o.id === 21).paid;
  const stillOpen = await ep.evaluate(() => document.querySelector('#modal').open);
  await ep.fill('#action-form input[name=amount]', '9999');
  await ep.click('#action-form button[type=submit]');
  await ep.waitForTimeout(180);
  const paid21b = (await ordersDb(ep)).orders.find(o => o.id === 21).paid;
  rec('limites', 'L05', 'Pagamento zero ou acima do saldo é bloqueado', paid21 === 0 && paid21b === 0 && stillOpen, `pago=${paid21}/${paid21b}`);
  await ep.keyboard.press('Escape');

  // Entrega com data futura
  await go(ep, '#os/20');
  await ep.click('[data-action="modal:delivery:20"]');
  const tomorrow = await ep.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); });
  await ep.fill('#action-form input[name=date]', tomorrow);
  await ep.check('#action-form input[name=confirm]');
  await ep.click('#action-form button[type=submit]');
  await ep.waitForTimeout(180);
  const delivery20 = (await ordersDb(ep)).orders.find(o => o.id === 20).delivery;
  rec('limites', 'L06', 'Data futura de retirada é bloqueada', delivery20 === null, `delivery=${JSON.stringify(delivery20)}`);

  const extreme = await ep.evaluate(() => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(999999999.99));
  rec('limites', 'L07', 'Valor extremo é formatado em BRL sem erro', 'INFO', extreme);

  await e.ctx.close(); await e.browser.close();

  /* ---------- 7. SAÍDA ---------- */
  const summary = {
    generatedAt: new Date().toISOString(),
    base: BASE,
    sha: process.env.SHA_TESTED || '',
    codeSha: process.env.CODE_SHA || '',
    incrementSha: process.env.INCREMENT_SHA || '',
    totals: {
      pass: results.filter(r => r.status === 'PASS').length,
      fail: results.filter(r => r.status === 'FAIL').length,
      info: results.filter(r => r.status === 'INFO').length,
      total: results.length,
    },
    results,
    console: consoleLog,
    httpErrors,
    network: { total: netLog.length, external: netLog.filter(r => !r.url.startsWith(BASE) && !r.url.startsWith('data:') && r.url !== 'about:blank') },
    shots: shotIndex,
  };
  fs.writeFileSync(path.join(OUT, 'testes', 'resultados.json'), JSON.stringify(summary, null, 2));
  const md = ['# Resultados automatizados — R03', '', `Gerado em ${summary.generatedAt}`, '', `PASS: ${summary.totals.pass} · FAIL: ${summary.totals.fail} · INFO: ${summary.totals.info} · Total: ${summary.totals.total}`, '', '| Status | Área | ID | Verificação | Detalhe |', '| --- | --- | --- | --- | --- |', ...results.map(r => `| ${r.status} | ${r.area} | ${r.id} | ${r.desc.replace(/\|/g, '\\|')} | ${String(r.detail).replace(/\|/g, '\\|').replace(/\n/g, ' ')} |`)].join('\n');
  fs.writeFileSync(path.join(OUT, 'testes', 'resultados.md'), md);
  fs.writeFileSync(path.join(OUT, 'testes', 'console.log'), JSON.stringify(consoleLog, null, 2));
  fs.writeFileSync(path.join(OUT, 'testes', 'rede.log'), JSON.stringify(netLog, null, 2));
  console.log(`\nTOTAL ${summary.totals.total} · PASS ${summary.totals.pass} · FAIL ${summary.totals.fail} · INFO ${summary.totals.info}`);

  await a.ctx.close(); await a.browser.close();
  await s.ctx.close(); await s.browser.close();
})().catch(err => { console.error('FATAL', err); process.exit(1); });
