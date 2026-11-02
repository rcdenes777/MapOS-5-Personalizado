/** O autocomplete escolhe o catálogo; a unidade continua sendo cadastrada separadamente. */
export default function iniciar(secao) {
    const busca = secao.querySelector('[data-modelo-busca]');
    if (!busca) return;
    const form = busca.closest('form');
    const marca = form.elements.namedItem('marca');
    const modelo = form.elements.namedItem('modelo');
    const tipo = form.elements.namedItem('tipo');
    const id = form.elements.namedItem('modelo_id');
    busca.addEventListener('autocomplete-escolha', (evento) => {
        const dados = evento.detail?.dados;
        if (!dados) return;
        marca.value = dados.marca;
        modelo.value = dados.modelo;
        tipo.value = dados.tipo;
        marca.readOnly = true;
        modelo.readOnly = true;
        tipo.disabled = true;
    });
    id.addEventListener('change', () => {
        if (id.value === '') {
            marca.readOnly = false;
            modelo.readOnly = false;
            tipo.disabled = false;
        }
    });
    form.querySelector('[data-equipamento-limpar-modelo]').addEventListener('click', () => {
        id.value = '';
        busca.querySelector('input:not([type=hidden])').value = '';
        marca.value = '';
        modelo.value = '';
        marca.readOnly = false;
        modelo.readOnly = false;
        tipo.disabled = false;
        marca.focus();
    });
}
