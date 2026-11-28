<?php

require_once APPPATH . 'controllers/Servicos.php';

if (! function_exists('redirect')) {
    function redirect(string $uri)
    {
        $GLOBALS['mapos_redirect'] = $uri;
    }
}

if (! function_exists('site_url')) {
    function site_url(string $uri = ''): string
    {
        return '/index.php/' . ltrim($uri, '/');
    }
}

if (! function_exists('log_info')) {
    function log_info($task)
    {
    }
}

/** Regressão F06: serviço sem vínculo em OS continua excluível. */
final class ServicoExclusaoSemVinculoTest extends MaposTestCase
{
    public function testServicoSemVinculoExcluiCadastroMesmoSemLinhasEmServicosOs(): void
    {
        $controller = new class() extends Servicos {
            public $db;

            public $input;

            public $permission;

            public $session;

            public $servicos_model;

            public function __construct()
            {
            }
        };
        $controller->db = new class() {
            public string $dbdriver = 'sqlite';

            public function table_exists($tabela): bool
            {
                return false;
            }
        };
        $controller->input = new class() {
            public function post($chave = null)
            {
                return $chave === 'id' ? '9' : null;
            }

            public function get($chave = null)
            {
                return $chave === null ? [] : null;
            }
        };
        $controller->permission = new class() {
            public function checkPermission($grupo, $permissao): bool
            {
                return true;
            }
        };
        $controller->session = new class() {
            public array $flash = [];

            public function userdata($chave)
            {
                return '1';
            }

            public function set_flashdata($chave, $valor): void
            {
                $this->flash[$chave] = $valor;
            }
        };
        $controller->servicos_model = new class() {
            public array $chamadas = [];

            public function delete($tabela, $campo, $id): bool
            {
                $this->chamadas[] = $tabela;

                return $tabela === 'servicos';
            }
        };

        $controller->excluir();

        $this->assertSame(['servicos_os', 'servicos'], $controller->servicos_model->chamadas);
        $this->assertArrayHasKey('success', $controller->session->flash);
        $this->assertArrayNotHasKey('error', $controller->session->flash);
    }
}
