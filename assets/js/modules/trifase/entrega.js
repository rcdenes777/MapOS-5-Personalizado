export default function iniciar(form) {
    const terceiro = form.querySelector('[data-entrega-terceiro]');
    const bloco = form.querySelector('[data-entrega-autorizacao]');
    const autorizacao = bloco.querySelector('textarea');
    const atualizar = () => {
        const precisa = terceiro.value === '1';
        bloco.hidden = !precisa;
        autorizacao.required = precisa;
        autorizacao.disabled = !precisa;
    };
    terceiro.addEventListener('change', atualizar);
    atualizar();
}
