<?php

defined('BASEPATH') or exit('No direct script access allowed');
require_once APPPATH . 'helpers/trifase_estoque_helper.php';

class Trifase_estoque extends MY_Controller
{
    public function __construct()
    {
        parent::__construct();
        if (! trifaseEstoqueHabilitado() || ! $this->db->table_exists('trifase_estoque_eventos') || ! $this->db->table_exists('trifase_os_custos') || ! $this->db->table_exists('trifase_servico_custos')) {
            show_404('', false);
        }
        $this->load->model('Trifase_estoque_model', 'estoque');
        $this->load->helper('financeiro');
        $this->output->set_header('Cache-Control: private, no-store');
    }

    public function produto($id = null)
    {
        if (! $this->permission->checkPermission($this->session->userdata('permissao'), 'vProduto')) {
            show_error('Sem permissão para consultar estoque.', 403);
        }
        $id = $this->id($id);
        $p = $this->db->where('idProdutos', $id)->get('produtos', 1)->row();
        if (! $p) {
            show_404('', false);
        }
        $this->metodo();
        $erro = null;
        if ($this->input->method(true) === 'POST') {
            if (! $this->permite('eProduto')) {
                show_error('Sem permissão para movimentar estoque.', 403);
            }
            try {
                $tipo = $this->texto('tipo');
                if (! in_array($tipo, ['entrada', 'saida', 'contagem'], true)) {
                    throw new DomainException('Tipo de movimentação inválido.');
                }
                $q = $this->inteiro('quantidade', 0, 1000000);
                $custo = $tipo === 'entrada' ? $this->moeda('custo') : null;
                $this->confirmar();
                $this->estoque->movimentar(
                    $id,
                    $tipo,
                    $q,
                    $custo,
                    $this->texto('data'),
                    $this->texto('motivo'),
                    'Movimentação manual',
                    (int) $this->session->userdata('id_admin'),
                    $this->texto('operacao'),
                    $tipo === 'contagem' ? $this->inteiro('esperado', 0, 2147483647) : null
                );
                $this->session->set_flashdata('success', 'Movimentação registrada com histórico.');
                return redirect('trifase_estoque/produto/' . $id);
            } catch (DomainException $e) {
                $erro = $e->getMessage();
                $this->output->set_status_header(422);
            } catch (RuntimeException $e) {
                $erro = 'Não foi possível confirmar a movimentação. Recarregue antes de tentar novamente.';
                $this->output->set_status_header(500);
            }
        }
        $filtros = [];
        foreach (['inicio', 'fim'] as $campo) {
            $v = $this->input->get($campo);
            $d = is_string($v) ? DateTimeImmutable::createFromFormat('!Y-m-d', $v) : false;
            if ($d && $d->format('Y-m-d') === $v) {
                $filtros[$campo] = $v;
            }
        }
        $tipo = $this->input->get('tipo');
        if (is_string($tipo) && in_array($tipo, ['entrada', 'saida', 'contagem', 'os_saida', 'os_devolucao', 'venda_saida', 'venda_devolucao', 'inicial'], true)) {
            $filtros['tipo'] = $tipo;
        }
        $inicio = max(0, (int) $this->input->get('pagina'));
        $this->data['produtoEstoque'] = $p;
        $this->data['erroEstoque'] = $erro;
        $this->data['editarEstoque'] = $this->permite('eProduto');
        $this->data['verCustoEstoque'] = $this->permite('vLancamento');
        $this->data['movimentosEstoque'] = $this->estoque->historico($id, $filtros, $inicio);
        $this->data['filtrosEstoque'] = $filtros;
        $this->data['paginaEstoque'] = $inicio;
        $this->data['view'] = 'trifase/estoque';
        return $this->layout();
    }

    public function servico($id = null)
    {
        if (! $this->permission->checkPermission($this->session->userdata('permissao'), 'vServico') || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'vLancamento')) {
            show_error('Sem permissão para consultar custos de serviço.', 403);
        }
        $id = $this->id($id);
        $s = $this->db->where('idServicos', $id)->get('servicos', 1)->row();
        if (! $s) {
            show_404('', false);
        }
        $this->metodo();
        $erro = null;
        if ($this->input->method(true) === 'POST') {
            if (! $this->permite('eServico')) {
                show_error('Sem permissão para definir custo de serviço.', 403);
            }
            try {
                $this->confirmar();
                $this->estoque->definirServico(
                    $id,
                    $this->moeda('custo'),
                    $this->texto('motivo'),
                    $this->inteiro('anterior', 0, PHP_INT_MAX),
                    (int) $this->session->userdata('id_admin'),
                    $this->texto('operacao')
                );
                return redirect('trifase_estoque/servico/' . $id);
            } catch (DomainException $e) {
                $erro = $e->getMessage();
                $this->output->set_status_header(422);
            } catch (RuntimeException $e) {
                $erro = 'Não foi possível confirmar o custo.';
                $this->output->set_status_header(500);
            }
        }
        $this->data['servicoCusto'] = $s;
        $this->data['custoServico'] = $this->estoque->custoServico($id);
        $this->data['historicoServicoCusto'] = $this->db->where('servico_id', $id)->order_by('id', 'desc')->get('trifase_servico_custos')->result();
        $this->data['erroCusto'] = $erro;
        $this->data['editarCustoServico'] = $this->permite('eServico');
        $this->data['view'] = 'trifase/servico-custo';
        return $this->layout();
    }

    public function os($id = null)
    {
        if (! $this->permission->checkPermission($this->session->userdata('permissao'), 'vOs') || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'vLancamento')) {
            show_error('Sem permissão para consultar custos da OS.', 403);
        }
        $id = $this->id($id);
        $os = $this->db->where('idOs', $id)->get('os', 1)->row();
        if (! $os) {
            show_404('', false);
        }
        $this->metodo();
        $erro = null;
        if ($this->input->method(true) === 'POST') {
            if (! $this->permite('eOs')) {
                show_error('Sem permissão para registrar custo.', 403);
            }
            try {
                $this->confirmar();
                $this->estoque->registrarCustoItem(
                    $id,
                    $this->texto('tipo'),
                    $this->inteiro('item', 1, PHP_INT_MAX),
                    $this->moeda('custo'),
                    $this->inteiro('anterior', 0, PHP_INT_MAX),
                    $this->texto('motivo'),
                    (int) $this->session->userdata('id_admin'),
                    $this->texto('operacao')
                );
                return redirect('trifase_estoque/os/' . $id);
            } catch (DomainException $e) {
                $erro = $e->getMessage();
                $this->output->set_status_header(422);
            } catch (RuntimeException $e) {
                $erro = 'Não foi possível confirmar o custo.';
                $this->output->set_status_header(500);
            }
        }
        $this->data['osCusto'] = $os;
        $this->data['resumoCustosOs'] = $this->estoque->resumoOs($id);
        $this->data['historicoCustosOs'] = $this->db->where('os_id', $id)->order_by('id', 'desc')->get('trifase_os_custos')->result();
        $this->data['erroCustoOs'] = $erro;
        $this->data['editarCustoOs'] = $this->permite('eOs');
        $manual = ['valor_c' => 0, 'minutos' => 0];
        $this->data['ehRetornoCusto'] = false;
        if ($this->db->table_exists('trifase_garantia_retornos') && $this->db->where('os_id', $id)->count_all_results('trifase_garantia_retornos')) {
            $this->load->model('Trifase_retorno_model', 'retornos_custo');
            $manual = $this->retornos_custo->custos($id);
            $this->data['ehRetornoCusto'] = true;
        }
        $this->data['custosManuaisOs'] = $manual;
        $this->data['view'] = 'trifase/os-custos';
        return $this->layout();
    }

    private function metodo(): void
    {
        if (! in_array($this->input->method(true), ['GET', 'HEAD', 'POST'], true)) {
            show_error('Método não permitido.', 405);
        }
    }
    private function id(mixed $id): int
    {
        $r = filter_var($id, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        if ($r === false) {
            show_404('', false);
        }
        return $r;
    }
    private function texto(string $campo): string
    {
        $v = $this->input->post($campo);
        if (! is_string($v) || ! mb_check_encoding($v, 'UTF-8') || str_contains($v, "\0")) {
            throw new DomainException('Campo inválido: ' . $campo);
        }
        return trim($v);
    }
    private function inteiro(string $campo, int $min, int $max): int
    {
        $v = filter_var($this->input->post($campo), FILTER_VALIDATE_INT, ['options' => ['min_range' => $min, 'max_range' => $max]]);
        if ($v === false) {
            throw new DomainException('Quantidade ou referência inválida.');
        }
        return $v;
    }
    private function moeda(string $campo): int
    {
        $v = valorDecimal($this->texto($campo));
        if ($v === null) {
            throw new DomainException('Informe o custo em reais, como 25,50.');
        }
        return $this->estoque->centavos($v);
    }
    private function confirmar(): void
    {
        if ($this->input->post('confirmar') !== '1') {
            throw new DomainException('Confirme os dados antes de registrar.');
        }
    }
}
