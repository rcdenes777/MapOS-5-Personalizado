<?php

/** Histórico privado: classificações e correções não substituem retratos de OS. */
class Migration_trifase_cadastros extends CI_Migration
{
    public function up()
    {
        if ($this->db->table_exists('trifase_cadastros_eventos')) {
            return;
        }
        $this->dbforge->add_field([
            'id' => ['type' => 'INT', 'auto_increment' => true],
            'tipo' => ['type' => 'VARCHAR', 'constraint' => 24], 'recurso_id' => ['type' => 'INT'],
            'antes' => ['type' => 'TEXT'], 'depois' => ['type' => 'TEXT'], 'motivo' => ['type' => 'TEXT'],
            'usuario_id' => ['type' => 'INT'], 'criado_em' => ['type' => 'DATETIME'],
            'operacao' => ['type' => 'VARCHAR', 'constraint' => 64, 'unique' => true],
            'payload_hash' => ['type' => 'CHAR', 'constraint' => 64],
        ]);
        $this->dbforge->add_key('id', true);
        $this->dbforge->add_key(['tipo', 'recurso_id']);
        if (! $this->dbforge->create_table('trifase_cadastros_eventos', true, $this->db->dbdriver === 'mysqli' ? ['ENGINE' => 'InnoDB'] : [])) {
            throw new RuntimeException('Não foi possível preparar o histórico de cadastros.');
        }
    }

    public function down()
    {
        throw new RuntimeException('Preserve o histórico; desligue a extensão sem apagar dados.');
    }
}
