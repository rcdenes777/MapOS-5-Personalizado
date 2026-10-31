import iniciarModal from '../componentes/modal.js';
import { urlDaGaleria } from './galeria.js';

export default function iniciar(dialogo, raiz = dialogo.ownerDocument) {
    if (typeof dialogo.showModal !== 'function') return;
    iniciarModal(dialogo, raiz);

    const conteudo = raiz.createElement('div');
    conteudo.className = 'p-4';
    const area = raiz.createElement('div');
    area.className = 'overflow-auto';
    area.style.height = '50vh';
    area.tabIndex = 0;
    area.setAttribute('role', 'region');
    area.setAttribute('aria-label', 'Imagem ampliada. Use a rolagem para ver os detalhes.');
    const nivel = raiz.createElement('p');
    nivel.className = 'text-body-md text-muted';
    nivel.setAttribute('role', 'status');
    nivel.setAttribute('aria-live', 'polite');
    const imagem = raiz.createElement('img');
    imagem.className = 'block';
    // Dimensões calculadas mantêm todos os cantos acessíveis pela rolagem.
    imagem.style.maxWidth = 'none';
    imagem.style.maxHeight = 'none';
    imagem.style.margin = 'auto';
    imagem.hidden = true;
    const estado = raiz.createElement('p');
    estado.className = 'text-body-md text-muted';
    estado.setAttribute('role', 'status');
    area.append(imagem);
    conteudo.append(nivel, area, estado);
    // O componente já fornece o cabeçalho, o fechamento e o rodapé.
    dialogo.insertBefore(conteudo, dialogo.lastElementChild);
    const titulo = dialogo.querySelector('h2');
    const baixar = dialogo.querySelector('[data-trifase-baixar]');
    const ampliar = dialogo.querySelector('[data-trifase-ampliar]');
    const reduzir = dialogo.querySelector('[data-trifase-reduzir]');
    const ajustar = dialogo.querySelector('[data-trifase-ajustar]');
    let rolagemJaTravada = false;
    let zoom = 1;
    let pronta = false;

    function atualizar() {
        ampliar.disabled = !pronta || zoom >= 8;
        reduzir.disabled = !pronta || zoom <= 1;
        ajustar.disabled = !pronta;
        nivel.textContent = pronta ? `Zoom: ${Math.round(zoom * 100)}% — use a rolagem para ver os detalhes.` : '';
        if (!pronta) return;
        const ajuste = Math.min(area.clientWidth / imagem.naturalWidth, area.clientHeight / imagem.naturalHeight, 1);
        imagem.style.width = `${Math.max(1, Math.round(imagem.naturalWidth * ajuste * zoom))}px`;
        imagem.style.height = `${Math.max(1, Math.round(imagem.naturalHeight * ajuste * zoom))}px`;
    }
    function mudarZoom(valor) {
        if (!pronta) return;
        zoom = Math.max(1, Math.min(8, valor));
        const larguraAnterior = parseFloat(imagem.style.width) || area.clientWidth;
        const alturaAnterior = parseFloat(imagem.style.height) || area.clientHeight;
        const centroX = (area.scrollLeft + area.clientWidth / 2 - Math.max(0, (area.clientWidth - larguraAnterior) / 2)) / larguraAnterior;
        const centroY = (area.scrollTop + area.clientHeight / 2) / alturaAnterior;
        atualizar();
        area.scrollLeft = zoom === 1 ? 0 : centroX * parseFloat(imagem.style.width) - area.clientWidth / 2;
        area.scrollTop = zoom === 1 ? 0 : centroY * parseFloat(imagem.style.height) - area.clientHeight / 2;
    }
    ampliar.addEventListener('click', () => mudarZoom(zoom * 2));
    reduzir.addEventListener('click', () => mudarZoom(zoom / 2));
    ajustar.addEventListener('click', () => mudarZoom(1));
    raiz.defaultView?.addEventListener('resize', () => {
        if (dialogo.open && pronta) mudarZoom(zoom);
    });
    atualizar();

    imagem.addEventListener('load', () => {
        if (!dialogo.open) return;
        imagem.hidden = false;
        estado.hidden = true;
        pronta = true;
        mudarZoom(1);
    });
    imagem.addEventListener('error', () => {
        if (!dialogo.open) return;
        imagem.hidden = true;
        pronta = false;
        atualizar();
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
        pronta = false;
        zoom = 1;
        atualizar();
        area.scrollLeft = 0;
        area.scrollTop = 0;
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
        pronta = false;
        zoom = 1;
        atualizar();
        imagem.removeAttribute('src');
        imagem.alt = '';
        imagem.hidden = true;
        baixar.href = '#';
        if (!rolagemJaTravada) raiz.documentElement.classList.remove('overflow-hidden');
    });
}
