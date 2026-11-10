<?php

defined('BASEPATH') or exit('No direct script access allowed');

require_once APPPATH . 'libraries/Trifase_os_lock.php';
require_once APPPATH . 'helpers/trifase_atendimento_helper.php';
require_once APPPATH . 'helpers/trifase_retorno_helper.php';
require_once APPPATH . 'helpers/trifase_garantia_helper.php';

/** Regras financeiras e técnicas da extensão Trifase. */
class Trifase_financeiro_model extends CI_Model
{
    /** Entrada interna para ensaios com totais explícitos; não exposta por HTTP. */
    public function formalizar(int $osId, int $bruto, int $desconto, string $vencimento, int $usuario): array
    {
        return $this->transacao($osId, fn ($os) => $this->formalizarBloqueada($os, $bruto, $desconto, $vencimento, $usuario));
    }

    /** Calcula itens/descontos somente depois de obter a mesma trava dos editores. */
    public function formalizarCalculado(int $osId, string $vencimento, int $usuario, callable $calcular): array
    {
        return $this->transacao($osId, function ($os) use ($vencimento, $usuario, $calcular) {
            $t = $calcular($os);
            return $this->formalizarBloqueada($os, financeiroCentavos(number_format($t['bruto'], 2, '.', '')), financeiroCentavos(number_format($t['desconto'], 2, '.', '')), $vencimento, $usuario);
        });
    }

    private function formalizarBloqueada(object $os, int $bruto, int $desconto, string $vencimento, int $usuario): array
    {
        $this->dataValida($vencimento);
        if ($usuario <= 0 || $bruto <= 0 || $bruto > 999999999 || $desconto < 0 || $desconto >= $bruto) {
            throw new DomainException('Total inválido.');
        }
        $osId = (int) $os->idOs;
        if ((int) $os->faturado !== 0 || in_array($os->status, ['Faturado', 'Cancelado'], true) || $this->obrigacao($osId)) {
            throw new DomainException('OS já faturada ou cancelada.');
        }
        if (trifaseGarantiaOperacoesHabilitadas() && $this->db->table_exists('trifase_garantia_retornos') && $this->db->where('os_id', $osId)->count_all_results('trifase_garantia_retornos')) {
            require_once APPPATH . 'models/Trifase_orcamento_model.php';
            $q = new Trifase_orcamento_model();
            $q->db = $this->db;
            $av = $this->db->where('os_id', $osId)->where('tipo', 'avaliar')->order_by('id', 'desc')->get('trifase_garantia_eventos', 1)->row();
            $v = $q->atual($osId);
            $d = $v ? $q->decisao((int) $v->id) : null;
            $retrato = $q->retrato($os);
            if (! $av || $av->solucao !== 'novo_orcamento' || ! $v || ! $v->ativo || ! $d || $d->tipo !== 'aprovar'
                || ! hash_equals($v->conteudo_hash, $q->hash($retrato)) || $bruto - $desconto !== $retrato['total_c']) {
                throw new DomainException('Fature o retorno somente com novo orçamento vigente, aprovado e sem alterações nos itens ou valores.');
            }
        }
        $principal = $this->lancamento($osId, $bruto, $desconto, $vencimento, null, '', $usuario, false);
        $this->gravar('trifase_financeiro_obrigacoes', ['os_id' => $osId, 'bruto_c' => $bruto, 'desconto_c' => $desconto, 'vencimento' => $vencimento, 'principal_id' => $principal, 'usuario_id' => $usuario]);
        $this->gravar('trifase_financeiro_projecoes', ['lancamento_id' => $principal, 'os_id' => $osId, 'ativo' => 1]);
        $this->atualizar('os', ['faturado' => 1, 'lancamento' => $principal], ['idOs' => $osId]);
        return $this->resumo($osId);
    }

    public function receber(int $osId, int $valor, string $data, string $forma, string $chave, int $usuario): array
    {
        $this->dataValida($data);
        if ($usuario <= 0 || $valor <= 0 || ! in_array($forma, ['Pix', 'Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'Transferência'], true)) {
            throw new DomainException('Recebimento inválido.');
        }
        return $this->transacao($osId, function ($os) use ($osId, $valor, $data, $forma, $chave, $usuario) {
            $hash = $this->hashOperacao([$osId, 'receber', $valor, $data, $forma, $usuario]);
            if ($id = $this->repeticao($chave, $hash)) {
                return ['evento_id' => $id] + $this->resumo($osId);
            }
            $o = $this->exigirObrigacao($osId);
            $r = $this->resumo($osId);
            if ($valor > $r['saldo_c']) {
                throw new DomainException('Recebimento excede saldo.');
            }
            if ($os->status === 'Cancelado') {
                $acerto = $this->db->table_exists('trifase_cancelamentos')
                    ? $this->db->where('os_id', $osId)->where('tipo', 'confirmar')->order_by('id', 'desc')->get('trifase_cancelamentos', 1)->row()
                    : null;
                $retrato = $acerto ? json_decode($acerto->retrato, true, 32, JSON_THROW_ON_ERROR) : [];
                if (($retrato['acerto']['resultado'] ?? '') !== 'a_receber') {
                    throw new DomainException('Recebimento excede saldo ou OS cancelada.');
                }
            }
            // Distribuição incremental: não altera a parcela de desconto de recebimentos anteriores.
            $descontoRestante = (int) $o->desconto_c - $this->descontoRecebido($osId);
            $parte = $valor === $r['saldo_c'] ? $descontoRestante : intdiv($descontoRestante * $valor, $r['saldo_c']);
            $lancamento = $this->lancamento($osId, $valor + $parte, $parte, $o->vencimento, $data, $forma, $usuario);
            $id = $this->gravar('trifase_financeiro_eventos', ['os_id' => $osId, 'tipo' => 'receber', 'referencia_id' => null, 'valor_c' => $valor, 'desconto_c' => $parte, 'data_evento' => $data, 'forma' => $forma, 'lancamento_id' => $lancamento, 'usuario_id' => $usuario, 'motivo' => null, 'operacao' => $chave, 'payload_hash' => $hash]);
            $this->saldoNativo($osId, $usuario);
            return ['evento_id' => $id] + $this->resumo($osId);
        });
    }

    /** Uso interno, sob a mesma transação da confirmação de cancelamento com acerto financeiro. */
    public function acertarCancelamento(object $os, int $bruto, int $desconto, int $devolucao, string $data, string $forma, string $referencia, string $motivo, int $usuario, string $operacao): array
    {
        $osId = (int) $os->idOs;
        if ($usuario <= 0 || $bruto < 0 || $bruto > 999999999 || $desconto < 0 || $desconto > $bruto || $devolucao < 0) {
            throw new DomainException('Valores de acerto financeiro inválidos.');
        }
        $o = $this->obrigacao($osId);
        $r = $o !== null ? $this->resumo($osId) : ['total_c' => 0, 'recebido_c' => 0, 'saldo_c' => 0];
        $retido = (int) $r['recebido_c'];
        $liquido = $bruto - $desconto;
        $aDevolver = max(0, $retido - $liquido);
        if ($devolucao !== $aDevolver) {
            throw new DomainException('O valor da devolução deve corresponder ao cálculo do acerto.');
        }
        $despesaId = null;
        if ($devolucao > 0) {
            $this->dataValida($data);
            if (! in_array($forma, ['Pix', 'Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'Transferência'], true) || trim($referencia) === '') {
                throw new DomainException('Informe data, forma e comprovante/referência da devolução ao cliente.');
            }
            $ultimo = $this->db->select_max('data_evento', 'data')->where('os_id', $osId)->get('trifase_financeiro_eventos')->row();
            if (! empty($ultimo->data) && $data < $ultimo->data) {
                throw new DomainException('Data da devolução anterior aos recebimentos desta OS.');
            }
            $valorDec = $this->decimal($devolucao);
            $despesaId = $this->gravar('lancamentos', [
                'descricao' => 'Devolução por cancelamento · OS #' . $osId,
                'valor' => $valorDec, 'desconto' => '0.00', 'valor_desconto' => $valorDec, 'tipo_desconto' => 'real',
                'data_vencimento' => $data, 'data_pagamento' => $data, 'baixado' => 1,
                'clientes_id' => (int) ($os->clientes_id ?? 0), 'cliente_fornecedor' => 'OS #' . $osId,
                'forma_pgto' => $forma, 'tipo' => 'despesa', 'usuarios_id' => $usuario,
            ]);
            if ($this->db->table_exists('trifase_financeiro_projecoes')) {
                $this->gravar('trifase_financeiro_projecoes', ['lancamento_id' => $despesaId, 'os_id' => $osId, 'ativo' => 1]);
            }
            $hashDev = $this->hashOperacao([$osId, 'devolver', $devolucao, $data, $forma, $referencia, $motivo, $usuario]);
            $this->gravar('trifase_financeiro_eventos', [
                'os_id' => $osId, 'tipo' => 'devolver', 'referencia_id' => null, 'valor_c' => $devolucao, 'desconto_c' => 0,
                'data_evento' => $data, 'forma' => $forma, 'lancamento_id' => $despesaId, 'usuario_id' => $usuario,
                'motivo' => mb_substr('Comprovante: ' . trim($referencia) . ' · ' . trim($motivo), 0, 500),
                'operacao' => 'dev_' . mb_substr($operacao, 0, 58), 'payload_hash' => $hashDev,
            ]);
        }
        $descontoRecebido = $o !== null ? $this->descontoRecebido($osId) : 0;
        $novoDesconto = $desconto + $descontoRecebido;
        $novoBruto = $liquido + $novoDesconto;
        if ($o !== null) {
            if ($this->db->table_exists('trifase_garantia_reembolsos') && $this->db->where('origem_id', $osId)->where('cancelado_id', null)->count_all_results('trifase_garantia_reembolsos') > 0) {
                throw new DomainException('Há devolução de garantia vinculada a esta OS. Preserve a cobrança de garantia.');
            }
            $this->atualizar('trifase_financeiro_obrigacoes', ['bruto_c' => $novoBruto, 'desconto_c' => $novoDesconto, 'usuario_id' => $usuario], ['os_id' => $osId]);
            $this->saldoNativo($osId, $usuario);
        } elseif ($bruto > 0 && $this->db->table_exists('trifase_financeiro_obrigacoes') && $this->db->table_exists('lancamentos')) {
            $vencimento = date('Y-m-d');
            $principal = $this->lancamento($osId, $novoBruto, $novoDesconto, $vencimento, null, '', $usuario, false);
            $this->gravar('trifase_financeiro_obrigacoes', ['os_id' => $osId, 'bruto_c' => $novoBruto, 'desconto_c' => $novoDesconto, 'vencimento' => $vencimento, 'principal_id' => $principal, 'usuario_id' => $usuario]);
            if ($this->db->table_exists('trifase_financeiro_projecoes')) {
                $this->gravar('trifase_financeiro_projecoes', ['lancamento_id' => $principal, 'os_id' => $osId, 'ativo' => $liquido > 0 ? 1 : 0]);
            }
            $this->atualizar('os', ['faturado' => 1, 'lancamento' => $principal], ['idOs' => $osId]);
            $this->saldoNativo($osId, $usuario);
        }
        return $this->obrigacao($osId) !== null ? $this->resumo($osId) : ['total_c' => 0, 'recebido_c' => 0, 'saldo_c' => 0, 'situacao' => 'Encerrado'];
    }

    /** Correção de registro: não é reembolso bancário. Evento original permanece imutável. */
    public function estornar(int $osId, int $eventoId, string $motivo, string $data, string $chave, int $usuario): array
    {
        $this->dataValida($data);
        $motivo = trim($motivo);
        if ($usuario <= 0 || $motivo === '' || mb_strlen($motivo) > 500) {
            throw new DomainException('Informe o motivo do estorno.');
        }
        return $this->transacao($osId, function () use ($osId, $eventoId, $motivo, $data, $chave, $usuario) {
            $hash = $this->hashOperacao([$osId, 'estornar', $eventoId, $motivo, $data, $usuario]);
            if ($id = $this->repeticao($chave, $hash)) {
                return ['evento_id' => $id] + $this->resumo($osId);
            }
            $this->exigirObrigacao($osId);
            if (trifaseGarantiaCreditos($this->db, $osId)['reembolsado_c'] > 0
                || $this->db->where(['os_id' => $osId, 'tipo' => 'devolver'])->count_all_results('trifase_financeiro_eventos') > 0) {
                throw new DomainException('Há devolução registrada nesta OS. Confira o histórico antes de estornar o recebimento.');
            }
            $e = $this->db->where(['id' => $eventoId, 'os_id' => $osId, 'tipo' => 'receber'])->get('trifase_financeiro_eventos')->row();
            if (! $e || $this->db->where('referencia_id', $eventoId)->count_all_results('trifase_financeiro_eventos') > 0 || $data < $e->data_evento) {
                throw new DomainException('Recebimento inexistente, já estornado ou data inválida.');
            }
            $id = $this->gravar('trifase_financeiro_eventos', ['os_id' => $osId, 'tipo' => 'estornar', 'referencia_id' => $eventoId, 'valor_c' => $e->valor_c, 'desconto_c' => $e->desconto_c, 'data_evento' => $data, 'forma' => $e->forma, 'lancamento_id' => null, 'usuario_id' => $usuario, 'motivo' => $motivo, 'operacao' => $chave, 'payload_hash' => $hash]);
            // Preserva ID nativo; o evento mantém valores/data originais para auditoria.
            $this->atualizar('lancamentos', ['valor' => '0.00', 'desconto' => '0.00', 'valor_desconto' => '0.00', 'baixado' => 0, 'data_pagamento' => null], ['idLancamentos' => $e->lancamento_id]);
            $this->atualizar('trifase_financeiro_projecoes', ['ativo' => 0], ['lancamento_id' => $e->lancamento_id]);
            $this->saldoNativo($osId, $usuario);
            return ['evento_id' => $id] + $this->resumo($osId);
        });
    }

    public function resumo(int $osId): array
    {
        $o = $this->exigirObrigacao($osId);
        $recebido = 0;
        $devolvidoCancelamento = 0;
        foreach ($this->eventos($osId) as $e) {
            if ($e->tipo === 'devolver') {
                $devolvidoCancelamento += (int) $e->valor_c;
            } else {
                $recebido += ($e->tipo === 'receber' ? 1 : -1) * (int) $e->valor_c;
            }
        }
        $total = (int) $o->bruto_c - (int) $o->desconto_c;
        $creditos = trifaseGarantiaCreditos($this->db, $osId);
        $creditos['reembolsado_c'] += $devolvidoCancelamento;
        return trifaseGarantiaResumo($this->db, $osId, $total, $recebido, $creditos);
    }

    /** Projeções em lote para uma página de OS; evita uma consulta por recebimento. */
    public function resumos(array $ids): array
    {
        $ids = array_values(array_unique(array_filter(array_map('intval', $ids), static fn ($id) => $id > 0)));
        if ($ids === []) {
            return [];
        }
        $recebidos = [];
        $devolvidosCancelamento = [];
        foreach ($this->db->select("os_id, SUM(CASE WHEN tipo = 'receber' THEN valor_c WHEN tipo = 'estornar' THEN -valor_c ELSE 0 END) AS recebido_c, SUM(CASE WHEN tipo = 'devolver' THEN valor_c ELSE 0 END) AS devolvido_c", false)
            ->where_in('os_id', $ids)->group_by('os_id')->get('trifase_financeiro_eventos')->result() as $linha) {
            $recebidos[(int) $linha->os_id] = (int) $linha->recebido_c;
            $devolvidosCancelamento[(int) $linha->os_id] = (int) $linha->devolvido_c;
        }
        $creditos = [];
        if ($this->db->table_exists('trifase_garantia_reembolsos')) {
            foreach ($this->db->select('origem_id, SUM(valor_c) AS reembolsado_c, SUM(credito_c) AS abatimento_garantia_c', false)
                ->where_in('origem_id', $ids)->where('cancelado_id', null)->group_by('origem_id')->get('trifase_garantia_reembolsos')->result() as $c) {
                $creditos[(int) $c->origem_id] = ['reembolsado_c' => (int) $c->reembolsado_c, 'abatimento_garantia_c' => (int) $c->abatimento_garantia_c];
            }
        }
        $resumos = [];
        foreach ($this->db->where_in('os_id', $ids)->get('trifase_financeiro_obrigacoes')->result() as $o) {
            $id = (int) $o->os_id;
            $total = (int) $o->bruto_c - (int) $o->desconto_c;
            $recebido = $recebidos[$id] ?? 0;
            $cred = $creditos[$id] ?? ['reembolsado_c' => 0, 'abatimento_garantia_c' => 0];
            $cred['reembolsado_c'] += $devolvidosCancelamento[$id] ?? 0;
            $resumos[$id] = trifaseGarantiaResumo($this->db, $id, $total, $recebido, $cred);
        }
        return $resumos;
    }

    /** Documento de um evento específico: não expõe chave, hash ou notas privadas. */
    public function recibo(int $osId, int $eventoId): ?array
    {
        $evento = $this->db->select('id, os_id, valor_c, data_evento, forma, usuario_id')
            ->where(['os_id' => $osId, 'id' => $eventoId, 'tipo' => 'receber'])
            ->get('trifase_financeiro_eventos', 1)->row();
        if (! $evento) {
            return null;
        }
        $estorno = $this->db->select('id, data_evento')->where(['os_id' => $osId, 'referencia_id' => $eventoId, 'tipo' => 'estornar'])
            ->get('trifase_financeiro_eventos', 1)->row();
        return ['evento' => $evento, 'estorno' => $estorno ?: null];
    }

    public function historico(int $osId): array
    {
        return $this->eventos($osId);
    }

    public function alterarAndamento(int $osId, string $status, int $usuario): void
    {
        if (trifaseAtendimentoHabilitado() || trifaseAtendimentoDaOs($this->db, $osId) !== null || trifaseRetornoTemDerivados($this->db, $osId)) {
            require_once APPPATH . 'models/Trifase_atendimento_model.php';
            $tecnico = new Trifase_atendimento_model();
            $tecnico->db = $this->db;
            $tecnico->alterarAndamento($osId, $status, $usuario);
            return;
        }

        if ($usuario <= 0 || ! in_array($status, ['Orçamento', 'Negociação', 'Orçamento recusado', 'Aberto', 'Aprovado', 'Em Andamento', 'Aguardando Peças', 'Finalizado'], true)) {
            throw new DomainException('Andamento inválido. Cancelamento exige conciliação financeira.');
        }
        $this->transacao($osId, function ($os) use ($osId, $status, $usuario) {
            $this->exigirObrigacao($osId);
            trifaseValidarMudancaDeAndamento($this->db, $os, $status);
            if ($os->status !== $status) {
                if (! $this->db->table_exists('os_historico')) {
                    throw new DomainException('Histórico da OS indisponível.');
                }
                $this->gravar('os_historico', ['os_id' => $osId, 'status_anterior' => $os->status, 'status_novo' => $status, 'usuarios_id' => $usuario, 'data_hora' => date('Y-m-d H:i:s')]);
                $this->atualizar('os', ['status' => $status], ['idOs' => $osId]);
                $o = $this->exigirObrigacao($osId);
                if ($status === 'Finalizado' && property_exists($o, 'garantia_inicio') && empty($o->garantia_inicio)) {
                    $this->atualizar('trifase_financeiro_obrigacoes', ['garantia_inicio' => date('Y-m-d')], ['os_id' => $osId]);
                }
            }
            return $this->resumo($osId);
        });
    }

    public function salvarTecnico(int $osId, array $dados, int $usuario): void
    {
        if ($usuario <= 0 || array_diff(array_keys($dados), ['descricaoProduto', 'defeito', 'observacoes', 'laudoTecnico', 'dataFinal']) !== []) {
            throw new DomainException('O formulário técnico não altera valores ou vínculos financeiros.');
        }
        foreach (['descricaoProduto', 'defeito', 'observacoes', 'laudoTecnico'] as $campo) {
            if (isset($dados[$campo])) {
                if (! is_string($dados[$campo]) || strlen($dados[$campo]) > 60000) {
                    throw new DomainException('Texto inválido ou muito extenso.');
                }
                $dados[$campo] = osTextoParaGravar($dados[$campo]);
            }
        }
        if (isset($dados['dataFinal'])) {
            $this->dataValida($dados['dataFinal']);
        }
        $this->transacao($osId, function ($os) use ($osId, $dados, $usuario) {
            $o = $this->obrigacao($osId);
            if (! $o && trifaseAtendimentoDaOs($this->db, $osId) === null && isset($dados['dataFinal']) && $dados['dataFinal'] !== $os->dataFinal) {
                throw new DomainException('A data final desta OS antiga também referencia a garantia. Concilie antes de alterá-la.');
            }
            if ($os->status === 'Cancelado') {
                throw new DomainException('OS cancelada não aceita edição técnica.');
            }
            if ($dados !== []) {
                $this->atualizar('os', $dados, ['idOs' => $osId]);
                $this->historicoTecnico($osId, 'Dados técnicos atualizados.', $usuario);
            }
            return $o ? $this->resumo($osId) : [];
        });
    }

    public function metadados(int $osId): object
    {
        $o = $this->exigirObrigacao($osId);
        if ($tecnico = trifaseAtendimentoDaOs($this->db, $osId)) {
            $o->garantia_inicio = $tecnico->concluido_em;
        }
        return $o;
    }

    public function registrarConclusao(int $osId, string $data, int $usuario): void
    {
        if (trifaseAtendimentoHabilitado() || trifaseAtendimentoDaOs($this->db, $osId) !== null || trifaseRetornoTemDerivados($this->db, $osId)) {
            require_once APPPATH . 'models/Trifase_atendimento_model.php';
            $tecnico = new Trifase_atendimento_model();
            $tecnico->db = $this->db;
            $tecnico->registrarConclusao($osId, $data, $usuario);
            return;
        }

        $this->dataValida($data);
        if ($usuario <= 0 || $data > date('Y-m-d')) {
            throw new DomainException('A conclusão deve ser uma data já ocorrida.');
        }
        $this->transacao($osId, function ($os) use ($osId, $data, $usuario) {
            $o = $this->exigirObrigacao($osId);
            if ($os->status !== 'Finalizado' || ! empty($o->garantia_inicio)) {
                throw new DomainException('A conclusão só pode ser registrada uma vez, em uma OS finalizada.');
            }
            $this->atualizar('trifase_financeiro_obrigacoes', ['garantia_inicio' => $data], ['os_id' => $osId]);
            $this->historicoTecnico($osId, 'Conclusão registrada: ' . $data, $usuario);
            return $this->resumo($osId);
        });
    }

    private function historicoTecnico(int $osId, string $texto, int $usuario): void
    {
        $this->gravar('anotacoes_os', ['os_id' => $osId, 'anotacao' => '[Operador #' . $usuario . '] ' . $texto, 'data_hora' => date('Y-m-d H:i:s')]);
    }

    /** Relatório de conciliação: nunca vincula lançamentos por semelhança de texto. */
    public function legado(int $osId): array
    {
        $os = $this->db->where('idOs', $osId)->get('os')->row();
        $erro = null;
        $l = null;
        if (! $os || (int) $os->faturado !== 1 || $this->obrigacao($osId)) {
            $erro = 'OS sem faturamento legado elegível.';
        } elseif ($os->status === 'Cancelado') {
            $erro = 'OS cancelada exige conciliação manual.';
        } elseif (empty($os->lancamento)) {
            $erro = 'Vínculo financeiro ausente; não será inferido pela descrição.';
        } else {
            $l = $this->db->where('idLancamentos', $os->lancamento)->get('lancamentos')->row();
            if (! $l || $l->tipo !== 'receita' || (int) $l->clientes_id !== (int) $os->clientes_id) {
                $erro = 'Lançamento inexistente ou incompatível com o cliente da OS.';
            } elseif ((int) $l->baixado !== 0 || ! empty($l->data_pagamento)) {
                $erro = 'Pagamento antigo exige conferência manual; não será recriado ou duplicado.';
            } elseif (financeiroLiquido($l) <= 0 || financeiroLiquido($l) > (float) $l->valor || (float) $l->valor > 9999999.99) {
                $erro = 'Valores antigos inconsistentes.';
            } elseif ($this->db->where('lancamento', $l->idLancamentos)->count_all_results('os') !== 1) {
                $erro = 'Lançamento compartilhado entre OS.';
            } elseif ($this->db->table_exists('vendas') && $this->db->where('lancamentos_id', $l->idLancamentos)->count_all_results('vendas') > 0) {
                $erro = 'Lançamento também vinculado a venda.';
            } elseif ($this->db->table_exists('cobrancas') && $this->db->where('os_id', $osId)->count_all_results('cobrancas') > 0) {
                $erro = 'Cobrança externa deve ser conciliada antes.';
            } else {
                $iguais = $this->db->where_in('descricao', osDescricoesDaFatura($osId))->where('idLancamentos !=', $l->idLancamentos)->count_all_results('lancamentos');
                if ($iguais > 0) {
                    $erro = 'Existem outros lançamentos com a descrição histórica desta OS; confira possíveis duplicidades.';
                }
            }
        }
        return ['os' => $os, 'lancamento' => $l, 'elegivel' => $erro === null, 'motivo' => $erro];
    }

    public function conciliarLegado(int $osId, string $status, int $usuario): array
    {
        if ($usuario <= 0 || ! in_array($status, ['Orçamento', 'Negociação', 'Orçamento recusado', 'Aberto', 'Aprovado', 'Em Andamento', 'Aguardando Peças', 'Finalizado'], true)) {
            throw new DomainException('Informe o andamento real; Faturado não determina conclusão.');
        }
        return $this->transacao($osId, function ($os) use ($osId, $status, $usuario) {
            if (! empty($os->lancamento)) {
                $sufixo = $this->db->dbdriver === 'mysqli' ? ' FOR UPDATE' : '';
                $this->db->query('SELECT idLancamentos FROM lancamentos WHERE idLancamentos = ?' . $sufixo, [$os->lancamento]);
            }
            $a = $this->legado($osId);
            if (! $a['elegivel']) {
                throw new DomainException($a['motivo']);
            }
            $l = $a['lancamento'];
            $this->dataValida((string) $l->data_vencimento);
            $bruto = financeiroCentavos(number_format((float) $l->valor, 2, '.', ''));
            $liquido = financeiroCentavos(number_format(financeiroLiquido($l), 2, '.', ''));
            $this->gravar('trifase_financeiro_obrigacoes', ['os_id' => $osId, 'bruto_c' => $bruto, 'desconto_c' => $bruto - $liquido, 'vencimento' => $l->data_vencimento, 'principal_id' => $l->idLancamentos, 'usuario_id' => $usuario, 'origem' => 'legado']);
            $this->gravar('trifase_financeiro_projecoes', ['lancamento_id' => $l->idLancamentos, 'os_id' => $osId, 'ativo' => 1]);
            if ($os->status !== $status) {
                if (! $this->db->table_exists('os_historico')) {
                    throw new DomainException('Histórico indisponível.');
                }
                $this->gravar('os_historico', ['os_id' => $osId, 'status_anterior' => $os->status, 'status_novo' => $status, 'usuarios_id' => $usuario, 'data_hora' => date('Y-m-d H:i:s')]);
                $this->atualizar('os', ['status' => $status], ['idOs' => $osId]);
            }
            $this->historicoTecnico($osId, 'Faturamento legado conciliado pelo vínculo #' . $l->idLancamentos . '; valores e vencimento preservados. Conclusão não inferida.', $usuario);
            return $this->resumo($osId);
        });
    }

    /** Uso interno, sob a mesma transação da devolução de garantia. */
    public function sincronizarSaldoGarantia(int $osId, int $usuario): void
    {
        $r = $this->resumo($osId);
        if ($r['total_c'] < 0 || $r['recebido_c'] < 0 || $r['saldo_c'] < 0) {
            throw new DomainException('A correção conflita com movimentações posteriores. Concilie o histórico.');
        }
        $this->saldoNativo($osId, $usuario);
    }

    private function saldoNativo(int $osId, int $usuario): void
    {
        $o = $this->exigirObrigacao($osId);
        $saldo = $this->resumo($osId)['saldo_c'];
        $desconto = (int) $o->desconto_c - $this->descontoRecebido($osId);
        $this->atualizar('lancamentos', ['valor' => $this->decimal($saldo + $desconto), 'desconto' => $this->decimal($desconto), 'valor_desconto' => $this->decimal($saldo), 'usuarios_id' => $usuario], ['idLancamentos' => $o->principal_id]);
        $this->atualizar('trifase_financeiro_projecoes', ['ativo' => $saldo > 0 ? 1 : 0], ['lancamento_id' => $o->principal_id]);
    }

    private function descontoRecebido(int $osId): int
    {
        $valor = 0;
        foreach ($this->eventos($osId) as $e) {
            if ($e->tipo === 'devolver') {
                continue;
            }
            $valor += ($e->tipo === 'receber' ? 1 : -1) * (int) $e->desconto_c;
        }
        return $valor;
    }

    private function eventos(int $osId): array
    {
        return $this->db->where('os_id', $osId)->order_by('id')->get('trifase_financeiro_eventos')->result();
    }

    private function obrigacao(int $id): ?object
    {
        if (! $this->db->table_exists('trifase_financeiro_obrigacoes')) {
            return null;
        }
        return $this->db->where('os_id', $id)->get('trifase_financeiro_obrigacoes')->row() ?: null;
    }

    private function exigirObrigacao(int $id): object
    {
        return $this->obrigacao($id) ?? throw new DomainException('Obrigação inexistente.');
    }

    private function repeticao(string $chave, string $hash): ?int
    {
        if (! preg_match('/\A[a-zA-Z0-9_-]{16,64}\z/', $chave)) {
            throw new DomainException('Chave de operação inválida.');
        }
        $e = $this->db->where('operacao', $chave)->get('trifase_financeiro_eventos')->row();
        if ($e && ! hash_equals($e->payload_hash, $hash)) {
            throw new DomainException('Chave já utilizada com outros dados.');
        }
        return $e ? (int) $e->id : null;
    }

    private function hashOperacao(array $dados): string
    {
        return hash('sha256', json_encode($dados, JSON_THROW_ON_ERROR));
    }

    private function dataValida(string $data): void
    {
        $d = DateTimeImmutable::createFromFormat('!Y-m-d', $data);
        if (! $d || $d->format('Y-m-d') !== $data) {
            throw new DomainException('Data inválida.');
        }
    }

    private function decimal(int $centavos): string
    {
        return intdiv($centavos, 100) . '.' . str_pad((string) ($centavos % 100), 2, '0', STR_PAD_LEFT);
    }

    private function lancamento(int $osId, int $bruto, int $desconto, string $vencimento, ?string $pagamento, string $forma, int $usuario, bool $projetar = true): int
    {
        $os = $this->db->where('idOs', $osId)->get('os')->row();
        $id = $this->gravar('lancamentos', ['descricao' => 'Fatura de OS - #' . $osId . ($pagamento ? ' - Recebimento' : ' - Saldo'), 'valor' => $this->decimal($bruto), 'desconto' => $this->decimal($desconto), 'valor_desconto' => $this->decimal($bruto - $desconto), 'tipo_desconto' => 'real', 'data_vencimento' => $vencimento, 'data_pagamento' => $pagamento, 'baixado' => $pagamento ? 1 : 0, 'clientes_id' => $os->clientes_id, 'cliente_fornecedor' => 'OS #' . $osId, 'forma_pgto' => $forma, 'tipo' => 'receita', 'usuarios_id' => $usuario]);
        if ($projetar) {
            $this->gravar('trifase_financeiro_projecoes', ['lancamento_id' => $id, 'os_id' => $osId, 'ativo' => 1]);
        }
        return $id;
    }

    private function gravar(string $tabela, array $dados): int
    {
        if (! $this->db->insert($tabela, $dados)) {
            throw new RuntimeException('Falha na gravação financeira.');
        }
        return (int) $this->db->insert_id();
    }

    private function atualizar(string $tabela, array $dados, array $onde): void
    {
        if (! $this->db->where($onde)->update($tabela, $dados)) {
            throw new RuntimeException('Falha na atualização financeira.');
        }
    }

    private function transacao(int $osId, callable $acao): array
    {
        $lock = new Trifase_os_lock($this->db, $osId);
        try {
            $retorno = $acao($lock->os);
            $lock->finalizar(true);
            return $retorno;
        } catch (Throwable $erro) {
            $lock->finalizar(false);
            throw $erro;
        }
    }
}
