<?php
require_once APPPATH . 'helpers/trifase_orcamento_helper.php';

final class TrifaseOrcamentoCondicoesTest extends \PHPUnit\Framework\TestCase
{
    private function dados(): array
    {
        return ['pagamento_vista' => '1', 'pagamento_cartao' => '1', 'pagamento_parcelas' => '3',
            'prazo_dias' => '5', 'prazo_importar' => '1', 'prazo_aguardar' => '1', 'garantia_dias' => '90', 'termo_garantia_id' => '7'];
    }
    private function termos(): array
    {
        return [7 => ['refGarantia' => 'Garantia de reparo', 'textoGarantia' => '<p>Cobre o serviço executado.</p>']];
    }
    public function testCompoeCondicoesEPreservaSelecoesAoReabrir(): void
    {
        $textos = trifaseOrcamentoCondicoes($this->dados(), $this->termos());
        $this->assertSame("À vista.\nParcelado no cartão de crédito em até 3 vezes.", $textos['pagamento']);
        $this->assertSame("Execução em até 5 dias úteis após a chegada da peça.\nNecessário importar peça.\nAguardando chegada da peça.", $textos['prazo']);
        $this->assertSame("90 dias.\nCobre o serviço executado.", $textos['garantia']);
        $escolhas = trifaseOrcamentoEscolhas($textos, $this->termos());
        $this->assertTrue($escolhas['pagamento_vista']);
        $this->assertTrue($escolhas['prazo_importar']);
        $this->assertTrue($escolhas['prazo_aguardar']);
        $this->assertSame('7', $escolhas['termo_garantia_id']);
        $post = array_map(static fn ($v) => is_bool($v) ? ($v ? '1' : '') : $v, $escolhas);
        $this->assertSame($textos, trifaseOrcamentoCondicoes($post, $this->termos()));
    }
    public function testPadraoETextosLegadosNaoSaoSubstituidos(): void
    {
        $padrao = trifaseOrcamentoEscolhas([], []);
        $this->assertTrue($padrao['pagamento_vista']);
        $this->assertTrue($padrao['pagamento_cartao']);
        $this->assertSame('90', $padrao['garantia_dias']);
        $antigo = ['pagamento' => '50% de entrada', 'prazo' => 'Conforme teste de bancada', 'garantia' => '45 dias para este reparo'];
        $c = trifaseOrcamentoEscolhas($antigo, []);
        $post = array_map(static fn ($v) => is_bool($v) ? ($v ? '1' : '') : $v, $c);
        $this->assertSame($antigo, trifaseOrcamentoCondicoes($post, []));
    }
    public function testNaoMudaTextoSeTermoForEditadoDepois(): void
    {
        $textos = trifaseOrcamentoCondicoes($this->dados(), $this->termos());
        $alterado = [7 => ['refGarantia' => 'Outro', 'textoGarantia' => 'Texto novo']];
        $c = trifaseOrcamentoEscolhas($textos, $alterado);
        $this->assertSame('outro', $c['garantia_dias']);
        $this->assertSame('', $c['termo_garantia_id']);
        $post = array_map(static fn ($v) => is_bool($v) ? ($v ? '1' : '') : $v, $c);
        $this->assertSame($textos, trifaseOrcamentoCondicoes($post, $alterado));
    }
    public function testValoresInvalidosSaoRecusadosMesmoSemJavascript(): void
    {
        foreach ([['pagamento_parcelas' => '99'], ['prazo_dias' => '-1'], ['garantia_dias' => '999'], ['termo_garantia_id' => '999'], ['pagamento_vista' => []], ['pagamento_vista' => '', 'pagamento_cartao' => '']] as $invalido) {
            try {
                trifaseOrcamentoCondicoes(array_replace($this->dados(), $invalido), $this->termos());
                $this->fail('Aceitou condição inválida');
            } catch (DomainException $e) {
                $this->assertNotEmpty($e->getMessage());
            }
        }
    }
}
