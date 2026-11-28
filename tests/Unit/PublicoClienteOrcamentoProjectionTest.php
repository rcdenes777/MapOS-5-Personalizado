<?php

require_once APPPATH . 'controllers/Publico_cliente.php';

final class PublicoClienteOrcamentoTestavel extends Publico_cliente
{
    public $db;

    public $load;

    public $orcamento_cliente_publico;

    public function __construct()
    {
    }
}

/**
 * Projeção do orçamento no portal do cliente: somente o retrato publicado,
 * em centavos, sem motivo interno e sem transformar histórico incompleto em
 * zero. Executa o método real do controller com um banco mínimo.
 */
final class PublicoClienteOrcamentoProjectionTest extends \PHPUnit\Framework\TestCase
{
    private function projection(): array
    {
        return ['pecas_c' => 3000, 'servicos_c' => 4000, 'desconto_c' => 1000, 'total_c' => 6000, 'itens' => [], 'motivo' => 'privado'];
    }

    private function controller(array $snapshot): object
    {
        $controller = new PublicoClienteOrcamentoTestavel();
        $controller->db = new class() {
            public function table_exists($name)
            {
                return true;
            }
        };
        $controller->load = new class() {
            public function model($name, $alias)
            {
            }
        };
        $controller->orcamento_cliente_publico = new class($snapshot) {
            public function __construct(public array $snapshot)
            {
            }

            public function publicadoParaCliente($os, $customer)
            {
                return $os === 1 && $customer === 3 ? (object) ['id' => 9, 'conteudo' => json_encode($this->snapshot)] : null;
            }

            public function decisao($id)
            {
                return null;
            }
        };
        $_ENV['TRIFASE_ORCAMENTOS_ENABLED'] = 'true';

        return $controller;
    }

    private function project(array $snapshot, int $customer = 3): ?array
    {
        $metodo = new ReflectionMethod(Publico_cliente::class, 'orcamentoCliente');

        return $metodo->invoke($this->controller($snapshot), 1, $customer);
    }

    public function testProjetaSessentaComDescontoDeDezESemMotivoInterno(): void
    {
        $resultado = $this->project($this->projection());
        $this->assertSame(7000, $resultado['subtotal_c']);
        $this->assertSame(1000, $resultado['desconto_c']);
        $this->assertSame(6000, $resultado['total_c']);
        $this->assertArrayNotHasKey('motivo', $resultado);
        $this->assertNull($this->project($this->projection(), 4), 'Cliente de outra OS não recebe o orçamento.');
    }

    public function testHistoricoIncompletoNaoViraZero(): void
    {
        $snapshot = $this->projection();
        unset($snapshot['servicos_c']);
        $resultado = $this->project($snapshot);
        $this->assertNull($resultado['subtotal_c']);
        $this->assertNull($resultado['desconto_c']);
        $this->assertNull($resultado['total_c']);
    }

    public function testDescontoOuTotalImpossivelFicaIndisponivel(): void
    {
        $snapshot = $this->projection();
        $snapshot['desconto_c'] = 8000;
        $this->assertNull($this->project($snapshot)['subtotal_c']);

        $snapshot = $this->projection();
        $snapshot['total_c'] = 6500;
        $this->assertNull($this->project($snapshot)['subtotal_c']);
    }

    public function testDiferencaNativaDeUmCentavoPermaneceVisivel(): void
    {
        $snapshot = ['pecas_c' => 1, 'servicos_c' => 1, 'desconto_c' => 0, 'total_c' => 1, 'itens' => []];
        $resultado = $this->project($snapshot);
        $this->assertSame(2, $resultado['subtotal_c']);
        $this->assertSame(1, $resultado['total_c']);
    }
}
