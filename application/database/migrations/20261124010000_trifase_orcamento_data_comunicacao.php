<?php

defined('BASEPATH') or exit('No direct script access allowed');

/** Data informada sem hora; o horário real do registro continua em criado_em. */
class Migration_trifase_orcamento_data_comunicacao extends CI_Migration
{
    public function up()
    {
        $tabela = 'trifase_orcamento_eventos';
        if (! $this->db->field_exists('comunicado_data', $tabela)
            && ! $this->dbforge->add_column($tabela, ['comunicado_data' => ['type' => 'DATE', 'null' => true]])) {
            throw new RuntimeException('Não foi possível preparar a data da comunicação do orçamento.');
        }
    }

    public function down()
    {
        throw new RuntimeException('Preserve a data histórica da comunicação do orçamento.');
    }
}
