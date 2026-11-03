// Formulário de OS (views/os/formulario.php, #2842): liga os autocompletes de
// cliente, técnico e termo de garantia (lib/autocomplete.js). A validação, o
// carregamento do botão e o envio ficam com o módulo formulario/padrao, no
// <form>.

import { iniciarAutocompletes } from '../../lib/autocomplete.js';

export function urlUnidadesCliente(base, cliente) {
    const id = /^\d+$/.test(String(cliente)) && Number(cliente) > 0 ? String(cliente) : '';
    return `${base}?cliente_id=${encodeURIComponent(id)}`;
}

export default function iniciar(elemento) {
    iniciarAutocompletes(elemento);
    const novoCliente = elemento.querySelector('[data-nova-os-cliente]');
    novoCliente?.addEventListener('click', () => {
        const origem = novoCliente.closest('[data-autocomplete-novo-modal]');
        const modal = document.getElementById(origem?.dataset.autocompleteNovoModal);
        if (!origem || !modal) return;
        const selecionado = elemento.querySelector('[name=clientes_id]')?.value;
        const texto = selecionado ? '' : origem.querySelector('input:not([type=hidden])').value.trim();
        origem.dispatchEvent(new CustomEvent('autocomplete-novo', { bubbles: true, detail: { texto } }));
        modal.showModal();
    });

    const secao = elemento.querySelector('[data-nova-os-unidade]');
    if (!secao) return;
    const cliente = elemento.querySelector('[name=clientes_id]');
    const busca = secao.querySelector('[data-nova-os-unidade-busca]');
    const campo = busca.querySelector('input:not([type=hidden])');
    const unidade = busca.querySelector('input[type=hidden]');
    const entrada = secao.querySelector('[data-nova-os-unidade-entrada]');
    const confirmada = secao.querySelector('[data-nova-os-unidade-confirmada]');
    const descricao = elemento.querySelector('[name=descricaoProduto]');
    let descricaoAutomatica = unidade.value && descricao?.value === campo.value ? descricao.value : null;
    const atualizarEntrada = () => {
        entrada.disabled = !unidade.value;
        if (!unidade.value) {
            confirmada.textContent = 'Nenhuma unidade selecionada.';
            if (descricaoAutomatica !== null && descricao?.value === descricaoAutomatica) descricao.value = '';
            descricaoAutomatica = null;
        }
    };
    const limpar = () => {
        campo.value = '';
        unidade.value = '';
        campo.dispatchEvent(new Event('input', { bubbles: true }));
        // Invalida respostas em trânsito e fecha opções do cliente anterior.
        campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        campo.setCustomValidity('');
        atualizarEntrada();
    };
    const atualizarCliente = () => {
        busca.dataset.autocomplete = urlUnidadesCliente(busca.dataset.unidadeClienteUrl, cliente.value);
        campo.disabled = !cliente.value;
    };
    cliente.addEventListener('change', () => { limpar(); atualizarCliente(); });
    unidade.addEventListener('change', atualizarEntrada);
    busca.addEventListener('autocomplete-escolha', (evento) => {
        confirmada.textContent = evento.detail?.item?.detalhe || `Unidade #${unidade.value}`;
        if (descricao && (!descricao.value.trim() || descricao.value === descricaoAutomatica)) {
            descricao.value = evento.detail?.item?.valor || '';
            descricaoAutomatica = descricao.value;
        }
        atualizarEntrada();
    });
    secao.querySelector('[data-nova-os-unidade-limpar]').addEventListener('click', limpar);
    atualizarCliente();
    atualizarEntrada();
}
