'use strict';
/*
 * R08-001 — identidade estável de linhas (F03), negativos isolados e controles positivos.
 * Domínio em VM isolada (sem browser). Cada rejeição compara o estado serializado antes/depois.
 * Uso: node r08-domain.cjs  |  ASSETS_DIR=/scratch/assets RESULT_PATH=/scratch/out.json node r08-domain.cjs
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ASSETS = process.env.ASSETS_DIR || path.resolve(__dirname, '../../../../assets');
const OUT = process.env.RESULT_PATH || path.join(__dirname, 'r08-domain-resultados.json');
const FILES = ['quote.js', 'stock.js', 'finance.js', 'cancel.js', 'portal.js', 'warranty.js'];
const src = FILES.map(f => fs.readFileSync(path.join(ASSETS, f), 'utf8')).join('\n');
const ctx = vm.createContext({ console });
vm.runInContext(src, ctx);
const Q = vm.runInContext('BancadaQuote', ctx);
const C = vm.runInContext('BancadaCancel', ctx);
const P = vm.runInContext('BancadaPortal', ctx);
const W = vm.runInContext('BancadaWarranty', ctx);

const now = '2026-11-26T12:00:00Z';
const day = '2026-11-26';
const results = [];
let n = 0;
const ok = (v, m) => { if (!v) throw new Error(m || 'asserção falhou'); };
const eq = (a, b, m) => ok(a === b, (m ? m + ': ' : '') + 'esperado ' + JSON.stringify(b) + ', obtido ' + JSON.stringify(a));
function reject(fn, message, o) {
  const before = JSON.stringify(o);
  let err = null;
  try { fn(); } catch (e) { err = e; }
  ok(err, 'operação foi aceita; esperava rejeição: ' + message);
  ok(err.name !== 'TypeError', 'TypeError genérico não conta como validação: ' + err.message);
  eq(err.message, message);
  eq(JSON.stringify(o), before, 'estado alterado pela rejeição');
}
function test(id, name, fn) {
  n++;
  try {
    const detail = fn() || '';
    results.push({ id, name, status: 'PASS', detail: String(detail).slice(0, 800) });
    console.log(`PASS ${id} — ${name}${detail ? ' :: ' + String(detail).slice(0, 160) : ''}`);
  } catch (e) {
    results.push({ id, name, status: 'FAIL', detail: e.message });
    console.log(`FAIL: ${id} — ${name} :: ${e.message}`);
  }
}

const piece = (name = 'IGBT') => ({ type: 'Peça', name, quantity: 3, unit: 1000 });
const service = (name = 'Diagnóstico', quantity = 1) => ({ type: 'Serviço', name, quantity, unit: 2000 });
const draft = items => ({ items, discount: 0, terms: {} });
const make = (id = 1) => ({ id, client: 1, brand: 'LG', model: 'Placa', status: 'Aberto', entry: day, total: 0, paid: 0, history: [] });
const rows = o => C.lines(o);
const ids = o => rows(o).map(i => i.lineId);
const key = (o, i) => C.itemKey(o, i);
const req = o => C.request(o, 'cliente', 'Solicitação fictícia R08.', now);

/* ---------------- D01–D08: identidade estável no rascunho ---------------- */
test('D01', 'Linhas idênticas recebem IDs distintos e inteiros positivos', () => {
  const o = make(); Q.saveDraft(o, draft([piece(), piece(), service()]));
  const list = ids(o);
  eq(new Set(list).size, 3); ok(list.every(v => Number.isSafeInteger(v) && v > 0), JSON.stringify(list));
  return JSON.stringify(list);
});
test('D02', 'Editar quantidade, preço e nome da mesma linha/tipo preserva o ID', () => {
  const o = make(); Q.saveDraft(o, draft([piece(), piece(), service()]));
  const [a, b, c] = rows(o);
  Q.saveDraft(o, draft([{ ...a, quantity: 2, unit: 1200, name: 'IGBT novo' }, b, c]));
  eq(rows(o)[0].lineId, a.lineId); eq(rows(o)[0].name, 'IGBT novo'); eq(rows(o)[0].quantity, 2);
  return JSON.stringify(ids(o));
});
test('D03', 'Reordenar linhas preserva os IDs por identidade, não por índice', () => {
  const o = make(); Q.saveDraft(o, draft([piece(), piece(), service()]));
  const [a, b, c] = rows(o);
  Q.saveDraft(o, draft([c, b, a]));
  eq(rows(o).map(i => i.name).join(','), [c.name, b.name, a.name].join(','));
  eq(rows(o).map(i => i.lineId).join(','), [c.lineId, b.lineId, a.lineId].join(','));
  return JSON.stringify(ids(o));
});
test('D04', 'Excluir linha não recicla o ID em inclusão posterior', () => {
  const o = make(); Q.saveDraft(o, draft([piece(), piece(), service()]));
  const [a, b, c] = rows(o);
  Q.saveDraft(o, draft([b, c]));
  Q.saveDraft(o, draft([...rows(o), piece('Novo')]));
  const added = rows(o).at(-1);
  ok(added.lineId > a.lineId, `novo ID ${added.lineId} não é maior que o removido ${a.lineId}`);
  ok(!ids(o).includes(a.lineId), 'ID removido reapareceu');
  return JSON.stringify(ids(o));
});
test('D05', 'Trocar o tipo da linha aloca novo ID (mesmo nome e valores)', () => {
  const o = make(); Q.saveDraft(o, draft([piece(), service()]));
  const [a, b] = rows(o);
  Q.saveDraft(o, draft([{ ...a, type: 'Serviço' }, b]));
  ok(rows(o)[0].lineId !== a.lineId, 'ID preservado indevidamente na troca de tipo');
  ok(!ids(o).includes(a.lineId), 'ID antigo reutilizado');
  return JSON.stringify(rows(o).map(i => [i.type, i.lineId]));
});
test('D06', 'ID forjado é rejeitado com mensagem exata e estado intacto; null é inclusão nova', () => {
  const o = make(); Q.saveDraft(o, draft([piece(), service()]));
  const [a, b] = rows(o);
  reject(() => Q.saveDraft(o, draft([{ ...a, lineId: 999 }, b])), 'O item mudou ou não pertence a esta OS. Reabra o orçamento.', o);
  // positive control: same values with the real IDs are accepted
  Q.saveDraft(o, draft([{ ...a, quantity: 2 }, b]));
  eq(rows(o)[0].lineId, a.lineId);
  // a blank itemId is the editor's "new row" marker (inclusion), not a forged identity
  const { lineId, ...blank } = a;
  Q.saveDraft(o, draft([{ ...blank, quantity: 1 }, b]));
  ok(rows(o)[0].lineId > Math.max(a.lineId, b.lineId), 'inclusão sem ID não recebeu ID novo');
  return 'forjado rejeitado; null tratado como inclusão; edição válida aceita';
});
test('D07', 'ID duplicado no mesmo payload é rejeitado sem duplicar linha', () => {
  const o = make(); Q.saveDraft(o, draft([piece(), service()]));
  const [a, b] = rows(o);
  reject(() => Q.saveDraft(o, draft([a, { ...b, lineId: a.lineId }])), 'O item mudou ou não pertence a esta OS. Reabra o orçamento.', o);
  eq(rows(o).length, 2);
  return 'duplicidade rejeitada';
});
test('D08', 'Linha nova sem ID recebe ID novo sem afetar as linhas existentes', () => {
  const o = make(); Q.saveDraft(o, draft([piece(), service()]));
  const [a, b] = rows(o);
  const { lineId, ...noId } = piece('Inserida sem ID');
  Q.saveDraft(o, draft([a, b, noId]));
  eq(rows(o).length, 3);
  eq(rows(o)[0].lineId, a.lineId); eq(rows(o)[1].lineId, b.lineId);
  ok(rows(o)[2].lineId > Math.max(a.lineId, b.lineId), 'ID novo não é monotônico');
  return JSON.stringify(ids(o));
});
test('D09', 'Publicação anterior permanece byte a byte imutável após editar o rascunho', () => {
  const o = make(); Q.saveDraft(o, draft([piece(), service()]));
  const v = Q.publish(o, now), old = JSON.stringify(v);
  Q.saveDraft(o, draft([{ ...rows(o)[0], quantity: 1 }, rows(o)[1]]));
  eq(JSON.stringify(v), old, 'versão publicada reescrita');
  eq(Q.vigente(o), null, 'rascunho alterado ainda vigente');
  return 'v1 intacta; vigência anulada';
});
test('D10', 'Nova publicação compara identidade mesmo com valores públicos idênticos', () => {
  const o = make(); Q.saveDraft(o, draft([piece(), service()]));
  Q.publish(o, now);
  const { lineId, ...noId } = rows(o)[0]; const second = rows(o)[1];
  Q.saveDraft(o, draft([noId, second]));
  eq(Q.vigente(o), null);
  eq(Q.label(o), 'Itens alterados');
  return 'identidade nova invalidou a versão';
});
test('D11', 'Snapshot legado sem IDs mantém a comparação de conteúdo original', () => {
  const legacy = { type: 'Peça', name: 'IGBT', quantity: 2, unit: 1000 };
  const o = { ...make(), quote: { draft: draft([{ ...legacy }]), versions: [{ number: 1, ...draft([{ ...legacy }]), total: 2000 }], current: 1, active: true } };
  eq(Q.init(o).draft.items[0].lineId > 0, true);
  eq(Q.vigente(o).number, 1);
  return 'vigente pelo conteúdo legado';
});
test('D12', 'Migração perezosa não reescreve snapshot publicado nem cobrança legada', () => {
  const legacy = { type: 'Peça', name: 'IGBT', quantity: 2, unit: 1000 };
  const o = { ...make(), quote: { draft: draft([{ ...legacy }]), versions: [{ number: 1, ...draft([{ ...legacy }]), total: 2000 }], current: 1, active: true }, billing: { due: day, items: [{ ...legacy }], discount: 0 } };
  const before = JSON.stringify({ v: o.quote.versions, b: o.billing });
  Q.init(o); Q.init(o); Q.vigente(o); Q.label(o);
  eq(JSON.stringify({ v: o.quote.versions, b: o.billing }), before, 'snapshot/cobrança legados reescritos');
  ok(!JSON.stringify(o.quote.versions).includes('lineId'), 'lineId vazou para versão legada');
  ok(!JSON.stringify(o.billing).includes('lineId'), 'lineId vazou para cobrança legada');
  return 'legado intacto após init repetido';
});
test('D13', 'Projeção pública não expõe IDs internos da linha', () => {
  const o = make(); Q.saveDraft(o, draft([piece(), service()])); Q.publish(o, now);
  const projected = JSON.stringify(P.projection(o));
  ok(!projected.includes('lineId') && !projected.includes('nextLineId'), 'ID privado no portal');
  return 'sem lineId/nextLineId';
});
test('D14', 'nextLineId é monotônico após serialização e exclusão', () => {
  const o = make(); Q.saveDraft(o, draft([piece(), piece()]));
  const max = Math.max(...ids(o));
  const x = JSON.parse(JSON.stringify(o));
  Q.saveDraft(x, draft([rows(x)[0]]));
  Q.saveDraft(x, draft([...rows(x), piece('Depois do roundtrip')]));
  ok(rows(x).at(-1).lineId > max, 'ID reciclado após roundtrip');
  return JSON.stringify(ids(x));
});
test('D15', 'Conferência corrompida por ID duplicado é reparada só no rascunho', () => {
  const item = piece();
  const o = { ...make(), quote: { draft: draft([{ ...item, lineId: 1 }, { ...item, lineId: 1 }]), versions: [], current: null, active: false } };
  const list = Q.init(o).draft.items.map(i => i.lineId);
  eq(new Set(list).size, 2);
  eq(list[0], 1);
  ok(list[1] > 1, 'segundo ID não alocado');
  return JSON.stringify(list);
});
test('D31', 'Excluir a linha de maior ID não recicla o número na inclusão seguinte', () => {
  const o = make(); Q.saveDraft(o, draft([piece(), piece()]));
  const [a, b] = rows(o);
  Q.saveDraft(o, draft([a]));
  Q.saveDraft(o, draft([...rows(o), piece('Depois da maior')]));
  ok(rows(o).at(-1).lineId > b.lineId, `ID ${rows(o).at(-1).lineId} reciclou o removido ${b.lineId}`);
  return JSON.stringify(ids(o));
});
test('D32', 'nextLineId maior que o máximo é respeitado (contador monotônico)', () => {
  const item = piece();
  const o = { ...make(), quote: { draft: draft([{ ...item, lineId: 1 }]), versions: [], current: null, active: false, nextLineId: 10 } };
  Q.init(o);
  const { lineId, ...noId } = piece('Nova');
  Q.saveDraft(o, draft([...rows(o), noId]));
  eq(rows(o).at(-1).lineId, 10);
  return 'ID 10 usado, contador preservado';
});

/* ---------------- D16–D27: cancelamento por identidade ---------------- */
function withLines() {
  const o = make(); Q.saveDraft(o, draft([piece(), piece(), service()]));
  req(o);
  return o;
}
test('D16', 'Conferir item por ID + chave remove a linha certa e preserva as demais', () => {
  const o = withLines(); const [a, b, c] = rows(o);
  const e = C.remove(o, a.lineId, 3, 'unused', '', now, [], key(o, a));
  eq(e.type, 'item'); eq(e.item.lineId, a.lineId);
  eq(rows(o).map(i => i.lineId).join(','), [b.lineId, c.lineId].join(','));
  return 'linha A removida; B/C intactas';
});
test('D17', 'Chave stale da mesma linha é rejeitada após retirada parcial; nova chave permite', () => {
  const o = withLines(); const a = rows(o)[0], k = key(o, a);
  C.remove(o, a.lineId, 1, 'unused', '', now, [], k);
  eq(rows(o)[0].lineId, a.lineId); eq(rows(o)[0].quantity, 2);
  reject(() => C.remove(o, a.lineId, 1, 'unused', '', now, [], k), 'O item ou pedido mudou. Reabra a conferência.', o);
  C.remove(o, a.lineId, 1, 'unused', '', now, [], key(o, rows(o)[0]));
  eq(rows(o)[0].lineId, a.lineId); eq(rows(o)[0].quantity, 1);
  return 'retirada parcial manteve ID; replay antigo bloqueado';
});
test('D18', 'Modal stale de A não atinge B quando B ocupa o índice original de A', () => {
  const o = withLines(); const [a, b, c] = rows(o), k = key(o, a);
  C.remove(o, a.lineId, 3, 'unused', '', now, [], k);
  eq(rows(o)[0].lineId, b.lineId);
  reject(() => C.remove(o, a.lineId, 1, 'unused', '', now, [], k), 'Item não encontrado.', o);
  eq(rows(o)[0].lineId, b.lineId); eq(rows(o)[0].quantity, 3);
  return 'B intacta; índice não é identificador';
});
test('D19', 'Reordenar outras linhas não redireciona a chave da linha selecionada', () => {
  const o = withLines(); const [a, b, c] = rows(o), k = key(o, b);
  Q.saveDraft(o, draft([c, b, a]));
  C.remove(o, b.lineId, 1, 'unused', '', now, [], k);
  eq(rows(o).find(i => i.lineId === b.lineId).quantity, 2);
  eq(rows(o).find(i => i.lineId === a.lineId).quantity, 3);
  return 'reordenação preservou seleção exata';
});
test('D20', 'Chave de outra OS / pedido é rejeitada sem tocar o estado', () => {
  const o = withLines(); const other = make(2); Q.saveDraft(other, draft([piece(), piece(), service()])); req(other);
  reject(() => C.remove(o, rows(o)[0].lineId, 1, 'unused', '', now, [], key(other, rows(other)[0])), 'O item ou pedido mudou. Reabra a conferência.', o);
  C.withdraw(o, 'Retirado', now); req(o);
  const staleRequest = key(o, rows(o)[0]);
  C.withdraw(o, 'Retirado de novo', now); req(o);
  reject(() => C.remove(o, rows(o)[0].lineId, 1, 'unused', '', now, [], staleRequest), 'O item ou pedido mudou. Reabra a conferência.', o);
  return 'outra OS e pedido novo bloqueados';
});
test('D21', 'ID inexistente, chave ausente e chave falsa são rejeitados com motivo específico', () => {
  const o = withLines(); const a = rows(o)[0];
  reject(() => C.remove(o, 999, 1, 'unused', '', now, [], key(o, a)), 'Item não encontrado.', o);
  reject(() => C.remove(o, a.lineId, 1, 'unused', '', now, []), 'O item ou pedido mudou. Reabra a conferência.', o);
  reject(() => C.remove(o, a.lineId, 1, 'unused', '', now, [], 'forjada'), 'O item ou pedido mudou. Reabra a conferência.', o);
  C.remove(o, a.lineId, 1, 'unused', '', now, [], key(o, a));
  return 'negativos isolados com positivo';
});
test('D22', 'Duplo envio do mesmo modal não gera segundo evento', () => {
  const o = withLines(); const a = rows(o)[0], k = key(o, a);
  C.remove(o, a.lineId, 3, 'unused', '', now, [], k);
  const events = C.events(o).length;
  reject(() => C.remove(o, a.lineId, 3, 'unused', '', now, [], k), 'Item não encontrado.', o);
  eq(C.events(o).length, events);
  return 'sem evento duplicado';
});
test('D23', 'Conferência técnica duplicada é rejeitada; identidade nova exige nova conferência', () => {
  const o = make(); Q.saveDraft(o, draft([service()])); req(o);
  C.confer(o, true, '', now, []);
  ok(C.technical(o), 'conferência válida não reconhecida');
  reject(() => C.confer(o, true, '', now, []), 'Conferência técnica já registrada para este pedido.', o);
  const { lineId, ...noId } = rows(o)[0];
  Q.saveDraft(o, draft([noId]));
  ok(!C.technical(o), 'conferência sobreviveu à troca de identidade');
  C.confer(o, true, '', now, []);
  ok(C.technical(o), 'nova conferência não foi aceita após a identidade mudar');
  return 'duplicada rejeitada; identidade nova conferida';
});
test('D24', 'Chave financeira incorpora a identidade e rejeita acerto obsoleto no confirm', () => {
  const o = make(); Q.saveDraft(o, draft([service()])); req(o); C.confer(o, true, '', now, []);
  const k1 = C.financialKey(o);
  const { lineId, ...noId } = rows(o)[0];
  Q.saveDraft(o, draft([noId])); C.confer(o, true, '', now, []);
  const k2 = C.financialKey(o);
  ok(k1 !== k2, 'chave financeira não mudou com a identidade');
  const acerto = { key: k1, gross: 0, discount: 0, refund: 0, confirm: true, financialConfirmed: true, settlementConfirmed: true };
  reject(() => C.confirm(o, { ...acerto }, now, day, []), 'A OS mudou. Reabra o acerto.', o);
  C.confirm(o, { ...acerto, key: k2 }, now, day, []);
  eq(o.status, 'Cancelado');
  return 'k1 != k2; chave antiga rejeitada; chave atual confirmou';
});
test('D25', 'Cobrança formalizada preserva o lineId e bloqueia edição posterior', () => {
  const o = make(); Q.saveDraft(o, draft([piece(), service()]));
  const [a, b] = rows(o);
  Q.publish(o, now); Q.respond(o, 1, { answer: 'Aprovado', name: 'Cliente Fictício', channel: 'presencial', date: day, confirm: true }, now);
  Q.formalize(o, day);
  eq(o.billing.items[0].lineId, a.lineId); eq(o.billing.items[1].lineId, b.lineId);
  const before = JSON.stringify(o.billing);
  reject(() => Q.saveDraft(o, draft([{ ...a, quantity: 1 }, b])), 'Edição de itens indisponível neste atendimento.', o);
  eq(JSON.stringify(o.billing), before);
  return 'cobrança com IDs, imutável';
});
test('D26', 'itemKey distingue OS, pedido, linha e valores', () => {
  const o = withLines(); const a = rows(o)[0];
  const base = key(o, a);
  eq(base, key(o, a));
  ok(base !== key(o, rows(o)[1]), 'chave não distingue duas linhas idênticas');
  ok(base !== C.itemKey(o, { ...a, quantity: 2 }), 'chave não distingue quantidade');
  ok(base !== C.itemKey(o, { ...a, unit: 999 }), 'chave não distingue valor');
  ok(base !== C.itemKey(o, { ...a, name: 'Outro nome' }), 'chave não distingue nome');
  const other = make(2); Q.saveDraft(other, draft([piece(), piece(), service()])); req(other);
  ok(base !== key(other, rows(other)[0]), 'chave não distingue OS');
  C.withdraw(o, 'Retirado', now); req(o);
  ok(base !== key(o, rows(o)[0]), 'chave não distingue pedido');
  return 'chave composicional';
});
test('D27', 'Retirada de serviço não movimenta estoque e preserva o financeiro', () => {
  const o = withLines(); const c = rows(o)[2];
  const before = JSON.stringify({ total: o.total, paid: o.paid, billing: o.billing || null, ledger: o.financeLedger || null });
  const e = C.remove(o, c.lineId, 1, 'notdone', '', now, [], key(o, c));
  eq(e.stockReturned, 0);
  eq(JSON.stringify({ total: o.total, paid: o.paid, billing: o.billing || null, ledger: o.financeLedger || null }), before);
  return 'sem movimento e sem cobrança';
});

/* ---------------- D28–D33: N6 selo, estoque e referência ---------------- */
test('D28', 'Selo normalizado detecta unidade antiga e substituta em qualquer cliente', () => {
  const orders = [
    { id: 1, client: 1, seal: ' A 1 ' },
    { id: 2, client: 2, seal: '', warranty: { operations: [{ type: 'troca', replacement: { seal: 'B 2' } }] } }
  ];
  eq(W.sealInUse('a1', orders), true); eq(W.sealInUse(' b2 ', orders), true);
  eq(W.sealInUse('C3', orders), false); eq(W.sealInUse('', orders), false);
  return 'normalização e linhagem';
});
test('D29', 'Selo não casa por substring nem por outro tipo de operação', () => {
  const orders = [{ id: 1, seal: 'ABC123' }, { id: 2, warranty: { operations: [{ type: 'reembolso', replacement: { seal: 'ZZZ' } }] } }];
  eq(W.sealInUse('ABC', orders), false);
  eq(W.sealInUse('abc123', orders), true);
  eq(W.sealInUse('ZZZ', orders), false, 'replacement de operação não-troca não deve contar');
  return 'sem falso positivo';
});
test('D30', 'Produto zerado é recusado no handler com motivo exato e sem baixa', () => {
  const o = make(); Q.saveDraft(o, draft([service()])); Q.publish(o, now); Q.respond(o, 1, { answer: 'Aprovado', name: 'Cliente', channel: 'presencial', date: day, confirm: true }, now);
  o.status = 'Finalizado'; o.conclusion = day; o.warrantyDays = 90;
  const root = o;
  const ret = { ...make(20), origin: root.id, unit: root.unit || root.id, status: 'Aberto', warranty: { events: [{ type: 'avaliar', solution: 'troca', coverage: 'coberto', id: 1 }], operations: [] } };
  const orders = [root, ret];
  const stock = [{ sku: 'P-001', quantity: 0 }];
  const before = JSON.stringify({ ops: ret.warranty.operations, stock });
  let err = null;
  try { W.swap(ret, orders, stock, { assessment: 1, source: 'estoque', sku: 'P-001', destination: 'retida_assistencia', type: 'Placa', brand: 'X', model: 'Y', seal: 'NOVA', reason: 'Motivo', confirm: true }, now, 'Administrador'); } catch (e) { err = e; }
  eq(err && err.message, 'Produto inexistente ou sem estoque disponível.');
  eq(JSON.stringify({ ops: ret.warranty.operations, stock }), before);
  return 'handler direto recusou zero';
});

test('D33', 'Chave financeira distingue pedidos distintos com os mesmos itens e rejeita a antiga', () => {
  const o = make(); Q.saveDraft(o, draft([service()])); req(o); C.confer(o, true, '', now, []);
  const k1 = C.financialKey(o);
  C.withdraw(o, 'Retirado', now); req(o); C.confer(o, true, '', now, []);
  const k2 = C.financialKey(o);
  ok(k1 !== k2, 'chave financeira não mudou com o novo pedido');
  const before = JSON.stringify(o);
  let err = null;
  try { C.confirm(o, { key: k1, gross: 0, discount: 0, refund: 0, confirm: true, financialConfirmed: true, settlementConfirmed: true }, now, day, []); } catch (e) { err = e; }
  eq(err && err.message, 'A OS mudou. Reabra o acerto.');
  eq(JSON.stringify(o), before);
  return 'k1 != k2 e chave do pedido anterior rejeitada';
});

test('D34', 'Chave financeira distingue duas OS com itens e pedido de mesmo id', () => {
  const mkOrder = id => { const o = make(id); Q.saveDraft(o, draft([service()])); req(o); C.confer(o, true, '', now, []); return o; };
  const a = mkOrder(1), b = mkOrder(2);
  eq(C.financialKey(a) === C.financialKey(b), false);
  const before = JSON.stringify(b);
  let err = null;
  try { C.confirm(b, { key: C.financialKey(a), gross: 0, discount: 0, refund: 0, confirm: true, financialConfirmed: true, settlementConfirmed: true }, now, day, []); } catch (e) { err = e; }
  eq(err && err.message, 'A OS mudou. Reabra o acerto.');
  eq(JSON.stringify(b), before);
  return 'chaves distintas entre OS; chave da outra OS rejeitada';
});
test('D35', 'Mudança de quantidade invalida a conferência técnica (retrato inclui quantidade)', () => {
  const o = make(); Q.saveDraft(o, draft([service('Diagnóstico', 2)])); req(o);
  C.confer(o, true, '', now, []);
  ok(C.technical(o));
  Q.saveDraft(o, draft([{ ...rows(o)[0], quantity: 3 }]));
  ok(!C.technical(o), 'conferência sobreviveu à mudança de quantidade');
  return 'quantidade no retrato técnico';
});

const summary = results.reduce((s, r) => { s[r.status] = (s[r.status] || 0) + 1; return s; }, {});
fs.writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), codeSha: process.env.CODE_SHA || '', incrementSha: process.env.INCREMENT_SHA || '', source: ASSETS, total: results.length, summary, results }, null, 2));
console.log(`\nTOTAL ${results.length} · PASS ${summary.PASS || 0} · FAIL ${summary.FAIL || 0}`);
if (summary.FAIL) process.exitCode = 1;
