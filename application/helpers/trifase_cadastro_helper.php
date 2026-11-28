<?php

function trifaseCadastrosHabilitados(): bool
{
    return filter_var($_ENV['TRIFASE_CADASTROS_ENABLED'] ?? false, FILTER_VALIDATE_BOOLEAN);
}

function trifaseCategoriasClientes(): array
{
    return ['nao_classificado' => 'Não classificado', 'bronze' => 'Bronze', 'prata' => 'Prata', 'ouro' => 'Ouro'];
}

/** O Financeiro também pode classificar e anotar orientações internas, sem editar o cadastro completo do cliente. */
function trifasePodeClassificarCliente(callable $permite): bool
{
    return $permite('vCliente') && ($permite('eCliente') || ($permite('vLancamento') && $permite('eLancamento')));
}

function trifaseCadastroTemHistorico(object $db, string $tipo, int $id): bool
{
    return $db->table_exists('trifase_cadastros_eventos')
        && $db->where('tipo', $tipo)->where('recurso_id', $id)->count_all_results('trifase_cadastros_eventos') > 0;
}

/** Evita que a exclusão em cascata nativa apague itens antes de encontrar um vínculo protegido. */
function trifaseClienteTemHistoricoProtegido(object $db, int $id): bool
{
    if (trifaseCadastroTemHistorico($db, 'cliente', $id)) {
        return true;
    }
    if ($db->table_exists('trifase_equipamentos') && $db->where('cliente_id', $id)->count_all_results('trifase_equipamentos')) {
        return true;
    }
    // Financeiro e cadastros legados: nunca apagar em cascata, recusar com mensagem clara.
    foreach (['lancamentos' => 'clientes_id', 'cobrancas' => 'clientes_id', 'equipamentos' => 'clientes_id'] as $tabela => $coluna) {
        if ($db->table_exists($tabela) && $db->field_exists($coluna, $tabela) && $db->where($coluna, $id)->count_all_results($tabela)) {
            return true;
        }
    }
    $porOs = ['trifase_os_custos', 'trifase_financeiro_obrigacoes', 'trifase_entregas_eventos', 'trifase_orcamento_versoes',
        'trifase_atendimentos', 'trifase_cancelamentos', 'trifase_entregas_estado', 'trifase_orcamento_estado',
        'trifase_orcamento_eventos', 'trifase_garantia_operacoes', 'trifase_garantia_reembolsos',
        'trifase_garantia_retornos', 'trifase_garantia_trocas', 'os_financeiro', 'os_recebimentos', 'os_revisoes_orcamento'];
    foreach ($porOs as $tabela) {
        if ($db->table_exists($tabela) && $db->from($tabela . ' tf_protegido')->join('os', 'os.idOs = tf_protegido.os_id')->where('os.clientes_id', $id)->count_all_results()) {
            return true;
        }
    }
    return $db->table_exists('trifase_estoque_eventos')
        && $db->field_exists('os_id', 'trifase_estoque_eventos')
        && $db->from('trifase_estoque_eventos tf_estoque')->join('os', 'os.idOs = tf_estoque.os_id')
            ->where('os.clientes_id', $id)->count_all_results() > 0;
}
