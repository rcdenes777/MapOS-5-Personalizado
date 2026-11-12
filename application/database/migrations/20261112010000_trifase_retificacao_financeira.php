<?php

defined('BASEPATH') or exit('No direct script access allowed');

class Migration_trifase_retificacao_financeira extends CI_Migration
{
    public function up()
    {
        if (! $this->db->field_exists('retificacao_cancelamento', 'trifase_financeiro_eventos')
            && ! $this->dbforge->add_column('trifase_financeiro_eventos', [
                'retificacao_cancelamento' => ['type' => 'VARCHAR', 'constraint' => 32, 'null' => true],
            ])) {
            throw new RuntimeException('Não foi possível preparar o histórico de retificações financeiras.');
        }
    }

    public function down()
    {
        throw new RuntimeException('Preserve o histórico de retificações financeiras.');
    }
}
