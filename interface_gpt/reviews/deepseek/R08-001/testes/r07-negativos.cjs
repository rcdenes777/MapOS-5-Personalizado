'use strict';
/*
 * R07-001 — testes negativos isolados do domínio de garantia e do orçamento do retorno.
 * Mensagem exata, estado intacto e controle positivo. Projetado para mutation testing:
 *   node r07-negativos.cjs
 *   ASSETS_DIR=/scratch/assets RESULT_PATH=/scratch/resultado.json node r07-negativos.cjs
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ASSETS = process.env.ASSETS_DIR || path.resolve(__dirname, '../../../../assets');
const OUT = process.env.RESULT_PATH || path.join(__dirname, 'r07-negativos-resultados.json');
const FILES = ['quote.js', 'portal.js', 'finance.js', 'warranty.js'];

const src = FILES.map(f => fs.readFileSync(path.join(ASSETS, f), 'utf8')).join('\n');
const ctx = vm.createContext({ console });
vm.runInContext(src, ctx);
const Q = vm.runInContext('BancadaQuote', ctx);
const W = vm.runInContext('BancadaWarranty', ctx);
const P = vm.runInContext('BancadaPortal', ctx);

const now = '2026-11-25T12:00:00Z';
const day = '2026-11-25';
const TODAY = '2026-11-25';
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
function freeze(o) { Q.init(o); W.binding(o, [o]); return JSON.stringify(o); }
function intact(o, before) { eq(JSON.stringify(o), before, 'estado alterado pela rejeição'); }
function test(id, name, fn) {
  try {
    const detail = fn() || '';
    results.push({ id, name, status: 'PASS', detail: String(detail) });
    console.log(`PASS ${id} — ${name}${detail ? ' :: ' + String(detail).slice(0, 200) : ''}`);
  } catch (e) {
    results.push({ id, name, status: 'FAIL', detail: e.message });
    console.log(`FAIL ${id} — ${name} :: ${e.message}`);
  }
}
const clone = x => JSON.parse(JSON.stringify(x));
const origin = (extra = {}) => ({
  id: 1, client: 1, unit: 7, brand: 'LG', model: 'Inverter', type: 'Placa eletrônica', seal: 'S1', serial: 'N1', imei: '',
  status: 'Finalizado', entry: '2026-10-01', conclusion: '2026-10-05', warrantyDays: 90,
  total: 50000, paid: 20000, approval: 'Aprovado', report: 'Laudo original', items: 'Acessório antigo',
  condition: 'Usado', publicLink: { token: 'a'.repeat(64), expires: Date.now() + 86400000 },
  history: [{ time: now, text: 'Origem' }], ...extra
});
const input = { defect: 'Falha nova', items: '', condition: '', confirm: true };
function open(o = origin(), orders = null) {
  const all = orders || [o];
  return W.create(o, all, input, day);
}
const av = (extra = {}) => ({ coverage: 'coberto', solution: 'reparo_sem_cobranca', diagnosis: 'Falha do reparo', reason: 'Conferido', previous: 0, confirm: true, ...extra });
const newReturn = () => { const o = origin(); return { o, r: open(o) }; };

/* ---------------- Entrada ---------------- */
test('R07N-01', 'Retorno duplicado da mesma unidade é rejeitado', () => {
  const o = origin(), r = open(o), all = [o, r];
  const before = JSON.stringify(all);
  expectMessage(() => W.create(o, all, input, day), 'Já existe retorno em andamento para esta unidade.');
  eq(JSON.stringify(all), before, 'estado alterado');
});

test('R07N-02', 'Origem sem conclusão real é rejeitada', () => {
  const o = origin({ status: 'Aberto', conclusion: null });
  expectMessage(() => open(o), 'A origem precisa de conclusão real conhecida; não use a previsão para inferir cobertura.');
});

test('R07N-02b', 'Origem cancelada com data de conclusão não gera retorno', () => {
  const o = origin({ status: 'Cancelado', conclusion: '2026-10-05' });
  expectMessage(() => open(o), 'A origem precisa de conclusão real conhecida; não use a previsão para inferir cobertura.');
});

test('R07N-03', 'Unidade sem identificação é rejeitada', () => {
  const o = origin({ model: '' });
  expectMessage(() => open(o), 'Identifique a mesma unidade e o cliente na OS de origem antes de registrar retorno.');
});

test('R07N-04', 'Cliente divergente é rejeitado', () => {
  const o = origin(), r = open(o);
  r.status = 'Finalizado'; r.conclusion = day; r.client = 2;
  expectMessage(() => W.create(r, [o, r], input, day), 'Identifique a mesma unidade e o cliente na OS de origem antes de registrar retorno.');
});

test('R07N-05', 'Defeito vazio é rejeitado', () => {
  const o = origin();
  expectMessage(() => W.create(o, [o], { ...input, defect: '   ' }, day), 'Confira os textos obrigatórios e seus limites.');
});

test('R07N-06', 'Confirmação física é obrigatória', () => {
  const o = origin();
  expectMessage(() => W.create(o, [o], { ...input, confirm: false }, day), 'Confirme o recebimento físico e a abertura de outra OS.');
});

test('R07N-07', 'Unidade diferente não bloqueia retorno legítimo', () => {
  const o = origin(), other = origin({ id: 99, unit: 99, client: 2 });
  const r = W.create(o, [o, other], input, day);
  eq(r.unit, 7); eq(r.origin, 1);
});

test('R07N-07b', 'Mesmo cliente com unidade divergente é rejeitado', () => {
  const o = origin(), r = open(o);
  r.status = 'Finalizado'; r.conclusion = day; r.unit = 99;
  expectMessage(() => W.create(r, [o, r], input, day), 'Identifique a mesma unidade e o cliente na OS de origem antes de registrar retorno.');
});

test('R07N-07c', 'Origem de retorno precisa estar finalizada no momento do novo retorno', () => {
  const o = origin(), r = open(o);
  r.status = 'Em Andamento';
  expectMessage(() => W.create(r, [o, r], input, day), 'A origem precisa de conclusão real conhecida; não use a previsão para inferir cobertura.');
});

test('R07N-08', 'Retorno não copia laudo, itens, financeiro, token nem orçamento', () => {
  const o = origin(), r = open(o);
  eq(r.total, 0); eq(r.paid, 0); eq(r.report, undefined); eq(r.publicLink, undefined); eq(r.quote, undefined);
  eq(r.items, ''); eq(r.warrantyDays, 0); eq(r.coverage, 'Em avaliação'); eq(r.entry, day);
});

test('R07N-09', 'Prazo desconhecido não é inventado', () => {
  const o = origin(); delete o.warrantyDays;
  const r = open(o);
  eq(r.warranty.days, null, 'days'); eq(r.warranty.end, null, 'end');
});

test('R07N-10', 'Prazo vencido não presume cobertura', () => {
  const o = origin({ conclusion: '2020-01-01' });
  const r = open(o);
  eq(r.warranty.end, '2020-03-31'); eq(r.coverage, 'Em avaliação');
});

/* ---------------- Avaliação ---------------- */
test('R07N-11', 'Cobertura pendente não aceita solução', () => {
  const { o, r } = newReturn(), all = [o, r], before = JSON.stringify(all);
  expectMessage(() => W.assess(r, all, av({ coverage: 'avaliacao' }), now, 'Administrador'), 'Conclua a avaliação de cobertura antes de escolher a solução.');
  eq(JSON.stringify(all), before, 'estado alterado');
});

test('R07N-12', 'Diagnóstico é obrigatório com cobertura concluída', () => {
  const { o, r } = newReturn(), all = [o, r];
  expectMessage(() => W.assess(r, all, av({ diagnosis: '' }), now, 'Administrador'), 'Confira os textos obrigatórios e seus limites.');
});

test('R07N-13', 'Justificativa é obrigatória', () => {
  const { o, r } = newReturn(), all = [o, r];
  expectMessage(() => W.assess(r, all, av({ reason: ' ' }), now, 'Administrador'), 'Confira os textos obrigatórios e seus limites.');
});

test('R07N-14', 'Avaliação concorrente obsoleta é recusada', () => {
  const { o, r } = newReturn(), all = [o, r];
  W.assess(r, all, av(), now, 'Administrador');
  const before = JSON.stringify(all);
  expectMessage(() => W.assess(r, all, av({ previous: 0 }), now, 'Administrador'), 'Outra avaliação foi registrada. Recarregue antes de decidir.');
  eq(JSON.stringify(all), before, 'estado alterado');
});

test('R07N-15', 'Cobertura ou solução fora do domínio é recusada', () => {
  const { o, r } = newReturn(), all = [o, r];
  expectMessage(() => W.assess(r, all, av({ coverage: 'talvez' }), now, 'Administrador'), 'Confira cobertura e solução.');
  expectMessage(() => W.assess(r, all, av({ solution: 'misteriosa' }), now, 'Administrador'), 'Confira cobertura e solução.');
});

test('R07N-16', 'Solução já executada impede revisão da avaliação', () => {
  const { o, r } = newReturn(), all = [o, r];
  W.assess(r, all, av(), now, 'Administrador');
  r.warranty.operations.push({ type: 'troca', when: now });
  expectMessage(() => W.assess(r, all, av({ previous: 1 }), now, 'Administrador'), 'Solução já executada. Preserve a avaliação; corrija a operação antes de rever a decisão.');
});

test('R07N-17', 'Avaliação não altera andamento, cobrança, entrega nem origem', () => {
  const { o, r } = newReturn(), all = [o, r], beforeOrigin = JSON.stringify(o);
  W.assess(r, all, av(), now, 'Administrador');
  eq(r.status, 'Aberto'); eq(r.total, 0); eq(r.paid, 0); eq(r.delivery, null); eq(JSON.stringify(o), beforeOrigin);
  eq(r.warranty.events.length, 1); eq(r.coverage, 'Coberto');
  W.assess(r, all, av({ previous: 1, coverage: 'nao_coberto', solution: 'novo_orcamento', diagnosis: 'Outro' }), now, 'Administrador');
  eq(r.warranty.events.length, 2); eq(r.warranty.events[0].diagnosis, 'Falha do reparo', 'histórico imutável');
});

test('R07N-18', 'Retorno cancelado não aceita avaliação', () => {
  const { o, r } = newReturn(), all = [o, r];
  r.status = 'Cancelado';
  expectMessage(() => W.assess(r, all, av(), now, 'Administrador'), 'Retorno inexistente ou cancelado.');
});

/* ---------------- Transição ---------------- */
test('R07N-19', 'Origem com derivado não reabre mesmo sem entrega', () => {
  const o = origin({ delivery: null }), r = open(o), all = [o, r];
  expectMessage(() => W.transition(o, all, 'Em Andamento'), 'Esta OS já originou retorno. Preserve o atendimento encerrado e use a nova OS.');
});

test('R07N-19b', 'Origem com retorno legado (sem warranty) não reabre', () => {
  const o = origin();
  const legacy = { id: 2, client: 1, unit: 7, brand: 'LG', model: 'Inverter', status: 'Aberto', origin: 1, entry: day, conclusion: null, total: 0, paid: 0 };
  expectMessage(() => W.transition(o, [o, legacy], 'Em Andamento'), 'Esta OS já originou retorno. Preserve o atendimento encerrado e use a nova OS.');
});

test('R07N-19c', 'Anterior com derivado por previous não reabre', () => {
  const o = origin(), r = open(o);
  r.status = 'Finalizado'; r.conclusion = day;
  const child = W.create(r, [o, r], input, day);
  expectMessage(() => W.transition(r, [o, r, child], 'Em Andamento'), 'Esta OS já originou retorno. Preserve o atendimento encerrado e use a nova OS.');
});

test('R07N-19d', 'Irmão ativo da mesma unidade impede reabrir retorno finalizado', () => {
  const o = origin(), r = open(o);
  r.status = 'Finalizado'; r.conclusion = day;
  const sibling = { id: 9, client: 1, unit: 7, brand: 'LG', model: 'Inverter', status: 'Aberto', origin: 1, entry: day, conclusion: null, total: 0, paid: 0 };
  expectMessage(() => W.transition(r, [o, r, sibling], 'Em Andamento'), 'Esta OS já originou retorno. Preserve o atendimento encerrado e use a nova OS.');
});

test('R07N-20', 'Troca pendente bloqueia conclusão', () => {
  const { o, r } = newReturn(), all = [o, r];
  W.assess(r, all, av({ solution: 'troca' }), now, 'Administrador');
  const before = JSON.stringify(all);
  expectMessage(() => W.transition(r, all, 'Finalizado'), 'Execute a solução de garantia escolhida antes de concluir o retorno.');
  eq(JSON.stringify(all), before, 'estado alterado');
});

test('R07N-21', 'Devolução pendente bloqueia conclusão', () => {
  const { o, r } = newReturn(), all = [o, r];
  W.assess(r, all, av({ solution: 'devolucao_valor' }), now, 'Administrador');
  expectMessage(() => W.transition(r, all, 'Finalizado'), 'Execute a solução de garantia escolhida antes de concluir o retorno.');
});

test('R07N-22', 'Reparo sem cobrança pode concluir', () => {
  const { o, r } = newReturn(), all = [o, r];
  W.assess(r, all, av(), now, 'Administrador');
  W.transition(r, all, 'Finalizado');
  r.status = 'Finalizado'; r.conclusion = day; r.warrantyDays = 0;
  eq(r.status, 'Finalizado'); eq(r.warrantyDays, 0);
});

test('R07N-23', 'Troca executada libera conclusão', () => {
  const { o, r } = newReturn(), all = [o, r];
  W.assess(r, all, av({ solution: 'troca' }), now, 'Administrador');
  r.warranty.operations.push({ type: 'troca', when: now });
  W.transition(r, all, 'Finalizado');
  r.status = 'Finalizado';
  eq(r.status, 'Finalizado');
});

/* ---------------- Custos ---------------- */
test('R07N-24', 'Custo zero e tempo zero são rejeitados', () => {
  const { o, r } = newReturn(), all = [o, r], before = JSON.stringify(all);
  expectMessage(() => W.cost(r, all, { amount: 0, minutes: 0, reason: 'vazio', confirm: true }, now, 'Administrador'), 'Informe custo interno ou tempo de trabalho válido.');
  eq(JSON.stringify(all), before, 'estado alterado');
});

test('R07N-25', 'Custo acima do limite é rejeitado', () => {
  const { o, r } = newReturn(), all = [o, r];
  expectMessage(() => W.cost(r, all, { amount: 1000000000, minutes: 1, reason: 'limite', confirm: true }, now, 'Administrador'), 'Informe custo interno ou tempo de trabalho válido.');
  expectMessage(() => W.cost(r, all, { amount: 1, minutes: 100001, reason: 'limite', confirm: true }, now, 'Administrador'), 'Informe custo interno ou tempo de trabalho válido.');
});

test('R07N-26', 'Custo fracionário, negativo ou sem confirmação é rejeitado', () => {
  const { o, r } = newReturn(), all = [o, r];
  expectMessage(() => W.cost(r, all, { amount: 1.5, minutes: 1, reason: 'x', confirm: true }, now, 'Administrador'), 'Informe custo interno ou tempo de trabalho válido.');
  expectMessage(() => W.cost(r, all, { amount: -1, minutes: 1, reason: 'x', confirm: true }, now, 'Administrador'), 'Informe custo interno ou tempo de trabalho válido.');
  expectMessage(() => W.cost(r, all, { amount: 1, minutes: 1, reason: 'x', confirm: false }, now, 'Administrador'), 'Confira e confirme o custo interno.');
});

test('R07N-27', 'Correção de custo inexistente é rejeitada', () => {
  const { o, r } = newReturn(), all = [o, r];
  expectMessage(() => W.correctCost(r, all, { reference: 9, reason: 'x', confirm: true }, now, 'Administrador'), 'Custo inexistente ou já corrigido.');
});

test('R07N-28', 'Segunda correção do mesmo custo é rejeitada', () => {
  const { o, r } = newReturn(), all = [o, r];
  W.cost(r, all, { amount: 2550, minutes: 30, reason: 'bancada', confirm: true }, now, 'Administrador');
  W.correctCost(r, all, { reference: 1, reason: 'erro', confirm: true }, now, 'Administrador');
  const before = JSON.stringify(all);
  expectMessage(() => W.correctCost(r, all, { reference: 1, reason: 'de novo', confirm: true }, now, 'Administrador'), 'Custo inexistente ou já corrigido.');
  eq(JSON.stringify(all), before, 'estado alterado');
});

test('R07N-29', 'Correção preserva o registro original e zera o líquido', () => {
  const { o, r } = newReturn(), all = [o, r];
  W.cost(r, all, { amount: 2550, minutes: 30, reason: 'bancada', confirm: true }, now, 'Administrador');
  W.correctCost(r, all, { reference: 1, reason: 'erro', confirm: true }, now, 'Administrador');
  const c = W.costs(r);
  eq(c.amount, 0); eq(c.minutes, 0);
  eq(r.warranty.events[0].amount, 2550); eq(r.warranty.events[0].minutes, 30);
  eq(r.total, 0); eq(r.paid, 0); eq(r.financeLedger, undefined);
});

/* ---------------- Orçamento do retorno ---------------- */
function returnWithDecision(solution = 'novo_orcamento') {
  const o = origin(), r = open(o), all = [o, r];
  W.assess(r, all, av({ coverage: 'nao_coberto', solution }), now, 'Administrador');
  return { o, r, all };
}
const draft = (unit = 5000, discount = 0) => ({ items: [{ type: 'Serviço', name: 'Reparo novo', quantity: 1, unit }], discount, terms: {} });

test('R07N-30', 'Rascunho sem decisão de novo orçamento é rejeitado', () => {
  const o = origin(), r = open(o), all = [o, r];
  expectMessage(() => Q.saveDraft(r, draft()), 'Edição de itens indisponível neste atendimento.');
});

test('R07N-31', 'Publicação sem decisão de novo orçamento é rejeitada', () => {
  const o = origin(), r = open(o), all = [o, r];
  expectMessage(() => Q.publish(r, now), 'Publicação indisponível neste atendimento.');
});

test('R07N-32', 'Faturamento sem versão vigente aprovada é rejeitado', () => {
  const { o, r, all } = returnWithDecision();
  Q.saveDraft(r, draft());
  Q.publish(r, now);
  const before = JSON.stringify(all);
  expectMessage(() => Q.formalize(r, day), 'Fature o retorno somente com novo orçamento vigente, aprovado e sem alterações nos itens ou valores.');
  eq(JSON.stringify(all), before, 'estado alterado');
});

test('R07N-32b', 'Faturamento com versão vigente recusada é rejeitado', () => {
  const { o, r, all } = returnWithDecision();
  Q.saveDraft(r, draft(5000));
  Q.publish(r, now);
  Q.respond(r, 1, { answer: 'Recusado', name: 'Cliente', channel: 'presencial', date: day, confirm: true }, now, true, day);
  expectMessage(() => Q.formalize(r, day), 'Fature o retorno somente com novo orçamento vigente, aprovado e sem alterações nos itens ou valores.');
});

test('R07N-33', 'Faturamento com itens alterados após aprovação é rejeitado', () => {
  const { o, r, all } = returnWithDecision();
  Q.saveDraft(r, draft(5000));
  Q.publish(r, now);
  Q.respond(r, 1, { answer: 'Aprovado', name: 'Cliente', channel: 'presencial', date: day, confirm: true }, now, true, day);
  Q.saveDraft(r, draft(7000));
  expectMessage(() => Q.formalize(r, day), 'Fature o retorno somente com novo orçamento vigente, aprovado e sem alterações nos itens ou valores.');
});

test('R07N-34', 'Faturamento com desconto alterado após aprovação é rejeitado', () => {
  const { o, r, all } = returnWithDecision();
  Q.saveDraft(r, draft(5000));
  Q.publish(r, now);
  Q.respond(r, 1, { answer: 'Aprovado', name: 'Cliente', channel: 'presencial', date: day, confirm: true }, now, true, day);
  Q.saveDraft(r, draft(5000, 100));
  expectMessage(() => Q.formalize(r, day), 'Fature o retorno somente com novo orçamento vigente, aprovado e sem alterações nos itens ou valores.');
});

test('R07N-35', 'Faturamento com publicação retirada é rejeitado', () => {
  const { o, r, all } = returnWithDecision();
  Q.saveDraft(r, draft());
  Q.publish(r, now);
  Q.respond(r, 1, { answer: 'Aprovado', name: 'Cliente', channel: 'presencial', date: day, confirm: true }, now, true, day);
  Q.withdraw(r, 1);
  expectMessage(() => Q.formalize(r, day), 'Fature o retorno somente com novo orçamento vigente, aprovado e sem alterações nos itens ou valores.');
});

test('R07N-36', 'Faturamento com itens e valores idênticos é aceito e não movimenta a origem', () => {
  const { o, r, all } = returnWithDecision();
  Q.saveDraft(r, draft(5000));
  Q.publish(r, now);
  Q.respond(r, 1, { answer: 'Aprovado', name: 'Cliente', channel: 'presencial', date: day, confirm: true }, now, true, day);
  eq(r.total, 0, 'antes');
  eq(Q.formalize(r, day), 5000);
  eq(r.paid, 0); eq(o.total, 50000); eq(o.paid, 20000); eq(r.financeLedger, undefined);
});

test('R07N-37', 'Segundo faturamento do mesmo retorno é rejeitado', () => {
  const { o, r, all } = returnWithDecision();
  Q.saveDraft(r, draft(5000));
  Q.publish(r, now);
  Q.respond(r, 1, { answer: 'Aprovado', name: 'Cliente', channel: 'presencial', date: day, confirm: true }, now, true, day);
  Q.formalize(r, day);
  expectMessage(() => Q.formalize(r, day), 'Confira os itens e o vencimento da cobrança.');
});

test('R07N-38', 'Publicação com equipamento entregue é rejeitada', () => {
  const { o, r, all } = returnWithDecision();
  Q.saveDraft(r, draft());
  r.delivery = { date: day, receiver: 'Cliente', items: 'Peça', third: false };
  expectMessage(() => Q.publish(r, now), 'Publicação indisponível neste atendimento.');
});

test('R07N-39', 'Edição após entrega é rejeitada', () => {
  const { o, r, all } = returnWithDecision();
  r.delivery = { date: day, receiver: 'Cliente', items: 'Peça', third: false };
  eq(Q.editable(r), false);
  expectMessage(() => Q.saveDraft(r, draft()), 'Edição de itens indisponível neste atendimento.');
});

test('R07N-40', 'Avaliação nova sem novo orçamento fecha a edição', () => {
  const { o, r, all } = returnWithDecision();
  Q.saveDraft(r, draft());
  Q.publish(r, now);
  W.assess(r, all, av({ previous: 1, coverage: 'coberto', solution: 'reparo_sem_cobranca' }), now, 'Administrador');
  eq(Q.editable(r), false);
  expectMessage(() => Q.saveDraft(r, draft()), 'Edição de itens indisponível neste atendimento.');
});

test('R07N-41', 'Projeção pública não expõe garantia nem avaliação privada', () => {
  const { o, r, all } = returnWithDecision();
  W.cost(r, all, { amount: 50, minutes: 1, reason: 'CUSTO PRIVADO', confirm: true }, now, 'Administrador');
  Q.saveDraft(r, draft(5000));
  Q.publish(r, now);
  const p = JSON.stringify(P.projection(r));
  ok(!p.includes('"origin"') && !p.includes('"coverage"') && !p.includes('"warranty":{') && !p.includes('"events"'), 'estrutura privada');
  ok(!p.includes('CUSTO PRIVADO') && !p.includes('Falha do reparo'), 'texto privado');
});

test('R07N-42', 'Valor negativo ou valor zero no orçamento é rejeitado', () => {
  const { o, r, all } = returnWithDecision();
  expectMessage(() => Q.saveDraft(r, { items: [{ type: 'Serviço', name: 'X', quantity: 1, unit: -1 }], discount: 0, terms: {} }), 'Quantidade ou valor inválido.');
  expectMessage(() => Q.saveDraft(r, { items: [{ type: 'Serviço', name: 'X', quantity: 1, unit: 100 }], discount: 500, terms: {} }), 'Confira o total e o desconto.');
});

test('R07N-44', 'Último retorno finalizado da unidade é o de maior id', () => {
  const o = origin();
  const a = { ...origin({ id: 2, unit: 7, client: 1 }), origin: 1, status: 'Finalizado', conclusion: day, warranty: { root: 1, previous: 1, unit: 7, client: 1, conclusion: '2026-10-05', days: 90, end: '2027-01-03', events: [], operations: [] } };
  const b = { ...origin({ id: 3, unit: 7, client: 1 }), origin: 1, status: 'Finalizado', conclusion: day, warranty: { root: 1, previous: 2, unit: 7, client: 1, conclusion: '2026-10-05', days: 90, end: '2027-01-03', events: [], operations: [] } };
  eq(W.lastFinalized(o, [o, a, b])?.id, 3);
});

test('R07N-46', 'Último finalizado considera o próprio retorno quando ele é o mais recente', () => {
  const o = origin();
  const a = { ...origin({ id: 2, unit: 7, client: 1 }), origin: 1, status: 'Finalizado', conclusion: day, warranty: { root: 1, previous: 1, unit: 7, client: 1, conclusion: '2026-10-05', days: 90, end: '2027-01-03', events: [], operations: [] } };
  eq(W.lastFinalized(a, [o, a])?.id, 2);
});

test('R07N-45', 'Retorno ativo não conta como último finalizado', () => {
  const o = origin();
  const active = { ...origin({ id: 2, unit: 7, client: 1 }), origin: 1, status: 'Aberto', conclusion: null, warranty: { root: 1, previous: 1, unit: 7, client: 1, conclusion: '2026-10-05', days: 90, end: '2027-01-03', events: [], operations: [] } };
  eq(W.lastFinalized(o, [o, active]), null);
});

test('R07N-47', 'Custo e tempo exatamente no teto são aceitos', () => {
  const { o, r } = newReturn(), all = [o, r];
  W.cost(r, all, { amount: 999999999, minutes: 100000, reason: 'teto exato', confirm: true }, now, 'Administrador');
  const c = W.costs(r);
  eq(c.amount, 999999999); eq(c.minutes, 100000);
});

test('R07N-48', 'Retorno cancelado não é escolhido como último finalizado', () => {
  const o = origin();
  const fin = { ...origin({ id: 2, unit: 7, client: 1 }), origin: 1, status: 'Finalizado', conclusion: day, warranty: { root: 1, previous: 1, unit: 7, client: 1, conclusion: '2026-10-05', days: 90, end: '2027-01-03', events: [], operations: [] } };
  const canc = { ...origin({ id: 3, unit: 7, client: 1 }), origin: 1, status: 'Cancelado', conclusion: null, warranty: { root: 1, previous: 2, unit: 7, client: 1, conclusion: '2026-10-05', days: 90, end: '2027-01-03', events: [], operations: [] } };
  eq(W.lastFinalized(o, [o, fin, canc])?.id, 2);
});

const summary = results.reduce((s, r) => { s[r.status] = (s[r.status] || 0) + 1; return s; }, {});
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), codeSha: process.env.CODE_SHA || '', assetsDir: ASSETS, total: results.length, summary, results }, null, 2));
console.log(`TOTAL ${results.length} · PASS ${summary.PASS || 0} · FAIL ${summary.FAIL || 0}`);
if ((summary.FAIL || 0) > 0) process.exitCode = 1;
