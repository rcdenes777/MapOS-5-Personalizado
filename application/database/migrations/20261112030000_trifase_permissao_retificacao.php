<?php

defined('BASEPATH') or exit('No direct script access allowed');

class Migration_trifase_permissao_retificacao extends CI_Migration
{
    public function up()
    {
        $this->load->helper(['general', 'usuarios']);
        $consulta = $this->db->where('idPermissao', PERMISSAO_ADMIN)->where('situacao', 1)->get('permissoes', 1);
        if (! $consulta) {
            throw new RuntimeException('Não foi possível consultar o grupo de administração da instalação.');
        }
        $grupo = $consulta->row();
        if (! $grupo) {
            return;
        }
        $mapa = json_decode_legacy((string) $grupo->permissoes);
        if (! is_array($mapa)) {
            throw new RuntimeException('O grupo de administração tem permissões inválidas.');
        }
        $novas = $mapa + ['retificarFinanceiroCancelado' => 1];
        if ($novas === $mapa) {
            return;
        }
        // A atualização condicional preserva qualquer mudança feita por outra sessão.
        if (! $this->db->query(
            'UPDATE permissoes SET permissoes = ? WHERE idPermissao = ? AND situacao = 1 AND CAST(permissoes AS BINARY) = CAST(? AS BINARY)',
            [json_encode($novas, JSON_THROW_ON_ERROR), PERMISSAO_ADMIN, $grupo->permissoes]
        ) || $this->db->affected_rows() !== 1) {
            throw new RuntimeException('O grupo de administração foi alterado durante a migração. Execute novamente.');
        }
    }

    public function down()
    {
        throw new RuntimeException('Preserve a autorização de retificação já configurada.');
    }
}
