<?php

defined('BASEPATH') or exit('No direct script access allowed');

require_once APPPATH . '/libraries/REST_Controller.php';

class ApiController extends REST_Controller
{
    public function __construct()
    {
        parent::__construct();

        $this->load->library('Authorization_Token');
        $this->load->model('mapos_model');
    }

    public function index_get()
    {
        $user = $this->logged_user();

        $result = [
            'countOs' => $this->mapos_model->count('os'),
            'clientes' => $this->mapos_model->count('clientes'),
            'produtos' => $this->mapos_model->count('produtos'),
            'servicos' => $this->mapos_model->count('servicos'),
            'garantias' => $this->mapos_model->count('garantias'),
            'vendas' => $this->mapos_model->count('vendas'),
        ];

        if ($this->permission->checkPermission($user->level, 'vOs')) {
            $verFinanceiro = $this->permission->checkPermission($user->level, 'vLancamento');
            $result['osAbertas'] = $this->mapos_model->getOsAbertas($verFinanceiro);
            $result['osAndamento'] = $this->mapos_model->getOsAndamento($verFinanceiro);
            $result['estoqueBaixo'] = $this->permission->checkPermission($user->level, 'vProduto')
                ? $this->mapos_model->getProdutosMinimo($verFinanceiro, $this->permission->checkPermission($user->level, 'vCustoInterno'))
                : [];
        }

        $this->response([
            'status' => true,
            'message' => 'Dashboard',
            'result' => $result,
        ], REST_Controller::HTTP_OK);
    }

    public function calendario_get()
    {
        $user = $this->logged_user();
        if (! $this->permission->checkPermission($user->level, 'vOs')) {
            $this->response([
                'status' => false,
                'message' => 'Você não está autorizado a Visualizar OSs',
            ], REST_Controller::HTTP_UNAUTHORIZED);
        }

        $status = $this->get('status', true) ?: null;
        $start = $this->get('start', true) ?: date('Y-m-01');
        $end = $this->get('end', true) ?: date('Y-m-t');

        $verFinanceiro = $this->permission->checkPermission($user->level, 'vLancamento');
        $allOs = $this->mapos_model->calendario($start, $end, $status, $verFinanceiro);

        $result = [
            'start' => $start,
            'end' => $end,
            'allOs' => $allOs,
        ];

        $this->response([
            'status' => true,
            'message' => 'OSs do período.',
            'result' => $result,
        ], REST_Controller::HTTP_OK);
    }

    public function emitente_get()
    {
        $this->logged_user();

        $result = [
            'appName' => $this->getConfig('app_name'),
            'emitente' => $this->mapos_model->getEmitente() ?: false,
        ];

        $this->response([
            'status' => true,
            'message' => 'Dados do Map-OS',
            'result' => $result,
        ], REST_Controller::HTTP_OK);
    }

    public function audit_get()
    {
        $this->logged_user();

        if (! $this->permission->checkPermission($this->logged_user()->level, 'cAuditoria')) {
            $this->response([
                'status' => false,
                'message' => 'Você não está autorizado a Visualizar Auditoria',
            ], REST_Controller::HTTP_UNAUTHORIZED);
        }

        $perPage = $this->get('perPage', true) ?: 20;
        $page = $this->get('page', true) ?: 0;
        $start = $page ? ($perPage * $page) : 0;

        $this->load->model('Audit_model');
        $logs = $this->Audit_model->get('logs', '*', '', $perPage, $start);

        $this->response([
            'status' => true,
            'message' => 'Listando Logs',
            'result' => $logs,
        ], REST_Controller::HTTP_OK);
    }
}
