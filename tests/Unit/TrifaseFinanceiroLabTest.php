<?php

require_once APPPATH . 'models/Trifase_financeiro_model.php';
require_once APPPATH . 'models/Financeiro_model.php';
require_once APPPATH . 'models/Relatorios_model.php';
require_once APPPATH . 'database/migrations/20261031120000_trifase_financeiro_lab.php';
require_once APPPATH . 'database/migrations/20261031130000_trifase_tecnico_garantia.php';
require_once BASEPATH . 'database/DB_forge.php';
require_once BASEPATH . 'database/drivers/sqlite3/sqlite3_forge.php';

final class TrifaseFinanceiroLabTest extends MaposTestCase
{
    private Trifase_financeiro_model $f;
    private Financeiro_model $n;

    protected function setUp(): void
    {
        parent::setUp();
        $this->db->query('CREATE TABLE os (idOs INTEGER PRIMARY KEY, status TEXT, faturado INTEGER DEFAULT 0, lancamento INTEGER, clientes_id INTEGER, descricaoProduto TEXT, defeito TEXT, observacoes TEXT, laudoTecnico TEXT, dataFinal TEXT, garantia INTEGER)');
        $this->db->query('CREATE TABLE lancamentos (idLancamentos INTEGER PRIMARY KEY AUTOINCREMENT, descricao TEXT, valor DECIMAL, desconto DECIMAL, valor_desconto DECIMAL, tipo_desconto TEXT, data_vencimento TEXT, data_pagamento TEXT, baixado INTEGER, clientes_id INTEGER, cliente_fornecedor TEXT, forma_pgto TEXT, tipo TEXT, usuarios_id INTEGER)');
        $this->db->query('CREATE TABLE anotacoes_os (idAnotacoes INTEGER PRIMARY KEY AUTOINCREMENT, os_id INTEGER, anotacao TEXT, data_hora TEXT)');
        $this->db->query('CREATE TABLE usuarios (idUsuarios INTEGER PRIMARY KEY, nome TEXT)');
        $this->db->insert('usuarios', ['idUsuarios' => 7, 'nome' => 'Usuário fictício']);
        $this->db->insert('os', ['idOs' => 1, 'status' => 'Em Andamento', 'clientes_id' => 1]);
        $this->db->insert('os', ['idOs' => 2, 'status' => 'Aberto', 'clientes_id' => 1]);
        $m = new class() extends Migration_trifase_financeiro_lab {
            public object $dbforge;
        };
        $m->db = $this->db;
        $m->dbforge = new CI_DB_sqlite3_forge($this->db);
        $m->up();
        $m->up();
        $g = new class() extends Migration_trifase_tecnico_garantia {
            public object $dbforge;
        };
        $g->db = $this->db;
        $g->dbforge = new CI_DB_sqlite3_forge($this->db);
        $g->up();
        $g->up();
        $this->f = new Trifase_financeiro_model();
        $this->f->db = $this->db;
        $this->n = new Financeiro_model();
        $this->n->db = $this->db;
    }

    private function chave(string $nome): string
    {
        return str_pad($nome, 20, '_');
    }

    private function rec(int $valor, string $nome, string $data = '2026-10-31'): array
    {
        return $this->f->receber(1, $valor, $data, 'Pix', $this->chave($nome), 7);
    }

    private function verificar(int $recebido, int $saldo, int $bruto = 50000, int $desconto = 0): void
    {
        $r = $this->f->resumo(1);
        $this->assertSame($recebido, $r['recebido_c']);
        $this->assertSame($saldo, $r['saldo_c']);
        $this->assertSame('Em Andamento', $this->db->where('idOs', 1)->get('os')->row()->status);
        $totais = $this->n->totais([], '2026-11-20');
        $this->assertEqualsWithDelta($recebido / 100, $totais['receitas_pagas'], 0.001);
        $this->assertEqualsWithDelta($saldo / 100, $totais['receitas_pendentes'], 0.001);
        $this->assertEqualsWithDelta(($bruto - $desconto) / 100, $totais['receitas'], 0.001);
        $v = $this->n->visaoGeral();
        $this->assertEqualsWithDelta($recebido / 100, $v['saldo_realizado'], 0.001);
        $this->assertEqualsWithDelta($saldo / 100, $v['a_receber'], 0.001);
        $this->assertEqualsWithDelta($desconto / 100, $v['descontos'], 0.001);
        $principal = $this->db->where('idOs', 1)->get('os')->row()->lancamento;
        $this->assertNotNull($this->db->where('idLancamentos', $principal)->get('lancamentos')->row());
    }

    public function testJornadaRealComModelosNativosEHistoricoDeEstorno(): void
    {
        $this->f->formalizar(1, 50000, 0, '2026-11-15', 7);
        $this->verificar(0, 50000);
        $entrada = $this->rec(20000, 'entrada');
        $original = $this->db->where('id', $entrada['evento_id'])->get('trifase_financeiro_eventos')->row_array();
        $this->verificar(20000, 30000);
        $this->rec(30000, 'restante');
        $this->verificar(50000, 0);
        $this->assertSame(0, $this->n->contar(['status' => 'pendente'], '2026-11-20'));
        $this->f->estornar(1, $entrada['evento_id'], 'Erro no registro', '2026-11-01', $this->chave('estorno'), 7);
        $this->verificar(30000, 20000);
        $this->assertSame($original, $this->db->where('id', $entrada['evento_id'])->get('trifase_financeiro_eventos')->row_array());
        $this->assertSame(2, $this->n->contar([], '2026-11-20'));
        $this->rec(20000, 'nova-entrada', '2026-11-02');
        $this->verificar(50000, 0);
    }

    public function testReciboUsaEventoDaOsERefleteEstornoSemExporDadosInternos(): void
    {
        $this->f->formalizar(1, 50000, 0, '2026-11-15', 7);
        $entrada = $this->rec(12345, 'recibo');
        $r = $this->f->recibo(1, $entrada['evento_id']);
        $this->assertSame(12345, (int) $r['evento']->valor_c);
        $this->assertNull($r['estorno']);
        $this->assertNull($this->f->recibo(2, $entrada['evento_id']));
        $this->assertNull($this->f->recibo(1, 999999));
        $this->assertObjectNotHasProperty('operacao', $r['evento']);
        $this->assertObjectNotHasProperty('payload_hash', $r['evento']);
        $estorno = $this->f->estornar(1, $entrada['evento_id'], 'Motivo interno', '2026-11-01', $this->chave('estorno-recibo'), 7);
        $r = $this->f->recibo(1, $entrada['evento_id']);
        $this->assertSame(12345, (int) $r['evento']->valor_c);
        $this->assertSame($estorno['evento_id'], (int) $r['estorno']->id);
        $this->assertObjectNotHasProperty('motivo', $r['estorno']);
        $this->assertNull($this->f->recibo(1, $estorno['evento_id']));
    }

    public function testDescontoECentavosPermanecemConciliadosAposEstorno(): void
    {
        $this->f->formalizar(1, 55001, 5001, '2026-11-15', 7);
        $a = $this->rec(16667, 'a');
        $this->verificar(16667, 33333, 55001, 5001);
        $this->rec(16667, 'b');
        $this->rec(16666, 'c');
        $this->verificar(50000, 0, 55001, 5001);
        $this->f->estornar(1, $a['evento_id'], 'Corrigir', '2026-11-01', $this->chave('estornar-a'), 7);
        $this->verificar(33333, 16667, 55001, 5001);
        $this->rec(16667, 'd');
        $this->verificar(50000, 0, 55001, 5001);
    }

    public function testRepeticaoNaoDuplicaEConflitoNaoMudaDados(): void
    {
        $this->f->formalizar(1, 50000, 0, '2026-11-15', 7);
        $a = $this->rec(20000, 'a');
        $this->assertSame($a, $this->rec(20000, 'a'));
        try {
            $this->rec(10000, 'a');
            $this->fail('Aceitou reuso de chave com valor diferente.');
        } catch (DomainException $e) {
            $this->verificar(20000, 30000);
        }
        $e = $this->f->estornar(1, $a['evento_id'], 'Erro', '2026-11-01', $this->chave('estorno'), 7);
        $this->assertSame($e, $this->f->estornar(1, $a['evento_id'], 'Erro', '2026-11-01', $this->chave('estorno'), 7));
        $this->verificar(0, 50000);
    }

    public function testDatasDeVencimentoEPagamentoNaoSeConfundem(): void
    {
        $this->f->formalizar(1, 50000, 0, '2026-11-15', 7);
        $this->rec(20000, 'outubro');
        $this->rec(30000, 'novembro', '2026-11-02');
        $meses = $this->n->balancoAnual(2026);
        $this->assertCount(2, $meses);
        $this->assertSame('2026-10', $meses[0]->mes);
        $this->assertEquals(200, $meses[0]->total);
        $this->assertSame('2026-11', $meses[1]->mes);
        $this->assertEquals(300, $meses[1]->total);
        $rel = new Relatorios_model();
        $rel->db = $this->db;
        $this->assertCount(0, $rel->financeiroCustom('2026-10-01', '2026-10-31'));
        $this->assertCount(2, $rel->financeiroCustom('2026-11-01', '2026-11-30'));
    }

    public function testSaldoInsuficienteEstornoDeOutraOsEReestornoSaoNegados(): void
    {
        $this->f->formalizar(1, 50000, 0, '2026-11-15', 7);
        $a = $this->rec(20000, 'a');
        $this->f->formalizar(2, 10000, 0, '2026-11-15', 7);
        foreach ([
            fn () => $this->rec(30001, 'excesso'),
            fn () => $this->f->estornar(2, $a['evento_id'], 'Erro', '2026-11-01', $this->chave('outra-os'), 7),
            fn () => $this->rec(0, 'zero'),
            fn () => $this->rec(100, 'data-ruim', '2026-02-30'),
        ] as $acao) {
            try {
                $acao();
                $this->fail('Operação inválida aceita.');
            } catch (DomainException $e) {
                $this->assertSame(30000, $this->f->resumo(1)['saldo_c']);
            }
        }
        $this->f->estornar(1, $a['evento_id'], 'Erro', '2026-11-01', $this->chave('estorno'), 7);
        $this->expectException(DomainException::class);
        $this->f->estornar(1, $a['evento_id'], 'Erro', '2026-11-01', $this->chave('estorno-duplicado'), 7);
    }

    public function testLancamentosGeridosNaoPodemSerEditadosOuExcluidosPeloModeloGenerico(): void
    {
        $this->f->formalizar(1, 50000, 0, '2026-11-15', 7);
        $id = (int) $this->db->where('idOs', 1)->get('os')->row()->lancamento;
        foreach ([fn () => $this->n->atualizar($id, ['valor' => 1]), fn () => $this->n->excluir($id, 7)] as $acao) {
            try {
                $acao();
                $this->fail('Alterou projeção por fora.');
            } catch (DomainException $e) {
                $this->verificar(0, 50000);
            }
        }
    }

    public function testMudancaOperacionalPreservaFinanceiroERegistraHistorico(): void
    {
        $this->db->query('CREATE TABLE os_historico (id INTEGER PRIMARY KEY AUTOINCREMENT, os_id INTEGER, status_anterior TEXT, status_novo TEXT, usuarios_id INTEGER, data_hora TEXT)');
        $this->db->data_cache = []; // DDL da fixture invalida a lista de tabelas já consultada pela migração.
        $this->f->formalizar(1, 50000, 0, '2026-11-15', 7);
        $this->rec(20000, 'entrada');
        $antes = $this->f->resumo(1);
        $this->f->alterarAndamento(1, 'Finalizado', 7);
        $this->assertSame($antes, $this->f->resumo(1));
        $this->assertSame('Finalizado', $this->db->where('idOs', 1)->get('os')->row()->status);
        $h = $this->db->get('os_historico')->row();
        $this->assertSame('Em Andamento', $h->status_anterior);
        $this->assertSame('Finalizado', $h->status_novo);
        $this->assertSame(7, (int) $h->usuarios_id);
        $this->expectException(DomainException::class);
        $this->f->alterarAndamento(1, 'Faturado', 7);
    }

    public function testAndamentoSemHistoricoNaoMudaNada(): void
    {
        $this->f->formalizar(1, 50000, 0, '2026-11-15', 7);
        try {
            $this->f->alterarAndamento(1, 'Finalizado', 7);
            $this->fail('Alterou sem histórico.');
        } catch (DomainException $e) {
            $this->verificar(0, 50000);
        }
    }

    public function testEdicaoTecnicaNaoMudaFinanceiroERejeitaCamposFinanceiros(): void
    {
        $this->f->formalizar(1, 50000, 0, '2026-11-15', 7);
        $this->rec(20000, 'entrada');
        $antes = $this->f->resumo(1);
        $this->f->salvarTecnico(1, ['laudoTecnico' => '<script>alert(1)</script> Fonte revisada', 'observacoes' => 'Teste interno', 'dataFinal' => '2026-12-01'], 7);
        $this->assertSame($antes, $this->f->resumo(1));
        $os = $this->db->where('idOs', 1)->get('os')->row();
        $this->assertSame('2026-12-01', $os->dataFinal);
        $this->assertStringNotContainsString('<script>', $os->laudoTecnico);
        $this->assertSame(1, $this->db->count_all('anotacoes_os'));
        $this->expectException(DomainException::class);
        $this->f->salvarTecnico(1, ['valorTotal' => '1', 'faturado' => 0], 7);
    }

    public function testGarantiaComecaNaConclusaoENaoMudaComPrevisaoPagamentoOuReabertura(): void
    {
        $this->db->query('CREATE TABLE os_historico (id INTEGER PRIMARY KEY AUTOINCREMENT, os_id INTEGER, status_anterior TEXT, status_novo TEXT, usuarios_id INTEGER, data_hora TEXT)');
        $this->db->data_cache = [];
        $this->f->formalizar(1, 50000, 0, '2026-11-15', 7);
        $this->assertNull($this->f->metadados(1)->garantia_inicio);
        $this->rec(20000, 'entrada');
        $this->assertNull($this->f->metadados(1)->garantia_inicio);
        $this->f->alterarAndamento(1, 'Finalizado', 7);
        $inicio = date('Y-m-d');
        $this->assertSame($inicio, $this->f->metadados(1)->garantia_inicio);
        $this->f->salvarTecnico(1, ['dataFinal' => '2027-01-01'], 7);
        $this->f->alterarAndamento(1, 'Em Andamento', 7);
        $this->assertSame($inicio, $this->f->metadados(1)->garantia_inicio);
        $this->assertSame(date('Y-m-d', strtotime($inicio . ' +30 days')), osVencimentoGarantia('2027-01-01', 30, 'Em Andamento', $inicio, true));
        $this->assertNull(osVencimentoGarantia('2027-01-01', 30, 'Finalizado', null, true));
        $this->expectException(DomainException::class);
        $this->f->registrarConclusao(1, $inicio, 7);
    }

    public function testLegadoPendenteReutilizaMesmoLancamentoSemAlterarDatasOuValores(): void
    {
        $this->db->query('CREATE TABLE os_historico (id INTEGER PRIMARY KEY AUTOINCREMENT, os_id INTEGER, status_anterior TEXT, status_novo TEXT, usuarios_id INTEGER, data_hora TEXT)');
        $this->db->data_cache = [];
        $this->db->insert('lancamentos', ['idLancamentos' => 10, 'descricao' => 'Fatura de OS - #1', 'valor' => 550, 'desconto' => 50, 'valor_desconto' => 500, 'data_vencimento' => '2026-10-15', 'baixado' => 0, 'clientes_id' => 1, 'tipo' => 'receita']);
        $this->db->where('idOs', 1)->update('os', ['faturado' => 1, 'lancamento' => 10, 'status' => 'Faturado', 'dataFinal' => '2026-10-10']);
        $antes = $this->db->where('idLancamentos', 10)->get('lancamentos')->row_array();
        $this->assertTrue($this->f->legado(1)['elegivel']);
        $this->f->conciliarLegado(1, 'Em Andamento', 7);
        $this->assertSame($antes, $this->db->where('idLancamentos', 10)->get('lancamentos')->row_array());
        $this->assertSame(1, $this->db->count_all('lancamentos'));
        $this->assertSame(10, (int) $this->db->where('idOs', 1)->get('os')->row()->lancamento);
        $this->assertSame('2026-10-10', $this->db->where('idOs', 1)->get('os')->row()->dataFinal);
        $this->assertNull($this->f->metadados(1)->garantia_inicio);
        $this->assertSame('legado', $this->f->metadados(1)->origem);
        $this->verificar(0, 50000, 55000, 5000);
        $this->expectException(DomainException::class);
        $this->f->conciliarLegado(1, 'Em Andamento', 7);
    }

    public function testLegadoPagoOuSemVinculoNaoEhMigradoNemInferidoPorDescricao(): void
    {
        $this->db->where('idOs', 1)->update('os', ['faturado' => 1, 'status' => 'Faturado']);
        $this->db->insert('lancamentos', ['idLancamentos' => 10, 'descricao' => 'Fatura de OS - #1', 'valor' => 500, 'valor_desconto' => 500, 'data_vencimento' => '2026-10-15', 'baixado' => 1, 'data_pagamento' => '2026-10-15', 'clientes_id' => 1, 'tipo' => 'receita']);
        $this->assertFalse($this->f->legado(1)['elegivel']);
        $this->db->where('idOs', 1)->update('os', ['lancamento' => 10]);
        $this->assertFalse($this->f->legado(1)['elegivel']);
        $this->assertSame(0, $this->db->count_all('trifase_financeiro_obrigacoes'));
        $this->expectException(DomainException::class);
        $this->f->conciliarLegado(1, 'Faturado', 7);
    }

    public function testFormalizacaoDuplicadaOuCanceladaNaoCriaReceitaExtra(): void
    {
        $this->f->formalizar(1, 50000, 0, '2026-11-15', 7);
        $this->db->where('idOs', 2)->update('os', ['status' => 'Cancelado']);
        foreach ([1, 2, 999] as $id) {
            try {
                $this->f->formalizar($id, 50000, 0, '2026-11-15', 7);
                $this->fail('Formalização inválida aceita.');
            } catch (DomainException $e) {
                $this->assertSame(1, $this->db->count_all('lancamentos'));
            }
        }
    }

    public function testEventoRepetidoDepoisDeOutrosRetornaMesmoIdComSaldoAtual(): void
    {
        $this->f->formalizar(1, 50000, 0, '2026-11-15', 7);
        $a = $this->rec(20000, 'a');
        $this->rec(30000, 'b');
        $repetido = $this->rec(20000, 'a');
        $this->assertSame($a['evento_id'], $repetido['evento_id']);
        $this->assertSame(0, $repetido['saldo_c']);
        $this->assertSame(2, $this->db->count_all('trifase_financeiro_eventos'));
    }

    public function testFalhaNoMeioDaGravacaoReverteEventoELancamento(): void
    {
        $this->f->formalizar(1, 50000, 0, '2026-11-15', 7);
        $this->db->query("CREATE TRIGGER falhar_evento BEFORE INSERT ON trifase_financeiro_eventos BEGIN SELECT RAISE(ABORT, 'Falha simulada'); END");
        $this->db->db_debug = false;
        set_error_handler(static fn ($nivel, $mensagem) => str_contains($mensagem, 'Falha simulada'));
        try {
            $this->rec(20000, 'falha');
            $this->fail('A falha injetada não ocorreu.');
        } catch (RuntimeException $e) {
            $this->assertSame(0, $this->db->count_all('trifase_financeiro_eventos'));
            $this->assertSame(1, $this->db->count_all('lancamentos'));
            $this->verificar(0, 50000);
        } finally {
            restore_error_handler();
        }
    }
}
