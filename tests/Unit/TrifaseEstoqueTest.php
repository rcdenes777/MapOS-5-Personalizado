<?php
require_once APPPATH . 'models/Trifase_estoque_model.php';
require_once APPPATH . 'database/migrations/20261102060000_trifase_estoque_custos.php';
require_once APPPATH . 'database/migrations/20261113010000_trifase_estoque_linha_os.php';
require_once BASEPATH . 'database/DB_forge.php';
require_once BASEPATH . 'database/drivers/sqlite3/sqlite3_forge.php';

final class TrifaseEstoqueTest extends MaposTestCase
{
    private Trifase_estoque_model $modelo;
    protected function setUp(): void
    {
        parent::setUp();
        $this->db->query('CREATE TABLE produtos (idProdutos INTEGER PRIMARY KEY, descricao TEXT, estoque INTEGER, precoCompra TEXT, precoVenda TEXT)');
        $this->db->query("INSERT INTO produtos VALUES (1, 'Peça QA', 5, '10.25', '50.00')");
        $this->db->query('CREATE TABLE servicos (idServicos INTEGER PRIMARY KEY, nome TEXT, preco TEXT)');
        $this->db->query("INSERT INTO servicos VALUES (1, 'Trabalho QA', '200.00')");
        $this->db->query('CREATE TABLE os (idOs INTEGER PRIMARY KEY, status TEXT)');
        $this->db->query("INSERT INTO os VALUES (1, 'Aberto'), (2, 'Aberto')");
        $this->db->query('CREATE TABLE produtos_os (idProdutos_os INTEGER PRIMARY KEY, os_id INTEGER, produtos_id INTEGER, quantidade INTEGER, preco TEXT)');
        $this->db->query("INSERT INTO produtos_os VALUES (1, 1, 1, 2, '50.00'), (2, 2, 1, 1, '50.00')");
        $this->db->query('CREATE TABLE servicos_os (idServicos_os INTEGER PRIMARY KEY, os_id INTEGER, servicos_id INTEGER, quantidade INTEGER, preco TEXT)');
        $this->db->query("INSERT INTO servicos_os VALUES (1, 1, 1, 1, '200.00')");
        $m = new class() extends Migration_trifase_estoque_custos {
            public object $dbforge;
        };
        $m->db = $this->db;
        $m->dbforge = new CI_DB_sqlite3_forge($this->db);
        $m->up();
        $m->up();
        $vinculo = new class() extends Migration_trifase_estoque_linha_os {
            public object $dbforge;
        };
        $vinculo->db = $this->db;
        $vinculo->dbforge = new CI_DB_sqlite3_forge($this->db);
        $vinculo->up();
        $vinculo->up();
        $this->modelo = new Trifase_estoque_model();
        $this->modelo->db = $this->db;
    }
    private function mover(string $tipo, int $q, string $op, ?int $custo = null, ?int $esperado = null): int
    {
        return $this->modelo->movimentar(1, $tipo, $q, $custo, date('Y-m-d'), 'Motivo QA', 'OS #1', 7, str_pad($op, 24, '_'), $esperado);
    }
    public function testEntradaAtualizaReferenciaPreservaVendaEReenvioNaoDuplica(): void
    {
        $id = $this->mover('entrada', 3, 'entrada', 1100);
        $this->assertSame($id, $this->mover('entrada', 3, 'entrada', 1100));
        $p = $this->db->get('produtos')->row();
        $this->assertSame(8, (int) $p->estoque);
        $this->assertSame('11.00', $p->precoCompra);
        $this->assertSame('50.00', $p->precoVenda);
        $e = $this->modelo->historico(1)[0];
        $this->assertSame(5, (int) $e->saldo_antes);
        $this->assertSame(8, (int) $e->saldo_depois);
        $this->expectException(DomainException::class);
        $this->mover('entrada', 4, 'entrada', 1100);
    }
    public function testSaidaInsuficienteNaoAlteraSaldoOuHistorico(): void
    {
        try {
            $this->mover('saida', 6, 'sem-saldo');
            $this->fail('Saldo negativo');
        } catch (DomainException $e) {
            $this->assertSame(5, (int) $this->db->get('produtos')->row()->estoque);
            $this->assertSame([], $this->modelo->historico(1));
        }
    }
    public function testContagemExigeSaldoEsperadoEAceitaZerar(): void
    {
        $this->mover('contagem', 0, 'zerar', null, 5);
        $this->assertSame(0, (int) $this->db->get('produtos')->row()->estoque);
        try {
            $this->mover('contagem', 10, 'stale', null, 5);
            $this->fail('Contagem obsoleta');
        } catch (DomainException $e) {
            $this->assertCount(1, $this->modelo->historico(1));
        }
    }
    public function testCustoNoUsoNaoMudaComPrecoFuturoNemIncluiLegadoComoZero(): void
    {
        $this->modelo->capturarItem(1, 'produto', 1, 7);
        $this->db->update('produtos', ['precoCompra' => '99.00']);
        $r = $this->modelo->resumoOs(1);
        $this->assertSame(2050, $r['valor_c']);
        $this->assertSame(1, $r['desconhecidos']);
        $this->assertSame(1, $this->modelo->resumoOs(2)['desconhecidos']);
        $this->db->where('idProdutos_os', 1)->delete('produtos_os');
        $this->assertSame(0, $this->modelo->resumoOs(1)['valor_c']);
        $this->assertSame(1, $this->db->count_all('trifase_os_custos'));
    }
    public function testServicoSnapshotMantemCustoAnteriorAposAlteracao(): void
    {
        $this->modelo->definirServico(1, 3000, 'Composição de bancada', 0, 7, str_repeat('a', 24));
        $this->modelo->capturarItem(1, 'servico', 1, 7);
        $antes = $this->modelo->custoServico(1);
        $this->modelo->definirServico(1, 4500, 'Composição revisada', (int) $antes->id, 7, str_repeat('b', 24));
        $this->assertSame(3000, $this->modelo->resumoOs(1)['valor_c']);
        $this->assertSame('200.00', $this->db->get('servicos')->row()->preco);
    }
    public function testCustoExplicitoLegadoIdempotentePreservaVersoesERecusaItemOutraOs(): void
    {
        $id = $this->modelo->registrarCustoItem(1, 'produto', 1, 850, 0, 'Nota da compra original', 7, str_repeat('a', 24));
        $this->assertSame($id, $this->modelo->registrarCustoItem(1, 'produto', 1, 850, 0, 'Nota da compra original', 7, str_repeat('a', 24)));
        $this->modelo->registrarCustoItem(1, 'produto', 1, 950, $id, 'Correção conferida', 7, str_repeat('b', 24));
        $this->assertSame(1900, $this->modelo->resumoOs(1)['valor_c']);
        $this->assertSame(2, $this->db->count_all('trifase_os_custos'));
        $this->expectException(DomainException::class);
        $this->modelo->registrarCustoItem(1, 'produto', 2, 1, 0, 'Outro atendimento', 7, str_repeat('c', 24));
    }
    public function testCanceladaNaoSomaCustosEReativacaoPreservaReferencia(): void
    {
        $this->modelo->capturarItem(1, 'produto', 1, 7);
        $this->db->where('idOs', 1)->update('os', ['status' => 'Cancelado']);
        $this->assertSame(0, $this->modelo->resumoOs(1)['valor_c']);
        $this->db->where('idOs', 1)->update('os', ['status' => 'Aberto']);
        $this->assertSame(2050, $this->modelo->resumoOs(1)['valor_c']);
    }
    public function testRollbackExternoReverteItemSaldoECusto(): void
    {
        $this->db->trans_begin();
        $this->modelo->capturarItem(1, 'produto', 1, 7);
        $this->modelo->movimentar(1, 'os_saida', 2, null, date('Y-m-d'), 'Motivo QA', 'OS #1', 7, 'baixa_123456789012', null, ['os_id' => 1, 'os_item_id' => 1]);
        $this->db->trans_rollback();
        $this->assertSame([], $this->modelo->historico(1));
        $this->assertSame(0, $this->db->count_all('trifase_os_custos'));
        $this->assertSame(5, (int) $this->db->get('produtos')->row()->estoque);
    }
    public function testMoedaEstritaEDataFuturaOuSemMotivoRecusadas(): void
    {
        $this->assertSame(2550, $this->modelo->centavos('25.50'));
        foreach (['NaN', '-1', '1.001', '1e3'] as $v) {
            try {
                $this->modelo->centavos($v);
                $this->fail('Aceitou custo inválido');
            } catch (DomainException $e) {
                $this->assertTrue(true);
            }
        }
        $this->expectException(DomainException::class);
        $this->modelo->movimentar(1, 'entrada', 1, 100, '2099-01-01', 'Futura', '', 7, str_repeat('a', 24));
    }
}
