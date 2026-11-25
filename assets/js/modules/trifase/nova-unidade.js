/** Catálogo e identificação física da unidade que só será criada ao salvar a OS. */
export default function iniciarNovaUnidade(secao, atualizarDescricao) {
    const busca = secao.querySelector('[data-nova-os-modelo-busca]');
    if (!busca) return;
    const campo = (nome) => secao.querySelector(`[name=equipamento_${nome}]`);
    const id = campo('modelo_id'), marca = campo('marca'), modelo = campo('modelo'), tipo = campo('tipo');
    const valoresAtuais = () => [tipo.value, marca.value.trim(), modelo.value.trim()].join("\u0000");
    let valoresCatalogo = id.value ? valoresAtuais() : '';
    const descrever = () => atualizarDescricao([marca.value.trim(), modelo.value.trim()].filter(Boolean).join(' · '));
    const desanexar = () => {
        if (id.value !== '' && valoresAtuais() !== valoresCatalogo) {
            id.value = '';
            valoresCatalogo = '';
        }
    };
    busca.addEventListener('autocomplete-escolha', (evento) => {
        const dados = evento.detail?.dados;
        if (!dados) return;
        marca.value = dados.marca;
        modelo.value = dados.modelo;
        tipo.value = dados.tipo;
        valoresCatalogo = valoresAtuais();
        descrever();
    });
    marca.addEventListener('input', () => { desanexar(); descrever(); });
    modelo.addEventListener('input', () => { desanexar(); descrever(); });
    tipo.addEventListener('change', desanexar);
    secao.querySelector('[data-nova-os-modelo-limpar]').addEventListener('click', () => {
        id.value = '';
        valoresCatalogo = '';
        const input = busca.querySelector('input:not([type=hidden])');
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('blur')); // Cancela também a pesquisa que ainda está no debounce.
        descrever();
        marca.focus();
    });
    return descrever;
}
