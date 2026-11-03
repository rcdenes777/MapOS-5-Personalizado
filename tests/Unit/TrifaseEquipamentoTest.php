<?php

require_once APPPATH . 'models/Trifase_equipamento_model.php';
require_once APPPATH . 'helpers/trifase_equipamento_helper.php';
require_once APPPATH . 'database/migrations/20261102010000_trifase_equipamentos.php';
require_once APPPATH . 'database/migrations/20261103010000_trifase_equipamento_correcoes.php';
require_once BASEPATH . 'database/DB_forge.php';
require_once BASEPATH . 'database/drivers/sqlite3/sqlite3_forge.php';

final class TrifaseEquipamentoTest extends MaposTestCase
{
    private Trifase_equipamento_model $modelo;

    protected function setUp(): void
    {
        parent::setUp();
        $this->db->query('CREATE TABLE os (idOs INTEGER PRIMARY KEY, clientes_id INTEGER, status TEXT, dataInicial TEXT, descricaoProduto TEXT, garantia INTEGER, faturado INTEGER)');
        foreach ([1 => 1, 2 => 1, 3 => 2, 4 => 1] as $id => $cliente) {
            $this->db->insert('os', ['idOs' => $id, 'clientes_id' => $cliente, 'status' => 'Em Andamento', 'dataInicial' => '2026-11-01', 'descricaoProduto' => 'Descrição legada', 'garantia' => 90, 'faturado' => 0]);
        }
        $this->db->query('CREATE TABLE trifase_entregas_eventos (os_id INTEGER)');
        $m = new class() extends Migration_trifase_equipamentos {
            public object $dbforge;
        };
        $m->db = $this->db;
        $m->dbforge = new CI_DB_sqlite3_forge($this->db);
        $m->up();
        $m->up();
        $this->modelo = new Trifase_equipamento_model();
        $this->modelo->db = $this->db;
    }

    public function testCorrecaoPreservaOriginalUnidadeEOutrasOsEImpedeConflito(): void
    {
        $m = new class() extends Migration_trifase_equipamento_correcoes {
            public object $dbforge;
        };
        $m->db = $this->db;
        $m->dbforge = new CI_DB_sqlite3_forge($this->db);
        $m->up();
        $m->up();
        $unidade = $this->modelo->vincular(1, array_replace($this->dados(), ['selo' => '', 'serie' => '', 'imei' => '']), 1, 'CORR_VINCULO_0001');
        $original = $this->db->get('trifase_os_equipamentos')->result_array();
        $cadastros = $this->db->get('trifase_equipamentos')->result_array();
        $os = $this->db->get('os')->result_array();
        $novo = array_intersect_key((array) $this->modelo->porOs(1), array_flip(['marca', 'modelo', 'selo', 'serie', 'imei', 'itens_recebidos', 'estado_entrada']));
        $novo['marca'] = 'Marca corrigida';
        $novo['selo'] = 'SELO-APLICADO-DEPOIS';
        $novo['estado_entrada'] = 'Estado corrigido';
        $id = $this->modelo->corrigir(1, $novo, 0, 'Erro de digitação', 1, 'CORR_EVENTO_00001');
        $this->assertSame($id, $this->modelo->corrigir(1, $novo, 0, 'Erro de digitação', 1, 'CORR_EVENTO_00001'));
        $this->assertCount(1, $this->modelo->correcoes(1));
        $this->assertSame('Marca corrigida', $this->modelo->porOs(1)->marca);
        $this->assertSame('SELO-APLICADO-DEPOIS', $this->modelo->porOs(1)->selo);
        $this->assertSame($unidade, (int) $this->modelo->porOs(1)->equipamento_id);
        $this->assertSame($original, $this->db->get('trifase_os_equipamentos')->result_array());
        $this->assertSame($cadastros, $this->db->get('trifase_equipamentos')->result_array());
        $this->assertSame($os, $this->db->get('os')->result_array());
        $this->assertSame([], $this->modelo->correcoes(2));
        foreach ([[$novo, 0, 'Motivo', 'CORR_EVENTO_00002'], [$novo, $id, '', 'CORR_EVENTO_00003'], [$novo + ['equipamento_id' => 3], $id, 'Motivo', 'CORR_EVENTO_00004']] as [$dados, $versao, $motivo, $chave]) {
            try {
                $this->modelo->corrigir(1, $dados, $versao, $motivo, 1, $chave);
                $this->fail('Correção inválida foi aceita.');
            } catch (DomainException $e) {
                $this->assertNotSame('', $e->getMessage());
            }
        }
        $novo['marca'] = 'Segunda correção';
        $novo['estado_entrada'] = str_repeat('界', 10000);
        $this->modelo->corrigir(1, $novo, $id, 'Conferência', 1, 'CORR_EVENTO_00005');
        $this->assertSame('Segunda correção', $this->modelo->porOs(1)->marca);
        $this->assertSame($novo['estado_entrada'], $this->modelo->porOs(1)->estado_entrada);
        $this->assertCount(2, $this->modelo->correcoes(1));
        $this->expectException(DomainException::class);
        $this->modelo->corrigir(1, $novo, $id, 'Conferência', 1, 'CORR_EVENTO_00001');
    }

    private function dados(string $selo = 'T-001'): array
    {
        return ['modo' => 'novo', 'tipo' => 'placa', 'marca' => 'LG', 'modelo' => 'INV-12', 'selo' => $selo,
            'serie' => '', 'imei' => '', 'itens_recebidos' => 'Placa e dissipador', 'estado_entrada' => 'Sem lacre anterior'];
    }

    private function chave(string $nome): string
    {
        return str_pad($nome, 24, '_');
    }

    public function testModeloCompartilhadoNaoConfundeDuasUnidadesEReenvioNaoDuplica(): void
    {
        $antes = $this->db->get('os')->result_array();
        $dados = $this->dados();
        $a = $this->modelo->vincular(1, $dados, 7, $this->chave('primeira'));
        $this->assertSame($a, $this->modelo->vincular(1, array_reverse($dados, true), 7, $this->chave('primeira')));
        $b = $this->modelo->vincular(2, array_replace($this->dados('T-002'), ['marca' => ' lg ', 'modelo' => 'inv-12']), 7, $this->chave('segunda'));
        $this->assertNotSame($a, $b);
        $this->assertSame(1, $this->db->count_all('trifase_equipamento_modelos'));
        $this->assertSame(2, $this->db->count_all('trifase_equipamentos'));
        $this->assertSame('T-001', $this->modelo->porOs(1)->selo);
        $this->assertSame('T-002', $this->modelo->porOs(2)->selo);
        $this->assertSame($antes, $this->db->get('os')->result_array());
    }

    public function testNovaOsDaMesmaUnidadeExigeRegistrarEntradaNovamenteEPreservaRetratoAnterior(): void
    {
        $id = $this->modelo->vincular(1, $this->dados(), 7, $this->chave('origem'));
        $anterior = $this->modelo->porOs(1);
        $this->db->update('trifase_equipamento_modelos', ['marca' => 'Marca corrigida']);
        $this->modelo->vincular(2, ['modo' => 'existente', 'equipamento_id' => $id, 'itens_recebidos' => 'Somente a placa', 'estado_entrada' => 'Selo conferido; oxidação no conector'], 7, $this->chave('novo-atendimento'));
        $this->assertEquals($anterior, $this->modelo->porOs(1));
        $this->assertSame('Marca corrigida', $this->modelo->porOs(2)->marca);
        $this->assertSame('Somente a placa', $this->modelo->porOs(2)->itens_recebidos);
        $this->assertSame(1, $this->db->count_all('trifase_equipamentos'));
        $this->assertCount(2, $this->modelo->historico($id));
    }

    public function testEquipamentoDeOutroClienteNaoPodeSerVinculado(): void
    {
        $id = $this->modelo->vincular(1, $this->dados(), 7, $this->chave('cliente1'));
        try {
            $this->modelo->vincular(3, ['modo' => 'existente', 'equipamento_id' => $id, 'itens_recebidos' => 'Placa', 'estado_entrada' => 'Conferido'], 7, $this->chave('cliente2'));
            $this->fail('Vinculou unidade de outro cliente');
        } catch (DomainException $e) {
            $this->assertNull($this->modelo->porOs(3));
        }
        $this->assertCount(1, $this->modelo->unidades(1, 'T-001'));
        $this->assertSame([], $this->modelo->unidades(2, 'T-001'));
        $this->assertFalse(trifaseEquipamentoClienteValido($this->db, 1, 2));
        $this->assertTrue(trifaseEquipamentoClienteValido($this->db, 1, 1));
    }

    public function testSeloNormalizadoDuplicadoNaoCriaUnidadeOuModeloParcial(): void
    {
        $this->modelo->vincular(1, $this->dados('a b12'), 7, $this->chave('selo'));
        try {
            $this->modelo->vincular(2, array_replace($this->dados('AB12'), ['marca' => 'Outra']), 7, $this->chave('duplicado'));
            $this->fail('Aceitou o mesmo selo com caixa/espaçamento diferente');
        } catch (DomainException $e) {
            $this->assertSame(1, $this->db->count_all('trifase_equipamentos'));
            $this->assertSame(1, $this->db->count_all('trifase_equipamento_modelos'));
        }
    }

    public function testDadosInvalidosECampoFinanceiroNaoAlteramCadastro(): void
    {
        foreach ([['estado_entrada' => ''], ['marca' => []], ['preco' => '1'], ['imei' => "invalido\0"], ['tipo' => 'invalido'], ['modelo_id' => 'invalido']] as $invalido) {
            try {
                $this->modelo->vincular(1, array_replace($this->dados(), $invalido), 7, $this->chave('invalido'));
                $this->fail('Aceitou dados inválidos de identificação');
            } catch (DomainException $e) {
                $this->assertSame(0, $this->db->count_all('trifase_equipamentos'));
                $this->assertNull($this->modelo->porOs(1));
            }
        }
    }

    public function testHistoricoDeEntregaImpedeIdentificacaoPosterior(): void
    {
        $this->db->insert('trifase_entregas_eventos', ['os_id' => 1]);
        $this->expectException(DomainException::class);
        $this->modelo->vincular(1, $this->dados(), 7, $this->chave('entregue'));
    }
}
