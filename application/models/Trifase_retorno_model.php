<?php

defined('BASEPATH') or exit('No direct script access allowed');
require_once APPPATH . 'libraries/Trifase_os_lock.php';
require_once APPPATH . 'helpers/trifase_retorno_helper.php';
require_once APPPATH . 'helpers/trifase_atendimento_helper.php';
require_once APPPATH . 'models/Trifase_equipamento_model.php';

class Trifase_retorno_model extends CI_Model
{
    public function vinculo(int $id): ?object
    {
        return trifaseRetornoDaOs($this->db, $id);
    }

    public function avaliacao(int $id): ?object
    {
        return $this->db->where('os_id', $id)->where('tipo', 'avaliar')->order_by('id', 'desc')->get('trifase_garantia_eventos', 1)->row() ?: null;
    }

    public function eventos(int $id): array
    {
        return $this->db->where('os_id', $id)->order_by('id', 'desc')->get('trifase_garantia_eventos')->result();
    }

    /** Só aceita uma referência já conhecida, nunca a previsão antiga. */
    public function referencia(int $anterior): array
    {
        $os = $this->db->where('idOs', $anterior)->get('os', 1)->row();
        $vinculo = $this->vinculo($anterior);
        $raiz = $vinculo ? (int) $vinculo->origem_id : $anterior;
        $origem = $this->db->where('idOs', $raiz)->get('os', 1)->row();
        $eq = new Trifase_equipamento_model();
        $eq->db = $this->db;
        $unidade = $eq->porOs($anterior);
        $original = $eq->porOs($raiz);
        if (! $os || ! $origem || ! $unidade || ! $original || (int) $unidade->equipamento_id !== (int) $original->equipamento_id
            || (int) $os->clientes_id !== (int) $origem->clientes_id) {
            throw new DomainException('Identifique a mesma unidade e o cliente na OS de origem antes de registrar retorno.');
        }
        $fisico = $eq->unidade((int) $unidade->equipamento_id);
        if ($fisico === null || (int) $fisico->cliente_id !== (int) $origem->clientes_id) {
            throw new DomainException('Vínculo do equipamento e cliente incompatível.');
        }
        $conclusao = trifaseAtendimentoDaOs($this->db, $raiz);
        $data = $conclusao->concluido_em ?? null;
        $prazo = $conclusao->garantia_dias ?? $origem->garantia;
        if ($data === null && $this->db->table_exists('trifase_financeiro_obrigacoes') && $this->db->field_exists('garantia_inicio', 'trifase_financeiro_obrigacoes')) {
            $f = $this->db->select('garantia_inicio')->where('os_id', $raiz)->get('trifase_financeiro_obrigacoes', 1)->row();
            $data = $f->garantia_inicio ?? null;
        }
        if (empty($data) || $origem->status !== 'Finalizado' || $os->status !== 'Finalizado') {
            throw new DomainException('A origem precisa de conclusão real conhecida; não use a previsão para inferir cobertura.');
        }
        $fim = (int) $prazo > 0 ? date('Y-m-d', strtotime($data . ' +' . (int) $prazo . ' days')) : null;
        return ['anterior' => $os, 'origem' => $origem, 'equipamento' => $unidade, 'conclusao' => (string) $data, 'prazo' => (int) $prazo, 'vencimento' => $fim];
    }

    public function ativoDaUnidade(int $unidade): ?object
    {
        return $this->db->select('r.os_id')->from('trifase_garantia_retornos r')->join('os', 'os.idOs = r.os_id')
            ->where('r.equipamento_id', $unidade)->where_not_in('os.status', ['Finalizado', 'Cancelado'])->get()->row() ?: null;
    }

    public function criar(int $anterior, array $dados, int $usuario, string $chave): int
    {
        $this->operacao($chave);
        if ($usuario <= 0 || array_diff(array_keys($dados), ['defeito', 'itens_recebidos', 'estado_entrada']) !== []) {
            throw new DomainException('Entrada de retorno inválida.');
        }
        $normalizados = [];
        foreach (['defeito', 'itens_recebidos', 'estado_entrada'] as $campo) {
            $normalizados[$campo] = $this->texto($dados[$campo] ?? null, 10000);
        }
        $dados = $normalizados;
        $hash = $this->hash([$anterior, $dados, $usuario]);
        $r = $this->referencia($anterior);
        // Ordem estável: origem antiga, atendimento anterior, OS nova.
        $raizLock = new Trifase_os_lock($this->db, (int) $r['origem']->idOs);
        $anteriorLock = null;
        try {
            if ($anterior !== (int) $r['origem']->idOs) {
                $anteriorLock = new Trifase_os_lock($this->db, $anterior);
            }
            $sufixo = $this->db->dbdriver === 'mysqli' ? ' FOR UPDATE' : '';
            $this->db->query('SELECT id FROM trifase_equipamentos WHERE id = ?' . $sufixo, [(int) $r['equipamento']->equipamento_id]);
            $repetido = $this->db->where('operacao', $chave)->get('trifase_garantia_retornos', 1)->row();
            if ($repetido) {
                if (! hash_equals($repetido->payload_hash, $hash)) {
                    throw new DomainException('Chave já utilizada com outros dados.');
                }
                $anteriorLock?->finalizar(true);
                $raizLock->finalizar(true);
                return (int) $repetido->os_id;
            }
            $r = $this->referencia($anterior);
            $aberto = $this->ativoDaUnidade((int) $r['equipamento']->equipamento_id);
            if ($aberto) {
                throw new DomainException('Já existe retorno em andamento para esta unidade: OS #' . (int) $aberto->os_id . '.');
            }
            $eq = $r['equipamento'];
            $os = $r['origem'];
            $this->inserir('os', ['clientes_id' => (int) $os->clientes_id, 'usuarios_id' => $usuario, 'dataInicial' => date('Y-m-d'), 'dataFinal' => null,
                'descricaoProduto' => $eq->marca . ' · ' . $eq->modelo, 'defeito' => htmlspecialchars($dados['defeito'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'),
                'observacoes' => '', 'laudoTecnico' => '', 'status' => 'Aberto', 'garantia' => 0, 'faturado' => 0]);
            $id = (int) $this->db->insert_id();
            $this->inserir('os_historico', ['os_id' => $id, 'status_anterior' => null, 'status_novo' => 'Aberto', 'usuarios_id' => $usuario, 'data_hora' => date('Y-m-d H:i:s')]);
            $modelo = new Trifase_equipamento_model();
            $modelo->db = $this->db;
            $modelo->vincular($id, ['modo' => 'existente', 'equipamento_id' => (string) $eq->equipamento_id,
                'itens_recebidos' => $dados['itens_recebidos'], 'estado_entrada' => $dados['estado_entrada']], $usuario, bin2hex(random_bytes(16)));
            $this->inserir('trifase_garantia_retornos', ['os_id' => $id, 'origem_id' => (int) $os->idOs, 'anterior_id' => $anterior,
                'equipamento_id' => (int) $eq->equipamento_id, 'cliente_id' => (int) $os->clientes_id,
                'conclusao_origem' => $r['conclusao'], 'prazo_origem' => $r['prazo'], 'vencimento_origem' => $r['vencimento'],
                'usuario_id' => $usuario, 'criado_em' => date('Y-m-d H:i:s'), 'operacao' => $chave, 'payload_hash' => $hash]);
            $anteriorLock?->finalizar(true);
            $raizLock->finalizar(true);
            return $id;
        } catch (Throwable $e) {
            $anteriorLock?->finalizar(false);
            $raizLock->finalizar(false);
            throw $e;
        }
    }

    public function avaliar(int $id, array $dados, int $anterior, int $usuario, string $chave): void
    {
        $this->operacao($chave);
        if ($usuario <= 0 || array_diff(array_keys($dados), ['cobertura', 'diagnostico', 'solucao', 'motivo']) !== []
            || ! in_array($dados['cobertura'] ?? null, ['avaliacao', 'coberto', 'nao_coberto'], true)
            || ! is_string($dados['solucao'] ?? '') || ! array_key_exists($dados['solucao'] ?? '', trifaseRetornoSolucoes())) {
            throw new DomainException('Confira cobertura e solução.');
        }
        $dados['diagnostico'] = $this->texto($dados['diagnostico'] ?? null, 20000, $dados['cobertura'] !== 'avaliacao');
        $dados['motivo'] = $this->texto($dados['motivo'] ?? null, 10000);
        $dados['solucao'] ??= '';
        if ($dados['cobertura'] === 'avaliacao' && $dados['solucao'] !== '') {
            throw new DomainException('Conclua a avaliação de cobertura antes de escolher a solução.');
        }
        $dados = ['cobertura' => $dados['cobertura'], 'diagnostico' => $dados['diagnostico'], 'solucao' => $dados['solucao'], 'motivo' => $dados['motivo']];
        $hash = $this->hash(['avaliar', $id, $dados, $anterior, $usuario]);
        $this->alterar($id, function () use ($id, $dados, $anterior, $usuario, $chave, $hash) {
            if ($this->reenvio($chave, $hash)) {
                return;
            }
            if ((int) ($this->avaliacao($id)->id ?? 0) !== $anterior) {
                throw new DomainException('Outra avaliação foi registrada. Recarregue antes de decidir.');
            }
            $this->evento($id, 'avaliar', $dados, 0, 0, null, $usuario, $chave, $hash);
        });
    }

    /** Valores internos declarados; não são cobrança ou movimentação de caixa. */
    public function custo(int $id, int $valor, int $minutos, string $descricao, int $usuario, string $chave): void
    {
        $this->operacao($chave);
        $descricao = $this->texto($descricao, 10000);
        if ($usuario <= 0 || $valor < 0 || $valor > 999999999 || $minutos < 0 || $minutos > 100000 || ($valor === 0 && $minutos === 0)) {
            throw new DomainException('Informe custo interno ou tempo de trabalho válido.');
        }
        $hash = $this->hash(['custo', $id, $valor, $minutos, $descricao, $usuario]);
        $this->alterar($id, function () use ($id, $valor, $minutos, $descricao, $usuario, $chave, $hash) {
            if (! $this->reenvio($chave, $hash)) {
                $this->evento($id, 'custo', ['motivo' => $descricao], $valor, $minutos, null, $usuario, $chave, $hash);
            }
        });
    }

    public function corrigirCusto(int $id, int $evento, string $motivo, int $usuario, string $chave): void
    {
        $this->operacao($chave);
        $motivo = $this->texto($motivo, 10000);
        if ($usuario <= 0) {
            throw new DomainException('Operador inválido.');
        }
        $hash = $this->hash(['corrigir_custo', $id, $evento, $motivo, $usuario]);
        $this->alterar($id, function () use ($id, $evento, $motivo, $usuario, $chave, $hash) {
            if ($this->reenvio($chave, $hash)) {
                return;
            }
            $custo = $this->db->where('id', $evento)->where('os_id', $id)->where('tipo', 'custo')->get('trifase_garantia_eventos', 1)->row();
            if (! $custo || $this->db->where('referencia_id', $evento)->count_all_results('trifase_garantia_eventos')) {
                throw new DomainException('Custo inexistente ou já corrigido.');
            }
            $this->evento($id, 'corrigir_custo', ['motivo' => $motivo], (int) $custo->valor_c, (int) $custo->minutos, $evento, $usuario, $chave, $hash);
        });
    }

    public function historicoUnidade(int $unidade): array
    {
        return $this->db->where('equipamento_id', $unidade)->order_by('os_id', 'desc')->get('trifase_garantia_retornos')->result();
    }

    public function custos(int $id): array
    {
        $valor = 0;
        $minutos = 0;
        foreach ($this->eventos($id) as $e) {
            $sinal = $e->tipo === 'custo' ? 1 : ($e->tipo === 'corrigir_custo' ? -1 : 0);
            $valor += $sinal * (int) $e->valor_c;
            $minutos += $sinal * (int) $e->minutos;
        }
        return ['valor_c' => $valor, 'minutos' => $minutos];
    }

    private function alterar(int $id, callable $acao): void
    {
        $lock = new Trifase_os_lock($this->db, $id);
        try {
            if (! $this->vinculo($id) || $lock->os->status === 'Cancelado') {
                throw new DomainException('Retorno inexistente ou cancelado.');
            }
            $acao();
            $lock->finalizar(true);
        } catch (Throwable $e) {
            $lock->finalizar(false);
            throw $e;
        }
    }

    private function evento(int $id, string $tipo, array $dados, int $valor, int $minutos, ?int $ref, int $usuario, string $chave, string $hash): void
    {
        $this->inserir('trifase_garantia_eventos', ['os_id' => $id, 'tipo' => $tipo, 'cobertura' => $dados['cobertura'] ?? '', 'diagnostico' => $dados['diagnostico'] ?? '',
            'solucao' => $dados['solucao'] ?? '', 'motivo' => $dados['motivo'], 'valor_c' => $valor, 'minutos' => $minutos, 'referencia_id' => $ref,
            'usuario_id' => $usuario, 'criado_em' => date('Y-m-d H:i:s'), 'operacao' => $chave, 'payload_hash' => $hash]);
    }

    private function reenvio(string $chave, string $hash): bool
    {
        $e = $this->db->where('operacao', $chave)->get('trifase_garantia_eventos', 1)->row();
        if ($e && ! hash_equals($e->payload_hash, $hash)) {
            throw new DomainException('Chave já utilizada com outros dados.');
        }
        return $e !== null;
    }

    private function inserir(string $tabela, array $dados): void
    {
        $debug = $this->db->db_debug;
        $this->db->db_debug = false;
        try {
            if (! $this->db->insert($tabela, $dados)) {
                $erro = $this->db->error();
                if ((int) $erro['code'] === 1062 || ((int) $erro['code'] === 19 && str_contains($erro['message'], 'UNIQUE constraint failed'))) {
                    throw new DomainException('Operação já registrada. Recarregue e confira o histórico.');
                }
                throw new RuntimeException('Não foi possível registrar o retorno.');
            }
        } finally {
            $this->db->db_debug = $debug;
        }
    }
    private function operacao(string $chave): void
    {
        if (! preg_match('/\A[a-zA-Z0-9_-]{16,64}\z/', $chave)) {
            throw new DomainException('Operação inválida. Recarregue a página.');
        }
    }
    private function hash(array $dados): string
    {
        return hash('sha256', json_encode($dados, JSON_THROW_ON_ERROR));
    }
    private function texto(mixed $texto, int $maximo, bool $obrigatorio = true): string
    {
        if (! is_string($texto) || ! mb_check_encoding($texto, 'UTF-8') || str_contains($texto, "\0") || strlen($texto) > 60000 || mb_strlen(trim($texto)) > $maximo || ($obrigatorio && trim($texto) === '')) {
            throw new DomainException('Confira os textos obrigatórios e seus limites.');
        }
        return trim($texto);
    }
}
