<?php

require_once APPPATH . 'models/Trifase_cancelamento_model.php';
require_once APPPATH . 'models/Trifase_estoque_model.php';
require_once APPPATH . 'database/migrations/20261104010000_trifase_cancelamentos.php';
require_once APPPATH . 'database/migrations/20261102060000_trifase_estoque_custos.php';
require_once APPPATH . 'database/migrations/20261113010000_trifase_estoque_linha_os.php';
require_once BASEPATH . 'database/DB_forge.php';
require_once BASEPATH . 'database/drivers/sqlite3/sqlite3_forge.php';

final class TrifaseCancelamentoTest extends MaposTestCase
{
    private Trifase_cancelamento_model $modelo;
    private array $ambiente;

    protected function setUp(): void
    {
        parent::setUp();
        $this->ambiente = $_ENV;
        $_ENV['TRIFASE_ESTOQUE_ENABLED'] = 'true';
        $this->db->query('CREATE TABLE os (idOs INTEGER PRIMARY KEY, status TEXT, faturado INTEGER, lancamento INTEGER, defeito TEXT, clientes_id INTEGER)');
        $this->db->query("INSERT INTO os VALUES (1, 'Aprovado', 0, NULL, 'Não liga', 3), (2, 'Aberto', 0, NULL, 'Outro', 4)");
        $this->db->query('CREATE TABLE clientes (idClientes INTEGER PRIMARY KEY, nomeCliente TEXT)');
        $this->db->query("INSERT INTO clientes VALUES (3, 'Cliente da OS'), (4, 'Outro cliente')");
        $this->db->query('CREATE TABLE produtos (idProdutos INTEGER PRIMARY KEY, descricao TEXT, estoque INTEGER, precoCompra TEXT)');
        $this->db->query("INSERT INTO produtos VALUES (1, 'Peça', 8, '10.00')");
        $this->db->query('CREATE TABLE servicos (idServicos INTEGER PRIMARY KEY, nome TEXT)');
        $this->db->query("INSERT INTO servicos VALUES (1, 'Reparo')");
        $this->db->query('CREATE TABLE produtos_os (idProdutos_os INTEGER PRIMARY KEY, os_id INTEGER, produtos_id INTEGER, quantidade INTEGER, preco TEXT, subTotal TEXT)');
        $this->db->query("INSERT INTO produtos_os VALUES (1, 1, 1, 2, '20.00', '40.00')");
        $this->db->query('CREATE TABLE servicos_os (idServicos_os INTEGER PRIMARY KEY, os_id INTEGER, servicos_id INTEGER, quantidade INTEGER)');
        $this->db->query('INSERT INTO servicos_os VALUES (1, 1, 1, 1)');
        $this->db->query('CREATE TABLE os_historico (os_id INTEGER, status_anterior TEXT, status_novo TEXT, usuarios_id INTEGER, data_hora TEXT)');
        $m = new class() extends Migration_trifase_cancelamentos {
            public object $dbforge;
        };
        $m->db = $this->db;
        $m->dbforge = new CI_DB_sqlite3_forge($this->db);
        $m->up();
        $m->up();
        $e = new class() extends Migration_trifase_estoque_custos {
            public object $dbforge;
        };
        $e->db = $this->db;
        $e->dbforge = new CI_DB_sqlite3_forge($this->db);
        $e->up();
        $vinculo = new class() extends Migration_trifase_estoque_linha_os {
            public object $dbforge;
        };
        $vinculo->db = $this->db;
        $vinculo->dbforge = new CI_DB_sqlite3_forge($this->db);
        $vinculo->up();
        $vinculo->up();
        $this->modelo = new Trifase_cancelamento_model();
        $this->modelo->db = $this->db;
    }

    protected function tearDown(): void
    {
        $_ENV = $this->ambiente;
        parent::tearDown();
    }

    private function dados(): array
    {
        return ['hash' => $this->modelo->conferencia($this->db->where('idOs', 1)->get('os')->row())['hash'], 'pecas_nao_utilizadas' => '1', 'servicos_nao_executados' => '1', 'financeiro_conferido' => '1', 'confirmar' => '1', 'conferencia' => 'Peças não utilizadas e serviço não executado; nada recebido.'];
    }

    private function pedido(): int
    {
        return $this->modelo->solicitar(1, 'cliente', 'Desistiu antes do reparo', 7, 'solicitacao_123456789');
    }

    public function testOrigemDoClienteUsaCadastroDaOsEAssisteciaFicaSeparadaDoOperador(): void
    {
        $pedido = $this->pedido();
        $p = $this->modelo->atual(1);
        $this->assertSame('Cliente: Cliente da OS', $p->solicitante);
        $this->assertSame(7, (int) $p->usuario_id);
        $snapshot = json_decode($p->retrato, true);
        $this->assertSame(['origem' => 'cliente', 'cliente_id' => 3, 'nome_cliente' => 'Cliente da OS'], $snapshot['solicitacao']);
        $this->modelo->retirar(1, $pedido, 'Correção da origem', 7, 'retirar_origem_12345');
        $this->modelo->solicitar(1, 'assistencia', 'Assistência não poderá executar', 7, 'assistencia_12345678');
        $this->assertSame('Por iniciativa da assistência', $this->modelo->atual(1)->solicitante);
        try {
            $this->modelo->solicitar(2, 'Nome inventado', 'Teste', 7, 'invalida_123456789');
            $this->fail('Aceitou nome livre no lugar da origem');
        } catch (DomainException $e) {
            $this->assertNull($this->modelo->atual(2));
        }
        $this->db->where('idClientes', 4)->delete('clientes');
        $this->expectException(DomainException::class);
        $this->modelo->solicitar(2, 'cliente', 'Teste', 7, 'semcliente_123456789');
    }

    private function dadosTecnicos(): array
    {
        $c = $this->modelo->conferencia($this->db->where('idOs', 1)->get('os')->row());
        return ['hash_tecnico' => $this->modelo->hashTecnico($c), 'pecas_nao_utilizadas' => '1', 'servicos_executados' => '1'];
    }

    private function registrarBaixa(int $quantidade): void
    {
        $estoque = new Trifase_estoque_model();
        $estoque->db = $this->db;
        $this->db->set('estoque', 'estoque + ' . $quantidade, false)->where('idProdutos', 1)->update('produtos');
        $estoque->movimentar(1, 'os_saida', $quantidade, null, date('Y-m-d'), 'Baixa comprovada', 'OS #1', 2, 'baixa_123456789012', null, ['os_id' => 1, 'os_item_id' => 1]);
    }

    private function devolverPecas(): void
    {
        $e = new Trifase_estoque_model();
        $e->db = $this->db;
        $this->registrarBaixa(2);
        $e->movimentar(1, 'os_devolucao', 2, null, date('Y-m-d'), 'Remoção de peça da OS', 'OS #1', 2, 'devolucao_123456789', null, ['os_id' => 1, 'os_item_id' => 1]);
        $this->db->where('os_id', 1)->delete('produtos_os');
    }

    public function testPedidoTecnicaEFinanceiroSeparadosSemSegundaDevolucao(): void
    {
        $pedido = $this->pedido();
        $this->assertSame($pedido, $this->pedido());
        $this->assertSame(8, (int) $this->db->get('produtos')->row()->estoque);
        try {
            $this->modelo->confirmar(1, $pedido, $this->dados(), 7, 'confirmacao_12345678');
            $this->fail('Liberou peças vinculadas');
        } catch (DomainException $e) {
            $this->assertSame(8, (int) $this->db->get('produtos')->row()->estoque);
        }
        $this->devolverPecas();
        try {
            $this->modelo->confirmar(1, $pedido, $this->dados(), 7, 'confirmacao_12345678');
            $this->fail('Liberou sem conferência técnica');
        } catch (DomainException $e) {
            $this->assertSame('Aprovado', $this->db->where('idOs', 1)->get('os')->row()->status);
        }
        $tecnica = $this->modelo->conferirTecnica(1, $pedido, $this->dadosTecnicos(), 2, 'tecnica_123456789');
        $this->assertSame($tecnica, $this->modelo->conferirTecnica(1, $pedido, $this->dadosTecnicos(), 2, 'tecnica_123456789'));
        $this->assertSame($pedido, (int) $this->modelo->atual(1)->id);
        $dados = array_replace($this->dados(), ['conferencia' => '']);
        $id = $this->modelo->confirmar(1, $pedido, $dados, 7, 'confirmacao_12345678');
        $this->assertSame($id, $this->modelo->confirmar(1, $pedido, $dados, 7, 'confirmacao_12345678'));
        $this->assertSame('Cancelado', $this->db->where('idOs', 1)->get('os')->row()->status);
        $this->assertSame('Não liga', $this->db->where('idOs', 1)->get('os')->row()->defeito);
        $this->assertSame(10, (int) $this->db->get('produtos')->row()->estoque);
        $this->assertSame(2, $this->db->count_all('trifase_estoque_eventos'));
        $this->assertSame(0, $this->db->count_all('produtos_os'));
        $this->assertSame(1, $this->db->count_all('servicos_os'));
        $this->assertSame(1, $this->db->count_all('os_historico'));
        $this->assertSame(3, $this->db->count_all('trifase_cancelamentos'));
        $r = json_decode($this->modelo->atual(1)->retrato, true);
        $this->assertSame($tecnica, $r['conferencia']['tecnica_evento_id']);
        $this->assertSame(2, $r['conferencia']['tecnico_id']);
        $this->assertSame('', $r['conferencia']['observacoes']);
    }

    public function testEtapaTecnicaNaoLiberaComPecasPendenciasOuCampoFinanceiroForjado(): void
    {
        $pedido = $this->pedido();
        try {
            $this->modelo->conferirTecnica(1, $pedido, $this->dadosTecnicos(), 2, 'tecnica_123456789');
            $this->fail('Aceitou peças vinculadas');
        } catch (DomainException $e) {
            $this->assertSame(1, $this->db->count_all('trifase_cancelamentos'));
        }
        $this->devolverPecas();
        foreach ([['pecas_nao_utilizadas' => '0'], ['servicos_executados' => '0', 'servicos_nao_executados' => '1'], ['financeiro_conferido' => '1']] as $dados) {
            try {
                $this->modelo->conferirTecnica(1, $pedido, array_replace($this->dadosTecnicos(), $dados), 2, 'tecnica_123456789');
                $this->fail('Aceitou pendência ou financeiro na técnica');
            } catch (DomainException $e) {
                $this->assertSame(1, $this->db->count_all('trifase_cancelamentos'));
            }
        }
        $this->modelo->conferirTecnica(1, $pedido, $this->dadosTecnicos(), 2, 'tecnica_123456789');
        foreach (['financeiro_conferido', 'confirmar'] as $campo) {
            try {
                $this->modelo->confirmar(1, $pedido, array_replace($this->dados(), [$campo => '0']), 7, 'confirmacao_12345678');
                $this->fail('Aceitou financeiro não conferido');
            } catch (DomainException $e) {
                $this->assertSame('Aprovado', $this->db->where('idOs', 1)->get('os')->row()->status);
            }
        }
    }

    public function testMudancaDosItensInvalidaTecnicaSemDependerDePrecos(): void
    {
        $pedido = $this->pedido();
        $this->devolverPecas();
        $this->modelo->conferirTecnica(1, $pedido, $this->dadosTecnicos(), 2, 'tecnica_123456789');
        $this->db->where('idServicos_os', 1)->update('servicos_os', ['quantidade' => 2]);
        try {
            $this->modelo->confirmar(1, $pedido, $this->dados(), 7, 'confirmacao_12345678');
            $this->fail('Usou técnica desatualizada');
        } catch (DomainException $e) {
            $this->assertStringContainsString('conferência técnica', $e->getMessage());
        }
        $this->assertSame('solicitar', $this->modelo->atual(1)->tipo);
        $this->expectException(DomainException::class);
        $this->modelo->conferirTecnica(2, $pedido, $this->dadosTecnicos(), 2, 'outra_os_123456789');
    }

    public function testPedidoBloqueiaFinalizacaoEEncerradaNaoEntraNaFila(): void
    {
        require_once APPPATH . 'models/Trifase_atendimento_model.php';
        $this->db->where('idOs', 1)->update('os', ['status' => 'Finalizado']);
        try {
            $this->pedido();
            $this->fail('Registrou pedido em OS finalizada');
        } catch (DomainException $e) {
            $this->assertSame([], $this->modelo->pendentes());
        }
        $this->db->where('idOs', 1)->update('os', ['status' => 'Aprovado']);
        $this->pedido();
        $andamento = new Trifase_atendimento_model();
        $andamento->db = $this->db;
        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('pedido de cancelamento');
        $andamento->alterarAndamento(1, 'Finalizado', 7);
    }

    public function testRetiradaEncerraPedidoMesmoAposConferenciaTecnica(): void
    {
        $pedido = $this->pedido();
        $this->devolverPecas();
        $this->modelo->conferirTecnica(1, $pedido, $this->dadosTecnicos(), 2, 'tecnica_123456789');
        $id = $this->modelo->retirar(1, $pedido, 'Cliente decidiu continuar', 7, 'retirada_123456789');
        $this->assertSame($id, $this->modelo->retirar(1, $pedido, 'Cliente decidiu continuar', 7, 'retirada_123456789'));
        $this->assertSame([], $this->modelo->pendentes());
        $this->expectException(DomainException::class);
        $this->modelo->confirmar(1, $pedido, $this->dados(), 7, 'confirmacao_12345678');
    }

    public function testFilaDeCancelamentosPendentesAcompanhaConferenciaTecnicaEResumoFinanceiro(): void
    {
        $pedido = $this->pedido();
        $fila = $this->modelo->pendentes([1 => ['total_c' => 20000, 'recebido_c' => 15000, 'recebido_original_c' => 20000, 'reembolsado_c' => 5000, 'saldo_c' => 5000]]);
        $this->assertCount(1, $fila);
        $this->assertSame(1, $fila[0]['os_id']);
        $this->assertFalse($fila[0]['tecnica_concluida']);
        $this->assertSame(20000, $fila[0]['total_c']);
        $this->assertSame(20000, $fila[0]['recebido_c']);
        $this->assertSame(5000, $fila[0]['devolvido_c']);
        $this->assertSame(5000, $fila[0]['saldo_c']);
        $this->devolverPecas();
        $this->modelo->conferirTecnica(1, $pedido, $this->dadosTecnicos(), 2, 'tecnica_123456789');
        $fila = $this->modelo->pendentes();
        $this->assertTrue($fila[0]['tecnica_concluida']);
    }

    public function testObrigacaoComRecebimentoExigeAcertoECalculaOsTresCasosAutomaticamente(): void
    {
        $this->db->query('CREATE TABLE lancamentos (idLancamentos INTEGER PRIMARY KEY AUTOINCREMENT, descricao TEXT, valor TEXT, desconto TEXT, valor_desconto TEXT, tipo_desconto TEXT, data_vencimento TEXT, data_pagamento TEXT, baixado INTEGER, clientes_id INTEGER, cliente_fornecedor TEXT, forma_pgto TEXT, tipo TEXT, usuarios_id INTEGER)');
        $this->db->query('CREATE TABLE trifase_financeiro_obrigacoes (os_id INTEGER, bruto_c INTEGER, desconto_c INTEGER, vencimento TEXT, principal_id INTEGER, usuario_id INTEGER)');
        $this->db->query('CREATE TABLE trifase_financeiro_eventos (id INTEGER PRIMARY KEY AUTOINCREMENT, os_id INTEGER, tipo TEXT, referencia_id INTEGER, valor_c INTEGER, desconto_c INTEGER, data_evento TEXT, forma TEXT, lancamento_id INTEGER, usuario_id INTEGER, motivo TEXT, operacao TEXT UNIQUE, payload_hash TEXT)');
        $this->db->query('CREATE TABLE trifase_financeiro_projecoes (lancamento_id INTEGER PRIMARY KEY, os_id INTEGER, ativo INTEGER)');
        $this->db->data_cache = [];
        require_once APPPATH . 'models/Trifase_financeiro_model.php';
        $f = new Trifase_financeiro_model();
        $f->db = $this->db;
        $f->formalizar(1, 20000, 0, '2026-11-10', 7);
        $f->receber(1, 20000, '2026-11-04', 'Pix', 'recebimento_os1_20000', 7);

        $this->db->insert('produtos', ['idProdutos' => 2, 'descricao' => 'IGBT', 'estoque' => 4, 'precoCompra' => '16.00']);
        $this->db->insert('produtos_os', ['idProdutos_os' => 2, 'os_id' => 1, 'produtos_id' => 2, 'quantidade' => 1, 'preco' => '40.00', 'subTotal' => '40.00']);
        $estoque = new Trifase_estoque_model();
        $estoque->db = $this->db;
        $estoque->capturarItem(1, 'produto', 2, 2);
        $pedido = $this->pedido();
        $resumoOriginal = $f->resumo(1);
        $this->registrarBaixa(2);
        $evento = $this->modelo->retirarItem(1, $pedido, 'produto', 1, 2, 'devolucao_123456789');
        $this->assertSame($evento, $this->modelo->retirarItem(1, $pedido, 'produto', 1, 2, 'devolucao_123456789'));
        $consumida = $this->modelo->retirarItem(1, $pedido, 'produto', 2, 2, 'consumir_igbt_123456', 'Danificado no diagnóstico');
        $this->assertSame($consumida, $this->modelo->retirarItem(1, $pedido, 'produto', 2, 2, 'consumir_igbt_123456', 'Danificado no diagnóstico'));
        try {
            $this->modelo->retirarItem(1, $pedido, 'produto', 2, 2, 'devolver_igbt_123456');
            $this->fail('Devolveu uma peça já consumida');
        } catch (DomainException $e) {
            $this->assertStringContainsString('já foi retirado', $e->getMessage());
        }
        $this->assertSame(4, (int) $this->db->where('idProdutos', 2)->get('produtos')->row()->estoque);
        $this->assertSame(10, (int) $this->db->where('idProdutos', 1)->get('produtos')->row()->estoque);
        $this->assertSame(2, $this->db->count_all_results('trifase_estoque_eventos'));
        $this->assertSame(0, $this->db->where('os_id', 1)->count_all_results('produtos_os'));
        $this->assertSame($resumoOriginal, $f->resumo(1));
        $this->assertSame($pedido, (int) $this->modelo->atual(1)->id);
        $historico = $this->modelo->historico(1);
        $this->assertSame('consumir_peca', $historico[0]->tipo);
        $this->assertSame('retirar_item', $historico[1]->tipo);
        $retrato = json_decode($historico[0]->retrato, true, 32, JSON_THROW_ON_ERROR);
        $this->assertSame(1600, $retrato['custo_unitario_c']);
        $this->assertNull($retrato['movimento_estoque_id']);
        $this->modelo->conferirTecnica(1, $pedido, $this->dadosTecnicos(), 2, 'tecnica_123456789');
        $this->assertSame(1, $this->db->where('os_id', 1)->count_all_results('servicos_os'));

        // Sem confirmar acerto_confirmado, continua bloqueado.
        try {
            $this->modelo->confirmar(1, $pedido, $this->dados(), 7, 'confirmacao_12345678');
            $this->fail('Cancelou cobrança sem acerto confirmado');
        } catch (DomainException $e) {
            $this->assertStringContainsString('acerto', $e->getMessage());
            $this->assertSame(20000, $f->resumo(1)['recebido_c']);
            $this->assertSame('Aprovado', $this->db->where('idOs', 1)->get('os')->row()->status);
        }

        // Cálculo dos 3 casos:
        // 1) Sem pendências (ex.: R$ 50 devido e R$ 50 desconto sobre R$ 0 recebido = 0; ou R$ 200 devido sobre R$ 200 recebido = 0)
        $semPendencia = $this->modelo->calcularAcerto(['recebido_c' => 0, 'total_c' => 5000], 5000, 5000);
        $this->assertSame('sem_pendencias', $semPendencia['resultado']);
        $this->assertSame(0, $semPendencia['total_final_c']);
        $this->assertSame(0, $semPendencia['a_devolver_c']);
        $this->assertSame(0, $semPendencia['a_receber_c']);

        // 2) Valor a receber (ex.: R$ 80 devido e R$ 30 desconto sobre R$ 0 recebido = R$ 50 a receber)
        $aReceber = $this->modelo->calcularAcerto(['recebido_c' => 0, 'total_c' => 8000], 8000, 3000);
        $this->assertSame('a_receber', $aReceber['resultado']);
        $this->assertSame(5000, $aReceber['a_receber_c']);

        // 3) Caso misto / Valor a devolver (pagou R$ 200, combinado R$ 50 pelo diagnóstico -> R$ 150 a devolver)
        $misto = $this->modelo->calcularAcerto($f->resumo(1), 5000, 0);
        $this->assertSame('a_devolver', $misto['resultado']);
        $this->assertSame(15000, $misto['a_devolver_c']);
        $this->assertSame(0, $misto['a_receber_c']);

        // Exige comprovante e valor exato da devolução de R$ 150,00:
        try {
            $this->modelo->confirmar(1, $pedido, array_replace($this->dados(), [
                'valor_devido' => '50,00', 'desconto' => '0,00', 'acerto_confirmado' => '1',
                'valor_devolucao' => '100,00', 'data_devolucao' => '2026-11-05', 'forma_devolucao' => 'Pix', 'referencia_devolucao' => 'PIX-123',
            ]), 7, 'confirmacao_erro_123');
            $this->fail('Aceitou devolução divergente do cálculo');
        } catch (DomainException $e) {
            $this->assertStringContainsString('devolução', $e->getMessage());
        }

        // Confirma o caso misto registrando R$ 150,00 devolvidos e mantendo R$ 50,00 retidos pelo diagnóstico:
        $dadosAcerto = array_replace($this->dados(), [
            'valor_devido' => '50,00', 'desconto' => '0,00', 'acerto_confirmado' => '1',
            'valor_devolucao' => '150,00', 'data_devolucao' => '2026-11-05', 'forma_devolucao' => 'Pix',
            'referencia_devolucao' => 'PIX-DEV-150', 'conferencia' => 'Retido R$ 50,00 de diagnóstico e devolvido R$ 150,00.',
        ]);
        $idConfirmacao = $this->modelo->confirmar(1, $pedido, $dadosAcerto, 7, 'confirmacao_ok_12345');

        $this->assertSame('Cancelado', $this->db->where('idOs', 1)->get('os')->row()->status);
        $resumoFinal = $f->resumo(1);
        $this->assertSame(5000, $resumoFinal['total_c']);
        $this->assertSame(5000, $resumoFinal['recebido_c']);
        $this->assertSame(15000, $resumoFinal['reembolsado_c']);
        $this->assertSame(0, $resumoFinal['saldo_c']);
        $this->assertSame('Quitado', $resumoFinal['situacao']);

        // Reenvio não duplica despesa nem devolução; as projeções em lote concordam.
        $antes = [];
        foreach (['lancamentos', 'trifase_financeiro_obrigacoes', 'trifase_financeiro_eventos', 'trifase_financeiro_projecoes', 'trifase_cancelamentos'] as $tabela) {
            $antes[$tabela] = $this->db->get($tabela)->result_array();
        }
        $this->assertSame($idConfirmacao, $this->modelo->confirmar(1, $pedido, $dadosAcerto, 7, 'confirmacao_ok_12345'));
        $this->assertSame($resumoFinal, $f->resumos([1])[1]);
        $this->assertCount(0, $this->modelo->pendentes());
        $recebimento = $this->db->where('tipo', 'receber')->get('trifase_financeiro_eventos', 1)->row();
        try {
            $f->estornar(1, (int) $recebimento->id, 'Correção após devolução', '2026-11-06', 'estorno_apos_devolucao', 7);
            $this->fail('Estornou recebimento com devolução vinculada');
        } catch (DomainException $e) {
            $this->assertStringContainsString('devolução', $e->getMessage());
        }
        foreach ($antes as $tabela => $registros) {
            $this->assertSame($registros, $this->db->get($tabela)->result_array(), $tabela);
        }
        $this->assertSame($resumoFinal, $f->resumo(1));
    }

    public function testAcertoComValorAReceberPermiteQuitacaoPosteriorDaTaxaDeDiagnostico(): void
    {
        $this->db->query('CREATE TABLE lancamentos (idLancamentos INTEGER PRIMARY KEY AUTOINCREMENT, descricao TEXT, valor TEXT, desconto TEXT, valor_desconto TEXT, tipo_desconto TEXT, data_vencimento TEXT, data_pagamento TEXT, baixado INTEGER, clientes_id INTEGER, cliente_fornecedor TEXT, forma_pgto TEXT, tipo TEXT, usuarios_id INTEGER)');
        $this->db->query('CREATE TABLE trifase_financeiro_obrigacoes (os_id INTEGER, bruto_c INTEGER, desconto_c INTEGER, vencimento TEXT, principal_id INTEGER, usuario_id INTEGER)');
        $this->db->query('CREATE TABLE trifase_financeiro_eventos (id INTEGER PRIMARY KEY AUTOINCREMENT, os_id INTEGER, tipo TEXT, referencia_id INTEGER, valor_c INTEGER, desconto_c INTEGER, data_evento TEXT, forma TEXT, lancamento_id INTEGER, usuario_id INTEGER, motivo TEXT, operacao TEXT UNIQUE, payload_hash TEXT)');
        $this->db->query('CREATE TABLE trifase_financeiro_projecoes (lancamento_id INTEGER PRIMARY KEY, os_id INTEGER, ativo INTEGER)');
        $this->db->data_cache = [];
        require_once APPPATH . 'models/Trifase_financeiro_model.php';
        $f = new Trifase_financeiro_model();
        $f->db = $this->db;

        $pedido = $this->pedido();
        $this->devolverPecas();
        $this->modelo->conferirTecnica(1, $pedido, $this->dadosTecnicos(), 2, 'tecnica_123456789');
        $this->modelo->confirmar(1, $pedido, array_replace($this->dados(), [
            'valor_devido' => '80,00', 'desconto' => '30,00', 'acerto_confirmado' => '1',
            'conferencia' => 'Taxa de diagnóstico acordada com desconto de R$ 30,00.',
        ]), 7, 'confirmacao_receber_1');

        $this->assertSame('Cancelado', $this->db->where('idOs', 1)->get('os')->row()->status);
        $resumo = $f->resumo(1);
        $this->assertSame(5000, $resumo['total_c']);
        $this->assertSame(5000, $resumo['saldo_c']);
        $f->receber(1, 5000, '2026-11-05', 'Pix', 'receber_taxa_cancel_1', 7);
        $this->assertSame(0, $f->resumo(1)['saldo_c']);
        $this->assertSame('Quitado', $f->resumo(1)['situacao']);
    }

    public function testDescontoNoCancelamentoNaoAlteraCategoriaDoCliente(): void
    {
        $this->db->query('CREATE TABLE trifase_cadastros_eventos (id INTEGER PRIMARY KEY AUTOINCREMENT, tipo TEXT, recurso_id INTEGER, antes TEXT, depois TEXT, motivo TEXT, usuario_id INTEGER, criado_em TEXT, operacao TEXT, payload_hash TEXT)');
        $this->db->insert('trifase_cadastros_eventos', ['tipo' => 'cliente', 'recurso_id' => 3, 'antes' => '{}', 'depois' => '{"categoria":"ouro","orientacoes":"Bom cliente"}', 'motivo' => 'Inicial', 'usuario_id' => 7, 'criado_em' => '2026-11-01 10:00:00', 'operacao' => 'op_inicial_cliente_3', 'payload_hash' => 'hash']);
        $this->db->data_cache = [];
        $pedido = $this->pedido();
        $this->devolverPecas();
        $this->modelo->conferirTecnica(1, $pedido, $this->dadosTecnicos(), 2, 'tecnica_123456789');
        $this->modelo->confirmar(1, $pedido, array_replace($this->dados(), [
            'valor_devido' => '50,00', 'desconto' => '50,00', 'acerto_confirmado' => '1',
            'conferencia' => 'Desconto concedido para encerramento do atendimento.',
        ]), 7, 'confirmacao_desconto_50');

        $this->assertSame('Cancelado', $this->db->where('idOs', 1)->get('os')->row()->status);
        $this->assertSame(1, $this->db->count_all('trifase_cadastros_eventos'));
        $eventoCliente = $this->db->where('tipo', 'cliente')->where('recurso_id', 3)->order_by('id', 'desc')->get('trifase_cadastros_eventos', 1)->row();
        $this->assertSame('ouro', json_decode($eventoCliente->depois, true)['categoria']);
        $this->assertSame('Quitado', trifaseGarantiaResumo($this->db, 1, 0, 0)['situacao']);
    }

    public function testResumoEncerradoSemCobrancaExigeConfirmacaoPreservada(): void
    {
        $this->assertSame([], $this->modelo->resumosEncerrados([1, 2], []));
        $pedido = $this->pedido();
        $this->devolverPecas();
        $this->modelo->conferirTecnica(1, $pedido, $this->dadosTecnicos(), 2, 'tecnica_123456789');
        $this->assertSame([], $this->modelo->resumosEncerrados([1], []));
        $this->modelo->confirmar(1, $pedido, $this->dados(), 7, 'confirmacao_12345678');
        // Cancelado sem evento auditável não significa conferência financeira feita.
        $this->db->where('idOs', 2)->update('os', ['status' => 'Cancelado']);
        $resumos = $this->modelo->resumosEncerrados([1, 2], []);
        $this->assertSame([1], array_keys($resumos));
        $this->assertSame(0, $resumos[1]['saldo_c']);
        $this->assertSame('Sem pendência', $resumos[1]['situacao']);
        // Mesmo após a confirmação, prevalece o saldo atual de recebimentos posteriores.
        $atual = [1 => ['total_c' => 5000, 'saldo_c' => 3000, 'situacao' => 'Parcialmente pago']];
        $this->assertSame($atual, $this->modelo->resumosEncerrados([1], $atual));
        $this->assertSame([], $this->modelo->resumosEncerrados([2], []));
    }

    public function testDevolucaoParcialMantemSaldoDaLinhaECustoEPerdaNaoVoltaAoEstoque(): void
    {
        $this->db->query("ALTER TABLE produtos_os ADD COLUMN desconto TEXT DEFAULT '0.00'");
        $this->db->query('ALTER TABLE produtos_os ADD COLUMN tipo_desconto TEXT');
        $this->db->where('idProdutos_os', 1)->update('produtos_os', [
            'quantidade' => 3, 'subTotal' => '59.99', 'desconto' => '0.01', 'tipo_desconto' => 'real',
        ]);
        $this->db->query('ALTER TABLE os ADD COLUMN desconto INTEGER DEFAULT 0');
        $this->db->query('ALTER TABLE os ADD COLUMN valor_desconto INTEGER DEFAULT 0');
        $this->db->query('ALTER TABLE os ADD COLUMN tipo_desconto TEXT');
        $estoque = new Trifase_estoque_model();
        $estoque->db = $this->db;
        $estoque->capturarItem(1, 'produto', 1, 2);

        $pedido = $this->pedido();
        $this->registrarBaixa(3);
        $devolucao = $this->modelo->retirarItem(1, $pedido, 'produto', 1, 2, 'devolucao_parcial_12', null, 2);
        $this->assertSame($devolucao, $this->modelo->retirarItem(1, $pedido, 'produto', 1, 2, 'devolucao_parcial_12', null, 2));
        $linha = $this->db->get('produtos_os')->row();
        $this->assertSame(1, (int) $linha->quantidade);
        $this->assertSame('19.99', $linha->subTotal);
        $this->assertSame('0.01', $linha->desconto);
        $this->assertSame(1000, $estoque->resumoOs(1)['valor_c']);
        $this->assertSame(3, (int) $this->db->get('trifase_os_custos')->row()->quantidade);
        $this->assertSame(10, (int) $this->db->get('produtos')->row()->estoque);

        try {
            $this->modelo->retirarItem(1, $pedido, 'produto', 1, 2, 'devolucao_parcial_12', null, 1);
            $this->fail('Reutilizou a chave com quantidade diferente.');
        } catch (DomainException $e) {
            $this->assertStringContainsString('Chave já utilizada', $e->getMessage());
        }

        try {
            $this->modelo->retirarItem(1, $pedido, 'produto', 1, 2, 'quantidade_excedente_123', null, 2);
            $this->fail('Devolveu mais peças que o saldo da linha.');
        } catch (DomainException $e) {
            $this->assertStringContainsString('quantidade', $e->getMessage());
        }

        $perda = $this->modelo->retirarItem(1, $pedido, 'produto', 1, 2, 'perda_parcial_12345', 'Danificada', 1);
        $this->assertSame($perda, $this->modelo->retirarItem(1, $pedido, 'produto', 1, 2, 'perda_parcial_12345', 'Danificada', 1));
        $this->assertSame(0, $this->db->count_all('produtos_os'));
        $this->assertSame(3, $this->db->count_all('trifase_estoque_eventos'));
        $this->assertSame(10, (int) $this->db->get('produtos')->row()->estoque);

        $historico = $this->modelo->historico(1);
        $rPerda = json_decode($historico[0]->retrato, true, 32, JSON_THROW_ON_ERROR);
        $rDevolucao = json_decode($historico[1]->retrato, true, 32, JSON_THROW_ON_ERROR);
        $this->assertSame(1, $rPerda['item']['quantidade']);
        $this->assertSame(1000, $rPerda['custo_unitario_c']);
        $this->assertSame(2, $rDevolucao['item']['quantidade']);
        $this->assertSame('40.00', $rDevolucao['item']['subTotal']);
        $this->assertSame(1, $rDevolucao['quantidade_restante']);
        $this->modelo->conferirTecnica(1, $pedido, $this->dadosTecnicos(), 2, 'tecnica_123456789');
    }

    public function testLinhaSemBaixaComprovadaConciliaSemUsarMovimentoDeOutraLinha(): void
    {
        $this->db->query('ALTER TABLE os ADD COLUMN desconto INTEGER DEFAULT 0');
        $this->db->query('ALTER TABLE os ADD COLUMN valor_desconto INTEGER DEFAULT 0');
        $this->db->query('ALTER TABLE os ADD COLUMN tipo_desconto TEXT');
        $this->registrarBaixa(2);
        $this->db->query("INSERT INTO produtos_os VALUES (2, 1, 1, 2, '20.00', '40.00')");
        $this->db->insert('trifase_estoque_eventos', [
            'produto_id' => 1, 'tipo' => 'os_saida', 'origem' => 'OS #1', 'quantidade' => -2,
            'saldo_antes' => 10, 'saldo_depois' => 8, 'data_movimento' => date('Y-m-d'),
            'motivo' => 'Baixa legada sem linha', 'usuario_id' => 2, 'criado_em' => date('Y-m-d H:i:s'),
            'operacao' => 'legado_1234567890', 'payload_hash' => str_repeat('a', 64),
        ]);
        $pedido = $this->pedido();
        $_ENV['TRIFASE_ESTOQUE_ENABLED'] = 'false';
        $id = $this->modelo->retirarItem(1, $pedido, 'produto', 2, 2, 'estoque_desligado_12');
        $this->assertSame($id, $this->modelo->retirarItem(1, $pedido, 'produto', 2, 2, 'estoque_desligado_12'));
        $this->assertSame(8, (int) $this->db->get('produtos')->row()->estoque);
        $retrato = json_decode($this->modelo->historico(1)[0]->retrato, true, 32, JSON_THROW_ON_ERROR);
        $this->assertSame(0, $retrato['quantidade_devolvida_estoque']);
        $this->assertNull($retrato['movimento_estoque_id']);
        $this->modelo->retirarItem(1, $pedido, 'produto', 1, 2, 'devolver_comprovada_12');
        $this->assertSame(10, (int) $this->db->get('produtos')->row()->estoque);
        $this->assertSame(0, $this->db->count_all('produtos_os'));
    }

    public function testFalhaNaDevolucaoParcialReverteMovimentoEQuantidade(): void
    {
        $this->db->query('ALTER TABLE os ADD COLUMN desconto INTEGER DEFAULT 0');
        $this->db->query('ALTER TABLE os ADD COLUMN valor_desconto INTEGER DEFAULT 0');
        $this->db->query('ALTER TABLE os ADD COLUMN tipo_desconto TEXT');
        $pedido = $this->pedido();
        $this->registrarBaixa(2);
        $this->db->db_debug = false;
        $this->db->query("CREATE TRIGGER falha_devolucao BEFORE INSERT ON trifase_cancelamentos WHEN NEW.tipo = 'retirar_item' BEGIN SELECT RAISE(FAIL, 'falha devolucao'); END");
        set_error_handler(static fn ($nivel, $mensagem) => $mensagem === 'SQLite3::exec(): falha devolucao');
        try {
            $this->modelo->retirarItem(1, $pedido, 'produto', 1, 2, 'devolucao_falha_123', null, 1);
            $this->fail('Devolveu sem registrar o evento.');
        } catch (RuntimeException $e) {
            $this->assertStringContainsString('preservar o registro', $e->getMessage());
            $linha = $this->db->get('produtos_os')->row();
            $this->assertSame(2, (int) $linha->quantidade);
            $this->assertSame('40.00', $linha->subTotal);
            $this->assertSame(8, (int) $this->db->get('produtos')->row()->estoque);
            $this->assertSame(1, $this->db->count_all('trifase_estoque_eventos'));
        } finally {
            restore_error_handler();
        }
    }

    public function testRetiradaDeServicoPreservaQuantidadeFracionaria(): void
    {
        $this->db->query('ALTER TABLE os ADD COLUMN desconto INTEGER DEFAULT 0');
        $this->db->query('ALTER TABLE os ADD COLUMN valor_desconto INTEGER DEFAULT 0');
        $this->db->query('ALTER TABLE os ADD COLUMN tipo_desconto TEXT');
        $this->db->where('idServicos_os', 1)->update('servicos_os', ['quantidade' => 0.5]);
        $pedido = $this->pedido();
        $this->modelo->retirarItem(1, $pedido, 'servico', 1, 2, 'retirar_servico_123');
        $evento = $this->modelo->historico(1)[0];
        $this->assertStringContainsString('Qtd. 0.5', $evento->motivo);
        $this->assertSame(0.5, (float) json_decode($evento->retrato, true)['item']['quantidade']);
        $this->assertSame(0, $this->db->count_all('servicos_os'));
    }

    public function testFalhaAoRegistrarPerdaPreservaPecaEDesconto(): void
    {
        $this->db->query('ALTER TABLE os ADD COLUMN desconto INTEGER DEFAULT 5');
        $this->db->query('ALTER TABLE os ADD COLUMN valor_desconto INTEGER DEFAULT 5');
        $this->db->query('ALTER TABLE os ADD COLUMN tipo_desconto TEXT');
        $pedido = $this->pedido();
        $this->db->db_debug = false;
        $this->db->query("CREATE TRIGGER falha_perda BEFORE INSERT ON trifase_cancelamentos WHEN NEW.tipo = 'consumir_peca' BEGIN SELECT RAISE(FAIL, 'falha perda'); END");
        set_error_handler(static fn ($nivel, $mensagem) => $mensagem === 'SQLite3::exec(): falha perda');
        try {
            $this->modelo->retirarItem(1, $pedido, 'produto', 1, 2, 'consumir_igbt_123456', 'Perda em bancada', 1);
            $this->fail('Removeu a peça sem registrar a perda');
        } catch (RuntimeException $e) {
            $this->assertStringContainsString('preservar o registro', $e->getMessage());
            $this->assertSame(2, (int) $this->db->where('os_id', 1)->get('produtos_os')->row()->quantidade);
            $this->assertSame(5, (int) $this->db->where('idOs', 1)->get('os')->row()->valor_desconto);
            $this->assertSame(0, $this->db->count_all('trifase_estoque_eventos'));
        } finally {
            restore_error_handler();
        }
    }

    public function testFalhaNoHistoricoPreservaConferenciaTecnicaSemCancelarParcialmente(): void
    {
        $pedido = $this->pedido();
        $this->devolverPecas();
        $this->modelo->conferirTecnica(1, $pedido, $this->dadosTecnicos(), 2, 'tecnica_123456789');
        $this->db->db_debug = false;
        $this->db->query("CREATE TRIGGER falha_historico BEFORE INSERT ON os_historico BEGIN SELECT RAISE(FAIL, 'falha cancelamento'); END");
        set_error_handler(static fn ($nivel, $mensagem) => $mensagem === 'SQLite3::exec(): falha cancelamento');
        try {
            $this->modelo->confirmar(1, $pedido, $this->dados(), 7, 'confirmacao_12345678');
            $this->fail('Confirmou parcialmente');
        } catch (RuntimeException $e) {
            $this->assertSame(10, (int) $this->db->get('produtos')->row()->estoque);
            $this->assertSame(2, $this->db->count_all('trifase_estoque_eventos'));
            $this->assertSame(2, $this->db->count_all('trifase_cancelamentos'));
            $this->assertSame('Aprovado', $this->db->where('idOs', 1)->get('os')->row()->status);
        } finally {
            restore_error_handler();
        }
    }
}
