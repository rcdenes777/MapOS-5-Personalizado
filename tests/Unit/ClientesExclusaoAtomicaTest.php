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
        $this->db->query('CREATE TABLE anexos (idAnexos INTEGER PRIMARY KEY, os_id INTEGER)');
        $this->db->query('CREATE TABLE trifase_publico_anexos (anexo_id INTEGER, os_id INTEGER)');
        $this->db->query('CREATE TABLE trifase_publico_links (os_id INTEGER, token_hash TEXT)');
        $this->db->insert('clientes', ['idClientes' => 1]);
        $this->db->insert('os', ['idOs' => 10, 'clientes_id' => 1]);
        $this->db->insert('servicos_os', ['os_id' => 10]);
        $this->db->insert('produtos_os', ['os_id' => 10]);
        $this->db->insert('vendas', ['idVendas' => 20, 'clientes_id' => 1]);
        $this->db->insert('itens_de_vendas', ['vendas_id' => 20]);
        $this->db->insert('trifase_cliente_publico_links', ['cliente_id' => 1, 'token_hash' => 'synthetic']);
        $this->db->insert('anexos', ['idAnexos' => 30, 'os_id' => 10]);
        $this->db->insert('trifase_publico_anexos', ['anexo_id' => 30, 'os_id' => 10]);
        $this->db->insert('trifase_publico_links', ['os_id' => 10, 'token_hash' => str_repeat('a', 64)]);
        $this->clientes = new Clientes_model();
        $this->clientes->db = $this->db;
    }

    private function contagens(): array
    {
        $contagens = [];
        foreach (['clientes', 'os', 'servicos_os', 'produtos_os', 'vendas', 'itens_de_vendas', 'trifase_cliente_publico_links', 'anexos', 'trifase_publico_anexos', 'trifase_publico_links'] as $tabela) {
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

    public function testFalhaNaOsDesfazOsItensEImpedeExcluirCliente(): void
    {
        $antes = $this->contagens();
        $this->db->query('CREATE TRIGGER impedir_os BEFORE DELETE ON os BEGIN SELECT RAISE(IGNORE); END');
        $this->assertFalse($this->clientes->excluirComDependencias(1));
        $this->assertSame($antes, $this->contagens());
    }

    public function testExclusaoValidaRemoveTodasAsDependencias(): void
    {
        $this->assertSame(array_fill_keys(array_keys($this->contagens()), 1), $this->contagens());
        $this->assertTrue($this->clientes->excluirComDependencias(1));
        $this->assertSame(array_fill_keys(array_keys($this->contagens()), 0), $this->contagens());
    }

    public function testAnexoDaOsNaoBloqueiaExclusaoERemovidoNaMesmaTransacao(): void
    {
        // Regressão de produção: FK de anexos (NO ACTION) impedia excluir o cliente.
        $this->assertSame(1, (int) $this->db->count_all('anexos'));
        $this->assertTrue($this->clientes->excluirComDependencias(1));
        $this->assertSame(0, (int) $this->db->count_all('anexos'));
        $this->assertSame(0, (int) $this->db->count_all('trifase_publico_anexos'));
        $this->assertSame(0, (int) $this->db->count_all('clientes'));
        $this->assertSame(0, (int) $this->db->count_all('os'));
    }

    public function testLinkIndividualDaOsSaiNaExclusaoENaoReativaComIdReusado(): void
    {
        // Achado F01 da revisão: vínculo individual sobrevivia à exclusão e voltava com id reusado.
        $this->assertSame(1, (int) $this->db->count_all('trifase_publico_links'));
        $this->assertTrue($this->clientes->excluirComDependencias(1));
        $this->assertSame(0, (int) $this->db->count_all('trifase_publico_links'));
        // Reuso do identificador da OS não encontra vínculo antigo.
        $this->db->insert('clientes', ['idClientes' => 2]);
        $this->db->insert('os', ['idOs' => 10, 'clientes_id' => 2]);
        $this->assertSame(0, (int) $this->db->where('os_id', 10)->count_all_results('trifase_publico_links'));
    }

    public function testLancamentoLegadoImpedeExclusaoEPreservaRegistros(): void
    {
        $this->db->query('CREATE TABLE lancamentos (idLancamentos INTEGER PRIMARY KEY, clientes_id INTEGER)');
        $this->db->insert('lancamentos', ['idLancamentos' => 40, 'clientes_id' => 1]);
        $antes = $this->contagens();
        $this->assertFalse($this->clientes->excluirComDependencias(1));
        $this->assertSame($antes, $this->contagens());
        $this->assertSame(1, (int) $this->db->count_all('lancamentos'));
    }
}
