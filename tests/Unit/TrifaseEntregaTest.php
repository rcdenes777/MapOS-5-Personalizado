<?php

require_once APPPATH . 'models/Trifase_entrega_model.php';
require_once APPPATH . 'helpers/trifase_entrega_helper.php';
require_once APPPATH . 'database/migrations/20261102000000_trifase_entregas.php';
require_once BASEPATH . 'database/DB_forge.php';
require_once BASEPATH . 'database/drivers/sqlite3/sqlite3_forge.php';

final class TrifaseEntregaTest extends MaposTestCase
{
    private Trifase_entrega_model $modelo;

    protected function setUp(): void
    {
        parent::setUp();
        $this->db->query('CREATE TABLE os (idOs INTEGER PRIMARY KEY, dataInicial TEXT, status TEXT, descricaoProduto TEXT, garantia INTEGER, faturado INTEGER)');
        $this->db->insert('os', ['idOs' => 1, 'dataInicial' => '2020-01-01', 'status' => 'Finalizado', 'descricaoProduto' => 'Placa inverter', 'garantia' => 90, 'faturado' => 1]);
        $this->db->insert('os', ['idOs' => 2, 'dataInicial' => '2020-01-01', 'status' => 'Em Andamento', 'descricaoProduto' => 'Outra placa', 'garantia' => 0, 'faturado' => 0]);
        $m = new class() extends Migration_trifase_entregas {
            public object $dbforge;
        };
        $m->db = $this->db;
        $m->dbforge = new CI_DB_sqlite3_forge($this->db);
        $m->up();
        $m->up();
        $this->modelo = new Trifase_entrega_model();
        $this->modelo->db = $this->db;
    }

    private function dados(): array
    {
        return ['recebedor' => 'Cliente de teste', 'entregue_em' => date('Y-m-d\TH:i', time() - 120),
            'itens' => 'Placa e dissipador', 'observacoes' => 'Nota interna privada', 'terceiro' => '0',
            'autorizacao' => '', 'confirmou_condicoes' => '1'];
    }

    private function chave(string $s): string
    {
        return str_pad($s, 24, '_');
    }

    public function testRetiradaReenvioECorrecaoPreservamOriginalEOs(): void
    {
        $antes = $this->db->where('idOs', 1)->get('os')->row_array();
        $dados = $this->dados();
        $id = $this->modelo->registrar(1, $dados, 7, $this->chave('registrar'));
        $original = $this->db->where('id', $id)->get('trifase_entregas_eventos')->row_array();
        $this->assertSame($id, $this->modelo->registrar(1, $dados, 7, $this->chave('registrar')));
        $this->assertSame(1, $this->db->count_all('trifase_entregas_eventos'));
        $this->assertSame($id, (int) $this->modelo->ativa(1)->id);
        $cancelamento = $this->modelo->cancelar(1, $id, 'Recebedor informado incorretamente', 8, $this->chave('cancelar'));
        $this->assertSame($cancelamento, $this->modelo->cancelar(1, $id, 'Recebedor informado incorretamente', 8, $this->chave('cancelar')));
        $this->assertNull($this->modelo->ativa(1));
        $this->assertSame($original, $this->db->where('id', $id)->get('trifase_entregas_eventos')->row_array());
        $novo = $this->modelo->registrar(1, $dados, 8, $this->chave('nova-entrega'));
        $this->assertNotSame($id, $novo);
        $this->assertCount(3, $this->modelo->historico(1));
        $this->assertSame($antes, $this->db->where('idOs', 1)->get('os')->row_array());
        $this->assertTrue(trifaseEntregaTemHistorico($this->db, 1));
    }

    public function testSegundaEntregaAtivaEChaveReutilizadaComDadosDiferentesSaoRecusadas(): void
    {
        $dados = $this->dados();
        $this->modelo->registrar(1, $dados, 7, $this->chave('uma-entrega'));
        foreach ([[$dados, $this->chave('outra-chave')], [array_replace($dados, ['recebedor' => 'Outro']), $this->chave('uma-entrega')]] as [$post, $chave]) {
            try {
                $this->modelo->registrar(1, $post, 7, $chave);
                $this->fail('Aceitou entrega duplicada ou chave conflitante');
            } catch (DomainException $e) {
                $this->assertSame(1, $this->db->count_all('trifase_entregas_eventos'));
            }
        }
    }

    public function testTerceiroExigeAutorizacaoEConfirmacaoDeCondicoes(): void
    {
        foreach ([['terceiro' => '1', 'autorizacao' => ''], ['confirmou_condicoes' => '0'], ['terceiro' => 'sim'], ['entregue_em' => '2039-01-01T12:00'], ['entregue_em' => "2026-01-01T12:\0"], ['recebedor' => []]] as $invalido) {
            try {
                $this->modelo->registrar(1, array_replace($this->dados(), $invalido), 7, $this->chave('invalida'));
                $this->fail('Aceitou dados inválidos de retirada');
            } catch (DomainException $e) {
                $this->assertSame(0, $this->db->count_all('trifase_entregas_eventos'));
            }
        }
        $id = $this->modelo->registrar(1, array_replace($this->dados(), ['terceiro' => '1', 'autorizacao' => 'Cliente confirmou pelo WhatsApp.']), 7, $this->chave('terceiro'));
        $this->assertSame($id, (int) $this->modelo->ativa(1)->id);
    }

    public function testComprovanteConfereOsEOmiteInformacoesInternas(): void
    {
        $id = $this->modelo->registrar(1, $this->dados(), 7, $this->chave('comprovante'));
        $this->assertNull($this->modelo->comprovante(2, $id));
        $this->assertNull($this->modelo->comprovante(1, 999999));
        $r = $this->modelo->comprovante(1, $id);
        $this->assertNull($r['cancelamento']);
        foreach (['observacoes', 'autorizacao', 'operacao', 'payload_hash'] as $campo) {
            $this->assertObjectNotHasProperty($campo, $r['evento']);
        }
        $cancelamento = $this->modelo->cancelar(1, $id, 'Correção privada', 7, $this->chave('cancelar-doc'));
        $r = $this->modelo->comprovante(1, $id);
        $this->assertSame($cancelamento, (int) $r['cancelamento']->id);
        $this->assertObjectNotHasProperty('motivo', $r['cancelamento']);
        $this->assertNull($this->modelo->comprovante(1, $cancelamento));
    }

    public function testNaoCancelaEntregaDeOutraOsNemDataAnteriorAEntrada(): void
    {
        $id = $this->modelo->registrar(1, $this->dados(), 7, $this->chave('outra-os'));
        try {
            $this->modelo->cancelar(2, $id, 'Motivo de teste', 7, $this->chave('cancelar-outra'));
            $this->fail('Aceitou referência de outra OS');
        } catch (DomainException $e) {
            $this->assertSame($id, (int) $this->modelo->ativa(1)->id);
        }
        $this->expectException(DomainException::class);
        $this->modelo->registrar(2, array_replace($this->dados(), ['entregue_em' => '2019-12-31T12:00']), 7, $this->chave('antes-entrada'));
    }

    public function testFalhaNaProjecaoDesfazEventoInteiro(): void
    {
        $this->db->query("CREATE TRIGGER recusar_entrega BEFORE INSERT ON trifase_entregas_estado BEGIN SELECT RAISE(ABORT, 'falha controlada'); END");
        $this->db->db_debug = false;
        try {
            @$this->modelo->registrar(1, $this->dados(), 7, $this->chave('falha-projecao'));
            $this->fail('Confirmou uma entrega cuja projeção falhou');
        } catch (RuntimeException $e) {
            $this->assertSame(0, $this->db->count_all('trifase_entregas_eventos'));
            $this->assertNull($this->modelo->ativa(1));
        }
    }

    public function testEsquemaNaoConverteRegistrosNemPermiteDownDestrutivo(): void
    {
        $this->assertSame(0, $this->db->count_all('trifase_entregas_eventos'));
        $this->assertSame(2, $this->db->count_all('os'));
        $this->expectException(RuntimeException::class);
        $this->makeInstance(Migration_trifase_entregas::class)->down();
    }
}
