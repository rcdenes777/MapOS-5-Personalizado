<?php

function trifaseOrcamentoHabilitado(): bool
{
    return filter_var($_ENV['TRIFASE_ORCAMENTOS_ENABLED'] ?? false, FILTER_VALIDATE_BOOLEAN);
}

/** A proteção do histórico continua mesmo com a função desligada. */
function trifaseOrcamentoTemHistorico(object $db, int $os): bool
{
    return $db->table_exists('trifase_orcamento_versoes')
        && $db->where('os_id', $os)->count_all_results('trifase_orcamento_versoes') > 0;
}

function trifaseOrcamentoSituacao(?object $decisao): string
{
    return match ($decisao->tipo ?? '') {
        'aprovar' => 'Aprovado', 'recusar' => 'Recusado', default => 'Aguardando resposta',
    };
}

/** Texto revisado para esta publicação; não consulta notas internas nem dados vivos. */
function trifaseOrcamentoApresentacao(array $dados): array
{
    if ($dados === []) {
        return [];
    }
    $resultado = [];
    foreach (['equipamento' => 500, 'defeito' => 4000, 'diagnostico' => 4000, 'pagamento' => 1000, 'prazo' => 500, 'garantia' => 8000] as $campo => $limite) {
        $valor = $dados[$campo] ?? '';
        if (! is_string($valor) || ! mb_check_encoding($valor, 'UTF-8') || mb_strlen($valor) > $limite
            || preg_match('/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/', $valor)) {
            throw new DomainException('Confira os textos do orçamento e os limites de cada campo.');
        }
        $resultado[$campo] = trim($valor);
    }
    return $resultado;
}

function trifaseOrcamentoTexto(mixed $valor): string
{
    return trim(html_entity_decode(strip_tags((string) $valor), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
}

/** Condições do formulário viram texto fechado na versão publicada. */
function trifaseOrcamentoCondicoes(array $dados, array $termos): array
{
    $texto = static function (string $campo) use ($dados): string {
        $v = $dados[$campo] ?? '';
        if (! is_string($v) || ! mb_check_encoding($v, 'UTF-8')) {
            throw new DomainException('Confira as condições do orçamento.');
        }
        return trim($v);
    };
    $marcado = static fn (string $campo): bool => $texto($campo) === '1';
    $pagamento = [];
    if ($marcado('pagamento_vista')) {
        $pagamento[] = 'À vista.';
    }
    if ($marcado('pagamento_cartao')) {
        $parcelas = filter_var($texto('pagamento_parcelas'), FILTER_VALIDATE_INT, ['options' => ['min_range' => 2, 'max_range' => 24]]);
        if ($parcelas === false) {
            throw new DomainException('Informe entre 2 e 24 parcelas no cartão.');
        }
        $pagamento[] = 'Parcelado no cartão de crédito em até ' . $parcelas . ' vezes.';
    }
    if ($texto('pagamento_outro') !== '') {
        $pagamento[] = $texto('pagamento_outro');
    }
    if ($pagamento === []) {
        throw new DomainException('Marque uma condição de pagamento ou informe outra condição.');
    }
    $dias = $texto('prazo_dias');
    if ($dias === 'outro') {
        $prazo = $texto('prazo_outro');
        if ($prazo === '') {
            throw new DomainException('Informe o prazo personalizado.');
        }
    } elseif ($dias === '') {
        $prazo = '';
    } elseif (in_array($dias, ['1', '2', '3', '5', '7', '10', '15', '20', '30'], true)) {
        $prazo = 'Execução em até ' . $dias . ($dias === '1' ? ' dia útil' : ' dias úteis') . ($marcado('prazo_importar') || $marcado('prazo_aguardar') ? ' após a chegada da peça.' : '.');
    } else {
        throw new DomainException('Escolha um prazo da lista.');
    }
    if ($prazo === '' && ($marcado('prazo_importar') || $marcado('prazo_aguardar'))) {
        $prazo = 'Prazo de execução a confirmar após a chegada da peça.';
    }
    if ($marcado('prazo_importar')) {
        $prazo .= "\nNecessário importar peça.";
    }
    if ($marcado('prazo_aguardar')) {
        $prazo .= "\nAguardando chegada da peça.";
    }
    $garantiaDias = $texto('garantia_dias');
    if ($garantiaDias === 'outro') {
        $garantia = $texto('garantia_outro');
        if ($garantia === '') {
            throw new DomainException('Informe a garantia personalizada.');
        }
    } elseif (in_array($garantiaDias, ['30', '60', '90', '120'], true)) {
        $garantia = $garantiaDias . ' dias.';
    } else {
        throw new DomainException('Escolha o prazo da garantia.');
    }
    $termo = $texto('termo_garantia_id');
    if ($termo !== '') {
        if (! ctype_digit($termo) || ! isset($termos[(int) $termo])) {
            throw new DomainException('Termo de garantia não encontrado. Reabra o orçamento.');
        }
        $garantia .= "\n" . trifaseOrcamentoTexto($termos[(int) $termo]['textoGarantia']);
    }
    // Usa os mesmos limites e validações do texto publicado, inclusive sem JavaScript.
    $r = trifaseOrcamentoApresentacao(['pagamento' => implode("\n", $pagamento), 'prazo' => trim($prazo), 'garantia' => $garantia]);
    return array_intersect_key($r, array_flip(['pagamento', 'prazo', 'garantia']));
}

/** Reabre textos existentes sem substituir condições personalizadas ou termos antigos. */
function trifaseOrcamentoEscolhas(array $apresentacao, array $termos): array
{
    $pagamento = trim($apresentacao['pagamento'] ?? '');
    $r = ['pagamento_vista' => $pagamento === '', 'pagamento_cartao' => $pagamento === '', 'pagamento_parcelas' => '3', 'pagamento_outro' => '',
        'prazo_dias' => '', 'prazo_outro' => '', 'prazo_importar' => false, 'prazo_aguardar' => false,
        'garantia_dias' => '90', 'garantia_outro' => '', 'termo_garantia_id' => ''];
    if (preg_match('/^À vista\.(?:\R|$)/u', $pagamento)) {
        $r['pagamento_vista'] = true;
        $pagamento = preg_replace('/^À vista\.(?:\R|$)/u', '', $pagamento);
    }
    if (preg_match('/^Parcelado no cartão de crédito em até (\d+) vezes\.(?:\R|$)/u', $pagamento, $m)) {
        $r['pagamento_cartao'] = true;
        $r['pagamento_parcelas'] = $m[1];
        $pagamento = substr($pagamento, strlen($m[0]));
    }
    $r['pagamento_outro'] = trim($pagamento);
    $prazo = trim($apresentacao['prazo'] ?? '');
    foreach (['prazo_aguardar' => 'Aguardando chegada da peça.', 'prazo_importar' => 'Necessário importar peça.'] as $campo => $frase) {
        if (str_ends_with($prazo, $frase)) {
            $r[$campo] = true;
            $prazo = trim(substr($prazo, 0, -strlen($frase)));
        }
    }
    if (preg_match('/^Execução em até (1|2|3|5|7|10|15|20|30) (?:dia útil|dias úteis)( após a chegada da peça)?\.$/u', $prazo, $m)) {
        $r['prazo_dias'] = $m[1];
        if (! empty($m[2]) && ! $r['prazo_importar']) {
            $r['prazo_aguardar'] = true;
        }
    } elseif ($prazo !== '' && $prazo !== 'Prazo de execução a confirmar após a chegada da peça.') {
        $r['prazo_dias'] = 'outro';
        $r['prazo_outro'] = $prazo;
    }
    $garantia = trim($apresentacao['garantia'] ?? '');
    if ($garantia !== '') {
        if (preg_match('/^(30|60|90|120) dias\.?$/u', $garantia, $m)) {
            $r['garantia_dias'] = $m[1];
        } elseif (preg_match('/^(30|60|90|120) dias\.\R(.+)$/us', $garantia, $m)) {
            $r['garantia_dias'] = $m[1];
            foreach ($termos as $id => $t) {
                if (trifaseOrcamentoTexto($t['textoGarantia']) === $m[2]) {
                    $r['termo_garantia_id'] = (string) $id;
                    return $r;
                }
            }
            $r['garantia_dias'] = 'outro';
            $r['garantia_outro'] = $garantia;
        } else {
            $r['garantia_dias'] = 'outro';
            $r['garantia_outro'] = $garantia;
        }
    }
    return $r;
}
