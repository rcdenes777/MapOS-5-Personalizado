<?php

require_once APPPATH . 'models/Trifase_painel_model.php';
require_once APPPATH . 'models/Trifase_financeiro_model.php';
require_once APPPATH . 'controllers/Mapos.php';
require_once APPPATH . 'models/Os_model.php';

final class TrifasePainelTest extends MaposTestCase
{
    private array $env;
    private Trifase_painel_model $model;

    protected function setUp(): void
    {
        parent::setUp();
        $this->env = $_ENV;
        foreach (['UI_PILOTO', 'FINANCEIRO', 'RETORNOS', 'ENTREGAS'] as $flag) {
            $_ENV['TRIFASE_' . $flag . '_ENABLED'] = 'true';
        }
        $this->db->query('CREATE TABLE os (idOs INTEGER PRIMARY KEY, status TEXT, dataFinal TEXT, descricaoProduto TEXT, clientes_id INTEGER, usuarios_id INTEGER)');
        $this->db->query('CREATE TABLE usuarios (idUsuarios INTEGER PRIMARY KEY, nome TEXT)');
        $this->db->query('CREATE TABLE clientes (idClientes INTEGER PRIMARY KEY, nomeCliente TEXT)');
        $this->db->query('CREATE TABLE trifase_entregas_estado (os_id INTEGER PRIMARY KEY, evento_id INTEGER)');
        $this->db->query('CREATE TABLE trifase_garantia_retornos (os_id INTEGER PRIMARY KEY)');
        $this->db->query('CREATE TABLE trifase_garantia_eventos (id INTEGER PRIMARY KEY, os_id INTEGER, tipo TEXT, cobertura TEXT)');
        $this->db->query('CREATE TABLE trifase_financeiro_obrigacoes (os_id INTEGER PRIMARY KEY, bruto_c INTEGER, desconto_c INTEGER)');
        $this->db->query('CREATE TABLE trifase_financeiro_eventos (os_id INTEGER, tipo TEXT, valor_c INTEGER)');
        $this->db->query('CREATE TABLE trifase_garantia_reembolsos (origem_id INTEGER, valor_c INTEGER, credito_c INTEGER, cancelado_id INTEGER)');
        foreach ([1 => 'Aberto', 2 => 'Aguardando Peças', 3 => 'Orçamento', 4 => 'Negociação', 5 => 'Finalizado', 6 => 'Finalizado', 7 => 'Finalizado', 8 => 'Cancelado', 9 => 'Aberto', 10 => 'Em Andamento', 11 => 'Em Andamento', 12 => 'Finalizado', 13 => 'Aberto'] as $id => $status) {
            $this->db->insert('os', ['idOs' => $id, 'status' => $status, 'dataFinal' => $id === 4 ? null : '2026-11-' . str_pad((string) $id, 2, '0', STR_PAD_LEFT), 'descricaoProduto' => 'Placa <script>x</script>']);
        }
        $this->db->insert('trifase_entregas_estado', ['os_id' => 6, 'evento_id' => 50]);
        foreach ([9, 10, 11, 12, 13] as $id) {
            $this->db->insert('trifase_garantia_retornos', ['os_id' => $id]);
        }
        foreach ([[1, 10, 'coberto'], [2, 11, 'coberto'], [3, 11, 'avaliacao'], [4, 13, 'avaliacao'], [5, 13, 'nao_coberto']] as $e) {
            $this->db->insert('trifase_garantia_eventos', ['id' => $e[0], 'os_id' => $e[1], 'tipo' => 'avaliar', 'cobertura' => $e[2]]);
        }
        $this->model = new Trifase_painel_model();
        $this->model->db = $this->db;
    }

    protected function tearDown(): void
    {
        $_ENV = $this->env;
        parent::tearDown();
    }

    public function testFilasDoPainelConferemComMesmaConsultaDaListagem(): void
    {
        $esperados = ['andamento' => [1, 2, 9, 10, 11, 13], 'orcamentos' => [3, 4], 'retirada' => [5, 7, 12], 'retornos' => [9, 11]];
        $painel = $this->model->operacional();
        foreach ($esperados as $fila => $ids) {
            $this->assertSame(count($ids), $painel['filas'][$fila]['total'], $fila);
            $lista = $this->makeInstance(Os_model::class);
            $lista->db = $this->db;
            $this->assertSame(count($ids), $lista->contar(['fila' => $fila], ['Cancelado']));
            $this->db->select('os.idOs')->from('os');
            Trifase_os_fila::aplicar($this->db, $fila);
            $this->assertSame($ids, array_map('intval', array_column($this->db->order_by('idOs')->get()->result_array(), 'idOs')));
        }
        $this->assertSame([5, 7, 12], array_map(static fn ($o) => (int) $o->idOs, $painel['retirada']));
        $this->assertCount(6, $painel['atencao']);
        $this->assertSame(1, (int) $painel['atencao'][0]->idOs);
    }

    public function testRecusasContamSomenteVersaoAtivaSemCancelarOS(): void
    {
        $_ENV['TRIFASE_ORCAMENTOS_ENABLED'] = 'true';
        $this->db->query('CREATE TABLE trifase_orcamento_estado (os_id INTEGER PRIMARY KEY, versao_id INTEGER, ativo INTEGER)');
        $this->db->query('CREATE TABLE trifase_orcamento_eventos (os_id INTEGER, decisao_versao INTEGER, tipo TEXT)');
        foreach ([[1, 10, 1], [2, 20, 1], [3, 30, 0], [4, 40, 1], [8, 80, 1]] as $e) {
            $this->db->insert('trifase_orcamento_estado', array_combine(['os_id', 'versao_id', 'ativo'], $e));
        }
        foreach ([[1, 10, 'recusar'], [2, 19, 'recusar'], [3, 30, 'recusar'], [4, 40, 'aprovar'], [8, 80, 'recusar']] as $e) {
            $this->db->insert('trifase_orcamento_eventos', array_combine(['os_id', 'decisao_versao', 'tipo'], $e));
        }
        $antes = $this->db->get('os')->result_array();
        $this->assertSame(1, $this->model->resumoOperacional()['filas']['recusados']['total']);
        $lista = $this->makeInstance(Os_model::class);
        $lista->db = $this->db;
        $this->assertSame(1, $lista->contar(['fila' => 'recusados'], []));
        $this->assertSame($antes, $this->db->get('os')->result_array());
        $this->db->where('os_id', 1)->update('trifase_orcamento_estado', ['versao_id' => 11]);
        $this->assertSame(0, $this->model->resumoOperacional()['filas']['recusados']['total']);
        $_ENV['TRIFASE_ORCAMENTOS_ENABLED'] = 'false';
        $this->assertArrayNotHasKey('recusados', Trifase_os_fila::opcoes($this->db));
    }

    public function testEntregaCorrigidaVoltaParaFilaSemAlterarStatusOuFinanceiro(): void
    {
        $antes = $this->db->get('os')->result_array();
        $this->db->where('os_id', 6)->delete('trifase_entregas_estado');
        $this->assertSame(4, $this->model->operacional()['filas']['retirada']['total']);
        $this->assertSame($antes, $this->db->get('os')->result_array());
        $this->assertSame(0, $this->db->count_all('trifase_financeiro_eventos'));
    }

    public function testSaldoDoPainelECanonicoInclusiveEstornosCreditosECorrecoes(): void
    {
        foreach ([1 => [50000, 20000], 2 => [20000, 20000], 5 => [50000, 20000], 7 => [30000, 15000], 9 => [10000, 10000]] as $id => [$bruto, $recebido]) {
            $this->db->insert('trifase_financeiro_obrigacoes', ['os_id' => $id, 'bruto_c' => $bruto, 'desconto_c' => 0]);
            $this->db->insert('trifase_financeiro_eventos', ['os_id' => $id, 'tipo' => 'receber', 'valor_c' => $recebido]);
        }
        $this->db->insert('trifase_financeiro_eventos', ['os_id' => 9, 'tipo' => 'estornar', 'valor_c' => 10000]);
        foreach ([[5, 20000, 50000, null], [7, 5000, 5000, null], [1, 20000, 50000, 1]] as $r) {
            $this->db->insert('trifase_garantia_reembolsos', array_combine(['origem_id', 'valor_c', 'credito_c', 'cancelado_id'], $r));
        }
        $f = new Trifase_financeiro_model();
        $f->db = $this->db;
        $saldos = array_filter($f->resumos(range(1, 13)), static fn ($r) => $r['saldo_c'] > 0);
        $this->assertSame(['quantidade' => count($saldos), 'saldo_c' => array_sum(array_column($saldos, 'saldo_c'))], $this->model->financeiroOs());
        $this->assertSame(['quantidade' => 3, 'saldo_c' => 55000], $this->model->financeiroOs());
    }

    public function testFlagsETabelasAusentesNaoInventamFilasOuValores(): void
    {
        $_ENV['TRIFASE_RETORNOS_ENABLED'] = 'false';
        $_ENV['TRIFASE_ENTREGAS_ENABLED'] = 'false';
        $this->assertSame(['andamento', 'orcamentos'], array_keys($this->model->operacional()['filas']));
        $_ENV['TRIFASE_FINANCEIRO_ENABLED'] = 'false';
        $this->assertNull($this->model->financeiroOs());
        $_ENV['TRIFASE_FINANCEIRO_ENABLED'] = 'true';
        $this->db->query('DROP TABLE trifase_financeiro_obrigacoes');
        $this->assertNull($this->model->financeiroOs());
    }

    public function testDatasLegadasZeradasFicamNoFimSemConfundirPrevisaoComConclusao(): void
    {
        $this->db->where_not_in('idOs', [1, 2, 4])->update('os', ['status' => 'Finalizado']);
        $this->db->where('idOs', 4)->update('os', ['dataFinal' => '0000-00-00']);
        $lista = $this->model->operacional()['atencao'];
        $this->assertSame([1, 2, 4], array_map(static fn ($o) => (int) $o->idOs, $lista));
    }

    public function testPainelVazioMostraEstadosVaziosENaoInventados(): void
    {
        $this->db->empty_table('os');
        $dados = $this->dados();
        $this->assertSame([0, 0, 0, 0], array_column($dados['operacional']['filas'], 'total'));
        $html = $this->renderizar($dados);
        $this->assertStringContainsString('Nenhum atendimento em aberto', $html);
        $this->assertStringContainsString('Nenhuma retirada pendente', $html);
        $this->assertSame(['quantidade' => 0, 'saldo_c' => 0], $this->model->financeiroOs());
    }

    private function renderizar(array $dados): string
    {
        extract($dados);
        ob_start();
        try {
            include APPPATH . 'views/trifase/painel.php';
            return (string) ob_get_contents();
        } finally {
            ob_end_clean();
        }
    }

    private function dados(): array
    {
        return ['hoje' => '2026-11-03', 'pode' => ['os' => true, 'lancamentos' => true], 'operacional' => $this->model->operacional(), 'financeiro_os' => ['quantidade' => 3, 'saldo_c' => 55000], 'recebido_mes' => 1234.56, 'atalhos' => [], 'avisos_sistema' => [], 'instalador_no_servidor' => false];
    }

    public function testViewEscapaCamposPreservaDinheiroEOfereceAtalhosExatos(): void
    {
        $html = $this->renderizar($this->dados());
        $this->assertStringNotContainsString('<script>x</script>', $html);
        foreach (['andamento', 'orcamentos', 'retirada', 'retornos'] as $fila) {
            $this->assertStringContainsString('?fila=' . $fila, $html);
        }
        $this->assertStringContainsString('R$ 550,00', $html);
        $this->assertStringContainsString('data-valores-alternar', $html);
        $this->assertStringContainsString('?visao=classica', $html);
        $this->assertStringNotContainsString('data-agenda=', $html);
    }

    public function testViewSemPermissoesNaoExpoeDinheiroNemOrdens(): void
    {
        $d = $this->dados();
        $d['pode'] = ['os' => false, 'lancamentos' => false];
        $d['operacional'] = null;
        $d['financeiro_os'] = null;
        $html = $this->renderizar($d);
        $this->assertStringNotContainsString('R$', $html);
        $this->assertStringNotContainsString('data-valores-alternar', $html);
        $this->assertStringNotContainsString('Precisam de atenção', $html);
        $this->assertStringNotContainsString('Saldo das OS', $html);
    }

    public function testControllerNaoConsultaModulosNegadosNemOfereceAtalhos(): void
    {
        $c = new class() extends Mapos {
            public $data = [];
            public object $load;
            public object $painel_trifase;
            public object $permission;
            public object $session;
            public function __construct()
            {
                $this->load = new class() {
                    public function model(...$args)
                    {
                        throw new RuntimeException('Consulta de módulo sem permissão');
                    }
                    public function helper(...$args)
                    {
                    }
                };
                $this->painel_trifase = new class() {
                    public function operacional()
                    {
                        throw new RuntimeException('Consulta de OS indevida');
                    }
                    public function financeiroOs()
                    {
                        throw new RuntimeException('Consulta financeira indevida');
                    }
                };
                $this->permission = new class() {
                    public function checkPermission(...$args)
                    {
                        return false;
                    }
                };
                $this->session = new class() {
                    public function userdata($key)
                    {
                        return null;
                    }
                };
            }
            public function layout()
            {
                return $this->data;
            }
        };
        $r = $c->index();
        $this->assertSame('mapos/painel', $r['view']);
        $this->assertFalse($r['pode']['os']);
        $this->assertFalse($r['pode']['lancamentos']);
        $this->assertFalse($r['pode']['balanco']);
        $this->assertArrayNotHasKey('mes', $r);
        $this->assertArrayNotHasKey('operacional_classico', $r);
    }
}
