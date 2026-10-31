import iniciarModal from '../componentes/modal.js';
import { urlDaGaleria } from './galeria.js';

export default function iniciar(dialogo, raiz = dialogo.ownerDocument) {
    if (typeof dialogo.showModal !== 'function') return;
    iniciarModal(dialogo, raiz);
    const conteudo = raiz.createElement('div');
    conteudo.className = 'p-4';
    const video = raiz.createElement('video');
    video.className = 'max-h-[50vh] w-full';
    video.controls = true;
    video.playsInline = true;
    video.preload = 'metadata';
    const estado = raiz.createElement('p');
    estado.className = 'text-body-md text-muted';
    estado.setAttribute('role', 'status');
    estado.textContent = 'Use os controles para reproduzir, ajustar o volume ou abrir em tela cheia.';
    conteudo.append(video, estado);
    dialogo.insertBefore(conteudo, dialogo.lastElementChild);
    const titulo = dialogo.querySelector('h2');
    const baixar = dialogo.querySelector('[data-trifase-video-baixar]');
    let rolagemJaTravada = false;
    video.addEventListener('error', () => {
        if (dialogo.open) estado.textContent = 'Não foi possível reproduzir. O formato pode ser incompatível ou o acesso ter expirado. Você pode tentar baixar o vídeo.';
    });
    raiz.addEventListener('click', (evento) => {
        const gatilho = evento.target.closest?.('[data-trifase-video]');
        if (!gatilho) return;
        evento.preventDefault();
        const url = urlDaGaleria(gatilho.getAttribute('href'), raiz.baseURI);
        const download = urlDaGaleria(gatilho.dataset.trifaseDownload, raiz.baseURI);
        if (!url || !download) return;
        video.pause();
        titulo.textContent = gatilho.dataset.trifaseNome || 'Vídeo do anexo';
        video.setAttribute('aria-label', titulo.textContent);
        estado.textContent = 'Use os controles para reproduzir, ajustar o volume ou abrir em tela cheia.';
        baixar.href = download;
        if (!dialogo.open) {
            rolagemJaTravada = raiz.documentElement.classList.contains('overflow-hidden');
            raiz.documentElement.classList.add('overflow-hidden');
            dialogo.showModal();
        }
        video.src = url;
        video.load();
    });
    dialogo.addEventListener('close', () => {
        video.pause();
        video.removeAttribute('src');
        video.load();
        baixar.href = '#';
        if (!rolagemJaTravada) raiz.documentElement.classList.remove('overflow-hidden');
    });
}
