<?php

if (! defined('BASEPATH')) {
    exit('No direct script access allowed');
}

/**
 * Permission Class
 *
 * Biblioteca para controle de permissões
 *
 * @author      Ramon Silva
 * @copyright   Copyright (c) 2013, Ramon Silva.
 *
 * @since       Version 1.0
 * v... Visualizar
 * e... Editar
 * d... Deletar ou Desabilitar
 * c... Cadastrar
 */
class Permission
{
    /** @var object Instância do CodeIgniter, preenchida no construtor */
    private $CI;

    private $permissions = [];

    private $table = 'permissoes'; //Nome tabela onde ficam armazenadas as permissões

    private $pk = 'idPermissao'; // Nome da chave primaria da tabela

    private $select = 'permissoes'; // Campo onde fica o array de permissoes.

    public function __construct()
    {
        log_message('debug', 'Permission Class Initialized');
        $this->CI = &get_instance();
        $this->CI->load->database();
    }

    public function checkPermission($idPermissao = null, $atividade = null)
    {
        if ($idPermissao == null || $atividade == null) {
            return false;
        }
        if (! isset($this->permissions[$idPermissao]) && ! $this->loadPermission($idPermissao)) {
            return false;
        }

        return ($this->permissions[$idPermissao][$atividade] ?? 0) == 1;
    }

    private function loadPermission($id = null)
    {
        if ($id != null) {
            $this->CI->db->select($this->table . '.' . $this->select);
            $this->CI->db->where($this->pk, $id);
            // Grupo desativado não concede nada (#2846): até a v4 a situação
            // do grupo era só informativa.
            $this->CI->db->where('situacao', 1);
            $this->CI->db->limit(1);
            // row_array() devolve null quando a consulta não traz linha, e
            // count(null) é TypeError fatal no PHP 8. Um usuário cujo
            // permissoes_id aponta para uma linha removida derrubava a tela
            // em vez de receber a negação de acesso.
            $array = $this->CI->db->get($this->table)->row_array();

            if (! empty($array)) {
                $raw = $array[$this->select];
                $array = json_decode_legacy($raw);
                $this->permissions[$id] = $array;

                return true;
            }
        }

        return false;
    }
}
