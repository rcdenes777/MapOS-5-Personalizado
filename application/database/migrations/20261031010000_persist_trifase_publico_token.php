<?php

/** Extensão aditiva: preserva hashes, seleções e URLs já enviadas ao cliente. */
class Migration_persist_trifase_publico_token extends CI_Migration
{
    public function up()
    {
        if (! $this->db->field_exists('token_cifrado', 'trifase_publico_links')) {
            if (! $this->dbforge->add_column('trifase_publico_links', ['token_cifrado' => ['type' => 'TEXT', 'null' => true]])) {
                throw new RuntimeException('Não foi possível preparar os links persistentes.');
            }
        }
        if (! $this->db->field_exists('validade_dias', 'trifase_publico_links')) {
            if (! $this->dbforge->add_column('trifase_publico_links', ['validade_dias' => ['type' => 'INT', 'constraint' => 3, 'default' => 30]])) {
                throw new RuntimeException('Não foi possível preparar a validade dos links.');
            }
        }
        // Marcador atualizado junto do prazo: repetir após falha não soma mais 90 dias.
        if (! $this->db->where('validade_dias', 30)->where('token_hash IS NOT NULL', null, false)->where('expira_em >', time())
            ->set('expira_em', 'expira_em + 7776000', false)->set('validade_dias', 120)->update('trifase_publico_links')) {
            throw new RuntimeException('Não foi possível ampliar a validade dos links.');
        }
    }

    public function down()
    {
        if ($this->db->field_exists('token_cifrado', 'trifase_publico_links')) {
            $this->dbforge->drop_column('trifase_publico_links', 'token_cifrado');
        }
        if ($this->db->field_exists('validade_dias', 'trifase_publico_links')) {
            $this->dbforge->drop_column('trifase_publico_links', 'validade_dias');
        }
        // Não encurtar nem invalidar links que já foram compartilhados.
    }
}
