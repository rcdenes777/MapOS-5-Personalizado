<?php
require_once APPPATH . 'models/Os_model.php';
require_once APPPATH . 'controllers/Os.php';
require_once APPPATH . 'models/Trifase_financeiro_model.php';

final class TrifaseOsFiltrosFinanceirosTest extends MaposTestCase
{
    private Os_model $model;
    private array $env;

    protected function setUp(): void
    {
        parent::setUp();
        $this->env = $_ENV;
        $_ENV['TRIFASE_FINANCEIRO_ENABLED'] = 'true';
        $_ENV['TRIFASE_UI_PILOTO_ENABLED'] = 'true';
        $this->db->query('CREATE TABLE clientes (idClientes INTEGER PRIMARY KEY AUTOINCREMENT, nomeCliente TEXT, documento TEXT)');
        $this->db->query('CREATE TABLE usuarios (idUsuarios INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT)');
        $this->db->query('CREATE TABLE os (idOs INTEGER PRIMARY KEY AUTOINCREMENT, dataInicial TEXT, dataFinal TEXT, descricaoProduto TEXT, status TEXT, faturado INTEGER DEFAULT 0, desconto REAL, valor_desconto REAL, clientes_id INTEGER, usuarios_id INTEGER, lancamento INTEGER)');
        $this->db->query('CREATE TABLE produtos_os (idProdutos_os INTEGER PRIMARY KEY AUTOINCREMENT, os_id INTEGER, produtos_id INTEGER, quantidade INTEGER, preco REAL, subTotal REAL, desconto REAL DEFAULT 0, tipo_desconto TEXT)');
        $this->db->query('CREATE TABLE servicos (idServicos INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT, preco REAL)');
        $this->db->query('CREATE TABLE servicos_os (idServicos_os INTEGER PRIMARY KEY AUTOINCREMENT, os_id INTEGER, servicos_id INTEGER, quantidade REAL, preco REAL, subTotal REAL, desconto REAL DEFAULT 0, tipo_desconto TEXT)');
        $this->db->query('CREATE TABLE lancamentos (idLancamentos INTEGER PRIMARY KEY AUTOINCREMENT, descricao TEXT, baixado INTEGER)');
        $this->db->query('CREATE TABLE trifase_financeiro_obrigacoes (os_id INTEGER PRIMARY KEY, bruto_c INTEGER, desconto_c INTEGER)');
        $this->db->query('CREATE TABLE trifase_financeiro_eventos (os_id INTEGER, tipo TEXT, valor_c INTEGER)');
        $this->db->query('CREATE TABLE trifase_garantia_reembolsos (origem_id INTEGER, valor_c INTEGER, credito_c INTEGER, cancelado_id INTEGER)');
        for ($id = 1; $id <= 12; $id++) {
            $this->db->insert('os', ['idOs' => $id, 'status' => $id === 5 ? 'Aberto' : 'Finalizado', 'faturado' => $id === 1 ? 0 : 1, 'dataInicial' => '2026-11-03', 'dataFinal' => '2026-11-10']);
            if ($id > 2) {
                $this->db->insert('trifase_financeiro_obrigacoes', ['os_id' => $id, 'bruto_c' => $id === 11 ? 0 : 12000, 'desconto_c' => $id === 11 ? 0 : 2000]);
            }
        }
        foreach ([4 => 4000, 5 => 10000, 6 => 4000, 7 => 4000, 9 => 6000, 10 => 10000, 12 => 10000] as $id => $valor) {
            $this->db->insert('trifase_financeiro_eventos', ['os_id' => $id, 'tipo' => 'receber', 'valor_c' => $valor]);
        }
        foreach ([6, 12] as $id) {
            $this->db->insert('trifase_financeiro_eventos', ['os_id' => $id, 'tipo' => 'estornar', 'valor_c' => 4000]);
        }
        foreach ([[7, 4000, 10000, null], [8, 0, 10000, null], [9, 1000, 1000, null], [10, 10000, 10000, 1]] as $r) {
            $this->db->insert('trifase_garantia_reembolsos', array_combine(['origem_id', 'valor_c', 'credito_c', 'cancelado_id'], $r));
        }
        $this->model = $this->makeInstance(Os_model::class);
        $this->model->db = $this->db;
    }

    protected function tearDown(): void
    {
        $_ENV = $this->env;
        parent::tearDown();
    }

    private function ids(array $filtros, int $limite = 30, int $offset = 0, ?array $visiveis = null): array
    {
        return array_map(static fn ($o) => (int) $o->idOs, $this->model->listar($filtros, $limite, $offset, $visiveis));
    }

    public function testCategoriasConferemComResumoCanonicoInclusiveEstornosEReembolsos(): void
    {
        $financeiro = new Trifase_financeiro_model();
        $financeiro->db = $this->db;
        $resumos = $financeiro->resumos(range(3, 12));
        $mapa = ['Pendente' => 'pendente', 'Quitado' => 'quitada', 'Parcialmente pago' => 'parcial', 'Reembolsado' => 'reembolsada', 'Encerrado por garantia' => 'encerrada_garantia'];
        foreach (Trifase_financeiro_busca::OPCOES as $filtro => $label) {
            $esperados = match ($filtro) {
                'nao_faturada' => [1], 'anterior' => [2], 'cancelamento_pendente' => [],
                default => array_keys(array_filter($resumos, static fn ($r) => $mapa[$r['situacao']] === $filtro)),
            };
            rsort($esperados);
            $this->assertSame($esperados, $this->ids(['financeiro' => $filtro]), $label);
            $this->assertSame(count($esperados), $this->model->contar(['financeiro' => $filtro]));
        }
        $this->db->query('CREATE TABLE trifase_cancelamentos (id INTEGER PRIMARY KEY AUTOINCREMENT, os_id INTEGER, tipo TEXT)');
        $this->db->insert('trifase_cancelamentos', ['os_id' => 4, 'tipo' => 'solicitar']);
        $this->db->insert('trifase_cancelamentos', ['os_id' => 5, 'tipo' => 'solicitar']);
        $this->db->insert('trifase_cancelamentos', ['os_id' => 5, 'tipo' => 'retirar']);
        $this->db->insert('trifase_cancelamentos', ['os_id' => 9, 'tipo' => 'solicitar']);
        $this->db->insert('trifase_cancelamentos', ['os_id' => 9, 'tipo' => 'tecnica']);
        $this->db->data_cache = [];
        $this->assertSame([9, 4], $this->ids(['financeiro' => 'cancelamento_pendente']));
        $this->assertSame(2, $this->model->contar(['financeiro' => 'cancelamento_pendente']));
        $this->assertSame([12, 9, 6, 4, 3], $this->ids(['saldo' => 'pendente']));
        $this->assertSame([12, 9, 4], $this->ids(['financeiro' => 'parcial', 'saldo' => 'pendente']));
    }

    public function testAndamentoIndependentePaginacaoEConfiguracaoNaoEscondemCobranças(): void
    {
        $this->assertSame([5], $this->ids(['financeiro' => 'quitada', 'status' => 'Aberto']));
        $this->assertSame([10], $this->ids(['financeiro' => 'quitada', 'status' => 'Finalizado']));
        $f = ['saldo' => 'pendente'];
        $this->assertSame([12, 9], $this->ids($f, 2, 0, ['Aberto']));
        $this->assertSame([6, 4], $this->ids($f, 2, 2, ['Aberto']));
        $this->assertSame(5, $this->model->contar($f, ['Aberto']));
        $this->assertSame([], $this->ids($f + ['ate' => '2026-11-01']));
        $this->assertSame([], $this->ids($f + ['pesquisa' => "x' OR 1=1"]));
    }

    public function testSemTabelaDeReembolsoEFlagDesligadaPreservamCompatibilidade(): void
    {
        $this->db->query('DROP TABLE trifase_garantia_reembolsos');
        $this->assertSame([12, 9, 8, 7, 6, 4, 3], $this->ids(['saldo' => 'pendente']));
        $_ENV['TRIFASE_FINANCEIRO_ENABLED'] = 'false';
        $this->assertSame([5], $this->ids(['saldo' => 'pendente'], 30, 0, ['Aberto']));
    }

    private function controller(array $query, bool $permitido): object
    {
        return new class($query, $permitido) extends Os {
            public object $input;
            public object $permission;
            public object $session;
            public function __construct(array $query, bool $permitido)
            {
                $this->input = new class($query) {
                    public function __construct(private array $query)
                    {
                    }
                    public function get()
                    {
                        return $this->query;
                    }
                };
                $this->permission = new class($permitido) {
                    public function __construct(private bool $permitido)
                    {
                    }
                    public function checkPermission(...$args)
                    {
                        return $this->permitido;
                    }
                };
                $this->session = new class() {
                    public function userdata($key)
                    {
                        return null;
                    }
                };
            }
        };
    }

    public function testFiltroFinanceiroExigePermissaoInclusiveNaUrlDireta(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('permissão para filtrar');
        $this->invokeMethod($this->controller(['financeiro' => 'parcial'], false), 'filtrosDaListagem');
    }

    public function testValidacaoDescartaValoresAdulteradosEFlagsOcultamOsFiltros(): void
    {
        $c = $this->controller(['financeiro' => "parcial' OR 1=1", 'saldo' => ['pendente'], 'status' => 'Finalizado'], false);
        $this->assertSame(['status' => 'Finalizado'], $this->invokeMethod($c, 'filtrosDaListagem'));
        $_ENV['TRIFASE_UI_PILOTO_ENABLED'] = 'false';
        $this->assertSame([], $this->invokeMethod($this->controller(['financeiro' => 'parcial', 'saldo' => 'pendente'], false), 'filtrosDaListagem'));
    }
}
