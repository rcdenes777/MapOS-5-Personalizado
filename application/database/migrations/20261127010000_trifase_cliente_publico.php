<?php

/** Link de cliente é separado dos links individuais de OS. */
class Migration_trifase_cliente_publico extends CI_Migration
{
    public function up()
    {
        if (! $this->db->table_exists('trifase_cliente_publico_links')) {
            $this->dbforge->add_field([
                'cliente_id' => ['type' => 'INT', 'constraint' => 11],
                'token_hash' => ['type' => 'VARCHAR', 'constraint' => 64, 'null' => true],
                'token_cifrado' => ['type' => 'TEXT', 'null' => true],
                'expira_em' => ['type' => 'BIGINT', 'null' => true],
                'usuario_id' => ['type' => 'INT', 'constraint' => 11],
            ]);
            $this->dbforge->add_key('cliente_id', true);
            if (! $this->dbforge->create_table('trifase_cliente_publico_links', true, $this->db->dbdriver === 'mysqli' ? ['ENGINE' => 'InnoDB'] : [])) {
                throw new RuntimeException('Não foi possível criar links públicos de cliente.');
            }
        }
        // CI3 add_key() não aceita o terceiro argumento de unicidade. Se uma
        // tentativa anterior parou após CREATE TABLE, a repetição cria o índice.
        $indice = match ($this->db->dbdriver) {
            'mysqli' => $this->db->query("SHOW INDEX FROM trifase_cliente_publico_links WHERE Key_name = 'trifase_cliente_token_unico'")->result_array(),
            'sqlite3' => array_values(array_filter($this->db->query("PRAGMA index_list('trifase_cliente_publico_links')")->result_array(), static fn ($i) => $i['name'] === 'trifase_cliente_token_unico')),
            default => throw new RuntimeException('Driver de banco não suportado.'),
        };
        if ($indice === []) {
            if (! $this->db->query('CREATE UNIQUE INDEX trifase_cliente_token_unico ON trifase_cliente_publico_links (token_hash)')) {
                throw new RuntimeException('Não foi possível garantir a unicidade dos links.');
            }
        } elseif ($this->db->dbdriver === 'mysqli') {
            if (count($indice) !== 1 || (int) $indice[0]['Non_unique'] !== 0 || $indice[0]['Column_name'] !== 'token_hash') {
                throw new RuntimeException('Índice de token inválido.');
            }
        } else {
            $colunas = $this->db->query("PRAGMA index_info('trifase_cliente_token_unico')")->result_array();
            if ((int) $indice[0]['unique'] !== 1 || count($colunas) !== 1 || $colunas[0]['name'] !== 'token_hash') {
                throw new RuntimeException('Índice de token inválido.');
            }
        }
    }

    public function down()
    {
        $this->dbforge->drop_table('trifase_cliente_publico_links', true);
    }
}
