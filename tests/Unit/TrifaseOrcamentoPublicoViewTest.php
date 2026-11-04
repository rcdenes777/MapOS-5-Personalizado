<?php

require_once APPPATH . 'helpers/trifase_publico_helper.php';
require_once APPPATH . 'helpers/trifase_orcamento_helper.php';

final class TrifaseOrcamentoPublicoViewTest extends \PHPUnit\Framework\TestCase
{
    public function testOrcamentoRespostaEMidiaNaMesmaPaginaComEscape(): void
    {
        $html = $this->renderizar(true);
        foreach (['Defeito relatado', 'Diagnóstico', 'Condições de pagamento', 'Garantia do serviço', 'Peça publicada', 'Serviço publicado', 'Seu nome completo', 'Aprovar orçamento', 'Arquivos compartilhados', 'R$'] as $texto) {
            $this->assertStringContainsString($texto, $html);
        }
        $this->assertStringContainsString('&lt;script&gt;alert(1)&lt;/script&gt;', $html);
        $this->assertStringNotContainsString('<script>alert(1)</script>', $html);
        $this->assertStringContainsString('publico/video/token/2', $html);
        $this->assertStringContainsString('publico/imagem/token/1', $html);
        $this->assertStringContainsString('orcamento_publico/responder/token', $html);
    }

    public function testSemPublicacaoNaoMostraItensValoresNemFormularioDeDecisao(): void
    {
        $html = $this->renderizar(false);
        $this->assertStringNotContainsString('Peça publicada', $html);
        $this->assertStringNotContainsString('R$', $html);
        $this->assertStringNotContainsString('orcamento-nome', $html);
        $this->assertStringContainsString('Arquivos compartilhados', $html);
    }

    private function renderizar(bool $publicado): string
    {
        $v = new class() {
            public object $load;
            public object $security;
            private array $dados = [];

            public function __construct()
            {
                $this->load = $this;
                $this->security = new class() {
                    public function get_csrf_token_name(): string
                    {
                        return 'csrf';
                    }
                    public function get_csrf_hash(): string
                    {
                        return 'teste';
                    }
                };
            }

            public function view(string $nome, array $dados = []): void
            {
                $anteriores = $this->dados;
                $this->dados = array_merge($this->dados, $dados);
                extract($this->dados);
                include APPPATH . 'views/' . $nome . '.php';
                $this->dados = $anteriores;
            }
        };
        ob_start();
        try {
            $v->view('trifase/publico', [
                'os' => ['id' => 1, 'status' => 'Aberto', 'inicio' => '2026-11-04', 'previsao' => '', 'equipamento' => 'Placa'],
                'basePublica' => '/', 'noncePublico' => 'nonce',
                'anexos' => [
                    ['nome' => 'Foto', 'url' => '/publico/anexo/token/1', 'miniatura' => '/publico/miniatura/token/1', 'imagem' => '/publico/imagem/token/1', 'video' => null, 'extensao' => 'PNG'],
                    ['nome' => 'Vídeo', 'url' => '/publico/anexo/token/2', 'miniatura' => null, 'imagem' => null, 'video' => '/publico/video/token/2', 'extensao' => 'MP4'],
                ],
                'versaoOrcamento' => $publicado ? (object) ['id' => 1, 'numero' => 2] : null,
                'retratoOrcamento' => ['os' => 1, 'apresentacao' => ['diagnostico' => '<script>alert(1)</script>'], 'itens' => [
                    ['nome' => 'Peça publicada', 'tipo' => 'peca', 'quantidade' => '1', 'unitario_c' => 1000, 'desconto_c' => 0, 'total_c' => 1000],
                    ['nome' => 'Serviço publicado', 'tipo' => 'servico', 'quantidade' => '1', 'unitario_c' => 2000, 'desconto_c' => 0, 'total_c' => 2000],
                ], 'pecas_c' => 1000, 'servicos_c' => 2000, 'desconto_c' => 0, 'total_c' => 3000],
                'decisaoOrcamento' => null, 'erroOrcamento' => null, 'responderOrcamentoUrl' => '/orcamento_publico/responder/token',
            ]);
            return ob_get_contents();
        } finally {
            ob_end_clean();
        }
    }
}
