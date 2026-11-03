<?php

/** Correções explícitas do retrato da OS, sem reescrever o cadastro da unidade. */
class Migration_trifase_equipamento_correcoes extends CI_Migration
{
    public function up()
    {
        if ($this->db->table_exists('trifase_equipamento_correcoes')) {
            return;
        }
        $this->dbforge->add_field([
            'id' => ['type' => 'INT', 'auto_increment' => true],
            'os_id' => ['type' => 'INT'], 'usuario_id' => ['type' => 'INT'],
            'antes' => ['type' => 'LONGTEXT'], 'depois' => ['type' => 'LONGTEXT'],
            'motivo' => ['type' => 'TEXT'], 'criado_em' => ['type' => 'DATETIME'],
            'operacao' => ['type' => 'VARCHAR', 'constraint' => 64, 'unique' => true],
            'payload_hash' => ['type' => 'CHAR', 'constraint' => 64],
        ]);
        $this->dbforge->add_key('id', true);
        $this->dbforge->add_key('os_id');
        if (! $this->dbforge->create_table('trifase_equipamento_correcoes', true, $this->db->dbdriver === 'mysqli' ? ['ENGINE' => 'InnoDB'] : [])) {
            throw new RuntimeException('Não foi possível preparar o histórico de correções.');
        }
    }

    public function down()
    {
        throw new RuntimeException('Preserve o histórico de correções da identificação.');
    }
}
