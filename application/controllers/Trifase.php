<?php

defined('BASEPATH') or exit('No direct script access allowed');

require_once APPPATH . 'helpers/trifase_video_helper.php';

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
        $this->data['prazoPublicoDias'] = trifasePublicoValidadeDias();
        $this->data['estadoPublico'] = $this->publico_model->estado((int) $os->idOs);
        $this->data['anexosPublicos'] = $this->publico_model->anexos((int) $os->idOs);
        $token = $this->publico_model->tokenAtivo((int) $os->idOs);
        $this->data['linkPublicoAtivo'] = $token !== null ? trifasePublicoUrl($token, base_url(), (string) config_item('index_page')) : null;
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
            $this->publico_model->gerar((int) $os->idOs, (int) $this->session->userdata('id_admin'));
            // A cópia cifrada permite recuperar o mesmo link ao voltar à tela.
            $this->session->set_flashdata('success', 'Novo link criado. Links anteriores desta OS deixaram de funcionar.');
            log_info('Gerou link público da OS: ' . (int) $os->idOs);
        } catch (DomainException $erro) {
            $this->session->set_flashdata('error', $erro->getMessage());
        } catch (RuntimeException $erro) {
            $this->session->set_flashdata('error', 'Não foi possível gerar o link. Tente novamente.');
        }
        redirect($this->destino((int) $os->idOs));
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

    /** Cada requisição, inclusive Range/HEAD, revalida login e vínculo à OS. */
    public function video($id = null, $anexoId = null)
    {
        $os = $this->ordem($id);
        if (! in_array($this->input->method(true), ['GET', 'HEAD'], true)) {
            show_error('Método não permitido.', 405);
        }
        $anexoId = filter_var($anexoId, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $anexo = $anexoId !== false ? $this->db->where('os_id', (int) $os->idOs)->where('idAnexos', $anexoId)->get('anexos', 1)->row() : null;
        $arquivo = $anexo ? trifaseVideoArquivo($anexo) : null;
        if ($arquivo === null) {
            show_404('', false);
        }
        $range = $this->input->get_request_header('If-Range') ? null : $this->input->get_request_header('Range');
        trifaseVideoEnviar($arquivo, $anexoId, $this->input->method(true) === 'HEAD', $range);
    }

    public function renovar($id = null)
    {
        $os = $this->ordemPost($id);
        try {
            $this->publico_model->renovar((int) $os->idOs, (int) $this->session->userdata('id_admin'));
            $this->session->set_flashdata('success', 'Validade renovada. O endereço do link e os anexos compartilhados continuam iguais.');
            log_info('Renovou validade do link público da OS: ' . (int) $os->idOs);
        } catch (DomainException | RuntimeException $erro) {
            $this->session->set_flashdata('error', $erro->getMessage());
        }
        redirect($this->destino((int) $os->idOs));
    }

    public function revogar($id = null)
    {
        $os = $this->ordemPost($id);
        $this->publico_model->revogar((int) $os->idOs);
        $this->session->set_flashdata('success', 'Link público revogado.');
        log_info('Revogou link público da OS: ' . (int) $os->idOs);
        redirect($this->destino((int) $os->idOs));
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
        redirect($this->destino((int) $os->idOs));
    }

    public function visibilidade($id = null, $anexo = null)
    {
        $os = $this->ordemPost($id);
        $anexo = filter_var($anexo, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $publicar = $this->input->post('publicar');
        $anterior = $this->input->post('anterior');
        $status = 200;
        try {
            if ($anexo === false || ! in_array($publicar, ['0', '1'], true) || ! in_array($anterior, ['0', '1'], true)) {
                throw new DomainException('Visibilidade inválida.');
            }
            $resultado = $this->publico_model->alterarAnexo((int) $os->idOs, $anexo, $publicar === '1', $anterior === '1');
            $status = $resultado['conflito'] ? 409 : 200;
            $corpo = $resultado + ['result' => $status === 200, 'message' => $status === 200 ? 'Visibilidade atualizada.' : 'Outra sessão alterou a visibilidade. Confira o estado atual.'];
            if ($status === 200) {
                log_info('Alterou visibilidade do anexo #' . $anexo . ' da OS #' . (int) $os->idOs);
            }
        } catch (DomainException $e) {
            $status = 422;
            $corpo = ['result' => false, 'message' => $e->getMessage()];
        } catch (RuntimeException $e) {
            $status = 500;
            $corpo = ['result' => false, 'message' => 'Não foi possível confirmar a visibilidade. Recarregue a OS.'];
        }
        $this->output->set_status_header($status)->set_content_type('application/json', 'utf-8')->set_output(json_encode($corpo));
    }

    /** Retorno fechado: nenhuma URL fornecida pelo navegador é aceita. */
    private function destino(int $id): string
    {
        $this->load->helper('trifase_interface');
        return $this->input->post('voltar') === 'resumo' && trifaseInterfacePiloto()
            ? 'os/visualizar/' . $id . '?secao=compartilhamento#os-secoes' : 'trifase/gerenciar/' . $id;
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
