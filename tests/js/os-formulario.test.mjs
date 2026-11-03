import test from 'node:test';
import assert from 'node:assert/strict';
import iniciar, { urlUnidadesCliente } from '../../assets/js/modules/os/formulario.js';

globalThis.KeyboardEvent = class extends Event {
    constructor(type, options) { super(type, options); this.key = options.key; }
};
class Campo extends EventTarget {
    constructor(value = '') { super(); this.value = value; this.disabled = false; this.dataset = {}; }
    setCustomValidity(value) { this.validityMessage = value; }
}
function tela({ cliente = '', unidade = '', descricao = '', cadastro = false } = {}) {
    const c = new Campo(cliente), u = new Campo(unidade), campo = new Campo(unidade ? 'LG · INV' : '');
    const d = new Campo(descricao), entrada = new Campo(), confirmada = new Campo(), limpar = new Campo();
    const busca = new Campo();
    busca.dataset.unidadeClienteUrl = 'http://localhost/index.php/trifase_equipamentos/unidadesCliente';
    busca.querySelector = (s) => s === 'input[type=hidden]' ? u : campo;
    const itens = {
        '[data-nova-os-unidade-busca]': busca, '[data-nova-os-unidade-entrada]': entrada,
        '[data-nova-os-unidade-confirmada]': confirmada, '[data-nova-os-unidade-limpar]': limpar,
    };
    const secao = { querySelector: (s) => itens[s] };
    const botao = new Campo(), origem = new Campo(), nome = new Campo('Cliente digitado');
    origem.dataset.autocompleteNovoModal = 'cliente-rapido';
    origem.querySelector = () => nome;
    botao.closest = () => origem;
    let aberturas = 0;
    globalThis.document = { getElementById: () => ({ showModal: () => aberturas++ }) };
    const raiz = {
        querySelectorAll: () => [], // O autocomplete genérico possui sua própria suíte.
        querySelector: (s) => ({ '[data-nova-os-unidade]': secao, '[name=clientes_id]': c,
            '[name=descricaoProduto]': d, '[data-nova-os-cliente]': cadastro ? botao : null })[s],
    };
    iniciar(raiz);
    return { c, u, campo, d, entrada, confirmada, limpar, busca, botao, origem, aberturas: () => aberturas };
}
function escolher(t, id = '42', valor = 'LG · INV') {
    t.u.value = id;
    t.u.dispatchEvent(new Event('change'));
    t.busca.dispatchEvent(new CustomEvent('autocomplete-escolha', { detail: { item: { id, valor, detalhe: 'Selo T-42 · Série privada' } } }));
}

test('unidades: só envia id de cliente positivo, nunca transforma texto em query adicional', () => {
    assert.equal(urlUnidadesCliente('/unidades', '7'), '/unidades?cliente_id=7');
    for (const id of ['', '0', '-1', 'abc', '7&cliente_id=8']) assert.equal(urlUnidadesCliente('/unidades', id), '/unidades?cliente_id=');
});
test('unidades: só habilita a busca após escolher cliente e entrada após escolher unidade', () => {
    const t = tela();
    assert.equal(t.campo.disabled, true);
    assert.equal(t.entrada.disabled, true);
    t.c.value = '7'; t.c.dispatchEvent(new Event('change'));
    assert.equal(t.campo.disabled, false);
    assert.equal(t.entrada.disabled, true);
    assert.match(t.busca.dataset.autocomplete, /cliente_id=7$/);
    escolher(t);
    assert.equal(t.entrada.disabled, false);
});
test('unidades: descrição automática só recebe marca/modelo, sem selo nem série', () => {
    const t = tela({ cliente: '7' });
    escolher(t);
    assert.equal(t.d.value, 'LG · INV');
    assert.equal(t.confirmada.textContent, 'Selo T-42 · Série privada');
});
test('unidades: trocar cliente limpa id/opções mas preserva descrição digitada manualmente', () => {
    const t = tela({ cliente: '7', descricao: 'Meu relato já preenchido' });
    escolher(t);
    t.c.value = '8'; t.c.dispatchEvent(new Event('change'));
    assert.equal(t.u.value, '');
    assert.equal(t.campo.value, '');
    assert.equal(t.entrada.disabled, true);
    assert.equal(t.d.value, 'Meu relato já preenchido');
    assert.match(t.busca.dataset.autocomplete, /cliente_id=8$/);
});
test('unidades: limpar remove só descrição automática; nova escolha pode atualizá-la', () => {
    const t = tela({ cliente: '7' });
    escolher(t);
    t.limpar.dispatchEvent(new Event('click'));
    assert.equal(t.d.value, '');
    assert.equal(t.u.value, '');
    escolher(t, '43', 'Samsung · INV');
    assert.equal(t.d.value, 'Samsung · INV');
    t.d.value = 'Descrição revisada';
    t.limpar.dispatchEvent(new Event('click'));
    assert.equal(t.d.value, 'Descrição revisada');
});
test('unidades: link GET antigo inicia sem perder unidade selecionada e dados novos', () => {
    const t = tela({ cliente: '7', unidade: '42', descricao: 'LG · INV' });
    assert.equal(t.u.value, '42');
    assert.equal(t.entrada.disabled, false);
    assert.equal(t.d.value, 'LG · INV');
});
test('cliente: texto digitado sem cliente escolhido é reaproveitado no cadastro', () => {
    const t = tela({ cadastro: true });
    let texto;
    t.origem.addEventListener('autocomplete-novo', (e) => { texto = e.detail.texto; });
    t.botao.dispatchEvent(new Event('click'));
    assert.equal(texto, 'Cliente digitado');
});
test('cliente: botão aciona o mesmo modal e origem do autocomplete sem resetar OS', () => {
    const t = tela({ cliente: '7', descricao: 'Não liga', cadastro: true });
    let texto;
    t.origem.addEventListener('autocomplete-novo', (e) => { texto = e.detail.texto; });
    t.botao.dispatchEvent(new Event('click'));
    assert.equal(texto, '', 'Cliente já escolhido não vira nome de um cadastro duplicado.');
    assert.equal(t.aberturas(), 1);
    assert.equal(t.d.value, 'Não liga');
    assert.equal(t.c.value, '7');
});
