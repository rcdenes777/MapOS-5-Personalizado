/** Catálogo e identificação física da unidade que só será criada ao salvar a OS. */
export default function iniciarNovaUnidade(secao, atualizarDescricao) {
    const busca = secao.querySelector('[data-nova-os-modelo-busca]');
    if (!busca) return;
    const campo = (nome) => secao.querySelector(`[name=equipamento_${nome}]`);
    const id = campo('modelo_id'), marca = campo('marca'), modelo = campo('modelo'), tipo = campo('tipo');
    const atualizarModelo = () => {
        marca.readOnly = modelo.readOnly = Boolean(id.value);
        tipo.disabled = Boolean(id.value);
    };
    const descrever = () => atualizarDescricao([marca.value.trim(), modelo.value.trim()].filter(Boolean).join(' · '));
    busca.addEventListener('autocomplete-escolha', (evento) => {
        const dados = evento.detail?.dados;
        if (!dados) return;
        marca.value = dados.marca;
        modelo.value = dados.modelo;
        tipo.value = dados.tipo;
        atualizarModelo();
        descrever();
    });
    id.addEventListener('change', atualizarModelo);
    marca.addEventListener('input', descrever);
    modelo.addEventListener('input', descrever);
    secao.querySelector('[data-nova-os-modelo-limpar]').addEventListener('click', () => {
        id.value = '';
        const input = busca.querySelector('input:not([type=hidden])');
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('blur')); // Cancela também a pesquisa que ainda está no debounce.
        marca.value = modelo.value = '';
        atualizarModelo();
        descrever();
        marca.focus();
    });
    atualizarModelo();
    return descrever;
}
