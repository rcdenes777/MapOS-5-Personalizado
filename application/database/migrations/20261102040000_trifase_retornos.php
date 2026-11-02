<?php

/** Retorno é outro atendimento; origem, prazo e decisões não são reescritos. */
class Migration_trifase_retornos extends CI_Migration
{
    public function up()
    {
        $this->criar('trifase_garantia_retornos', [
            'os_id' => ['type' => 'INT'], 'origem_id' => ['type' => 'INT'], 'anterior_id' => ['type' => 'INT'],
            'equipamento_id' => ['type' => 'INT'], 'cliente_id' => ['type' => 'INT'],
            'conclusao_origem' => ['type' => 'DATE'], 'prazo_origem' => ['type' => 'INT'], 'vencimento_origem' => ['type' => 'DATE', 'null' => true],
            'usuario_id' => ['type' => 'INT'], 'criado_em' => ['type' => 'DATETIME'],
            'operacao' => ['type' => 'VARCHAR', 'constraint' => 64, 'unique' => true], 'payload_hash' => ['type' => 'CHAR', 'constraint' => 64],
        ], 'os_id');
        $this->criar('trifase_garantia_eventos', [
            'id' => ['type' => 'INT', 'auto_increment' => true], 'os_id' => ['type' => 'INT'],
            'tipo' => ['type' => 'VARCHAR', 'constraint' => 20], 'cobertura' => ['type' => 'VARCHAR', 'constraint' => 20],
            'diagnostico' => ['type' => 'TEXT'], 'solucao' => ['type' => 'VARCHAR', 'constraint' => 24], 'motivo' => ['type' => 'TEXT'],
            'valor_c' => ['type' => 'BIGINT', 'default' => 0], 'minutos' => ['type' => 'INT', 'default' => 0],
            'referencia_id' => ['type' => 'INT', 'null' => true, 'unique' => true],
            'usuario_id' => ['type' => 'INT'], 'criado_em' => ['type' => 'DATETIME'],
            'operacao' => ['type' => 'VARCHAR', 'constraint' => 64, 'unique' => true], 'payload_hash' => ['type' => 'CHAR', 'constraint' => 64],
        ], 'id');
        if ($this->db->dbdriver === 'mysqli') {
            foreach ([
                ['trifase_garantia_retornos', 'tf_ret_os', 'os_id', 'os', 'idOs'],
                ['trifase_garantia_retornos', 'tf_ret_origem', 'origem_id', 'os', 'idOs'],
                ['trifase_garantia_retornos', 'tf_ret_anterior', 'anterior_id', 'os', 'idOs'],
                ['trifase_garantia_retornos', 'tf_ret_unidade', 'equipamento_id', 'trifase_equipamentos', 'id'],
                ['trifase_garantia_eventos', 'tf_ret_evt_os', 'os_id', 'trifase_garantia_retornos', 'os_id'],
                ['trifase_garantia_eventos', 'tf_ret_evt_ref', 'referencia_id', 'trifase_garantia_eventos', 'id'],
            ] as [$tabela, $nome, $coluna, $destino, $chave]) {
                if ($this->db->query('SELECT CONSTRAINT_NAME FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?', [$tabela, $nome])->num_rows() === 0
                    && ! $this->db->query("ALTER TABLE `{$tabela}` ADD CONSTRAINT `{$nome}` FOREIGN KEY (`{$coluna}`) REFERENCES `{$destino}` (`{$chave}`) ON DELETE RESTRICT ON UPDATE RESTRICT")) {
                    throw new RuntimeException('Não foi possível proteger o histórico de retorno.');
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
            throw new RuntimeException('Não foi possível preparar os retornos.');
        }
    }

    public function down()
    {
        throw new RuntimeException('Desligue a extensão sem apagar o histórico de garantia.');
    }
}
