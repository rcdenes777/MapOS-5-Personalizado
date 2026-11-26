'use strict';
/*
 * R07-003 — impressão: A4/cupom do retorno com substituta e preservação da origem.
 * Verifica texto extraído, formato e ausência de custo/motivo privados.
 */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { BASE, OUT, makeRecorder, launch, session, goto } = require('./lib.cjs');

const { results, rec: recRaw } = makeRecorder();
const rec = (id, desc, ok, detail = '') => recRaw(id, desc, ok, typeof detail === 'string' ? detail : JSON.stringify(detail));
const PDF_DIR = path.join(OUT, 'impressos');
fs.mkdirSync(PDF_DIR, { recursive: true });
const pdfText = f => execFileSync('pdftotext', ['-layout', f, '-'], { encoding: 'utf8' }).replace(/\u00a0/g, ' ');
const flat = s => s.replace(/\s+/g, ' ');
const pdfInfo = f => {
  const o = execFileSync('pdfinfo', [f], { encoding: 'utf8' });
  return { pages: Number((o.match(/^Pages:\s+(\d+)/m) || [])[1] || 0), size: (o.match(/^Page size:\s+(.+)$/m) || [])[1] || '' };
};
async function makePrint(a, id, file, coupon = false) {
  await goto(a, `#imprimir/${id}${coupon ? '/cupom' : ''}`);
  await a.emulateMedia({ media: 'print' });
  const out = path.join(PDF_DIR, file);
  await a.pdf({ path: out, printBackground: true, preferCSSPageSize: true });
  await a.emulateMedia({ media: 'screen' });
  return { file: out, info: pdfInfo(out), text: pdfText(out), flat: flat(pdfText(out)) };
}
async function makePdfAt(a, hash, file) {
  await goto(a, hash);
  await a.emulateMedia({ media: 'print' });
  const out = path.join(PDF_DIR, file);
  await a.pdf({ path: out, printBackground: true, preferCSSPageSize: true });
  await a.emulateMedia({ media: 'screen' });
  return { file: out, info: pdfInfo(out), text: pdfText(out), flat: flat(pdfText(out)) };
}

(async () => {
  const browser = await launch();
  try {
    const { ctx, a, errors, consoleErrors } = await session(browser, 1440, 900, 'r07-003p');
    const ids = await a.evaluate(() => {
      const now = '2026-11-26T12:00:00Z', day = '2026-11-26';
      db = seed();
      const nextId = () => Math.max(0, ...db.orders.map(o => o.id)) + 1;
      const o = { id: nextId(), client: 1, unit: null, brand: 'LG', model: 'Inverter', type: 'Placa eletrônica', status: 'Finalizado', entry: '2026-08-20', conclusion: '2026-09-01', warrantyDays: 90, total: 50000, paid: 0, approval: 'Aprovado', delivery: null, history: [] };
      o.unit = o.id;
      o.billing = { due: '2026-12-20', items: [{ type: 'Serviço', name: 'Serviço original', quantity: 1, unit: 50000 }], discount: 0 };
      BancadaFinance.receive(o, 20000, '2026-11-25', 'Pix', now);
      db.orders.push(o);
      const r = BancadaWarranty.create(o, db.orders, { defect: 'Defeito público do retorno', confirm: true }, day);
      db.orders.push(r);
      BancadaWarranty.assess(r, db.orders, { coverage: 'coberto', solution: 'troca', diagnosis: 'DIAGNOSTICO-PRIVADO-R07', reason: 'JUSTIFICATIVA-PRIVADA-R07', previous: 0, confirm: true }, now, 'Administrador');
      BancadaWarranty.swap(r, db.orders, db.stock, { assessment: BancadaWarranty.assessment(r).id, source: 'externa', destination: 'retida_assistencia', type: 'Placa eletrônica', brand: 'Midea', model: 'Substituta', seal: 'NOVA-1', serial: 'SERIE-1', imei: '', reason: 'MOTIVO-PRIVADO-R07', cost: 4500, confirm: true }, now, 'Administrador');
      r.status = 'Finalizado'; r.conclusion = day; r.warrantyDays = 0;
      save(); render();
      return { o: o.id, r: r.id };
    });

    const retA4 = await makePrint(a, ids.r, 'retorno-substituta-a4.pdf');
    rec('R07P3-01', 'A4 do retorno mostra a substituta e o prazo original sem custo/motivo', retA4.info.pages === 1 && /A4/.test(retA4.info.size) && /Substituta em garantia/.test(retA4.flat) && /Midea/.test(retA4.flat) && /Substituta/.test(retA4.flat) && /NOVA-1/.test(retA4.flat) && !retA4.flat.includes('MOTIVO-PRIVADO-R07') && !retA4.flat.includes('DIAGNOSTICO-PRIVADO-R07') && !retA4.flat.includes('45,00'), retA4.flat.slice(0, 700));

    const retCupom = await makePrint(a, ids.r, 'retorno-substituta-cupom.pdf', true);
    const cupomW = Number((retCupom.info.size.match(/^([\d.]+)/) || [])[1] || 0);
    rec('R07P3-02', 'Cupom 80 mm do retorno identifica a substituta e não vaza custo/motivo', Math.abs(cupomW - 226.77) <= 2 && /Substituta em garantia/.test(retCupom.flat) && /Midea/.test(retCupom.flat) && !retCupom.flat.includes('MOTIVO-PRIVADO-R07') && !retCupom.flat.includes('45,00'), { info: retCupom.info, text: retCupom.flat.slice(0, 300) });

    const origA4 = await makePrint(a, ids.o, 'origem-preservada-a4.pdf');
    rec('R07P3-03', 'A4 da origem preserva 500/200/300 e a identificação original, sem substituta', /Total cobrado[\s\S]*500,00/.test(origA4.flat) && /Pago[\s\S]*200,00/.test(origA4.flat) && /Saldo[\s\S]*300,00/.test(origA4.flat) && /LG · Inverter/.test(origA4.flat) && !/Substituta em garantia/.test(origA4.flat), origA4.flat.slice(0, 500));

    const rec1 = await makePdfAt(a, `#recibo/${ids.o}/1`, 'recibo-original.pdf');
    rec('R07P3-04', 'Recibo original da cobrança preservada continua emitido', /RECIBO|Recibo/.test(rec1.flat) && /200,00/.test(rec1.flat) && !/ESTORNADO/.test(rec1.flat), rec1.flat.slice(0, 300));

    rec('R07P3-05', 'Sem erros de página ou console na impressão', errors.length === 0 && consoleErrors.length === 0, { errors, consoleErrors });
    await ctx.close();
  } finally {
    await browser.close();
    const summary = results.reduce((s, r) => { s[r.status] = (s[r.status] || 0) + 1; return s; }, {});
    fs.writeFileSync(path.join(OUT, 'testes', 'r07-003-print-resultados.json'), JSON.stringify({ generatedAt: new Date().toISOString(), codeSha: process.env.CODE_SHA || '', total: results.length, summary, pdfs: fs.readdirSync(PDF_DIR).filter(f => f.endsWith('.pdf')).map(f => ({ file: f, bytes: fs.statSync(path.join(PDF_DIR, f)).size })), results }, null, 2));
    console.log(`TOTAL ${results.length} · PASS ${summary.PASS || 0} · FAIL ${summary.FAIL || 0} · INFO ${summary.INFO || 0}`);
  }
})().catch(e => { console.error('ERRO FATAL', e); process.exit(1); });
