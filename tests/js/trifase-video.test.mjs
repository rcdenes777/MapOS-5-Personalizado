import { test } from 'node:test';
import assert from 'node:assert/strict';
import iniciar from '../../assets/js/modules/trifase/video.js';

function cenario() {
    function elemento() {
        const eventos = {}, classes = new Set();
        return {
            filhos: [], dataset: {},
            append(...itens) { this.filhos.push(...itens); },
            setAttribute(k, v) { this[k] = v; }, removeAttribute(k) { delete this[k]; },
            addEventListener(k, fn) { (eventos[k] ??= []).push(fn); },
            emitir(k, e = {}) { for (const fn of eventos[k] ?? []) fn(e); },
            classList: { add: k => classes.add(k), remove: k => classes.delete(k), contains: k => classes.has(k) },
            pause() { this.pausado = true; }, load() { this.carregado = true; },
        };
    }
    const doc = elemento();
    doc.baseURI = 'http://localhost/os/1'; doc.documentElement = elemento();
    doc.createElement = elemento; doc.querySelectorAll = () => [];
    const dialogo = elemento(), titulo = elemento(), baixar = elemento();
    dialogo.id = 'trifase-video'; dialogo.open = false;
    dialogo.showModal = () => { dialogo.open = true; };
    dialogo.close = () => { dialogo.open = false; dialogo.emitir('close'); };
    dialogo.querySelector = s => s === 'h2' ? titulo : baixar;
    dialogo.querySelectorAll = () => [];
    dialogo.insertBefore = e => dialogo.filhos.push(e);
    iniciar(dialogo, doc);
    const [video, estado] = dialogo.filhos[0].filhos;
    const clicar = (url = '/video/1') => {
        const a = { getAttribute: () => url, dataset: { trifaseNome: 'Vídeo de teste', trifaseDownload: '/download/1' } };
        doc.emitir('click', { target: { closest: () => a }, preventDefault() {} });
    };
    return { doc, dialogo, video, estado, baixar, clicar };
}

test('vídeo: carrega somente ao abrir, com controles e sem autoplay; fechar interrompe o carregamento', () => {
    const c = cenario();
    assert.equal(c.video.src, undefined);
    assert.equal(c.video.autoplay, undefined);
    c.clicar();
    assert.equal(c.dialogo.open, true);
    assert.equal(c.video.controls, true);
    assert.equal(c.video.src, 'http://localhost/video/1');
    assert.equal(c.baixar.href, 'http://localhost/download/1');
    assert.equal(c.doc.documentElement.classList.contains('overflow-hidden'), true);
    c.dialogo.close();
    assert.equal(c.video.src, undefined);
    assert.equal(c.video.pausado, true);
    assert.equal(c.baixar.href, '#');
    assert.equal(c.doc.documentElement.classList.contains('overflow-hidden'), false);
});

test('vídeo: URL externa não abre player e erro oferece download', () => {
    const c = cenario(); c.clicar('https://externo.example/video');
    assert.equal(c.dialogo.open, false);
    c.clicar(); c.video.emitir('error');
    assert.match(c.estado.textContent, /baixar o vídeo/);
});
