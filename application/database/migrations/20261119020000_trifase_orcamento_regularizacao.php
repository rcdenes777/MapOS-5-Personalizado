<?php

defined('BASEPATH') or exit('No direct script access allowed');

/** Regularização auditável no mesmo evento de decisão, sem reclassificar legado. */
class Migration_trifase_orcamento_regularizacao extends CI_Migration
{
    public function up()
    {
        $tabela = 'trifase_orcamento_eventos';
        foreach ([
            'regularizacao_tardia' => ['type' => 'INT', 'default' => 0, 'null' => false],
            'justificativa' => ['type' => 'TEXT', 'null' => true],
            'entrega_id' => ['type' => 'INT', 'null' => true],
        ] as $campo => $definicao) {
            if (! $this->db->field_exists($campo, $tabela)
                && ! $this->dbforge->add_column($tabela, [$campo => $definicao])) {
                throw new RuntimeException('Não foi possível preparar a regularização do orçamento.');
            }
        }
        if ($this->db->dbdriver === 'mysqli') {
            if ($this->db->query('SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?', [$tabela, 'tf_orc_entrega_idx'])->num_rows() === 0
                && ! $this->db->query('CREATE INDEX tf_orc_entrega_idx ON trifase_orcamento_eventos (entrega_id)')) {
                throw new RuntimeException('Não foi possível indexar a entrega da regularização.');
            }
            if ($this->db->query('SELECT CONSTRAINT_NAME FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?', [$tabela, 'tf_orc_entrega'])->num_rows() === 0
                && ! $this->db->query('ALTER TABLE trifase_orcamento_eventos ADD CONSTRAINT tf_orc_entrega FOREIGN KEY (entrega_id) REFERENCES trifase_entregas_eventos (id) ON DELETE RESTRICT ON UPDATE RESTRICT')) {
                throw new RuntimeException('Não foi possível proteger o vínculo da regularização com a entrega.');
            }
        }
    }

    public function down()
    {
        throw new RuntimeException('Preserve o histórico de regularização dos orçamentos.');
    }
}
