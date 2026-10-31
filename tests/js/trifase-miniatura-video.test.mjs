import { test } from 'node:test';
import assert from 'node:assert/strict';
import iniciar from '../../assets/js/modules/trifase/miniatura-video.js';

function cenario(href = '/index.php/trifase/video/1/7', observar = true) {
    const eventos = {};
    const video = { hidden: true, duration: 3, readyState: 0, addEventListener(k, fn) { eventos[k] = fn; }, load() { this.carregado = true; } };
    const alternativa = { hidden: false };
    let notificar, desconectado = false;
    const raiz = { baseURI: 'http://mapos.test/index.php/os/1', defaultView: observar ? { IntersectionObserver: class {
        constructor(fn) { notificar = fn; } observe() {} disconnect() { desconectado = true; }
    } } : {} };
    const cartao = { isConnected: true, getAttribute: () => href, querySelector: s => s === 'video' ? video : alternativa };
    iniciar(cartao, raiz);
    return { video, alternativa, cartao, emitir: k => eventos[k](), visivel: () => notificar([{ isIntersecting: true }]), desconectado: () => desconectado };
}

test('miniatura: só busca vídeo visível, pausado e sem controles; mostra um quadro', () => {
    const c = cenario();
    assert.equal(c.video.src, undefined);
    c.visivel();
    assert.equal(c.video.src, 'http://mapos.test/index.php/trifase/video/1/7');
    assert.equal(c.video.muted, true);
    assert.equal(c.video.autoplay, undefined);
    assert.equal(c.desconectado(), true);
    c.emitir('loadedmetadata');
    assert.equal(c.video.currentTime, 0.1);
    c.video.readyState = 2; c.emitir('seeked');
    assert.equal(c.video.hidden, false);
    assert.equal(c.alternativa.hidden, true);
    c.emitir('error');
    assert.equal(c.video.hidden, true);
    assert.equal(c.alternativa.hidden, false);
});

test('miniatura: não busca URL externa ou cartão removido; fallback sem observador', () => {
    const c = cenario('https://externo.test/video');
    assert.equal(c.video.src, undefined);
    const removido = cenario(); removido.cartao.isConnected = false; removido.visivel();
    assert.equal(removido.video.src, undefined);
    const simples = cenario('/video/1', false);
    assert.equal(simples.video.carregado, true);
    simples.video.duration = 0; simples.emitir('loadedmetadata');
    assert.equal(simples.video.currentTime, undefined);
});
