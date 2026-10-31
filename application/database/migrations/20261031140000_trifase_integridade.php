<?php

/** Somente tabelas da extensão: recusa registros órfãos, sem apagar ou corrigir dados. */
class Migration_trifase_integridade extends CI_Migration
{
    public function up()
    {
        if ($this->db->dbdriver !== 'mysqli') {
            return;
        }
        foreach ([
            ['trifase_financeiro_obrigacoes', 'tf_ob_os', 'os_id', 'os', 'idOs'],
            ['trifase_financeiro_obrigacoes', 'tf_ob_lan', 'principal_id', 'lancamentos', 'idLancamentos'],
            ['trifase_financeiro_eventos', 'tf_ev_os', 'os_id', 'trifase_financeiro_obrigacoes', 'os_id'],
            ['trifase_financeiro_eventos', 'tf_ev_lan', 'lancamento_id', 'lancamentos', 'idLancamentos'],
            ['trifase_financeiro_eventos', 'tf_ev_ref', 'referencia_id', 'trifase_financeiro_eventos', 'id'],
            ['trifase_financeiro_projecoes', 'tf_pr_os', 'os_id', 'trifase_financeiro_obrigacoes', 'os_id'],
            ['trifase_financeiro_projecoes', 'tf_pr_lan', 'lancamento_id', 'lancamentos', 'idLancamentos'],
        ] as [$tabela, $nome, $coluna, $destino, $chave]) {
            $existe = $this->db->query('SELECT CONSTRAINT_NAME FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?', [$tabela, $nome])->num_rows() > 0;
            // Identificadores constantes desta migração; nunca vêm de entrada do usuário.
            if (! $existe && ! $this->db->query("ALTER TABLE `{$tabela}` ADD CONSTRAINT `{$nome}` FOREIGN KEY (`{$coluna}`) REFERENCES `{$destino}` (`{$chave}`) ON DELETE RESTRICT ON UPDATE RESTRICT")) {
                throw new RuntimeException('Há vínculo inconsistente ou não foi possível aplicar a integridade Trifase.');
            }
        }
    }

    public function down()
    {
        throw new RuntimeException('A reversão deve preservar o histórico financeiro e os seus vínculos.');
    }
}
