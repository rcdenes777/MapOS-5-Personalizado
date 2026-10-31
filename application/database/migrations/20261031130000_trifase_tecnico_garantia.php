<?php

/** Aditiva: não altera status, valores ou datas dos registros existentes. */
class Migration_trifase_tecnico_garantia extends CI_Migration
{
    public function up()
    {
        foreach ([
            'garantia_inicio' => ['type' => 'DATE', 'null' => true],
            'origem' => ['type' => 'VARCHAR', 'constraint' => 16, 'default' => 'novo'],
        ] as $nome => $definicao) {
            if (! $this->db->field_exists($nome, 'trifase_financeiro_obrigacoes')
                && ! $this->dbforge->add_column('trifase_financeiro_obrigacoes', [$nome => $definicao])) {
                throw new RuntimeException('Não foi possível preparar a edição técnica.');
            }
        }
    }

    public function down()
    {
        throw new RuntimeException('Preserve os registros de conclusão e concilie os dados antes da reversão.');
    }
}
