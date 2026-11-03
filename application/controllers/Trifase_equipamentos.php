<?php

defined('BASEPATH') or exit('No direct script access allowed');
require_once APPPATH . 'helpers/trifase_equipamento_helper.php';

class Trifase_equipamentos extends MY_Controller
{
    public function __construct()
    {
        parent::__construct();
        if (! trifaseEquipamentosHabilitados()) {
            show_404('', false);
        }
        $this->load->model('Trifase_equipamento_model', 'equipamentos');
        $this->load->model('os_model');
        $this->load->helper('os');
        $this->output->set_header('Cache-Control: private, no-store, max-age=0');
        $this->output->set_header('Referrer-Policy: no-referrer');
    }

    public function modelos()
    {
        if (! $this->permission->checkPermission($this->session->userdata('permissao'), 'vOs')) {
            show_error('Você não tem permissão para consultar equipamentos.', 403);
        }
        $this->somenteLeitura();
        $itens = [];
        foreach ($this->equipamentos->modelos($this->termo()) as $modelo) {
            $itens[] = ['id' => (int) $modelo->id, 'valor' => $modelo->marca . ' · ' . $modelo->modelo,
                'detalhe' => $modelo->tipo, 'marca' => $modelo->marca, 'modelo' => $modelo->modelo, 'tipo' => $modelo->tipo];
        }
        return $this->json(200, $itens);
    }

    public function unidades($osId = null)
    {
        if (! $this->permission->checkPermission($this->session->userdata('permissao'), 'vOs')) {
            show_error('Você não tem permissão para consultar esta OS.', 403);
        }
        $this->somenteLeitura();
        $os = $this->ordem($osId);
        return $this->json(200, $this->opcoesUnidades((int) $os->clientes_id));
    }

    /** Consulta anterior à criação: usa o cliente escolhido sem criar OS provisória. */
    public function unidadesCliente()
    {
        if (! $this->permission->checkPermission($this->session->userdata('permissao'), 'vOs')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'aOs')) {
            show_error('Você não tem permissão para consultar unidades de uma nova OS.', 403);
        }
        $this->somenteLeitura();
        $cliente = filter_var($this->input->get('cliente_id'), FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);

        return $this->json(200, $cliente === false ? [] : $this->opcoesUnidades($cliente));
    }

    private function opcoesUnidades(int $cliente): array
    {
        $itens = [];
        foreach ($this->equipamentos->unidades($cliente, $this->termo()) as $unidade) {
            $itens[] = ['id' => (int) $unidade->id, 'valor' => $unidade->marca . ' · ' . $unidade->modelo,
                'detalhe' => implode(' · ', array_filter([$unidade->selo !== '' ? 'Selo ' . $unidade->selo : null,
                    $unidade->serie !== '' ? 'Série ' . $unidade->serie : null,
                    $unidade->imei !== '' ? 'IMEI ' . $unidade->imei : null, 'Unidade #' . (int) $unidade->id]))];
        }

        return $itens;
    }

    public function vincular($osId = null)
    {
        if (! $this->permission->checkPermission($this->session->userdata('permissao'), 'vOs')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'eOs')) {
            show_error('Você não tem permissão para identificar esta OS.', 403);
        }
        if ($this->input->method(true) !== 'POST') {
            show_error('Use o formulário para identificar o equipamento.', 405);
        }
        $os = $this->ordem($osId);
        try {
            $dados = [];
            foreach (['modo', 'itens_recebidos', 'estado_entrada', 'equipamento_id', 'modelo_id', 'tipo', 'marca', 'modelo', 'selo', 'serie', 'imei'] as $campo) {
                $dados[$campo] = $this->input->post($campo) ?? '';
            }
            $operacao = $this->input->post('operacao');
            if (! is_string($operacao)) {
                throw new DomainException('Identificador inválido. Recarregue a OS.');
            }
            $this->equipamentos->vincular((int) $os->idOs, $dados, (int) $this->session->userdata('id_admin'), $operacao);
            log_info('Identificou equipamento da OS #' . (int) $os->idOs);
            $this->session->set_flashdata('success', 'Equipamento identificado. Dados técnicos, pagamentos e garantia foram preservados.');
            return $this->json(200, ['result' => true, 'redirecionar' => site_url('os/visualizar/' . (int) $os->idOs)]);
        } catch (DomainException $e) {
            return $this->json(422, ['result' => false, 'message' => $e->getMessage()]);
        } catch (RuntimeException $e) {
            return $this->json(500, ['result' => false, 'message' => 'Não foi possível confirmar a identificação. Recarregue a OS antes de tentar novamente.']);
        }
    }

    public function corrigir($osId = null)
    {
        if (! $this->permission->checkPermission($this->session->userdata('permissao'), 'vOs')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'eOs')) {
            show_error('Sem permissão para editar a identificação desta OS.', 403);
        }
        if ($this->input->method(true) !== 'POST') {
            show_error('Use o formulário para corrigir a identificação.', 405);
        }
        $os = $this->ordem($osId);
        try {
            $dados = [];
            foreach (['marca', 'modelo', 'selo', 'serie', 'imei', 'itens_recebidos', 'estado_entrada'] as $campo) {
                $dados[$campo] = $this->input->post($campo) ?? '';
            }
            $versao = filter_var($this->input->post('versao'), FILTER_VALIDATE_INT, ['options' => ['min_range' => 0]]);
            $motivo = $this->input->post('motivo');
            $chave = $this->input->post('operacao');
            if ($versao === false || ! is_string($motivo) || ! is_string($chave)) {
                throw new DomainException('Confira motivo e versão. Recarregue a OS.');
            }
            $this->equipamentos->corrigir((int) $os->idOs, $dados, $versao, $motivo, (int) $this->session->userdata('id_admin'), $chave);
            $this->session->set_flashdata('success', 'Identificação corrigida nesta OS. Dados anteriores preservados no histórico.');
            return $this->json(200, ['result' => true, 'redirecionar' => site_url('os/visualizar/' . (int) $os->idOs)]);
        } catch (DomainException $e) {
            return $this->json(422, ['result' => false, 'message' => $e->getMessage()]);
        } catch (RuntimeException $e) {
            return $this->json(500, ['result' => false, 'message' => 'Não foi possível confirmar a correção. Recarregue antes de tentar novamente.']);
        }
    }

    public function visualizar($id = null)
    {
        if (! $this->permission->checkPermission($this->session->userdata('permissao'), 'vOs')) {
            show_error('Você não tem permissão para consultar este equipamento.', 403);
        }
        $this->somenteLeitura();
        $id = filter_var($id, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $unidade = $id !== false ? $this->equipamentos->unidade($id) : null;
        if ($unidade === null) {
            show_404('', false);
        }
        $this->data['equipamento'] = $unidade;
        $this->data['historicoEquipamento'] = $this->equipamentos->historico($id);
        $this->data['podeNovaOs'] = $this->permite('aOs');
        $this->data['view'] = 'trifase/equipamento-historico';
        $this->data['menuOs'] = 'OS';
        return $this->layout();
    }

    private function ordem($id): object
    {
        $id = filter_var($id, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $os = $id !== false ? $this->os_model->getById($id) : null;
        if ($os === null) {
            show_404('', false);
        }
        return $os;
    }

    private function somenteLeitura(): void
    {
        if (! in_array($this->input->method(true), ['GET', 'HEAD'], true)) {
            show_error('Método não permitido.', 405);
        }
    }

    private function termo(): string
    {
        $termo = $this->input->get('term');
        return is_string($termo) && mb_check_encoding($termo, 'UTF-8') ? mb_substr(trim($termo), 0, 100) : '';
    }

    private function json(int $status, array $corpo)
    {
        return $this->output->set_status_header($status)->set_content_type('application/json', 'utf-8')->set_output(json_encode($corpo));
    }
}
