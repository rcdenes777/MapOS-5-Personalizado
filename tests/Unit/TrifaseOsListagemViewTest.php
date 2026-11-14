<?php

if (! function_exists('site_url')) {
    function site_url($uri = '')
    {
        return 'http://localhost/' . ltrim($uri, '/');
    }
}

if (! function_exists('base_url')) {
    function base_url($uri = '')
    {
        return 'http://localhost/' . ltrim($uri, '/');
    }
}

final class TrifaseOsListagemViewTest extends \PHPUnit\Framework\TestCase
{
    #[\PHPUnit\Framework\Attributes\DataProvider('totais')]
    public function testTotalDaObrigacaoPrevaleceSobreItensSemUsarRecebidoOuSaldo(int $total, string $esperado): void
    {
        $recebido = min(20000, intdiv($total, 2));
        $html = $this->renderizar([
            1 => ['total_c' => $total, 'recebido_c' => $recebido, 'saldo_c' => $total - $recebido, 'situacao' => 'Parcialmente pago'],
        ]);

        $this->assertSame([$esperado], $this->celulas($html, 'Total'));
        $this->assertSame(['Parcialmente pago'], $this->celulas($html, 'Pagamento'));
    }

    public static function totais(): array
    {
        return [
            'cobranca sem itens na lista' => [50000, 'R$ 500,00'],
            'desconto da obrigacao ja aplicado' => [45000, 'R$ 450,00'],
            'centavos preservados' => [12345, 'R$ 123,45'],
        ];
    }

    public function testAbatimentoTotalZeroNaoRetornaAoTotalDosItens(): void
    {
        $html = $this->renderizar([
            1 => ['total_c' => 0, 'recebido_c' => 0, 'saldo_c' => 0, 'situacao' => 'Reembolsado'],
        ], ['total' => 550]);

        $this->assertSame(['R$ 0,00'], $this->celulas($html, 'Total'));
        $this->assertSame(['Reembolsado'], $this->celulas($html, 'Pagamento'));
    }

    public function testAbatimentoParcialUsaTotalLiquidoENaoTotalOriginal(): void
    {
        $html = $this->renderizar([
            1 => ['total_c' => 45000, 'total_original_c' => 50000, 'recebido_c' => 15000, 'saldo_c' => 30000, 'situacao' => 'Parcialmente pago'],
        ], ['total' => 500]);

        $this->assertSame(['R$ 450,00'], $this->celulas($html, 'Total'));
    }

    public function testFaturamentoAntigoSemObrigacaoPreservaTotalNativoComDesconto(): void
    {
        $html = $this->renderizar([], ['total' => 150, 'faturado' => 1]);

        $this->assertSame(['R$ 150,00'], $this->celulas($html, 'Total'));
        $this->assertSame(['Faturamento anterior'], $this->celulas($html, 'Pagamento'));
    }

    public function testOsAindaNaoFaturadaPreservaTotalNativo(): void
    {
        $html = $this->renderizar([], ['total' => 260, 'faturado' => 0]);

        $this->assertSame(['R$ 260,00'], $this->celulas($html, 'Total'));
        $this->assertSame(['Não faturada'], $this->celulas($html, 'Pagamento'));
    }

    public function testResumoDeOutraOsNaoEAplicadoALinhaAtual(): void
    {
        $html = $this->renderizar([
            2 => ['total_c' => 50000, 'recebido_c' => 20000, 'saldo_c' => 30000, 'situacao' => 'Parcialmente pago'],
        ], ['total' => 77.33]);

        $this->assertSame(['R$ 77,33'], $this->celulas($html, 'Total'));
    }

    public function testSemPermissaoNaoExibeValoresMesmoComResumoFornecido(): void
    {
        $html = $this->renderizar([
            1 => ['total_c' => 50000, 'recebido_c' => 20000, 'saldo_c' => 30000, 'situacao' => 'Parcialmente pago'],
        ], ['total' => 777], ['listaVerFinanceiro' => false]);

        $this->assertSame([], $this->celulas($html, 'Total'));
        $this->assertSame([], $this->celulas($html, 'Pagamento'));
        $this->assertStringNotContainsString('R$', $html);
    }

    public function testModuloFinanceiroDesligadoMantemColunaNativa(): void
    {
        $html = $this->renderizar([
            1 => ['total_c' => 50000],
        ], ['total' => 88], ['listaFinanceiroHabilitado' => false]);

        $this->assertSame(['R$ 88,00'], $this->celulas($html, 'Total'));
        $this->assertSame([], $this->celulas($html, 'Pagamento'));
    }

    public function testInterfacePilotoDesligadaMantemListagemNativa(): void
    {
        $html = $this->renderizar([
            1 => ['total_c' => 50000],
        ], ['total' => 88], ['trifase_ui_piloto' => false]);

        $this->assertSame(['R$ 88,00'], $this->celulas($html, 'Total'));
        $this->assertSame([], $this->celulas($html, 'Pagamento'));
    }

    public function testPaginaMistaUsaResumoPorIdEPreservaAndamentoDeCadaOs(): void
    {
        $linhas = [];
        foreach ([1 => 'Finalizado', 2 => 'Aberto', 3 => 'Em Andamento'] as $id => $status) {
            $linhas[] = (object) [
                'idOs' => $id, 'nomeCliente' => 'Cliente de teste', 'clientes_id' => 1,
                'descricaoProduto' => 'Placa', 'responsavel' => 'Técnico',
                'dataInicial' => '2026-11-02', 'dataFinal' => '2026-11-06',
                'status' => $status, 'faturado' => 1, 'total' => 123.45,
            ];
        }
        // Mapa fora da ordem das linhas; o total zero também deve prevalecer.
        $html = $this->renderizar([
            3 => ['total_c' => 0, 'saldo_c' => 0, 'situacao' => 'Reembolsado'],
            1 => ['total_c' => 50000, 'saldo_c' => 30000, 'situacao' => 'Parcialmente pago'],
        ], [], ['results' => $linhas]);

        $this->assertSame(['R$ 500,00', 'R$ 123,45', 'R$ 0,00'], $this->celulas($html, 'Total'));
        $this->assertSame(['Parcialmente pago', 'Faturamento anterior', 'Reembolsado'], $this->celulas($html, 'Pagamento'));
        $this->assertSame(['Finalizado', 'Aberto', 'Em Andamento'], $this->celulas($html, 'Andamento'));
        $this->assertSame(['Finalizado', 'Aberto', 'Em Andamento'], array_column($linhas, 'status'));
    }

    public function testFiltrosESaldoAparecemSomenteComPermissaoEModulosAtivos(): void
    {
        $resumos = [1 => ['total_c' => 50000, 'saldo_c' => 30000, 'situacao' => 'Parcialmente pago']];
        $html = $this->renderizar($resumos, [], ['filtros' => ['financeiro' => 'parcial', 'pendencia' => 'receber', 'vencimento_de' => '2026-11-01']]);
        $this->assertSame(['A receber: R$ 300,00'], $this->celulas($html, 'Acerto financeiro'));
        $dom = new DOMDocument();
        @$dom->loadHTML($html);
        $xpath = new DOMXPath($dom);
        $this->assertCount(1, $xpath->query('//select[@name="situacao"]/option[@value="receber" and @selected]'));
        $this->assertCount(0, $xpath->query('//select[@name="pendencia"]'));
        $this->assertCount(0, $xpath->query('//select[@name="financeiro"]'));
        $this->assertStringNotContainsString('name="fila"', $html);
        $this->assertStringContainsString('name="vencimento_de"', $html);
        $this->assertCount(1, $xpath->query('//details[summary]/div//input[@name="vencimento_de"]'));
        $this->assertStringContainsString('De 01/11/2026', $html);
        $this->assertStringNotContainsString('name="status"', $html);
        foreach (['listaVerFinanceiro', 'listaFinanceiroHabilitado', 'trifase_ui_piloto'] as $flag) {
            $restrito = $this->renderizar($resumos, [], [$flag => false]);
            $this->assertStringNotContainsString('name="financeiro"', $restrito);
            $this->assertStringNotContainsString('name="saldo"', $restrito);
            $this->assertStringNotContainsString('name="pendencia"', $restrito);
            $this->assertStringNotContainsString('name="situacao"', $restrito);
            $this->assertSame([], $this->celulas($restrito, 'Acerto financeiro'));
        }
    }

    public function testSaldoZeroDaObrigacaoENaoApuradoNoLegadoNaoSeConfundem(): void
    {
        $this->assertSame(['Sem pendência: R$ 0,00'], $this->celulas($this->renderizar([1 => ['total_c' => 0, 'saldo_c' => 0, 'situacao' => 'Reembolsado']]), 'Acerto financeiro'));
        $this->assertSame(['Não apurado'], $this->celulas($this->renderizar([], ['faturado' => 1]), 'Acerto financeiro'));
    }

    public function testAreaTecnicaNaoMostraCobrancaMesmoAoAdministrador(): void
    {
        $html = $this->renderizar([1 => ['total_c' => 50000, 'saldo_c' => 30000, 'situacao' => 'Parcialmente pago']], [], ['contextoFinanceiro' => false]);
        $this->assertStringNotContainsString('name="financeiro"', $html);
        $this->assertStringNotContainsString('name="saldo"', $html);
        $this->assertSame([], $this->celulas($html, 'Total'));
        $this->assertSame([], $this->celulas($html, 'Pagamento'));
        $this->assertSame([], $this->celulas($html, 'Acerto financeiro'));
        $this->assertStringNotContainsString('R$', $html);
    }

    public function testFinanceiroTemFormularioNaSuaRotaESemEdicaoTecnica(): void
    {
        $html = $this->renderizar([]);
        $this->assertStringContainsString('Financeiro das OS', $html);
        $this->assertStringContainsString('action="' . site_url('financeiro/ordens') . '"', $html);
        $this->assertStringNotContainsString('OS e recebimentos', $html);
        $this->assertStringContainsString('trifase_financeiro/visualizar/1', $html);
    }

    public function testFilaCancelamentosPendentesMostraValoresStatusTecnicoEAcaoDeAnalise(): void
    {
        $pendentes = [[
            'os_id' => 1, 'pedido_id' => 9, 'clientes_id' => 1, 'nomeCliente' => 'Cliente <script>x</script>',
            'solicitante' => 'Cliente', 'motivo' => 'Desistiu', 'criado_em' => '2026-11-05 10:00:00',
            'tecnica_concluida' => true, 'total_c' => 50000, 'recebido_c' => 20000, 'devolvido_c' => 5000, 'saldo_c' => 30000,
        ]];
        $html = $this->renderizar([1 => ['total_c' => 50000, 'recebido_c' => 15000, 'saldo_c' => 30000, 'situacao' => 'Parcialmente pago']], ['status' => 'Aprovado'], ['cancelamentosPendentes' => $pendentes]);
        $this->assertStringContainsString('Cancelamentos pendentes', $html);
        $this->assertStringContainsString('Cancelamento solicitado — aguardando análise financeira', $html);
        $this->assertStringContainsString('Analisar cancelamento', $html);
        $this->assertStringContainsString('trifase_cancelamentos/visualizar/1', $html);
        $this->assertStringContainsString('Concluída', $html);
        $this->assertStringContainsString('R$ 50,00', $html);
        $this->assertStringNotContainsString('<script>x</script>', $html);
    }

    public function testAcertoDistingueDevolucaoPendenteDeDinheiroJaDevolvido(): void
    {
        $html = $this->renderizar([1 => ['total_c' => 5000, 'saldo_c' => -15000, 'situacao' => 'Conferir']], ['status' => 'Cancelado']);
        $this->assertSame(['A devolver: R$ 150,00'], $this->celulas($html, 'Acerto financeiro'));
        $html = $this->renderizar([1 => ['total_c' => 5000, 'saldo_c' => 0, 'reembolsado_c' => 15000, 'situacao' => 'Sem pendência']], ['status' => 'Cancelado']);
        $this->assertSame(['Sem pendência: R$ 0,00'], $this->celulas($html, 'Acerto financeiro'));
        $this->assertSame(['Sem pendência'], $this->celulas($html, 'Pagamento'));
    }

    public function testListaOperacionalDistinguePrevisaoDeEntregaSemExporRecebedor(): void
    {
        require_once APPPATH . 'helpers/trifase_entrega_helper.php';
        $opcoes = ['contextoFinanceiro' => false, 'listaVerFinanceiro' => false, 'listaEntregaHabilitada' => true];
        $html = $this->renderizar([], ['status' => 'Cancelado', 'entregue_em' => '2026-11-10 14:30:00', 'recebedor' => 'PRIVADO'], $opcoes);
        $this->assertSame(['Entregue em 10/11/2026 às 14:30'], $this->celulas($html, 'Entrega'));
        $this->assertStringContainsString('Entrega do equipamento', $html);
        $this->assertStringContainsString('Previsão', $html);
        $this->assertStringNotContainsString('PRIVADO', $html);
        $pendente = $this->renderizar([], ['status' => 'Finalizado'], $opcoes);
        $this->assertSame(['Aguardando retirada'], $this->celulas($pendente, 'Entrega'));
        $financeiro = $this->renderizar([], [], ['listaEntregaHabilitada' => true]);
        $this->assertStringNotContainsString('Entrega do equipamento', $financeiro);
    }

    private function renderizar(array $resumos, array $os = [], array $opcoes = []): string
    {
        $dados = array_replace([
            'contextoFinanceiro' => true, 'listaVerCliente' => true,
            'filtros' => [],
            'total' => 1,
            'status_ocultos' => false,
            'controle_editos' => false,
            'pode' => ['adicionar' => false, 'editar' => false, 'excluir' => false],
            'paginacao' => ['total_pages' => 1, 'current' => 1, 'url' => 'http://localhost/os/gerenciar/{page}'],
            'trifase_ui_piloto' => true,
            'listaVerFinanceiro' => true,
            'listaFinanceiroHabilitado' => true,
            'listaFinanceiro' => $resumos,
            'results' => [(object) array_replace([
                'idOs' => 1, 'nomeCliente' => 'Cliente de teste', 'clientes_id' => 1,
                'descricaoProduto' => 'Placa', 'responsavel' => 'Técnico',
                'dataInicial' => '2026-11-02', 'dataFinal' => '2026-11-06',
                'status' => 'Finalizado', 'faturado' => 1, 'total' => 0,
            ], $os)],
        ], $opcoes);

        extract($dados);
        ob_start();
        try {
            include APPPATH . 'views/os/os.php';

            return (string) ob_get_contents();
        } finally {
            ob_end_clean();
        }
    }

    private function celulas(string $html, string $coluna): array
    {
        $dom = new DOMDocument();
        @$dom->loadHTML('<?xml encoding="UTF-8">' . $html);
        $xpath = new DOMXPath($dom);
        $valores = [];
        foreach ($xpath->query('//td[@data-label="' . $coluna . '"]') as $celula) {
            $valores[] = trim(preg_replace('/\s+/u', ' ', $celula->textContent));
        }

        return $valores;
    }
}
