import { test } from 'node:test';
import assert from 'node:assert/strict';
import iniciar, { urlDaGaleria } from '../../assets/js/modules/trifase/galeria.js';

function cenario() {
    function elemento(tag) {
        const listeners = {};
        const classes = new Set();
        return {
            tagName: tag.toUpperCase(), dataset: {}, filhos: [], hidden: false,
            classList: { contains: c => classes.has(c), add: c => classes.add(c), remove: c => classes.delete(c) },
            setAttribute(k, v) { this[k] = v; },
            removeAttribute(k) { delete this[k]; },
            append(...filhos) { this.filhos.push(...filhos); },
            addEventListener(nome, fn) { (listeners[nome] ??= []).push(fn); },
            emitir(nome, evento = {}) { for (const fn of listeners[nome] ?? []) fn(evento); },
        };
    }
    const doc = elemento('document');
    doc.baseURI = 'http://127.0.0.1:8200/index.php/publico/os/token';
    doc.documentElement = elemento('html');
    doc.createElement = elemento;
    doc.querySelectorAll = () => [];
    const dialogo = elemento('dialog');
    dialogo.id = 'trifase-galeria';
    dialogo.ownerDocument = doc;
    dialogo.open = false;
    dialogo.showModal = () => { dialogo.open = true; };
    dialogo.close = () => { dialogo.open = false; dialogo.emitir('close'); };
    const titulo = elemento('h2');
    const baixar = elemento('a');
    dialogo.lastElementChild = elemento('footer');
    dialogo.querySelector = s => s === 'h2' ? titulo : baixar;
    dialogo.querySelectorAll = () => [];
    dialogo.insertBefore = e => dialogo.filhos.push(e);
    iniciar(dialogo, doc);
    const [imagem, estado] = dialogo.filhos[0].filhos;
    function clicar(href = '/index.php/publico/imagem/token/1', download = '/index.php/publico/anexo/token/1') {
        const gatilho = {
            dataset: { trifaseNome: 'Anexo #1', trifaseDownload: download },
            getAttribute: () => href,
            closest: s => s === '[data-trifase-imagem]' ? gatilho : null,
        };
        const evento = { target: gatilho, prevenido: false, preventDefault() { this.prevenido = true; } };
        doc.emitir('click', evento);
        return evento;
    }
    return { doc, dialogo, titulo, baixar, imagem, estado, clicar };
}

test('galeria: somente URLs http(s) da mesma origem e sem credenciais', () => {
    const base = 'https://cliente.example/os';
    assert.equal(urlDaGaleria('/imagem/1', base), 'https://cliente.example/imagem/1');
    for (const url of ['', null, 'javascript:alert(1)', 'data:image/png;base64,AA', 'https://outro.example/imagem', 'https://usuario:senha@cliente.example/imagem', 'http://cliente.example/imagem']) {
        assert.equal(urlDaGaleria(url, base), null);
    }
});

test('galeria: clique abre dialog com imagem, sem navegação ou aba nova', () => {
    const c = cenario();
    const evento = c.clicar();
    assert.equal(evento.prevenido, true);
    assert.equal(c.dialogo.open, true);
    assert.equal(c.titulo.textContent, 'Anexo #1');
    assert.equal(c.imagem.alt, 'Anexo #1');
    assert.equal(c.imagem.src, 'http://127.0.0.1:8200/index.php/publico/imagem/token/1');
    assert.equal(c.baixar.href, 'http://127.0.0.1:8200/index.php/publico/anexo/token/1');
    assert.equal(c.estado.textContent, 'Carregando imagem…');
    assert.equal(c.doc.documentElement.classList.contains('overflow-hidden'), true);
    c.imagem.emitir('load');
    assert.equal(c.imagem.hidden, false);
    assert.equal(c.estado.hidden, true);
});

test('galeria: falha no arquivo mostra mensagem e fechar limpa a imagem e a rolagem', () => {
    const c = cenario(); c.clicar();
    c.imagem.emitir('error');
    assert.equal(c.imagem.hidden, true);
    assert.match(c.estado.textContent, /expirado ou sido revogado/);
    c.dialogo.close();
    assert.equal(c.imagem.src, undefined);
    assert.equal(c.baixar.href, '#');
    assert.equal(c.doc.documentElement.classList.contains('overflow-hidden'), false);
});

test('galeria: URL inválida bloqueia o clique sem abrir janela', () => {
    const c = cenario();
    assert.equal(c.clicar('https://outro.example/imagem').prevenido, true);
    assert.equal(c.dialogo.open, false);
});

test('galeria: preserva rolagem que já estava bloqueada antes da abertura', () => {
    const c = cenario();
    c.doc.documentElement.classList.add('overflow-hidden');
    c.clicar(); c.dialogo.close();
    assert.equal(c.doc.documentElement.classList.contains('overflow-hidden'), true);
});
