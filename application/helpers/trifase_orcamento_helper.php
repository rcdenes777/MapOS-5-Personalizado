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
    foreach (['equipamento' => 500, 'defeito' => 4000, 'diagnostico' => 4000, 'pagamento' => 1000, 'prazo' => 500, 'garantia' => 1000] as $campo => $limite) {
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
