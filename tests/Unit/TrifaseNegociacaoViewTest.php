<?php

if (! function_exists('site_url')) {
    function site_url(string $path = ''): string
    {
        return '/index.php/' . ltrim($path, '/');
    }
}

if (! function_exists('base_url')) {
    function base_url(string $path = ''): string
    {
        return '/' . ltrim($path, '/');
    }
}

final class TrifaseNegociacaoViewTest extends \PHPUnit\Framework\TestCase
{
    private function painel(array $extras = []): string
    {
        $render = new class {
            public object $security;
            public object $load;
            private array $dados = [];
            public function __construct()
            {
                $this->load = $this;
                $this->security = new class {
                    public function get_csrf_token_name(): string
                    {
                        return 'csrf';
                    }
                    public function get_csrf_hash(): string
                    {
                        return 'token';
                    }
                };
            }
            public function view(string $name, array $dados = []): void
            {
                $antes = $this->dados;
                $this->dados = array_merge($antes, $dados);
                extract($this->dados);
                include APPPATH . 'views/' . $name . '.php';
                $this->dados = $antes;
            }
        };
        $retrato = ['os' => 1, 'itens' => [], 'pecas_c' => 0, 'servicos_c' => 7000, 'desconto_c' => 0, 'total_c' => 7000];
        $dados = array_replace(['ordemOrcamento' => (object) ['idOs' => 1, 'status' => 'Em Andamento'],
            'orcamentoAtual' => (object) ['id' => 2, 'numero' => 1, 'ativo' => 1, 'conteudo_hash' => str_repeat('a', 64)],
            'podePublicarOrcamento' => true, 'hashOrcamento' => str_repeat('a', 64), 'versoesOrcamento' => [], 'eventosOrcamento' => [],
            'retratoOrcamento' => $retrato, 'negociacaoDisponivel' => true, 'orcamentoVigente' => true], $extras);
        ob_start();
        try {
            $render->view('trifase/orcamento-painel', $dados);
            return (string) ob_get_contents();
        } finally {
            ob_end_clean();
        }
    }

    public function testHistoricoInternoMostraAuditoriaDeNegociacao(): void
    {
        $v = (object) ['id' => 9, 'numero' => 2, 'criado_em' => '2026-11-28 10:00:00', 'conteudo' => json_encode(['itens' => [], 'pecas_c' => 0, 'servicos_c' => 7000, 'desconto_c' => 1000, 'total_c' => 6000])];
        $evento = (object) ['versao_id' => 9, 'tipo' => 'publicar', 'criado_em' => '2026-11-28 10:00:00', 'usuario_id' => 7,
            'negociacao' => json_encode(['motivo' => 'Concessão interna', 'versao_anterior' => 1, 'tipo' => 'real', 'solicitado' => '10', 'anterior_c' => 7000, 'novo_c' => 6000])];
        $html = $this->painel(['versoesOrcamento' => [$v], 'eventosOrcamento' => [$evento]]);
        $this->assertStringContainsString('Concessão interna', $html);
        $this->assertStringContainsString('70,00', $html);
        $this->assertStringContainsString('60,00', $html);
        $this->assertStringContainsString('Operador #7', $html);
    }

    public function testPreviaMostraTotaisEExigeConfirmacaoPreservandoDados(): void
    {
        $motivo = "Ajuste\n<privado>";
        $previa = ['versao' => 2, 'hash_anterior' => str_repeat('a', 64), 'hash_proposto' => str_repeat('b', 64),
            'operacao' => str_repeat('c', 32), 'tipo' => 'real', 'valor' => '10,00', 'motivo' => $motivo,
            'retrato' => ['pecas_c' => 0, 'servicos_c' => 7000, 'desconto_c' => 1000, 'total_c' => 6000]];
        $html = $this->painel(['previaNegociacao' => $previa, 'linkPublicoAtivo' => 'https://example.test/link',
            'apresentacaoPublicada' => ['pagamento' => 'À vista']]);
        foreach (['trifase_orcamentos/negociar_desconto/1', '60,00', '10,00', 'À vista', 'https://example.test/link',
            'name="confirmar"', 'Aplicar desconto e publicar nova versão', base64_encode($motivo), base64_encode('10,00'), str_repeat('b', 64)] as $trecho) {
            $this->assertStringContainsString($trecho, $html);
        }
        $this->assertStringNotContainsString('<privado>', $html);
        $this->assertStringContainsString('&lt;privado&gt;', $html);
    }

    public function testSemPermissaoOuAposEntregaNaoOfereceNegociacao(): void
    {
        foreach ([['podePublicarOrcamento' => false], ['orcamentoEntregue' => true], ['negociacaoDisponivel' => false], ['orcamentoVigente' => false]] as $dados) {
            $this->assertStringNotContainsString('trifase_orcamentos/prever_desconto/1', $this->painel($dados));
        }
    }

    public function testAvisoDeIndisponibilidadeExpoeOMotivoEspecifico(): void
    {
        $html = $this->painel(['negociacaoDisponivel' => false, 'negociacaoMotivo' => 'O módulo financeiro do cliente está desativado.']);
        $this->assertStringContainsString('O módulo financeiro do cliente está desativado.', $html);
        $this->assertStringNotContainsString('A negociação do orçamento exige os módulos financeiro e de entregas ativos', $html);
    }

    public function testFormularioSolicitaPreviaComMotivoPrivadoEValoresAtuais(): void
    {
        $html = $this->painel();
        foreach (['trifase_orcamentos/prever_desconto/1', 'name="tipo"', 'value="real"', 'value="porcento"', 'name="valor"', 'name="motivo"', '70,00', 'name="csrf"'] as $trecho) {
            $this->assertStringContainsString($trecho, $html);
        }
        $this->assertStringNotContainsString('Aplicar desconto e publicar nova versão', $html);
    }
}
