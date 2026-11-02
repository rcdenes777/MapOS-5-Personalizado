<?php

/** Versões e eventos imutáveis; estado publicado separado do andamento e pagamento. */
class Migration_trifase_orcamentos extends CI_Migration
{
    public function up()
    {
        $this->criar('trifase_orcamento_versoes', [
            'id' => ['type' => 'INT', 'auto_increment' => true], 'os_id' => ['type' => 'INT'], 'numero' => ['type' => 'INT'],
            'conteudo' => ['type' => 'TEXT'], 'conteudo_hash' => ['type' => 'CHAR', 'constraint' => 64],
            'usuario_id' => ['type' => 'INT'], 'criado_em' => ['type' => 'DATETIME'],
        ], 'id');
        $this->criar('trifase_orcamento_eventos', [
            'id' => ['type' => 'INT', 'auto_increment' => true], 'os_id' => ['type' => 'INT'], 'versao_id' => ['type' => 'INT'],
            'tipo' => ['type' => 'VARCHAR', 'constraint' => 16], 'nome' => ['type' => 'VARCHAR', 'constraint' => 160],
            'usuario_id' => ['type' => 'INT', 'null' => true], 'criado_em' => ['type' => 'DATETIME'],
            'decisao_versao' => ['type' => 'INT', 'null' => true, 'unique' => true],
            'operacao' => ['type' => 'VARCHAR', 'constraint' => 64, 'unique' => true], 'payload_hash' => ['type' => 'CHAR', 'constraint' => 64],
        ], 'id');
        $this->criar('trifase_orcamento_estado', [
            'os_id' => ['type' => 'INT'], 'versao_id' => ['type' => 'INT'], 'ativo' => ['type' => 'INT'],
        ], 'os_id');
        if ($this->db->dbdriver === 'mysqli') {
            foreach ([
                ['trifase_orcamento_versoes', 'tf_orc_os', 'os_id', 'os', 'idOs'],
                ['trifase_orcamento_eventos', 'tf_orc_evt_os', 'os_id', 'os', 'idOs'],
                ['trifase_orcamento_eventos', 'tf_orc_evt_ver', 'versao_id', 'trifase_orcamento_versoes', 'id'],
                ['trifase_orcamento_estado', 'tf_orc_est_os', 'os_id', 'os', 'idOs'],
                ['trifase_orcamento_estado', 'tf_orc_est_ver', 'versao_id', 'trifase_orcamento_versoes', 'id'],
            ] as [$tabela, $nome, $coluna, $destino, $chave]) {
                if ($this->db->query('SELECT CONSTRAINT_NAME FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?', [$tabela, $nome])->num_rows() === 0
                    && ! $this->db->query("ALTER TABLE `{$tabela}` ADD CONSTRAINT `{$nome}` FOREIGN KEY (`{$coluna}`) REFERENCES `{$destino}` (`{$chave}`) ON DELETE RESTRICT ON UPDATE RESTRICT")) {
                    throw new RuntimeException('Não foi possível proteger o histórico de orçamento.');
                }
            }
        }
    }

    private function criar(string $nome, array $campos, string $chave): void
    {
        if ($this->db->table_exists($nome)) {
            return;
        }
        $this->dbforge->add_field($campos);
        $this->dbforge->add_key($chave, true);
        if (! $this->dbforge->create_table($nome, true, $this->db->dbdriver === 'mysqli' ? ['ENGINE' => 'InnoDB'] : [])) {
            throw new RuntimeException('Não foi possível preparar os orçamentos.');
        }
    }

    public function down()
    {
        throw new RuntimeException('Desligue a extensão sem apagar versões e decisões.');
    }
}
