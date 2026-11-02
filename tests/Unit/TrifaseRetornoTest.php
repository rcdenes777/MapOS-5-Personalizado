<?php

require_once APPPATH . 'models/Trifase_retorno_model.php';
require_once APPPATH . 'models/Trifase_atendimento_model.php';
require_once APPPATH . 'models/Trifase_financeiro_model.php';
require_once APPPATH . 'database/migrations/20261102010000_trifase_equipamentos.php';
require_once APPPATH . 'database/migrations/20261102030000_trifase_atendimentos.php';
require_once APPPATH . 'database/migrations/20261102040000_trifase_retornos.php';
require_once BASEPATH . 'database/DB_forge.php';
require_once BASEPATH . 'database/drivers/sqlite3/sqlite3_forge.php';

final class TrifaseRetornoTest extends MaposTestCase
{
    private Trifase_retorno_model $modelo;
    private Trifase_atendimento_model $tecnico;
    protected function setUp(): void
    {
        parent::setUp();
        $this->db->query('CREATE TABLE os (idOs INTEGER PRIMARY KEY AUTOINCREMENT, clientes_id INTEGER, usuarios_id INTEGER, dataInicial TEXT, dataFinal TEXT, descricaoProduto TEXT, defeito TEXT, observacoes TEXT, laudoTecnico TEXT, status TEXT, garantia INTEGER, faturado INTEGER)');
        $this->db->insert('os', ['idOs' => 1, 'clientes_id' => 4, 'usuarios_id' => 7, 'dataInicial' => date('Y-m-d', strtotime('-20 days')), 'dataFinal' => '2099-01-01', 'descricaoProduto' => 'Descrição da origem', 'defeito' => 'Defeito antigo', 'laudoTecnico' => 'Laudo antigo privado', 'observacoes' => 'Observação antiga privada', 'status' => 'Finalizado', 'garantia' => 90, 'faturado' => 0]);
        $this->db->query('CREATE TABLE os_historico (os_id INTEGER, status_anterior TEXT, status_novo TEXT, usuarios_id INTEGER, data_hora TEXT)');
        foreach ([new class() extends Migration_trifase_equipamentos {
            public object $dbforge;
        }, new class() extends Migration_trifase_atendimentos {
            public object $dbforge;
        }, new class() extends Migration_trifase_retornos {
            public object $dbforge;
        }] as $m) {
            $m->db = $this->db;
            $m->dbforge = new CI_DB_sqlite3_forge($this->db);
            $m->up();
            $m->up();
        }
        $eq = new Trifase_equipamento_model();
        $eq->db = $this->db;
        $eq->vincular(1, ['modo' => 'novo', 'tipo' => 'placa', 'marca' => 'LG', 'modelo' => 'INV-12', 'selo' => 'QA-T-001', 'serie' => '', 'imei' => '', 'itens_recebidos' => 'Entrada original', 'estado_entrada' => 'Estado original'], 7, $this->chave('equipamento'));
        $this->tecnico = new Trifase_atendimento_model();
        $this->tecnico->db = $this->db;
        $this->tecnico->registrarConclusao(1, date('Y-m-d', strtotime('-3 days')), 7);
        $this->modelo = new Trifase_retorno_model();
        $this->modelo->db = $this->db;
    }
    private function chave(string $nome): string
    {
        return str_pad($nome, 24, '_');
    }
    private function dados(): array
    {
        return ['defeito' => 'Novo defeito relatado', 'itens_recebidos' => 'Somente a placa', 'estado_entrada' => 'Selo conferido novamente'];
    }
    private function criar(): int
    {
        return $this->modelo->criar(1, $this->dados(), 7, $this->chave('criar'));
    }

    public function testNovaOsReutilizaUnidadeSemCopiarLaudoValoresOuAlterarOrigem(): void
    {
        $antes = $this->db->where('idOs', 1)->get('os')->row();
        $id = $this->criar();
        $this->assertSame($id, $this->modelo->criar(1, array_reverse($this->dados(), true), 7, $this->chave('criar')));
        $novo = $this->db->where('idOs', $id)->get('os')->row();
        $v = $this->modelo->vinculo($id);
        $this->assertSame('Aberto', $novo->status);
        $this->assertSame(0, (int) $novo->faturado);
        $this->assertSame(0, (int) $novo->garantia);
        $this->assertSame('', $novo->laudoTecnico);
        $this->assertSame('', $novo->observacoes);
        $this->assertSame('Novo defeito relatado', $novo->defeito);
        $this->assertSame(1, (int) $v->origem_id);
        $this->assertSame(90, (int) $v->prazo_origem);
        $this->assertSame(1, $this->db->count_all('trifase_equipamentos'));
        $this->assertEquals($antes, $this->db->where('idOs', 1)->get('os')->row());
        $this->assertNull($this->modelo->avaliacao($id));
        try {
            $this->modelo->criar(1, $this->dados(), 7, $this->chave('duplicado'));
            $this->fail('Abriu dois retornos ativos');
        } catch (DomainException $e) {
            $this->assertSame(2, $this->db->count_all('os'));
        }
    }
    public function testAvaliacaoVersionadaNaoReembolsaENaoAceitaRevisaoConcorrente(): void
    {
        $id = $this->criar();
        $dados = ['cobertura' => 'coberto', 'diagnostico' => 'Falha no reparo anterior', 'solucao' => 'devolucao_valor', 'motivo' => 'Decisão humana registrada'];
        $this->modelo->avaliar($id, $dados, 0, 7, $this->chave('avaliar'));
        $a = $this->modelo->avaliacao($id);
        $this->modelo->avaliar($id, array_reverse($dados, true), 0, 7, $this->chave('avaliar'));
        $this->assertSame(1, $this->db->count_all('trifase_garantia_eventos'));
        $this->assertSame('devolucao_valor', $a->solucao);
        try {
            $this->modelo->avaliar($id, $dados, 0, 7, $this->chave('concorrente'));
            $this->fail('Sobrescreveu outra avaliação');
        } catch (DomainException $e) {
            $this->assertSame((int) $a->id, (int) $this->modelo->avaliacao($id)->id);
        }
        $this->modelo->avaliar($id, ['cobertura' => 'nao_coberto', 'diagnostico' => 'Dano novo confirmado', 'solucao' => 'novo_orcamento', 'motivo' => 'Revisão motivada'], (int) $a->id, 7, $this->chave('revisao'));
        $this->assertCount(2, $this->modelo->eventos($id));
        $this->assertSame(0, (int) $this->db->where('idOs', $id)->get('os')->row()->faturado);
    }
    public function testCustosDeclaradosIdempotentesECorrecaoPreservaOriginal(): void
    {
        $id = $this->criar();
        $this->modelo->custo($id, 2550, 30, 'Peça aplicada e bancada', 7, $this->chave('custo'));
        $this->modelo->custo($id, 2550, 30, 'Peça aplicada e bancada', 7, $this->chave('custo'));
        $evento = $this->modelo->eventos($id)[0];
        $this->assertSame(['valor_c' => 2550, 'minutos' => 30], $this->modelo->custos($id));
        $this->modelo->corrigirCusto($id, (int) $evento->id, 'Registro duplicado conferido', 7, $this->chave('corrigir'));
        $this->modelo->corrigirCusto($id, (int) $evento->id, 'Registro duplicado conferido', 7, $this->chave('corrigir'));
        $this->assertSame(['valor_c' => 0, 'minutos' => 0], $this->modelo->custos($id));
        $this->assertCount(2, $this->modelo->eventos($id));
        $this->assertSame(2550, (int) $this->db->where('id', $evento->id)->get('trifase_garantia_eventos')->row()->valor_c);
        $this->expectException(DomainException::class);
        $this->modelo->corrigirCusto($id, (int) $evento->id, 'Outra correção', 7, $this->chave('dupla'));
    }
    public function testNovoRetornoMantemOrigemEPrazoMesmoDepoisDeFinalizarAnterior(): void
    {
        $id = $this->criar();
        $ref = $this->modelo->vinculo($id);
        $this->tecnico->alterarAndamento($id, 'Finalizado', 7);
        $outro = $this->modelo->criar($id, $this->dados(), 7, $this->chave('outro-retorno'));
        $v = $this->modelo->vinculo($outro);
        $this->assertSame(1, (int) $v->origem_id);
        $this->assertSame($id, (int) $v->anterior_id);
        $this->assertSame($ref->vencimento_origem, $v->vencimento_origem);
        $this->assertSame(0, (int) $this->tecnico->conclusao($id)->garantia_dias);
        $this->assertCount(2, $this->modelo->historicoUnidade(1));
    }
    public function testDadosInvalidosNaoCriamOuDecidem(): void
    {
        try {
            $this->modelo->criar(1, array_replace($this->dados(), ['estado_entrada' => '']), 7, $this->chave('sem-estado'));
            $this->fail('Aceitou entrada incompleta');
        } catch (DomainException $e) {
            $this->assertSame(1, $this->db->count_all('os'));
        }
        $id = $this->criar();
        foreach ([['solucao' => []], ['diagnostico' => ''], ['cobertura' => 'avaliacao', 'solucao' => 'troca'], ['motivo' => '']] as $invalido) {
            try {
                $this->modelo->avaliar($id, array_replace(['cobertura' => 'coberto', 'diagnostico' => 'Teste', 'solucao' => '', 'motivo' => 'Teste'], $invalido), 0, 7, $this->chave('invalido'));
                $this->fail('Aceitou avaliação inválida');
            } catch (DomainException $e) {
                $this->assertNull($this->modelo->avaliacao($id));
            }
        }
    }
    public function testFalhaDepoisDeCriarOsEVinculoReverteTudo(): void
    {
        $this->db->db_debug = false;
        $this->db->query("CREATE TRIGGER falhar_retorno BEFORE INSERT ON trifase_garantia_retornos BEGIN SELECT RAISE(FAIL, 'falha retorno'); END");
        set_error_handler(static fn ($nivel, $mensagem) => $mensagem === 'SQLite3::exec(): falha retorno');
        try {
            $this->criar();
            $this->fail('Confirmou retorno incompleto');
        } catch (RuntimeException $e) {
            $this->assertSame(1, $this->db->count_all('os'));
            $this->assertSame(1, $this->db->count_all('trifase_os_equipamentos'));
            $this->assertSame(0, $this->db->count_all('os_historico'));
        } finally {
            restore_error_handler();
        }
    }
    public function testPrazoExpiradoNaoDefineCoberturaEOrigemComRetornoNaoReabre(): void
    {
        $this->db->where('os_id', 1)->update('trifase_atendimentos', ['concluido_em' => '2020-01-01']);
        $id = $this->criar();
        $this->assertSame('2020-03-31', $this->modelo->vinculo($id)->vencimento_origem);
        $this->assertNull($this->modelo->avaliacao($id));
        $this->expectException(DomainException::class);
        $this->tecnico->alterarAndamento(1, 'Em Andamento', 7);
    }

    public function testClienteIncompativelNaoCriaAtendimento(): void
    {
        $this->db->where('idOs', 1)->update('os', ['clientes_id' => 5]);
        try {
            $this->criar();
            $this->fail('Reutilizou unidade de outro cliente');
        } catch (DomainException $e) {
            $this->assertSame(1, $this->db->count_all('os'));
        }
    }

    public function testFinalizarRetornoNaoReiniciaPrazoMesmoComCampoNativoInconsistente(): void
    {
        $id = $this->criar();
        $prazoOriginal = $this->modelo->vinculo($id)->vencimento_origem;
        $this->db->where('idOs', $id)->update('os', ['garantia' => 90]);
        $this->tecnico->alterarAndamento($id, 'Finalizado', 7);
        $this->assertSame(0, (int) $this->tecnico->conclusao($id)->garantia_dias);
        $this->assertSame($prazoOriginal, $this->modelo->vinculo($id)->vencimento_origem);
    }

    public function testOrigemFinanceiraComRetornoPermaneceFechadaMesmoComFlagTecnicaDesligada(): void
    {
        $this->criar();
        $this->db->where('os_id', 1)->delete('trifase_atendimentos');
        $this->db->query('CREATE TABLE trifase_financeiro_obrigacoes (os_id INTEGER, garantia_inicio TEXT)');
        $this->db->insert('trifase_financeiro_obrigacoes', ['os_id' => 1, 'garantia_inicio' => date('Y-m-d', strtotime('-3 days'))]);
        $antes = $_ENV['TRIFASE_ATENDIMENTOS_ENABLED'] ?? null;
        $_ENV['TRIFASE_ATENDIMENTOS_ENABLED'] = 'false';
        $financeiro = new Trifase_financeiro_model();
        $financeiro->db = $this->db;
        try {
            $financeiro->alterarAndamento(1, 'Em Andamento', 7);
            $this->fail('Reabriu origem com retorno pelo caminho financeiro antigo');
        } catch (DomainException $e) {
            $this->assertSame('Finalizado', $this->db->where('idOs', 1)->get('os')->row()->status);
        } finally {
            if ($antes === null) {
                unset($_ENV['TRIFASE_ATENDIMENTOS_ENABLED']);
            } else {
                $_ENV['TRIFASE_ATENDIMENTOS_ENABLED'] = $antes;
            }
        }
    }

}
