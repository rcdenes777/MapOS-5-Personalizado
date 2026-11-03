<?php

require_once APPPATH . 'controllers/Trifase_equipamentos.php';

if (! function_exists('site_url')) {
    function site_url($uri = '')
    {
        return 'http://localhost/' . ltrim($uri, '/');
    }
}
if (! function_exists('base_url')) {
    function base_url($uri = '')
    {
        return 'http://localhost/' . ltrim($uri, '/');
    }
}
if (! function_exists('current_url')) {
    function current_url()
    {
        return 'http://localhost/os/adicionar';
    }
}

final class TrifaseNovaOsTest extends \PHPUnit\Framework\TestCase
{
    public function testBuscaOpcionalNaoExigeEntradaSemUnidade(): void
    {
        $html = $this->formulario();
        $dom = $this->dom($html);
        $this->assertCount(1, $dom->query('//input[@name="equipamento_id"]'));
        $this->assertSame('', $dom->query('//input[@name="equipamento_id"]')->item(0)->getAttribute('value'));
        $this->assertCount(1, $dom->query('//fieldset[@data-nova-os-unidade-entrada and @disabled]'));
        $this->assertCount(1, $dom->query('//input[@id="nova-os-equipamento-busca" and @disabled]'));
        $this->assertStringContainsString('novo defeito', $html);
    }

    public function testGetAnteriorReutilizaIdentificacaoMasNaoCopiaRelatoOuEntrada(): void
    {
        $html = $this->formulario([
            'equipamentoNovaOs' => (object) ['id' => 5, 'marca' => 'LG', 'modelo' => 'INV', 'selo' => '<script>privado</script>'],
            'entradaEquipamentoNovaOs' => ['operacao' => str_repeat('a', 32)],
        ]);
        $dom = $this->dom($html);
        $this->assertSame('5', $dom->query('//input[@name="equipamento_id"]')->item(0)->getAttribute('value'));
        $this->assertCount(1, $dom->query('//fieldset[@data-nova-os-unidade-entrada and not(@disabled)]'));
        $this->assertSame('', $dom->query('//textarea[@name="equipamento_itens"]')->item(0)->textContent);
        $this->assertSame('', $dom->query('//textarea[@name="equipamento_estado"]')->item(0)->textContent);
        $this->assertStringNotContainsString('<script>privado</script>', $html);
        $this->assertStringContainsString('&lt;script&gt;', $html);
    }

    public function testErroDeFormularioPreservaCamposDigitadosEIdentificacao(): void
    {
        $html = $this->formulario([
            'equipamentoNovaOs' => (object) ['id' => 5, 'marca' => 'LG', 'modelo' => 'INV', 'selo' => 'T-5'],
            'entradaEquipamentoNovaOs' => ['operacao' => str_repeat('b', 32), 'itens_recebidos' => 'Placa e cabo', 'estado_entrada' => 'Conector avariado'],
            'erros' => ['dataFinal' => 'Confira a data'],
        ]);
        $this->assertStringContainsString('Placa e cabo', $html);
        $this->assertStringContainsString('Conector avariado', $html);
        $this->assertStringContainsString('Confira a data', $html);
    }

    public function testCadastroRapidoSoApareceComPermissaoEFormulariosNaoSaoAninhados(): void
    {
        $sem = $this->formulario();
        $this->assertStringNotContainsString('data-nova-os-cliente', $sem);
        $this->assertStringNotContainsString('id="cliente-rapido"', $sem);
        $com = $this->formulario(['pode' => ['ver_os' => false, 'cadastrar_cliente' => true, 'identificar_equipamento' => true]]);
        $dom = $this->dom($com);
        $this->assertCount(1, $dom->query('//button[@data-nova-os-cliente and @type="button"]'));
        $this->assertCount(1, $dom->query('//dialog[@id="cliente-rapido"]'));
        $this->assertCount(0, $dom->query('//form//form'));
        $this->assertCount(2, $dom->query('//form'));
    }

    public function testSemPermissaoDeIdentificarNaoMostraBusca(): void
    {
        $html = $this->formulario(['pode' => ['ver_os' => false, 'cadastrar_cliente' => false, 'identificar_equipamento' => false]]);
        $this->assertStringNotContainsString('data-nova-os-unidade-busca', $html);
    }

    public function testConsultaUsaClienteEscolhidoETermoSemCriarOs(): void
    {
        $c = $this->consulta(['vOs', 'aOs'], ['cliente_id' => '7', 'term' => ' SELO ']);
        $c->unidadesCliente();
        $this->assertSame([[7, 'SELO']], $c->equipamentos->consultas);
        $this->assertSame(200, $c->output->status);
        $this->assertSame(5, json_decode($c->output->conteudo, true)[0]['id']);
    }

    public function testClienteInvalidoNaoConsultaTodasAsUnidades(): void
    {
        foreach (['', '0', '-1', 'texto', ['7']] as $id) {
            $c = $this->consulta(['vOs', 'aOs'], ['cliente_id' => $id]);
            $c->unidadesCliente();
            $this->assertSame([], $c->equipamentos->consultas);
            $this->assertSame('[]', $c->output->conteudo);
        }
    }

    public function testConsultaExigePermissoesDeLerECriarOs(): void
    {
        foreach ([[], ['vOs'], ['aOs']] as $permissoes) {
            $c = $this->consulta($permissoes, ['cliente_id' => '7']);
            try {
                $c->unidadesCliente();
                $this->fail('Consulta deveria ser recusada.');
            } catch (RuntimeException $e) {
                $this->assertStringContainsString('permissão', $e->getMessage());
                $this->assertSame([], $c->equipamentos->consultas);
            }
        }
    }

    private function consulta(array $permissoes, array $query): object
    {
        return new class($permissoes, $query) extends Trifase_equipamentos {
            public object $input;
            public object $output;
            public object $equipamentos;
            public object $permission;
            public object $session;

            public function __construct(array $permissoes, array $query)
            {
                $this->permission = new class($permissoes) {
                    public function __construct(private array $permissoes)
                    {
                    }
                    public function checkPermission($ignorado, $permissao)
                    {
                        return in_array($permissao, $this->permissoes, true);
                    }
                };
                $this->session = new class() {
                    public function userdata($campo)
                    {
                        return null;
                    }
                };
                $this->input = new class($query) {
                    public function __construct(private array $query)
                    {
                    }
                    public function get($campo)
                    {
                        return $this->query[$campo] ?? null;
                    }
                    public function method($upper = false)
                    {
                        return $upper ? 'GET' : 'get';
                    }
                };
                $this->output = new class() {
                    public int $status = 0;
                    public string $conteudo = '';
                    public function set_status_header($status)
                    {
                        $this->status = $status;
                        return $this;
                    }
                    public function set_content_type(...$args)
                    {
                        return $this;
                    }
                    public function set_output($conteudo)
                    {
                        $this->conteudo = $conteudo;
                        return $this;
                    }
                };
                $this->equipamentos = new class() {
                    public array $consultas = [];
                    public function unidades($cliente, $termo)
                    {
                        $this->consultas[] = [$cliente, $termo];
                        return [(object) ['id' => 5, 'marca' => 'LG', 'modelo' => 'INV', 'selo' => 'T-5', 'serie' => '', 'imei' => '']];
                    }
                };
            }
        };
    }

    private function formulario(array $opcoes = []): string
    {
        $dados = array_replace([
            'os' => null, 'valores' => osValoresDoFormulario(null, null), 'erros' => [], 'formatados' => [],
            'pode' => ['ver_os' => false, 'cadastrar_cliente' => false, 'identificar_equipamento' => true],
        ], $opcoes);
        $v = new class($dados) {
            public object $security;
            public object $load;
            public function __construct(private array $dados)
            {
                $this->load = $this;
                $this->security = new class() {
                    public function get_csrf_token_name()
                    {
                        return 'MAPOS_CSRF';
                    }
                    public function get_csrf_hash()
                    {
                        return 'teste';
                    }
                };
            }
            public function view($nome): void
            {
                extract($this->dados);
                include APPPATH . 'views/' . $nome . '.php';
            }
        };
        ob_start();
        try {
            $v->view('os/formulario');
            return (string) ob_get_contents();
        } finally {
            ob_end_clean();
        }
    }

    private function dom(string $html): DOMXPath
    {
        $dom = new DOMDocument();
        @$dom->loadHTML('<?xml encoding="UTF-8">' . $html);
        return new DOMXPath($dom);
    }
}
