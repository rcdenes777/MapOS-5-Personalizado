'use strict';
/*
 * R06-002 — testes negativos isolados (domínio), com mensagem exata, estado intacto
 * e controle positivo. Projetado para mutation testing: cada guarda listada tem
 * pelo menos um teste que falha quando a guarda é removida/invertida.
 *
 * Uso:
 *   node negativos.cjs
 *   ASSETS_DIR=/caminho/scratch/assets RESULT_PATH=/caminho/resultado.json node negativos.cjs
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const ASSETS = process.env.ASSETS_DIR || path.resolve(__dirname, '../../../../assets');
const OUT = process.env.RESULT_PATH || path.join(__dirname, 'negativos-resultados.json');
const FILES = ['quote.js', 'portal.js', 'finance.js', 'cancel.js'];

const src = FILES.map(f => fs.readFileSync(path.join(ASSETS, f), 'utf8')).join('\n');
const ctx = vm.createContext({ console });
vm.runInContext(src, ctx);
const BancadaQuote = vm.runInContext('BancadaQuote', ctx);
const BancadaCancel = vm.runInContext('BancadaCancel', ctx);
const BancadaFinance = vm.runInContext('BancadaFinance', ctx);

const now = '2026-11-25T12:00:00Z';
const day = '2026-11-25';
const results = [];

function ok(v, m) { if (!v) throw new Error(m); }
function eq(a, b, m) { if (a !== b) throw new Error((m ? m + ': ' : '') + 'esperado ' + JSON.stringify(b) + ', obtido ' + JSON.stringify(a)); }
function expectMessage(fn, expected) {
  let err = null;
  try { fn(); } catch (e) { err = e; }
  ok(err, 'operação foi aceita; esperava rejeição com a mensagem: ' + expected);
  ok(err.name !== 'TypeError', 'TypeError genérico não conta como validação: ' + err.message);
  eq(err.message, expected, 'mensagem');
}
function freeze(o) {
  BancadaQuote.init(o); BancadaCancel.events(o); BancadaFinance.init(o);
  return JSON.stringify(o);
}
function intact(o, before) { eq(JSON.stringify(o), before, 'estado alterado pela rejeição'); }
function test(id, name, fn) {
  try {
    const detail = fn() || '';
    results.push({ id, name, status: 'PASS', detail: String(detail) });
    console.log(`PASS ${id} — ${name}${detail ? ' :: ' + detail : ''}`);
  } catch (e) {
    results.push({ id, name, status: 'FAIL', detail: e.message });
    console.log(`FAIL ${id} — ${name} :: ${e.message}`);
  }
}

const make = (total = 0, paid = 0) => ({
  id: 1, client: 1, brand: 'Placa', status: 'Negociação', entry: '2026-11-20',
  total, paid, approval: 'Aprovado', history: [{ time: now, text: 'Entrada registrada' }], delivery: null,
  ...(total ? { billing: { due: day } } : {})
});
const DEFAULT_ITEMS = [
  { type: 'Peça', name: 'IGBT', quantity: 3, unit: 3000 },
  { type: 'Serviço', name: 'Diagnóstico', quantity: 1, unit: 5000 },
  { type: 'Serviço', name: 'Reparo', quantity: 2, unit: 8000 }
];
function withQuote(o, items = DEFAULT_ITEMS, discount = 1000) {
  BancadaQuote.saveDraft(o, { items, discount, terms: {} });
  BancadaQuote.publish(o, now);
  o.status = 'Aprovado';
  BancadaQuote.sync(o);
  return o;
}
function prepare(o) {
  BancadaCancel.request(o, 'cliente', 'Pedido do cliente', now, []);
  BancadaCancel.confer(o, true, '', now, []);
  ok(BancadaCancel.pending(o), 'setup: pedido pendente não registrado');
  ok(BancadaCancel.technical(o), 'setup: conferência técnica não concluída');
  return o;
}
function refundOrder() {
  const o = make(24000, 0);
  BancadaFinance.receive(o, 10000, day, 'Pix', now);
  BancadaFinance.receive(o, 14000, day, 'Dinheiro', now);
  eq(BancadaFinance.summary(o).paid, 24000, 'setup: recebimentos');
  return prepare(o);
}
function settledOrder() {
  const o = make(10000, 0);
  BancadaFinance.receive(o, 10000, day, 'Pix', now);
  prepare(o);
  const e = BancadaCancel.confirm(o, data(o, 10000, 0), now, day);
  ok(e && e.type === 'confirm', 'setup: acerto não confirmado');
  eq(o.status, 'Cancelado', 'setup: status do acerto');
  return o;
}
const data = (o, gross, discount = 0, extra = {}) => ({
  key: BancadaCancel.financialKey(o), gross, discount, refund: 0,
  reason: 'Acerto negociado', confirm: true, financialConfirmed: true, settlementConfirmed: true, ...extra
});

/* ---------- devolução: valor divergente com data/forma/referência válidas ---------- */
test('N01', 'Devolução com valor divergente e data/forma/referência válidas é rejeitada', () => {
  const o = refundOrder();
  const before = freeze(o);
  expectMessage(() => BancadaCancel.confirm(o, data(o, 10000, 2000, {
    refund: 15999, date: day, method: 'Pix', ref: 'Comprovante fictício válido'
  }), now, day), 'O valor devolvido deve ser exatamente o valor calculado.');
  intact(o, before);

  const p = refundOrder();
  BancadaCancel.confirm(p, data(p, 10000, 2000, {
    refund: 16000, date: day, method: 'Pix', ref: 'Comprovante fictício válido'
  }), now, day);
  eq(p.status, 'Cancelado'); eq(p.total, 8000); eq(p.paid, 8000);
  const refunds = BancadaFinance.events(p).filter(e => e.type === 'refund');
  eq(refunds.length, 1); eq(refunds[0].amount, 16000);
  eq(BancadaFinance.receipt(p, 1).amount, 10000); eq(BancadaFinance.reversed(p, 1), null);
  return '15999 rejeitado; 16000 confirmado (total 8000, pago 8000, recibo #1 intacto)';
});

/* ---------- devolução: forma inválida (demais campos válidos) ---------- */
test('N02', 'Forma de devolução inválida é rejeitada com data e referência válidas', () => {
  const o = refundOrder();
  const before = freeze(o);
  expectMessage(() => BancadaCancel.confirm(o, data(o, 10000, 2000, {
    refund: 16000, date: day, method: 'Cheque', ref: 'Comprovante fictício válido'
  }), now, day), 'Informe data e forma da devolução.');
  intact(o, before);

  const p = refundOrder();
  BancadaCancel.confirm(p, data(p, 10000, 2000, {
    refund: 16000, date: day, method: 'Pix', ref: 'Comprovante fictício válido'
  }), now, day);
  eq(p.status, 'Cancelado'); eq(p.paid, 8000);
  return 'Cheque rejeitado; Pix confirmado';
});

/* ---------- devolução: data inválida (demais campos válidos) ---------- */
test('N03', 'Data de devolução inválida é rejeitada com forma e referência válidas', () => {
  const o = refundOrder();
  const before = freeze(o);
  expectMessage(() => BancadaCancel.confirm(o, data(o, 10000, 2000, {
    refund: 16000, date: '2026-02-30', method: 'Pix', ref: 'Comprovante fictício válido'
  }), now, day), 'Informe data e forma da devolução.');
  intact(o, before);

  const p = refundOrder();
  BancadaCancel.confirm(p, data(p, 10000, 2000, {
    refund: 16000, date: day, method: 'Pix', ref: 'Comprovante fictício válido'
  }), now, day);
  eq(p.status, 'Cancelado');
  return 'data 2026-02-30 rejeitada; data válida confirmada';
});

/* ---------- devolução: comprovante/referência obrigatório ---------- */
test('N04', 'Devolução sem comprovante ou referência é rejeitada', () => {
  const o = refundOrder();
  const before = freeze(o);
  expectMessage(() => BancadaCancel.confirm(o, data(o, 10000, 2000, {
    refund: 16000, date: day, method: 'Pix', ref: '   '
  }), now, day), 'Confira o motivo ou as observações.');
  intact(o, before);

  const p = refundOrder();
  BancadaCancel.confirm(p, data(p, 10000, 2000, {
    refund: 16000, date: day, method: 'Pix', ref: 'Comprovante fictício válido'
  }), now, day);
  eq(p.status, 'Cancelado');
  return 'referência vazia rejeitada; referência válida confirmada';
});

/* ---------- conferência financeira explícita ---------- */
test('N05', 'Confirmação sem conferência financeira é rejeitada e não grava', () => {
  const o = refundOrder();
  const before = freeze(o);
  expectMessage(() => BancadaCancel.confirm(o, data(o, 10000, 2000, {
    refund: 16000, date: day, method: 'Pix', ref: 'Comprovante fictício válido', financialConfirmed: false
  }), now, day), 'Confirme a conferência financeira e o cancelamento.');
  intact(o, before);

  const p = refundOrder();
  BancadaCancel.confirm(p, data(p, 10000, 2000, {
    refund: 16000, date: day, method: 'Pix', ref: 'Comprovante fictício válido'
  }), now, day);
  eq(p.status, 'Cancelado');
  return 'financialConfirmed=false rejeitado; true confirmado';
});

/* ---------- conferência do acerto ---------- */
test('N06', 'Confirmação sem conferência do acerto é rejeitada quando há valores', () => {
  const o = refundOrder();
  const before = freeze(o);
  expectMessage(() => BancadaCancel.confirm(o, data(o, 10000, 2000, {
    refund: 16000, date: day, method: 'Pix', ref: 'Comprovante fictício válido', settlementConfirmed: false
  }), now, day), 'Confirme os valores do acerto.');
  intact(o, before);

  const p = refundOrder();
  BancadaCancel.confirm(p, data(p, 10000, 2000, {
    refund: 16000, date: day, method: 'Pix', ref: 'Comprovante fictício válido'
  }), now, day);
  eq(p.status, 'Cancelado');
  return 'settlementConfirmed=false rejeitado; true confirmado';
});

/* ---------- justificativa do acerto ---------- */
test('N07', 'Justificativa vazia é rejeitada quando o acerto exige justificativa', () => {
  const o = refundOrder();
  const before = freeze(o);
  expectMessage(() => BancadaCancel.confirm(o, data(o, 10000, 2000, { reason: '   ' }), now, day),
    'Confira o motivo ou as observações.');
  intact(o, before);

  const p = refundOrder();
  BancadaCancel.confirm(p, data(p, 10000, 2000, {
    refund: 16000, date: day, method: 'Pix', ref: 'Comprovante fictício válido',
    reason: 'Acerto negociado'
  }), now, day);
  eq(p.status, 'Cancelado');
  return 'justificativa vazia rejeitada; justificativa válida confirmada';
});

/* ---------- remoção parcial de serviço ---------- */
test('N08', 'Remoção parcial de serviço é rejeitada; remoção integral é aceita', () => {
  const o = withQuote(make());
  BancadaCancel.request(o, 'cliente', 'Pedido do cliente', now, []);
  const idx = BancadaCancel.lines(o).findIndex(i => i.type === 'Serviço' && i.quantity === 2);
  ok(idx >= 0, 'serviço com quantidade 2 não encontrado no fixture');
  const before = freeze(o);
  expectMessage(() => BancadaCancel.remove(o, idx, 1, 'notdone', '', now, []),
    'Destino inválido para este item.');
  intact(o, before);

  const p = withQuote(make());
  BancadaCancel.request(p, 'cliente', 'Pedido do cliente', now, []);
  const pidx = BancadaCancel.lines(p).findIndex(i => i.type === 'Serviço' && i.quantity === 2);
  const e = BancadaCancel.remove(p, pidx, 2, 'notdone', '', now, []);
  eq(e.type, 'item'); eq(e.disposition, 'notdone');
  ok(!BancadaCancel.lines(p).some(i => i.name === 'Reparo'), 'serviço removido');
  ok(BancadaCancel.lines(p).some(i => i.name === 'Diagnóstico'), 'serviço executado preservado');
  return 'parcial rejeitada; integral removeu só o serviço não executado';
});

/* ---------- destino incompatível: peça ---------- */
test('N09', 'Peça com destino de serviço é rejeitada; destino de peça é aceito', () => {
  const o = withQuote(make());
  BancadaCancel.request(o, 'cliente', 'Pedido do cliente', now, []);
  const before = freeze(o);
  expectMessage(() => BancadaCancel.remove(o, 0, 3, 'notdone', '', now, []),
    'Destino inválido para este item.');
  intact(o, before);

  const p = withQuote(make());
  BancadaCancel.request(p, 'cliente', 'Pedido do cliente', now, []);
  const e = BancadaCancel.remove(p, 0, 1, 'unused', '', now, []);
  eq(e.disposition, 'unused'); eq(e.stockReturned, 0);
  eq(BancadaCancel.lines(p)[0].quantity, 2);
  return 'peça/notdone rejeitada; peça/unused aceita sem entrada em estoque';
});

/* ---------- destino incompatível: serviço ---------- */
test('N10', 'Serviço com destino de peça é rejeitado; destino de serviço é aceito', () => {
  const o = withQuote(make());
  BancadaCancel.request(o, 'cliente', 'Pedido do cliente', now, []);
  const before = freeze(o);
  expectMessage(() => BancadaCancel.remove(o, 1, 1, 'unused', '', now, []),
    'Destino inválido para este item.');
  intact(o, before);

  const p = withQuote(make());
  BancadaCancel.request(p, 'cliente', 'Pedido do cliente', now, []);
  const e = BancadaCancel.remove(p, 1, 1, 'notdone', '', now, []);
  eq(e.disposition, 'notdone');
  ok(!BancadaCancel.lines(p).some(i => i.name === 'Diagnóstico'), 'serviço não executado removido');
  ok(BancadaCancel.lines(p).some(i => i.name === 'Reparo'), 'serviço executado preservado');
  return 'serviço/unused rejeitado; serviço/notdone aceito';
});

/* ---------- retificação após devolução ---------- */
test('N11', 'Retificação após devolução é bloqueada; retificação sem devolução é aceita', () => {
  const o = refundOrder();
  BancadaCancel.confirm(o, data(o, 10000, 2000, {
    refund: 16000, date: day, method: 'Pix', ref: 'Comprovante fictício válido'
  }), now, day);
  eq(o.status, 'Cancelado');
  const before = freeze(o);
  expectMessage(() => BancadaFinance.reverse(o, 1, day, 'Tentativa após devolução', now, 'lancamento_incorreto', day),
    'Há devolução registrada ou não há obrigação; confira o histórico.');
  intact(o, before);

  const p = settledOrder();
  const e = BancadaFinance.reverse(p, 1, day, 'Pagamento não compensado', now, 'nao_compensado', day);
  eq(e.type, 'reverse'); eq(e.rectification, 'nao_compensado'); eq(p.paid, 0);
  ok(BancadaFinance.allowsReceive(p), 'saldo recomposto autoriza novo recebimento');
  return 'após devolução rejeitada; cancelamento sem devolução retificado';
});

/* ---------- retificação: janela ---------- */
test('N12', 'Retificação fora da janela (antes da confirmação ou futura) é rejeitada', () => {
  const o = settledOrder();
  const before = freeze(o);
  expectMessage(() => BancadaFinance.reverse(o, 1, '2026-11-24', 'Data anterior', now, 'lancamento_incorreto', day),
    'Data fora do período de retificação.');
  intact(o, before);
  expectMessage(() => BancadaFinance.reverse(o, 1, '2026-11-26', 'Data futura', now, 'lancamento_incorreto', day),
    'Data fora do período de retificação.');
  intact(o, before);

  const p = settledOrder();
  const e = BancadaFinance.reverse(p, 1, day, 'Lançamento incorreto', now, 'lancamento_incorreto', day);
  eq(e.type, 'reverse'); eq(p.paid, 0);
  return '2026-11-24 e 2026-11-26 rejeitadas; data da confirmação aceita';
});

/* ---------- retificação: tipo explícito ---------- */
test('N13', 'Retificação com tipo inválido é rejeitada; tipo permitido é aceito', () => {
  const o = settledOrder();
  const before = freeze(o);
  expectMessage(() => BancadaFinance.reverse(o, 1, day, 'Tipo inválido', now, 'outro', day),
    'Retificação indisponível.');
  intact(o, before);

  const p = settledOrder();
  const e = BancadaFinance.reverse(p, 1, day, 'Lançamento incorreto', now, 'lancamento_incorreto', day);
  eq(e.rectification, 'lancamento_incorreto'); eq(p.paid, 0);
  return 'outro rejeitado; lancamento_incorreto aceito';
});

/* ---------- teto do valor devido ---------- */
test('N14', 'Valor devido acima do teto é rejeitado; o teto exato é aceito', () => {
  const o = make();
  const before = freeze(o);
  expectMessage(() => BancadaCancel.calculate(o, 1000000000, 0), 'Valor devido ou desconto inválido.');
  intact(o, before);
  const a = BancadaCancel.calculate(o, 999999999, 0);
  eq(a.gross, 999999999); eq(a.total, 999999999);
  return '1000000000 rejeitado; 999999999 aceito';
});

/* ---------- devolução: data anterior aos eventos financeiros (suplementar) ---------- */
test('N15', 'Devolução com data anterior aos recebimentos é rejeitada', () => {
  const o = refundOrder();
  const before = freeze(o);
  expectMessage(() => BancadaCancel.confirm(o, data(o, 10000, 2000, {
    refund: 16000, date: '2026-11-24', method: 'Pix', ref: 'Comprovante fictício válido'
  }), now, day), 'Data anterior aos registros financeiros.');
  intact(o, before);

  const p = refundOrder();
  BancadaCancel.confirm(p, data(p, 10000, 2000, {
    refund: 16000, date: day, method: 'Pix', ref: 'Comprovante fictício válido'
  }), now, day);
  eq(p.status, 'Cancelado');
  return '2026-11-24 rejeitada; data dos recebimentos aceita';
});

const pass = results.filter(r => r.status === 'PASS').length;
const fail = results.filter(r => r.status === 'FAIL').length;
const assets = {};
for (const f of FILES) assets[f] = crypto.createHash('sha256').update(fs.readFileSync(path.join(ASSETS, f))).digest('hex');

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({
  generatedAt: new Date().toISOString(), codeSha: process.env.CODE_SHA || '', assetsDir: ASSETS, assets, total: results.length, pass, fail, results
}, null, 2));
console.log(`\nTOTAL ${results.length} · PASS ${pass} · FAIL ${fail}`);
if (fail) process.exitCode = 1;
