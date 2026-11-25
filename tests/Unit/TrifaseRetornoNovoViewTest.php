<?php

if (! function_exists('site_url')) {
    function site_url(string $uri = ''): string
    {
        return 'http://mapos.test/index.php/' . ltrim($uri, '/');
    }
}

if (! function_exists('base_url')) {
    function base_url(string $uri = ''): string
    {
        return 'http://mapos.test/' . ltrim($uri, '/');
    }
}

final class TrifaseRetornoNovoViewTest extends \PHPUnit\Framework\TestCase
{
    private function renderizar(): string
    {
        $visao = new class() {
            public object $security;

            public function __construct()
            {
                $this->security = new class() {
                    public function get_csrf_token_name(): string
                    {
                        return 'MAPOS_CSRF';
                    }

                    public function get_csrf_hash(): string
                    {
                        return 'teste';
                    }
                };
            }

            public function render(array $dados): string
            {
                extract($dados);
                $nivel = ob_get_level();
                ob_start();
                try {
                    include APPPATH . 'views/trifase/retorno-novo.php';
                    return (string) ob_get_clean();
                } finally {
                    while (ob_get_level() > $nivel) {
                        ob_end_clean();
                    }
                }
            }
        };

        return $visao->render([
            'referenciaRetorno' => [
                'anterior' => (object) ['idOs' => 1],
                'origem' => (object) ['idOs' => 1],
                'equipamento' => (object) ['marca' => 'LG', 'modelo' => 'INV-12', 'selo' => ''],
                'conclusao' => '2026-11-20',
                'prazo' => 90,
                'vencimento' => '2027-02-18',
            ],
            'valoresRetorno' => ['defeito' => '', 'itens_recebidos' => '', 'estado_entrada' => ''],
            'erroRetorno' => null,
            'chaveRetorno' => str_repeat('a', 32),
        ]);
    }

    public function testItensEEstadoDoRetornoSaoOpcionaisENaoExigemTextoArtificial(): void
    {
        $html = $this->renderizar();
        foreach (['itens_recebidos', 'estado_entrada'] as $campo) {
            preg_match('/<textarea[^>]*name="' . $campo . '"[^>]*>/', $html, $tag);
            $this->assertNotEmpty($tag);
            $this->assertStringNotContainsString('required', $tag[0]);
        }
        preg_match('/<textarea[^>]*name="defeito"[^>]*>/', $html, $defeito);
        $this->assertStringContainsString('required', $defeito[0]);
        $this->assertStringContainsString('Opcional.', $html);
        $this->assertSame(2, substr_count($html, 'Opcional.'));
        $this->assertStringNotContainsString('Sem acessórios', $html);
        $this->assertStringNotContainsString('Bom estado', $html);
    }
}
