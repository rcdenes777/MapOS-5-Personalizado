<?php

class Migration_trifase_cancelamentos extends CI_Migration
{
    public function up()
    {
        if (! $this->db->table_exists('trifase_cancelamentos')) {
            $this->dbforge->add_field([
                'id' => ['type' => 'INT', 'auto_increment' => true],
                'os_id' => ['type' => 'INT'], 'tipo' => ['type' => 'VARCHAR', 'constraint' => 16],
                'pedido_id' => ['type' => 'INT', 'null' => true],
                'solicitante' => ['type' => 'VARCHAR', 'constraint' => 160],
                'motivo' => ['type' => 'TEXT'], 'retrato' => ['type' => 'TEXT'],
                'usuario_id' => ['type' => 'INT'], 'criado_em' => ['type' => 'DATETIME'],
                'operacao' => ['type' => 'VARCHAR', 'constraint' => 64, 'unique' => true],
                'payload_hash' => ['type' => 'CHAR', 'constraint' => 64],
            ]);
            $this->dbforge->add_key('id', true);
            $this->dbforge->add_key('os_id');
            if (! $this->dbforge->create_table('trifase_cancelamentos', true, $this->db->dbdriver === 'mysqli' ? ['ENGINE' => 'InnoDB'] : [])) {
                throw new RuntimeException('Não foi possível preparar o histórico de cancelamento.');
            }
        }
        if ($this->db->dbdriver === 'mysqli' && $this->db->query('SELECT CONSTRAINT_NAME FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = ?', ['tf_cancelamento_os'])->num_rows() === 0
            && ! $this->db->query('ALTER TABLE trifase_cancelamentos ADD CONSTRAINT tf_cancelamento_os FOREIGN KEY (os_id) REFERENCES os(idOs) ON DELETE RESTRICT ON UPDATE RESTRICT')) {
            throw new RuntimeException('Não foi possível proteger o histórico de cancelamento.');
        }
    }

    public function down()
    {
        throw new RuntimeException('Preserve o histórico de pedidos e confirmações de cancelamento.');
    }
}
