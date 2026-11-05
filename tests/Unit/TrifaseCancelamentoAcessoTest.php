<?php

require_once APPPATH . 'controllers/Trifase_cancelamentos.php';

final class TrifaseCancelamentoAcessoTest extends \PHPUnit\Framework\TestCase
{
    public function testTelaTecnicaMostraPedidoSemDinheiroNemFormularioFinanceiro(): void
    {
        $v = new class() {
            public object $security;
            public function __construct()
            {
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
            public function renderizar(array $dados): string
            {
                extract($dados);
                ob_start();
                try {
                    include APPPATH . 'views/trifase/cancelamento.php';
                    return ob_get_contents();
                } finally {
                    ob_end_clean();
                }
            }
        };
        $dados = [
            'osCancelamento' => (object) ['idOs' => 1, 'status' => 'Aprovado'],
            'pedidoCancelamento' => (object) ['id' => 1, 'tipo' => 'solicitar', 'solicitante' => '<script>QA</script>', 'motivo' => '<b>Motivo</b>', 'criado_em' => '2026-11-04 12:00:00'],
            'historicoCancelamento' => [], 'pecasCancelamento' => [['nome' => 'Peça', 'quantidade' => 1]], 'servicosCancelamento' => [],
            'financeiroCancelamento' => null, 'podeConfirmarCancelamento' => false, 'podePedirCancelamento' => true,
            'bloqueiosCancelamento' => [], 'erroCancelamento' => null, 'hashCancelamento' => 'hash', 'hashTecnicoCancelamento' => 'tecnico', 'tecnicaCancelamento' => null,
            'clienteCancelamento' => 'Cliente da OS',
            'valoresCancelamento' => ['origem' => 'cliente', 'motivo' => '', 'conferencia' => ''],
        ];
        $html = $v->renderizar($dados);
        $this->assertStringContainsString('Pedido pendente', $html);
        $this->assertStringContainsString('&lt;script&gt;QA&lt;/script&gt;', $html);
        $this->assertStringNotContainsString('<script>QA</script>', $html);
        $this->assertStringNotContainsString('R$', $html);
        $this->assertStringNotContainsString('trifase_cancelamentos/confirmar/', $html);
        $this->assertStringNotContainsString('trifase_financeiro/visualizar/', $html);
        $this->assertStringContainsString('trifase_cancelamentos/retirar/', $html);
        $this->assertStringContainsString('name="pecas_nao_utilizadas"', $html);
        $this->assertStringContainsString('name="servicos_nao_executados"', $html);
        $this->assertStringNotContainsString('name="financeiro_conferido"', $html);
        $this->assertStringNotContainsString('trifase_cadastros/cliente/', $html);
        $htmlFinanceiro = $v->renderizar(array_replace($dados, ['osCancelamento' => (object) ['idOs' => 1, 'status' => 'Aprovado', 'clientes_id' => 9], 'podeConfirmarCancelamento' => true, 'podeClassificarClienteCancelamento' => true]));
        $this->assertStringContainsString('trifase_cadastros/cliente/9', $htmlFinanceiro);
        foreach ([[false, false], [true, false], [false, true], [true, true]] as [$semPecas, $tecnica]) {
            $d = array_replace($dados, ['podeConfirmarCancelamento' => true, 'pecasCancelamento' => $semPecas ? [] : $dados['pecasCancelamento'], 'tecnicaCancelamento' => $tecnica ? ['usuario_id' => 2, 'criado_em' => '2026-11-04 12:01:00'] : null]);
            $dom = new DOMDocument();
            @$dom->loadHTML($v->renderizar($d));
            $xpath = new DOMXPath($dom);
            $this->assertSame(($semPecas && $tecnica) ? 0 : 1, $xpath->query('//input[@name="financeiro_conferido" and @disabled]')->length);
        }

    }

    public function testTecnicoNaoPodeConfirmarMesmoComPostDireto(): void
    {
        $c = new class() extends Trifase_cancelamentos {
            public object $permission;
            public object $session;
            public function __construct()
            {
                $this->permission = new class() {
                    public function checkPermission($grupo, $p): bool
                    {
                        return in_array($p, ['vOs', 'eOs'], true);
                    }
                };
                $this->session = new class() {
                    public function userdata($p): int
                    {
                        return 2;
                    }
                };
            }
        };
        try {
            $c->confirmar(1);
            $this->fail('Técnico confirmou');
        } catch (RuntimeException $e) {
            $this->assertStringContainsString('permissão', $e->getMessage());
        }
    }
}
