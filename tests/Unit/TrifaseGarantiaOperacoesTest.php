<?php
require_once APPPATH . 'models/Trifase_garantia_model.php';
require_once APPPATH . 'models/Trifase_atendimento_model.php';
require_once APPPATH . 'database/migrations/20261102010000_trifase_equipamentos.php';
require_once APPPATH . 'database/migrations/20261102030000_trifase_atendimentos.php';
require_once APPPATH . 'database/migrations/20261102040000_trifase_retornos.php';
require_once APPPATH . 'database/migrations/20261031120000_trifase_financeiro_lab.php';
require_once APPPATH . 'database/migrations/20261031130000_trifase_tecnico_garantia.php';
require_once APPPATH . 'database/migrations/20261102060000_trifase_estoque_custos.php';
require_once APPPATH . 'database/migrations/20261102070000_trifase_garantia_operacoes.php';
require_once BASEPATH . 'database/DB_forge.php';
require_once BASEPATH . 'database/drivers/sqlite3/sqlite3_forge.php';
final class TrifaseGarantiaOperacoesTest extends MaposTestCase
{
    private Trifase_retorno_model $modelo;
    private Trifase_atendimento_model $tecnico;
    private Trifase_garantia_model $g;
    private Trifase_financeiro_model $f;
    private int $id;
    protected function setUp(): void
    {
        parent::setUp();
        $this->db->query('CREATE TABLE os (idOs INTEGER PRIMARY KEY AUTOINCREMENT, clientes_id INTEGER, usuarios_id INTEGER, dataInicial TEXT, dataFinal TEXT, descricaoProduto TEXT, defeito TEXT, observacoes TEXT, laudoTecnico TEXT, status TEXT, garantia INTEGER, faturado INTEGER)');
        $this->db->insert('os', ['idOs' => 1, 'clientes_id' => 4, 'usuarios_id' => 7, 'dataInicial' => date('Y-m-d', strtotime('-20 days')), 'dataFinal' => '2099-01-01', 'descricaoProduto' => 'Descrição da origem', 'defeito' => 'Defeito antigo', 'laudoTecnico' => 'Laudo antigo privado', 'observacoes' => 'Observação antiga privada', 'status' => 'Finalizado', 'garantia' => 90, 'faturado' => 0]);
        $this->db->query('ALTER TABLE os ADD COLUMN lancamento INTEGER');
        $this->db->query('CREATE TABLE lancamentos (idLancamentos INTEGER PRIMARY KEY AUTOINCREMENT, descricao TEXT, valor DECIMAL, desconto DECIMAL, valor_desconto DECIMAL, tipo_desconto TEXT, data_vencimento TEXT, data_pagamento TEXT, baixado INTEGER, clientes_id INTEGER, cliente_fornecedor TEXT, forma_pgto TEXT, tipo TEXT, usuarios_id INTEGER)');
        $this->db->query('CREATE TABLE produtos (idProdutos INTEGER PRIMARY KEY, descricao TEXT, estoque DECIMAL, precoCompra DECIMAL, precoVenda DECIMAL)');
        $this->db->query('CREATE TABLE os_historico (os_id INTEGER, status_anterior TEXT, status_novo TEXT, usuarios_id INTEGER, data_hora TEXT)');
        foreach ([new class() extends Migration_trifase_equipamentos {
            public object $dbforge;
        }, new class() extends Migration_trifase_atendimentos {
            public object $dbforge;
        }, new class() extends Migration_trifase_retornos {
            public object $dbforge;
        }, new class() extends Migration_trifase_financeiro_lab {
            public object $dbforge;
        }, new class() extends Migration_trifase_tecnico_garantia {
            public object $dbforge;
        }, new class() extends Migration_trifase_estoque_custos {
            public object $dbforge;
        }, new class() extends Migration_trifase_garantia_operacoes {
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
        $this->g = new Trifase_garantia_model();
        $this->g->db = $this->db;
        $this->f = new Trifase_financeiro_model();
        $this->f->db = $this->db;
        $this->f->formalizar(1, 50000, 0, date('Y-m-d'), 7);
        $this->f->receber(1, 20000, date('Y-m-d'), 'Pix', $this->chave('recebimento'), 7);
        $this->id = $this->modelo->criar(1, ['defeito'=>'Falha retornou','itens_recebidos'=>'Placa','estado_entrada'=>'Conferida'], 7, $this->chave('retorno'));

    }
    private function chave(string $s): string
    {
        return str_pad($s, 24, '_');
    }
    private function avaliar(string $s): int
    {
        $this->modelo->avaliar($this->id, ['cobertura'=>'coberto','diagnostico'=>'Falha confirmada','solucao'=>$s,'motivo'=>'Conferido'], 0, 7, $this->chave('avaliar'));
        return (int) $this->modelo->avaliacao($this->id)->id;
    }
    private function devolver(string $modo, int $valor, string $key): int
    {
        return $this->g->reembolsar($this->id, ['modo'=>$modo,'valor_c'=>$valor,'data'=>date('Y-m-d'),'forma'=>'Pix','referencia'=>'Comprovante fictício','motivo'=>'Acordo de garantia'], (int)$this->modelo->avaliacao($this->id)->id, $this->g->financeiroHash($this->f->resumo(1)), 7, $this->chave($key));
    }
    private function troca(string $origem='externa'): array
    {
        return ['origem'=>$origem,'produto_id'=>$origem==='estoque'?'1':'','modelo_id'=>'','tipo'=>'placa','marca'=>'LG','modelo'=>'INV-12','selo'=>'SUBSTITUTA','serie'=>'','imei'=>'','destino_antiga'=>'retida_assistencia','custo_externo'=>'30.00','motivo'=>'Falha recorrente'];
    }
    public function testParcialETotalPreservamOriginalECaixaEAbatemSemNovaDivida(): void
    {
        $this->avaliar('devolucao_valor');
        $original=$this->db->get('trifase_financeiro_obrigacoes')->result_array();
        $recebimentos=$this->db->get('trifase_financeiro_eventos')->result_array();
        $this->devolver('parcial', 5000, 'parcial');
        $r=$this->f->resumo(1);
        $this->assertSame(45000, $r['total_c']);
        $this->assertSame(15000, $r['recebido_c']);
        $this->assertSame(30000, $r['saldo_c']);
        $this->assertSame($r, $this->f->resumos([1])[1]);
        $this->devolver('total', 15000, 'total');
        $r=$this->f->resumo(1);
        $this->assertSame(0, $r['saldo_c']);
        $this->assertSame(0, $r['recebido_c']);
        $this->assertSame(0, $r['total_c']);
        $this->assertSame(50000, $r['abatimento_garantia_c']);
        $this->assertSame(20000, $r['reembolsado_c']);
        $this->assertSame($original, $this->db->get('trifase_financeiro_obrigacoes')->result_array());
        $this->assertSame($recebimentos, $this->db->get('trifase_financeiro_eventos')->result_array());
        $this->assertSame(2, $this->db->where('tipo', 'despesa')->where('baixado', 1)->count_all_results('lancamentos'));
        $this->assertSame(1, $this->db->count_all('trifase_financeiro_obrigacoes'));
    }
    public function testReenvioMesmaOperacaoNaoDuplicaEDiferenteERejeitado(): void
    {
        $a=$this->avaliar('devolucao_valor');
        $hash=$this->g->financeiroHash($this->f->resumo(1));
        $d=['modo'=>'parcial','valor_c'=>5000,'data'=>date('Y-m-d'),'forma'=>'Pix','referencia'=>'Teste','motivo'=>'Teste'];
        $id=$this->g->reembolsar($this->id, $d, $a, $hash, 7, $this->chave('reenvio'));
        $this->assertSame($id, $this->g->reembolsar($this->id, array_reverse($d, true), $a, $hash, 7, $this->chave('reenvio')));
        $this->assertSame(1, $this->db->count_all('trifase_garantia_reembolsos'));
        $d['valor_c']=6000;
        $this->expectException(DomainException::class);
        $this->g->reembolsar($this->id, $d, $a, $hash, 7, $this->chave('reenvio'));
    }
    public function testRecusaExcessoEMantemEstado(): void
    {
        $this->avaliar('devolucao_valor');
        $antes=$this->f->resumo(1);
        try {
            $this->devolver('parcial', 20001, 'excesso');
            $this->fail('Aceitou excesso');
        } catch (DomainException $e) {
        }
        $this->assertSame($antes, $this->f->resumo(1));
        $this->assertSame(0, $this->db->count_all('trifase_garantia_operacoes'));
    }
    public function testCorrecaoPreservaDevolucaoERecebimentoMasRecompoeSaldo(): void
    {
        $this->avaliar('devolucao_valor');
        $this->devolver('parcial', 5000, 'parcial');
        $r=$this->g->reembolsos($this->id)[0];
        try {
            $this->f->estornar(1, 1, 'Engano', date('Y-m-d'), $this->chave('estorno'), 7);
            $this->fail('Estornou recebido já devolvido');
        } catch (DomainException $e) {
        }
        $evento=$this->g->corrigirReembolso($this->id, (int)$r->id, 'Não houve transferência', 7, $this->chave('corrigir'));
        $this->assertSame(30000, $this->f->resumo(1)['saldo_c']);
        $this->assertSame(20000, $this->f->resumo(1)['recebido_c']);
        $this->assertSame($evento, (int)$this->g->reembolsos($this->id)[0]->cancelado_id);
        $this->assertSame(0, (int)$this->db->where('idLancamentos', $r->despesa_id)->get('lancamentos')->row()->baixado);
        $this->assertSame(5000, (int)$this->db->where('idLancamentos', $r->despesa_id)->get('lancamentos')->row()->valor*100);
    }
    public function testTrocaExternaPreservaEntradaPrazoEFinanceiroERetornoDaSubstituta(): void
    {
        $a=$this->avaliar('troca');
        $antes=$this->f->resumo(1);
        $snapshot=$this->db->where('os_id', $this->id)->get('trifase_os_equipamentos')->row();
        $evento=$this->g->trocar($this->id, $this->troca(), $a, 7, $this->chave('troca'));
        $this->assertSame($evento, $this->g->trocar($this->id, $this->troca(), $a, 7, $this->chave('troca')));
        $t=trifaseGarantiaTroca($this->db, $this->id);
        $this->assertNotSame((int)$t->antiga_id, (int)$t->nova_id);
        $this->assertSame($antes, $this->f->resumo(1));
        $this->assertEquals($snapshot, $this->db->where('os_id', $this->id)->get('trifase_os_equipamentos')->row());
        $this->assertSame(0, $this->db->count_all('trifase_estoque_eventos'));
        $this->db->where('idOs', $this->id)->update('os', ['status'=>'Finalizado']);
        $ref=$this->modelo->referencia($this->id);
        $this->assertSame((int)$t->nova_id, (int)$ref['equipamento']->equipamento_id);
        $this->assertSame(date('Y-m-d', strtotime('-3 days +90 days')), $ref['vencimento']);
        $novo=$this->modelo->criar($this->id, ['defeito'=>'Reincidência','itens_recebidos'=>'Substituta','estado_entrada'=>'Conferida'], 7, $this->chave('novo'));
        $this->assertSame((int)$t->nova_id, (int)$this->modelo->vinculo($novo)->equipamento_id);
        $this->assertSame(1, (int)$this->modelo->vinculo($novo)->origem_id);
    }
    public function testTrocaEstoqueBaixaUmaUnidadeECapturaCustoSemCobrar(): void
    {
        $a=$this->avaliar('troca');
        $this->db->insert('produtos', ['idProdutos'=>1,'descricao'=>'Placa','estoque'=>2,'precoCompra'=>'45.00','precoVenda'=>'100.00']);
        $this->g->trocar($this->id, $this->troca('estoque'), $a, 7, $this->chave('troca'));
        $this->assertSame(1, (int)$this->db->get('produtos')->row()->estoque);
        $this->assertSame(4500, (int)trifaseGarantiaTroca($this->db, $this->id)->custo_c);
        $this->assertSame(1, $this->db->count_all('trifase_financeiro_obrigacoes'));
    }
    public function testTrocaSemEstoqueReverteTudo(): void
    {
        $a=$this->avaliar('troca');
        $this->db->insert('produtos', ['idProdutos'=>1,'descricao'=>'Placa','estoque'=>0,'precoCompra'=>'45.00']);
        try {
            $this->g->trocar($this->id, $this->troca('estoque'), $a, 7, $this->chave('troca'));
            $this->fail('Aceitou falta');
        } catch (DomainException $e) {
        }
        $this->assertSame(1, $this->db->count_all('trifase_equipamentos'));
        $this->assertSame(0, $this->db->count_all('trifase_garantia_operacoes'));
    }

    public function testAvaliacoesNaoPodemMudarAposTrocaOuReembolso(): void
    {
        $a=$this->avaliar('devolucao_valor');
        $this->devolver('parcial', 5000, 'parcial');
        $this->expectException(DomainException::class);
        $this->modelo->avaliar($this->id, ['cobertura'=>'coberto','diagnostico'=>'Outro','solucao'=>'troca','motivo'=>'Mudar'], $a, 7, $this->chave('mudar'));
    }
    public function testFinanceiroMudouRecusaFormularioAntigoSemSaidaDeCaixa(): void
    {
        $a=$this->avaliar('devolucao_valor');
        $hash=$this->g->financeiroHash($this->f->resumo(1));
        $this->f->receber(1, 1000, date('Y-m-d'), 'Pix', $this->chave('novo-receber'), 7);
        try {
            $this->g->reembolsar($this->id, ['modo'=>'parcial','valor_c'=>5000,'data'=>date('Y-m-d'),'forma'=>'Pix','referencia'=>'Teste','motivo'=>'Teste'], $a, $hash, 7, $this->chave('antigo'));
            $this->fail('Aceitou prévia antiga');
        } catch (DomainException $e) {
        }
        $this->assertSame(0, $this->db->count_all('trifase_garantia_reembolsos'));
        $this->assertSame(21000, $this->f->resumo(1)['recebido_c']);
    }
    public function testTotalExigeExatamenteRecebidoLiquido(): void
    {
        $this->avaliar('devolucao_valor');
        $this->expectException(DomainException::class);
        $this->devolver('total', 10000, 'total-errado');
    }
    public function testEncerramentoSemDinheiroADevolverCancelaSaldoSemDespesaAtiva(): void
    {
        $this->avaliar('devolucao_valor');
        $this->devolver('parcial', 20000, 'todo-recebido');
        $this->devolver('total', 0, 'saldo-restante');
        $r=$this->f->resumo(1);
        $this->assertSame(0, $r['total_c']);
        $this->assertSame(0, $r['recebido_c']);
        $this->assertSame(0, $r['saldo_c']);
        $e=$this->g->reembolsos($this->id)[0];
        $this->assertSame(0, (int)$this->db->where('lancamento_id', $e->despesa_id)->get('trifase_financeiro_projecoes')->row()->ativo);
    }
    public function testCorrecoesDeParcialETotalRecompoemFinanceiroSemApagarHistorico(): void
    {
        $this->avaliar('devolucao_valor');
        $this->devolver('parcial', 5000, 'parcial');
        $this->devolver('total', 15000, 'total');
        $rows=$this->g->reembolsos($this->id);
        $total=$rows[0];
        $parcial=$rows[1];
        $this->g->corrigirReembolso($this->id, (int)$parcial->id, 'Parcial não ocorreu', 7, $this->chave('corrige-parcial'));
        // Reverted partial reopens nothing payable: total credit remains 45000 and net retained 5000.
        $this->assertSame(0, $this->f->resumo(1)['saldo_c']);
        $this->g->corrigirReembolso($this->id, (int)$total->id, 'Total não ocorreu', 7, $this->chave('corrige-total'));
        $this->assertSame(30000, $this->f->resumo(1)['saldo_c']);
    }
    public function testUnidadeAntigaNaoPodeSerReutilizadaAposTroca(): void
    {
        $a=$this->avaliar('troca');
        $this->g->trocar($this->id, $this->troca(), $a, 7, $this->chave('troca'));
        $t=trifaseGarantiaTroca($this->db, $this->id);
        $eq=new Trifase_equipamento_model();
        $eq->db=$this->db;
        $this->assertNotContains((int)$t->antiga_id, array_map(fn ($u) =>(int)$u->id, $eq->unidades(4, '')));
        $this->db->insert('os', ['idOs'=>50,'clientes_id'=>4,'status'=>'Aberto','faturado'=>0]);
        $this->expectException(DomainException::class);
        $eq->vincular(50, ['modo'=>'existente','equipamento_id'=>(string)$t->antiga_id,'itens_recebidos'=>'Placa','estado_entrada'=>'Antiga'], 7, $this->chave('retirada-antiga'));
    }
    public function testNaoConcluiTrocaAindaNaoExecutada(): void
    {
        $this->avaliar('troca');
        $antes=$_ENV['TRIFASE_GARANTIA_OPERACOES_ENABLED']??null;
        $_ENV['TRIFASE_GARANTIA_OPERACOES_ENABLED']='true';
        try {
            $this->tecnico->alterarAndamento($this->id, 'Finalizado', 7);
            $this->fail('Concluiu troca pendente');
        } catch (DomainException $e) {
            $this->assertSame('Aberto', $this->db->where('idOs', $this->id)->get('os')->row()->status);
        } finally {
            if ($antes===null) {
                unset($_ENV['TRIFASE_GARANTIA_OPERACOES_ENABLED']);
            } else {
                $_ENV['TRIFASE_GARANTIA_OPERACOES_ENABLED']=$antes;
            }
        }
    }
    public function testOrcamentoRequerDecisaoAprovadaEDadosAindaIguais(): void
    {
        require_once APPPATH.'models/Trifase_orcamento_model.php';
        require_once APPPATH.'database/migrations/20261102020000_trifase_orcamentos.php';
        $m=new class extends Migration_trifase_orcamentos {
            public object $dbforge;
        };
        $m->db=$this->db;
        $m->dbforge=new CI_DB_sqlite3_forge($this->db);
        $m->up();
        $this->db->query('CREATE TABLE servicos (idServicos INTEGER PRIMARY KEY, nome TEXT, preco REAL)');
        $this->db->query('CREATE TABLE produtos_os (idProdutos_os INTEGER PRIMARY KEY, os_id INTEGER, produtos_id INTEGER, preco REAL, quantidade REAL, subTotal REAL, desconto REAL, tipo_desconto TEXT)');
        $this->db->query('CREATE TABLE servicos_os (idServicos_os INTEGER PRIMARY KEY, os_id INTEGER, servicos_id INTEGER, preco REAL, quantidade REAL, subTotal REAL, desconto REAL, tipo_desconto TEXT)');
        $this->db->query('CREATE TABLE trifase_publico_links (os_id INTEGER, token_hash TEXT, expira_em INTEGER)');
        $this->db->insert('servicos', ['idServicos'=>1,'nome'=>'Diagnóstico','preco'=>100]);
        $this->db->insert('servicos_os', ['idServicos_os'=>1,'os_id'=>$this->id,'servicos_id'=>1,'preco'=>100,'quantidade'=>1,'subTotal'=>100,'desconto'=>0]);
        $this->avaliar('novo_orcamento');
        $q=new Trifase_orcamento_model();
        $q->db=$this->db;
        $token=str_repeat('a', 64);
        $this->db->insert('trifase_publico_links', ['os_id'=>$this->id,'token_hash'=>hash('sha256', $token),'expira_em'=>time()+86400]);
        $antes=$_ENV['TRIFASE_GARANTIA_OPERACOES_ENABLED']??null;
        $_ENV['TRIFASE_GARANTIA_OPERACOES_ENABLED']='true';
        try {
            $os=$this->db->where('idOs', $this->id)->get('os')->row();
            $versao=$q->publicar($this->id, $q->hash($q->retrato($os)), 7, $this->chave('publicar'));
            $this->assertSame(1, $this->db->where('tipo', 'orcamento')->count_all_results('trifase_garantia_operacoes'));
            try {
                $this->f->formalizar($this->id, 10000, 0, date('Y-m-d'), 7);
                $this->fail('Faturou sem decisão');
            } catch (DomainException $e) {
            }
            $q->responder($this->id, $token, $versao, 'aprovar', 'Cliente fictício', '1', $this->chave('aprovar'));
            $this->db->where('idServicos_os', 1)->update('servicos_os', ['preco'=>200,'subTotal'=>200]);
            try {
                $this->f->formalizar($this->id, 20000, 0, date('Y-m-d'), 7);
                $this->fail('Faturou itens alterados');
            } catch (DomainException $e) {
            }
            $this->db->where('idServicos_os', 1)->update('servicos_os', ['preco'=>100,'subTotal'=>100]);
            $r=$this->f->formalizar($this->id, 10000, 0, date('Y-m-d'), 7);
            $this->assertSame(10000, $r['saldo_c']);
        } finally {
            if ($antes===null) {
                unset($_ENV['TRIFASE_GARANTIA_OPERACOES_ENABLED']);
            } else {
                $_ENV['TRIFASE_GARANTIA_OPERACOES_ENABLED']=$antes;
            }
        }
    }
}
