<?php

require_once APPPATH . 'helpers/conecte_helper.php';

final class TrifaseFinanceiroClienteViewTest extends \PHPUnit\Framework\TestCase
{
    private function renderizar(string $view, array $dados = []): string
    {
        extract($dados);
        ob_start();
        try {
            include APPPATH . 'views/' . $view . '.php';

            return (string) ob_get_contents();
        } finally {
            ob_end_clean();
        }
    }

    private function parcial(): array
    {
        return ['total_c' => 50000, 'pago_c' => 20000, 'saldo_c' => 30000,
            'situacao' => 'Parcialmente paga', 'situacao_variant' => 'warning'];
    }

    public function testLinkPublicoMostraTotalPagoSaldoESituacao(): void
    {
        $html = $this->renderizar('trifase/publico-financeiro', ['financeiro' => $this->parcial()]);
        foreach (['Pagamento', 'Total', 'Pago', 'Saldo a pagar', 'R$ 500,00', 'R$ 200,00', 'R$ 300,00', 'Parcialmente paga'] as $texto) {
            $this->assertStringContainsString($texto, $html);
        }
        foreach (['custo', 'margem', 'bruto', 'desconto interno', 'recebido_original'] as $interno) {
            $this->assertStringNotContainsString($interno, $html);
        }
    }

    public function testLinkPublicoSemObrigacaoNaoRenderizaBloco(): void
    {
        $this->assertSame('', trim($this->renderizar('trifase/publico-financeiro', ['financeiro' => null])));
    }

    public function testDetalheDoClienteMostraSituacaoIndependenteDoAndamento(): void
    {
        $quitada = ['total_c' => 45000, 'pago_c' => 45000, 'saldo_c' => 0,
            'situacao' => 'Quitada', 'situacao_variant' => 'success'];
        $html = $this->renderizar('conecte/partes/financeiro', ['financeiro' => $quitada]);
        foreach (['Pagamento', 'Total cobrado', 'Pago', 'Saldo a pagar', 'R$ 450,00', 'Quitada'] as $texto) {
            $this->assertStringContainsString($texto, $html);
        }
        $this->assertStringNotContainsString('custo', $html);
    }

    public function testColunaDaListagemUsaAProlacaoOuTracoSemInventarZero(): void
    {
        $colunas = conecteColunasOs(true, true);
        $porRotulo = [];
        foreach ($colunas as $coluna) {
            $porRotulo[$coluna['label']] = $coluna;
        }
        $this->assertArrayHasKey('Pagamento', $porRotulo);
        $this->assertArrayHasKey('Saldo a pagar', $porRotulo);

        $comDados = (object) ['financeiro' => $this->parcial()];
        $this->assertStringContainsString('Parcialmente paga', $porRotulo['Pagamento']['render']($comDados));
        $this->assertStringContainsString('R$ 300,00', $porRotulo['Saldo a pagar']['render']($comDados));

        $semDados = (object) [];
        $this->assertSame('—', $porRotulo['Pagamento']['render']($semDados));
        $this->assertSame('—', $porRotulo['Saldo a pagar']['render']($semDados));
    }

    public function testPortalSemFinanceiroNaoAfirmaAusenciaDeCobranca(): void
    {
        $html = $this->renderizar('trifase/cliente-publico', [
            'cliente' => (object) ['nomeCliente' => 'Cliente fictício'],
            'ordens' => [(object) ['idOs' => 1, 'descricaoProduto' => 'TV', 'status' => 'Finalizado', 'entregue' => null]],
            'financeiro' => null, 'financeiroDisponivel' => false, 'total' => 1, 'filtro' => '', 'detalhe' => false,
            'basePublica' => 'https://exemplo.invalid/', 'urlPortal' => '/portal', 'urlOs' => '/os/', 'urlAnexo' => '/anexo/', 'anexos' => [],
        ]);
        $this->assertStringContainsString('Informação financeira indisponível', $html);
        $this->assertStringNotContainsString('Sem cobrança formalizada', $html);
        $this->assertStringNotContainsString('filtro=pago', $html);
        $this->assertStringContainsString('Informação indisponível', $html);
        $this->assertStringNotContainsString('filtro=entregue', $html);
    }

    public function testDetalhePublicoDistinguePropostaEAprovacaoSemDadosInternos(): void
    {
        $dados = [
            'cliente' => (object) ['nomeCliente' => 'Cliente fictício'],
            'ordens' => [(object) ['idOs' => 1, 'descricaoProduto' => 'TV', 'status' => 'Aberto', 'entregue' => null]],
            'financeiro' => null, 'financeiroDisponivel' => false, 'total' => 1, 'filtro' => '', 'detalhe' => true,
            'basePublica' => 'https://exemplo.invalid/', 'urlPortal' => '/portal', 'urlOs' => '/os/', 'urlAnexo' => '/anexo/', 'anexos' => [],
            'orcamentoCliente' => ['situacao' => 'Aguardando resposta', 'apresentacao' => ['diagnostico' => 'Diagnóstico publicado'], 'itens' => [['tipo' => 'servico', 'nome' => 'Troca de tela']]],
        ];
        $html = $this->renderizar('trifase/cliente-publico', $dados);
        $this->assertStringContainsString('Diagnóstico publicado', $html);
        $this->assertStringContainsString('Troca de tela', $html);
        $this->assertStringContainsString('Aguardando resposta', $html);
        $this->assertStringNotContainsString('Trabalho aprovado', $html);
        $dados['orcamentoCliente']['situacao'] = 'Aprovado';
        $htmlAprovado = $this->renderizar('trifase/cliente-publico', $dados);
        $this->assertStringContainsString('Trabalho aprovado', $htmlAprovado);
        $this->assertStringNotContainsString('Aguardando resposta', $htmlAprovado);
    }

    public function testFlagDesligadaRemoveAsColunasFinanceiras(): void
    {
        $rotulos = array_column(conecteColunasOs(true, false), 'label');
        $this->assertNotContains('Pagamento', $rotulos);
        $this->assertNotContains('Saldo a pagar', $rotulos);
        $this->assertContains('Status', $rotulos);
    }
}
