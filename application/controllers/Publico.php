<?php

defined('BASEPATH') or exit('No direct script access allowed');

require_once APPPATH . 'helpers/trifase_publico_helper.php';

/** Leitura por capacidade (token), independente do login de cliente e da API. */
class Publico extends CI_Controller
{
    public function __construct()
    {
        parent::__construct();
        foreach (trifasePublicoCabecalhos() as $nome => $valor) {
            $this->output->set_header($nome . ': ' . $valor);
            // show_404() encerra fora de CI_Output; proteger também as falhas.
            if (! headers_sent()) {
                header($nome . ': ' . $valor);
            }
        }
        if (! trifasePublicoHabilitado()) {
            show_404('', false);
        }
        if (! in_array($this->input->method(true), ['GET', 'HEAD'], true)) {
            show_404('', false);
        }
        // Falha fechada durante instalação ou atualização incompleta.
        if (! $this->db->table_exists('trifase_publico_links') || ! $this->db->table_exists('trifase_publico_anexos')) {
            show_404('', false);
        }
        $this->load->model('Trifase_publico_model', 'publico_model');
    }

    public function os($token = null)
    {
        $os = $this->publico_model->resolver($token);
        if (! $os) {
            show_404('', false);
        }
        $base = trifasePublicoBase(base_url());
        $prefixo = (string) config_item('index_page');
        $prefixo = $base . ($prefixo === '' ? '' : $prefixo . '/');
        $anexos = [];
        foreach ($this->publico_model->anexos((int) $os->idOs, true) as $anexo) {
            $anexos[] = [
                'nome' => 'Anexo #' . (int) $anexo->idAnexos,
                'url' => $prefixo . 'publico/anexo/' . $token . '/' . (int) $anexo->idAnexos,
                'miniatura' => trifasePublicoMiniatura($anexo) !== null ? $prefixo . 'publico/miniatura/' . $token . '/' . (int) $anexo->idAnexos : null,
                'imagem' => trifasePublicoMiniatura($anexo, false) !== null ? $prefixo . 'publico/imagem/' . $token . '/' . (int) $anexo->idAnexos : null,
                'extensao' => strtoupper(pathinfo((string) $anexo->anexo, PATHINFO_EXTENSION)),
            ];
        }
        $this->load->view('trifase/publico', ['os' => trifasePublicoDados($os), 'anexos' => $anexos, 'basePublica' => $base]);
    }

    public function anexo($token = null, $id = null)
    {
        $this->entregar($token, $id, 'arquivo');
    }

    public function miniatura($token = null, $id = null)
    {
        $this->entregar($token, $id, 'miniatura');
    }

    public function imagem($token = null, $id = null)
    {
        $this->entregar($token, $id, 'imagem');
    }

    private function entregar($token, $id, string $modo): void
    {
        $os = $this->publico_model->resolver($token);
        $id = filter_var($id, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $anexo = $os && $id !== false ? $this->publico_model->anexoPublicado((int) $os->idOs, $id) : null;
        // Só o storage privado da v5 é aceito; caminhos legados públicos não passam.
        $arquivo = $anexo ? ($modo === 'arquivo' ? trifasePublicoArquivo($anexo) : trifasePublicoMiniatura($anexo, $modo === 'miniatura')) : null;
        $extensao = $arquivo ? strtolower(pathinfo($arquivo, PATHINFO_EXTENSION)) : '';
        if (! $arquivo || ! armazenamentoMimePermitido($arquivo, $extensao)) {
            show_404('', false);
        }
        // Reutiliza MIME/disposição do storage, mas sobrescreve seu cache de
        // uma hora: um arquivo revogado não pode continuar no cache do cliente.
        trifasePublicoEnviarArquivo($arquivo, $id, $modo !== 'arquivo', $this->input->method(true) === 'HEAD');
    }
}
