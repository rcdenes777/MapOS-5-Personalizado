<?php

defined('BASEPATH') or exit('No direct script access allowed');
require_once APPPATH . 'helpers/trifase_cadastro_helper.php';

class Trifase_cadastros extends MY_Controller
{
    public function __construct()
    {
        parent::__construct();
        if (! trifaseCadastrosHabilitados() || ! $this->db->table_exists('trifase_cadastros_eventos')) {
            show_404('', false);
        }
        $this->load->model('Trifase_cadastro_model', 'cadastros');
        $this->output->set_header('Cache-Control: private, no-store');
    }

    public function cliente($id = null)
    {
        if (! $this->permission->checkPermission($this->session->userdata('permissao'), 'vCliente')) {
            show_error('Sem permissão para consultar este cadastro.', 403);
        }
        return $this->formulario('cliente', $id);
    }

    public function modelo($id = null)
    {
        if (! $this->permission->checkPermission($this->session->userdata('permissao'), 'vOs')) {
            show_error('Sem permissão para consultar este cadastro.', 403);
        }
        return $this->formulario('modelo', $id);
    }

    public function unidade($id = null)
    {
        if (! $this->permission->checkPermission($this->session->userdata('permissao'), 'vOs')) {
            show_error('Sem permissão para consultar este cadastro.', 403);
        }
        return $this->formulario('unidade', $id);
    }

    public function catalogo()
    {
        if (! $this->permission->checkPermission($this->session->userdata('permissao'), 'vOs')) {
            show_error('Sem permissão para consultar equipamentos.', 403);
        }
        if (! in_array($this->input->method(true), ['GET', 'HEAD'], true)) {
            show_error('Método não permitido.', 405);
        }
        $termo = $this->input->get('pesquisa');
        $termo = is_string($termo) ? mb_substr(trim($termo), 0, 100) : '';
        $inicio = max(0, (int) $this->input->get('inicio'));
        $this->db->group_start()->like('marca', $termo)->or_like('modelo', $termo)->group_end();
        $total = $this->db->count_all_results('trifase_equipamento_modelos');
        $this->data['modelosCatalogo'] = $this->db->group_start()->like('marca', $termo)->or_like('modelo', $termo)->group_end()->order_by('marca')->order_by('modelo')->limit(25, $inicio)->get('trifase_equipamento_modelos')->result();
        $this->data['pesquisaCatalogo'] = $termo;
        $this->data['paginacaoCatalogo'] = $this->paginacao(site_url('trifase_cadastros/catalogo'), $total, $inicio, 'inicio', ['pesquisa' => $termo]);
        $this->data['view'] = 'trifase/catalogo';
        return $this->layout();
    }

    private function formulario(string $tipo, mixed $id)
    {
        if (! in_array($tipo, ['cliente', 'modelo', 'unidade'], true)) {
            show_404('', false);
            return;
        }
        $leitura = $tipo === 'cliente' ? 'vCliente' : 'vOs';
        $edicao = $tipo === 'cliente' ? 'eCliente' : 'eOs';
        if (! $this->permite($leitura)) {
            show_error('Sem permissão para consultar este cadastro.', 403);
        }
        $id = filter_var($id, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        [$tabela, $pk] = match ($tipo) {
            'cliente' => ['clientes', 'idClientes'], 'modelo' => ['trifase_equipamento_modelos', 'id'], 'unidade' => ['trifase_equipamentos', 'id']
        };
        $registro = $id !== false ? $this->db->where($pk, $id)->get($tabela, 1)->row() : null;
        if (! $registro) {
            show_404('', false);
        }
        if (! in_array($this->input->method(true), ['GET', 'HEAD', 'POST'], true)) {
            show_error('Método não permitido.', 405);
        }
        $atual = $this->cadastros->atual($tipo, $id);
        $campos = match ($tipo) {
            'cliente' => ['categoria', 'orientacoes'], 'modelo' => ['tipo', 'marca', 'modelo'], 'unidade' => ['selo', 'serie', 'imei']
        };
        $valores = $tipo === 'cliente' ? ($atual['dados'] + ['categoria' => 'nao_classificado', 'orientacoes' => '']) : array_intersect_key((array) $registro, array_flip($campos));
        $erro = null;
        if ($this->input->method(true) === 'POST') {
            if (! $this->permite($edicao)) {
                show_error('Sem permissão para alterar este cadastro.', 403);
            }
            try {
                if ($this->input->post('confirmar') !== '1') {
                    throw new DomainException('Confirme a alteração e a preservação do histórico.');
                }
                $dados = [];
                foreach ($campos as $campo) {
                    $dados[$campo] = $this->input->post($campo) ?? '';
                }
                $versao = filter_var($this->input->post('versao'), FILTER_VALIDATE_INT, ['options' => ['min_range' => 0]]);
                if ($versao === false) {
                    throw new DomainException('Versão inválida. Recarregue a página.');
                }
                $motivo = $this->input->post('motivo');
                $operacao = $this->input->post('operacao');
                if (! is_string($motivo) || ! is_string($operacao)) {
                    throw new DomainException('Confira motivo e identificador da operação.');
                }
                $this->cadastros->alterar($tipo, $id, $dados, $versao, $motivo, (int) $this->session->userdata('id_admin'), $operacao);
                $this->session->set_flashdata('success', 'Alteração registrada. O histórico das OS foi preservado.');
                return redirect($tipo === 'cliente' ? 'clientes/visualizar/' . $id : 'trifase_cadastros/' . $tipo . '/' . $id);
            } catch (DomainException $e) {
                $erro = $e->getMessage();
                $this->output->set_status_header(422);
            } catch (RuntimeException $e) {
                $erro = 'Não foi possível confirmar a gravação. Recarregue antes de tentar novamente.';
                $this->output->set_status_header(500);
            }
        }
        $this->data['tipoCadastro'] = $tipo;
        $this->data['idCadastro'] = $id;
        $this->data['tituloCadastro'] = match ($tipo) {
            'cliente' => 'Relacionamento interno · ' . $registro->nomeCliente, 'modelo' => 'Modelo · ' . $registro->marca . ' ' . $registro->modelo, 'unidade' => 'Identificação atual · Unidade #' . $id
        };
        $this->data['valoresCadastro'] = $valores;
        $this->data['versaoCadastro'] = $atual['versao'];
        $this->data['podeEditarCadastro'] = $this->permite($edicao);
        $this->data['erroCadastro'] = $erro;
        $this->data['historicoCadastro'] = $this->cadastros->historico($tipo, $id);
        $this->data['view'] = 'trifase/cadastro';
        return $this->layout();
    }
}
