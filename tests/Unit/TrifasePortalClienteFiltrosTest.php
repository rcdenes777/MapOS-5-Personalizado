<?php

if (is_file(APPPATH . 'helpers/trifase_portal_cliente_helper.php')) {
    require_once APPPATH . 'helpers/trifase_portal_cliente_helper.php';
}

final class TrifasePortalClienteFiltrosTest extends MaposTestCase
{
    public function testFiltrosDistinguemPagamentoEntregaESemObrigacao(): void
    {
        $this->assertTrue(function_exists('trifasePortalFiltrar'));
        $os = [
            (object) ['idOs' => 1, 'entregue' => null, 'financeiro' => ['situacao' => 'Em aberto', 'saldo_c' => 100]],
            (object) ['idOs' => 2, 'entregue' => 22, 'financeiro' => ['situacao' => 'Quitada', 'saldo_c' => 0]],
            (object) ['idOs' => 3, 'entregue' => null, 'financeiro' => null],
        ];
        $ids = static fn ($result) => array_map(static fn ($o) => $o->idOs, $result);
        $this->assertSame([1], $ids(trifasePortalFiltrar($os, 'pendente')));
        $this->assertSame([2], $ids(trifasePortalFiltrar($os, 'pago')));
        $this->assertSame([2], $ids(trifasePortalFiltrar($os, 'entregue')));
        $this->assertSame([1, 3], $ids(trifasePortalFiltrar($os, 'nao-entregue')));
        $this->assertSame([1, 2, 3], $ids(trifasePortalFiltrar($os, 'invalido')));
    }
}
