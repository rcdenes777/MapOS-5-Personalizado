<?php

defined('BASEPATH') or exit('No direct script access allowed');

/** Prova de integração isolada; não publicada nem conectada às rotas da aplicação. */
class Trifase_financeiro_model extends CI_Model
{
    /** Formalização recebe totais já calculados pelo servidor, nunca pelo cliente HTTP. */
    public function formalizar(int $osId, int $bruto, int $desconto, string $vencimento, int $usuario): array
    {
        $this->dataValida($vencimento);
        if ($usuario <= 0 || $bruto <= 0 || $bruto > 999999999 || $desconto < 0 || $desconto >= $bruto) {
            throw new DomainException('Total inválido.');
        }
        return $this->transacao($osId, function ($os) use ($osId, $bruto, $desconto, $vencimento, $usuario) {
            if ((int) $os->faturado !== 0 || $os->status === 'Cancelado' || $this->obrigacao($osId)) {
                throw new DomainException('OS já faturada ou cancelada.');
            }
            $principal = $this->lancamento($osId, $bruto, $desconto, $vencimento, null, '', $usuario);
            $this->gravar('trifase_financeiro_obrigacoes', ['os_id' => $osId, 'bruto_c' => $bruto, 'desconto_c' => $desconto, 'vencimento' => $vencimento, 'principal_id' => $principal, 'usuario_id' => $usuario]);
            $this->atualizar('os', ['faturado' => 1, 'lancamento' => $principal], ['idOs' => $osId]);
            return $this->resumo($osId);
        });
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
            if ($os->status === 'Cancelado' || $valor > $r['saldo_c']) {
                throw new DomainException('Recebimento excede saldo ou OS cancelada.');
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
        foreach ($this->eventos($osId) as $e) {
            $recebido += ($e->tipo === 'receber' ? 1 : -1) * (int) $e->valor_c;
        }
        $total = (int) $o->bruto_c - (int) $o->desconto_c;
        return ['total_c' => $total, 'recebido_c' => $recebido, 'saldo_c' => $total - $recebido, 'situacao' => $recebido === 0 ? 'Pendente' : ($recebido === $total ? 'Quitado' : 'Parcialmente pago')];
    }

    public function historico(int $osId): array
    {
        return $this->eventos($osId);
    }

    public function alterarAndamento(int $osId, string $status, int $usuario): void
    {
        if ($usuario <= 0 || ! in_array($status, ['Orçamento', 'Negociação', 'Aberto', 'Aprovado', 'Em Andamento', 'Aguardando Peças', 'Finalizado'], true)) {
            throw new DomainException('Andamento inválido. Cancelamento exige conciliação financeira.');
        }
        $this->transacao($osId, function ($os) use ($osId, $status, $usuario) {
            $this->exigirObrigacao($osId);
            if ($os->status !== $status) {
                if (! $this->db->table_exists('os_historico')) {
                    throw new DomainException('Histórico da OS indisponível.');
                }
                $this->gravar('os_historico', ['os_id' => $osId, 'status_anterior' => $os->status, 'status_novo' => $status, 'usuarios_id' => $usuario, 'data_hora' => date('Y-m-d H:i:s')]);
                $this->atualizar('os', ['status' => $status], ['idOs' => $osId]);
            }
            return $this->resumo($osId);
        });
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

    private function lancamento(int $osId, int $bruto, int $desconto, string $vencimento, ?string $pagamento, string $forma, int $usuario): int
    {
        $os = $this->db->where('idOs', $osId)->get('os')->row();
        $id = $this->gravar('lancamentos', ['descricao' => 'Fatura de OS - #' . $osId . ($pagamento ? ' - Recebimento' : ' - Saldo'), 'valor' => $this->decimal($bruto), 'desconto' => $this->decimal($desconto), 'valor_desconto' => $this->decimal($bruto - $desconto), 'tipo_desconto' => 'real', 'data_vencimento' => $vencimento, 'data_pagamento' => $pagamento, 'baixado' => $pagamento ? 1 : 0, 'clientes_id' => $os->clientes_id, 'cliente_fornecedor' => 'OS #' . $osId, 'forma_pgto' => $forma, 'tipo' => 'receita', 'usuarios_id' => $usuario]);
        $this->gravar('trifase_financeiro_projecoes', ['lancamento_id' => $id, 'os_id' => $osId, 'ativo' => 1]);
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
        if ($osId <= 0 || ! $this->db->trans_begin()) {
            throw new DomainException('OS inválida.');
        }
        try {
            $lock = match ($this->db->dbdriver) {
                'mysqli' => ' FOR UPDATE', 'sqlite3' => '', default => throw new RuntimeException('Driver não suportado.')
            };
            $os = $this->db->query('SELECT idOs, status, faturado, clientes_id FROM os WHERE idOs = ?' . $lock, [$osId])->row();
            if (! $os) {
                throw new DomainException('OS inexistente.');
            }
            $retorno = $acao($os);
            if (! $this->db->trans_status() || ! $this->db->trans_commit()) {
                throw new RuntimeException('Falha na transação financeira.');
            }
            return $retorno;
        } catch (Throwable $erro) {
            $this->db->trans_rollback();
            throw $erro;
        }
    }
}
