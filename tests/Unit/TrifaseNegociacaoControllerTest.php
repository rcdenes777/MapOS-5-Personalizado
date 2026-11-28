<?php

require_once APPPATH . 'controllers/Trifase_orcamentos.php';

if (! function_exists('redirect')) {
    function redirect(string $uri)
    {
        $GLOBALS['mapos_redirect'] = $uri;
    }
}

/**
 * Vínculo entre prévia e confirmação no controlador de negociação: o POST só
 * publica quando a sessão guardou a mesma versão/hash e o operador confirmou.
 */
final class TrifaseNegociacaoControllerTest extends MaposTestCase
{
    private function controller(array $post, ?array $previa = null, bool $permitido = true): object
    {
        $controller = new class() extends Trifase_orcamentos {
            public $db;

            public $input;

            public $output;

            public $permission;

            public $session;

            public $load;

            public $orcamentos;

            public function __construct()
            {
            }
        };
        $this->db->query('CREATE TABLE IF NOT EXISTS os (idOs INTEGER PRIMARY KEY, clientes_id INTEGER, status TEXT, faturado INTEGER, valor_desconto REAL, tipo_desconto TEXT, desconto REAL)');
        $this->db->where('idOs', 1)->delete('os');
        $this->db->insert('os', ['idOs' => 1, 'clientes_id' => 3, 'status' => 'Em Andamento', 'faturado' => 0, 'valor_desconto' => 0, 'tipo_desconto' => null, 'desconto' => 0]);
        $controller->db = $this->db;
        $controller->input = new class($post) {
            public function __construct(private array $post)
            {
            }

            public function post($chave = null)
            {
                return $chave === null ? $this->post : ($this->post[$chave] ?? null);
            }

            public function input_stream($chave = null, $xss = true)
            {
                return $this->post($chave);
            }

            public function server($chave)
            {
                return $chave === 'CONTENT_TYPE' ? 'application/x-www-form-urlencoded' : null;
            }

            public function method($upper = false)
            {
                return $upper ? 'POST' : 'post';
            }
        };
        $controller->output = new class() {
            public int $status = 200;

            public string $corpo = '';

            public function set_status_header($status)
            {
                $this->status = $status;

                return $this;
            }

            public function set_content_type($tipo, $charset = null)
            {
                return $this;
            }

            public function set_output($corpo)
            {
                $this->corpo = $corpo;

                return $this;
            }
        };
        $controller->permission = new class($permitido) {
            public function __construct(private bool $permitido)
            {
            }

            public function checkPermission($grupo, $permissao)
            {
                return $this->permitido;
            }
        };
        $controller->session = new class($previa) {
            public array $flash = [];

            public function __construct(private ?array $previa)
            {
            }

            public function userdata($chave)
            {
                if ($chave === 'negociacao_previa_1') {
                    return $this->previa;
                }

                return ['id_admin' => '7', 'nome_admin' => 'Ana', 'permissao' => '1'][$chave] ?? null;
            }

            public function set_userdata($chave, $valor): void
            {
            }

            public function set_flashdata($chave, $valor): void
            {
                $this->flash[$chave] = $valor;
            }
        };
        $controller->load = new class() {
            public function model($nome, $alias = null)
            {
            }
        };
        $controller->orcamentos = new class() {
            public array $chamadas = [];

            public function negociarDesconto(...$args)
            {
                $this->chamadas[] = $args;
            }
        };

        return $controller;
    }

    private function post(): array
    {
        return ['confirmar' => '1', 'tipo' => 'real', 'valor_codificado' => base64_encode('10'),
            'motivo_codificado' => base64_encode('Motivo interno'), 'versao' => '2',
            'hash_anterior' => str_repeat('a', 64), 'hash_proposto' => str_repeat('b', 64), 'operacao' => str_repeat('c', 32)];
    }

    private function previa(): array
    {
        return ['versao' => 2, 'hash' => str_repeat('b', 64), 'expira' => time() + 600];
    }

    public function testSemConfirmacaoNaoPublica(): void
    {
        $controller = $this->controller(array_replace($this->post(), ['confirmar' => '0']), $this->previa());
        $controller->negociar_desconto(1);
        $this->assertSame(422, $controller->output->status);
        $this->assertStringContainsString('Confirme', $controller->output->corpo);
        $this->assertSame([], $controller->orcamentos->chamadas);
    }

    public function testPreviaAusenteExpiradaOuDeOutraVersaoNaoPublica(): void
    {
        foreach ([[], ['versao' => 1, 'hash' => str_repeat('b', 64), 'expira' => time() + 600],
            ['versao' => 2, 'hash' => str_repeat('d', 64), 'expira' => time() + 600],
            ['versao' => 2, 'hash' => str_repeat('b', 64), 'expira' => time() - 1]] as $previa) {
            $controller = $this->controller($this->post(), $previa);
            $controller->negociar_desconto(1);
            $this->assertSame(422, $controller->output->status, json_encode($previa));
            $this->assertStringContainsString('prévia', $controller->output->corpo);
            $this->assertSame([], $controller->orcamentos->chamadas);
        }
    }

    public function testPreviaDaSessaoComMesmoHashPublicaComOsDadosDoServidor(): void
    {
        $GLOBALS['mapos_redirect'] = null;
        $controller = $this->controller($this->post(), $this->previa());
        $controller->negociar_desconto(1);
        $this->assertCount(1, $controller->orcamentos->chamadas);
        $args = $controller->orcamentos->chamadas[0];
        $this->assertSame(1, $args[0]);
        $this->assertSame(2, $args[1]);
        $this->assertSame(str_repeat('a', 64), $args[2]);
        $this->assertSame(7, $args[3]);
        $this->assertSame('real', $args[5]);
        $this->assertSame('10', $args[6]);
        $this->assertSame('Motivo interno', $args[7]);
        $this->assertSame(str_repeat('b', 64), $args[8]);
        $this->assertSame('trifase_orcamentos/visualizar/1', $GLOBALS['mapos_redirect']);
    }

    public function testSemPermissaoDePublicarNaoNegocia(): void
    {
        $controller = $this->controller($this->post(), $this->previa(), false);
        $this->expectException(RuntimeException::class);
        $controller->negociar_desconto(1);
    }
}
