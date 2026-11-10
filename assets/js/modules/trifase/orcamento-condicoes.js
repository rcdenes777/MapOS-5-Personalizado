// Prévia local; o servidor recompõe e valida os textos antes de publicar.
export function textosCondicoes(c, termos = {}) {
    const pagamento = [];
    if (c.pagamento_vista) pagamento.push('À vista.');
    if (c.pagamento_cartao) pagamento.push(`Parcelado no cartão de crédito em até ${c.pagamento_parcelas} vezes.`);
    if (c.pagamento_outro?.trim()) pagamento.push(c.pagamento_outro.trim());
    const aguarda = c.prazo_importar || c.prazo_aguardar;
    let prazo = c.prazo_dias === 'outro' ? c.prazo_outro.trim() : (c.prazo_dias ? `Execução em até ${c.prazo_dias} ${c.prazo_dias === '1' ? 'dia útil' : 'dias úteis'}${aguarda ? ' após a chegada da peça.' : '.'}` : '');
    if (!prazo && aguarda) prazo = 'Prazo de execução a confirmar após a chegada da peça.';
    if (c.prazo_importar) prazo += '\nNecessário importar peça.';
    if (c.prazo_aguardar) prazo += '\nAguardando chegada da peça.';
    let garantia = c.garantia_dias === 'outro' ? c.garantia_outro.trim() : `${c.garantia_dias} dias.`;
    if (termos[c.termo_garantia_id]) garantia += `\n${termos[c.termo_garantia_id]}`;
    return { pagamento: pagamento.join('\n'), prazo: prazo.trim(), garantia };
}

export default function iniciar(raiz) {
    const termos = JSON.parse(raiz.dataset.termos || '{}');
    function atualizar() {
        const valores = {};
        for (const campo of raiz.querySelectorAll('input[name], select[name], textarea[name]')) {
            valores[campo.name] = campo.type === 'checkbox' ? campo.checked : campo.value;
        }
        raiz.querySelector('[name="pagamento_parcelas"]').disabled = !valores.pagamento_cartao;
        for (const tipo of ['prazo', 'garantia']) raiz.querySelector(`[data-personalizado="${tipo}"]`).hidden = valores[`${tipo}_dias`] !== 'outro';
        for (const [tipo, texto] of Object.entries(textosCondicoes(valores, termos))) raiz.querySelector(`[data-previa="${tipo}"]`).textContent = texto;
    }
    raiz.addEventListener('change', atualizar);
    raiz.addEventListener('input', atualizar);
    atualizar();
}
