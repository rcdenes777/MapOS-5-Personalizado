<?php

require_once APPPATH . 'models/Clientes_model.php';

final class ClientesExclusaoAtomicaTest extends MaposTestCase
{
    private Clientes_model $clientes;

    protected function setUp(): void
    {
        parent::setUp();
        $this->db->query('CREATE TABLE clientes (idClientes INTEGER PRIMARY KEY)');
        $this->db->query('CREATE TABLE os (idOs INTEGER PRIMARY KEY, clientes_id INTEGER)');
        $this->db->query('CREATE TABLE servicos_os (os_id INTEGER)');
        $this->db->query('CREATE TABLE produtos_os (os_id INTEGER)');
        $this->db->query('CREATE TABLE vendas (idVendas INTEGER PRIMARY KEY, clientes_id INTEGER)');
        $this->db->query('CREATE TABLE itens_de_vendas (vendas_id INTEGER)');
        $this->db->query('CREATE TABLE trifase_cliente_publico_links (cliente_id INTEGER PRIMARY KEY, token_hash TEXT)');
        $this->db->insert('clientes', ['idClientes' => 1]);
        $this->db->insert('os', ['idOs' => 10, 'clientes_id' => 1]);
        $this->db->insert('servicos_os', ['os_id' => 10]);
        $this->db->insert('produtos_os', ['os_id' => 10]);
        $this->db->insert('vendas', ['idVendas' => 20, 'clientes_id' => 1]);
        $this->db->insert('itens_de_vendas', ['vendas_id' => 20]);
        $this->db->insert('trifase_cliente_publico_links', ['cliente_id' => 1, 'token_hash' => 'synthetic']);
        $this->clientes = new Clientes_model();
        $this->clientes->db = $this->db;
    }

    private function contagens(): array
    {
        $contagens = [];
        foreach (['clientes', 'os', 'servicos_os', 'produtos_os', 'vendas', 'itens_de_vendas', 'trifase_cliente_publico_links'] as $tabela) {
            $contagens[$tabela] = (int) $this->db->count_all($tabela);
        }
        return $contagens;
    }

    public function testFalhaNoClienteDesfazOsVendasItensELink(): void
    {
        $antes = $this->contagens();
        $this->db->query('CREATE TRIGGER impedir_cliente BEFORE DELETE ON clientes BEGIN SELECT RAISE(IGNORE); END');
        $this->assertFalse($this->clientes->excluirComDependencias(1));
        $this->assertSame($antes, $this->contagens());
    }

    public function testFalhaNaVendaDesfazOsEItens(): void
    {
        $antes = $this->contagens();
        $this->db->query('CREATE TRIGGER impedir_venda BEFORE DELETE ON vendas BEGIN SELECT RAISE(IGNORE); END');
        $this->assertFalse($this->clientes->excluirComDependencias(1));
        $this->assertSame($antes, $this->contagens());
    }

    public function testExclusaoValidaRemoveTodasAsDependencias(): void
    {
        $this->assertSame(array_fill_keys(array_keys($this->contagens()), 1), $this->contagens());
        $this->assertTrue($this->clientes->excluirComDependencias(1));
        $this->assertSame(array_fill_keys(array_keys($this->contagens()), 0), $this->contagens());
    }
}
