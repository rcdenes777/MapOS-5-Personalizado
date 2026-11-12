<?php

require_once APPPATH . 'helpers/trifase_estoque_helper.php';

class Produtos_model extends CI_Model
{
    public function __construct()
    {
        parent::__construct();
    }

    public function get($table, $fields, $where = '', $perpage = 0, $start = 0, $one = false, $array = 'array')
    {
        $this->db->select($fields);
        $this->db->from($table);
        $this->db->order_by('idProdutos', 'desc');
        $this->db->limit($perpage, $start);
        if ($where) {
            $this->db->like('codDeBarra', $where);
            $this->db->or_like('descricao', $where);
        }

        $query = $this->db->get();

        $result = ! $one ? $query->result() : $query->row();

        return $result;
    }

    /**
     * Produtos da listagem (#2841), do mais recente para o mais antigo.
     *
     * @param  array{pesquisa?: string, estoque?: 'baixo'}  $filtros  Saída de listagemFiltros()
     */
    public function listar(array $filtros, int $limite, int $offset): array
    {
        $this->aplicarFiltros($filtros);

        return $this->db->order_by('idProdutos', 'desc')->limit($limite, max(0, $offset))->get('produtos')->result();
    }

    public function contar(array $filtros): int
    {
        $this->aplicarFiltros($filtros);

        return (int) $this->db->count_all_results('produtos');
    }

    /**
     * pesquisa procura na descrição e no código de barras; estoque=baixo
     * mostra quem está no mínimo ou abaixo dele (com mínimo definido).
     */
    private function aplicarFiltros(array $filtros): void
    {
        if (($filtros['pesquisa'] ?? '') !== '') {
            $this->db->group_start()->like('descricao', $filtros['pesquisa'])->or_like('codDeBarra', $filtros['pesquisa'])->group_end();
        }

        if (($filtros['estoque'] ?? '') === 'baixo') {
            $this->db->where('estoqueMinimo >', 0)->where('estoque <= estoqueMinimo', null, false);
        }
    }

    public function getById($id)
    {
        $this->db->where('idProdutos', $id);
        $this->db->limit(1);

        return $this->db->get('produtos')->row();
    }

    public function add($table, $data)
    {
        if ($table === 'produtos' && trifaseEstoqueHabilitado()) {
            require_once APPPATH . 'models/Trifase_estoque_model.php';
            $modelo = new Trifase_estoque_model();
            $modelo->db = $this->db;
            $this->db->trans_begin();
            try {
                if (! $this->db->insert($table, $data)) {
                    throw new RuntimeException('Não foi possível cadastrar o produto.');
                }
                $id = (int) $this->db->insert_id();
                $custo = isset($data['precoCompra']) ? $modelo->centavos((string) $data['precoCompra']) : null;
                $modelo->movimentar($id, 'inicial', (int) $data['estoque'], $custo, date('Y-m-d'), 'Saldo inicial informado no cadastro', 'Cadastro do produto', (int) get_instance()->session->userdata('id_admin'), bin2hex(random_bytes(16)));
                if (! $this->db->trans_status() || ! $this->db->trans_commit()) {
                    throw new RuntimeException('Falha ao confirmar o cadastro.');
                }
                return true;
            } catch (Throwable $e) {
                $this->db->trans_rollback();
                return false;
            }
        }
        $this->db->insert($table, $data);
        if ($this->db->affected_rows() == '1') {
            return true;
        }

        return false;
    }

    public function edit($table, $data, $fieldID, $ID)
    {
        if ($table === 'produtos' && $this->db->table_exists('trifase_estoque_eventos') && $this->db->where('produto_id', (int) $ID)->count_all_results('trifase_estoque_eventos')) {
            unset($data['estoque']);
        }
        $this->db->where($fieldID, $ID);
        $this->db->update($table, $data);

        if ($this->db->affected_rows() >= 0) {
            return true;
        }

        return false;
    }

    public function delete($table, $fieldID, $ID)
    {
        if ($table === 'produtos' && $this->db->table_exists('trifase_estoque_eventos') && $this->db->where('produto_id', (int) $ID)->count_all_results('trifase_estoque_eventos')) {
            return false;
        }
        $this->db->where($fieldID, $ID);
        $this->db->delete($table);
        if ($this->db->affected_rows() == '1') {
            return true;
        }

        return false;
    }

    public function count($table)
    {
        return $this->db->count_all($table);
    }

    public function updateEstoque($produto, $quantidade, $operacao = '-', array $contexto = [])
    {
        if (! in_array($operacao, ['+', '-'], true)) {
            throw new DomainException('Operação de estoque inválida.');
        }
        if (trifaseEstoqueHabilitado()) {
            require_once APPPATH . 'models/Trifase_estoque_model.php';
            $modelo = new Trifase_estoque_model();
            $modelo->db = $this->db;
            $usuario = (int) ($contexto['usuario'] ?? get_instance()->session->userdata('id_admin'));
            $modelo->movimentar(
                (int) $produto,
                $contexto['tipo'] ?? ($operacao === '+' ? 'legado_entrada' : 'legado_saida'),
                (int) $quantidade,
                null,
                date('Y-m-d'),
                $contexto['motivo'] ?? 'Movimentação pelo fluxo nativo',
                $contexto['origem'] ?? 'Painel nativo',
                $usuario,
                $contexto['operacao'] ?? bin2hex(random_bytes(16))
            );
            return true;
        }
        if ($this->db->table_exists('trifase_estoque_eventos') && $this->db->where('produto_id', (int) $produto)->count_all_results('trifase_estoque_eventos')) {
            throw new DomainException('Reative o estoque auditável para movimentar este produto e preservar seu histórico.');
        }
        $sql = "UPDATE produtos set estoque = estoque $operacao ? WHERE idProdutos = ?";
        return $this->db->query($sql, [$quantidade, $produto]);
    }
}
