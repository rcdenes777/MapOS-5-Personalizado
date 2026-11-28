<?php

require_once APPPATH . 'helpers/trifase_financeiro_helper.php';
require_once APPPATH . 'controllers/Mine.php';
require_once APPPATH . 'controllers/Publico_cliente.php';
require_once APPPATH . 'controllers/Os.php';

final class PortalFinanceiroDisponibilidadeTest extends MaposTestCase
{
    public function testImpressaoNaoConsultaFinanceiroSemTabelaDeEventos(): void
    {
        $anterior = $_ENV['TRIFASE_FINANCEIRO_ENABLED'] ?? null;
        $entregas = $_ENV['TRIFASE_ENTREGAS_ENABLED'] ?? null;
        $_ENV['TRIFASE_FINANCEIRO_ENABLED'] = 'true';
        $_ENV['TRIFASE_ENTREGAS_ENABLED'] = 'false';
        try {
            $this->db->query('CREATE TABLE trifase_financeiro_obrigacoes (os_id INTEGER PRIMARY KEY)');
            $controle = new class() extends Os {
                public $db;
                public $load;
                public $financeiro_impressao;
                public function __construct()
                {
                }
            };
            $controle->db = $this->db;
            $controle->load = new class() {
                public function model($nome, $alias): void
                {
                }
            };
            $controle->financeiro_impressao = new class() {
                public function resumoCliente($id): array
                {
                    return ['total_c' => 100];
                }
            };
            $metodo = new ReflectionMethod(Os::class, 'dadosDaImpressao');
            $this->assertNull($metodo->invoke($controle, 1)['financeiroImpressao']);
            $this->db->query('CREATE TABLE trifase_financeiro_eventos (id INTEGER PRIMARY KEY)');
            $this->db->data_cache = [];
            $this->assertSame(['total_c' => 100], $metodo->invoke($controle, 1)['financeiroImpressao']);
        } finally {
            if ($anterior === null) {
                unset($_ENV['TRIFASE_FINANCEIRO_ENABLED']);
            } else {
                $_ENV['TRIFASE_FINANCEIRO_ENABLED'] = $anterior;
            }
            if ($entregas === null) {
                unset($_ENV['TRIFASE_ENTREGAS_ENABLED']);
            } else {
                $_ENV['TRIFASE_ENTREGAS_ENABLED'] = $entregas;
            }
        }
    }

    public function testPortalPublicoNaoConsultaEventosAusentes(): void
    {
        $anterior = $_ENV['TRIFASE_FINANCEIRO_ENABLED'] ?? null;
        $_ENV['TRIFASE_FINANCEIRO_ENABLED'] = 'true';
        try {
            $this->db->query('CREATE TABLE trifase_financeiro_obrigacoes (os_id INTEGER PRIMARY KEY)');
            $portal = new class() extends Publico_cliente {
                public $db;
                public function __construct()
                {
                }
            };
            $portal->db = $this->db;
            $financeiro = new ReflectionMethod(Publico_cliente::class, 'financeiro');
            $this->assertNull($financeiro->invoke($portal, [(object) ['idOs' => 1]]));
        } finally {
            if ($anterior === null) {
                unset($_ENV['TRIFASE_FINANCEIRO_ENABLED']);
            } else {
                $_ENV['TRIFASE_FINANCEIRO_ENABLED'] = $anterior;
            }
        }
    }

    public function testPainelNaoApresentaFinanceiroQuandoEventosEstaoAusentes(): void
    {
        $anterior = $_ENV['TRIFASE_FINANCEIRO_ENABLED'] ?? null;
        $_ENV['TRIFASE_FINANCEIRO_ENABLED'] = 'true';
        try {
            $this->db->query('CREATE TABLE trifase_financeiro_obrigacoes (os_id INTEGER PRIMARY KEY)');
            $painel = new class() extends Mine {
                public $db;
                public function __construct()
                {
                }
            };
            $painel->db = $this->db;
            $disponivel = new ReflectionMethod(Mine::class, 'financeiroVisivel');
            $this->assertFalse($disponivel->invoke($painel), 'Sem eventos não se pode calcular pagamentos.');
            $this->db->query('CREATE TABLE trifase_financeiro_eventos (id INTEGER PRIMARY KEY)');
            $this->db->data_cache = [];
            $this->assertTrue($disponivel->invoke($painel));
            $_ENV['TRIFASE_FINANCEIRO_ENABLED'] = 'false';
            $this->assertFalse($disponivel->invoke($painel));
        } finally {
            if ($anterior === null) {
                unset($_ENV['TRIFASE_FINANCEIRO_ENABLED']);
            } else {
                $_ENV['TRIFASE_FINANCEIRO_ENABLED'] = $anterior;
            }
        }
    }
}
