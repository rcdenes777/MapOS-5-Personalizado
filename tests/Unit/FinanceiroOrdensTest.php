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
                        return ['financeiro' => 'parcial', 'saldo' => 'pendente', 'status' => 'Finalizado', 'de' => 'data inválida', 'ate' => '2026-11-10', 'fila' => ['retirada'], 'outro' => 'injetado'];
                    }
                };
            }
        };
        $this->assertSame(['status' => 'Finalizado', 'financeiro' => 'parcial', 'saldo' => 'pendente', 'ate' => '2026-11-10'], $this->invokeMethod($c, 'filtrosDasOrdens'));
    }
}
