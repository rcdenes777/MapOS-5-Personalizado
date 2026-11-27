<?php

require_once APPPATH . 'models/Trifase_financeiro_model.php';
require_once APPPATH . 'database/migrations/20261031120000_trifase_financeiro_lab.php';
require_once APPPATH . 'database/migrations/20261031130000_trifase_tecnico_garantia.php';
require_once BASEPATH . 'database/DB_forge.php';
require_once BASEPATH . 'database/drivers/sqlite3/sqlite3_forge.php';

final class TrifaseFinanceiroClienteTest extends MaposTestCase
{
    private Trifase_financeiro_model $f;

    protected function setUp(): void
    {
        parent::setUp();
        $this->db->query('CREATE TABLE os (idOs INTEGER PRIMARY KEY, status TEXT, faturado INTEGER DEFAULT 0, lancamento INTEGER, clientes_id INTEGER)');
        $this->db->query('CREATE TABLE lancamentos (idLancamentos INTEGER PRIMARY KEY AUTOINCREMENT, descricao TEXT, valor DECIMAL, desconto DECIMAL, valor_desconto DECIMAL, tipo_desconto TEXT, data_vencimento TEXT, data_pagamento TEXT, baixado INTEGER, clientes_id INTEGER, cliente_fornecedor TEXT, forma_pgto TEXT, tipo TEXT, usuarios_id INTEGER)');
        $this->db->query('CREATE TABLE anotacoes_os (idAnotacoes INTEGER PRIMARY KEY AUTOINCREMENT, os_id INTEGER, anotacao TEXT, data_hora TEXT)');
        $this->db->query('CREATE TABLE usuarios (idUsuarios INTEGER PRIMARY KEY, nome TEXT)');
        $this->db->query('CREATE TABLE trifase_cancelamentos (id INTEGER PRIMARY KEY, os_id INTEGER, tipo TEXT, retrato TEXT, criado_em TEXT)');
        $this->db->insert('usuarios', ['idUsuarios' => 7, 'nome' => 'Usuário fictício']);
        $this->db->insert('os', ['idOs' => 1, 'status' => 'Em Andamento', 'clientes_id' => 1]);
        $this->db->insert('os', ['idOs' => 2, 'status' => 'Aberto', 'clientes_id' => 1]);
        foreach ([new class() extends Migration_trifase_financeiro_lab {
            public object $dbforge;
        }, new class() extends Migration_trifase_tecnico_garantia {
            public object $dbforge;
        }] as $m) {
            $m->db = $this->db;
            $m->dbforge = new CI_DB_sqlite3_forge($this->db);
            $m->up();
            $m->up();
        }
        $this->f = new Trifase_financeiro_model();
        $this->f->db = $this->db;
    }

    private function chave(string $nome): string
    {
        return str_pad($nome, 20, '_');
    }

    public function testOsSemObrigacaoNaoInventaZero(): void
    {
        $this->assertNull($this->f->resumoCliente(2));
        $this->assertSame([], $this->f->resumosCliente([2]));
        $this->assertNull($this->f->resumoCliente(999));
    }

    public function testPendenteParcialQuitadoEEstornoReabreOSaldo(): void
    {
        $this->f->formalizar(1, 50000, 0, '2026-11-15', 7);

        $r = $this->f->resumoCliente(1);
        $this->assertSame(['total_c' => 50000, 'pago_c' => 0, 'saldo_c' => 50000,
            'situacao' => 'Em aberto', 'situacao_variant' => 'warning'], $r);

        $entrada = $this->f->receber(1, 20000, '2026-11-01', 'Pix', $this->chave('entrada'), 7);
        $r = $this->f->resumoCliente(1);
        $this->assertSame(20000, $r['pago_c']);
        $this->assertSame(30000, $r['saldo_c']);
        $this->assertSame('Parcialmente paga', $r['situacao']);

        $this->f->receber(1, 30000, '2026-11-02', 'Dinheiro', $this->chave('resto'), 7);
        $r = $this->f->resumoCliente(1);
        $this->assertSame('Quitada', $r['situacao']);
        $this->assertSame(0, $r['saldo_c']);
        $this->assertSame('success', $r['situacao_variant']);

        $this->f->estornar(1, (int) $entrada['evento_id'], 'Cliente desistiu da entrada', '2026-11-03', $this->chave('estorno'), 7);
        $r = $this->f->resumoCliente(1);
        $this->assertSame(30000, $r['pago_c']);
        $this->assertSame(20000, $r['saldo_c']);
        $this->assertSame('Parcialmente paga', $r['situacao']);
        $this->assertSame('Em Andamento', $this->db->where('idOs', 1)->get('os')->row()->status);
    }

    public function testProjecaoExpoeSomenteCamposDoCliente(): void
    {
        $this->f->formalizar(1, 50000, 5000, '2026-11-15', 7);
        $r = $this->f->resumoCliente(1);
        $this->assertSame(['total_c', 'pago_c', 'saldo_c', 'situacao', 'situacao_variant'], array_keys($r));
        $this->assertSame(45000, $r['total_c']);
        $this->assertArrayNotHasKey('bruto_c', $r);
        $this->assertArrayNotHasKey('desconto_c', $r);
        $this->assertArrayNotHasKey('recebido_original_c', $r);
    }

    public function testObrigacaoZeradaViraSemCobranca(): void
    {
        $this->f->formalizar(1, 50000, 0, '2026-11-15', 7);
        $this->db->where('os_id', 1)->update('trifase_financeiro_obrigacoes', ['bruto_c' => 0, 'desconto_c' => 0]);
        $r = $this->f->resumoCliente(1);
        $this->assertSame('Sem cobrança', $r['situacao']);
        $this->assertSame(0, $r['total_c']);
        $this->assertSame(0, $r['saldo_c']);
    }

    public function testConsolidadoDoClienteIncluiTodasAsOrdensSemMisturarOutroCliente(): void
    {
        $this->db->insert('os', ['idOs' => 3, 'status' => 'Aberto', 'clientes_id' => 2]);
        foreach (range(10, 20) as $id) {
            $this->db->insert('os', ['idOs' => $id, 'status' => 'Aberto', 'clientes_id' => 1]);
        }
        $this->f->formalizar(1, 50000, 0, '2026-11-15', 7);
        $this->f->receber(1, 10000, '2026-11-01', 'Pix', $this->chave('consolidado'), 7);
        $this->f->formalizar(20, 7000, 0, '2026-11-15', 7);
        $this->f->formalizar(3, 90000, 0, '2026-11-15', 7);

        $this->assertTrue(method_exists($this->f, 'consolidadoCliente'));
        $this->assertSame(['total_c' => 57000, 'pago_c' => 10000, 'saldo_c' => 47000], $this->f->consolidadoCliente(1));
        $this->assertSame(['total_c' => 90000, 'pago_c' => 0, 'saldo_c' => 90000], $this->f->consolidadoCliente(2));
    }

    public function testLoteDevolveSomenteOsComObrigacao(): void
    {
        $this->f->formalizar(1, 50000, 0, '2026-11-15', 7);
        $this->f->receber(1, 10000, '2026-11-01', 'Pix', $this->chave('lote'), 7);
        $mapa = $this->f->resumosCliente([1, 2, 999]);
        $this->assertSame([1], array_keys($mapa));
        $this->assertSame(40000, $mapa[1]['saldo_c']);
    }
}
