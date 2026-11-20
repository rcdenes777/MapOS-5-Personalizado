<?php

defined('BASEPATH') or exit('No direct script access allowed');

/** Metadados da comunicação interna, sem atribuir canais ao histórico legado. */
class Migration_trifase_orcamento_comunicacao extends CI_Migration
{
    public function up()
    {
        $tabela = 'trifase_orcamento_eventos';
        foreach ([
            'canal' => ['type' => 'VARCHAR', 'constraint' => 16, 'null' => true],
            'comunicado_em' => ['type' => 'DATETIME', 'null' => true],
            'observacao' => ['type' => 'TEXT', 'null' => true],
        ] as $campo => $definicao) {
            if (! $this->db->field_exists($campo, $tabela)
                && ! $this->dbforge->add_column($tabela, [$campo => $definicao])) {
                throw new RuntimeException('Não foi possível preparar os metadados da comunicação do orçamento.');
            }
        }
    }

    public function down()
    {
        throw new RuntimeException('Preserve os metadados históricos da comunicação do orçamento.');
    }
}
