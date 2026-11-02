<?php

defined('BASEPATH') or exit('No direct script access allowed');
require_once APPPATH . 'helpers/trifase_atendimento_helper.php';

class Trifase_atendimentos extends MY_Controller
{
    public function __construct()
    {
        parent::__construct();
        if (! trifaseAtendimentoHabilitado() || ! $this->db->table_exists('trifase_atendimentos')) {
            show_404('', false);
        }
        $this->load->model('Trifase_atendimento_model', 'atendimentos');
        $this->output->set_header('Cache-Control: private, no-store, max-age=0');
    }

    public function andamento($id = null)
    {
        if (! $this->permission->checkPermission($this->session->userdata('permissao'), 'vOs')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'eOs')) {
            show_error('Você não tem permissão para alterar o andamento.', 403);
        }
        $id = $this->ordemPost($id);
        try {
            $status = $this->input->post('status');
            if (! is_string($status) || $this->input->post('confirmar') !== '1') {
                throw new DomainException('Confira e confirme a alteração do andamento.');
            }
            $this->atendimentos->alterarAndamento($id, $status, (int) $this->session->userdata('id_admin'));
            $this->session->set_flashdata('success', 'Andamento registrado. Pagamentos e retirada foram preservados.');
        } catch (DomainException $e) {
            return $this->falha($e->getMessage());
        } catch (RuntimeException $e) {
            return $this->falha('Não foi possível confirmar o andamento. Recarregue a OS.', 500);
        }
        redirect('os/visualizar/' . $id);
    }

    public function conclusao($id = null)
    {
        if (! $this->permission->checkPermission($this->session->userdata('permissao'), 'vOs')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'eOs')) {
            show_error('Você não tem permissão para registrar a conclusão.', 403);
        }
        $id = $this->ordemPost($id);
        try {
            $data = $this->input->post('conclusao');
            if (! is_string($data) || $this->input->post('confirmar') !== '1') {
                throw new DomainException('Confira e confirme a data real da conclusão.');
            }
            $this->atendimentos->registrarConclusao($id, $data, (int) $this->session->userdata('id_admin'));
            $this->session->set_flashdata('success', 'Conclusão registrada sem criar cobrança ou pagamento.');
        } catch (DomainException $e) {
            return $this->falha($e->getMessage());
        } catch (RuntimeException $e) {
            return $this->falha('Não foi possível confirmar a conclusão. Recarregue a OS.', 500);
        }
        redirect('os/visualizar/' . $id);
    }

    private function ordemPost($id): int
    {
        if ($this->input->method(true) !== 'POST') {
            show_error('Use o formulário da OS.', 405);
        }
        $id = filter_var($id, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        if ($id === false || ! $this->db->where('idOs', $id)->count_all_results('os')) {
            show_404('', false);
        }
        return $id;
    }

    private function falha(string $mensagem, int $status = 422)
    {
        return $this->output->set_status_header($status)->set_content_type('text/plain', 'utf-8')->set_output($mensagem);
    }
}
