import { urlDaGaleria } from './galeria.js';

/** Mostra um quadro pausado, usando a mesma rota protegida do player. */
export default function iniciar(cartao, raiz = cartao.ownerDocument) {
    const video = cartao.querySelector('video');
    const alternativa = cartao.querySelector('[data-video-alternativa]');
    const url = urlDaGaleria(cartao.getAttribute('href'), raiz.baseURI);
    if (!video || !url) return;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.addEventListener('loadedmetadata', () => {
        if (Number.isFinite(video.duration) && video.duration > 0) {
            video.currentTime = Math.min(0.1, video.duration / 2);
        }
    });
    const mostrar = () => {
        if (video.readyState < 2) return;
        video.hidden = false;
        alternativa.hidden = true;
    };
    video.addEventListener('loadeddata', mostrar);
    video.addEventListener('seeked', mostrar);
    video.addEventListener('error', () => {
        video.hidden = true;
        alternativa.hidden = false;
    });
    const carregar = () => { video.src = url; video.load(); };
    const Observar = raiz.defaultView?.IntersectionObserver;
    if (Observar) {
        const observador = new Observar((entradas) => {
            if (entradas.some(e => e.isIntersecting)) {
                observador.disconnect();
                if (cartao.isConnected) carregar();
            }
        });
        observador.observe(cartao);
    } else {
        carregar();
    }
}
