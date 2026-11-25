<?php

require_once APPPATH . 'helpers/escape_helper.php';
require_once APPPATH . 'helpers/status_helper.php';

final class TrifaseImpressaoTest extends \PHPUnit\Framework\TestCase
{
    private function render(string $view, array $dados): string
    {
        $nivel = ob_get_level();
        ob_start();
        try {
            extract($dados);
            include APPPATH . 'views/' . $view . '.php';
            return (string) ob_get_clean();
        } finally {
            while (ob_get_level() > $nivel) {
                ob_end_clean();
            }
        }
    }

    private function entrega(): object
    {
        return (object) ['entregue_em' => '2026-11-25 00:00:00'];
    }

    private function financeiro(): array
    {
        return ['total_c' => 50000, 'pago_c' => 20000, 'saldo_c' => 30000,
            'situacao' => 'Parcialmente paga', 'situacao_variant' => 'warning'];
    }

    public function testA4MostraEntregaEValoresDoClienteSemCustos(): void
    {
        $html = $this->render('os/partes/impressao-entrega-financeiro', [
            'mostrarEntrega' => true,
            'entregaImpressao' => $this->entrega(),
            'financeiroImpressao' => $this->financeiro(),
        ]);
        foreach (['ENTREGA', '25/11/2026', 'SITUAÇÃO FINANCEIRA', 'TOTAL COBRADO', 'PAGO', 'SALDO A PAGAR',
            'R$ 500,00', 'R$ 200,00', 'R$ 300,00', 'Parcialmente paga'] as $esperado) {
            $this->assertStringContainsString($esperado, $html);
        }
        $this->assertStringNotContainsString('custo', mb_strtolower($html));
        $this->assertStringNotContainsString('margem', mb_strtolower($html));
    }

    public function testA4SemEntregaInformaNaoRegistradaESemFinanceiroOmiteBloco(): void
    {
        $html = $this->render('os/partes/impressao-entrega-financeiro', [
            'mostrarEntrega' => true,
            'entregaImpressao' => null,
            'financeiroImpressao' => null,
        ]);
        $this->assertStringContainsString('Não registrada', $html);
        $this->assertStringNotContainsString('SITUAÇÃO FINANCEIRA', $html);
    }

    public function testCupomMostraEntregaEValoresDoCliente(): void
    {
        $html = $this->render('os/partes/impressao-entrega-financeiro-cupom', [
            'mostrarEntrega' => true,
            'entregaImpressao' => $this->entrega(),
            'financeiroImpressao' => $this->financeiro(),
        ]);
        foreach (['Entrega:', '25/11/2026', 'Total cobrado:', 'Pago:', 'Saldo:', 'Parcialmente paga',
            'R$ 500,00', 'R$ 200,00', 'R$ 300,00'] as $esperado) {
            $this->assertStringContainsString($esperado, $html);
        }
        $this->assertStringNotContainsString('custo', mb_strtolower($html));
    }
}
