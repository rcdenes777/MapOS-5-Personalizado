<?php

defined('BASEPATH') or exit('No direct script access allowed');

class Trifase_cancelamentos extends MY_Controller
{
    public function __construct()
    {
        parent::__construct();
        if (! $this->db->table_exists('trifase_cancelamentos')) {
            show_404('', false);
        }
        $this->load->model('Trifase_cancelamento_model', 'cancelamentos');
        $this->output->set_header('Cache-Control: private, no-store, max-age=0');
        $this->output->set_header('Referrer-Policy: no-referrer');
    }

    public function visualizar($id = null)
    {
        if (! $this->permission->checkPermission($this->session->userdata('permissao'), 'vOs')) {
            show_error('Você não tem permissão para consultar esta OS.', 403);
        }
        if (! in_array($this->input->method(true), ['GET', 'HEAD'], true)) {
            show_error('Método não permitido.', 405);
        }
        return $this->pagina($this->ordem($id));
    }

    public function solicitar($id = null)
    {
        if (! $this->permission->checkPermission($this->session->userdata('permissao'), 'vOs')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'eOs')) {
            show_error('Você não tem permissão para esta operação de cancelamento.', 403);
        }
        return $this->mutacao($id, 'solicitar');
    }

    public function retirar($id = null)
    {
        if (! $this->permission->checkPermission($this->session->userdata('permissao'), 'vOs')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'eOs')) {
            show_error('Você não tem permissão para esta operação de cancelamento.', 403);
        }
        return $this->mutacao($id, 'retirar');
    }

    public function confirmar($id = null)
    {
        if (! $this->permission->checkPermission($this->session->userdata('permissao'), 'vOs')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'eOs')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'vLancamento')
            || ! $this->permission->checkPermission($this->session->userdata('permissao'), 'eLancamento')) {
            show_error('Você não tem permissão para esta operação de cancelamento.', 403);
        }
        return $this->mutacao($id, 'confirmar');
    }

    private function mutacao($id, string $tipo)
    {
        if ($this->input->method(true) !== 'POST') {
            show_error('Use o formulário de cancelamento.', 405);
        }
        $os = $this->ordem($id);
        try {
            $usuario = (int) $this->session->userdata('id_admin');
            $op = $this->texto('operacao');
            if ($tipo === 'solicitar') {
                $this->cancelamentos->solicitar((int) $os->idOs, $this->texto('origem'), $this->texto('motivo'), $usuario, $op);
            } else {
                $pedido = filter_var($this->input->post('pedido_id'), FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
                if ($pedido === false) {
                    throw new DomainException('Pedido inválido. Reabra a OS.');
                }
                if ($tipo === 'retirar') {
                    $this->cancelamentos->retirar((int) $os->idOs, $pedido, $this->texto('motivo'), $usuario, $op);
                } else {
                    $dados = [];
                    foreach (['hash', 'pecas_nao_utilizadas', 'servicos_nao_executados', 'financeiro_conferido', 'confirmar', 'conferencia'] as $campo) {
                        $dados[$campo] = $this->input->post($campo);
                    }
                    $this->cancelamentos->confirmar((int) $os->idOs, $pedido, $dados, $usuario, $op, (bool) ($this->data['configuration']['control_estoque'] ?? false));
                }
            }
            log_info('Cancelamento de OS #' . (int) $os->idOs . ': ' . $tipo);
            $this->session->set_flashdata('success', match ($tipo) {
                'solicitar' => 'Pedido registrado. A OS continua no andamento atual até a conferência e confirmação.',
                'retirar' => 'Pedido retirado com motivo. O histórico foi preservado.',
                default => 'Cancelamento confirmado. Peças conferidas como não utilizadas foram devolvidas ao estoque; nenhum pagamento foi alterado.',
            });
            redirect('os/visualizar/' . (int) $os->idOs);
        } catch (DomainException $e) {
            $this->output->set_status_header(422);
            return $this->pagina($this->ordem($id), $e->getMessage());
        } catch (RuntimeException $e) {
            $this->output->set_status_header(500);
            return $this->pagina($this->ordem($id), 'Não foi possível confirmar. Confira o histórico antes de tentar novamente.');
        }
    }

    private function pagina(object $os, ?string $erro = null)
    {
        $c = $this->cancelamentos->conferencia($os);
        $cliente = $this->db->select('nomeCliente')->where('idClientes', (int) $os->clientes_id)->get('clientes', 1)->row();
        $pecas = array_map(static fn ($i) => ['nome' => $i['nome'], 'quantidade' => $i['quantidade']], $c['pecas']);
        $servicos = array_map(static fn ($i) => ['nome' => $i['nome'], 'quantidade' => $i['quantidade']], $c['servicos']);
        if ($pecas !== [] && ! ($this->data['configuration']['control_estoque'] ?? false)) {
            $c['bloqueios'][] = 'Confira a configuração de controle de estoque antes da devolução de peças.';
        }
        $this->data += ['erroCancelamento' => $erro, 'osCancelamento' => $os,
            'pedidoCancelamento' => $this->cancelamentos->atual((int) $os->idOs),
            'historicoCancelamento' => $this->cancelamentos->historico((int) $os->idOs),
            'pecasCancelamento' => $pecas, 'servicosCancelamento' => $servicos,
            'bloqueiosCancelamento' => $c['bloqueios'], 'hashCancelamento' => $c['hash'],
            'financeiroCancelamento' => $this->permite('vLancamento') ? $c['financeiro'] : null,
            'podePedirCancelamento' => $this->permite('eOs'),
            'podeConfirmarCancelamento' => $this->permite('eOs') && $this->permite('vLancamento') && $this->permite('eLancamento'),
            'clienteCancelamento' => (string) ($cliente->nomeCliente ?? 'Cliente não localizado'),
            'valoresCancelamento' => ['origem' => $this->input->method(true) === 'POST' ? $this->texto('origem') : 'cliente', 'motivo' => $this->texto('motivo'), 'conferencia' => $this->texto('conferencia')],
        ];
        $this->data['view'] = 'trifase/cancelamento';
        return $this->layout();
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

    private function texto(string $campo): string
    {
        $v = $this->input->post($campo);
        return is_string($v) ? $v : '';
    }
}
