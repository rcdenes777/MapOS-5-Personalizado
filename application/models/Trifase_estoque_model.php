<?php

defined('BASEPATH') or exit('No direct script access allowed');
require_once APPPATH . 'libraries/Trifase_os_lock.php';

/** Saldo e movimento são gravados juntos; custo histórico nunca usa preço futuro. */
class Trifase_estoque_model extends CI_Model
{
    public function historico(int $produto, array $filtros = [], int $inicio = 0): array
    {
        $this->db->where('produto_id', $produto);
        foreach (['inicio' => '>=', 'fim' => '<='] as $campo => $op) {
            if (! empty($filtros[$campo])) {
                $this->db->where('data_movimento ' . $op, $filtros[$campo]);
            }
        }
        if (! empty($filtros['tipo'])) {
            $this->db->where('tipo', $filtros['tipo']);
        }
        return $this->db->order_by('id', 'desc')->limit(50, max(0, $inicio))->get('trifase_estoque_eventos')->result();
    }

    public function movimentar(int $produto, string $tipo, int $quantidade, ?int $custo, string $data, string $motivo, string $origem, int $usuario, string $operacao, ?int $esperado = null): int
    {
        $this->validarOperacao($usuario, $operacao);
        if (! in_array($tipo, ['entrada', 'saida', 'contagem', 'os_saida', 'os_devolucao', 'venda_saida', 'venda_devolucao', 'legado_entrada', 'legado_saida', 'inicial'], true)
            || abs($quantidade) > ($tipo === 'inicial' ? 99999999 : 1000000) || (in_array($tipo, ['contagem', 'inicial'], true) ? $quantidade < 0 : $quantidade <= 0)
            || ($custo !== null && ($custo < 0 || $custo > 9999999999))
            || ! $this->dataValida($data) || trim($motivo) === '' || mb_strlen($motivo) > 2000 || mb_strlen($origem) > 100) {
            throw new DomainException('Confira quantidade, custo, data e motivo da movimentação.');
        }
        if ($tipo === 'entrada' && $custo === null) {
            throw new DomainException('Informe o custo unitário desta entrada.');
        }
        $hash = hash('sha256', json_encode([$produto, $tipo, $quantidade, $custo, $data, $motivo, $origem, $usuario, $esperado], JSON_THROW_ON_ERROR));
        return $this->transacao(function () use ($produto, $tipo, $quantidade, $custo, $data, $motivo, $origem, $usuario, $operacao, $esperado, $hash) {
            $p = $this->travar('produtos', 'idProdutos', $produto);
            if ($r = $this->reenvio('trifase_estoque_eventos', $operacao, $hash)) {
                return $r;
            }
            $antes = (int) $p->estoque;
            if ($tipo === 'contagem' && ($esperado === null || $esperado !== $antes)) {
                throw new DomainException('O saldo mudou desde a conferência. Recarregue e conte novamente.');
            }
            $sinal = in_array($tipo, ['saida', 'os_saida', 'venda_saida', 'legado_saida'], true) ? -1 : 1;
            $depois = $tipo === 'inicial' ? $antes : ($tipo === 'contagem' ? $quantidade : $antes + $sinal * $quantidade);
            if ($depois < 0 || $depois > 2147483647) {
                throw new DomainException('Saldo insuficiente ou fora do limite permitido.');
            }
            $alteracoes = ['estoque' => $depois];
            // Entrada declara o custo de referência dos próximos usos, não altera venda.
            if ($tipo === 'entrada') {
                $alteracoes['precoCompra'] = sprintf('%d.%02d', intdiv($custo, 100), $custo % 100);
            }
            $this->gravar($this->db->where('idProdutos', $produto)->update('produtos', $alteracoes));
            return $this->evento('trifase_estoque_eventos', ['produto_id' => $produto, 'tipo' => $tipo, 'origem' => $origem,
                'quantidade' => $tipo === 'inicial' ? $antes : $depois - $antes, 'saldo_antes' => $tipo === 'inicial' ? 0 : $antes, 'saldo_depois' => $depois,
                'custo_unitario_c' => $custo, 'data_movimento' => $data, 'motivo' => $motivo], $usuario, $operacao, $hash);
        });
    }

    /** Chamada dentro da transação da inclusão do item nativo. */
    public function capturarItem(int $os, string $tipo, int $item, int $usuario): void
    {
        if (! in_array($tipo, ['produto', 'servico'], true)) {
            throw new DomainException('Tipo de custo inválido.');
        }
        $pk = $tipo === 'produto' ? 'idProdutos_os' : 'idServicos_os';
        $tabela = $tipo === 'produto' ? 'produtos_os' : 'servicos_os';
        $i = $this->db->where($pk, $item)->where('os_id', $os)->get($tabela, 1)->row();
        if (! $i) {
            throw new DomainException('Item não encontrado nesta OS.');
        }
        if ($tipo === 'produto') {
            $p = $this->travar('produtos', 'idProdutos', (int) $i->produtos_id);
            $custo = $this->centavos((string) $p->precoCompra);
            $descricao = $p->descricao;
        } else {
            $p = $this->travar('servicos', 'idServicos', (int) $i->servicos_id);
            $r = $this->custoServico((int) $i->servicos_id);
            $custo = $r ? (int) $r->valor_c : null;
            $descricao = $p->nome;
        }
        $op = bin2hex(random_bytes(16));
        $this->evento('trifase_os_custos', ['os_id' => $os, 'tipo' => $tipo, 'item_id' => $item, 'quantidade' => (int) $i->quantidade,
            'custo_unitario_c' => $custo, 'descricao' => $descricao, 'origem' => 'Cadastro no momento da inclusão'], $usuario, $op, hash('sha256', $op));
    }

    public function custoServico(int $id): ?object
    {
        return $this->db->where('servico_id', $id)->order_by('id', 'desc')->get('trifase_servico_custos', 1)->row() ?: null;
    }

    public function definirServico(int $id, int $valor, string $motivo, int $anterior, int $usuario, string $operacao): int
    {
        $this->validarOperacao($usuario, $operacao);
        if ($valor < 0 || $valor > 9999999999 || trim($motivo) === '' || mb_strlen($motivo) > 2000) {
            throw new DomainException('Informe custo e motivo válidos.');
        }
        $hash = hash('sha256', json_encode([$id, $valor, $motivo, $anterior, $usuario], JSON_THROW_ON_ERROR));
        return $this->transacao(function () use ($id, $valor, $motivo, $anterior, $usuario, $operacao, $hash) {
            $this->travar('servicos', 'idServicos', $id);
            if ($r = $this->reenvio('trifase_servico_custos', $operacao, $hash)) {
                return $r;
            }
            if ((int) ($this->custoServico($id)->id ?? 0) !== $anterior) {
                throw new DomainException('O custo foi alterado em outra janela. Recarregue.');
            }
            return $this->evento('trifase_servico_custos', ['servico_id' => $id, 'valor_c' => $valor, 'motivo' => $motivo, 'anterior' => $anterior], $usuario, $operacao, $hash);
        });
    }

    public function resumoOs(int $os): array
    {
        $valor = 0;
        $desconhecidos = 0;
        $linhas = [];
        $ordem = $this->db->where('idOs', $os)->get('os', 1)->row();
        foreach (['produto' => ['produtos_os', 'idProdutos_os'], 'servico' => ['servicos_os', 'idServicos_os']] as $tipo => [$tabela, $pk]) {
            foreach ($this->db->where('os_id', $os)->get($tabela)->result() as $item) {
                $c = $this->db->where('os_id', $os)->where('tipo', $tipo)->where('item_id', (int) $item->$pk)->order_by('id', 'desc')->get('trifase_os_custos', 1)->row();
                $total = $c && $c->custo_unitario_c !== null ? (int) $c->custo_unitario_c * (int) $c->quantidade : null;
                $primeiroCusto = $this->db->where('os_id', $os)->where('tipo', $tipo)->where('item_id', (int) $item->$pk)->order_by('id')->get('trifase_os_custos', 1)->row();
                if ($primeiroCusto && $primeiroCusto->origem === 'Cadastro no momento da inclusão') {
                    $descricaoItem = $primeiroCusto->descricao;
                } else {
                    $cadastroItem = $tipo === 'produto'
                        ? $this->db->where('idProdutos', (int) $item->produtos_id)->get('produtos', 1)->row()
                        : $this->db->where('idServicos', (int) $item->servicos_id)->get('servicos', 1)->row();
                    $descricaoItem = $tipo === 'produto' ? ($cadastroItem->descricao ?? 'Produto sem identificação') : ($cadastroItem->nome ?? 'Serviço sem identificação');
                }
                $linhas[] = ['tipo' => $tipo, 'item' => (int) $item->$pk, 'descricao' => $descricaoItem, 'valor_c' => $total, 'versao' => (int) ($c->id ?? 0), 'quantidade' => (int) $item->quantidade, 'unitario_c' => $c ? $c->custo_unitario_c : null];
                if ($ordem->status !== 'Cancelado') {
                    $valor += $total ?? 0;
                    $desconhecidos += $total === null ? 1 : 0;
                }
            }
        }
        return ['valor_c' => $valor, 'desconhecidos' => $desconhecidos, 'linhas' => $linhas, 'cancelada' => $ordem->status === 'Cancelado'];
    }

    /** Complemento/correção explícito de custo: preserva versões e não modifica preço da OS. */
    public function registrarCustoItem(int $os, string $tipo, int $item, int $custo, int $anterior, string $motivo, int $usuario, string $operacao): int
    {
        $this->validarOperacao($usuario, $operacao);
        if (! in_array($tipo, ['produto', 'servico'], true) || $custo < 0 || $custo > 9999999999 || trim($motivo) === '' || mb_strlen($motivo) > 2000) {
            throw new DomainException('Confira o tipo, custo unitário e motivo.');
        }
        $hash = hash('sha256', json_encode([$os, $tipo, $item, $custo, $anterior, $motivo, $usuario], JSON_THROW_ON_ERROR));
        $lock = new Trifase_os_lock($this->db, $os);
        try {
            if ($r = $this->reenvio('trifase_os_custos', $operacao, $hash)) {
                $lock->finalizar(true);
                return $r;
            }
            $tabela = $tipo === 'produto' ? 'produtos_os' : 'servicos_os';
            $pk = $tipo === 'produto' ? 'idProdutos_os' : 'idServicos_os';
            $i = $this->db->where('os_id', $os)->where($pk, $item)->get($tabela, 1)->row();
            if (! $i) {
                throw new DomainException('Item não encontrado nesta OS.');
            }
            $ultimo = $this->db->where('os_id', $os)->where('tipo', $tipo)->where('item_id', $item)->order_by('id', 'desc')->get('trifase_os_custos', 1)->row();
            if ((int) ($ultimo->id ?? 0) !== $anterior) {
                throw new DomainException('Este custo foi alterado. Recarregue antes de corrigir.');
            }
            $id = $this->evento('trifase_os_custos', ['os_id' => $os, 'tipo' => $tipo, 'item_id' => $item, 'quantidade' => (int) $i->quantidade,
                'custo_unitario_c' => $custo, 'descricao' => $motivo, 'origem' => 'Custo informado pela equipe'], $usuario, $operacao, $hash);
            $lock->finalizar(true);
            return $id;
        } catch (Throwable $e) {
            $lock->finalizar(false);
            throw $e;
        }
    }

    public function centavos(string $decimal): int
    {
        if (! preg_match('/\A(0|[1-9][0-9]{0,7})(?:\.([0-9]{1,2}))?\z/', $decimal, $m)) {
            throw new DomainException('Custo de referência inválido no cadastro. Confira o preço de compra.');
        }
        return (int) $m[1] * 100 + (int) str_pad($m[2] ?? '', 2, '0');
    }

    private function travar(string $tabela, string $pk, int $id): object
    {
        $sufixo = $this->db->dbdriver === 'mysqli' ? ' FOR UPDATE' : '';
        $r = $this->db->query("SELECT * FROM {$tabela} WHERE {$pk} = ?" . $sufixo, [$id])->row();
        if (! $r) {
            throw new DomainException('Cadastro não encontrado.');
        }
        return $r;
    }
    private function transacao(callable $acao): int
    {
        if (! $this->db->trans_begin()) {
            throw new RuntimeException('Não foi possível iniciar a operação.');
        }
        try {
            $id = $acao();
            if (! $this->db->trans_status() || ! $this->db->trans_commit()) {
                throw new RuntimeException('Não foi possível confirmar a operação.');
            }
            return $id;
        } catch (Throwable $e) {
            $this->db->trans_rollback();
            throw $e;
        }
    }
    private function evento(string $tabela, array $dados, int $usuario, string $operacao, string $hash): int
    {
        $this->gravar($this->db->insert($tabela, $dados + ['usuario_id' => $usuario, 'criado_em' => date('Y-m-d H:i:s'), 'operacao' => $operacao, 'payload_hash' => $hash]));
        return (int) $this->db->insert_id();
    }
    private function reenvio(string $tabela, string $operacao, string $hash): ?int
    {
        $r = $this->db->where('operacao', $operacao)->get($tabela, 1)->row();
        if ($r && ! hash_equals($r->payload_hash, $hash)) {
            throw new DomainException('Chave já utilizada com outros dados.');
        }
        return $r ? (int) $r->id : null;
    }
    private function validarOperacao(int $usuario, string $operacao): void
    {
        if ($usuario <= 0 || ! preg_match('/\A[a-zA-Z0-9_-]{16,64}\z/', $operacao)) {
            throw new DomainException('Operador ou identificador inválido. Recarregue.');
        }
    }
    private function dataValida(string $data): bool
    {
        $d = DateTimeImmutable::createFromFormat('!Y-m-d', $data);
        return $d !== false && $d->format('Y-m-d') === $data && $data <= date('Y-m-d') && $data >= '1900-01-01';
    }
    private function gravar(bool $sucesso): void
    {
        if (! $sucesso) {
            throw new RuntimeException('Não foi possível gravar todas as alterações.');
        }
    }
}
