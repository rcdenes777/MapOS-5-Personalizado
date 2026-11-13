<?php

require_once APPPATH . 'models/Mapos_model.php';
require_once APPPATH . 'controllers/api/v1/ApiController.php';

final class ApiPainelPermissoesTest extends MaposTestCase
{
    private function banco(): void
    {
        $this->db->query('CREATE TABLE clientes (idClientes INTEGER, nomeCliente TEXT)');
        $this->db->query('CREATE TABLE os (
            idOs INTEGER, dataInicial TEXT, dataFinal TEXT, garantia TEXT, descricaoProduto TEXT, defeito TEXT,
            status TEXT, observacoes TEXT, laudoTecnico TEXT, clientes_id INTEGER, usuarios_id INTEGER, garantias_id INTEGER,
            valorTotal NUMERIC, desconto NUMERIC, valor_desconto NUMERIC, tipo_desconto TEXT, lancamento INTEGER,
            faturado INTEGER, novoCampoInterno TEXT
        )');
        $this->db->query('CREATE TABLE produtos (
            idProdutos INTEGER, codDeBarra TEXT, descricao TEXT, unidade TEXT, estoque INTEGER, estoqueMinimo INTEGER,
            saida INTEGER, entrada INTEGER, precoVenda NUMERIC, precoCompra NUMERIC, novoCampoInterno TEXT
        )');
        foreach (['produtos_os', 'servicos_os'] as $tabela) {
            $this->db->query('CREATE TABLE ' . $tabela . ' (os_id INTEGER, quantidade INTEGER, preco NUMERIC, desconto NUMERIC, subTotal NUMERIC)');
        }
        foreach (['servicos', 'garantias', 'vendas'] as $tabela) {
            $this->db->query('CREATE TABLE ' . $tabela . ' (id INTEGER)');
        }
        $this->db->query("INSERT INTO clientes VALUES (1, 'Cliente QA')");
        foreach ([1 => 'Aberto', 2 => 'Em Andamento'] as $id => $status) {
            $this->db->insert('os', [
                'idOs' => $id, 'clientes_id' => 1, 'status' => $status, 'dataFinal' => '2026-11-12',
                'valorTotal' => 458.22, 'desconto' => 8.22, 'valor_desconto' => 450,
                'tipo_desconto' => 'real', 'lancamento' => 95, 'faturado' => 1, 'novoCampoInterno' => 'Privado',
            ]);
        }
        $this->db->query("INSERT INTO produtos VALUES (1, 'P1', 'Peça QA', 'UN', 1, 4, 1, 1, 94.35, 44.82, 'Privado')");
        $this->db->query('INSERT INTO produtos_os VALUES (1, 2, 50, 10, 90), (1, 1, 15, 0, 15)');
        $this->db->query('INSERT INTO servicos_os VALUES (1, 1, 67.2, 0, 67.2)');
    }

    public function testDashboardECalendarioProjetamSomenteCamposAutorizados(): void
    {
        $this->banco();
        $model = $this->makeInstance(Mapos_model::class);
        $model->db = $this->db;
        $controller = new class($model) extends ApiController {
            public object $permission;

            public function __construct(public Mapos_model $mapos_model)
            {
                $this->permission = new class() {
                    public array $ativas = [];

                    public function checkPermission($grupo, $acao): bool
                    {
                        return in_array($acao, $this->ativas, true);
                    }
                };
            }

            public function __destruct()
            {
            }

            public function logged_user()
            {
                return (object) ['level' => 2];
            }

            public function get($key = null, $xss_clean = null)
            {
                return ['start' => '2026-11-01', 'end' => '2026-11-30'][$key] ?? null;
            }

            public function response($data = null, $http_code = null, $continue = false)
            {
                throw new RuntimeException(json_encode(['code' => $http_code, 'data' => $data], JSON_THROW_ON_ERROR));
            }
        };
        $chamar = function (string $metodo) use ($controller): array {
            try {
                $controller->$metodo();
            } catch (RuntimeException $e) {
                return json_decode($e->getMessage(), true, flags: JSON_THROW_ON_ERROR);
            }
            $this->fail('O controller deveria responder.');
        };

        $camposOperacionais = [
            'idOs', 'dataInicial', 'dataFinal', 'garantia', 'descricaoProduto', 'defeito', 'status',
            'observacoes', 'laudoTecnico', 'clientes_id', 'usuarios_id', 'garantias_id', 'nomeCliente',
        ];
        $camposFinanceiros = ['valorTotal', 'desconto', 'valor_desconto', 'tipo_desconto', 'lancamento', 'faturado'];
        foreach ([
            'técnico' => ['vOs'],
            'recepção' => ['vOs', 'vProduto'],
            'financeiro' => ['vOs', 'vProduto', 'vLancamento'],
            'administrador' => ['vOs', 'vProduto', 'vLancamento', 'vCustoInterno'],
            'consulta de custos' => ['vOs', 'vProduto', 'vCustoInterno'],
        ] as $perfil => $permissoes) {
            $controller->permission->ativas = $permissoes;
            $financeiro = in_array('vLancamento', $permissoes, true);
            $custo = in_array('vCustoInterno', $permissoes, true);
            $dash = $chamar('index_get');
            $agenda = $chamar('calendario_get');
            $this->assertSame(200, $dash['code'], $perfil);
            $this->assertSame(200, $agenda['code'], $perfil);
            $dashboard = $dash['data']['result'];
            $calendario = $agenda['data']['result'];
            $this->assertSame(['start', 'end', 'allOs'], array_keys($calendario), $perfil);
            $this->assertSame(['2026-11-01', '2026-11-30'], [$calendario['start'], $calendario['end']], $perfil);
            $this->assertSame([1], array_column($dashboard['osAbertas'], 'idOs'), $perfil);
            $this->assertSame([2], array_column($dashboard['osAndamento'], 'idOs'), $perfil);
            $this->assertCount(2, $calendario['allOs'], $perfil);
            $esperados = $financeiro ? [...$camposOperacionais, ...$camposFinanceiros] : $camposOperacionais;
            foreach ([$dashboard['osAbertas'], $dashboard['osAndamento']] as $lista) {
                $this->assertEqualsCanonicalizing($esperados, array_keys($lista[0]), $perfil);
            }
            $esperadosCalendario = $financeiro ? [...$esperados, 'totalProdutos', 'totalServicos'] : $esperados;
            $evento = $calendario['allOs'][0];
            $this->assertEqualsCanonicalizing($esperadosCalendario, array_keys($evento), $perfil);
            $this->assertSame('Cliente QA', $evento['nomeCliente'], $perfil);
            if ($financeiro) {
                $this->assertEquals(105, $evento['totalProdutos'], $perfil);
                $this->assertEquals(67.2, $evento['totalServicos'], $perfil);
                $this->assertEquals(458.22, $evento['valorTotal'], $perfil);
            }
            if (in_array('vProduto', $permissoes, true)) {
                $produto = $dashboard['estoqueBaixo'][0];
                $this->assertSame('Peça QA', $produto['descricao'], $perfil);
                $this->assertSame($financeiro, array_key_exists('precoVenda', $produto), $perfil);
                $this->assertSame($custo, array_key_exists('precoCompra', $produto), $perfil);
                $this->assertArrayNotHasKey('novoCampoInterno', $produto, $perfil);
            } else {
                $this->assertSame([], $dashboard['estoqueBaixo'], $perfil);
            }
        }

        $controller->permission->ativas = ['vLancamento', 'vProduto'];
        $dashboard = $chamar('index_get')['data']['result'];
        $this->assertArrayNotHasKey('osAbertas', $dashboard);
        $this->assertArrayNotHasKey('osAndamento', $dashboard);
        $this->assertSame(401, $chamar('calendario_get')['code']);
    }
}
