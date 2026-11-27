<?php

/** Link de cliente é separado dos links individuais de OS. */
class Migration_trifase_cliente_publico extends CI_Migration
{
    public function up()
    {
        if (! $this->db->table_exists('trifase_cliente_publico_links')) {
            $this->dbforge->add_field([
                'cliente_id' => ['type' => 'INT', 'constraint' => 11],
                'token_hash' => ['type' => 'VARCHAR', 'constraint' => 64, 'null' => true],
                'token_cifrado' => ['type' => 'TEXT', 'null' => true],
                'expira_em' => ['type' => 'BIGINT', 'null' => true],
                'usuario_id' => ['type' => 'INT', 'constraint' => 11],
            ]);
            $this->dbforge->add_key('cliente_id', true);
            $this->dbforge->add_key('token_hash', false, true);
            if (! $this->dbforge->create_table('trifase_cliente_publico_links', true, $this->db->dbdriver === 'mysqli' ? ['ENGINE' => 'InnoDB'] : [])) {
                throw new RuntimeException('Não foi possível criar links públicos de cliente.');
            }
        }
    }

    public function down()
    {
        $this->dbforge->drop_table('trifase_cliente_publico_links', true);
    }
}
