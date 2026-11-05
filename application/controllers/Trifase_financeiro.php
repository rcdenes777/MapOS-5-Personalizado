<?php

defined('BASEPATH') or exit('No direct script access allowed');
require_once APPPATH . 'helpers/trifase_financeiro_helper.php';
require_once APPPATH . 'helpers/trifase_interface_helper.php';

/** Extensão financeira com ativação explícita por instalação. */
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

    public function recibo($id = null, $evento = null)
    {
        if (! $this->permission->checkPermission($this->session->userdata('permissao'), 'vOs')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'vLancamento')) {
            show_error('Você não tem permissão para consultar este recebimento.', 403);
        }
        if (! in_array($this->input->method(true), ['GET', 'HEAD'], true)) {
            show_error('Método não permitido.', 405);
        }
        $os = $this->ordem($id);
        $evento = filter_var($evento, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $recibo = $evento !== false ? $this->financeiro_os->recibo((int) $os->idOs, $evento) : null;
        if ($recibo === null) {
            show_404('', false);
        }
        $this->load->model('mapos_model');
        $this->output->set_header('X-Robots-Tag: noindex, nofollow, noarchive');
        return $this->load->view('trifase/recibo', ['osRecibo' => $os, 'recibo' => $recibo, 'emitente' => $this->mapos_model->getEmitente()]);
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
            $this->financeiro_os->formalizarCalculado((int) $os->idOs, $this->texto('vencimento'), $this->usuario(), function ($bloqueada) {
                if ($this->os_model->getCobrancas((int) $bloqueada->idOs)) {
                    throw new DomainException('Esta OS tem cobrança externa. Concilie a cobrança antes de usar este módulo.');
                }
                return $this->os_model->totais($bloqueada);
            });
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

    public function tecnico($id = null)
    {
        if (! $this->permission->checkPermission($this->session->userdata('permissao'), 'vOs')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'eOs')) {
            show_error('Você não tem permissão para editar esta OS.', 403);
        }
        $os = $this->ordem($id);
        $gerida = trifaseFinanceiroOsGerida($this->db, (int) $os->idOs);
        if (! $gerida && (int) $os->faturado !== 1) {
            show_error('Esta OS ainda não foi conciliada com o módulo financeiro.', 409);
        }
        $erro = null;
        if ($this->input->method(true) === 'POST') {
            try {
                $post = $this->input->post();
                unset($post[$this->security->get_csrf_token_name()]);
                if ($this->pedidoPiloto()) {
                    unset($post['aba']);
                }
                $this->financeiro_os->salvarTecnico((int) $os->idOs, $post, $this->usuario());
                $this->session->set_flashdata('success', 'Dados técnicos salvos. Os valores e a conclusão registrada foram preservados.');
                if ($this->pedidoPiloto()) {
                    return $this->respostaPiloto($os);
                }
                redirect('os/visualizar/' . (int) $os->idOs);
            } catch (DomainException $e) {
                $erro = $e->getMessage();
                if ($this->pedidoPiloto()) {
                    return $this->respostaPiloto($os, $erro, 422);
                }
                $this->output->set_status_header(422);
            }
        }
        $this->data['osTecnica'] = $os;
        $this->data['metaTecnica'] = $gerida ? $this->financeiro_os->metadados((int) $os->idOs) : (object) ['garantia_inicio' => null, 'origem' => 'legado_nao_conciliado'];
        $this->data['erroTecnico'] = $erro;
        $this->data['view'] = 'trifase/tecnico';
        $this->data['menuOs'] = 'OS';
        return $this->layout();
    }

    public function conclusao($id = null)
    {
        if (! $this->permission->checkPermission($this->session->userdata('permissao'), 'vOs')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'eOs')) {
            show_error('Você não tem permissão para registrar a conclusão.', 403);
        }
        $os = $this->postOrdem($id);
        try {
            $this->financeiro_os->registrarConclusao((int) $os->idOs, $this->texto('conclusao'), $this->usuario());
            $this->session->set_flashdata('success', 'Conclusão registrada. Essa data será a referência da garantia.');
        } catch (DomainException $e) {
            $this->session->set_flashdata('error', $e->getMessage());
        }
        redirect('trifase_financeiro/tecnico/' . (int) $os->idOs);
    }

    public function conciliar($id = null)
    {
        if (! $this->permission->checkPermission($this->session->userdata('permissao'), 'vOs')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'vLancamento')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'eOs')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'eLancamento')) {
            show_error('Você não tem permissão para conciliar faturamento antigo.', 403);
        }
        $os = $this->ordem($id);
        $erro = null;
        if ($this->input->method(true) === 'POST') {
            try {
                if ($this->texto('confirmar') !== '1') {
                    throw new DomainException('Confirme a conferência do lançamento e do andamento real.');
                }
                $this->financeiro_os->conciliarLegado((int) $os->idOs, $this->texto('status'), $this->usuario());
                $this->session->set_flashdata('success', 'Vínculo conciliado sem duplicar receita. Confira a conclusão real antes de registrar a garantia.');
                redirect('trifase_financeiro/visualizar/' . (int) $os->idOs);
            } catch (DomainException $e) {
                $erro = $e->getMessage();
                $this->output->set_status_header(422);
            }
        }
        $this->data['legadoFinanceiro'] = $this->financeiro_os->legado((int) $os->idOs);
        $this->data['erroLegado'] = $erro;
        $this->data['view'] = 'trifase/conciliar';
        return $this->layout();
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
            if ($this->pedidoPiloto()) {
                return $this->respostaPiloto($os);
            }
            redirect('trifase_financeiro/visualizar/' . (int) $os->idOs);
        } catch (DomainException $e) {
            if ($this->pedidoPiloto()) {
                return $this->respostaPiloto($os, $e->getMessage(), 422);
            }
            $this->output->set_status_header(422);
            return $this->tela($os, $e->getMessage());
        } catch (RuntimeException $e) {
            if ($this->pedidoPiloto()) {
                return $this->respostaPiloto($os, 'Não foi possível confirmar. Confira o histórico antes de tentar novamente.', 500);
            }
            $this->output->set_status_header(500);
            return $this->tela($os, 'Não foi possível concluir a operação. Confira o histórico antes de tentar novamente.');
        }
    }

    /** @phpstan-impure Carrega o helper e consulta o transporte da requisição. */
    private function pedidoPiloto(): bool
    {
        $this->load->helper('trifase_interface');
        return trifaseInterfacePiloto() && $this->input->is_ajax_request() && $this->texto('aba') === 'resumo';
    }

    private function respostaPiloto(object $os, ?string $erro = null, int $status = 200)
    {
        $corpo = ['result' => $erro === null];
        if ($erro === null) {
            $corpo['redirecionar'] = site_url('os/visualizar/' . (int) $os->idOs);
        } else {
            $corpo['message'] = $erro;
        }
        return $this->output->set_status_header($status)->set_content_type('application/json', 'utf-8')->set_output(json_encode($corpo));
    }

    private function tela(object $os, ?string $erro = null)
    {
        $gerida = trifaseFinanceiroOsGerida($this->db, (int) $os->idOs);
        $cancelamentoPendente = $this->db->table_exists('trifase_cancelamentos')
            ? $this->db->select('id, tipo, criado_em')->where('os_id', (int) $os->idOs)->where_in('tipo', ['solicitar', 'retirar', 'confirmar'])->order_by('id', 'desc')->get('trifase_cancelamentos', 1)->row()
            : null;
        $this->data['osFinanceira'] = $os;
        $this->data['cancelamentoPendenteFinanceiro'] = ($cancelamentoPendente->tipo ?? '') === 'solicitar' && $os->status !== 'Cancelado';
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
