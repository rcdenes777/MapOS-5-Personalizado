'use strict';
/*
 * R07-001 — checagem do handler real para a guarda de solução pendente.
 * Usada no código entregue (deve passar) e numa cópia mutada (deve falhar).
 */
const fs = require('node:fs');
const path = require('node:path');
const { launch, session, goto, open, submit } = require('./lib.cjs');

const RESULT = process.env.RESULT_PATH || path.join(__dirname, 'r07-handler-solucao.json');
(async () => {
  const browser = await launch();
  let out;
  try {
    const { a } = await session(browser, 1440, 900, 'r07handler');
    await goto(a, '#os/18/garantia');
    const opened = await open(a, 'warrantyAssess', 18);
    await a.selectOption('#action-form select[name=coverage]', 'nao_coberto');
    await a.selectOption('#action-form select[name=solution]', 'troca');
    await a.fill('#action-form textarea[name=diagnosis]', 'Falha coberta fora da garantia.');
    await a.fill('#action-form textarea[name=reason]', 'Troca indicada no handler.');
    await a.check('#action-form input[name=confirm]');
    await submit(a);
    await goto(a, '#os/18');
    const modal = await open(a, 'tech', 18);
    await a.selectOption('#action-form select[name=status]', 'Finalizado');
    await a.check('#action-form input[name=confirm]');
    const st = await submit(a);
    const state = await a.evaluate(() => {
      const o = db.orders.find(x => x.id === 18);
      return { status: o.status, conclusion: o.conclusion, total: o.total, paid: o.paid };
    });
    out = {
      generatedAt: new Date().toISOString(), codeSha: process.env.CODE_SHA || '',
      opened, modal, error: st.error, toast: st.toast, state,
      guardPresent: st.error === 'Execute a solução de garantia escolhida antes de concluir o retorno.' && state.status === 'Aberto' && state.conclusion === null
    };
  } finally { await browser.close(); }
  fs.writeFileSync(RESULT, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out));
  if (!out.guardPresent) process.exitCode = 2;
})().catch(e => { console.error('ERRO FATAL', e); process.exit(1); });
