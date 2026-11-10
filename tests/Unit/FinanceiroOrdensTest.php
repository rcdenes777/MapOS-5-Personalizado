<?php

require_once APPPATH . 'controllers/Financeiro.php';

final class FinanceiroOrdensTest extends MaposTestCase
{
    public function testRotaExigeAsMesmasDuasPermissoesDoFinanceiroDaOs(): void
    {
        foreach ([[], ['vOs'], ['vLancamento']] as $permissoes) {
            $c = new class($permissoes) extends Financeiro {
                public object $permission;
                public object $session;
                public function __construct(array $permissoes)
                {
                    $this->permission = new class($permissoes) {
                        public function __construct(private array $permissoes)
                        {
                        }
                        public function checkPermission($perfil, $nome)
                        {
                            return in_array($nome, $this->permissoes, true);
                        }
                    };
                    $this->session = new class() {
                        public function userdata($key)
                        {
                            return null;
                        }
                    };
                }
            };
            try {
                $c->ordens();
                $this->fail('Consulta financeira deveria ser recusada antes de carregar os modelos.');
            } catch (RuntimeException $e) {
                $this->assertStringContainsString('permissão', $e->getMessage());
            }
        }
    }

    public function testFiltrosFinanceirosSaoValidadosSemConfiarNaQuery(): void
    {
        $c = new class() extends Financeiro {
            public object $input;
            public function __construct()
            {
                $this->input = new class() {
                    public function get()
                    {
                        return ['financeiro' => 'parcial', 'saldo' => 'pendente', 'status' => 'Finalizado', 'de' => 'data inválida', 'ate' => '2026-11-10', 'vencimento_de' => 'inválida', 'vencimento_ate' => '2026-12-10', 'fila' => ['retirada'], 'outro' => 'injetado'];
                    }
                };
            }
        };
        $this->assertSame(['status' => 'Finalizado', 'financeiro' => 'parcial', 'pendencia' => 'receber', 'vencimento_ate' => '2026-12-10'], $this->invokeMethod($c, 'filtrosDasOrdens'));
    }
    public function testPendenciaEVencimentoUsamCobrancaSemConfundirDataDaOs(): void
    {
        $antes = $_ENV;
        $_ENV['TRIFASE_FINANCEIRO_ENABLED'] = 'true';
        try {
            $this->db->query('CREATE TABLE os (idOs INTEGER PRIMARY KEY, status TEXT, faturado INTEGER)');
            $this->db->query('CREATE TABLE trifase_financeiro_obrigacoes (os_id INTEGER, bruto_c INTEGER, desconto_c INTEGER, vencimento TEXT)');
            $this->db->query('CREATE TABLE trifase_financeiro_eventos (os_id INTEGER, tipo TEXT, valor_c INTEGER)');
            $this->db->query('CREATE TABLE trifase_cancelamentos (id INTEGER PRIMARY KEY, os_id INTEGER, tipo TEXT)');
            foreach ([1 => 200, 2 => 700, 3 => 500, 4 => 0, 5 => null, 6 => null] as $id => $recebido) {
                $this->db->insert('os', ['idOs' => $id, 'status' => $id === 6 ? 'Cancelado' : 'Finalizado', 'faturado' => 0]);
                if ($recebido !== null) {
                    $this->db->insert('trifase_financeiro_obrigacoes', ['os_id' => $id, 'bruto_c' => 500, 'desconto_c' => 0, 'vencimento' => $id === 1 ? '2026-12-10' : '2026-11-10']);
                    $this->db->insert('trifase_financeiro_eventos', ['os_id' => $id, 'tipo' => 'receber', 'valor_c' => $recebido]);
                }
            }
            $this->db->insert('trifase_cancelamentos', ['id' => 1, 'os_id' => 4, 'tipo' => 'solicitar']);
            $this->db->insert('trifase_cancelamentos', ['id' => 2, 'os_id' => 6, 'tipo' => 'confirmar']);
            foreach (['receber' => [1], 'devolver' => [2], 'nenhuma' => [3, 6], 'cancelamento' => [4]] as $pendencia => $ids) {
                $this->db->select('os.idOs')->from('os');
                Trifase_financeiro_busca::aplicar($this->db, ['pendencia' => $pendencia]);
                $this->assertSame($ids, array_map('intval', array_column($this->db->order_by('os.idOs')->get()->result_array(), 'idOs')));
            }
            $this->db->select('os.idOs')->from('os');
            Trifase_financeiro_busca::aplicar($this->db, ['vencimento_de' => '2026-12-01', 'vencimento_ate' => '2026-12-31']);
            $this->assertSame([1], array_map('intval', array_column($this->db->get()->result_array(), 'idOs')));
        } finally {
            $_ENV = $antes;
        }
    }
}
