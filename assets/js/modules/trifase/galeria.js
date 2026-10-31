import iniciarModal from '../componentes/modal.js';

/** A ampliação só usa imagens e downloads da própria instalação. */
export function urlDaGaleria(valor, base) {
    if (typeof valor !== 'string' || valor.trim() === '') return null;
    try {
        const url = new URL(valor, base);
        const origem = new URL(base).origin;
        return ['http:', 'https:'].includes(url.protocol) && url.origin === origem && !url.username && !url.password
            ? url.href : null;
    } catch {
        return null;
    }
}

export default function iniciar(dialogo, raiz = dialogo.ownerDocument) {
    if (typeof dialogo.showModal !== 'function') return;
    iniciarModal(dialogo, raiz);

    const conteudo = raiz.createElement('div');
    conteudo.className = 'flex items-center justify-center p-4';
    const imagem = raiz.createElement('img');
    imagem.className = 'max-h-[50vh] w-full object-contain';
    imagem.hidden = true;
    const estado = raiz.createElement('p');
    estado.className = 'text-body-md text-muted';
    estado.setAttribute('role', 'status');
    conteudo.append(imagem, estado);
    // O componente já fornece o cabeçalho, o fechamento e o rodapé.
    dialogo.insertBefore(conteudo, dialogo.lastElementChild);
    const titulo = dialogo.querySelector('h2');
    const baixar = dialogo.querySelector('[data-trifase-baixar]');
    let rolagemJaTravada = false;

    imagem.addEventListener('load', () => {
        if (!dialogo.open) return;
        imagem.hidden = false;
        estado.hidden = true;
    });
    imagem.addEventListener('error', () => {
        if (!dialogo.open) return;
        imagem.hidden = true;
        estado.hidden = false;
        estado.textContent = 'Não foi possível abrir a imagem. O acesso pode ter expirado ou sido revogado.';
    });

    raiz.addEventListener('click', (evento) => {
        const gatilho = evento.target.closest?.('[data-trifase-imagem]');
        if (!gatilho) return;
        evento.preventDefault();
        const url = urlDaGaleria(gatilho.getAttribute('href'), raiz.baseURI);
        const download = urlDaGaleria(gatilho.dataset.trifaseDownload, raiz.baseURI);
        if (!url || !download) return;
        const nome = gatilho.dataset.trifaseNome || 'Imagem do anexo';
        titulo.textContent = nome;
        imagem.alt = nome;
        imagem.hidden = true;
        estado.textContent = 'Carregando imagem…';
        estado.hidden = false;
        baixar.href = download;
        if (!dialogo.open) {
            rolagemJaTravada = raiz.documentElement.classList.contains('overflow-hidden');
            raiz.documentElement.classList.add('overflow-hidden');
            dialogo.showModal();
        }
        imagem.src = url;
    });

    dialogo.addEventListener('close', () => {
        imagem.removeAttribute('src');
        imagem.alt = '';
        imagem.hidden = true;
        baixar.href = '#';
        if (!rolagemJaTravada) raiz.documentElement.classList.remove('overflow-hidden');
    });
}
