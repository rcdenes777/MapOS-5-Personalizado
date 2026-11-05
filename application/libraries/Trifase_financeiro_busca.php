<?php

/** Projeção somente de leitura: filtra antes de contar/paginar, sem N+1. */
final class Trifase_financeiro_busca
{
    public const OPCOES = [
        'nao_faturada' => 'Não faturada',
        'pendente' => 'Em aberto',
        'parcial' => 'Parcialmente paga',
        'quitada' => 'Quitada',
        'anterior' => 'Faturamento anterior',
        'reembolsada' => 'Reembolsada',
        'encerrada_garantia' => 'Encerrada por garantia',
        'cancelamento_pendente' => 'Cancelamentos pendentes',
    ];

    public static function ativo(array $filtros): bool
    {
        return isset(self::OPCOES[$filtros['financeiro'] ?? '']) || ($filtros['saldo'] ?? '') === 'pendente';
    }

    public static function aplicar(object $db, array $filtros): void
    {
        if (($filtros['financeiro'] ?? '') === 'cancelamento_pendente') {
            if (! $db->table_exists('trifase_cancelamentos')) {
                $db->where('1 = 0', null, false);
            } else {
                $db->where("os.status != 'Cancelado' AND COALESCE((SELECT tfc.tipo FROM trifase_cancelamentos tfc WHERE tfc.os_id = os.idOs AND tfc.tipo IN ('solicitar', 'retirar', 'confirmar') ORDER BY tfc.id DESC LIMIT 1), '') = 'solicitar'", null, false);
            }
            if (($filtros['saldo'] ?? '') !== 'pendente') {
                return;
            }
        }
        if (! self::ativo($filtros) || ! trifaseFinanceiroHabilitado()
            || ! $db->table_exists('trifase_financeiro_obrigacoes') || ! $db->table_exists('trifase_financeiro_eventos')) {
            return;
        }
        // Mesma aritmética inteira de resumos()/trifaseGarantiaResumo():
        // recebimentos menos estornos e reembolsos; obrigação menos créditos ativos.
        $eventos = "(SELECT os_id, SUM(CASE WHEN tipo = 'receber' THEN valor_c WHEN tipo = 'estornar' THEN -valor_c ELSE 0 END) AS recebido_c, SUM(CASE WHEN tipo = 'devolver' THEN valor_c ELSE 0 END) AS devolvido_c FROM trifase_financeiro_eventos GROUP BY os_id)";
        $creditos = $db->table_exists('trifase_garantia_reembolsos')
            ? '(SELECT origem_id, SUM(valor_c) AS reembolsado_c, SUM(credito_c) AS credito_c FROM trifase_garantia_reembolsos WHERE cancelado_id IS NULL GROUP BY origem_id)'
            : '(SELECT NULL AS origem_id, 0 AS reembolsado_c, 0 AS credito_c)';
        $projecao = '(SELECT o.os_id, o.bruto_c - o.desconto_c - COALESCE(c.credito_c, 0) AS total_c,'
            . ' COALESCE(e.recebido_c, 0) - COALESCE(e.devolvido_c, 0) - COALESCE(c.reembolsado_c, 0) AS recebido_c,'
            . ' COALESCE(c.credito_c, 0) AS credito_c, COALESCE(e.devolvido_c, 0) + COALESCE(c.reembolsado_c, 0) AS reembolsado_c'
            . ' FROM trifase_financeiro_obrigacoes o LEFT JOIN ' . $eventos . ' e ON e.os_id = o.os_id'
            . ' LEFT JOIN ' . $creditos . ' c ON c.origem_id = o.os_id) tf_os_financeiro';
        $db->join($projecao, 'tf_os_financeiro.os_id = os.idOs', 'left', false);
        if (isset(self::OPCOES[$filtros['financeiro'] ?? '']) && $filtros['financeiro'] !== 'cancelamento_pendente') {
            $situacao = "CASE WHEN tf_os_financeiro.os_id IS NULL THEN CASE WHEN COALESCE(os.faturado, 0) = 1 THEN 'anterior' ELSE 'nao_faturada' END"
                . " WHEN tf_os_financeiro.total_c = 0 AND tf_os_financeiro.credito_c > 0 THEN CASE WHEN tf_os_financeiro.reembolsado_c > 0 THEN 'reembolsada' ELSE 'encerrada_garantia' END"
                . " WHEN tf_os_financeiro.recebido_c = 0 THEN 'pendente'"
                . " WHEN tf_os_financeiro.recebido_c = tf_os_financeiro.total_c THEN 'quitada' ELSE 'parcial' END";
            $db->where('(' . $situacao . ') = ' . $db->escape($filtros['financeiro']), null, false);
        }
        if (($filtros['saldo'] ?? '') === 'pendente') {
            $db->where('tf_os_financeiro.total_c > tf_os_financeiro.recebido_c', null, false);
        }
    }
}
