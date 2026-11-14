// Busca progressiva das listagens. O servidor continua filtrando e paginando
// todos os registros, com as permissões do usuário; não filtra só a página atual.
const iniciados = new WeakSet();

export function urlDaListagem(acao, dados, base) {
    const url = new URL(acao, base);
    for (const [nome, valor] of dados) url.searchParams.set(nome, String(valor));
    for (const nome of ['inicio', 'offset', 'page']) url.searchParams.delete(nome);
    return url;
}

export function iniciarBusca(form, { buscar = fetch, atraso = 350, doc = document, navegador = window, reiniciar = () => {} } = {}) {
    const campo = form.querySelector('input[type="search"]');
    const main = form.closest('#conteudo-principal');
    if (!campo || !main || form.method.toLowerCase() !== 'get' || iniciados.has(form)) return;
    iniciados.add(form);
    const estado = doc.createElement('p');
    estado.className = 'text-caption text-muted';
    estado.setAttribute('role', 'status');
    estado.setAttribute('aria-live', 'polite');
    form.after(estado);
    let espera;
    let controle;
    let numero = 0;
    let compondo = false;

    async function pesquisar() {
        clearTimeout(espera);
        controle?.abort();
        controle = new AbortController();
        const atual = ++numero;
        const url = urlDaListagem(form.action, new FormData(form), navegador.location.href);
        if (url.origin !== navegador.location.origin) return;
        estado.textContent = 'Buscando…';
        main.setAttribute('aria-busy', 'true');
        try {
            const resposta = await buscar(url, { credentials: 'same-origin', signal: controle.signal, headers: { Accept: 'text/html' } });
            if (!resposta.ok) throw new Error('Busca indisponível');
            const pagina = new DOMParser().parseFromString(await resposta.text(), 'text/html');
            const novo = pagina.querySelector('#conteudo-principal');
            const novoForm = novo?.querySelector('form[role="search"], form[method="get"]:has(input[type="search"])');
            if (atual !== numero) return;
            if (!novoForm || !novoForm.querySelector(`input[name="${campo.name}"]`)) throw new Error('Recarregue para conferir seu acesso');
            const foco = form.contains(doc.activeElement) ? doc.activeElement : null;
            const selecao = foco === campo ? [campo.selectionStart, campo.selectionEnd] : null;
            // Conserva o formulário e os diálogos já inicializados. Os botões
            // das novas linhas continuam abrindo os mesmos modais de confirmação.
            for (const dialogo of main.querySelectorAll('dialog[id]')) {
                const destino = pagina.getElementById(dialogo.id);
                if (destino) destino.replaceWith(dialogo);
            }
            const filtrosAtivos = form.querySelector('[data-os-filtros-ativos]');
            const filtrosDaResposta = novoForm.querySelector('[data-os-filtros-ativos]');
            if (filtrosAtivos && filtrosDaResposta) filtrosAtivos.textContent = filtrosDaResposta.textContent;
            const limpar = form.querySelector('[data-listagem-limpar]');
            const limparDaResposta = novoForm.querySelector('[data-listagem-limpar]');
            if (limpar && limparDaResposta) limpar.hidden = limparDaResposta.hidden;
            novoForm.replaceWith(form, estado);
            main.replaceChildren(...novo.childNodes);
            navegador.history.replaceState(null, '', url);
            if (foco) {
                foco.focus({ preventScroll: true });
                if (selecao) campo.setSelectionRange(...selecao);
            }
            await reiniciar(main);
            estado.textContent = 'Lista atualizada.';
        } catch (erro) {
            if (atual === numero && erro.name !== 'AbortError') estado.textContent = 'Não foi possível atualizar. Use Buscar ou recarregue a página.';
        } finally {
            if (atual === numero) main.removeAttribute('aria-busy');
        }
    }
    function agendar() {
        clearTimeout(espera);
        controle?.abort();
        numero++;
        if (!compondo) espera = setTimeout(pesquisar, atraso);
    }
    campo.addEventListener('input', agendar);
    campo.addEventListener('compositionstart', () => { compondo = true; clearTimeout(espera); });
    campo.addEventListener('compositionend', () => { compondo = false; agendar(); });
    form.addEventListener('submit', (evento) => {
        if (evento.defaultPrevented) return;
        evento.preventDefault();
        pesquisar();
    });
    return { pesquisar };
}

export function iniciarBuscas(raiz, opcoes = {}) {
    for (const form of raiz.querySelectorAll('#conteudo-principal form[role="search"], #conteudo-principal form[method="get"]:has(input[type="search"])')) iniciarBusca(form, opcoes);
}
