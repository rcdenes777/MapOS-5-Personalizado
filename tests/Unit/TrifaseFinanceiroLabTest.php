<?php

require_once APPPATH . 'models/Trifase_financeiro_model.php';
require_once APPPATH . 'models/Financeiro_model.php';
require_once APPPATH . 'models/Relatorios_model.php';
require_once APPPATH . 'database/migrations/20261031120000_trifase_financeiro_lab.php';
require_once BASEPATH . 'database/DB_forge.php';
require_once BASEPATH . 'database/drivers/sqlite3/sqlite3_forge.php';

final class TrifaseFinanceiroLabTest extends MaposTestCase
{
    private Trifase_financeiro_model $f;
    private Financeiro_model $n;

    protected function setUp(): void
    {
        parent::setUp();
        $this->db->query('CREATE TABLE os (idOs INTEGER PRIMARY KEY, status TEXT, faturado INTEGER DEFAULT 0, lancamento INTEGER, clientes_id INTEGER)');
        $this->db->query('CREATE TABLE lancamentos (idLancamentos INTEGER PRIMARY KEY AUTOINCREMENT, descricao TEXT, valor DECIMAL, desconto DECIMAL, valor_desconto DECIMAL, tipo_desconto TEXT, data_vencimento TEXT, data_pagamento TEXT, baixado INTEGER, clientes_id INTEGER, cliente_fornecedor TEXT, forma_pgto TEXT, tipo TEXT, usuarios_id INTEGER)');
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
