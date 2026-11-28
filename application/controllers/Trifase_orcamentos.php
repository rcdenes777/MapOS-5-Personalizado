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
        return $this->painel($this->ordem($id));
    }

    private function painel(object $os, ?array $previa = null)
    {
        $this->data['previaNegociacao'] = $previa;
        $this->data['linkPublicoAtivo'] = null;
        if ($this->permite('eOs')) {
            require_once APPPATH . 'helpers/trifase_publico_helper.php';
            if (trifasePublicoHabilitado() && $this->db->table_exists('trifase_publico_links')) {
                $this->load->model('Trifase_publico_model', 'publico_model');
                $token = $this->publico_model->tokenAtivo((int) $os->idOs);
                $this->data['linkPublicoAtivo'] = $token !== null ? trifasePublicoUrl($token, base_url(), (string) config_item('index_page')) : null;
                $this->output->set_header('Referrer-Policy: no-referrer');
            }
        }
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
        $this->data['orcamentoEntregue'] = $this->orcamentos->entregue((int) $os->idOs);
        $this->data['orcamentoAtual'] = $this->orcamentos->atual((int) $os->idOs);
        if ($previa !== null && ($this->data['orcamentoAtual'] === null || ! $this->data['orcamentoAtual']->ativo
            || (int) $this->data['orcamentoAtual']->id !== $previa['versao']
            || ! hash_equals($previa['hash_anterior'], $this->data['hashOrcamento'])
            || ! hash_equals($previa['hash_anterior'], $this->data['orcamentoAtual']->conteudo_hash))) {
            throw new DomainException('O orçamento mudou. Reabra e calcule uma nova prévia.');
        }
        $this->data['apresentacaoPublicada'] = [];
        if ($this->data['orcamentoAtual'] !== null) {
            $publicadoAnterior = json_decode($this->data['orcamentoAtual']->conteudo, true, 32, JSON_THROW_ON_ERROR);
            $this->data['apresentacaoPublicada'] = $publicadoAnterior['apresentacao'] ?? [];
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
        $this->data['aguardaDecisaoOrcamento'] = $this->data['orcamentoAtual'] !== null
            && (bool) $this->data['orcamentoAtual']->ativo
            && hash_equals($this->data['orcamentoAtual']->conteudo_hash, $this->data['hashOrcamento'])
            && $this->orcamentos->decisao((int) $this->data['orcamentoAtual']->id) === null;
        $this->data['orcamentoVigente'] = $this->data['orcamentoAtual'] !== null
            && hash_equals($this->data['orcamentoAtual']->conteudo_hash, $this->data['hashOrcamento']);
        $this->data['negociacaoDisponivel'] = $this->orcamentos->negociacaoDisponivel();
        $this->data['negociacaoMotivo'] = $this->orcamentos->negociacaoMotivo();
        $this->data['podePublicarOrcamento'] = $this->permite('eOs') && $this->permite('publicarOrcamento');
        $this->data['view'] = 'trifase/orcamento-painel';
        $this->data['menuOs'] = 'OS';
        return $this->layout();
    }

    public function prever_desconto($id = null)
    {
        if (! $this->permission->checkPermission($this->session->userdata('permissao'), 'vOs')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'vLancamento')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'eOs')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'publicarOrcamento')) {
            show_error('Você não tem permissão para negociar o orçamento.', 403);
        }
        $this->somentePost();
        $os = $this->ordem($id);
        try {
            $dados = $this->dadosNegociacao();
            $resultado = $this->orcamentos->preverDesconto((int) $os->idOs, $dados['versao'], $dados['hash_anterior'], $dados['tipo'], $dados['valor']);
            $dados['retrato'] = $resultado['retrato'];
            $dados['hash_proposto'] = $resultado['hash_proposto'];
            $dados['operacao'] = bin2hex(random_bytes(16));
            $this->session->set_userdata('negociacao_previa_' . (int) $os->idOs, [
                'versao' => $dados['versao'],
                'hash' => $resultado['hash_proposto'],
                'expira' => time() + 600,
            ]);
            return $this->painel($os, $dados);
        } catch (DomainException $e) {
            return $this->falha($e->getMessage());
        } catch (RuntimeException $e) {
            return $this->falha('Não foi possível calcular a prévia. Recarregue e tente novamente.', 500);
        }
    }

    public function negociar_desconto($id = null)
    {
        if (! $this->permission->checkPermission($this->session->userdata('permissao'), 'vOs')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'vLancamento')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'eOs')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'publicarOrcamento')) {
            show_error('Você não tem permissão para negociar o orçamento.', 403);
        }
        $this->somentePost();
        $os = $this->ordem($id);
        try {
            $dados = $this->dadosNegociacao(true);
            if ($this->input->post('confirmar') !== '1') {
                throw new DomainException('Confirme a publicação da nova versão.');
            }
            $previa = $this->session->userdata('negociacao_previa_' . (int) $os->idOs);
            $hashProposto = $this->textoPost('hash_proposto');
            if (! is_array($previa) || ($previa['expira'] ?? 0) < time()
                || (int) ($previa['versao'] ?? 0) !== $dados['versao']
                || ! is_string($previa['hash'] ?? null) || ! hash_equals($previa['hash'], $hashProposto)) {
                throw new DomainException('A prévia expirou ou não confere. Calcule novamente antes de publicar.');
            }
            $this->orcamentos->negociarDesconto((int) $os->idOs, $dados['versao'], $dados['hash_anterior'], (int) $this->session->userdata('id_admin'), $this->textoPost('operacao'), $dados['tipo'], $dados['valor'], $dados['motivo'], $hashProposto);
            $this->session->set_flashdata('success', 'Negociação confirmada. Se esta operação já havia sido registrada, nenhuma nova versão foi criada. O link permanece o mesmo.');
        } catch (DomainException $e) {
            return $this->falha($e->getMessage());
        } catch (RuntimeException $e) {
            return $this->falha('Não foi possível confirmar a negociação. Confira o histórico antes de tentar novamente.', 500);
        }
        redirect('trifase_orcamentos/visualizar/' . (int) $os->idOs);
    }

    private function dadosNegociacao(bool $confirmacao = false): array
    {
        $tipo = $this->comunicacaoPost('tipo');
        $valor = $this->comunicacaoPost($confirmacao ? 'valor_codificado' : 'valor');
        $motivo = $this->comunicacaoPost($confirmacao ? 'motivo_codificado' : 'motivo');
        if ($confirmacao) {
            $valor = is_string($valor) ? base64_decode($valor, true) : false;
            $motivo = is_string($motivo) ? base64_decode($motivo, true) : false;
        }
        $versao = filter_var($this->textoPost('versao'), FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        if ($versao === false || ! is_string($tipo) || ! in_array($tipo, ['real', 'porcento'], true) || ! is_string($valor) || ! is_string($motivo) || trim($motivo) === '') {
            throw new DomainException('Informe tipo, valor e motivo interno para negociar.');
        }
        return ['versao' => $versao, 'hash_anterior' => $this->textoPost('hash_anterior'), 'tipo' => $tipo, 'valor' => $valor, 'motivo' => $motivo];
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

    public function registrar_resposta($id = null)
    {
        if (! $this->permission->checkPermission($this->session->userdata('permissao'), 'vOs')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'vLancamento')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'eOs')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'publicarOrcamento')) {
            show_error('Você não tem permissão para registrar a resposta do cliente.', 403);
        }
        $this->somentePost();
        $os = $this->ordem($id);
        try {
            $hashConfirmado = $this->textoPost('retrato_hash');
            if ($this->input->post('confirmar_retrato') !== '1' || ! preg_match('/\A[a-f0-9]{64}\z/', $hashConfirmado)) {
                throw new DomainException('Orçamento indisponível ou atualizado. Reabra e confira a versão.');
            }
            $this->orcamentos->registrarRespostaInterna(
                (int) $os->idOs,
                (int) $this->textoPost('versao'),
                $this->input->post('decisao'),
                $this->input->post('nome'),
                $this->input->post('confirmar'),
                $this->textoPost('operacao'),
                (int) $this->session->userdata('id_admin'),
                [
                    'canal' => $this->input->post('canal'),
                    'comunicado_em' => $this->input->post('comunicado_em'),
                    'observacao' => $this->comunicacaoPost('observacao') ?? '',
                ],
                $hashConfirmado
            );
            $this->session->set_flashdata('success', 'Resposta registrada na versão do orçamento.');
        } catch (DomainException $e) {
            $this->session->set_flashdata('error', $e->getMessage());
        } catch (RuntimeException $e) {
            $this->session->set_flashdata('error', 'Não foi possível confirmar a resposta. Confira o histórico antes de tentar novamente.');
        }
        redirect('os/visualizar/' . (int) $os->idOs . '?secao=compartilhamento#os-secoes');
    }

    public function regularizar_resposta($id = null)
    {
        if (! $this->permission->checkPermission($this->session->userdata('permissao'), 'vOs')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'vLancamento')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'eOs')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'publicarOrcamento')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'regularizarOrcamento')) {
            show_error('Você não tem permissão para regularizar respostas de orçamento.', 403);
        }
        $this->somentePost();
        $os = $this->ordem($id);
        try {
            $this->orcamentos->registrarRegularizacao(
                (int) $os->idOs,
                (int) $this->textoPost('versao'),
                $this->input->post('decisao'),
                $this->input->post('nome'),
                $this->input->post('confirmar'),
                $this->textoPost('operacao'),
                (int) $this->session->userdata('id_admin'),
                [
                    'canal' => $this->input->post('canal'),
                    'comunicado_em' => $this->input->post('comunicado_em'),
                    'observacao' => $this->comunicacaoPost('observacao') ?? '',
                    'justificativa' => $this->comunicacaoPost('justificativa'),
                ]
            );
            $this->session->set_flashdata('success', 'Regularização administrativa tardia registrada com o horário atual. Entrega e status preservados.');
        } catch (DomainException $e) {
            return $this->falha($e->getMessage());
        } catch (RuntimeException $e) {
            return $this->falha('Não foi possível confirmar a regularização. Confira o histórico antes de tentar novamente.', 500);
        }
        redirect('os/visualizar/' . (int) $os->idOs . '?secao=compartilhamento#os-secoes');
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

    private function comunicacaoPost(string $campo): mixed
    {
        // O POST já foi limpo pelo CI. Estes formulários não enviam arquivos;
        // só aceitar URL-encoded, preservando os bytes para validar no modelo.
        $tipo = explode(';', (string) $this->input->server('CONTENT_TYPE'), 2)[0];
        if (strtolower(trim($tipo)) !== 'application/x-www-form-urlencoded') {
            throw new DomainException('Formato de comunicação não suportado. Use o formulário URL-encoded do orçamento.');
        }
        return $this->input->input_stream($campo, false);
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
