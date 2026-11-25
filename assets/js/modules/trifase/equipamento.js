/** O autocomplete escolhe o catálogo; a unidade continua sendo cadastrada separadamente. */
export default function iniciar(secao) {
    const busca = secao.querySelector('[data-modelo-busca]');
    if (!busca) return;
    const form = busca.closest('form');
    const marca = form.elements.namedItem('marca');
    const modelo = form.elements.namedItem('modelo');
    const tipo = form.elements.namedItem('tipo');
    const id = form.elements.namedItem('modelo_id');
    const valoresAtuais = () => [tipo.value, marca.value.trim(), modelo.value.trim()].join("\u0000");
    let valoresCatalogo = id.value ? valoresAtuais() : '';
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
    });
    marca.addEventListener('input', desanexar);
    modelo.addEventListener('input', desanexar);
    tipo.addEventListener('change', desanexar);
    form.querySelector('[data-equipamento-limpar-modelo]').addEventListener('click', () => {
        id.value = '';
        valoresCatalogo = '';
        busca.querySelector('input:not([type=hidden])').value = '';
        marca.focus();
    });
}
