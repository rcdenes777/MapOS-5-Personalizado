<?php

defined('BASEPATH') or exit('No direct script access allowed');

/** Auditoria privada de negociações, anexada ao evento existente. */
class Migration_trifase_orcamento_negociacao extends CI_Migration
{
    public function up()
    {
        if (! $this->db->field_exists('negociacao', 'trifase_orcamento_eventos')
            && ! $this->dbforge->add_column('trifase_orcamento_eventos', ['negociacao' => ['type' => 'TEXT', 'null' => true]])) {
            throw new RuntimeException('Não foi possível preparar a auditoria da negociação.');
        }
    }

    public function down()
    {
        if (! $this->db->table_exists('trifase_orcamento_eventos')
            || ! $this->db->field_exists('negociacao', 'trifase_orcamento_eventos')) {
            return;
        }
        // Reverter o código é seguro; apagar auditoria de negociação não é.
        if ($this->db->where('negociacao IS NOT NULL', null, false)->count_all_results('trifase_orcamento_eventos') > 0) {
            return;
        }
        // ALTER direto evita a recriação de tabela do forge e preserva o restante do esquema.
        if (! $this->db->query('ALTER TABLE trifase_orcamento_eventos DROP COLUMN negociacao')) {
            throw new RuntimeException('Não foi possível remover a coluna de auditoria.');
        }
    }
}
