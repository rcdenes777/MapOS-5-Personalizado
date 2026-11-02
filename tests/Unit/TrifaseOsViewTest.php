<?php

require_once APPPATH . 'helpers/trifase_publico_helper.php';
require_once APPPATH . 'helpers/trifase_financeiro_helper.php';

final class TrifaseOsViewTest extends \PHPUnit\Framework\TestCase
{
    public function testPerfilSemFinanceiroNaoRecebeValoresMesmoComResumoFornecido(): void
    {
        $html = $this->renderizar(false);
        $this->assertStringNotContainsString('R$', $html);
        $this->assertStringNotContainsString('piloto-financeiro', $html);
        $this->assertStringNotContainsString('Registrar recebimento', $html);
        $this->assertStringContainsString('Fusível', $html);
        $this->assertStringContainsString('Defeito relatado', $html);
    }

    public function testResumoUsaRecebidoESaldoSemInferirQuitacaoPeloStatus(): void
    {
        $html = $this->renderizar(true);
        $this->assertStringContainsString('R$ 500,00', $html);
        $this->assertStringContainsString('R$ 200,00', $html);
        $this->assertStringContainsString('R$ 300,00', $html);
        $this->assertStringContainsString('Parcialmente pago', $html);
        $this->assertStringContainsString('Finalizado', $html);
    }

    public function testSemObrigacaoNaoInventaSaldoETextoDoClienteEEscapado(): void
    {
        $html = $this->renderizar(true, false);
        $this->assertStringContainsString('Cobrança ainda não formalizada', $html);
        $this->assertStringNotContainsString('Saldo a receber', $html);
        $this->assertStringContainsString('&lt;script&gt;', $html);
        $this->assertStringNotContainsString('<script>', $html);
        $this->assertStringContainsString('Não informado', $html);
    }

    private function renderizar(bool $financeiro, bool $formalizada = true): string
    {
        $env = $_ENV;
        $_ENV['TRIFASE_FINANCEIRO_ENABLED'] = 'false';
        $_ENV['TRIFASE_PUBLICO_ENABLED'] = 'false';
        $v = new class($financeiro) {
            public object $load;
            public object $permission;
            public object $session;
            private array $dados = [];

            public function __construct(bool $financeiro)
            {
                $this->load = $this;
                $this->permission = new class($financeiro) {
                    public function __construct(private bool $financeiro)
                    {
                    }
                    public function checkPermission($perfil, $permissao): bool
                    {
                        return $permissao === 'vLancamento' && $this->financeiro;
                    }
                };
                $this->session = new class() {
                    public function userdata($chave): int
                    {
                        return 1;
                    }
                };
            }

            public function view(string $nome, array $dados = []): void
            {
                $this->dados = array_merge($this->dados, $dados);
                extract($this->dados);
                include APPPATH . 'views/' . $nome . '.php';
            }
        };
        $nivel = ob_get_level();
        ob_start();
        try {
            $v->view('trifase/os', [
                'os' => (object) ['idOs' => 1, 'clientes_id' => 1, 'nomeCliente' => '<script>teste</script>', 'nome' => 'Técnico', 'dataInicial' => '2026-11-02', 'dataFinal' => '2026-11-06', 'descricaoProduto' => 'Placa inverter', 'defeito' => 'Não liga', 'observacoes' => '', 'laudoTecnico' => '', 'status' => 'Finalizado', 'faturado' => (int) $formalizada, 'celular_cliente' => '', 'telefone_cliente' => '', 'garantia' => 90],
                'pode' => ['editar' => false, 'editar_tecnico' => false, 'ver_cliente' => false],
                'produtos' => [(object) ['descricao' => 'Fusível', 'quantidade' => 1, 'preco' => 500, 'subTotal' => 500]],
                'servicos' => [], 'anexos' => [], 'garantia_ate' => null,
                'totais' => ['produtos' => 500, 'servicos' => 0, 'desconto' => 0, 'total' => 500],
                'pilotoFinanceiro' => $formalizada ? ['total_c' => 50000, 'recebido_c' => 20000, 'saldo_c' => 30000, 'situacao' => 'Parcialmente pago'] : null,
                'pilotoLink' => null,
            ]);
            return (string) ob_get_clean();
        } finally {
            while (ob_get_level() > $nivel) {
                ob_end_clean();
            }
            $_ENV = $env;
        }
    }
}
