<?php

require_once APPPATH . 'helpers/trifase_orcamento_helper.php';

final class TrifaseOrcamentoRespostaViewTest extends \PHPUnit\Framework\TestCase
{
    public function testFormularioInternoExigeCanalDataENaoAtribuiAssinaturaAoCliente(): void
    {
        $html = $this->renderizar('trifase/orcamento-resumo');
        foreach (['name="canal"', 'Telefone', 'WhatsApp', 'Presencial', 'name="comunicado_em"', 'type="datetime-local"', 'name="observacao"', 'name="confirmar"', 'name="versao"', 'name="operacao"'] as $campo) {
            $this->assertStringContainsString($campo, $html);
        }
        $this->assertStringContainsString('Data e hora informadas da comunicação', $html);
        $this->assertStringContainsString('registrada pela equipe', $html);
        $this->assertStringNotContainsString('assinatura eletrônica', $html);
    }

    public function testHistoricoInternoDistingueComunicacaoRegistroEOperador(): void
    {
        $decisao = $this->decisao();
        $html = $this->renderizar('trifase/orcamento-resumo', ['pilotoOrcamentoDecisao' => $decisao]);
        foreach (['por telefone', 'Comunicação informada', '19/11/2026 14:30', '19/11/2026 14:42', 'Operador #7', 'NOTA_PRIVADA'] as $texto) {
            $this->assertStringContainsString($texto, $html);
        }
        $this->assertStringContainsString('&lt;script&gt;Pessoa&lt;/script&gt;', $html);
        $this->assertStringNotContainsString('<script>Pessoa</script>', $html);
        $this->assertStringNotContainsString('Salvar resposta', $html);
    }

    public function testPublicoDistingueOrigemSemExporOperadorOuObservacaoPrivada(): void
    {
        $html = $this->renderizar('trifase/orcamento-conteudo', ['decisaoOrcamento' => $this->decisao()]);
        $this->assertStringContainsString('Resposta registrada pela equipe por telefone', $html);
        $this->assertStringContainsString('Comunicação informada pela equipe', $html);
        $this->assertStringNotContainsString('Operador #7', $html);
        $this->assertStringNotContainsString('NOTA_PRIVADA', $html);
        $this->assertStringNotContainsString('Registrar minha resposta', $html);
    }

    public function testLegadoNaoInventaCanalEPublicoIdentificaRespostaPeloLink(): void
    {
        $legado = (object) ['tipo' => 'aprovar', 'nome' => 'Pessoa QA', 'usuario_id' => 7, 'criado_em' => '2026-11-19 14:42:00'];
        $html = $this->renderizar('trifase/orcamento-conteudo', ['decisaoOrcamento' => $legado]);
        $this->assertStringContainsString('Resposta registrada pela equipe', $html);
        $this->assertStringNotContainsString('por telefone', $html);
        $legado->usuario_id = null;
        $html = $this->renderizar('trifase/orcamento-conteudo', ['decisaoOrcamento' => $legado]);
        $this->assertStringContainsString('Resposta enviada pelo link', $html);
    }

    private function decisao(): object
    {
        return (object) ['tipo' => 'aprovar', 'nome' => '<script>Pessoa</script>', 'usuario_id' => 7,
            'canal' => 'telefone', 'comunicado_em' => '2026-11-19 14:30:00', 'criado_em' => '2026-11-19 14:42:00', 'observacao' => 'NOTA_PRIVADA'];
    }

    private function renderizar(string $view, array $dados = []): string
    {
        $render = new class() {
            public object $security;
            public object $load;
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
                        return 'qa';
                    }
                };
            }
            public function view(string $nome, array $dados = []): void
            {
                $antes = $this->dados;
                $this->dados = array_merge($antes, $dados);
                extract($this->dados);
                include APPPATH . 'views/' . $nome . '.php';
                $this->dados = $antes;
            }
        };
        $dados += ['os' => (object) ['idOs' => 1], 'pilotoOrcamento' => (object) ['id' => 1, 'numero' => 2],
            'pilotoOrcamentoValido' => true, 'pilotoOrcamentoDecisao' => null, 'pilotoPodeRegistrarResposta' => true,
            'versaoOrcamento' => (object) ['id' => 1, 'numero' => 2], 'retratoOrcamento' => ['os' => 1, 'itens' => [], 'pecas_c' => 0, 'servicos_c' => 0, 'desconto_c' => 0, 'total_c' => 0],
            'decisaoOrcamento' => null, 'erroOrcamento' => null, 'responderOrcamentoUrl' => '/responder'];
        ob_start();
        try {
            $render->view($view, $dados);
            return (string) ob_get_contents();
        } finally {
            ob_end_clean();
        }
    }
}
