<?php
class Migration_trifase_estoque_custos extends CI_Migration
{
    public function up()
    {
        $this->criar('trifase_estoque_eventos', [
            'produto_id' => ['type' => 'INT'], 'tipo' => ['type' => 'VARCHAR', 'constraint' => 32],
            'origem' => ['type' => 'VARCHAR', 'constraint' => 100],
            'quantidade' => ['type' => 'INT'], 'saldo_antes' => ['type' => 'INT'], 'saldo_depois' => ['type' => 'INT'],
            'custo_unitario_c' => ['type' => 'BIGINT', 'null' => true], 'data_movimento' => ['type' => 'DATE'],
            'motivo' => ['type' => 'TEXT'],
        ]);
        $this->criar('trifase_os_custos', [
            'os_id' => ['type' => 'INT'], 'item_id' => ['type' => 'INT'],
            'tipo' => ['type' => 'VARCHAR', 'constraint' => 16], 'quantidade' => ['type' => 'INT'],
            'custo_unitario_c' => ['type' => 'BIGINT', 'null' => true],
            'descricao' => ['type' => 'TEXT'], 'origem' => ['type' => 'VARCHAR', 'constraint' => 100],
        ]);
        $this->criar('trifase_servico_custos', [
            'servico_id' => ['type' => 'INT'], 'valor_c' => ['type' => 'BIGINT'], 'motivo' => ['type' => 'TEXT'],
            'anterior' => ['type' => 'INT'],
        ]);
        if ($this->db->dbdriver === 'mysqli') {
            foreach ([['trifase_estoque_eventos', 'tf_est_prod', 'produto_id', 'produtos', 'idProdutos'],
                ['trifase_os_custos', 'tf_custo_os', 'os_id', 'os', 'idOs'],
                ['trifase_servico_custos', 'tf_custo_servico', 'servico_id', 'servicos', 'idServicos']] as [$t, $n, $c, $d, $pk]) {
                if ($this->db->query('SELECT CONSTRAINT_NAME FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?', [$t, $n])->num_rows() === 0
                    && ! $this->db->query("ALTER TABLE `{$t}` ADD CONSTRAINT `{$n}` FOREIGN KEY (`{$c}`) REFERENCES `{$d}` (`{$pk}`) ON DELETE RESTRICT ON UPDATE RESTRICT")) {
                    throw new RuntimeException('Não foi possível proteger o histórico de estoque e custos.');
                }
            }
        }
    }
    private function criar(string $tabela, array $campos): void
    {
        if ($this->db->table_exists($tabela)) {
            return;
        }
        $this->dbforge->add_field(['id' => ['type' => 'INT', 'auto_increment' => true]] + $campos + [
            'usuario_id' => ['type' => 'INT'], 'criado_em' => ['type' => 'DATETIME'],
            'operacao' => ['type' => 'VARCHAR', 'constraint' => 64, 'unique' => true], 'payload_hash' => ['type' => 'CHAR', 'constraint' => 64],
        ]);
        $this->dbforge->add_key('id', true);
        if (! $this->dbforge->create_table($tabela, true, $this->db->dbdriver === 'mysqli' ? ['ENGINE' => 'InnoDB'] : [])) {
            throw new RuntimeException('Não foi possível preparar estoque e custos.');
        }
    }
    public function down()
    {
        throw new RuntimeException('Preserve os movimentos e custos históricos; desligue a extensão sem apagá-los.');
    }
}
