import { copiar } from '../conecte/copiar.js';
import { mostrarToast } from '../../lib/toast.js';

export default function iniciar(raiz) {
    raiz.addEventListener('click', async (evento) => {
        const botao = evento.target.closest?.('[data-copiar-link]');
        const campo = botao ? raiz.ownerDocument.getElementById(botao.dataset.copiarLink) : null;
        if (!campo) return;
        const copiou = await copiar(campo);
        mostrarToast(copiou
            ? { mensagem: 'Link copiado.', variante: 'success' }
            : { mensagem: 'Link selecionado. Use Ctrl+C para copiar.', variante: 'warning' }, raiz.ownerDocument);
    });
}
