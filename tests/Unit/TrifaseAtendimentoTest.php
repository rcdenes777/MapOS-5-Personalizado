<?php

require_once APPPATH . 'models/Trifase_atendimento_model.php';
require_once APPPATH . 'helpers/trifase_financeiro_helper.php';
require_once APPPATH . 'helpers/os_helper.php';
require_once APPPATH . 'helpers/general_helper.php';
require_once APPPATH . 'database/migrations/20261102030000_trifase_atendimentos.php';
require_once BASEPATH . 'database/DB_forge.php';
require_once BASEPATH . 'database/drivers/sqlite3/sqlite3_forge.php';

final class TrifaseAtendimentoTest extends MaposTestCase
{
    private Trifase_atendimento_model $modelo;
    protected function setUp(): void
    {
        parent::setUp();
        $this->db->query('CREATE TABLE os (idOs INTEGER PRIMARY KEY, status TEXT, dataInicial TEXT, dataFinal TEXT, garantia INTEGER, faturado INTEGER)');
        foreach ([1 => 'Aberto', 2 => 'Finalizado', 3 => 'Em Andamento', 4 => 'Cancelado'] as $id => $status) {
            $this->db->insert('os', ['idOs' => $id, 'status' => $status, 'dataInicial' => date('Y-m-d', strtotime('-10 days')), 'dataFinal' => date('Y-m-d', strtotime('+8 days')), 'garantia' => 90, 'faturado' => $id === 3 ? 1 : 0]);
        }
        $this->db->query('CREATE TABLE os_historico (os_id INTEGER, status_anterior TEXT, status_novo TEXT, usuarios_id INTEGER, data_hora TEXT)');
        $this->db->query('CREATE TABLE trifase_entregas_estado (os_id INTEGER, evento_id INTEGER)');
        $this->db->query('CREATE TABLE trifase_financeiro_obrigacoes (os_id INTEGER, garantia_inicio TEXT, bruto_c INTEGER)');
        $this->db->insert('trifase_financeiro_obrigacoes', ['os_id' => 3, 'garantia_inicio' => date('Y-m-d', strtotime('-3 days')), 'bruto_c' => 50000]);
        $m = new class() extends Migration_trifase_atendimentos {
            public object $dbforge;
        };
        $m->db = $this->db;
        $m->dbforge = new CI_DB_sqlite3_forge($this->db);
        $m->up();
        $m->up();
        $this->modelo = new Trifase_atendimento_model();
        $this->modelo->db = $this->db;
    }

    public function testConcluirSemObrigacaoNaoCriaFinanceiroNemUsaPrevisao(): void
    {
        $antes = $this->db->get('trifase_financeiro_obrigacoes')->result_array();
        $this->modelo->alterarAndamento(1, 'Finalizado', 7);
        $c = $this->modelo->conclusao(1);
        $this->assertSame(date('Y-m-d'), $c->concluido_em);
        $this->assertSame(90, (int) $c->garantia_dias);
        $this->assertSame(0, (int) $this->db->where('idOs', 1)->get('os')->row()->faturado);
        $this->assertSame($antes, $this->db->get('trifase_financeiro_obrigacoes')->result_array());
        $this->modelo->alterarAndamento(1, 'Finalizado', 7);
        $this->assertSame(1, $this->db->count_all('os_historico'));
        $this->modelo->alterarAndamento(1, 'Em Andamento', 7);
        $this->modelo->alterarAndamento(1, 'Finalizado', 7);
        $this->assertEquals($c, $this->modelo->conclusao(1));
    }

    public function testReferenciaFinanceiraConhecidaPreservadaSemAlterarObrigacao(): void
    {
        $antes = $this->db->get('trifase_financeiro_obrigacoes')->result_array();
        $this->modelo->alterarAndamento(3, 'Finalizado', 7);
        $this->assertSame($antes[0]['garantia_inicio'], $this->modelo->conclusao(3)->concluido_em);
        $this->assertSame($antes, $this->db->get('trifase_financeiro_obrigacoes')->result_array());
    }

    public function testConclusaoManualUmaVezEDatasInvalidasNegadas(): void
    {
        foreach (['2000-01-01', date('Y-m-d', strtotime('+1 day')), '2026-02-30', ''] as $data) {
            try {
                $this->modelo->registrarConclusao(2, $data, 7);
                $this->fail('Aceitou data inválida');
            } catch (DomainException $e) {
                $this->assertNull($this->modelo->conclusao(2));
            }
        }
        $this->modelo->registrarConclusao(2, date('Y-m-d', strtotime('-1 day')), 7);
        $this->expectException(DomainException::class);
        $this->modelo->registrarConclusao(2, date('Y-m-d'), 7);
    }

    public function testNaoReabreEntregueNemConclusaoDesconhecida(): void
    {
        try {
            $this->modelo->alterarAndamento(2, 'Aberto', 7);
            $this->fail('Reabriu com referência desconhecida');
        } catch (DomainException $e) {
            $this->assertSame('Finalizado', $this->db->where('idOs', 2)->get('os')->row()->status);
        }
        $this->modelo->registrarConclusao(2, date('Y-m-d'), 7);
        $this->db->insert('trifase_entregas_estado', ['os_id' => 2, 'evento_id' => 1]);
        $this->expectException(DomainException::class);
        $this->modelo->alterarAndamento(2, 'Aberto', 7);
    }

    public function testConsultaUsaReferenciaTecnicaMesmoFuncaoDesligadaEAntecipacaoNaoMudaGarantia(): void
    {
        $this->modelo->alterarAndamento(1, 'Finalizado', 7);
        $this->db->where('idOs', 1)->update('os', ['dataFinal' => '2099-01-01']);
        $this->db->select('os.*');
        trifaseGarantiaJoin($this->db);
        $os = $this->db->where('os.idOs', 1)->get('os')->row();
        $this->assertSame(date('Y-m-d'), $os->trifase_garantia_inicio);
        $this->assertSame(90, (int) $os->trifase_garantia_dias);
        $this->assertSame(date('Y-m-d', strtotime('+90 days')), osGarantiaDoRegistro($os));
    }
    public function testSemPrazoNaoExigeCobrarNemInventarGarantia(): void
    {
        $this->db->where('idOs', 1)->update('os', ['garantia' => '']);
        $this->modelo->alterarAndamento(1, 'Finalizado', 7);
        $this->assertSame(0, (int) $this->modelo->conclusao(1)->garantia_dias);
        $this->assertSame(1, $this->db->count_all('trifase_financeiro_obrigacoes'));
    }

}
