<?php

defined('BASEPATH') or exit('No direct script access allowed');

class Migration_trifase_estoque_linha_os extends CI_Migration
{
    public function up()
    {
        $tabela = 'trifase_estoque_eventos';
        foreach (['os_id', 'os_item_id'] as $campo) {
            if (! $this->db->field_exists($campo, $tabela)
                && ! $this->dbforge->add_column($tabela, [$campo => ['type' => 'INT', 'null' => true]])) {
                throw new RuntimeException('Não foi possível vincular o histórico de estoque à linha da OS.');
            }
        }
        if ($this->db->dbdriver === 'mysqli'
            && $this->db->query("SHOW INDEX FROM trifase_estoque_eventos WHERE Key_name = 'tf_est_linha_os'")->num_rows() === 0
            && ! $this->db->query('CREATE INDEX tf_est_linha_os ON trifase_estoque_eventos (os_id, os_item_id, produto_id, tipo)')) {
            throw new RuntimeException('Não foi possível indexar o vínculo de estoque da OS.');
        }
    }

    public function down()
    {
        throw new RuntimeException('Preserve os vínculos históricos de estoque com as linhas da OS.');
    }
}
