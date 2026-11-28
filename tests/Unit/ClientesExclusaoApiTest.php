<?php

/** Interrompe a execução no lugar do exit de REST_Controller::response(). */
final class RespostaApiTeste extends RuntimeException
{
}

/**
 * Contrato HTTP da exclusão de cliente na API. A rota é o segundo ponto de
 * entrada da mesma exclusão transacional usada pelo painel.
 */
final class ClientesExclusaoApiTest extends MaposTestCase
{
    /** Carregado em tempo de execução: outro teste já inclui o REST_Controller. */
    private function carregarControlador(): void
    {
        require_once APPPATH . 'controllers/api/v1/ClientesController.php';
    }

    /**
     * @param  object  $modelo  Falso Clientes_model com o resultado da exclusão.
     * @param  object|null  $cliente  Retorno de getById (null = inexistente).
     */
    private function controlador(object $modelo, ?object $cliente): object
    {
        $this->carregarControlador();
        $c = new class() extends ClientesController {
            public $db;
            public $clientes_model;
            public $permission;
            public $config;
            public array $resposta = [];

            public function __construct()
            {
            }

            public function logged_user()
            {
                return (object) ['level' => 1];
            }

            public function log_app($tarefa, $nome_usuario = '')
            {
            }

            public function response($data = null, $http_code = null, $continue = false)
            {
                $this->resposta = ['corpo' => $data, 'status' => $http_code];
                throw new RespostaApiTeste();
            }
        };
        $c->db = $this->db;
        $c->clientes_model = $modelo;
        $c->permission = new class() {
            public function checkPermission($perfil, $nome)
            {
                return true;
            }
        };
        // Sem construtor não há CI_Instance: evita o __destruct tentar ler config.
        $c->config = new class() {
            public function item($chave)
            {
                return false;
            }
        };
        $modelo->cliente = $cliente;

        return $c;
    }

    private function modelo(bool $excluiu, ?object $cliente): object
    {
        return new class($excluiu, $cliente) {
            public ?object $cliente;

            public function __construct(private bool $excluiu, ?object $cliente)
            {
                $this->cliente = $cliente;
            }

            public function getById($id)
            {
                return $this->cliente;
            }

            public function excluirComDependencias(int $id): bool
            {
                return $this->excluiu;
            }
        };
    }

    private function chamar(object $controlador, $id): array
    {
        try {
            $controlador->index_delete($id);
            $this->fail('A rota de exclusão respondeu sem corpo.');
        } catch (RespostaApiTeste $resposta) {
            return $controlador->resposta;
        }
    }

    public function testClienteInexistenteRespondeNaoEncontrado(): void
    {
        $resposta = $this->chamar($this->controlador($this->modelo(false, null), null), 99);
        $this->assertSame(404, $resposta['status']);
        $this->assertFalse($resposta['corpo']['status']);
    }

    public function testExclusaoRecusadaRespondeConflitoENaoErroInterno(): void
    {
        $resposta = $this->chamar($this->controlador($this->modelo(false, (object) ['idClientes' => 7]), (object) ['idClientes' => 7]), 7);
        $this->assertSame(409, $resposta['status'], 'Restrição de negócio é conflito, não erro interno');
        $this->assertFalse($resposta['corpo']['status']);
    }

    public function testExclusaoBemSucedidaRespondeOk(): void
    {
        $resposta = $this->chamar($this->controlador($this->modelo(true, (object) ['idClientes' => 7]), (object) ['idClientes' => 7]), 7);
        $this->assertSame(200, $resposta['status']);
        $this->assertTrue($resposta['corpo']['status']);
    }
}
