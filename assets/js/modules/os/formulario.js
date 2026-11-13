// Formulário de OS (views/os/formulario.php, #2842): liga os autocompletes de
// cliente, técnico e termo de garantia (lib/autocomplete.js). A validação, o
// carregamento do botão e o envio ficam com o módulo formulario/padrao, no
// <form>.

import { iniciarAutocompletes } from '../../lib/autocomplete.js';
import iniciarNovaUnidade from '../trifase/nova-unidade.js';

export function urlUnidadesCliente(base, cliente) {
    const id = /^\d+$/.test(String(cliente)) && Number(cliente) > 0 ? String(cliente) : '';
    return `${base}?cliente_id=${encodeURIComponent(id)}`;
}

function iniciarOpcoesMoveis(elemento) {
    const detalhe = elemento.querySelector('[data-os-opcoes-moveis]');
    if (!detalhe) return;

    const destino = detalhe.querySelector('[data-os-opcoes-campos]');
    const grupos = [...elemento.querySelectorAll('[data-os-opcao-movel]')].map((grupo) => {
        const origem = document.createComment('Posição dos campos no desktop');
        grupo.before(origem);
        return { grupo, origem };
    });
    const celular = window.matchMedia('(width < 40rem)');
    const ajustar = () => {
        const foco = document.activeElement;
        const campoEmFoco = grupos.some(({ grupo }) => grupo.contains(foco));
        if (celular.matches) {
            destino.append(...grupos.map(({ grupo }) => grupo));
            detalhe.hidden = false;
            if (campoEmFoco || destino.querySelector('[aria-invalid="true"]')) detalhe.open = true;
        } else {
            for (const { grupo, origem } of grupos) origem.after(grupo);
            detalhe.hidden = true;
        }
        if (campoEmFoco) foco.focus({ preventScroll: true });
    };

    ajustar();
    celular.addEventListener('change', ajustar);
}

export default function iniciar(elemento) {
    iniciarOpcoesMoveis(elemento);
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
    const modo = secao.querySelector('[name=equipamento_modo]');
    const existente = secao.querySelector('[data-nova-os-unidade-existente]');
    const nova = secao.querySelector('[data-nova-os-unidade-nova]');
    const modoAtual = () => modo ? modo.value : 'existente';
    const descricaoBloco = elemento.querySelector('[data-equipamento-descricao]');
    let descricaoManual = descricao?.value || '';
    const atualizarDescricaoVisivel = () => {
        if (descricaoBloco) descricaoBloco.hidden = modoAtual() !== '';
    };
    descricao?.addEventListener('input', () => {
        if (modoAtual() === '') descricaoManual = descricao.value;
    });

    let descricaoAutomatica = unidade.value && descricao?.value === campo.value ? descricao.value : null;
    const atualizarEntrada = () => {
        entrada.disabled = !cliente.value || (modoAtual() !== 'novo' && (modoAtual() !== 'existente' || !unidade.value));
        if (!unidade.value) {
            confirmada.textContent = 'Nenhum equipamento selecionado.';
            if (modoAtual() !== 'novo') {
                if (descricaoAutomatica !== null && descricao?.value === descricaoAutomatica) descricao.value = '';
                descricaoAutomatica = null;
            }
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
        campo.disabled = !cliente.value || modoAtual() !== 'existente';
        if (existente) { existente.disabled = modoAtual() !== 'existente'; existente.hidden = existente.disabled; }
        if (nova) { nova.disabled = !cliente.value || modoAtual() !== 'novo'; nova.hidden = modoAtual() !== 'novo'; }
    };
    cliente.addEventListener('change', () => { limpar(); atualizarCliente(); });
    unidade.addEventListener('change', atualizarEntrada);
    const descrever = (valor) => {
        if (descricao && modoAtual() !== '') {
            descricao.value = valor;
            descricaoAutomatica = valor;
        }
    };
    busca.addEventListener('autocomplete-escolha', (evento) => {
        confirmada.textContent = evento.detail?.item?.detalhe || `Equipamento #${unidade.value}`;
        descrever(evento.detail?.item?.valor || '');
        atualizarEntrada();
    });
    secao.querySelector('[data-nova-os-unidade-limpar]').addEventListener('click', limpar);
    const atualizarNova = iniciarNovaUnidade(secao, (valor) => { if (modoAtual() === 'novo') descrever(valor); });
    modo?.addEventListener('change', () => {
        limpar(); atualizarCliente(); atualizarEntrada();
        secao.querySelector('[data-nova-os-modelo-busca] input:not([type=hidden])')?.dispatchEvent(new Event('blur'));
        if (modoAtual() === 'novo') atualizarNova?.();
        if (modoAtual() === '' && descricao) { descricao.value = descricaoManual; descricaoAutomatica = null; }
        atualizarDescricaoVisivel();
    });
    atualizarCliente();
    atualizarEntrada();
    atualizarDescricaoVisivel();
    if (modoAtual() === 'novo') atualizarNova?.();
}
