import test from 'node:test';
import assert from 'node:assert/strict';
import { urlDaListagem, iniciarBusca } from '../../assets/js/lib/busca-listagem.js';

test('busca mantém os filtros e consulta o início do conjunto completo', () => {
    const url = urlDaListagem('/index.php/financeiro/ordens', new URLSearchParams({ pesquisa: 'São & Cia', status: 'Aberto', saldo: 'pendente', inicio: '20' }), 'http://localhost/');
    assert.equal(url.searchParams.get('pesquisa'), 'São & Cia');
    assert.equal(url.searchParams.get('status'), 'Aberto');
    assert.equal(url.searchParams.get('saldo'), 'pendente');
    assert.equal(url.searchParams.has('inicio'), false);
});

test('limpar o campo busca lista sem termo; formulários de gravação ficam fora', () => {
    assert.equal(urlDaListagem('/servicos', new URLSearchParams({ pesquisa: '' }), 'http://localhost/').searchParams.get('pesquisa'), '');
    const form = { querySelector: () => ({}), closest: () => ({}), method: 'post' };
    assert.equal(iniciarBusca(form, { doc: {}, navegador: {} }), undefined);
});
