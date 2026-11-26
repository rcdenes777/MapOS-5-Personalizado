'use strict';
/*
 * R07-001 — impressão do retorno em garantia (A4 e cupom), sem dados privados.
 * Requer pdftotext/pdfinfo + playwright-core.
 */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const {
  BASE, OUT, makeRecorder, launch, session, goto, open, submit
} = require('./lib.cjs');

const { results, rec } = makeRecorder();
const PDF_DIR = path.join(OUT, 'impressos');
fs.mkdirSync(PDF_DIR, { recursive: true });

function pdfText(file) { return execFileSync('pdftotext', ['-layout', file, '-'], { encoding: 'utf8' }).replace(/\u00a0/g, ' '); }
const flat = s => s.replace(/\s+/g, ' ');
function pdfInfo(file) {
  const out = execFileSync('pdfinfo', [file], { encoding: 'utf8' });
  return {
    pages: Number((out.match(/^Pages:\s+(\d+)/m) || [])[1] || 0),
    size: (out.match(/^Page size:\s+(.+)$/m) || [])[1] || ''
  };
}
async function assess(a, id) {
  await goto(a, `#os/${id}/garantia`);
  if (!(await open(a, 'warrantyAssess', id))) throw new Error('avaliação não abriu');
  await a.selectOption('#action-form select[name=coverage]', 'nao_coberto');
  await a.selectOption('#action-form select[name=solution]', 'novo_orcamento');
  await a.fill('#action-form textarea[name=diagnosis]', 'DIAGNOSTICO-PRIVADO-IMPRESSO-R07');
  await a.fill('#action-form textarea[name=reason]', 'JUSTIFICATIVA-PRIVADA-IMPRESSO-R07');
  await a.check('#action-form input[name=confirm]');
  return submit(a);
}
async function addCost(a, id) {
  await goto(a, `#os/${id}/garantia`);
  if (!(await open(a, 'warrantyCost', id))) throw new Error('custo não abriu');
  await a.fill('#action-form input[name=amount]', '25.50');
  await a.fill('#action-form input[name=minutes]', '30');
  await a.fill('#action-form textarea[name=reason]', 'CUSTO-PRIVADO-IMPRESSO-R07');
  await a.check('#action-form input[name=confirm]');
  return submit(a);
}

(async () => {
  const browser = await launch();
  try {
    const { ctx, a, errors, consoleErrors, requests } = await session(browser, 1440, 900, 'r07print');
    await assess(a, 18);
    await addCost(a, 18);
    await goto(a, '#retorno/20');
    await a.fill('#new-form textarea[name=defect]', 'Defeito público impresso do retorno R07.');
    await a.check('#new-form input[name=confirm]');
    await a.locator('#new-form button[type=submit]').click();
    await a.waitForTimeout(420);
    const id = await a.evaluate(() => db.orders.at(-1).id);

    await goto(a, `#imprimir/${id}`);
    await a.emulateMedia({ media: 'print' });
    const printCss = await a.evaluate(() => {
      const g = s => { const el = document.querySelector(s); return el ? getComputedStyle(el).display : 'ausente'; };
      return { sidebar: g('.sidebar'), top: g('.top'), nav: g('#mobile-nav'), sheet: g('.print-sheet') };
    });
    rec('R07-PR-01', 'Mídia de impressão oculta a casca e mantém a folha', printCss.sidebar === 'none' && printCss.top === 'none' && printCss.nav === 'none' && printCss.sheet !== 'none', JSON.stringify(printCss));
    const a4 = path.join(PDF_DIR, 'retorno-garantia-a4.pdf');
    await a.pdf({ path: a4, printBackground: true, preferCSSPageSize: true });
    await a.emulateMedia({ media: 'screen' });
    const a4i = pdfInfo(a4), a4t = pdfText(a4), a4f = flat(a4t);
    rec('R07-PR-02', 'PDF A4 do retorno tem uma página A4 e identifica OS, cliente, equipamento e defeito',
      a4i.pages === 1 && /A4/.test(a4i.size) && new RegExp('Ordem de serviço #0' + id).test(a4f) &&
      a4f.includes('Refrigeração Horizonte') === false && a4f.includes('Clima Sul Serviços') && a4f.includes('Midea') &&
      a4f.includes('Defeito público impresso do retorno R07'),
      JSON.stringify({ info: a4i, text: a4t.slice(0, 500) }));

    await goto(a, `#imprimir/${id}/cupom`);
    await a.emulateMedia({ media: 'print' });
    const cupom = path.join(PDF_DIR, 'retorno-garantia-cupom.pdf');
    await a.pdf({ path: cupom, printBackground: true, preferCSSPageSize: true });
    await a.emulateMedia({ media: 'screen' });
    const ci = pdfInfo(cupom), ct = pdfText(cupom), cf = flat(ct);
    const mm = (ci.size.match(/([\d.]+)\s*x\s*([\d.]+)/) || []);
    const widthMm = mm ? Math.round(Number(mm[1]) / 72 * 25.4) : null;
    rec('R07-PR-03', 'Cupom do retorno fica em 80 mm, uma página, com o mesmo defeito',
      ci.pages === 1 && widthMm === 80 && cf.includes('Defeito público impresso do retorno R07'),
      JSON.stringify({ info: ci, widthMm }));

    rec('R07-PR-04', 'Impressão do retorno não vaza diagnóstico, custo, avaliação ou vínculo',
      !a4f.includes('DIAGNOSTICO-PRIVADO') && !a4f.includes('JUSTIFICATIVA-PRIVADA') && !a4f.includes('CUSTO-PRIVADO') &&
      !a4f.includes('Garantia') && !cf.includes('DIAGNOSTICO-PRIVADO') && !cf.includes('JUSTIFICATIVA-PRIVADA') && !cf.includes('CUSTO-PRIVADO') && !cf.includes('Garantia'),
      JSON.stringify({ a4: a4t.slice(0, 300) }));

    await goto(a, '#imprimir/16');
    await a.emulateMedia({ media: 'print' });
    const origem = path.join(PDF_DIR, 'origem-garantia-a4.pdf');
    await a.pdf({ path: origem, printBackground: true, preferCSSPageSize: true });
    await a.emulateMedia({ media: 'screen' });
    const oi = pdfInfo(origem), ot = pdfText(origem), of = flat(ot);
    rec('R07-PR-05', 'Impressão da origem continua válida e não muda com o retorno',
      oi.pages === 1 && of.includes('Ordem de serviço #016') && of.includes('Finalizado') && !of.includes('DIAGNOSTICO-PRIVADO'),
      JSON.stringify({ info: oi, text: ot.slice(0, 300) }));

    rec('R07-PR-06', 'Sem exceções, console ou requisições externas na impressão',
      errors.length === 0 && consoleErrors.length === 0 && requests.every(u => u.startsWith(BASE) || u.startsWith('data:')),
      JSON.stringify({ errors, consoleErrors, external: requests.filter(u => !u.startsWith(BASE) && !u.startsWith('data:')).slice(0, 4) }));

    const summary = results.reduce((s, r) => { s[r.status] = (s[r.status] || 0) + 1; return s; }, {});
    fs.writeFileSync(path.join(OUT, 'testes', 'r07-print-resultados.json'), JSON.stringify({
      generatedAt: new Date().toISOString(), codeSha: process.env.CODE_SHA || '', total: results.length, summary, results,
      pdfs: [a4, cupom, origem].map(f => ({ file: path.relative(OUT, f), bytes: fs.statSync(f).size, ...pdfInfo(f) }))
    }, null, 2));
    console.log(`TOTAL ${results.length} · PASS ${summary.PASS || 0} · FAIL ${summary.FAIL || 0} · INFO ${summary.INFO || 0}`);
  } finally {
    await browser.close();
  }
})().catch(e => { console.error('ERRO FATAL', e); process.exit(1); });
