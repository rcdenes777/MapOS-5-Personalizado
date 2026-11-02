<?php

/** Aditiva: retirada física independe de conclusão, faturamento e garantia. */
class Migration_trifase_entregas extends CI_Migration
{
    public function up()
    {
        $this->criar('trifase_entregas_eventos', [
            'id' => ['type' => 'INT', 'auto_increment' => true], 'os_id' => ['type' => 'INT'],
            'tipo' => ['type' => 'VARCHAR', 'constraint' => 16],
            'referencia_id' => ['type' => 'INT', 'null' => true, 'unique' => true],
            'entregue_em' => ['type' => 'DATETIME', 'null' => true],
            'registrado_em' => ['type' => 'DATETIME'], 'usuario_id' => ['type' => 'INT'],
            'recebedor' => ['type' => 'VARCHAR', 'constraint' => 150, 'null' => true],
            'terceiro' => ['type' => 'INT', 'default' => 0],
            'autorizacao' => ['type' => 'VARCHAR', 'constraint' => 500, 'null' => true],
            'equipamento' => ['type' => 'TEXT', 'null' => true],
            'itens' => ['type' => 'TEXT', 'null' => true],
            'observacoes' => ['type' => 'TEXT', 'null' => true],
            'confirmou_condicoes' => ['type' => 'INT', 'default' => 0],
            'motivo' => ['type' => 'VARCHAR', 'constraint' => 500, 'null' => true],
            'operacao' => ['type' => 'VARCHAR', 'constraint' => 64, 'unique' => true],
            'payload_hash' => ['type' => 'CHAR', 'constraint' => 64],
        ], 'id');
        $this->criar('trifase_entregas_estado', [
            'os_id' => ['type' => 'INT'], 'evento_id' => ['type' => 'INT', 'unique' => true],
        ], 'os_id');
        if ($this->db->dbdriver === 'mysqli') {
            foreach ([
                ['trifase_entregas_eventos', 'tf_ent_os', 'os_id', 'os', 'idOs'],
                ['trifase_entregas_eventos', 'tf_ent_ref', 'referencia_id', 'trifase_entregas_eventos', 'id'],
                ['trifase_entregas_estado', 'tf_ent_est_os', 'os_id', 'os', 'idOs'],
                ['trifase_entregas_estado', 'tf_ent_est_ev', 'evento_id', 'trifase_entregas_eventos', 'id'],
            ] as [$tabela, $nome, $coluna, $destino, $chave]) {
                if ($this->db->query('SELECT CONSTRAINT_NAME FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?', [$tabela, $nome])->num_rows() === 0
                    && ! $this->db->query("ALTER TABLE `{$tabela}` ADD CONSTRAINT `{$nome}` FOREIGN KEY (`{$coluna}`) REFERENCES `{$destino}` (`{$chave}`) ON DELETE RESTRICT ON UPDATE RESTRICT")) {
                    throw new RuntimeException('Não foi possível proteger os vínculos de entrega.');
                }
            }
        }
    }

    private function criar(string $tabela, array $campos, string $chave): void
    {
        if ($this->db->table_exists($tabela)) {
            return;
        }
        $this->dbforge->add_field($campos);
        $this->dbforge->add_key($chave, true);
        if (! $this->dbforge->create_table($tabela, true, $this->db->dbdriver === 'mysqli' ? ['ENGINE' => 'InnoDB'] : [])) {
            throw new RuntimeException('Não foi possível preparar o histórico de entregas.');
        }
    }

    public function down()
    {
        throw new RuntimeException('Preserve o histórico de retirada. Desligar o módulo não apaga seus registros.');
    }
}
