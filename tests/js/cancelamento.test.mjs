import test from 'node:test';
import assert from 'node:assert/strict';
import { removerItem } from '../../assets/js/modules/trifase/cancelamento.js';

test('remoção usa os controles existentes e propaga falhas sem confirmar sucesso', async () => {
    const dados = new FormData();
    dados.set('idOs', '1'); dados.set('idItem', '7');
    assert.deepEqual(await removerItem('/os/excluirProduto', dados, async (url, corpo) => {
        assert.equal(url, '/os/excluirProduto'); assert.equal(corpo.get('idItem'), '7');
        return { result: true };
    }), { result: true });
    await assert.rejects(removerItem('/os/excluirProduto', dados, async () => ({ result: false, message: 'OS faturada' })), /OS faturada/);
    await assert.rejects(removerItem('/os/excluirProduto', dados, async () => { throw new Error('Sem permissão'); }), /Sem permissão/);
});
