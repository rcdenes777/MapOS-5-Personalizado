<?php

require_once APPPATH . 'models/Produtos_model.php';
require_once APPPATH . 'helpers/api_helper.php';
require_once APPPATH . 'controllers/api/v1/ProdutosController.php';

final class ApiProdutosCustosTest extends MaposTestCase
{
    public function testConsultaEEdicaoDaApiExigemPermissoesIndependentesDeCusto(): void
    {
        $this->db->query('CREATE TABLE produtos (idProdutos INTEGER PRIMARY KEY, descricao TEXT, unidade TEXT, precoCompra REAL, precoVenda REAL,
            codDeBarra TEXT, estoque INTEGER, estoqueMinimo INTEGER, entrada INTEGER, saida INTEGER)');
        $this->db->query("INSERT INTO produtos (idProdutos, descricao, unidade, precoCompra, precoVenda, estoque) VALUES (1, 'Tela', 'UNID', 57.43, 100, 10)");

        $model = new Produtos_model();
        $model->db = $this->db;
        $controller = new class($model) extends ProdutosController {
            public array $entrada = [];
            public object $permission;

            public function __construct(public Produtos_model $produtos_model)
            {
                $this->permission = new class() {
                    public bool $leitura = false;
                    public bool $edicao = false;

                    public function checkPermission($grupo, $acao): bool
                    {
                        return match ($acao) {
                            'vCustoInterno' => $this->leitura,
                            'eCustoInterno' => $this->edicao,
                            default => true,
                        };
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

            public function response($data = null, $http_code = null, $continue = false)
            {
                throw new RuntimeException(json_encode(['code' => $http_code, 'data' => $data], JSON_THROW_ON_ERROR));
            }

            public function put($key = null, $xss_clean = null)
            {
                return $key === null ? $this->entrada : ($this->entrada[$key] ?? null);
            }
        };
        $chamar = function ($metodo, $id) use ($controller) {
            try {
                $controller->$metodo($id);
            } catch (RuntimeException $e) {
                return json_decode($e->getMessage(), true, flags: JSON_THROW_ON_ERROR);
            }

            $this->fail('O controller deveria responder.');
        };

        $resposta = $chamar('index_get', 1);
        $this->assertSame(200, $resposta['code']);
        $this->assertEquals(100, $resposta['data']['result']['precoVenda']);
        $this->assertArrayNotHasKey('precoCompra', $resposta['data']['result']);

        $controller->entrada = ['descricao' => 'Tela nova', 'unidade' => 'UNID', 'precoVenda' => '110.00', 'estoque' => '10'];
        $resposta = $chamar('index_put', 1);
        $this->assertSame(200, $resposta['code']);
        $this->assertEquals(110, $resposta['data']['result']['precoVenda']);
        $this->assertArrayNotHasKey('precoCompra', $resposta['data']['result']);
        $this->assertEquals(57.43, $model->getById(1)->precoCompra);

        $controller->entrada['precoCompra'] = '62.00';
        foreach ([[false, false], [false, true], [true, false]] as [$leitura, $edicao]) {
            $controller->permission->leitura = $leitura;
            $controller->permission->edicao = $edicao;
            $this->assertSame(403, $chamar('index_put', 1)['code']);
            $this->assertEquals(57.43, $model->getById(1)->precoCompra);
        }

        $controller->permission->leitura = true;
        $controller->permission->edicao = true;
        $resposta = $chamar('index_put', 1);
        $this->assertSame(200, $resposta['code']);
        $this->assertEquals(62, $resposta['data']['result']['precoCompra']);
        $this->assertEquals(62, $model->getById(1)->precoCompra);
    }
}
