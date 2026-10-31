<?php

defined('BASEPATH') or exit('No direct script access allowed');
require_once APPPATH . 'helpers/trifase_financeiro_helper.php';

/** Experimento financeiro: somente no laboratório com ativação explícita. */
class Trifase_financeiro extends MY_Controller
{
    public function __construct()
    {
        parent::__construct();
        if (! trifaseFinanceiroHabilitado()) {
            show_404('', false);
        }
        $this->load->model('Trifase_financeiro_model', 'financeiro_os');
        $this->load->model('os_model');
        $this->load->helper(['os', 'financeiro']);
        $this->output->set_header('Cache-Control: private, no-store, max-age=0');
        $this->output->set_header('Referrer-Policy: no-referrer');
    }

    public function visualizar($id = null)
    {
        if (! $this->permission->checkPermission($this->session->userdata('permissao'), 'vOs')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'vLancamento')) {
            show_error('Você não tem permissão para esta operação.', 403);
        }
        return $this->tela($this->ordem($id));
    }

    public function formalizar($id = null)
    {
        if (! $this->permission->checkPermission($this->session->userdata('permissao'), 'vOs')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'vLancamento')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'eOs')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'aLancamento')) {
            show_error('Você não tem permissão para esta operação.', 403);
        }
        $os = $this->postOrdem($id);
        return $this->executar($os, function () use ($os) {
            if ($this->os_model->getCobrancas((int) $os->idOs)) {
                throw new DomainException('Esta OS tem cobrança externa. Concilie a cobrança antes de usar este módulo.');
            }
            $t = $this->os_model->totais($os);
            $this->financeiro_os->formalizar((int) $os->idOs, financeiroCentavos(number_format($t['bruto'], 2, '.', '')), financeiroCentavos(number_format($t['desconto'], 2, '.', '')), $this->texto('vencimento'), $this->usuario());
        }, 'Cobrança registrada. O andamento do serviço foi preservado.');
    }

    public function receber($id = null)
    {
        if (! $this->permission->checkPermission($this->session->userdata('permissao'), 'vOs')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'vLancamento')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'aLancamento')) {
            show_error('Você não tem permissão para esta operação.', 403);
        }
        $os = $this->postOrdem($id);
        return $this->executar($os, function () use ($os) {
            $valor = valorDecimal($this->texto('valor'));
            if ($valor === null || ! preg_match('/\A[0-9]+(?:\.[0-9]{1,2})?\z/', $valor) || strlen($valor) > 12) {
                throw new DomainException('Informe um valor positivo com até dois centavos.');
            }
            $this->financeiro_os->receber((int) $os->idOs, financeiroCentavos($valor), $this->texto('data'), $this->texto('forma'), $this->texto('operacao'), $this->usuario());
        }, 'Recebimento registrado.');
    }

    public function estornar($id = null)
    {
        if (! $this->permission->checkPermission($this->session->userdata('permissao'), 'vOs')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'vLancamento')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'estornarRecebimento')) {
            show_error('Você não tem permissão para esta operação.', 403);
        }
        $os = $this->postOrdem($id);
        return $this->executar($os, function () use ($os) {
            $evento = filter_var($this->texto('evento_id'), FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
            if ($evento === false) {
                throw new DomainException('Recebimento inválido.');
            }
            $this->financeiro_os->estornar((int) $os->idOs, $evento, $this->texto('motivo'), $this->texto('data'), $this->texto('operacao'), $this->usuario());
        }, 'Registro estornado. O saldo foi recomposto; nenhum reembolso bancário foi executado.');
    }

    public function andamento($id = null)
    {
        if (! $this->permission->checkPermission($this->session->userdata('permissao'), 'vOs')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'eOs')) {
            show_error('Você não tem permissão para esta operação.', 403);
        }
        $os = $this->postOrdem($id);
        try {
            $this->financeiro_os->alterarAndamento((int) $os->idOs, $this->texto('status'), $this->usuario());
            $this->session->set_flashdata('success', 'Andamento atualizado. Os valores financeiros foram preservados.');
        } catch (DomainException $e) {
            $this->session->set_flashdata('error', $e->getMessage());
        }
        redirect('os/visualizar/' . (int) $os->idOs);
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

    private function postOrdem($id): object
    {
        if ($this->input->method(true) !== 'POST') {
            show_error('Use o formulário para esta ação.', 405);
        }
        return $this->ordem($id);
    }

    private function usuario(): int
    {
        return (int) $this->session->userdata('id_admin');
    }

    private function texto(string $campo): string
    {
        $valor = $this->input->post($campo);
        return is_scalar($valor) ? trim((string) $valor) : '';
    }

    private function executar(object $os, callable $acao, string $mensagem)
    {
        try {
            $acao();
            $this->session->set_flashdata('success', $mensagem);
            redirect('trifase_financeiro/visualizar/' . (int) $os->idOs);
        } catch (DomainException $e) {
            $this->output->set_status_header(422);
            return $this->tela($os, $e->getMessage());
        } catch (RuntimeException $e) {
            $this->output->set_status_header(500);
            return $this->tela($os, 'Não foi possível concluir a operação. Confira o histórico antes de tentar novamente.');
        }
    }

    private function tela(object $os, ?string $erro = null)
    {
        $gerida = trifaseFinanceiroOsGerida($this->db, (int) $os->idOs);
        $this->data['osFinanceira'] = $os;
        $this->data['financeiroResumo'] = $gerida ? $this->financeiro_os->resumo((int) $os->idOs) : null;
        $this->data['financeiroEventos'] = $gerida ? $this->financeiro_os->historico((int) $os->idOs) : [];
        $this->data['financeiroErro'] = $erro;
        $this->data['financeiroChave'] = $this->input->method(true) === 'POST' && $this->texto('operacao') !== '' ? $this->texto('operacao') : bin2hex(random_bytes(16));
        $this->data['financeiroValores'] = ['valor' => $this->texto('valor'), 'data' => $this->texto('data') ?: date('Y-m-d'), 'forma' => $this->texto('forma') ?: 'Pix'];
        $this->data['view'] = 'trifase/financeiro';
        $this->data['menuOs'] = 'OS';
        return $this->layout();
    }
}
