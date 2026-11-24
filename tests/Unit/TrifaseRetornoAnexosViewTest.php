<?php

if (! function_exists('site_url')) {
    function site_url($uri = '')
    {
        return 'http://mapos.test/index.php/' . ltrim((string) $uri, '/');
    }
}

final class TrifaseRetornoAnexosViewTest extends \PHPUnit\Framework\TestCase
{
    private function renderizar(array $anexosOrigem): string
    {
        $this->assertFileExists(APPPATH . 'views/trifase/retorno-anexos-origem.php');
        ob_start();
        try {
            include APPPATH . 'views/trifase/retorno-anexos-origem.php';
            return (string) ob_get_contents();
        } finally {
            ob_end_clean();
        }
    }

    public function testHistoricoEscapaTextoEUsaSomenteRotasPrivadas(): void
    {
        $html = $this->renderizar(['origem_id' => 101, 'anexos' => [
            (object) ['idAnexos' => 201, 'nome' => '<img src=x onerror=alert(1)>.jpg', 'imagem' => true, 'tem_miniatura' => true, 'data_origem' => '2026-01-02', 'url' => 'javascript:alert(1)', 'path' => '/storage/secreto'],
            (object) ['idAnexos' => 202, 'nome' => 'Laudo.pdf', 'imagem' => false, 'tem_miniatura' => false, 'data_origem' => '<script>alert(2)</script>'],
        ]]);
        $this->assertStringContainsString('Imagens da OS de origem — histórico', $html);
        $this->assertStringContainsString('não são novas imagens do retorno', $html);
        $this->assertStringContainsString('os/anexo/201/thumb', $html);
        $this->assertStringContainsString('os/downloadanexo/201', $html);
        $this->assertStringContainsString('os/downloadanexo/202', $html);
        $this->assertStringContainsString('os/visualizar/101', $html);
        $this->assertStringContainsString('Entrada da OS de origem: 2026-01-02', $html);
        $this->assertStringContainsString('&lt;img', $html);
        $this->assertStringContainsString('&lt;script&gt;', $html);
        $this->assertStringNotContainsString('<script', $html);
        $this->assertStringNotContainsString('javascript:', $html);
        $this->assertStringNotContainsString('/storage', $html);
        $this->assertStringNotContainsString('202/thumb', $html);
        $this->assertStringNotContainsString('publico', $html);
        $this->assertStringNotContainsString('<form', $html);
    }

    public function testSemAnexosNaoRenderizaBloco(): void
    {
        $this->assertSame('', trim($this->renderizar([])));
        $this->assertSame('', trim($this->renderizar(['origem_id' => 101, 'anexos' => []])));
    }

    public function testOrigemMaliciosaNaoViraHref(): void
    {
        $this->assertSame('', trim($this->renderizar(['origem_id' => 'javascript:alert(1)', 'anexos' => [(object) ['idAnexos' => 201]]])));
    }
}
