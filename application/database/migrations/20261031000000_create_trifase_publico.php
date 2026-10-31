<?php

/** Tabelas próprias da extensão; não altera os, anexos ou banco.sql. */
class Migration_create_trifase_publico extends CI_Migration
{
    public function up()
    {
        if (! $this->db->table_exists('trifase_publico_links')) {
            $this->dbforge->add_field([
                'os_id' => ['type' => 'INT', 'constraint' => 11],
                'token_hash' => ['type' => 'VARCHAR', 'constraint' => 64, 'null' => true],
                'expira_em' => ['type' => 'BIGINT', 'null' => true],
                'usuario_id' => ['type' => 'INT', 'constraint' => 11],
            ]);
            $this->dbforge->add_key('os_id', true);
            $this->dbforge->add_key('token_hash', false, true);
            if (! $this->dbforge->create_table('trifase_publico_links', true, ['ENGINE' => 'InnoDB'])) {
                throw new RuntimeException('Não foi possível criar as tabelas do módulo público.');
            }
        }
        if (! $this->db->table_exists('trifase_publico_anexos')) {
            $this->dbforge->add_field([
                'os_id' => ['type' => 'INT', 'constraint' => 11],
                'anexo_id' => ['type' => 'INT', 'constraint' => 11],
            ]);
            $this->dbforge->add_key(['os_id', 'anexo_id'], true);
            if (! $this->dbforge->create_table('trifase_publico_anexos', true, ['ENGINE' => 'InnoDB'])) {
                throw new RuntimeException('Não foi possível criar a seleção pública de anexos.');
            }
        }
    }

    public function down()
    {
        $this->dbforge->drop_table('trifase_publico_anexos', true);
        $this->dbforge->drop_table('trifase_publico_links', true);
    }
}
