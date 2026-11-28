<?php

defined('BASEPATH') or exit('No direct script access allowed');

require_once APPPATH . 'helpers/trifase_publico_helper.php';
require_once APPPATH . 'helpers/trifase_financeiro_helper.php';
require_once APPPATH . 'helpers/trifase_video_helper.php';
require_once APPPATH . 'helpers/trifase_portal_cliente_helper.php';
require_once APPPATH . 'helpers/trifase_entrega_helper.php';

/** Portal de leitura autorizado apenas por capacidade do cliente. */
class Publico_cliente extends CI_Controller
{
    public function __construct()
    {
        parent::__construct();
        foreach (trifasePublicoCabecalhos() as $nome => $valor) {
            $this->output->set_header($nome . ': ' . $valor);
            if (! headers_sent()) {
                header($nome . ': ' . $valor);
            }
        }
        if (! trifasePublicoHabilitado() || ! in_array($this->input->method(true), ['GET', 'HEAD'], true)
            || ! $this->db->table_exists('trifase_cliente_publico_links')) {
            show_404('', false);
        }
        $this->load->model('Trifase_cliente_publico_model', 'portal_cliente');
        $this->load->helper('os');
    }

    public function index($token = null)
    {
        $cliente = $this->cliente($token);
        $os = $this->portal_cliente->ordens((int) $cliente->idClientes);
        $financeiro = $this->financeiro($os);
        $filtro = (string) $this->input->get('filtro');
        if (! in_array($filtro, ['', 'pago', 'pendente', 'entregue', 'nao-entregue'], true)
            || ($financeiro === null && in_array($filtro, ['pago', 'pendente'], true))
            || (! $this->entregasDisponiveis() && in_array($filtro, ['entregue', 'nao-entregue'], true))) {
            $filtro = '';
        }
        $filtradas = trifasePortalFiltrar($os, $filtro);
        $this->renderizar($token, $cliente, $filtradas, $financeiro, count($os), $filtro);
    }

    public function os($token = null, $id = null)
    {
        $cliente = $this->cliente($token);
        $id = filter_var($id, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $ordem = $id !== false ? $this->portal_cliente->ordem((int) $cliente->idClientes, $id) : null;
        if (! $ordem) {
            show_404('', false);
        }
        $this->financeiro([$ordem]);
        $this->load->model('Trifase_publico_model', 'anexos_cliente_publico');
        $anexos = $this->anexos_cliente_publico->anexos((int) $ordem->idOs, true);
        $orcamento = $this->orcamentoCliente((int) $ordem->idOs, (int) $cliente->idClientes);
        $this->renderizar($token, $cliente, [$ordem], null, 1, '', true, $anexos, $orcamento);
    }

    public function anexo($token = null, $id = null, $anexoId = null)
    {
        $cliente = $this->cliente($token);
        $id = filter_var($id, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $anexoId = filter_var($anexoId, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $ordem = $id !== false ? $this->portal_cliente->ordem((int) $cliente->idClientes, $id) : null;
        $this->load->model('Trifase_publico_model', 'anexos_cliente_publico');
        $anexo = $ordem && $anexoId !== false ? $this->anexos_cliente_publico->anexoPublicado((int) $ordem->idOs, $anexoId) : null;
        $arquivo = $anexo ? trifasePublicoArquivo($anexo) : null;
        $extensao = $arquivo ? strtolower(pathinfo($arquivo, PATHINFO_EXTENSION)) : '';
        if (! $arquivo || ! armazenamentoMimePermitido($arquivo, $extensao)) {
            show_404('', false);
        }
        trifasePublicoEnviarArquivo($arquivo, $anexoId, false, $this->input->method(true) === 'HEAD');
    }

    private function cliente(mixed $token): object
    {
        $cliente = $this->portal_cliente->resolver($token);
        if (! $cliente) {
            show_404('', false);
        }
        return $cliente;
    }

    private function financeiro(array $ordens): ?array
    {
        if (! trifaseFinanceiroClienteDisponivel($this->db)) {
            return null;
        }
        $this->load->model('Trifase_financeiro_model', 'financeiro_cliente_publico');
        $ids = array_map(static fn ($os) => (int) $os->idOs, $ordens);
        $mapa = $this->financeiro_cliente_publico->resumosCliente($ids);
        $totais = ['total_c' => 0, 'pago_c' => 0, 'saldo_c' => 0];
        foreach ($ordens as $ordem) {
            $ordem->financeiro = $mapa[(int) $ordem->idOs] ?? null;
            if ($ordem->financeiro !== null) {
                foreach (array_keys($totais) as $campo) {
                    $totais[$campo] += $ordem->financeiro[$campo];
                }
            }
        }
        return $totais;
    }

    private function entregasDisponiveis(): bool
    {
        return trifaseEntregasDisponiveis($this->db);
    }

    private function orcamentoCliente(int $idOs, int $idCliente): ?array
    {
        require_once APPPATH . 'helpers/trifase_orcamento_helper.php';
        if (! trifaseOrcamentoHabilitado()) {
            return null;
        }
        foreach (['trifase_orcamento_estado', 'trifase_orcamento_versoes', 'trifase_orcamento_eventos'] as $tabela) {
            if (! $this->db->table_exists($tabela)) {
                return null;
            }
        }
        $this->load->model('Trifase_orcamento_model', 'orcamento_cliente_publico');
        $versao = $this->orcamento_cliente_publico->publicadoParaCliente($idOs, $idCliente);
        if ($versao === null) {
            return null;
        }
        $retrato = json_decode($versao->conteudo, true);
        if (! is_array($retrato)) {
            return null;
        }
        // Valores comerciais vêm somente do retrato publicado, nunca da OS viva.
        // Retratos legados incompletos ou inválidos não representam zero.
        $valoresValidos = true;
        foreach (['pecas_c', 'servicos_c', 'desconto_c', 'total_c'] as $campo) {
            if (! isset($retrato[$campo]) || ! is_int($retrato[$campo]) || $retrato[$campo] < 0 || $retrato[$campo] > 100000000000) {
                $valoresValidos = false;
                break;
            }
        }
        if ($valoresValidos && ($retrato['desconto_c'] > $retrato['pecas_c'] + $retrato['servicos_c']
            || $retrato['total_c'] > $retrato['pecas_c'] + $retrato['servicos_c']
            || abs($retrato['pecas_c'] + $retrato['servicos_c'] - $retrato['desconto_c'] - $retrato['total_c']) > 1)) {
            $valoresValidos = false;
        }
        return ['situacao' => trifaseOrcamentoSituacao($this->orcamento_cliente_publico->decisao((int) $versao->id)),
            'apresentacao' => $retrato['apresentacao'] ?? [], 'itens' => $retrato['itens'] ?? [],
            'subtotal_c' => $valoresValidos ? $retrato['pecas_c'] + $retrato['servicos_c'] : null,
            'desconto_c' => $valoresValidos ? $retrato['desconto_c'] : null,
            'total_c' => $valoresValidos ? $retrato['total_c'] : null];
    }

    private function renderizar(string $token, object $cliente, array $ordens, ?array $financeiro, int $total, string $filtro, bool $detalhe = false, array $anexos = [], ?array $orcamento = null): void
    {
        $base = trifasePublicoBase(base_url());
        $prefixo = $base . (config_item('index_page') ? trim((string) config_item('index_page'), '/') . '/' : '');
        $this->load->view('trifase/cliente-publico', ['cliente' => $cliente, 'ordens' => $ordens, 'financeiro' => $financeiro,
            'total' => $total, 'filtro' => $filtro, 'detalhe' => $detalhe, 'basePublica' => $base,
            'financeiroDisponivel' => trifaseFinanceiroClienteDisponivel($this->db),
            'entregasDisponiveis' => $this->entregasDisponiveis(),
            'urlPortal' => $prefixo . 'publico_cliente/index/' . $token, 'urlOs' => $prefixo . 'publico_cliente/os/' . $token . '/',
            'urlAnexo' => $prefixo . 'publico_cliente/anexo/' . $token . '/', 'anexos' => $anexos, 'orcamentoCliente' => $orcamento]);
    }
}
