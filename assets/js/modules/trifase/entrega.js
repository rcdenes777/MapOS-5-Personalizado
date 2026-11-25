export default function iniciar(form) {
    const bloco = form.querySelector('[data-entrega-autorizacao]');
    const autorizacao = bloco.querySelector('textarea');
    const recebedor = form.querySelector('[name=recebedor]');
    const opcoes = [...form.querySelectorAll('input[name=terceiro]')];
    const escolhido = () => form.querySelector('input[name=terceiro]:checked')?.value ?? '0';
    let ultimoProprio = recebedor?.value ?? '';
    let modoAnterior = escolhido();

    const atualizar = () => {
        const precisa = escolhido() === '1';
        bloco.hidden = !precisa;
        autorizacao.required = precisa;
        autorizacao.disabled = !precisa;
        if (recebedor) {
            if (precisa) {
                if (modoAnterior !== '1') ultimoProprio = recebedor.value;
                recebedor.value = '';
            } else if (modoAnterior === '1') {
                recebedor.value = ultimoProprio;
            }
        }
        modoAnterior = precisa ? '1' : '0';
    };

    opcoes.forEach((opcao) => opcao.addEventListener('change', atualizar));
    atualizar();
}
