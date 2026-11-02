<?php

defined('BASEPATH') or exit('No direct script access allowed');
require_once APPPATH . 'helpers/trifase_entrega_helper.php';

/** Retirada comum à OS normal e garantia; sempre privada e auditada. */
class Trifase_entregas extends MY_Controller
{
    public function __construct()
    {
        parent::__construct();
        if (! trifaseEntregaHabilitada()) {
            show_404('', false);
        }
        $this->load->model('Trifase_entrega_model', 'entregas');
        $this->load->model('os_model');
        $this->load->helper('os');
        $this->output->set_header('Cache-Control: private, no-store, max-age=0');
        $this->output->set_header('Referrer-Policy: no-referrer');
    }

    public function registrar($id = null)
    {
        if (! $this->permission->checkPermission($this->session->userdata('permissao'), 'vOs')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'registrarEntrega')) {
            show_error('Você não tem permissão para registrar a entrega.', 403);
        }
        $os = $this->ordemPost($id);
        return $this->executar($os, function () use ($os) {
            $dados = [];
            foreach (['recebedor', 'itens', 'observacoes', 'terceiro', 'autorizacao', 'entregue_em', 'confirmou_condicoes'] as $campo) {
                $dados[$campo] = $this->input->post($campo);
            }
            $this->entregas->registrar((int) $os->idOs, $dados, (int) $this->session->userdata('id_admin'), $this->texto('operacao'));
        }, 'Entrega registrada. Pagamentos, andamento e garantia foram preservados.');
    }

    public function cancelar($id = null)
    {
        if (! $this->permission->checkPermission($this->session->userdata('permissao'), 'vOs')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'corrigirEntrega')) {
            show_error('Você não tem permissão para corrigir a entrega.', 403);
        }
        $os = $this->ordemPost($id);
        return $this->executar($os, function () use ($os) {
            $evento = filter_var($this->input->post('evento_id'), FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
            if ($evento === false) {
                throw new DomainException('Entrega inválida.');
            }
            $this->entregas->cancelar((int) $os->idOs, $evento, $this->texto('motivo'), (int) $this->session->userdata('id_admin'), $this->texto('operacao'));
        }, 'Registro de entrega cancelado com justificativa. O histórico foi preservado.');
    }

    public function comprovante($id = null, $evento = null)
    {
        if (! $this->permission->checkPermission($this->session->userdata('permissao'), 'vOs')) {
            show_error('Você não tem permissão para esta OS.', 403);
        }
        if (! in_array($this->input->method(true), ['GET', 'HEAD'], true)) {
            show_error('Método não permitido.', 405);
        }
        $os = $this->ordem($id);
        $evento = filter_var($evento, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $comprovante = $evento !== false ? $this->entregas->comprovante((int) $os->idOs, $evento) : null;
        if ($comprovante === null) {
            show_404('', false);
        }
        $this->load->model('mapos_model');
        $this->output->set_header('X-Robots-Tag: noindex, nofollow, noarchive');
        return $this->load->view('trifase/entrega-comprovante', ['osEntrega' => $os, 'comprovante' => $comprovante, 'emitente' => $this->mapos_model->getEmitente()]);
    }

    private function ordem($id): object
    {
        $id = filter_var($id, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $os = $id !== false ? $this->os_model->getById($id) : null;
        if (! $os) {
            show_404('', false);
        }
        return $os;
    }

    private function ordemPost($id): object
    {
        if ($this->input->method(true) !== 'POST') {
            show_error('Use o formulário para esta operação.', 405);
        }
        return $this->ordem($id);
    }

    private function texto(string $campo): string
    {
        $valor = $this->input->post($campo);
        return is_string($valor) ? $valor : '';
    }

    private function executar(object $os, callable $acao, string $mensagem)
    {
        $status = 200;
        try {
            $acao();
            log_info('Operação de entrega registrada para OS #' . (int) $os->idOs);
            $this->session->set_flashdata('success', $mensagem);
            $corpo = ['result' => true, 'redirecionar' => site_url('os/visualizar/' . (int) $os->idOs)];
        } catch (DomainException $e) {
            $status = 422;
            $corpo = ['result' => false, 'message' => $e->getMessage()];
        } catch (RuntimeException $e) {
            $status = 500;
            $corpo = ['result' => false, 'message' => 'Não foi possível confirmar. Recarregue e confira o histórico antes de tentar novamente.'];
        }
        return $this->output->set_status_header($status)->set_content_type('application/json', 'utf-8')->set_output(json_encode($corpo));
    }
}
