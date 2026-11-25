import test from 'node:test';
import assert from 'node:assert/strict';
import iniciar from '../../assets/js/modules/trifase/nova-unidade.js';
globalThis.KeyboardEvent = class extends Event { constructor(type, options) { super(type, options); this.key = options.key; } };
class Campo extends EventTarget {
    constructor(value = '') { super(); this.value = value; }
    setCustomValidity(value) { this.message = value; }
    focus() { this.focused = true; }
}
function tela() {
    const campos = Object.fromEntries(['modelo_id', 'marca', 'modelo', 'tipo', 'selo', 'serie', 'imei'].map((n) => [n, new Campo()]));
    const busca = new Campo(), limpar = new Campo(), input = new Campo();
    busca.querySelector = () => input;
    const descricoes = [];
    iniciar({ querySelector: (s) => s === '[data-nova-os-modelo-busca]' ? busca : s === '[data-nova-os-modelo-limpar]' ? limpar : campos[s.match(/equipamento_(.+)\]/)[1]] }, (v) => descricoes.push(v));
    return { campos, busca, limpar, descricoes, input };
}
test('nova unidade: selo, série e IMEI são opcionais na entrada', () => {
    const { campos: c } = tela();
    assert.ok(!c.selo.message);
    c.serie.value = 'SERIE PRIVADA'; c.serie.dispatchEvent(new Event('input'));
    assert.ok(!c.selo.message);
    c.serie.value = ''; c.imei.value = 'IMEI PRIVADO'; c.imei.dispatchEvent(new Event('input'));
    assert.ok(!c.selo.message);
});
test('nova unidade: catálogo permanece editável, edição desanexa e limpar preserva os valores', () => {
    const t = tela(), c = t.campos;
    c.modelo_id.value = '4'; c.selo.value = 'SEGREDO';
    t.busca.dispatchEvent(new CustomEvent('autocomplete-escolha', { detail: { dados: { marca: 'LG', modelo: 'INV', tipo: 'placa' } } }));
    assert.ok(!c.marca.readOnly); assert.ok(!c.tipo.disabled);
    assert.equal(t.descricoes.at(-1), 'LG · INV');
    c.modelo.value = 'INV-13';
    c.modelo.dispatchEvent(new Event('input'));
    assert.equal(c.modelo_id.value, '');
    t.limpar.dispatchEvent(new Event('click'));
    assert.equal(c.modelo_id.value, ''); assert.equal(c.marca.value, 'LG'); assert.equal(c.modelo.value, 'INV-13');
    assert.equal(c.selo.value, 'SEGREDO'); assert.equal(c.marca.focused, true);
});
