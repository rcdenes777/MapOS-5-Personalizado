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
    foreach (['trifase_os_custos', 'trifase_financeiro_obrigacoes', 'trifase_entregas_eventos', 'trifase_orcamento_versoes', 'trifase_atendimentos'] as $tabela) {
        if ($db->table_exists($tabela) && $db->from($tabela . ' tf_protegido')->join('os', 'os.idOs = tf_protegido.os_id')->where('os.clientes_id', $id)->count_all_results()) {
            return true;
        }
    }
    return false;
}
