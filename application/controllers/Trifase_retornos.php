<?php

defined('BASEPATH') or exit('No direct script access allowed');
require_once APPPATH . 'helpers/trifase_retorno_helper.php';
require_once APPPATH . 'helpers/trifase_equipamento_helper.php';
require_once APPPATH . 'helpers/trifase_atendimento_helper.php';
require_once APPPATH . 'helpers/financeiro_helper.php';

class Trifase_retornos extends MY_Controller
{
    public function __construct()
    {
        parent::__construct();
        if (! trifaseRetornoHabilitado() || ! $this->db->table_exists('trifase_garantia_retornos') || ! $this->db->table_exists('trifase_garantia_eventos')) {
            show_404('', false);
        }
        $this->load->model('Trifase_retorno_model', 'retornos');
        $this->output->set_header('Cache-Control: private, no-store, max-age=0');
    }

    public function novo($origem = null)
    {
        if (! $this->permission->checkPermission($this->session->userdata('permissao'), 'vOs')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'aOs')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'eOs')) {
            show_error('Você não tem permissão para registrar retorno.', 403);
        }
        if (! trifaseEquipamentosHabilitados() || ! trifaseAtendimentoHabilitado()) {
            show_404('', false);
        }
        if (! in_array($this->input->method(true), ['GET', 'HEAD', 'POST'], true)) {
            show_error('Método não permitido.', 405);
        }
        $id = $this->id($origem);
        $erro = null;
        try {
            $referencia = $this->retornos->referencia($id);
        } catch (DomainException $e) {
            return $this->falha($e->getMessage());
        }
        if (in_array($this->input->method(true), ['GET', 'HEAD'], true)) {
            $ativo = $this->retornos->ativoDaUnidade((int) $referencia['equipamento']->equipamento_id);
            if ($ativo !== null) {
                redirect('trifase_retornos/visualizar/' . (int) $ativo->os_id);
            }
        }
        $valores = ['defeito' => '', 'itens_recebidos' => '', 'estado_entrada' => ''];
        $chave = bin2hex(random_bytes(16));
        if ($this->input->method(true) === 'POST') {
            foreach ($valores as $campo => $_) {
                $v = $this->input->post($campo);
                $valores[$campo] = is_string($v) ? $v : '';
            }
            $chave = $this->texto('operacao');
            try {
                if ($this->input->post('confirmar') !== '1') {
                    throw new DomainException('Confirme o recebimento físico e a abertura de outra OS.');
                }
                $novo = $this->retornos->criar($id, $valores, $this->usuario(), $chave);
                $this->session->set_flashdata('success', 'Retorno aberto em nova OS. Atendimento original, prazo, estoque e pagamentos preservados.');
                redirect('trifase_retornos/visualizar/' . $novo);
            } catch (DomainException $e) {
                $erro = $e->getMessage();
                $this->output->set_status_header(422);
            } catch (RuntimeException $e) {
                $erro = 'Não foi possível confirmar o retorno. Consulte os atendimentos antes de repetir.';
                $this->output->set_status_header(500);
            }
        }
        $this->data['referenciaRetorno'] = $referencia;
        $this->data['valoresRetorno'] = $valores;
        $this->data['erroRetorno'] = $erro;
        $this->data['chaveRetorno'] = $chave;
        $this->data['view'] = 'trifase/retorno-novo';
        $this->data['menuOs'] = 'OS';
        return $this->layout();
    }

    public function visualizar($id = null)
    {
        if (! $this->permission->checkPermission($this->session->userdata('permissao'), 'vOs')) {
            show_error('Você não tem permissão para consultar o retorno.', 403);
        }
        if (! in_array($this->input->method(true), ['GET', 'HEAD'], true)) {
            show_error('Método não permitido.', 405);
        }
        $id = $this->id($id);
        $v = $this->retornos->vinculo($id);
        if (! $v) {
            show_404('', false);
        }
        $financeiro = $this->permite('vLancamento');
        $verCusto = $this->permite('vCustoInterno');
        $this->data['retornoOs'] = $this->db->where('idOs', $id)->get('os', 1)->row();
        $this->data['vinculoRetorno'] = $v;
        $this->data['avaliacaoRetorno'] = $this->retornos->avaliacao($id);
        $this->data['eventosRetorno'] = array_values(array_filter($this->retornos->eventos($id), static fn ($e) => $verCusto || $e->tipo === 'avaliar'));
        $this->data['outrosRetornos'] = $this->retornos->historicoUnidade((int) $v->equipamento_id);
        $this->data['podeAvaliarRetorno'] = $this->permite('eOs');
        $this->data['verCustosRetorno'] = $verCusto;
        $this->data['editarCustosRetorno'] = $verCusto && $this->permite('eCustoInterno');
        $this->data['verFinanceiroRetorno'] = $financeiro;
        $this->data['podeNovoRetorno'] = $this->permite('aOs') && $this->permite('eOs') && $this->data['retornoOs']->status === 'Finalizado';
        $this->data['custosRetorno'] = $verCusto ? $this->retornos->custos($id) : null;
        $total = ['valor_c' => 0, 'minutos' => 0];
        if ($verCusto) {
            foreach ($this->data['outrosRetornos'] as $r) {
                $c = $this->retornos->custos((int) $r->os_id);
                $total['valor_c'] += $c['valor_c'];
                $total['minutos'] += $c['minutos'];
            }
        }
        $this->data['custosItensRetorno'] = null;
        require_once APPPATH . 'helpers/trifase_estoque_helper.php';
        if ($verCusto && trifaseEstoqueHabilitado()) {
            $this->load->model('Trifase_estoque_model', 'estoque_retorno');
            $this->data['custosItensRetorno'] = $this->estoque_retorno->resumoOs($id);
        }
        $this->data['custosUnidadeRetorno'] = $verCusto ? $total : null;
        require_once APPPATH . 'helpers/trifase_garantia_helper.php';
        $this->data['garantiaOperacoes'] = trifaseGarantiaOperacoesHabilitadas() && $this->db->table_exists('trifase_garantia_operacoes');
        if ($this->data['garantiaOperacoes']) {
            $this->load->model('Trifase_garantia_model', 'garantia_operacao');
            $this->data['trocaGarantia'] = trifaseGarantiaTroca($this->db, $id);
            $this->data['reembolsosGarantia'] = $financeiro ? $this->garantia_operacao->reembolsos($id) : [];
            $this->data['financeiroGarantia'] = $financeiro ? $this->garantia_operacao->financeiro($id) : null;
            $this->data['hashFinanceiroGarantia'] = $this->data['financeiroGarantia'] ? $this->garantia_operacao->financeiroHash($this->data['financeiroGarantia']) : '';
            $this->data['podeCorrigirReembolsoGarantia'] = $this->permite('estornarRecebimento');
            $this->data['podeTrocarGarantia'] = $this->permite('eOs') && $this->permite('trocarGarantia') && $this->permite('vProduto');
            $this->data['podeReembolsarGarantia'] = $this->permite('eOs') && $financeiro && $this->permite('reembolsarGarantia');
        }
        $this->data['view'] = 'trifase/retorno';
        $this->data['menuOs'] = 'OS';
        return $this->layout();
    }

    public function avaliar($id = null)
    {
        if (! $this->permission->checkPermission($this->session->userdata('permissao'), 'vOs')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'eOs')) {
            show_error('Você não tem permissão para avaliar o retorno.', 403);
        }
        $id = $this->postId($id);
        try {
            $dados = [];
            foreach (['cobertura', 'diagnostico', 'solucao', 'motivo'] as $campo) {
                $dados[$campo] = $this->input->post($campo);
            }
            if ($this->input->post('confirmar') !== '1') {
                throw new DomainException('Confirme a avaliação registrada.');
            }
            $this->retornos->avaliar($id, $dados, $this->inteiro('anterior', 0), $this->usuario(), $this->texto('operacao'));
            $this->session->set_flashdata('success', 'Avaliação registrada. Nenhum pagamento, orçamento ou estorno foi executado.');
        } catch (DomainException $e) {
            return $this->falha($e->getMessage());
        } catch (RuntimeException $e) {
            return $this->falha('Não foi possível confirmar a avaliação. Recarregue o histórico.', 500);
        }
        redirect('trifase_retornos/visualizar/' . $id);
    }

    public function custo($id = null)
    {
        if (! $this->permission->checkPermission($this->session->userdata('permissao'), 'vOs')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'eOs')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'vCustoInterno')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'eCustoInterno')) {
            show_error('Você não tem permissão para registrar custos internos.', 403);
        }
        $id = $this->postId($id);
        try {
            $minutos = filter_var($this->texto('minutos'), FILTER_VALIDATE_INT, ['options' => ['min_range' => 0, 'max_range' => 100000]]);
            if ($minutos === false || $this->input->post('confirmar') !== '1') {
                throw new DomainException('Confira e confirme o custo interno.');
            }
            $valor = valorDecimal($this->texto('valor'));
            if ($valor === null || ! preg_match('/\A[0-9]+(?:\.[0-9]{1,2})?\z/', $valor) || strlen($valor) > 12) {
                throw new DomainException('Informe um custo válido com até dois centavos.');
            }
            $this->retornos->custo($id, financeiroCentavos($valor), $minutos, $this->texto('descricao'), $this->usuario(), $this->texto('operacao'));
            $this->session->set_flashdata('success', 'Custo interno registrado, sem lançamento financeiro ou alteração de estoque.');
        } catch (DomainException $e) {
            return $this->falha($e->getMessage());
        } catch (RuntimeException $e) {
            return $this->falha('Não foi possível confirmar o custo. Recarregue o histórico.', 500);
        }
        redirect('trifase_retornos/visualizar/' . $id);
    }

    public function corrigirCusto($id = null)
    {
        if (! $this->permission->checkPermission($this->session->userdata('permissao'), 'vOs')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'eOs')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'vCustoInterno')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'eCustoInterno')) {
            show_error('Você não tem permissão para corrigir custos internos.', 403);
        }
        $id = $this->postId($id);
        try {
            if ($this->input->post('confirmar') !== '1') {
                throw new DomainException('Confirme a correção do custo.');
            }
            $this->retornos->corrigirCusto($id, $this->inteiro('evento', 1), $this->texto('motivo'), $this->usuario(), $this->texto('operacao'));
            $this->session->set_flashdata('success', 'Correção registrada; custo anterior preservado no histórico.');
        } catch (DomainException $e) {
            return $this->falha($e->getMessage());
        } catch (RuntimeException $e) {
            return $this->falha('Não foi possível confirmar a correção. Recarregue o histórico.', 500);
        }
        redirect('trifase_retornos/visualizar/' . $id);
    }

    public function trocar($id = null)
    {
        if (! $this->permission->checkPermission($this->session->userdata('permissao'), 'vOs')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'eOs')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'vProduto')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'trocarGarantia')) {
            show_error('Você não tem permissão para executar troca em garantia.', 403);
        }
        $id = $this->operacaoId($id);
        $custoExterno = $this->input->post('custo_externo');
        if ($custoExterno !== null && $custoExterno !== '' && (! $this->permite('vCustoInterno') || ! $this->permite('eCustoInterno'))) {
            show_error('Você não tem permissão para informar custo interno da substituta.', 403);
        }
        try {
            if ($this->input->post('confirmar') !== '1') {
                throw new DomainException('Confira e confirme a substituição física e a saída do estoque, quando aplicável.');
            }
            $d = [];
            foreach (['origem','produto_id','modelo_id','tipo','marca','modelo','selo','serie','imei','destino_antiga','motivo'] as $campo) {
                $d[$campo] = $this->texto($campo);
            }
            $d['custo_externo'] = $custoExterno === null ? '' : $this->texto('custo_externo');
            $this->garantia_operacao->trocar($id, $d, $this->inteiro('avaliacao', 1), $this->usuario(), $this->texto('operacao'));
            $this->session->set_flashdata('success', 'Troca registrada. Unidade anterior e prazo original preservados; substituta identificada.');
        } catch (DomainException $e) {
            return $this->falha($e->getMessage());
        } catch (RuntimeException $e) {
            return $this->falha('Não foi possível confirmar a troca. Confira o histórico antes de repetir.', 500);
        }
        redirect('trifase_retornos/visualizar/' . $id);
    }

    public function reembolsar($id = null)
    {
        if (! $this->permission->checkPermission($this->session->userdata('permissao'), 'vOs')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'eOs')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'vLancamento')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'reembolsarGarantia')) {
            show_error('Você não tem permissão para registrar devolução de garantia.', 403);
        }
        $id = $this->operacaoId($id);
        try {
            if ($this->input->post('confirmar') !== '1') {
                throw new DomainException('Confirme que o dinheiro já foi devolvido fora do sistema e confira o abatimento.');
            }
            $valor = valorDecimal($this->texto('valor'));
            if ($valor === null || ! preg_match('/\A[0-9]+(?:\.[0-9]{1,2})?\z/', $valor)) {
                throw new DomainException('Informe valor válido com até dois centavos.');
            }
            $d = ['valor_c' => financeiroCentavos($valor)];
            foreach (['modo','data','forma','referencia','motivo'] as $campo) {
                $d[$campo] = $this->texto($campo);
            }
            $this->garantia_operacao->reembolsar($id, $d, $this->inteiro('avaliacao', 1), $this->texto('financeiro_hash'), $this->usuario(), $this->texto('operacao'));
            $this->session->set_flashdata('success', 'Devolução registrada com saída de caixa e abatimento na cobrança original.');
        } catch (DomainException $e) {
            return $this->falha($e->getMessage());
        } catch (RuntimeException $e) {
            return $this->falha('Não foi possível confirmar a devolução. Confira o histórico antes de repetir.', 500);
        }
        redirect('trifase_retornos/visualizar/' . $id);
    }

    public function corrigirReembolso($id = null)
    {
        if (! $this->permission->checkPermission($this->session->userdata('permissao'), 'vOs')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'eOs')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'vLancamento')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'reembolsarGarantia')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'estornarRecebimento')) {
            show_error('Você não tem permissão para corrigir devolução de garantia.', 403);
        }
        $id = $this->operacaoId($id);
        try {
            if ($this->input->post('confirmar') !== '1') {
                throw new DomainException('Confirme que o dinheiro não foi devolvido e que o registro foi lançado por engano.');
            }
            $this->garantia_operacao->corrigirReembolso($id, $this->inteiro('reembolso', 1), $this->texto('motivo'), $this->usuario(), $this->texto('operacao'));
            $this->session->set_flashdata('success', 'Correção registrada. Devolução anterior preservada como cancelada, sem transferência bancária.');
        } catch (DomainException $e) {
            return $this->falha($e->getMessage());
        } catch (RuntimeException $e) {
            return $this->falha('Não foi possível confirmar a correção. Confira o histórico.', 500);
        }
        redirect('trifase_retornos/visualizar/' . $id);
    }

    private function operacaoId($id): int
    {
        require_once APPPATH . 'helpers/trifase_garantia_helper.php';
        if (! trifaseGarantiaOperacoesHabilitadas() || ! $this->db->table_exists('trifase_garantia_operacoes')) {
            show_404('', false);
        }
        $this->load->model('Trifase_garantia_model', 'garantia_operacao');
        return $this->postId($id);
    }

    private function id($id): int
    {
        $id = filter_var($id, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        if ($id === false) {
            show_404('', false);
        } return $id;
    }
    private function postId($id): int
    {
        if ($this->input->method(true) !== 'POST') {
            show_error('Use o formulário do retorno.', 405);
        } return $this->id($id);
    }
    private function texto(string $campo): string
    {
        $v = $this->input->post($campo);
        return is_string($v) ? $v : '';
    }
    private function inteiro(string $campo, int $minimo): int
    {
        $v = filter_var($this->texto($campo), FILTER_VALIDATE_INT, ['options' => ['min_range' => $minimo]]);
        if ($v === false) {
            throw new DomainException('Referência inválida. Recarregue a página.');
        } return $v;
    }
    private function usuario(): int
    {
        return (int) $this->session->userdata('id_admin');
    }
    private function falha(string $mensagem, int $status = 422)
    {
        return $this->output->set_status_header($status)->set_content_type('text/plain', 'utf-8')->set_output($mensagem);
    }
}
