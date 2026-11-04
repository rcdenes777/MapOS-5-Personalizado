<?php

defined('BASEPATH') or exit('No direct script access allowed');
require_once APPPATH . 'libraries/Trifase_os_lock.php';
require_once APPPATH . 'helpers/trifase_financeiro_helper.php';
require_once APPPATH . 'helpers/trifase_estoque_helper.php';
require_once APPPATH . 'helpers/trifase_garantia_helper.php';
require_once APPPATH . 'helpers/trifase_retorno_helper.php';

/** Pedido não muda a OS; confirmação exige conferência atual e conciliação. */
class Trifase_cancelamento_model extends CI_Model
{
    public function historico(int $os): array
    {
        return $this->db->where('os_id', $os)->order_by('id', 'desc')->get('trifase_cancelamentos')->result();
    }

    public function atual(int $os): ?object
    {
        return $this->db->where('os_id', $os)->order_by('id', 'desc')->get('trifase_cancelamentos', 1)->row() ?: null;
    }

    public function conferencia(object $os): array
    {
        $id = (int) $os->idOs;
        $pecas = $this->db->select('i.idProdutos_os AS id, i.produtos_id, i.quantidade, i.preco, i.subTotal, p.descricao AS nome')->from('produtos_os i')
            ->join('produtos p', 'p.idProdutos = i.produtos_id', 'left')->where('i.os_id', $id)->order_by('i.idProdutos_os')->get()->result_array();
        $servicos = $this->db->select('i.*, s.nome')->from('servicos_os i')->join('servicos s', 's.idServicos = i.servicos_id', 'left')->where('i.os_id', $id)->order_by('i.idServicos_os')->get()->result_array();
        $bloqueios = [];
        if (in_array($os->status, ['Cancelado', 'Faturado', 'Finalizado'], true)) {
            $bloqueios[] = 'Atendimento cancelado, faturado legado ou concluído: concilie o encerramento antes de cancelar.';
        }
        $financeiro = null;
        if (trifaseFinanceiroOsGerida($this->db, $id)) {
            require_once APPPATH . 'models/Trifase_financeiro_model.php';
            $f = new Trifase_financeiro_model();
            $f->db = $this->db;
            $financeiro = $f->resumo($id);
            $bloqueios[] = 'Existe obrigação financeira formalizada. Concilie cobrança, recebimentos e eventuais devoluções antes de confirmar; este fluxo não baixa nem apaga a obrigação.';
        }
        if ((int) ($os->faturado ?? 0) === 1 || ! empty($os->lancamento)) {
            $bloqueios[] = 'Existe faturamento ou lançamento associado. A regularização financeira deve ser concluída antes do cancelamento.';
        }
        require_once APPPATH . 'helpers/os_helper.php';
        if ($this->db->table_exists('lancamentos') && $this->db->where_in('descricao', osDescricoesDaFatura($id))->count_all_results('lancamentos')) {
            $bloqueios[] = 'Existem lançamentos nativos vinculados à fatura desta OS. Concilie-os no financeiro.';
        }
        if ($this->db->table_exists('trifase_financeiro_eventos') && $this->db->where('os_id', $id)->count_all_results('trifase_financeiro_eventos') && $financeiro === null) {
            $bloqueios[] = 'Há eventos financeiros sem obrigação identificada. Solicite conferência do financeiro.';
        }
        if ($this->db->table_exists('cobrancas') && $this->db->where('os_id', $id)->count_all_results('cobrancas') > 0) {
            $bloqueios[] = 'Existe cobrança associada à OS. Confira sua situação no financeiro.';
        }
        if ($this->db->table_exists('trifase_atendimentos') && $this->db->where('os_id', $id)->count_all_results('trifase_atendimentos')) {
            $bloqueios[] = 'A conclusão técnica já está registrada. Preserve-a e concilie o atendimento antes de cancelar.';
        }
        if ($this->db->table_exists('trifase_entregas_estado') && $this->db->where('os_id', $id)->where('evento_id IS NOT NULL', null, false)->count_all_results('trifase_entregas_estado')) {
            $bloqueios[] = 'Há entrega física registrada. Confira o comprovante antes de cancelar.';
        }
        if (trifaseRetornoTemDerivados($this->db, $id) || trifaseGarantiaResolucaoExecutada($this->db, $id)) {
            $bloqueios[] = 'Há retorno ou solução de garantia vinculada. Preserve o histórico e concilie a garantia.';
        }
        if ($pecas !== [] && (! trifaseEstoqueHabilitado() || ! $this->db->table_exists('trifase_estoque_eventos'))) {
            $bloqueios[] = 'Reative o estoque auditável para conferir e registrar a devolução das peças não utilizadas.';
        }
        $retrato = ['os' => $id, 'status' => $os->status, 'pecas' => $pecas, 'servicos' => $servicos, 'financeiro' => $financeiro, 'bloqueios' => $bloqueios];
        return $retrato + ['hash' => hash('sha256', json_encode($retrato, JSON_THROW_ON_ERROR))];
    }

    public function solicitar(int $id, string $origem, string $motivo, int $usuario, string $operacao): int
    {
        if (! in_array($origem, ['cliente', 'assistencia'], true)) {
            throw new DomainException('Escolha se o pedido foi feito pelo cliente ou por iniciativa da assistência.');
        }
        $motivo = $this->texto($motivo, 2000);
        return $this->executar($id, $usuario, $operacao, ['solicitar', $origem, $motivo], function ($os) use ($id, $origem, $motivo, $usuario, $operacao) {
            if ($os->status === 'Cancelado' || ($this->atual($id)->tipo ?? '') === 'solicitar') {
                throw new DomainException('Esta OS já está cancelada ou tem pedido pendente. Confira o histórico.');
            }
            $cliente = $this->db->select('nomeCliente')->where('idClientes', (int) $os->clientes_id)->get('clientes', 1)->row();
            if ($origem === 'cliente' && ($cliente === null || trim((string) $cliente->nomeCliente) === '')) {
                throw new DomainException('Confira o cliente vinculado à OS antes de registrar o pedido.');
            }
            $nome = (string) ($cliente->nomeCliente ?? '');
            $solicitante = $origem === 'cliente' ? mb_substr('Cliente: ' . $nome, 0, 160) : 'Por iniciativa da assistência';
            $retrato = $this->conferencia($os);
            $retrato['solicitacao'] = ['origem' => $origem, 'cliente_id' => (int) $os->clientes_id, 'nome_cliente' => $nome];
            return $this->evento($id, 'solicitar', null, $solicitante, $motivo, $retrato, $usuario, $operacao);
        });
    }

    public function retirar(int $id, int $pedido, string $motivo, int $usuario, string $operacao): int
    {
        $motivo = $this->texto($motivo, 2000);
        return $this->executar($id, $usuario, $operacao, ['retirar', $pedido, $motivo], function ($os) use ($id, $pedido, $motivo, $usuario, $operacao) {
            $p = $this->pedido($id, $pedido);
            return $this->evento($id, 'retirar', $pedido, $p->solicitante, $motivo, $this->conferencia($os), $usuario, $operacao);
        });
    }

    public function confirmar(int $id, int $pedido, array $dados, int $usuario, string $operacao, bool $controlaEstoque): int
    {
        return $this->executar($id, $usuario, $operacao, ['confirmar', $pedido, $dados, $controlaEstoque], function ($os) use ($id, $pedido, $dados, $usuario, $operacao, $controlaEstoque) {
            $p = $this->pedido($id, $pedido);
            $c = $this->conferencia($os);
            if (! is_string($dados['hash'] ?? null) || ! hash_equals($c['hash'], $dados['hash'])) {
                throw new DomainException('A OS mudou desde a conferência. Reabra o cancelamento e confira os dados atuais.');
            }
            if ($c['bloqueios'] !== []) {
                throw new DomainException(implode(' ', $c['bloqueios']));
            }
            if (($dados['pecas_nao_utilizadas'] ?? '') !== '1' || ($dados['servicos_nao_executados'] ?? '') !== '1' || ($dados['financeiro_conferido'] ?? '') !== '1' || ($dados['confirmar'] ?? '') !== '1') {
                throw new DomainException('Confirme a conferência. Peças utilizadas, serviços executados ou valores pendentes exigem conciliação antes do cancelamento.');
            }
            if ($c['pecas'] !== [] && ! $controlaEstoque) {
                throw new DomainException('Confira o controle de estoque antes de devolver as peças da OS.');
            }
            $motivo = $this->texto($dados['conferencia'] ?? '', 2000);
            require_once APPPATH . 'models/Trifase_estoque_model.php';
            $estoque = new Trifase_estoque_model();
            $estoque->db = $this->db;
            foreach ($c['pecas'] as $peca) {
                $q = filter_var($peca['quantidade'], FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 1000000]]);
                if ($q === false) {
                    throw new DomainException('Confira a quantidade inteira das peças antes de cancelar.');
                }
                $estoque->movimentar((int) $peca['produtos_id'], 'os_devolucao', $q, null, date('Y-m-d'), 'Cancelamento conferido da OS #' . $id . ': ' . mb_substr($motivo, 0, 1800), 'OS #' . $id, $usuario, hash('sha256', $operacao . ':' . $peca['id']));
            }
            $evento = $this->evento($id, 'confirmar', $pedido, $p->solicitante, $motivo, $c, $usuario, $operacao);
            if (! $this->db->insert('os_historico', ['os_id' => $id, 'status_anterior' => $os->status, 'status_novo' => 'Cancelado', 'usuarios_id' => $usuario, 'data_hora' => date('Y-m-d H:i:s')])
                || ! $this->db->where('idOs', $id)->update('os', ['status' => 'Cancelado'])) {
                throw new RuntimeException('Não foi possível confirmar o cancelamento.');
            }
            return $evento;
        });
    }

    private function pedido(int $id, int $pedido): object
    {
        $p = $this->atual($id);
        if ($p === null || $p->tipo !== 'solicitar' || (int) $p->id !== $pedido) {
            throw new DomainException('Pedido alterado ou já encerrado. Reabra a OS.');
        }
        return $p;
    }

    private function texto(mixed $valor, int $limite): string
    {
        if (! is_string($valor) || ! mb_check_encoding($valor, 'UTF-8') || trim($valor) === '' || mb_strlen($valor) > $limite || preg_match('/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/', $valor)) {
            throw new DomainException('Informe solicitante, motivo e conferência válidos, respeitando os limites dos campos.');
        }
        return trim($valor);
    }

    private string $hashOperacao = '';

    private function executar(int $id, int $usuario, string $operacao, array $dados, callable $acao): int
    {
        if ($usuario <= 0 || ! preg_match('/\A[a-zA-Z0-9_-]{16,64}\z/', $operacao)) {
            throw new DomainException('Operador ou identificador inválido. Reabra a OS.');
        }
        $hash = hash('sha256', json_encode([$id, $usuario, $dados], JSON_THROW_ON_ERROR));
        $lock = new Trifase_os_lock($this->db, $id);
        try {
            $anterior = $this->db->where('operacao', $operacao)->get('trifase_cancelamentos', 1)->row();
            if ($anterior !== null) {
                if (! hash_equals($anterior->payload_hash, $hash)) {
                    throw new DomainException('Chave já utilizada com outros dados.');
                }
                $lock->finalizar(true);
                return (int) $anterior->id;
            }
            $this->hashOperacao = $hash;
            $resultado = $acao($lock->os);
            $lock->finalizar(true);
            return $resultado;
        } catch (Throwable $e) {
            $lock->finalizar(false);
            throw $e;
        }
    }

    private function evento(int $id, string $tipo, ?int $pedido, string $solicitante, string $motivo, array $retrato, int $usuario, string $operacao): int
    {
        $json = json_encode($retrato, JSON_THROW_ON_ERROR);
        if (strlen($json) > 60000 || ! $this->db->insert('trifase_cancelamentos', ['os_id' => $id, 'tipo' => $tipo, 'pedido_id' => $pedido, 'solicitante' => $solicitante, 'motivo' => $motivo, 'retrato' => $json, 'usuario_id' => $usuario, 'criado_em' => date('Y-m-d H:i:s'), 'operacao' => $operacao, 'payload_hash' => $this->hashOperacao])) {
            throw new RuntimeException('Não foi possível preservar o registro do cancelamento.');
        }
        return (int) $this->db->insert_id();
    }
}
