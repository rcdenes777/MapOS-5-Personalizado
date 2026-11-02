<?php

defined('BASEPATH') or exit('No direct script access allowed');
require_once APPPATH . 'helpers/trifase_publico_helper.php';
require_once APPPATH . 'helpers/trifase_orcamento_helper.php';

/** Capacidade do link da OS, sem sessão do painel e sem exceção ao CSRF. */
class Orcamento_publico extends CI_Controller
{
    public function __construct()
    {
        parent::__construct();
        $cabecalhos = trifasePublicoCabecalhos();
        $cabecalhos['Content-Security-Policy'] = str_replace("form-action 'none'", "form-action 'self'", $cabecalhos['Content-Security-Policy']);
        foreach ($cabecalhos as $nome => $valor) {
            $this->output->set_header($nome . ': ' . $valor);
            if (! headers_sent()) {
                header($nome . ': ' . $valor);
            }
        }
        if (! trifasePublicoHabilitado() || ! trifaseOrcamentoHabilitado()
            || ! $this->db->table_exists('trifase_orcamento_estado')) {
            show_404('', false);
        }
        $this->load->model('Trifase_publico_model', 'links');
        foreach (['trifase_orcamento_estado', 'trifase_orcamento_versoes', 'trifase_orcamento_eventos'] as $tabela) {
            if (! $this->db->table_exists($tabela)) {
                show_404('', false);
            }
        }
        $this->load->model('Trifase_orcamento_model', 'orcamentos');
    }

    public function ver($token = null)
    {
        if (! in_array($this->input->method(true), ['GET', 'HEAD'], true)) {
            show_error('Método não permitido.', 405);
        }
        return $this->pagina($token);
    }

    public function responder($token = null)
    {
        if ($this->input->method(true) !== 'POST') {
            show_error('Método não permitido.', 405);
        }
        $os = $this->links->resolver($token);
        if ($os === null) {
            show_404('', false);
        }
        try {
            $versao = $this->input->post('versao');
            $chave = $this->input->post('operacao');
            if (! is_string($versao) || ! ctype_digit($versao) || ! is_string($chave)) {
                throw new DomainException('Reabra o link e confira a versão do orçamento.');
            }
            $this->orcamentos->responder(
                (int) $os->idOs,
                $token,
                (int) $versao,
                $this->input->post('decisao'),
                $this->input->post('nome'),
                $this->input->post('confirmar'),
                $chave
            );
        } catch (DomainException $e) {
            $this->output->set_status_header(422);
            return $this->pagina($token, $e->getMessage());
        } catch (RuntimeException $e) {
            $this->output->set_status_header(500);
            return $this->pagina($token, 'Não foi possível confirmar a resposta. Reabra o link antes de tentar novamente.');
        }
        // Redirecionamento fechado ao mesmo token validado, sem dados pessoais na URL.
        redirect(trifasePublicoBase(base_url()) . (config_item('index_page') ? config_item('index_page') . '/' : '') . 'orcamento_publico/ver/' . $token);
    }

    private function pagina(mixed $token, ?string $erro = null)
    {
        $os = $this->links->resolver($token);
        $versao = $os ? $this->orcamentos->publicado((int) $os->idOs, $token) : null;
        if ($versao === null) {
            show_404('', false);
        }
        $prefixo = trifasePublicoBase(base_url()) . (config_item('index_page') ? config_item('index_page') . '/' : '');
        return $this->load->view('trifase/orcamento-publico', [
            'versaoOrcamento' => $versao, 'retratoOrcamento' => json_decode($versao->conteudo, true, 32, JSON_THROW_ON_ERROR),
            'decisaoOrcamento' => $this->orcamentos->decisao((int) $versao->id), 'erroOrcamento' => $erro,
            'responderOrcamentoUrl' => $prefixo . 'orcamento_publico/responder/' . $token,
            'voltarOrcamentoUrl' => $prefixo . 'publico/os/' . $token, 'basePublica' => trifasePublicoBase(base_url()),
        ]);
    }
}
