<?php

require_once APPPATH . 'models/Trifase_cancelamento_model.php';
require_once APPPATH . 'models/Trifase_financeiro_model.php';
require_once APPPATH . 'database/migrations/20261104010000_trifase_cancelamentos.php';
require_once BASEPATH . 'database/DB_forge.php';
require_once BASEPATH . 'database/drivers/sqlite3/sqlite3_forge.php';

/**
 * Migração parcial do financeiro: a tabela de obrigações existe e a de eventos
 * ainda não. Nenhuma tela pode consultar a projeção que não é calculável, e o
 * cancelamento não pode seguir com saldo desconhecido.
 */
final class PortalMigracaoParcialTest extends MaposTestCase
{
    private array $ambiente;
    private Trifase_cancelamento_model $cancelamentos;

    protected function setUp(): void
    {
        parent::setUp();
        $this->ambiente = $_ENV;
        $_ENV['TRIFASE_FINANCEIRO_ENABLED'] = 'true';
        $_ENV['APP_ENCRYPTION_KEY'] = 'chave-sintetica-de-teste';
        $this->db->query('CREATE TABLE os (idOs INTEGER PRIMARY KEY, status TEXT, faturado INTEGER, lancamento INTEGER, defeito TEXT, clientes_id INTEGER)');
        $this->db->query("INSERT INTO os VALUES (1, 'Aprovado', 0, NULL, 'Não liga', 3)");
        $this->db->query('CREATE TABLE clientes (idClientes INTEGER PRIMARY KEY, nomeCliente TEXT)');
        $this->db->query("INSERT INTO clientes VALUES (3, 'Cliente da OS')");
        $this->db->query('CREATE TABLE produtos (idProdutos INTEGER PRIMARY KEY, descricao TEXT)');
        $this->db->query('CREATE TABLE servicos (idServicos INTEGER PRIMARY KEY, nome TEXT)');
        $this->db->query('CREATE TABLE produtos_os (idProdutos_os INTEGER PRIMARY KEY, os_id INTEGER, produtos_id INTEGER, quantidade INTEGER, preco TEXT, subTotal TEXT)');
        $this->db->query('CREATE TABLE servicos_os (idServicos_os INTEGER PRIMARY KEY, os_id INTEGER, servicos_id INTEGER, quantidade INTEGER)');
        $migracao = new class() extends Migration_trifase_cancelamentos {
            public object $dbforge;
        };
        $migracao->db = $this->db;
        $migracao->dbforge = new CI_DB_sqlite3_forge($this->db);
        $migracao->up();
        $this->db->query('CREATE TABLE trifase_financeiro_obrigacoes (os_id INTEGER PRIMARY KEY, bruto_c INTEGER, desconto_c INTEGER)');
        $this->db->insert('trifase_financeiro_obrigacoes', ['os_id' => 1, 'bruto_c' => 5000, 'desconto_c' => 0]);
        // O driver guarda a lista de tabelas; sem limpar, a tabela recém-criada some.
        $this->db->data_cache = [];
        $this->cancelamentos = new Trifase_cancelamento_model();
        $this->cancelamentos->db = $this->db;
    }

    protected function tearDown(): void
    {
        $_ENV = $this->ambiente;
        parent::tearDown();
    }

    public function testProjecaoEmLoteNaoConsultaEventosAusentes(): void
    {
        $financeiro = new Trifase_financeiro_model();
        $financeiro->db = $this->db;
        $this->assertSame([], $financeiro->resumos([1]), 'Sem tabela de eventos não há projeção a inventar');
    }

    public function testConferenciaBloqueiaCancelamentoComProjecaoIndisponivel(): void
    {
        $conferencia = $this->cancelamentos->conferencia($this->db->where('idOs', 1)->get('os')->row());
        $this->assertNull($conferencia['financeiro']);
        $this->assertNotEmpty($conferencia['bloqueios'], 'OS gerenciada pelo financeiro não pode ser cancelada com saldo desconhecido');
        $this->expectException(DomainException::class);
        $this->cancelamentos->solicitar(1, 'assistencia', 'Cliente desistiu', 7, 'migracao_parcial_02');
    }

    public function testFilaDeCancelamentosExibeTotalIndisponivelSemQuebrar(): void
    {
        // Pedido gravado antes de a tabela de eventos ficar ausente na migração.
        $this->db->insert('trifase_cancelamentos', [
            'os_id' => 1, 'tipo' => 'solicitar', 'pedido_id' => null, 'solicitante' => 'Por iniciativa da assistência',
            'motivo' => 'Pedido anterior', 'retrato' => '{}', 'usuario_id' => 7, 'criado_em' => date('Y-m-d H:i:s'),
            'operacao' => 'migracao_parcial_03', 'payload_hash' => str_repeat('a', 64),
        ]);
        $itens = $this->cancelamentos->pendentes();
        $this->assertCount(1, $itens);
        $this->assertNull($itens[0]['total_c']);
        $this->assertNull($itens[0]['resumo']);
    }

    public function testEntregaSoApareceComModuloLigadoETabelasMigradas(): void
    {
        $this->db->query('CREATE TABLE trifase_entregas_estado (os_id INTEGER PRIMARY KEY, evento_id INTEGER)');
        $this->db->query('CREATE TABLE trifase_entregas_eventos (id INTEGER PRIMARY KEY, os_id INTEGER)');
        $this->db->data_cache = [];
        require_once APPPATH . 'controllers/Publico_cliente.php';
        $portal = new class() extends Publico_cliente {
            public $db;

            public function __construct()
            {
            }
        };
        $portal->db = $this->db;
        $metodo = new ReflectionMethod(Publico_cliente::class, 'entregasDisponiveis');
        $_ENV['TRIFASE_ENTREGAS_ENABLED'] = 'false';
        $this->assertFalse($metodo->invoke($portal), 'Módulo de entrega desligado não expõe a coluna no portal');
        $_ENV['TRIFASE_ENTREGAS_ENABLED'] = 'true';
        $this->assertTrue($metodo->invoke($portal));
        $this->db->query('DROP TABLE trifase_entregas_eventos');
        $this->db->data_cache = [];
        $this->assertFalse($metodo->invoke($portal), 'Migração parcial da entrega também oculta a coluna');
    }
}
