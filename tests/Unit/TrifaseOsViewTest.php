<?php

require_once APPPATH . 'helpers/trifase_publico_helper.php';
require_once APPPATH . 'helpers/trifase_financeiro_helper.php';

final class TrifaseOsViewTest extends \PHPUnit\Framework\TestCase
{
    public function testRespostaNoAndamentoSemExporFinanceiroAoTecnico(): void
    {
        $html = $this->renderizar(false, false, false, ['tipo' => 'aprovar', 'criado_em' => '2026-11-04 14:27:00', 'atual' => true]);
        $this->assertStringContainsString('Aprovado pelo cliente', $html);
        $this->assertStringContainsString('04/11/2026 às 14:27', $html);
        $this->assertStringNotContainsString('R$', $html);
        $this->assertStringNotContainsString('Resposta de uma versão indisponível', $html);
        $recusa = $this->renderizar(false, false, false, ['tipo' => 'recusar', 'criado_em' => '2026-11-04 14:28:00', 'atual' => false]);
        $this->assertStringContainsString('Recusado pelo cliente', $recusa);
        $this->assertStringContainsString('Resposta de uma versão indisponível', $recusa);
    }

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

    public function testFormulariosCompartilhadosTemIdsUnicosEEnviamAMesmaOs(): void
    {
        $html = $this->renderizar(true, false, true);
        $this->assertStringContainsString('id="piloto-produto-nome"', $html);
        $this->assertStringContainsString('id="piloto-servico-nome"', $html);
        $this->assertStringContainsString('name="idOs" value="1"', $html);
        $this->assertStringContainsString('os/adicionarProduto', $html);
        $this->assertStringContainsString('os/adicionarServico', $html);
        preg_match_all('/\sid="([^"]+)"/', $html, $ids);
        $this->assertSame($ids[1], array_values(array_unique($ids[1])), 'Dois formulários não podem compartilhar IDs de campos.');
    }

    public function testSemFinanceiroNaoExibeFormularioComPrecosMesmoSeEditavel(): void
    {
        $html = $this->renderizar(false, false, true);
        $this->assertStringContainsString('os/adicionarProduto', $html);
        $this->assertStringContainsString('os/adicionarServico', $html);
        $this->assertStringNotContainsString('name="preco"', $html);
        $this->assertStringNotContainsString('name="descontoItem"', $html);
        $this->assertStringNotContainsString('R$', $html);
    }

    public function testOsProtegidaNaoOfereceMutacaoDeItens(): void
    {
        $html = $this->renderizar(true, true);
        $this->assertStringNotContainsString('os/adicionarProduto', $html);
        $this->assertStringNotContainsString('data-modal-abrir="excluir-produto"', $html);
    }

    private function renderizar(bool $financeiro, bool $formalizada = true, bool $editavel = false, ?array $resposta = null): string
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
                'pode' => ['editar' => $editavel, 'editar_tecnico' => false, 'ver_cliente' => false, 'ver_financeiro' => $financeiro],
                'produtos' => [(object) ['idProdutos_os' => 1, 'descricao' => 'Fusível', 'quantidade' => 1, 'preco' => 500, 'subTotal' => 500]],
                'servicos' => [], 'anexos' => [], 'garantia_ate' => null,
                'anotacoes' => [], 'historico' => [], 'historico_disponivel' => true,
                'totais' => ['produtos' => 500, 'servicos' => 0, 'desconto' => 0, 'total' => 500],
                'pilotoFinanceiro' => $formalizada ? ['total_c' => 50000, 'recebido_c' => 20000, 'saldo_c' => 30000, 'situacao' => 'Parcialmente pago'] : null,
                'pilotoLink' => null, 'pilotoRespostaCliente' => $resposta,
                'controle_estoque' => true,
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
