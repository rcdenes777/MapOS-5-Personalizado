<?php

/** Catálogo reutilizável, unidade física e retrato histórico por OS. */
class Migration_trifase_equipamentos extends CI_Migration
{
    public function up()
    {
        $this->criar('trifase_equipamento_modelos', [
            'id' => ['type' => 'INT', 'auto_increment' => true], 'tipo' => ['type' => 'VARCHAR', 'constraint' => 24],
            'marca' => ['type' => 'VARCHAR', 'constraint' => 100], 'modelo' => ['type' => 'VARCHAR', 'constraint' => 160],
            'chave' => ['type' => 'CHAR', 'constraint' => 64, 'unique' => true],
            'usuario_id' => ['type' => 'INT'], 'atualizado_em' => ['type' => 'DATETIME'],
        ], 'id');
        $this->criar('trifase_equipamentos', [
            'id' => ['type' => 'INT', 'auto_increment' => true], 'modelo_id' => ['type' => 'INT'], 'cliente_id' => ['type' => 'INT'],
            'selo' => ['type' => 'VARCHAR', 'constraint' => 100], 'selo_chave' => ['type' => 'CHAR', 'constraint' => 64, 'unique' => true, 'null' => true],
            'serie' => ['type' => 'VARCHAR', 'constraint' => 100], 'imei' => ['type' => 'VARCHAR', 'constraint' => 100],
            'usuario_id' => ['type' => 'INT'], 'criado_em' => ['type' => 'DATETIME'],
        ], 'id');
        $this->criar('trifase_os_equipamentos', [
            'os_id' => ['type' => 'INT'], 'equipamento_id' => ['type' => 'INT'],
            'tipo' => ['type' => 'VARCHAR', 'constraint' => 24], 'marca' => ['type' => 'VARCHAR', 'constraint' => 100],
            'modelo' => ['type' => 'VARCHAR', 'constraint' => 160], 'selo' => ['type' => 'VARCHAR', 'constraint' => 100],
            'serie' => ['type' => 'VARCHAR', 'constraint' => 100], 'imei' => ['type' => 'VARCHAR', 'constraint' => 100],
            'itens_recebidos' => ['type' => 'TEXT'], 'estado_entrada' => ['type' => 'TEXT'],
            'usuario_id' => ['type' => 'INT'], 'vinculado_em' => ['type' => 'DATETIME'],
            'operacao' => ['type' => 'VARCHAR', 'constraint' => 64, 'unique' => true], 'payload_hash' => ['type' => 'CHAR', 'constraint' => 64],
        ], 'os_id');
        if ($this->db->dbdriver === 'mysqli') {
            foreach ([
                ['trifase_equipamentos', 'tf_eq_modelo', 'modelo_id', 'trifase_equipamento_modelos', 'id'],
                ['trifase_equipamentos', 'tf_eq_cliente', 'cliente_id', 'clientes', 'idClientes'],
                ['trifase_os_equipamentos', 'tf_eq_os', 'os_id', 'os', 'idOs'],
                ['trifase_os_equipamentos', 'tf_eq_unidade', 'equipamento_id', 'trifase_equipamentos', 'id'],
            ] as [$tabela, $nome, $coluna, $destino, $chave]) {
                if ($this->db->query('SELECT CONSTRAINT_NAME FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?', [$tabela, $nome])->num_rows() === 0
                    && ! $this->db->query("ALTER TABLE `{$tabela}` ADD CONSTRAINT `{$nome}` FOREIGN KEY (`{$coluna}`) REFERENCES `{$destino}` (`{$chave}`) ON DELETE RESTRICT ON UPDATE RESTRICT")) {
                    throw new RuntimeException('Não foi possível proteger os vínculos dos equipamentos.');
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
            throw new RuntimeException('Não foi possível preparar a identificação dos equipamentos.');
        }
    }

    public function down()
    {
        throw new RuntimeException('Desligue a extensão sem apagar a identificação e o histórico dos equipamentos.');
    }
}
