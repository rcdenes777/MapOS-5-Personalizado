'use strict';
/*
 * R02 — testes de regressão das correções e refinamentos.
 * Executar contra o protótipo em BASE_URL. Não altera arquivos do protótipo.
 */
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');

const CHROME = process.env.CHROME_PATH || '/home/dragonblue/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8130';
const OUT = path.resolve(__dirname, '..');
const KEY = 'mapos-bancada-prototype-v1';
const results = [];

function rec(id, desc, ok, detail = '') {
  const status = ok === 'INFO' ? 'INFO' : ok ? 'PASS' : 'FAIL';
  results.push({ id, desc, status, detail });
  console.log(`${status} ${id} — ${desc}${detail ? ' :: ' + detail : ''}`);
}

async function session(browser, w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, locale: 'pt-BR' });
  const p = await ctx.newPage();
  const responses = [];
  p.on('response', r => { if (r.status() >= 400) responses.push({ status: r.status(), url: r.url() }); });
  await p.goto(BASE + '/', { waitUntil: 'networkidle' });
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: 'networkidle' });
  await p.evaluate(() => save());
  const go = async hash => {
    await p.evaluate(x => { const d = document.querySelector('#modal'); if (d && d.open) d.close(); window.scrollTo(0, 0); if (location.hash === x) render(); else location.hash = x; }, hash);
    await p.waitForTimeout(160);
    await p.waitForSelector('#main h1', { state: 'attached' });
  };
  return { ctx, p, go, responses };
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });

  /* 1. Atalho de conteúdo */
  {
    const { ctx, p } = await session(browser, 1440, 900);
    await p.goto(BASE + '/?skip=' + Date.now(), { waitUntil: 'networkidle' });
    await p.keyboard.press('Tab');
    const before = await p.evaluate(() => ({ hash: location.hash, href: document.activeElement.getAttribute('href'), cls: document.activeElement.className }));
    await p.keyboard.press('Enter');
    await p.waitForTimeout(220);
    const after = await p.evaluate(() => ({ hash: location.hash, h1: document.querySelector('#main h1').innerText, focused: document.activeElement.id || document.activeElement.tagName }));
    rec('G1-01', 'Atalho de conteúdo não altera a rota e mantém a tela', before.cls === 'skip' && after.hash === before.hash && after.h1 !== 'Ação indisponível' && after.focused === 'main', JSON.stringify({ before, after }));
    await ctx.close();
  }

  /* 2. Overflow com texto longo nas oito resoluções */
  for (const [w, h] of [[1920, 1080], [1440, 900], [1366, 768], [768, 1024], [412, 915], [390, 844], [360, 800], [320, 568]]) {
    const { ctx, p, go } = await session(browser, w, h);
    await p.evaluate(k => {
      const d = JSON.parse(localStorage.getItem(k));
      d.clients[0].name = 'Cliente ' + 'X'.repeat(140);
      const o = d.orders.find(x => x.id === 20);
      o.model = 'M'.repeat(160);
      o.defect = 'D'.repeat(400);
      localStorage.setItem(k, JSON.stringify(d));
    }, KEY);
    await p.reload({ waitUntil: 'networkidle' });
    await go('#os/20');
    const detail = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    await go('#ordens');
    const list = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    rec(`G1-02-${w}`, `Texto longo sem overflow em ${w}x${h}`, detail <= 1 && list <= 1, `detalhe=${detail}, lista=${list}`);
    await ctx.close();
  }

  /* 3. Cartão adaptado ao contêiner */
  {
    const { ctx, p, go } = await session(browser, 1440, 900);
    await go('#inicio');
    const card = await p.evaluate(() => {
      const stack = document.querySelector('.grid.split > .stack');
      const order = stack?.querySelector('.order');
      const title = order?.querySelector('.order-title strong');
      const full = document.querySelector('.grid.split > .panel .list .order');
      return {
        width: order ? Math.round(order.getBoundingClientRect().width) : null,
        height: order ? Math.round(order.getBoundingClientRect().height) : null,
        cols: order ? getComputedStyle(order).gridTemplateColumns.split(' ').length : null,
        titleLines: title ? Math.round(title.getBoundingClientRect().height / parseFloat(getComputedStyle(title).lineHeight)) : null,
        fullCols: full ? getComputedStyle(full).gridTemplateColumns.split(' ').length : null,
      };
    });
    rec('G1-03', 'Cartão estreito usa uma coluna e não quebra o título', card.cols === 1 && card.height <= 160 && card.titleLines <= 3, JSON.stringify(card));
    rec('G1-03b', 'Cartão em contêiner largo mantém três colunas', card.fullCols === 3, `fullCols=${card.fullCols}`);
    await ctx.close();
  }

  /* 4. Foco no modal: Tab, Shift+Tab, Escape */
  {
    const { ctx, p, go } = await session(browser, 1440, 900);
    await go('#os/20');
    const trigger = '[data-action="modal:tech:20"]';
    await p.click(trigger);
    let escaped = null;
    for (let i = 1; i <= 12; i++) {
      await p.keyboard.press('Tab');
      const st = await p.evaluate(() => ({ inside: document.querySelector('#modal').contains(document.activeElement), tag: document.activeElement.tagName, text: (document.activeElement.innerText || '').trim().slice(0, 20) }));
      if (!st.inside && !escaped) escaped = { i, ...st };
    }
    rec('G1-04', 'Tab permanece dentro do modal', escaped === null, escaped ? JSON.stringify(escaped) : '12 Tabs contidos');
    await p.keyboard.press('Escape');
    await p.waitForTimeout(180);
    const esc = await p.evaluate(() => ({ open: document.querySelector('#modal').open, active: document.activeElement.dataset.action || document.activeElement.tagName }));
    rec('G1-04b', 'Escape fecha e devolve o foco ao gatilho', !esc.open && esc.active === 'modal:tech:20', JSON.stringify(esc));
    await p.click(trigger);
    // Shift+Tab a partir do primeiro focável deve ir ao último, não ao body
    await p.evaluate(() => {
      const dlg = document.querySelector('#modal');
      const f = [...dlg.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select,textarea,summary,[tabindex]:not([tabindex="-1"])')].filter(el => el.offsetParent !== null);
      f[0].focus();
    });
    await p.keyboard.press('Shift+Tab');
    const shift = await p.evaluate(() => ({ inside: document.querySelector('#modal').contains(document.activeElement), text: (document.activeElement.innerText || '').trim().slice(0, 24) }));
    rec('G1-04c', 'Shift+Tab no primeiro focável volta ao último', shift.inside, JSON.stringify(shift));
    await p.keyboard.press('Escape');
    await ctx.close();
  }

  /* 5. Favicon, alvos, texto, plural, datas, placeholder, marca */
  {
    const { ctx, p, go, responses } = await session(browser, 390, 844);
    const favicon = await p.evaluate(() => !!document.querySelector('link[rel~="icon"]'));
    rec('G1-05', 'Favicon declarado e sem 404', favicon && responses.filter(r => /favicon/.test(r.url)).length === 0, JSON.stringify(responses));

    await go('#nova');
    const targets = await p.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll('a[href],button,input,select,textarea,summary')) {
        if (el.closest('.sr,.skip')) continue;
        if (el.matches('input[type=checkbox],input[type=radio]') && el.closest('label')) continue;
        const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;
        if (r.height < 44 || r.width < 44) out.push({ tag: el.tagName, text: (el.innerText || el.name || '').trim().slice(0, 20), w: Math.round(r.width), h: Math.round(r.height) });
      }
      return out;
    });
    rec('G1-06', 'Alvos de toque ≥44 px', targets.length === 0, JSON.stringify(targets.slice(0, 8)));

    const small = await p.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll('body *')) {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || el.closest('.sr,.skip')) continue;
        if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
        const s = parseFloat(cs.fontSize);
        if (s < 12) out.push({ tag: el.tagName, cls: String(el.className).slice(0, 24), size: +s.toFixed(1), text: el.textContent.trim().slice(0, 20) });
      }
      return out;
    });
    rec('G1-07', 'Texto auxiliar ≥12 px', small.length === 0, JSON.stringify(small.slice(0, 8)));

    await go('#clientes');
    const plural = (await p.locator('#main').innerText()).includes('1 atendimento\n') || (await p.locator('#main').innerText()).includes('1 atendimento ');
    rec('G1-08', 'Pluralização "1 atendimento"', plural && !(await p.locator('#main').innerText()).includes('1 atendimentos'), (await p.locator('#main').innerText()).split('\n').filter(x => /atendimento/.test(x)).join(' | '));

    await go('#ordens');
    await p.fill('#search', 'Midea');
    await p.waitForTimeout(180);
    const one = await p.locator('#results').innerText();
    rec('G1-08b', 'Consulta com um resultado usa "1 ordem encontrada"', /1 ordem encontrada/.test(one) && !/1 ordens/.test(one), one.split('\n')[0]);
    rec('G1-09', 'Placeholder da busca menciona defeito', /defeito/.test(await p.locator('#search').getAttribute('placeholder')), await p.locator('#search').getAttribute('placeholder'));

    await go('#os/20/historico');
    const hist = await p.locator('.timeline').innerText();
    rec('G1-10', 'Datas do histórico padronizadas (sem ISO)', !/\d{4}-\d{2}-\d{2}/.test(hist), hist.replace(/\n/g, ' | ').slice(0, 200));

    const brand = await p.locator('.mobile-brand').getAttribute('aria-label');
    rec('G1-11', 'Nome acessível da marca contém o texto visível', /m\./i.test(brand || ''), `aria-label=${brand}`);
    await ctx.close();
  }

  /* 6. Impressão A4 e 80 mm */
  {
    const { ctx, p, go } = await session(browser, 1440, 900);
    await go('#imprimir/20');
    const a4 = await p.evaluate(() => {
      let rules = [];
      for (const s of document.styleSheets) { try { for (const r of s.cssRules) if (r.type === CSSRule.PAGE_RULE) rules.push(r.cssText); } catch {} }
      return { rules, sheet: Math.round(document.querySelector('.print-sheet').getBoundingClientRect().width) };
    });
    await go('#imprimir/20/cupom');
    const cupom = await p.evaluate(() => {
      let rules = [];
      for (const s of document.styleSheets) { try { for (const r of s.cssRules) if (r.type === CSSRule.PAGE_RULE) rules.push(r.cssText); } catch {} }
      return { rules, sheet: Math.round(document.querySelector('.print-sheet').getBoundingClientRect().width), page: getComputedStyle(document.querySelector('.print-sheet')).page };
    });
    rec('G1-12', 'Impressão define @page A4 e cupom 80 mm', a4.rules.length > 0 && cupom.rules.some(r => /80mm/.test(r)), JSON.stringify({ a4, cupom }));
    await ctx.close();
  }

  /* 7. Contexto ao trocar de perfil */
  {
    const { ctx, p, go } = await session(browser, 1440, 900);
    await go('#os/20');
    await p.selectOption('#role', 'Técnico');
    await p.waitForTimeout(220);
    const kept = await p.evaluate(() => ({ hash: location.hash, h1: document.querySelector('#main h1').innerText }));
    await go('#configuracoes');
    await p.selectOption('#role', 'Administrador');
    await p.waitForTimeout(150);
    await p.selectOption('#role', 'Técnico');
    await p.waitForTimeout(220);
    const denied = await p.evaluate(() => ({ hash: location.hash, h1: document.querySelector('#main h1').innerText }));
    rec('G1-13', 'Troca de perfil preserva rota acessível', kept.hash === '#os/20' && /Midea/.test(kept.h1), JSON.stringify(kept));
    rec('G1-13b', 'Troca de perfil sai da rota quando o novo perfil não acessa', denied.hash === '#inicio', JSON.stringify(denied));
    await ctx.close();
  }

  /* 8. Painel compacto e filtros mobile */
  {
    const { ctx, p, go } = await session(browser, 390, 844);
    await go('#inicio');
    const dash = await p.evaluate(() => {
      const hero = document.querySelector('.hero');
      const metrics = document.querySelector('.metrics');
      const first = document.querySelector('#main .order');
      return {
        hero: Math.round(hero.getBoundingClientRect().height),
        metrics: Math.round(metrics.getBoundingClientRect().height),
        firstTop: Math.round(first.getBoundingClientRect().top + scrollY),
        firstVisible: first.getBoundingClientRect().top < innerHeight,
        queues: document.querySelectorAll('.metric').length,
      };
    });
    rec('G2-01', 'Painel mobile compacto mostra a primeira OS', dash.firstVisible && dash.firstTop < 700 && dash.hero <= 170 && dash.metrics <= 270 && dash.queues === 6, JSON.stringify(dash));

    await go('#ordens');
    const filters = await p.evaluate(() => {
      const sel = document.querySelector('#queue-filter');
      const chips = document.querySelector('.filters .chips') || document.querySelector('.filters');
      const first = document.querySelector('#main .order');
      return {
        selectVisible: !!sel && sel.offsetParent !== null,
        chipsVisible: !!chips && chips.offsetParent !== null,
        firstTop: first ? Math.round(first.getBoundingClientRect().top + scrollY) : null,
        activeLabel: sel ? sel.options[sel.selectedIndex]?.textContent : null,
      };
    });
    rec('G2-02', 'Celular usa seletor de fila e mostra a primeira OS', filters.selectVisible && !filters.chipsVisible && filters.firstTop < 560, JSON.stringify(filters));
    await ctx.close();
  }

  /* 8b. Painel em 320px: primeira OS na primeira tela */
  {
    const { ctx, p, go } = await session(browser, 320, 568);
    await go('#inicio');
    const d = await p.evaluate(() => {
      const first = document.querySelector('#main .order');
      const hero = document.querySelector('.hero');
      const nav = document.querySelector('#mobile-nav');
      const navTop = Math.round(nav.getBoundingClientRect().top);
      return { firstTop: first ? Math.round(first.getBoundingClientRect().top + scrollY) : null, firstVisibleAboveNav: first ? first.getBoundingClientRect().top < navTop - 20 : false, navTop, hero: hero ? Math.round(hero.getBoundingClientRect().height) : null };
    });
    rec('G2-01b', 'Painel em 320x568 mostra a primeira OS acima do menu', d.firstVisibleAboveNav && d.firstTop < d.navTop - 20 && d.hero <= 90, JSON.stringify(d));
    await ctx.close();
  }

  /* 9. Detalhe da OS compacto */
  {
    const { ctx, p, go } = await session(browser, 390, 844);
    await go('#os/20');
    const os = await p.evaluate(() => {
      const stats = document.querySelector('.stats');
      const tabs = document.querySelector('.tabs');
      const labels = [...document.querySelectorAll('.stat label')].map(x => x.innerText);
      const actions = [...document.querySelectorAll('.stat .btn')].map(x => x.innerText);
      return { stats: Math.round(stats.getBoundingClientRect().height), tabsTop: Math.round(tabs.getBoundingClientRect().top + scrollY), labels, actions };
    });
    rec('G2-03', 'Detalhe mobile compacta os três estados e aproxima as abas', os.stats <= 340 && os.tabsTop < 600 && os.labels.length === 3 && /andamento técnico/i.test(os.labels.join(' ')) && /financeiro/i.test(os.labels.join(' ')) && /retirada/i.test(os.labels.join(' ')), JSON.stringify(os));
    await ctx.close();
  }

  /* 10. Nova OS: barra persistente e opcionais recolhidos */
  {
    const { ctx, p, go } = await session(browser, 390, 844);
    await go('#nova');
    const form = await p.evaluate(() => {
      const submit = document.querySelector('#new-form button[type=submit]');
      const footer = document.querySelector('#new-form .form-footer');
      const nav = document.querySelector('#mobile-nav');
      const st = getComputedStyle(footer);
      const r = submit.getBoundingClientRect();
      const nr = nav.getBoundingClientRect();
      const optional = [...document.querySelectorAll('#new-form details')].map(d => ({ summary: d.querySelector('summary')?.innerText, open: d.open }));
      return {
        submitVisible: r.top >= 0 && r.bottom <= innerHeight,
        submitTop: Math.round(r.top),
        footerBottom: Math.round(footer.getBoundingClientRect().bottom),
        navTop: Math.round(nr.top),
        position: st.position,
        optional,
        requiredVisible: !!document.querySelector('#new-form input[name=brand]') && !!document.querySelector('#new-form textarea[name=defect]'),
      };
    });
    rec('G2-04', 'Barra de ações da Nova OS visível e acima do menu', form.submitVisible && form.footerBottom <= form.navTop + 1 && ['sticky', 'fixed'].includes(form.position), JSON.stringify(form));
    await p.focus('textarea[name=defect]');
    await p.waitForTimeout(180);
    const focusPos = await p.evaluate(() => {
      const el = document.querySelector('textarea[name=defect]');
      const bar = document.querySelector('#new-form .form-footer');
      return { fieldBottom: Math.round(el.getBoundingClientRect().bottom), barTop: Math.round(bar.getBoundingClientRect().top), fieldVisible: el.getBoundingClientRect().top >= 0 };
    });
    rec('G2-04b', 'Campo focado fica acima da barra de ações', focusPos.fieldVisible && focusPos.fieldBottom <= focusPos.barTop + 1, JSON.stringify(focusPos));
    rec('G2-05', 'Opcionais (selo/série/IMEI) recolhidos e disponíveis', form.optional.some(o => /selo|série|imei/i.test(o.summary || '') && !o.open), JSON.stringify(form.optional));
    rec('G2-05b', 'Campos obrigatórios continuam disponíveis', form.requiredVisible, `brand/defect=${form.requiredVisible}`);
    await ctx.close();
  }

  /* 11. Navegação inferior sem duplo destaque */
  {
    const { ctx, p, go } = await session(browser, 390, 844);
    await go('#nova');
    const nova = await p.evaluate(() => [...document.querySelectorAll('#mobile-nav a.active')].map(a => a.getAttribute('href')));
    await go('#os/20');
    const os = await p.evaluate(() => [...document.querySelectorAll('#mobile-nav a.active')].map(a => a.getAttribute('href')));
    rec('G2-06', 'Somente a aba atual fica ativa (Nova OS)', nova.length === 1 && nova[0] === '#nova', JSON.stringify(nova));
    rec('G2-06b', 'Somente a aba atual fica ativa (OS)', os.length === 1 && os[0] === '#ordens', JSON.stringify(os));
    await ctx.close();
  }

  /* 12. M-05 — entrega independente, sem reabrir finalizada */
  {
    const { ctx, p, go } = await session(browser, 1440, 900);
    await go('#os/22');
    await p.click('[data-action="modal:delivery:22"]');
    await p.check('#action-form input[name=confirm]');
    await p.click('#action-form button[type=submit]');
    await p.waitForTimeout(220);
    const closeIfOpen = async () => { await p.evaluate(() => { const d = document.querySelector('#modal'); if (d && d.open) d.close(); }); };
    await closeIfOpen();
    await p.click('[data-action="modal:tech:22"]');
    await p.selectOption('#action-form select[name=status]', 'Finalizado');
    await p.check('#action-form input[name=confirm]');
    await p.click('#action-form button[type=submit]');
    await p.waitForTimeout(220);
    const afterFinalize = await p.evaluate(() => { const o = db.orders.find(x => x.id === 22); return { status: o.status, delivered: !!o.delivery, conclusion: o.conclusion }; });
    await closeIfOpen();
    // Tentar reabrir uma OS finalizada e entregue
    await p.click('[data-action="modal:tech:22"]');
    await p.selectOption('#action-form select[name=status]', 'Em Andamento');
    await p.check('#action-form input[name=confirm]');
    await p.click('#action-form button[type=submit]');
    await p.waitForTimeout(220);
    const afterReopen = await p.evaluate(() => { const o = db.orders.find(x => x.id === 22); return { status: o.status, toast: document.querySelector('#toast').innerText }; });
    await closeIfOpen();
    rec('G3-01', 'Entrega não impede finalizar a OS', afterFinalize.status === 'Finalizado' && afterFinalize.delivered && !!afterFinalize.conclusion, JSON.stringify(afterFinalize));
    rec('G3-02', 'Finalizada e entregue não pode ser reaberta', afterReopen.status === 'Finalizado' && /entregue|reabrir/i.test(afterReopen.toast), JSON.stringify(afterReopen));
    await ctx.close();
  }

  fs.writeFileSync(path.join(OUT, 'testes', 'regressao-r02-resultados.json'), JSON.stringify({ generatedAt: new Date().toISOString(), codeSha: process.env.CODE_SHA || '', incrementSha: process.env.INCREMENT_SHA || '', results }, null, 2));
  const pass = results.filter(r => r.status === 'PASS').length;
  const fail = results.filter(r => r.status === 'FAIL').length;
  console.log(`\nTOTAL ${results.length} · PASS ${pass} · FAIL ${fail}`);
  await browser.close();
})();
