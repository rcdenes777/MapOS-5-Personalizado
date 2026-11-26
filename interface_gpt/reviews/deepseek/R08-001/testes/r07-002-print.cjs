'use strict';
/*
 * R07-002 — impressão: A4/cupom da origem liquidada por garantia, retorno e recibos.
 * Verifica texto extraído, formato e ausência de comprovante/motivo privados.
 */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { BASE, OUT, makeRecorder, launch, session, goto, open, closeModal, submit } = require('./lib.cjs');

const { results, rec } = makeRecorder();
const PDF_DIR = path.join(OUT, 'impressos');
fs.mkdirSync(PDF_DIR, { recursive: true });
const pdfText = f => execFileSync('pdftotext', ['-layout', f, '-'], { encoding: 'utf8' }).replace(/\u00a0/g, ' ');
const flat = s => s.replace(/\s+/g, ' ');
const pdfInfo = f => {
  const o = execFileSync('pdfinfo', [f], { encoding: 'utf8' });
  return { pages: Number((o.match(/^Pages:\s+(\d+)/m) || [])[1] || 0), size: (o.match(/^Page size:\s+(.+)$/m) || [])[1] || '' };
};
async function makePdfAt(a, hash, file) {
  await goto(a, hash);
  await a.emulateMedia({ media: 'print' });
  const out = path.join(PDF_DIR, file);
  await a.pdf({ path: out, printBackground: true, preferCSSPageSize: true });
  await a.emulateMedia({ media: 'screen' });
  return { file: out, info: pdfInfo(out), text: pdfText(out), flat: flat(pdfText(out)) };
}
async function makePrint(a, id, file, coupon = false) {
  await goto(a, `#imprimir/${id}${coupon ? '/cupom' : ''}`);
  await a.emulateMedia({ media: 'print' });
  const out = path.join(PDF_DIR, file);
  await a.pdf({ path: out, printBackground: true, preferCSSPageSize: true });
  await a.emulateMedia({ media: 'screen' });
  return { file: out, info: pdfInfo(out), text: pdfText(out), flat: flat(pdfText(out)) };
}

(async () => {
  const browser = await launch();
  try {
    const { ctx, a, errors, consoleErrors } = await session(browser, 1440, 900, 'r07-002p');
    const ids = await a.evaluate(() => {
      const now = '2026-11-26T12:00:00Z', day = '2026-11-26';
      db = seed();
      const nextId = () => Math.max(0, ...db.orders.map(o => o.id)) + 1;
      const mk = ({ total = 50000, paid = 20000 } = {}) => {
        const o = { id: nextId(), client: 1, unit: null, brand: 'LG', model: 'Inverter', type: 'Placa eletrônica', status: 'Finalizado', entry: '2026-08-20', conclusion: '2026-09-01', warrantyDays: 90, total, paid: 0, approval: 'Aprovado', delivery: null, history: [] };
        o.unit = o.id; o.billing = { due: '2026-12-20', items: [{ type: 'Serviço', name: 'Serviço original', quantity: 1, unit: total }], discount: 0 };
        if (paid) BancadaFinance.receive(o, paid, '2026-11-25', 'Pix', now);
        db.orders.push(o);
        const r = BancadaWarranty.create(o, db.orders, { defect: 'Defeito público do retorno', confirm: true }, day);
        db.orders.push(r);
        BancadaWarranty.assess(r, db.orders, { coverage: 'coberto', solution: 'devolucao_valor', diagnosis: 'DIAGNOSTICO-PRIVADO-R07', reason: 'JUSTIFICATIVA-PRIVADA-R07', previous: 0, confirm: true }, now, 'Administrador');
        return [o.id, r.id];
      };
      const ids = { a: mk(), zero: mk({ paid: 0 }) };
      save(); render();
      return ids;
    });
    const [P, R] = ids.a, [Z, ZR] = ids.zero;

    await goto(a, `#os/${R}/garantia`);
    await open(a, 'warrantyRefund', R);
    await a.selectOption('#action-form select[name=mode]', 'parcial');
    await a.fill('#action-form input[name=amount]', '50.00');
    await a.selectOption('#action-form select[name=method]', 'Pix');
    await a.fill('#action-form input[name=reference]', 'COMPROVANTE-PRIVADO-R07');
    await a.fill('#action-form textarea[name=reason]', 'MOTIVO-PRIVADO-R07');
    await a.check('#action-form input[name=confirm]');
    await submit(a);

    const a4 = await makePrint(a, P, 'origem-parcial-a4.pdf');
    rec('R07P-01', 'A4 da origem parcial mantém cobrança líquida 450/150/300 e situação Parcial', a4.info.pages === 1 && /A4/.test(a4.info.size) && /Total cobrado[\s\S]*450,00/.test(a4.flat) && /Pago[\s\S]*150,00/.test(a4.flat) && /Saldo[\s\S]*300,00/.test(a4.flat) && /Situação financeira[\s\S]*Parcial/.test(a4.flat) && !a4.flat.includes('COMPROVANTE-PRIVADO-R07') && !a4.flat.includes('MOTIVO-PRIVADO-R07'), a4.flat.slice(0, 500));
    const cupom = await makePrint(a, P, 'origem-parcial-cupom.pdf', true);
    const cupomW = Number((cupom.info.size.match(/^([\d.]+)/) || [])[1] || 0);
    rec('R07P-02', 'Cupom 80 mm da origem parcial com totais e sem dados privados', Math.abs(cupomW - 226.77) <= 2 && /450,00/.test(cupom.flat) && /150,00/.test(cupom.flat), JSON.stringify({ info: cupom.info, text: cupom.flat.slice(0, 220) }));
    const ret = await makePrint(a, R, 'retorno-a4.pdf');
    rec('R07P-03', 'A4 do retorno não vaza diagnóstico, justificativa, comprovante ou motivo', !ret.flat.includes('DIAGNOSTICO-PRIVADO-R07') && !ret.flat.includes('JUSTIFICATIVA-PRIVADA-R07') && !ret.flat.includes('COMPROVANTE-PRIVADO-R07') && !ret.flat.includes('MOTIVO-PRIVADO-R07') && ret.flat.includes('Defeito público do retorno') && ret.info.pages === 1, ret.flat.slice(0, 400));

    await goto(a, `#os/${R}/garantia`);
    await open(a, 'warrantyRefund', R);
    await a.selectOption('#action-form select[name=mode]', 'total');
    await a.waitForTimeout(120);
    await a.selectOption('#action-form select[name=method]', 'Pix');
    await a.fill('#action-form input[name=reference]', 'COMPROVANTE-PRIVADO-R07');
    await a.fill('#action-form textarea[name=reason]', 'MOTIVO-PRIVADO-R07');
    await a.check('#action-form input[name=confirm]');
    await submit(a);
    const a4z = await makePrint(a, P, 'origem-reembolsada-a4.pdf');
    rec('R07P-04', 'A4 da origem reembolsada mostra 0/0/0 e situação Reembolsado', /Total cobrado[\s\S]*0,00/.test(a4z.flat) && /Pago[\s\S]*0,00/.test(a4z.flat) && /Saldo[\s\S]*0,00/.test(a4z.flat) && /Situação financeira[\s\S]*Reembolsado/.test(a4z.flat) && !a4z.flat.includes('COMPROVANTE-PRIVADO-R07'), a4z.flat.slice(0, 500));
    const rec1 = await makePdfAt(a, `#recibo/${P}/1`, 'recibo-original.pdf');
    rec('R07P-05', 'Recibo original continua emitido e sem marca de estorno', /RECIBO|Recibo/.test(rec1.flat) && /200,00/.test(rec1.flat) && !/ESTORNADO/.test(rec1.flat), rec1.flat.slice(0, 300));

    await goto(a, `#os/${ZR}/garantia`);
    await open(a, 'warrantyRefund', ZR);
    await a.selectOption('#action-form select[name=mode]', 'total');
    await a.waitForTimeout(120);
    await a.selectOption('#action-form select[name=method]', 'Pix');
    await a.fill('#action-form input[name=reference]', 'SEM-DINHEIRO-R07');
    await a.fill('#action-form textarea[name=reason]', 'ENCERRAMENTO-SEM-CAIXA-R07');
    await a.check('#action-form input[name=confirm]');
    await submit(a);
    const z = await makePrint(a, Z, 'origem-encerrada-cupom.pdf', true);
    rec('R07P-06', 'Cupom do encerramento sem dinheiro mostra 0/0 e Encerrado por garantia', /Total cobrado[\s\S]*0,00/.test(z.flat) && /Pago[\s\S]*0,00/.test(z.flat) && /Situação financeira[\s\S]*Encerrado por garantia/.test(z.flat), z.flat.slice(0, 400));
    rec('R07P-07', 'Impressões não contêm referência privada nem justificativa', [a4, cupom, ret, a4z, rec1, z].every(x => !x.flat.includes('COMPROVANTE-PRIVADO-R07') && !x.flat.includes('MOTIVO-PRIVADO-R07') && !x.flat.includes('JUSTIFICATIVA-PRIVADA-R07')), 'limpo');
    rec('R07P-08', 'Sem erros de página ou console na impressão', errors.length === 0 && consoleErrors.length === 0, JSON.stringify({ errors, consoleErrors }));

    await ctx.close();
  } finally {
    await browser.close();
    const summary = results.reduce((s, r) => { s[r.status] = (s[r.status] || 0) + 1; return s; }, {});
    fs.writeFileSync(path.join(OUT, 'testes', 'r07-002-print-resultados.json'), JSON.stringify({ generatedAt: new Date().toISOString(), codeSha: process.env.CODE_SHA || '', total: results.length, summary, pdfs: fs.readdirSync(PDF_DIR).map(f => ({ file: f, bytes: fs.statSync(path.join(PDF_DIR, f)).size })), results }, null, 2));
    console.log(`TOTAL ${results.length} · PASS ${summary.PASS || 0} · FAIL ${summary.FAIL || 0} · INFO ${summary.INFO || 0}`);
  }
})().catch(e => { console.error('ERRO FATAL', e); process.exit(1); });
