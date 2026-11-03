<?php

require_once APPPATH . 'controllers/Os.php';
require_once APPPATH . 'models/Os_model.php';
require_once APPPATH . 'models/Trifase_equipamento_model.php';
require_once APPPATH . 'database/migrations/20261102010000_trifase_equipamentos.php';
require_once BASEPATH . 'database/DB_forge.php';
require_once BASEPATH . 'database/drivers/sqlite3/sqlite3_forge.php';

final class TrifaseNovaUnidadeTest extends MaposTestCase
{
    private object $controller;

    protected function setUp(): void
    {
        parent::setUp();
        $this->db->query('CREATE TABLE os (idOs INTEGER PRIMARY KEY, clientes_id INTEGER, status TEXT, dataInicial TEXT, faturado INTEGER)');
        $this->db->query('CREATE TABLE os_historico (os_id INTEGER, status_anterior TEXT, status_novo TEXT, usuarios_id INTEGER, data_hora TEXT)');
        $migration = new class() extends Migration_trifase_equipamentos {
            public object $dbforge;
        };
        $migration->db = $this->db;
        $migration->dbforge = new CI_DB_sqlite3_forge($this->db);
        $migration->up();
        $this->controller = new class() extends Os {
            public object $db;
            public object $os_model;
            public object $equipamentos_os;
            public object $session;
            public function __construct()
            {
            }
        };
        $this->controller->db = $this->db;
        $this->controller->os_model = $this->makeInstance(Os_model::class);
        $this->controller->os_model->db = $this->db;
        $this->controller->equipamentos_os = new Trifase_equipamento_model();
        $this->controller->equipamentos_os->db = $this->db;
        $this->controller->session = new class() {
            public function userdata($key)
            {
                return 7;
            }
        };
    }

    private function salvar(array $entrada): ?int
    {
        (new ReflectionProperty(Os::class, 'entradaEquipamentoNovaOs'))->setValue($this->controller, $entrada);
        return $this->invokeMethod($this->controller, 'criarOs', [['clientes_id' => 42, 'status' => 'Aberto', 'dataInicial' => '2026-11-03']]);
    }

    private function entrada(string $selo = 'NOVA-001'): array
    {
        return ['modo' => 'novo', 'tipo' => 'placa', 'marca' => 'LG', 'modelo' => 'INV', 'selo' => $selo, 'itens_recebidos' => 'Placa e cabo', 'estado_entrada' => 'Conferido', 'operacao' => str_pad($selo, 24, '_')];
    }

    public function testCriaOsUnidadeERetratoDoClienteNaMesmaTransacao(): void
    {
        $id = $this->salvar($this->entrada());
        $this->assertNotNull($id);
        $unidade = $this->db->get('trifase_equipamentos')->row();
        $this->assertSame(42, (int) $unidade->cliente_id);
        $this->assertSame('NOVA-001', $unidade->selo);
        $this->assertSame('Placa e cabo', $this->controller->equipamentos_os->porOs($id)->itens_recebidos);
        $this->assertSame(1, $this->db->count_all('os_historico'));
    }

    public function testFalhaNaoDeixaOsHistoricoOuCatalogoParcial(): void
    {
        $this->assertNotNull($this->salvar($this->entrada()));
        $dados = array_replace($this->entrada('nova-001'), ['marca' => 'Outra marca', 'operacao' => str_repeat('x', 24)]);
        $this->assertNull($this->salvar($dados));
        foreach (['os', 'os_historico', 'trifase_equipamentos', 'trifase_equipamento_modelos', 'trifase_os_equipamentos'] as $tabela) {
            $this->assertSame(1, $this->db->count_all($tabela), $tabela);
        }
    }

    public function testIdentificacaoAusenteNaoCriaNada(): void
    {
        $this->assertNull($this->salvar(array_replace($this->entrada(), ['selo' => ''])));
        foreach (['os', 'os_historico', 'trifase_equipamentos', 'trifase_equipamento_modelos'] as $tabela) {
            $this->assertSame(0, $this->db->count_all($tabela), $tabela);
        }
    }

    public function testMesmoModeloPermiteUnidadesFisicasDistintas(): void
    {
        $a = $this->salvar($this->entrada());
        $b = $this->salvar($this->entrada('NOVA-002'));
        $this->assertNotNull($a);
        $this->assertNotNull($b);
        $this->assertNotSame($a, $b);
        $this->assertSame(1, $this->db->count_all('trifase_equipamento_modelos'));
        $this->assertSame(2, $this->db->count_all('trifase_equipamentos'));
    }

    public function testChaveReenviadaNaoDuplicaOsMesmoSemSelo(): void
    {
        $dados = array_replace($this->entrada(), ['selo' => '', 'serie' => 'SERIE-001']);
        $this->assertNotNull($this->salvar($dados));
        $this->assertNull($this->salvar($dados));
        $this->assertSame(1, $this->db->count_all('os'));
        $this->assertSame(1, $this->db->count_all('os_historico'));
        $this->assertSame(1, $this->db->count_all('trifase_equipamentos'));
    }
}
