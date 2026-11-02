<?php

/** Conclusão técnica e prazo independentes da existência de receita. */
class Migration_trifase_atendimentos extends CI_Migration
{
    public function up()
    {
        if (! $this->db->table_exists('trifase_atendimentos')) {
            $this->dbforge->add_field([
                'os_id' => ['type' => 'INT'], 'concluido_em' => ['type' => 'DATE'], 'garantia_dias' => ['type' => 'INT'],
                'usuario_id' => ['type' => 'INT'], 'registrado_em' => ['type' => 'DATETIME'],
            ]);
            $this->dbforge->add_key('os_id', true);
            if (! $this->dbforge->create_table('trifase_atendimentos', true, $this->db->dbdriver === 'mysqli' ? ['ENGINE' => 'InnoDB'] : [])) {
                throw new RuntimeException('Não foi possível preparar a conclusão técnica.');
            }
        }
        if ($this->db->dbdriver === 'mysqli'
            && $this->db->query('SELECT CONSTRAINT_NAME FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?', ['trifase_atendimentos', 'tf_atend_os'])->num_rows() === 0
            && ! $this->db->query('ALTER TABLE trifase_atendimentos ADD CONSTRAINT tf_atend_os FOREIGN KEY (os_id) REFERENCES os(idOs) ON DELETE RESTRICT ON UPDATE RESTRICT')) {
            throw new RuntimeException('Não foi possível proteger a conclusão técnica.');
        }
    }

    public function down()
    {
        throw new RuntimeException('Desligue a função sem apagar conclusões e prazos registrados.');
    }
}
