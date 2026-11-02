<?php
require_once APPPATH . 'models/Trifase_cadastro_model.php';
require_once APPPATH . 'database/migrations/20261102050000_trifase_cadastros.php';
require_once BASEPATH . 'database/DB_forge.php';
require_once BASEPATH . 'database/drivers/sqlite3/sqlite3_forge.php';

final class TrifaseCadastroTest extends MaposTestCase
{
    private Trifase_cadastro_model $modelo;
    protected function setUp(): void
    {
        parent::setUp();
        $this->db->query('CREATE TABLE clientes (idClientes INTEGER PRIMARY KEY, nomeCliente TEXT)');
        $this->db->query("INSERT INTO clientes VALUES (1, 'Cliente')");
        $this->db->query('CREATE TABLE trifase_equipamento_modelos (id INTEGER PRIMARY KEY, tipo TEXT, marca TEXT, modelo TEXT, chave TEXT UNIQUE, atualizado_em TEXT)');
        $this->db->query("INSERT INTO trifase_equipamento_modelos VALUES (1, 'placa', 'LG', 'INV12', 'antigo', '2026-01-01')");
        $this->db->query('CREATE TABLE trifase_equipamentos (id INTEGER PRIMARY KEY, modelo_id INTEGER, cliente_id INTEGER, selo TEXT, selo_chave TEXT UNIQUE, serie TEXT, imei TEXT)');
        $this->db->query("INSERT INTO trifase_equipamentos VALUES (1, 1, 1, 'SEL1', 'a', '', '')");
        $this->db->query("INSERT INTO trifase_equipamentos VALUES (2, 1, 2, 'SEL2', 'b', '', '')");
        $m = new class() extends Migration_trifase_cadastros {
            public object $dbforge;
        };
        $m->db = $this->db;
        $m->dbforge = new CI_DB_sqlite3_forge($this->db);
        $m->up();
        $m->up();
        $this->modelo = new Trifase_cadastro_model();
        $this->modelo->db = $this->db;
    }
    public function testClassificacaoPrivadaIdempotenteComHistoricoEConflito(): void
    {
        $antes = $this->db->get('clientes')->result_array();
        $dados = ['categoria' => 'prata', 'orientacoes' => 'Prefere contato por escrito.'];
        $id = $this->modelo->alterar('cliente', 1, $dados, 0, 'Conferido', 7, str_repeat('a', 24));
        $this->assertSame($id, $this->modelo->alterar('cliente', 1, $dados, 0, 'Conferido', 7, str_repeat('a', 24)));
        $this->assertSame('prata', $this->modelo->atual('cliente', 1)['dados']['categoria']);
        $this->assertSame($antes, $this->db->get('clientes')->result_array());
        $this->expectException(DomainException::class);
        $this->modelo->alterar('cliente', 1, ['categoria' => 'ouro', 'orientacoes' => 'Outra revisão'], 0, 'Janela antiga', 8, str_repeat('b', 24));
    }
    public function testCategoriaInvalidaEMotivoVazioNaoGravam(): void
    {
        foreach ([['categoria' => 'problematico', 'orientacoes' => ''], ['categoria' => []], ['categoria' => 'prata', 'clientes_id' => 2]] as $dados) {
            try {
                $this->modelo->alterar('cliente', 1, $dados, 0, 'Motivo', 7, str_repeat('a', 24));
                $this->fail('Aceitou dados inválidos');
            } catch (DomainException $e) {
                $this->assertSame(0, $this->db->count_all('trifase_cadastros_eventos'));
            }
        }
        $this->expectException(DomainException::class);
        $this->modelo->alterar('cliente', 1, ['categoria' => 'ouro'], 0, '', 7, str_repeat('a', 24));
    }
    public function testCorrecaoUnidadeNaoTransfereClienteNemAlteraModelo(): void
    {
        $this->modelo->alterar('unidade', 1, ['selo' => 'CORRIGIDO', 'serie' => '123', 'imei' => ''], 0, 'Erro de digitação conferido no equipamento', 7, str_repeat('a', 24));
        $unidade = $this->db->where('id', 1)->get('trifase_equipamentos')->row();
        $this->assertSame('CORRIGIDO', $unidade->selo);
        $this->assertSame(1, (int) $unidade->cliente_id);
        $this->assertSame(1, (int) $unidade->modelo_id);
        $evento = $this->modelo->historico('unidade', 1)[0];
        $this->assertSame('SEL1', json_decode($evento->antes, true)['selo']);
    }
    public function testSeloDuplicadoNaoGravaCorrecao(): void
    {
        $this->modelo->alterar('unidade', 1, ['selo' => ' Sel X ', 'serie' => '', 'imei' => ''], 0, 'Conferência', 7, str_repeat('a', 24));
        try {
            $this->modelo->alterar('unidade', 2, ['selo' => 'selx', 'serie' => '', 'imei' => ''], 0, 'Conferência', 7, str_repeat('b', 24));
            $this->fail('Aceitou selo duplicado');
        } catch (DomainException $e) {
            $this->assertSame('SEL2', $this->db->where('id', 2)->get('trifase_equipamentos')->row()->selo);
            $this->assertCount(1, $this->modelo->historico('unidade', 1));
        }
    }
    public function testAlteracaoModeloPreservaUnidadesEGuardaAntesDepois(): void
    {
        $antes = $this->db->get('trifase_equipamentos')->result_array();
        $id = $this->modelo->alterar('modelo', 1, ['tipo' => 'placa', 'marca' => 'LG', 'modelo' => 'INV-12'], 0, 'Nome conferido', 7, str_repeat('a', 24));
        $this->assertSame('INV-12', $this->db->get('trifase_equipamento_modelos')->row()->modelo);
        $this->assertSame($antes, $this->db->get('trifase_equipamentos')->result_array());
        $this->assertGreaterThan(0, $id);
    }
    public function testProtecaoDeHistoricoDoClienteIndependeDaFlagVisual(): void
    {
        $_ENV['TRIFASE_CADASTROS_ENABLED'] = 'false';
        try {
            $this->assertTrue(trifaseClienteTemHistoricoProtegido($this->db, 1));
            $this->assertTrue(trifaseClienteTemHistoricoProtegido($this->db, 2));
            $this->assertFalse(trifaseClienteTemHistoricoProtegido($this->db, 3));
        } finally {
            unset($_ENV['TRIFASE_CADASTROS_ENABLED']);
        }
    }

}
