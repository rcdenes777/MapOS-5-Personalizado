<?php

defined('BASEPATH') or exit('No direct script access allowed');
require_once APPPATH . 'helpers/trifase_orcamento_helper.php';

class Trifase_orcamentos extends MY_Controller
{
    public function __construct()
    {
        parent::__construct();
        if (! trifaseOrcamentoHabilitado()) {
            show_404('', false);
        }
        foreach (['trifase_orcamento_estado', 'trifase_orcamento_versoes', 'trifase_orcamento_eventos'] as $tabela) {
            if (! $this->db->table_exists($tabela)) {
                show_404('', false);
            }
        }
        $this->load->model('Trifase_orcamento_model', 'orcamentos');
        $this->output->set_header('Cache-Control: private, no-store, max-age=0');
    }

    public function visualizar($id = null)
    {
        if (! $this->permission->checkPermission($this->session->userdata('permissao'), 'vOs')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'vLancamento')) {
            show_error('Você não tem permissão para consultar o orçamento.', 403);
        }
        if (! in_array($this->input->method(true), ['GET', 'HEAD'], true)) {
            show_error('Método não permitido.', 405);
        }
        $os = $this->ordem($id);
        $this->data['ordemOrcamento'] = $os;
        $this->data['retratoOrcamento'] = $this->orcamentos->retrato($os);
        $this->data['apresentacaoOrcamento'] = [
            'equipamento' => trifaseOrcamentoTexto($os->descricaoProduto ?? ''),
            'defeito' => trifaseOrcamentoTexto($os->defeito ?? ''),
            'diagnostico' => trifaseOrcamentoTexto($os->laudoTecnico ?? ''),
            'pagamento' => '', 'prazo' => '',
            'garantia' => isset($os->garantia) && $os->garantia !== '' ? $os->garantia . ' dias' : '',
        ];
        $this->data['hashOrcamento'] = $this->orcamentos->hash($this->data['retratoOrcamento']);
        $this->data['orcamentoAtual'] = $this->orcamentos->atual((int) $os->idOs);
        if ($this->data['orcamentoAtual'] !== null) {
            $publicadoAnterior = json_decode($this->data['orcamentoAtual']->conteudo, true, 32, JSON_THROW_ON_ERROR);
            foreach (['pagamento', 'prazo', 'garantia'] as $campo) {
                if (isset($publicadoAnterior['apresentacao'][$campo])) {
                    $this->data['apresentacaoOrcamento'][$campo] = $publicadoAnterior['apresentacao'][$campo];
                }
            }
        }
        $this->data['termosCondicoes'] = $this->termosCondicoes();
        $this->data['escolhasCondicoes'] = trifaseOrcamentoEscolhas($this->data['apresentacaoOrcamento'], $this->data['termosCondicoes']);
        $this->data['versoesOrcamento'] = $this->orcamentos->historico((int) $os->idOs);
        $this->data['eventosOrcamento'] = $this->orcamentos->eventos((int) $os->idOs);
        $this->data['podePublicarOrcamento'] = $this->permite('eOs') && $this->permite('publicarOrcamento');
        $this->data['view'] = 'trifase/orcamento-painel';
        $this->data['menuOs'] = 'OS';
        return $this->layout();
    }

    public function publicar($id = null)
    {
        if (! $this->permission->checkPermission($this->session->userdata('permissao'), 'vOs')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'vLancamento')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'eOs')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'publicarOrcamento')) {
            show_error('Você não tem permissão para publicar o orçamento.', 403);
        }
        $this->somentePost();
        $os = $this->ordem($id);
        try {
            if ($this->input->post('confirmar') !== '1') {
                throw new DomainException('Confirme que deseja compartilhar estes itens e valores pelo link da OS.');
            }
            $this->orcamentos->publicar((int) $os->idOs, $this->textoPost('retrato_hash'), (int) $this->session->userdata('id_admin'), $this->textoPost('operacao'), $this->apresentacaoPost());
            $this->session->set_flashdata('success', 'Versão publicada. O link ativo desta OS passa a permitir consultar estes itens e valores.');
        } catch (DomainException $e) {
            return $this->falha($e->getMessage());
        } catch (RuntimeException $e) {
            return $this->falha('Não foi possível confirmar a publicação. Recarregue e confira o histórico.', 500);
        }
        redirect('trifase_orcamentos/visualizar/' . (int) $os->idOs);
    }

    public function retirar($id = null)
    {
        if (! $this->permission->checkPermission($this->session->userdata('permissao'), 'vOs')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'vLancamento')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'eOs')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'publicarOrcamento')) {
            show_error('Você não tem permissão para retirar a publicação.', 403);
        }
        $this->somentePost();
        $os = $this->ordem($id);
        try {
            if ($this->input->post('confirmar') !== '1') {
                throw new DomainException('Confirme a retirada da publicação. O histórico interno será preservado.');
            }
            $this->orcamentos->retirar((int) $os->idOs, (int) $this->textoPost('versao'), (int) $this->session->userdata('id_admin'), $this->textoPost('operacao'));
            $this->session->set_flashdata('success', 'Orçamento retirado do link do cliente. Histórico preservado.');
        } catch (DomainException $e) {
            return $this->falha($e->getMessage());
        } catch (RuntimeException $e) {
            return $this->falha('Não foi possível confirmar a retirada. Recarregue e confira o histórico.', 500);
        }
        redirect('trifase_orcamentos/visualizar/' . (int) $os->idOs);
    }

    private function apresentacaoPost(): array
    {
        $dados = [];
        foreach (['equipamento', 'defeito', 'diagnostico', 'pagamento', 'prazo', 'garantia'] as $campo) {
            $dados[$campo] = $this->input->post('publico_' . $campo);
        }
        if ($this->input->post('condicoes_opcoes') === '1') {
            $campos = ['pagamento_vista', 'pagamento_cartao', 'pagamento_parcelas', 'pagamento_outro', 'prazo_dias', 'prazo_outro', 'prazo_importar', 'prazo_aguardar', 'garantia_dias', 'garantia_outro', 'termo_garantia_id'];
            $opcoes = [];
            foreach ($campos as $campo) {
                $opcoes[$campo] = $this->input->post($campo) ?? '';
            }
            $dados = array_replace($dados, trifaseOrcamentoCondicoes($opcoes, $this->termosCondicoes()));
        }
        return trifaseOrcamentoApresentacao($dados);
    }

    private function termosCondicoes(): array
    {
        $termos = [];
        foreach ($this->db->select('idGarantias, refGarantia, textoGarantia')->order_by('refGarantia')->get('garantias')->result_array() as $termo) {
            $termos[(int) $termo['idGarantias']] = $termo;
        }
        return $termos;
    }

    private function ordem($id): object
    {
        $id = filter_var($id, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $os = $id !== false ? $this->db->where('idOs', $id)->get('os', 1)->row() : null;
        if ($os === null) {
            show_404('', false);
        }
        return $os;
    }

    private function somentePost(): void
    {
        if ($this->input->method(true) !== 'POST') {
            show_error('Use o formulário de orçamento.', 405);
        }
    }

    private function textoPost(string $campo): string
    {
        $valor = $this->input->post($campo);
        return is_string($valor) ? $valor : '';
    }

    private function falha(string $mensagem, int $status = 422)
    {
        return $this->output->set_status_header($status)->set_content_type('text/plain', 'utf-8')->set_output($mensagem);
    }
}
