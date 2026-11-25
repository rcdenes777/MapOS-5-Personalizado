'use strict';
/*
 * R06 — impressão: OS cancelada (A4 e cupom) e recibo original em PDF real.
 * Verifica texto extraído, formato do cupom e ausência de referência privada.
 */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const {
  BASE, OUT, makeRecorder, launch, session, goto, createOrder, setQuote, publish, formalize,
  requestCancel, conferTechnical, confirmAcerto, pay, role
} = require('./lib.cjs');

const { results, rec } = makeRecorder();
const PDF_DIR = path.join(OUT, 'impressos');
fs.mkdirSync(PDF_DIR, { recursive: true });

function pdfText(file) {
  return execFileSync('pdftotext', ['-layout', file, '-'], { encoding: 'utf8' }).replace(/\u00a0/g, ' ');
}
function pdfInfo(file) {
  const out = execFileSync('pdfinfo', [file], { encoding: 'utf8' });
  const pages = Number((out.match(/^Pages:\s+(\d+)/m) || [])[1] || 0);
  const size = (out.match(/^Page size:\s+(.+)$/m) || [])[1] || '';
  return { pages, size, raw: out };
}

(async () => {
  const browser = await launch();
  try {
    const { ctx, a, errors, consoleErrors, requests } = await session(browser, 1440, 900, 'r06print');
    const created = await createOrder(a, { brand: 'Impressão', model: 'R06', defect: 'Impressão de OS cancelada R06.' });
    const id = created.id;
    await setQuote(a, id, [{ type: 'Serviço', name: 'Reparo impresso', quantity: 1, unit: 24000 }], 0);
    await publish(a, id); await formalize(a, id);
    await pay(a, id, 10000, { method: 'Pix' });
    await pay(a, id, 14000, { method: 'Dinheiro' });
    await requestCancel(a, id, 'cliente', 'Pedido para impressão R06.');
    await conferTechnical(a, id, 'Conferência para impressão R06.');
    const sentinel = 'REFERENCIA-PRIVADA-IMPRESSAO-R06';
    await confirmAcerto(a, id, { gross: 10000, discount: 2000, refund: 16000, ref: sentinel, reason: 'Justificativa privada de impressão R06.' });

    // Print media hides the shell.
    await goto(a, `#imprimir/${id}`);
    await a.emulateMedia({ media: 'print' });
    const printCss = await a.evaluate(() => ({
      sidebar: getComputedStyle(document.querySelector('.sidebar')).display,
      top: getComputedStyle(document.querySelector('.top')).display,
      nav: getComputedStyle(document.querySelector('#mobile-nav')).display,
      sheet: getComputedStyle(document.querySelector('.print-sheet')).display
    }));
    rec('R06-PR-01', 'Mídia de impressão oculta casca e navegação', printCss.sidebar === 'none' && printCss.top === 'none' && printCss.nav === 'none' && printCss.sheet !== 'none', JSON.stringify(printCss));
    await a.emulateMedia({ media: 'screen' });

    // A4.
    const a4 = path.join(PDF_DIR, 'os-cancelada-a4.pdf');
    await a.emulateMedia({ media: 'print' });
    await a.pdf({ path: a4, printBackground: true, preferCSSPageSize: true });
    const a4Info = pdfInfo(a4), a4Text = pdfText(a4);
    rec('R06-PR-02', 'PDF A4 da OS cancelada tem uma página e dados financeiros finais', a4Info.pages === 1 && /A4/.test(a4Info.size) && /Ordem de serviço #0\d+/.test(a4Text) && /Cancelado/.test(a4Text) && /R\$ 80,00/.test(a4Text) && /R\$ 0,00/.test(a4Text), JSON.stringify({ info: a4Info, text: a4Text.slice(0, 500) }));
    rec('R06-PR-03', 'PDF A4 não contém justificativa nem referência privada da devolução', !a4Text.includes(sentinel) && !/Justificativa privada/.test(a4Text), 'privacy');
    const shellHidden = await a.evaluate(() => ({
      top: getComputedStyle(document.querySelector('.top')).display,
      nav: getComputedStyle(document.querySelector('#mobile-nav')).display,
      head: getComputedStyle(document.querySelector('.head')).display,
      toast: getComputedStyle(document.querySelector('#toast')).display
    }));
    rec('R06-PR-04', 'PDF de impressão não contém casca, cabeçalho de tela ou navegação', shellHidden.top === 'none' && shellHidden.nav === 'none' && shellHidden.head === 'none' && shellHidden.toast === 'none', JSON.stringify(shellHidden));

    // Coupon 80 mm.
    await goto(a, `#imprimir/${id}/cupom`);
    await a.emulateMedia({ media: 'print' });
    const cupom = path.join(PDF_DIR, 'os-cancelada-cupom.pdf');
    await a.pdf({ path: cupom, width: '80mm', height: '150mm', printBackground: true });
    const cInfo = pdfInfo(cupom), cText = pdfText(cupom);
    const widthMm = (() => { const m = cInfo.size.match(/([\d.]+)\s*x\s*([\d.]+)\s*pts/); return m ? Math.round(Number(m[1]) / 72 * 25.4) : null; })();
    rec('R06-PR-05', 'Cupom usa largura de 80 mm e mantém os valores finais', widthMm === 80 && /Cancelado/.test(cText) && /R\$ 80,00/.test(cText) && !cText.includes(sentinel), JSON.stringify({ info: cInfo, widthMm, text: cText.slice(0, 500) }));
    rec('R06-PR-06', 'Limitação de impressão: cupom de 80 mm ocupa 2 páginas em 150 mm, também nas OS #020/#019 antes do R06 (INFO)', 'INFO', JSON.stringify({ pages: cInfo.pages, size: cInfo.size }));

    const oldCupons = [];
    for (const old of [20, 19]) {
      await goto(a, `#imprimir/${old}/cupom`);
      await a.emulateMedia({ media: 'print' });
      const file = path.join(PDF_DIR, `os0${old}-cupom.pdf`);
      await a.pdf({ path: file, width: '80mm', height: '150mm', printBackground: true });
      const info = pdfInfo(file);
      const m = info.size.match(/([\d.]+)\s*x\s*([\d.]+)\s*pts/);
      oldCupons.push({ id: old, pages: info.pages, widthMm: m ? Math.round(Number(m[1]) / 72 * 25.4) : null, file: path.relative(OUT, file) });
    }
    rec('R06-PR-06-B', 'Cupom das OS legadas #020/#019 também tem 2 páginas em 80×150 mm', oldCupons.every(x => x.pages === 2 && x.widthMm === 80), JSON.stringify(oldCupons));

    // Original receipt must remain printable and unmarked.
    await goto(a, `#recibo/${id}/1`);
    await a.emulateMedia({ media: 'print' });
    const rec1 = path.join(PDF_DIR, 'recibo-original.pdf');
    await a.pdf({ path: rec1, printBackground: true, preferCSSPageSize: true });
    const rInfo = pdfInfo(rec1), rText = pdfText(rec1);
    rec('R06-PR-07', 'Recibo original é impresso sem ESTORNADO e com o valor recebido', rInfo.pages === 1 && /Recibo #\d+ \/ 1/.test(rText) && /R\$ 100,00/.test(rText) && !/ESTORNADO/.test(rText) && !/Administrador/.test(rText), JSON.stringify({ info: rInfo, text: rText.slice(0, 500) }));

    rec('R06-PR-08', 'Impressão sem exceções, erros de console ou requisições externas', errors.length === 0 && consoleErrors.length === 0 && requests.every(u => u.startsWith(BASE) || u.startsWith('data:')), JSON.stringify({ errors, consoleErrors, external: requests.filter(u => !u.startsWith(BASE)).slice(0, 3) }));

    fs.writeFileSync(path.join(OUT, 'testes', 'print-resultados.json'), JSON.stringify({
      generatedAt: new Date().toISOString(), codeSha: process.env.CODE_SHA || '', results,
      pdfs: [a4, cupom, rec1].map(f => ({ file: path.relative(OUT, f), bytes: fs.statSync(f).size, ...pdfInfo(f) })).concat(oldCupons)
    }, null, 2));
    const pass = results.filter(r => r.status === 'PASS').length, fail = results.filter(r => r.status === 'FAIL').length;
    console.log(`\nTOTAL ${results.length} · PASS ${pass} · FAIL ${fail}`);
    if (fail) process.exitCode = 1;
    await ctx.close();
  } finally {
    await browser.close();
  }
})().catch(e => { console.error('FATAL', e); process.exit(1); });
