<?php

defined('BASEPATH') or exit('No direct script access allowed');
require_once APPPATH . 'helpers/trifase_publico_helper.php';

/** Gestão autenticada do link de cliente; mutações exigem POST e CSRF. */
class Trifase_cliente extends MY_Controller
{
    public function __construct()
    {
        parent::__construct();
        foreach (['vCliente', 'eCliente', 'vOs', 'vLancamento'] as $permissao) {
            if (! $this->permission->checkPermission($this->session->userdata('permissao'), $permissao)) {
                show_error('Você não tem permissão para compartilhar este cliente.', 403);
            }
        }
        if (! trifasePublicoHabilitado() || ! $this->db->table_exists('trifase_cliente_publico_links')) {
            show_404('', false);
        }
        $this->load->model('Trifase_cliente_publico_model', 'portal_cliente');
        $this->output->set_header('Cache-Control: private, no-store, max-age=0');
        $this->output->set_header('Referrer-Policy: no-referrer');
    }

    public function gerenciar($id = null)
    {
        $cliente = $this->cliente($id);
        $id = (int) $cliente->idClientes;
        $token = $this->portal_cliente->tokenAtivo($id);
        $base = trifasePublicoBase(base_url());
        $prefixo = $base . (config_item('index_page') ? trim((string) config_item('index_page'), '/') . '/' : '');
        $this->data['clientePublico'] = $cliente;
        $this->data['estadoPublico'] = $this->portal_cliente->estado($id);
        $this->data['linkPublicoAtivo'] = $token === null ? null : $prefixo . 'publico_cliente/index/' . $token;
        $this->data['prazoPublicoDias'] = trifasePublicoValidadeDias();
        $this->data['view'] = 'trifase/cliente-gerenciar';
        return $this->layout();
    }

    public function gerar($id = null)
    {
        $cliente = $this->clientePost($id);
        try {
            trifasePublicoBase(base_url());
            $this->portal_cliente->gerar((int) $cliente->idClientes, (int) $this->session->userdata('id_admin'));
            $this->session->set_flashdata('success', 'Novo link criado; o anterior foi invalidado.');
            log_info('Gerou link público do cliente: ' . (int) $cliente->idClientes);
        } catch (DomainException | RuntimeException $erro) {
            $this->session->set_flashdata('error', 'Não foi possível gerar o link.');
        }
        redirect('trifase_cliente/gerenciar/' . (int) $cliente->idClientes);
    }

    public function revogar($id = null)
    {
        $cliente = $this->clientePost($id);
        $this->portal_cliente->revogar((int) $cliente->idClientes);
        $this->session->set_flashdata('success', 'Acesso público revogado.');
        log_info('Revogou link público do cliente: ' . (int) $cliente->idClientes);
        redirect('trifase_cliente/gerenciar/' . (int) $cliente->idClientes);
    }

    private function cliente(mixed $id): object
    {
        $id = filter_var($id, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $cliente = $id !== false ? $this->db->select('idClientes, nomeCliente')->where('idClientes', $id)->get('clientes', 1)->row() : null;
        if (! $cliente) {
            show_404('', false);
        }
        return $cliente;
    }

    private function clientePost(mixed $id): object
    {
        if ($this->input->method(true) !== 'POST') {
            show_error('Use o formulário para esta ação.', 405);
        }
        return $this->cliente($id);
    }
}
