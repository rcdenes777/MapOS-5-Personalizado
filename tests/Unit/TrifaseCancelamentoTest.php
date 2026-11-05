<?php

require_once APPPATH . 'models/Trifase_cancelamento_model.php';
require_once APPPATH . 'models/Trifase_estoque_model.php';
require_once APPPATH . 'database/migrations/20261104010000_trifase_cancelamentos.php';
require_once APPPATH . 'database/migrations/20261102060000_trifase_estoque_custos.php';
require_once BASEPATH . 'database/DB_forge.php';
require_once BASEPATH . 'database/drivers/sqlite3/sqlite3_forge.php';

final class TrifaseCancelamentoTest extends MaposTestCase
{
    private Trifase_cancelamento_model $modelo;
    private array $ambiente;

    protected function setUp(): void
    {
        parent::setUp();
        $this->ambiente = $_ENV;
        $_ENV['TRIFASE_ESTOQUE_ENABLED'] = 'true';
        $this->db->query('CREATE TABLE os (idOs INTEGER PRIMARY KEY, status TEXT, faturado INTEGER, lancamento INTEGER, defeito TEXT, clientes_id INTEGER)');
        $this->db->query("INSERT INTO os VALUES (1, 'Aprovado', 0, NULL, 'Não liga', 3), (2, 'Aberto', 0, NULL, 'Outro', 4)");
        $this->db->query('CREATE TABLE clientes (idClientes INTEGER PRIMARY KEY, nomeCliente TEXT)');
        $this->db->query("INSERT INTO clientes VALUES (3, 'Cliente da OS'), (4, 'Outro cliente')");
        $this->db->query('CREATE TABLE produtos (idProdutos INTEGER PRIMARY KEY, descricao TEXT, estoque INTEGER, precoCompra TEXT)');
        $this->db->query("INSERT INTO produtos VALUES (1, 'Peça', 8, '10.00')");
        $this->db->query('CREATE TABLE servicos (idServicos INTEGER PRIMARY KEY, nome TEXT)');
        $this->db->query("INSERT INTO servicos VALUES (1, 'Reparo')");
        $this->db->query('CREATE TABLE produtos_os (idProdutos_os INTEGER PRIMARY KEY, os_id INTEGER, produtos_id INTEGER, quantidade INTEGER, preco TEXT, subTotal TEXT)');
        $this->db->query("INSERT INTO produtos_os VALUES (1, 1, 1, 2, '20.00', '40.00')");
        $this->db->query('CREATE TABLE servicos_os (idServicos_os INTEGER PRIMARY KEY, os_id INTEGER, servicos_id INTEGER, quantidade INTEGER)');
        $this->db->query('INSERT INTO servicos_os VALUES (1, 1, 1, 1)');
        $this->db->query('CREATE TABLE os_historico (os_id INTEGER, status_anterior TEXT, status_novo TEXT, usuarios_id INTEGER, data_hora TEXT)');
        $m = new class() extends Migration_trifase_cancelamentos {
            public object $dbforge;
        };
        $m->db = $this->db;
        $m->dbforge = new CI_DB_sqlite3_forge($this->db);
        $m->up();
        $m->up();
        $e = new class() extends Migration_trifase_estoque_custos {
            public object $dbforge;
        };
        $e->db = $this->db;
        $e->dbforge = new CI_DB_sqlite3_forge($this->db);
        $e->up();
        $this->modelo = new Trifase_cancelamento_model();
        $this->modelo->db = $this->db;
    }

    protected function tearDown(): void
    {
        $_ENV = $this->ambiente;
        parent::tearDown();
    }

    private function dados(): array
    {
        return ['hash' => $this->modelo->conferencia($this->db->where('idOs', 1)->get('os')->row())['hash'], 'pecas_nao_utilizadas' => '1', 'servicos_nao_executados' => '1', 'financeiro_conferido' => '1', 'confirmar' => '1', 'conferencia' => 'Peças não utilizadas e serviço não executado; nada recebido.'];
    }

    private function pedido(): int
    {
        return $this->modelo->solicitar(1, 'cliente', 'Desistiu antes do reparo', 7, 'solicitacao_123456789');
    }

    public function testOrigemDoClienteUsaCadastroDaOsEAssisteciaFicaSeparadaDoOperador(): void
    {
        $pedido = $this->pedido();
        $p = $this->modelo->atual(1);
        $this->assertSame('Cliente: Cliente da OS', $p->solicitante);
        $this->assertSame(7, (int) $p->usuario_id);
        $snapshot = json_decode($p->retrato, true);
        $this->assertSame(['origem' => 'cliente', 'cliente_id' => 3, 'nome_cliente' => 'Cliente da OS'], $snapshot['solicitacao']);
        $this->modelo->retirar(1, $pedido, 'Correção da origem', 7, 'retirar_origem_12345');
        $this->modelo->solicitar(1, 'assistencia', 'Assistência não poderá executar', 7, 'assistencia_12345678');
        $this->assertSame('Por iniciativa da assistência', $this->modelo->atual(1)->solicitante);
        try {
            $this->modelo->solicitar(2, 'Nome inventado', 'Teste', 7, 'invalida_123456789');
            $this->fail('Aceitou nome livre no lugar da origem');
        } catch (DomainException $e) {
            $this->assertNull($this->modelo->atual(2));
        }
        $this->db->where('idClientes', 4)->delete('clientes');
        $this->expectException(DomainException::class);
        $this->modelo->solicitar(2, 'cliente', 'Teste', 7, 'semcliente_123456789');
    }

    private function dadosTecnicos(): array
    {
        $c = $this->modelo->conferencia($this->db->where('idOs', 1)->get('os')->row());
        return ['hash_tecnico' => $this->modelo->hashTecnico($c), 'pecas_nao_utilizadas' => '1', 'servicos_nao_executados' => '1'];
    }

    private function devolverPecas(): void
    {
        $e = new Trifase_estoque_model();
        $e->db = $this->db;
        $e->movimentar(1, 'os_devolucao', 2, null, date('Y-m-d'), 'Remoção de peça da OS', 'OS #1', 2, 'devolucao_123456789');
        $this->db->where('os_id', 1)->delete('produtos_os');
    }

    public function testPedidoTecnicaEFinanceiroSeparadosSemSegundaDevolucao(): void
    {
        $pedido = $this->pedido();
        $this->assertSame($pedido, $this->pedido());
        $this->assertSame(8, (int) $this->db->get('produtos')->row()->estoque);
        try {
            $this->modelo->confirmar(1, $pedido, $this->dados(), 7, 'confirmacao_12345678');
            $this->fail('Liberou peças vinculadas');
        } catch (DomainException $e) {
            $this->assertSame(8, (int) $this->db->get('produtos')->row()->estoque);
        }
        $this->devolverPecas();
        try {
            $this->modelo->confirmar(1, $pedido, $this->dados(), 7, 'confirmacao_12345678');
            $this->fail('Liberou sem conferência técnica');
        } catch (DomainException $e) {
            $this->assertSame('Aprovado', $this->db->where('idOs', 1)->get('os')->row()->status);
        }
        $tecnica = $this->modelo->conferirTecnica(1, $pedido, $this->dadosTecnicos(), 2, 'tecnica_123456789');
        $this->assertSame($tecnica, $this->modelo->conferirTecnica(1, $pedido, $this->dadosTecnicos(), 2, 'tecnica_123456789'));
        $this->assertSame($pedido, (int) $this->modelo->atual(1)->id);
        $dados = array_replace($this->dados(), ['conferencia' => '']);
        $id = $this->modelo->confirmar(1, $pedido, $dados, 7, 'confirmacao_12345678');
        $this->assertSame($id, $this->modelo->confirmar(1, $pedido, $dados, 7, 'confirmacao_12345678'));
        $this->assertSame('Cancelado', $this->db->where('idOs', 1)->get('os')->row()->status);
        $this->assertSame('Não liga', $this->db->where('idOs', 1)->get('os')->row()->defeito);
        $this->assertSame(10, (int) $this->db->get('produtos')->row()->estoque);
        $this->assertSame(1, $this->db->count_all('trifase_estoque_eventos'));
        $this->assertSame(0, $this->db->count_all('produtos_os'));
        $this->assertSame(1, $this->db->count_all('servicos_os'));
        $this->assertSame(1, $this->db->count_all('os_historico'));
        $this->assertSame(3, $this->db->count_all('trifase_cancelamentos'));
        $r = json_decode($this->modelo->atual(1)->retrato, true);
        $this->assertSame($tecnica, $r['conferencia']['tecnica_evento_id']);
        $this->assertSame(2, $r['conferencia']['tecnico_id']);
        $this->assertSame('', $r['conferencia']['observacoes']);
    }

    public function testEtapaTecnicaNaoLiberaComPecasPendenciasOuCampoFinanceiroForjado(): void
    {
        $pedido = $this->pedido();
        try {
            $this->modelo->conferirTecnica(1, $pedido, $this->dadosTecnicos(), 2, 'tecnica_123456789');
            $this->fail('Aceitou peças vinculadas');
        } catch (DomainException $e) {
            $this->assertSame(1, $this->db->count_all('trifase_cancelamentos'));
        }
        $this->devolverPecas();
        foreach ([['pecas_nao_utilizadas' => '0'], ['servicos_nao_executados' => '0'], ['financeiro_conferido' => '1']] as $dados) {
            try {
                $this->modelo->conferirTecnica(1, $pedido, array_replace($this->dadosTecnicos(), $dados), 2, 'tecnica_123456789');
                $this->fail('Aceitou pendência ou financeiro na técnica');
            } catch (DomainException $e) {
                $this->assertSame(1, $this->db->count_all('trifase_cancelamentos'));
            }
        }
        $this->modelo->conferirTecnica(1, $pedido, $this->dadosTecnicos(), 2, 'tecnica_123456789');
        foreach (['financeiro_conferido', 'confirmar'] as $campo) {
            try {
                $this->modelo->confirmar(1, $pedido, array_replace($this->dados(), [$campo => '0']), 7, 'confirmacao_12345678');
                $this->fail('Aceitou financeiro não conferido');
            } catch (DomainException $e) {
                $this->assertSame('Aprovado', $this->db->where('idOs', 1)->get('os')->row()->status);
            }
        }
    }

    public function testMudancaDosItensInvalidaTecnicaSemDependerDePrecos(): void
    {
        $pedido = $this->pedido();
        $this->devolverPecas();
        $this->modelo->conferirTecnica(1, $pedido, $this->dadosTecnicos(), 2, 'tecnica_123456789');
        $this->db->where('idServicos_os', 1)->update('servicos_os', ['quantidade' => 2]);
        try {
            $this->modelo->confirmar(1, $pedido, $this->dados(), 7, 'confirmacao_12345678');
            $this->fail('Usou técnica desatualizada');
        } catch (DomainException $e) {
            $this->assertStringContainsString('conferência técnica', $e->getMessage());
        }
        $this->assertSame('solicitar', $this->modelo->atual(1)->tipo);
        $this->expectException(DomainException::class);
        $this->modelo->conferirTecnica(2, $pedido, $this->dadosTecnicos(), 2, 'outra_os_123456789');
    }

    public function testRetiradaEncerraPedidoMesmoAposConferenciaTecnica(): void
    {
        $pedido = $this->pedido();
        $this->devolverPecas();
        $this->modelo->conferirTecnica(1, $pedido, $this->dadosTecnicos(), 2, 'tecnica_123456789');
        $id = $this->modelo->retirar(1, $pedido, 'Cliente decidiu continuar', 7, 'retirada_123456789');
        $this->assertSame($id, $this->modelo->retirar(1, $pedido, 'Cliente decidiu continuar', 7, 'retirada_123456789'));
        $this->assertSame([], $this->modelo->pendentes());
        $this->expectException(DomainException::class);
        $this->modelo->confirmar(1, $pedido, $this->dados(), 7, 'confirmacao_12345678');
    }

    public function testFilaDeCancelamentosPendentesAcompanhaConferenciaTecnicaEResumoFinanceiro(): void
    {
        $pedido = $this->pedido();
        $fila = $this->modelo->pendentes([1 => ['total_c' => 20000, 'recebido_c' => 15000, 'recebido_original_c' => 20000, 'reembolsado_c' => 5000, 'saldo_c' => 5000]]);
        $this->assertCount(1, $fila);
        $this->assertSame(1, $fila[0]['os_id']);
        $this->assertFalse($fila[0]['tecnica_concluida']);
        $this->assertSame(20000, $fila[0]['total_c']);
        $this->assertSame(20000, $fila[0]['recebido_c']);
        $this->assertSame(5000, $fila[0]['devolvido_c']);
        $this->assertSame(5000, $fila[0]['saldo_c']);
        $this->devolverPecas();
        $this->modelo->conferirTecnica(1, $pedido, $this->dadosTecnicos(), 2, 'tecnica_123456789');
        $fila = $this->modelo->pendentes();
        $this->assertTrue($fila[0]['tecnica_concluida']);
    }

    public function testObrigacaoComRecebimentoBloqueiaMesmoComTecnicaPronta(): void
    {
        $this->db->query('CREATE TABLE trifase_financeiro_obrigacoes (os_id INTEGER, bruto_c INTEGER, desconto_c INTEGER)');
        $this->db->query('INSERT INTO trifase_financeiro_obrigacoes VALUES (1, 10000, 0)');
        $this->db->query('CREATE TABLE trifase_financeiro_eventos (os_id INTEGER, tipo TEXT, valor_c INTEGER, id INTEGER)');
        $this->db->query("INSERT INTO trifase_financeiro_eventos VALUES (1, 'receber', 5000, 1)");
        $this->db->data_cache = [];
        $pedido = $this->pedido();
        $this->devolverPecas();
        $this->modelo->conferirTecnica(1, $pedido, $this->dadosTecnicos(), 2, 'tecnica_123456789');
        try {
            $this->modelo->confirmar(1, $pedido, $this->dados(), 7, 'confirmacao_12345678');
            $this->fail('Cancelou cobrança');
        } catch (DomainException $e) {
            $this->assertStringContainsString('financeira', $e->getMessage());
            $this->assertSame(5000, (int) $this->db->get('trifase_financeiro_eventos')->row()->valor_c);
            $this->assertSame('Aprovado', $this->db->where('idOs', 1)->get('os')->row()->status);
        }
    }

    public function testFalhaNoHistoricoPreservaConferenciaTecnicaSemCancelarParcialmente(): void
    {
        $pedido = $this->pedido();
        $this->devolverPecas();
        $this->modelo->conferirTecnica(1, $pedido, $this->dadosTecnicos(), 2, 'tecnica_123456789');
        $this->db->db_debug = false;
        $this->db->query("CREATE TRIGGER falha_historico BEFORE INSERT ON os_historico BEGIN SELECT RAISE(FAIL, 'falha cancelamento'); END");
        set_error_handler(static fn ($nivel, $mensagem) => $mensagem === 'SQLite3::exec(): falha cancelamento');
        try {
            $this->modelo->confirmar(1, $pedido, $this->dados(), 7, 'confirmacao_12345678');
            $this->fail('Confirmou parcialmente');
        } catch (RuntimeException $e) {
            $this->assertSame(10, (int) $this->db->get('produtos')->row()->estoque);
            $this->assertSame(1, $this->db->count_all('trifase_estoque_eventos'));
            $this->assertSame(2, $this->db->count_all('trifase_cancelamentos'));
            $this->assertSame('Aprovado', $this->db->where('idOs', 1)->get('os')->row()->status);
        } finally {
            restore_error_handler();
        }
    }
}
