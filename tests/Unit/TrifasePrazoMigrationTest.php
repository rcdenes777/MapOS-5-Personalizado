<?php

require_once APPPATH . 'database/migrations/20261031010000_persist_trifase_publico_token.php';

final class TrifasePrazoMigrationTest extends MaposTestCase
{
    public function testAtualizacaoPreservaHashEAnexosEAumentaPrazoSomenteUmaVez(): void
    {
        $this->db->query('CREATE TABLE trifase_publico_links (os_id INTEGER PRIMARY KEY, token_hash TEXT, expira_em INTEGER)');
        $this->db->query('CREATE TABLE trifase_publico_anexos (os_id INTEGER, anexo_id INTEGER)');
        $expira = time() + 20 * 86400;
        $this->db->insert('trifase_publico_links', ['os_id' => 1, 'token_hash' => str_repeat('a', 64), 'expira_em' => $expira]);
        $this->db->insert('trifase_publico_links', ['os_id' => 2, 'token_hash' => str_repeat('b', 64), 'expira_em' => time() - 1]);
        $this->db->insert('trifase_publico_anexos', ['os_id' => 1, 'anexo_id' => 7]);
        $m = new class() extends Migration_persist_trifase_publico_token {
            public object $dbforge;
        };
        $m->db = $this->db;
        $m->dbforge = new class($this->db) {
            public function __construct(private object $db)
            {
            }
            public function add_column($tabela, $campos): bool
            {
                foreach ($campos as $nome => $campo) {
                    if (! $this->db->query('ALTER TABLE ' . $tabela . ' ADD COLUMN ' . $nome . ' ' . $campo['type'] . (isset($campo['default']) ? ' DEFAULT ' . (int) $campo['default'] : ''))) {
                        return false;
                    }
                }
                return true;
            }
        };
        $m->up();
        $this->db->insert('trifase_publico_links', ['os_id' => 3, 'token_hash' => str_repeat('c', 64), 'expira_em' => $expira, 'token_cifrado' => 'cifrado', 'validade_dias' => 30]);
        $m->up();
        $this->assertSame($expira, (int) $this->db->where('os_id', 3)->get('trifase_publico_links')->row()->expira_em);
        $linha = $this->db->where('os_id', 1)->get('trifase_publico_links')->row();
        $this->assertSame($expira + 90 * 86400, (int) $linha->expira_em);
        $this->assertSame(str_repeat('a', 64), $linha->token_hash);
        $this->assertSame(120, (int) $linha->validade_dias);
        $this->assertNull($linha->token_cifrado);
        $this->assertSame(1, $this->db->count_all_results('trifase_publico_anexos'));
        $this->assertLessThan(time(), (int) $this->db->where('os_id', 2)->get('trifase_publico_links')->row()->expira_em);
    }
}
