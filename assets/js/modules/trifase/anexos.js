import { post, ErroHttp } from '../../lib/http.js';
import { mostrarToast } from '../../lib/toast.js';

/** A seleção altera apenas este arquivo, sem substituir a seleção de outra sessão. */
export default function iniciar(secao) {
    secao.addEventListener('submit', (evento) => {
        if (evento.target.matches('[data-anexo-publicacao]')) evento.preventDefault();
    });
    secao.addEventListener('change', async (evento) => {
        const campo = evento.target.closest('[data-publicar-anexo]');
        if (!campo || campo.disabled) return;
        const form = campo.closest('form');
        const estado = form.querySelector('[data-publicacao-estado]');
        const anterior = campo.dataset.publicado === '1';
        const publicar = campo.checked;
        campo.disabled = true;
        estado.textContent = 'Salvando…';
        const confirmar = (valor) => {
            campo.checked = valor;
            campo.dataset.publicado = valor ? '1' : '0';
            campo.disabled = false;
            estado.textContent = valor ? 'Disponível no link desta OS.' : 'Privado; somente no painel.';
        };
        try {
            const resposta = await post(form.action, { publicar: publicar ? '1' : '0', anterior: anterior ? '1' : '0' });
            confirmar(resposta.publicado === true);
            mostrarToast({ mensagem: 'Visibilidade do anexo atualizada.', variante: 'success' });
        } catch (erro) {
            if (erro instanceof ErroHttp && erro.status === 409 && typeof erro.corpo?.publicado === 'boolean') {
                confirmar(erro.corpo.publicado);
            } else if (erro instanceof ErroHttp && erro.status < 500) {
                confirmar(anterior);
            } else {
                estado.textContent = 'Estado não confirmado. Recarregue a OS antes de compartilhar.';
            }
            mostrarToast({ mensagem: erro.message || 'Não foi possível confirmar a visibilidade. Recarregue a OS.', variante: 'danger' });
        }
    });
}
