import { iniciarBuscas } from './lib/busca-listagem.js';

// Carregador dos módulos de página da v5.
//
// A view marca um elemento com data-module="pasta/nome" (helper js_module() no
// PHP) e este arquivo importa assets/js/modules/pasta/nome.js, chamando o
// export default com o elemento. Sem bundler: são ES modules nativos.
//
// Incluído no layout com <script type="module">, que só roda depois de o HTML
// ser lido; o teste do readyState cobre os dois casos.

const NOME_VALIDO = /^[a-z0-9_-]+(\/[a-z0-9_-]+)*$/;

export function nomeDeModuloValido(nome) {
    return typeof nome === 'string' && NOME_VALIDO.test(nome);
}

const DETALHES_MOVEIS = 'details.os-filtros-complementares, details.opcoes-moveis';
const detalhesPreparados = new WeakSet();

function iniciarDetalhesMoveis(raiz) {
    if (typeof window === 'undefined' || window.CSS?.supports('selector(::details-content)')) return;

    if (!window.matchMedia) return;

    for (const detalhe of raiz.querySelectorAll(DETALHES_MOVEIS)) {
        if (detalhesPreparados.has(detalhe)) continue;
        detalhesPreparados.add(detalhe);

        const desktop = window.matchMedia('(min-width: 40rem)');
        let abertoNoCelular = detalhe.open;
        let emDesktop = desktop.matches;
        const ajustar = () => {
            if (desktop.matches === emDesktop) return;
            emDesktop = desktop.matches;
            if (emDesktop) {
                abertoNoCelular = detalhe.open;
                detalhe.open = true;
            } else {
                detalhe.open = abertoNoCelular || detalhe.contains(document.activeElement);
            }
        };

        if (desktop.matches) detalhe.open = true;
        desktop.addEventListener('change', ajustar);
        detalhe.addEventListener('toggle', () => {
            if (!desktop.matches) abertoNoCelular = detalhe.open;
        });
    }
}

export async function iniciarModulos(raiz = document) {
    iniciarDetalhesMoveis(raiz);
    const elementos = raiz.querySelectorAll('[data-module]');

    await Promise.all(Array.from(elementos, async (elemento) => {
        const nome = elemento.dataset.module;

        if (!nomeDeModuloValido(nome)) {
            console.error(`[app] nome de módulo inválido: "${nome}"`);
            return;
        }

        if (elemento.dataset.moduleIniciado === 'true') {
            return;
        }
        elemento.dataset.moduleIniciado = 'true';

        try {
            const modulo = await import(new URL(`./modules/${nome}.js`, import.meta.url));
            if (typeof modulo.default === 'function') {
                await modulo.default(elemento);
            }
        } catch (erro) {
            console.error(`[app] falha ao iniciar o módulo "${nome}"`, erro);
        }
    }));
    iniciarBuscas(raiz, { reiniciar: iniciarModulos });
}

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => iniciarModulos());
    } else {
        iniciarModulos();
    }
}
