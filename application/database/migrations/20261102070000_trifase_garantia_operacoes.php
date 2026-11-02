<?php
/** Operações efetivas, separadas da decisão técnica e dos recebimentos originais. */
class Migration_trifase_garantia_operacoes extends CI_Migration
{
    public function up()
    {
        $this->criar('trifase_garantia_operacoes', [
            'os_id' => ['type' => 'INT'], 'origem_id' => ['type' => 'INT'], 'avaliacao_id' => ['type' => 'INT'],
            'tipo' => ['type' => 'VARCHAR', 'constraint' => 32], 'dados' => ['type' => 'TEXT'],
            'usuario_id' => ['type' => 'INT'], 'criado_em' => ['type' => 'DATETIME'],
            'operacao' => ['type' => 'VARCHAR', 'constraint' => 64, 'unique' => true], 'payload_hash' => ['type' => 'CHAR', 'constraint' => 64],
        ]);
        $this->criar('trifase_garantia_trocas', [
            'os_id' => ['type' => 'INT', 'unique' => true], 'origem_id' => ['type' => 'INT'],
            'evento_id' => ['type' => 'INT', 'unique' => true], 'antiga_id' => ['type' => 'INT', 'unique' => true],
            'nova_id' => ['type' => 'INT', 'unique' => true], 'produto_id' => ['type' => 'INT', 'null' => true],
            'identificacao' => ['type' => 'TEXT'], 'destino_antiga' => ['type' => 'VARCHAR', 'constraint' => 32],
            'custo_c' => ['type' => 'BIGINT', 'null' => true],
        ]);
        $this->criar('trifase_garantia_reembolsos', [
            'os_id' => ['type' => 'INT'], 'origem_id' => ['type' => 'INT'], 'evento_id' => ['type' => 'INT', 'unique' => true],
            'valor_c' => ['type' => 'INT'], 'credito_c' => ['type' => 'INT'], 'modo' => ['type' => 'VARCHAR', 'constraint' => 16],
            'data_evento' => ['type' => 'DATE'], 'forma' => ['type' => 'VARCHAR', 'constraint' => 64],
            'referencia' => ['type' => 'VARCHAR', 'constraint' => 300], 'motivo' => ['type' => 'TEXT'],
            'despesa_id' => ['type' => 'INT', 'unique' => true], 'cancelado_id' => ['type' => 'INT', 'null' => true, 'unique' => true],
        ]);
        if ($this->db->dbdriver === 'mysqli') {
            foreach ([
                ['trifase_garantia_operacoes','tf_gop_os','os_id','os','idOs'],
                ['trifase_garantia_operacoes','tf_gop_raiz','origem_id','os','idOs'],
                ['trifase_garantia_operacoes','tf_gop_av','avaliacao_id','trifase_garantia_eventos','id'],
                ['trifase_garantia_trocas','tf_gt_os','os_id','os','idOs'],
                ['trifase_garantia_trocas','tf_gt_evento','evento_id','trifase_garantia_operacoes','id'],
                ['trifase_garantia_trocas','tf_gt_antiga','antiga_id','trifase_equipamentos','id'],
                ['trifase_garantia_trocas','tf_gt_nova','nova_id','trifase_equipamentos','id'],
                ['trifase_garantia_trocas','tf_gt_prod','produto_id','produtos','idProdutos'],
                ['trifase_garantia_reembolsos','tf_gr_os','os_id','os','idOs'],
                ['trifase_garantia_reembolsos','tf_gr_evento','evento_id','trifase_garantia_operacoes','id'],
                ['trifase_garantia_reembolsos','tf_gr_despesa','despesa_id','lancamentos','idLancamentos'],
                ['trifase_garantia_reembolsos','tf_gr_cancel','cancelado_id','trifase_garantia_operacoes','id'],
            ] as [$t,$n,$c,$d,$pk]) {
                if ($this->db->query('SELECT CONSTRAINT_NAME FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?', [$t,$n])->num_rows() === 0
                    && ! $this->db->query("ALTER TABLE `{$t}` ADD CONSTRAINT `{$n}` FOREIGN KEY (`{$c}`) REFERENCES `{$d}` (`{$pk}`) ON DELETE RESTRICT ON UPDATE RESTRICT")) {
                    throw new RuntimeException('Não foi possível proteger as operações de garantia.');
                }
            }
        }
    }
    private function criar(string $t, array $campos): void
    {
        if ($this->db->table_exists($t)) {
            return;
        }
        $this->dbforge->add_field(['id' => ['type' => 'INT', 'auto_increment' => true]] + $campos);
        $this->dbforge->add_key('id', true);
        if (isset($campos['os_id']) && empty($campos['os_id']['unique'])) {
            $this->dbforge->add_key('os_id');
        }
        if (isset($campos['origem_id'])) {
            $this->dbforge->add_key('origem_id');
        }
        if (! $this->dbforge->create_table($t, true, $this->db->dbdriver === 'mysqli' ? ['ENGINE' => 'InnoDB'] : [])) {
            throw new RuntimeException('Falha ao preparar operações de garantia.');
        }
    }
    public function down()
    {
        throw new RuntimeException('Preserve trocas e devoluções; reversão exige reconciliação e restauração coerente.');
    }
}
