import { post } from '../../lib/http.js';

export async function removerItem(url, dados, enviar = post) {
    const resposta = await enviar(url, dados);
    if (!resposta?.result) throw new Error(resposta?.message || 'Não foi possível remover o item.');
    return resposta;
}

export default function iniciar(raiz) {
    let enviando = false;
    raiz.addEventListener('submit', async (evento) => {
        const form = evento.target.closest('[data-cancelamento-item]');
        if (!form) return;
        evento.preventDefault();
        if (enviando || !form.reportValidity()) return;
        enviando = true;
        const botoes = [...raiz.querySelectorAll('[data-cancelamento-item] button')];
        botoes.forEach((botao) => { botao.disabled = true; });
        const erro = raiz.querySelector('[data-cancelamento-erro]');
        erro.hidden = true;
        try {
            await removerItem(form.action, new FormData(form));
            window.location.reload();
        } catch (e) {
            erro.textContent = e.corpo?.message || e.message || 'Não foi possível concluir. Recarregue e tente novamente.';
            erro.hidden = false;
            erro.focus();
            enviando = false;
            botoes.forEach((botao) => { botao.disabled = false; });
        }
    });
}
