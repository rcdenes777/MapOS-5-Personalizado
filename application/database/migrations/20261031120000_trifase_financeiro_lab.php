<?php

/** Somente laboratório: esquema aditivo, sem converter registros existentes. */
class Migration_trifase_financeiro_lab extends CI_Migration
{
    public function up()
    {
        $this->criar('trifase_financeiro_obrigacoes', [
            'os_id' => ['type' => 'INT'], 'bruto_c' => ['type' => 'INT'], 'desconto_c' => ['type' => 'INT'],
            'vencimento' => ['type' => 'DATE'], 'principal_id' => ['type' => 'INT', 'unique' => true], 'usuario_id' => ['type' => 'INT'],
        ], 'os_id');
        $this->criar('trifase_financeiro_eventos', [
            'id' => ['type' => 'INT', 'auto_increment' => true], 'os_id' => ['type' => 'INT'],
            'tipo' => ['type' => 'VARCHAR', 'constraint' => 16],
            'referencia_id' => ['type' => 'INT', 'null' => true, 'unique' => true],
            'valor_c' => ['type' => 'INT'], 'desconto_c' => ['type' => 'INT'], 'data_evento' => ['type' => 'DATE'],
            'forma' => ['type' => 'VARCHAR', 'constraint' => 64],
            'lancamento_id' => ['type' => 'INT', 'null' => true, 'unique' => true], 'usuario_id' => ['type' => 'INT'],
            'motivo' => ['type' => 'VARCHAR', 'constraint' => 500, 'null' => true],
            'operacao' => ['type' => 'VARCHAR', 'constraint' => 64, 'unique' => true],
            'payload_hash' => ['type' => 'CHAR', 'constraint' => 64],
        ], 'id');
        $this->criar('trifase_financeiro_projecoes', [
            'lancamento_id' => ['type' => 'INT'], 'os_id' => ['type' => 'INT'], 'ativo' => ['type' => 'INT', 'default' => 1],
        ], 'lancamento_id');
    }

    private function criar(string $nome, array $campos, string $chave): void
    {
        if ($this->db->table_exists($nome)) {
            return;
        }
        $this->dbforge->add_field($campos);
        $this->dbforge->add_key($chave, true);
        if (! $this->dbforge->create_table($nome, true)) {
            throw new RuntimeException('Falha ao criar esquema financeiro.');
        }
    }

    public function down()
    {
        // Desligar código não desfaz recebimentos. Não permitir rollback destrutivo implícito.
        throw new RuntimeException('Reversão exige reconciliação financeira e restauração validada.');
    }
}
