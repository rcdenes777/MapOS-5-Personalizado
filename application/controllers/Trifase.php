<?php

defined('BASEPATH') or exit('No direct script access allowed');

require_once APPPATH . 'helpers/trifase_publico_helper.php';

/** Administração do módulo; todas as rotas passam pelo painel e pelo CSRF. */
class Trifase extends MY_Controller
{
    public function __construct()
    {
        parent::__construct();
        if (! $this->permission->checkPermission($this->session->userdata('permissao'), 'vOs')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'eOs')) {
            show_error('Você não tem permissão para compartilhar esta OS.', 403);
        }
        if (! trifasePublicoHabilitado()) {
            show_404('', false);
        }
        $this->load->model('Trifase_publico_model', 'publico_model');
        $this->load->helper('os');
        $this->output->set_header('Cache-Control: private, no-store, max-age=0');
        $this->output->set_header('Referrer-Policy: no-referrer');
    }

    public function gerenciar($id = null)
    {
        $os = $this->ordem($id);
        $this->data['osPublica'] = $os;
        $this->data['estadoPublico'] = $this->publico_model->estado((int) $os->idOs);
        $this->data['anexosPublicos'] = $this->publico_model->anexos((int) $os->idOs);
        $this->data['novoLinkPublico'] = $this->session->flashdata('trifase_link');
        $this->data['view'] = 'trifase/gerenciar';
        $this->data['menuOs'] = 'OS';

        return $this->layout();
    }

    public function gerar($id = null)
    {
        $os = $this->ordemPost($id);
        try {
            // Valida configuração antes de substituir um link vigente.
            trifasePublicoBase(base_url());
            $token = $this->publico_model->gerar((int) $os->idOs, (int) $this->session->userdata('id_admin'));
            $url = trifasePublicoUrl($token, base_url(), (string) config_item('index_page'));
            $this->session->set_flashdata('trifase_link', $url);
            $this->session->set_flashdata('success', 'Novo link criado. Links anteriores desta OS deixaram de funcionar.');
            log_info('Gerou link público da OS: ' . (int) $os->idOs);
        } catch (DomainException $erro) {
            $this->session->set_flashdata('error', $erro->getMessage());
        } catch (RuntimeException $erro) {
            $this->session->set_flashdata('error', 'Não foi possível gerar o link. Tente novamente.');
        }
        redirect('trifase/gerenciar/' . (int) $os->idOs);
    }

    /** Miniaturas do painel também ficam atrás das permissões do módulo. */
    public function miniatura($id = null, $anexoId = null)
    {
        $os = $this->ordem($id);
        if (! in_array($this->input->method(true), ['GET', 'HEAD'], true)) {
            show_error('Método não permitido.', 405);
        }
        $anexoId = filter_var($anexoId, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $anexo = $anexoId !== false ? $this->db->where('os_id', (int) $os->idOs)->where('idAnexos', $anexoId)->get('anexos', 1)->row() : null;
        $arquivo = $anexo ? trifasePublicoMiniatura($anexo) : null;
        if ($arquivo === null) {
            show_404('', false);
        }
        trifasePublicoEnviarArquivo($arquivo, $anexoId, true, $this->input->method(true) === 'HEAD');
    }

    public function revogar($id = null)
    {
        $os = $this->ordemPost($id);
        $this->publico_model->revogar((int) $os->idOs);
        $this->session->set_flashdata('success', 'Link público revogado.');
        log_info('Revogou link público da OS: ' . (int) $os->idOs);
        redirect('trifase/gerenciar/' . (int) $os->idOs);
    }

    public function anexos($id = null)
    {
        $os = $this->ordemPost($id);
        $ids = $this->input->post('anexos') ?? [];
        try {
            if (! is_array($ids)) {
                throw new DomainException('Seleção de anexos inválida.');
            }
            $this->publico_model->publicarAnexos((int) $os->idOs, $ids);
            $this->session->set_flashdata('success', 'Anexos públicos atualizados.');
            log_info('Alterou anexos públicos da OS: ' . (int) $os->idOs);
        } catch (DomainException $erro) {
            $this->session->set_flashdata('error', $erro->getMessage());
        }
        redirect('trifase/gerenciar/' . (int) $os->idOs);
    }

    private function ordem($id): object
    {
        $valor = filter_var($id, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $os = $valor !== false ? $this->publico_model->ordem($valor) : null;
        if (! $os) {
            show_404('', false);
        }

        return $os;
    }

    private function ordemPost($id): object
    {
        if ($this->input->method(true) !== 'POST') {
            show_error('Use o formulário para esta ação.', 405);
        }

        return $this->ordem($id);
    }
}
