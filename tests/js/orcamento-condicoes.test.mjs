import test from 'node:test';
import assert from 'node:assert/strict';
import { textosCondicoes } from '../../assets/js/modules/trifase/orcamento-condicoes.js';

test('prévia combina pagamento, espera da peça e termo sem HTML', () => {
    const c = { pagamento_vista: true, pagamento_cartao: true, pagamento_parcelas: '3', prazo_dias: '5', prazo_importar: true, prazo_aguardar: true, garantia_dias: '90', termo_garantia_id: '7' };
    assert.deepEqual(textosCondicoes(c, { 7: 'Cobre o serviço executado.' }), {
        pagamento: 'À vista.\nParcelado no cartão de crédito em até 3 vezes.',
        prazo: 'Execução em até 5 dias úteis após a chegada da peça.\nNecessário importar peça.\nAguardando chegada da peça.',
        garantia: '90 dias.\nCobre o serviço executado.',
    });
    assert.equal(textosCondicoes({ ...c, pagamento_cartao: false, prazo_dias: '1', prazo_importar: false, prazo_aguardar: false }).prazo, 'Execução em até 1 dia útil.');
});
