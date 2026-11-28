<?php

require_once APPPATH . 'models/Trifase_orcamento_model.php';
require_once APPPATH . 'models/Trifase_entrega_model.php';
require_once APPPATH . 'database/migrations/20261102000000_trifase_entregas.php';
require_once APPPATH . 'database/migrations/20261102020000_trifase_orcamentos.php';
require_once APPPATH . 'database/migrations/20261119010000_trifase_orcamento_comunicacao.php';
require_once APPPATH . 'database/migrations/20261119020000_trifase_orcamento_regularizacao.php';
require_once APPPATH . 'database/migrations/20261124010000_trifase_orcamento_data_comunicacao.php';
require_once BASEPATH . 'database/DB_forge.php';
require_once BASEPATH . 'database/drivers/sqlite3/sqlite3_forge.php';

final class TrifaseOrcamentoSimplificadoTest extends MaposTestCase
{
    private Trifase_orcamento_model $modelo;
    private string $token;

    protected function setUp(): void
    {
        parent::setUp();
        $this->db->query('CREATE TABLE os (idOs INTEGER PRIMARY KEY, clientes_id INTEGER, status TEXT, faturado INTEGER, valor_desconto REAL, tipo_desconto TEXT, desconto REAL)');
        $this->db->insert('os', ['idOs' => 1, 'clientes_id' => 3, 'status' => 'Negociação', 'faturado' => 0]);
        $this->db->query('CREATE TABLE produtos (idProdutos INTEGER PRIMARY KEY, descricao TEXT, precoVenda REAL, precoCompra REAL)');
        $this->db->query('CREATE TABLE servicos (idServicos INTEGER PRIMARY KEY, nome TEXT, preco REAL)');
        $this->db->query('CREATE TABLE produtos_os (idProdutos_os INTEGER PRIMARY KEY, os_id INTEGER, produtos_id INTEGER, preco REAL, quantidade REAL, subTotal REAL, desconto REAL, tipo_desconto TEXT)');
        $this->db->query('CREATE TABLE servicos_os (idServicos_os INTEGER PRIMARY KEY, os_id INTEGER, servicos_id INTEGER, preco REAL, quantidade REAL, subTotal REAL, desconto REAL, tipo_desconto TEXT)');
        $this->db->insert('servicos', ['idServicos' => 1, 'nome' => 'Serviço de teste', 'preco' => 60]);
        $this->db->insert('servicos_os', ['idServicos_os' => 1, 'os_id' => 1, 'servicos_id' => 1, 'preco' => 60, 'quantidade' => 1, 'subTotal' => 60, 'desconto' => 0]);
        $this->db->query('CREATE TABLE os_historico (os_id INTEGER, status_anterior TEXT, status_novo TEXT, usuarios_id INTEGER, data_hora TEXT)');
        $this->db->query('CREATE TABLE trifase_publico_links (os_id INTEGER, token_hash TEXT, expira_em INTEGER)');
        $this->token = str_repeat('b', 64);
        $this->db->insert('trifase_publico_links', ['os_id' => 1, 'token_hash' => hash('sha256', $this->token), 'expira_em' => time() + 86400]);
        foreach ([new class() extends Migration_trifase_orcamentos {
            public object $dbforge;
        },
            new class() extends Migration_trifase_orcamento_comunicacao {
                public object $dbforge;
            },
            new class() extends Migration_trifase_orcamento_regularizacao {
                public object $dbforge;
            },
            new class() extends Migration_trifase_orcamento_data_comunicacao {
                public object $dbforge;
            }] as $m) {
            $m->db = $this->db;
            $m->dbforge = new CI_DB_sqlite3_forge($this->db);
            $m->up();
            $m->up();
        }
        $this->modelo = new Trifase_orcamento_model();
        $this->modelo->db = $this->db;
    }

    private function publicar(): int
    {
        return $this->modelo->publicar(1, $this->modelo->hash($this->modelo->retrato($this->os())), 7, str_pad('pub', 16, 'x'));
    }

    private function os(): object
    {
        return $this->db->where('idOs', 1)->get('os')->row();
    }

    private function entregar(?string $dia = null): void
    {
        $m = new class() extends Migration_trifase_entregas {
            public object $dbforge;
        };
        $m->db = $this->db;
        $m->dbforge = new CI_DB_sqlite3_forge($this->db);
        $m->up();
        $e = new Trifase_entrega_model();
        $e->db = $this->db;
        $e->registrar(1, ['recebedor' => 'Cliente QA', 'entregue_em' => ($dia ?? date('Y-m-d')),
            'itens' => 'Equipamento sintético', 'terceiro' => '0', 'confirmou_condicoes' => '1'], 7, str_pad('ent', 16, 'y'));
    }

    public function testAprovacaoComApenasDataGravaDecisaoESemHora(): void
    {
        $versao = $this->publicar();
        $this->modelo->registrarRespostaInterna(
            1,
            $versao,
            'aprovar',
            'Cliente QA',
            '1',
            str_pad('data', 16, 'z'),
            7,
            ['canal' => 'presencial', 'comunicado_em' => '2026-11-20']
        );
        $decisao = $this->modelo->decisao($versao);
        $this->assertNotNull($decisao);
        $this->assertSame('aprovar', $decisao->tipo);
        $this->assertSame('2026-11-20', $decisao->comunicado_data);
        $this->assertNull($decisao->comunicado_em);
        $this->assertSame('Aprovado', trifaseOrcamentoSituacao($decisao));
    }

    public function testLinkPublicoRefleteAprovacaoComData(): void
    {
        $versao = $this->publicar();
        $this->modelo->registrarRespostaInterna(
            1,
            $versao,
            'aprovar',
            'Cliente QA',
            '1',
            str_pad('link', 16, 'w'),
            7,
            ['canal' => 'presencial', 'comunicado_em' => '2026-11-20']
        );
        $this->assertNotNull($this->modelo->publicado(1, $this->token));
        $this->assertSame('aprovar', $this->modelo->decisao($versao)->tipo);
        $this->assertSame('Aprovado', trifaseOrcamentoSituacao($this->modelo->decisao($versao)));
    }

    public function testRegistroAposEntregaAceitaDataIgualOuAnterior(): void
    {
        $versao = $this->publicar();
        $this->db->where('idOs', 1)->update('os', ['status' => 'Finalizado']);
        $this->entregar('2026-11-20');
        $this->modelo->registrarRespostaInterna(
            1,
            $versao,
            'aprovar',
            'Cliente QA',
            '1',
            str_pad('pos', 16, 'v'),
            7,
            ['canal' => 'presencial', 'comunicado_em' => '2026-11-20']
        );
        $decisao = $this->modelo->decisao($versao);
        $this->assertSame('aprovar', $decisao->tipo);
        $this->assertSame(1, (int) $decisao->regularizacao_tardia);
        $this->assertGreaterThan(0, (int) $decisao->entrega_id);
        $this->assertSame('Finalizado', $this->os()->status);
    }

    public function testRegistroAposEntregaNegaDataPosterior(): void
    {
        $versao = $this->publicar();
        $this->entregar('2026-11-20');
        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('posterior à entrega');
        $this->modelo->registrarRespostaInterna(
            1,
            $versao,
            'aprovar',
            'Cliente QA',
            '1',
            str_pad('fut', 16, 'u'),
            7,
            ['canal' => 'presencial', 'comunicado_em' => '2026-11-21']
        );
    }

    public function testPublicoContinuaBloqueadoAposEntrega(): void
    {
        $versao = $this->publicar();
        $this->entregar('2026-11-20');
        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('entregue');
        $this->modelo->responder(1, $this->token, $versao, 'aprovar', 'Cliente QA', '1', str_pad('pub2', 16, 't'));
    }

    public function testRecusaRegistradaComDataNaoViraAprovacao(): void
    {
        $versao = $this->publicar();
        $this->assertNull($this->modelo->decisao($versao));
        $this->modelo->registrarRespostaInterna(
            1,
            $versao,
            'recusar',
            'Cliente QA',
            '1',
            str_pad('rec', 16, 's'),
            7,
            ['canal' => 'telefone', 'comunicado_em' => '2026-11-20']
        );
        $this->assertSame('recusar', $this->modelo->decisao($versao)->tipo);
        $this->assertSame('Recusado', trifaseOrcamentoSituacao($this->modelo->decisao($versao)));
    }

    public function testRespostaInternaObsoletaNaoDecideValoresNaoConfirmados(): void
    {
        $versao = $this->publicar();
        $antesVersoes = $this->db->get('trifase_orcamento_versoes')->result_array();
        $antesEventos = $this->db->get('trifase_orcamento_eventos')->result_array();
        $this->db->where('idServicos_os', 1)->update('servicos_os', ['preco' => 85, 'subTotal' => 85]);
        try {
            $this->modelo->registrarRespostaInterna(
                1,
                $versao,
                'aprovar',
                'Cliente QA',
                '1',
                str_pad('stale', 16, 'x'),
                7,
                ['canal' => 'telefone', 'comunicado_em' => '2026-11-20']
            );
            $this->fail('A versão antiga não confirma os valores atuais.');
        } catch (DomainException $e) {
            $this->assertStringContainsString('indisponível ou atualizado', $e->getMessage());
        }
        $this->assertSame($antesVersoes, $this->db->get('trifase_orcamento_versoes')->result_array());
        $this->assertSame($antesEventos, $this->db->get('trifase_orcamento_eventos')->result_array());
        $this->assertNull($this->modelo->decisao($versao));
    }

    public function testPreviaAntigaRecusadaEPreviaAtualConfirmadaPermiteRegistro(): void
    {
        $versao = $this->publicar();
        $hashAnterior = $this->modelo->hash($this->modelo->retrato($this->os()));
        $this->db->where('idServicos_os', 1)->update('servicos_os', ['preco' => 85, 'subTotal' => 85]);
        $versoes = $this->db->get('trifase_orcamento_versoes')->result_array();
        $eventos = $this->db->get('trifase_orcamento_eventos')->result_array();
        $dados = ['canal' => 'telefone', 'comunicado_em' => '2026-11-20'];
        try {
            $this->modelo->registrarRespostaInterna(1, $versao, 'aprovar', 'Cliente QA', '1', str_pad('preview', 16, 'x'), 7, $dados, $hashAnterior);
            $this->fail('Prévia antiga aceita.');
        } catch (DomainException $e) {
            $this->assertStringContainsString('indisponível ou atualizado', $e->getMessage());
        }
        $this->assertSame($versoes, $this->db->get('trifase_orcamento_versoes')->result_array());
        $this->assertSame($eventos, $this->db->get('trifase_orcamento_eventos')->result_array());
        $hashAtual = $this->modelo->hash($this->modelo->retrato($this->os()));
        $this->modelo->registrarRespostaInterna(1, $versao, 'aprovar', 'Cliente QA', '1', str_pad('preview', 16, 'x'), 7, $dados, $hashAtual);
        $atual = $this->modelo->atual(1);
        $this->assertSame(8500, json_decode($atual->conteudo, true)['total_c']);
        $this->assertSame('aprovar', $this->modelo->decisao((int) $atual->id)->tipo);
        $this->modelo->registrarRespostaInterna(1, $versao, 'aprovar', 'Cliente QA', '1', str_pad('preview', 16, 'x'), 7, $dados, $hashAtual);
        try {
            $this->modelo->registrarRespostaInterna(1, $versao, 'aprovar', 'Cliente QA', '1', str_pad('preview', 16, 'x'), 7, $dados, $hashAnterior);
            $this->fail('Reenvio com prévia diferente aceito.');
        } catch (DomainException $e) {
            $this->assertStringContainsString('Chave já utilizada', $e->getMessage());
        }
    }

    public function testRegularizacaoTardiaUsaVersaoDocumentadaMesmoComAlteracaoPosterior(): void
    {
        $versao = $this->publicar();
        $this->entregar();
        $this->db->where('idServicos_os', 1)->update('servicos_os', ['preco' => 85, 'subTotal' => 85]);
        $versoes = $this->db->get('trifase_orcamento_versoes')->result_array();
        try {
            $this->modelo->registrarRegularizacao(
                1,
                $versao,
                'aprovar',
                'Cliente QA',
                '1',
                str_pad('hist', 16, 'x'),
                7,
                ['canal' => 'telefone', 'comunicado_em' => date('Y-m-d'), 'justificativa' => 'Resposta recebida antes da entrega']
            );
        } catch (DomainException $e) {
            $this->fail('Versão histórica documentada recusada: ' . $e->getMessage());
        }
        $this->assertSame($versoes, $this->db->get('trifase_orcamento_versoes')->result_array());
        $this->assertSame('aprovar', $this->modelo->decisao($versao)->tipo);
        $this->assertSame(6000, json_decode($versoes[0]['conteudo'], true)['total_c']);
    }

    public function testEntregaNaoPermiteCriarSnapshotDosValoresAtuaisParaRespostaTardia(): void
    {
        $versao = $this->publicar();
        $this->entregar('2026-11-20');
        $this->db->where('idServicos_os', 1)->update('servicos_os', ['preco' => 85, 'subTotal' => 85]);
        $antes = $this->db->get('trifase_orcamento_versoes')->result_array();
        $eventos = $this->db->get('trifase_orcamento_eventos')->result_array();
        try {
            $this->modelo->registrarRespostaInterna(
                1,
                $versao,
                'aprovar',
                'Cliente QA',
                '1',
                str_pad('late', 16, 'x'),
                7,
                ['canal' => 'telefone', 'comunicado_em' => '2026-11-20'],
                $this->modelo->hash($this->modelo->retrato($this->os()))
            );
            $this->fail('Entrega não permite criar snapshot dos valores atuais.');
        } catch (DomainException $e) {
            $this->assertStringContainsString('versão histórica', $e->getMessage());
        }
        $this->assertSame($antes, $this->db->get('trifase_orcamento_versoes')->result_array());
        $this->assertSame($eventos, $this->db->get('trifase_orcamento_eventos')->result_array());
        $this->assertNull($this->modelo->decisao($versao));
    }

    public function testVersaoForjadaNaoCriaSnapshot(): void
    {
        $versao = $this->publicar();
        $this->entregar('2026-11-20');
        $this->db->where('idServicos_os', 1)->update('servicos_os', ['preco' => 85, 'subTotal' => 85]);
        $antes = (int) $this->db->where('os_id', 1)->count_all_results('trifase_orcamento_versoes');
        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('indisponível ou atualizado');
        try {
            $this->modelo->registrarRespostaInterna(
                1,
                (int) $versao + 99,
                'aprovar',
                'Cliente QA',
                '1',
                str_pad('forg', 16, 'k'),
                7,
                ['canal' => 'presencial', 'comunicado_em' => '2026-11-20']
            );
        } finally {
            $this->assertSame($antes, (int) $this->db->where('os_id', 1)->count_all_results('trifase_orcamento_versoes'));
            $this->assertNull($this->modelo->decisao($versao));
        }
    }

    public function testSnapshotPreservaApresentacaoEMantemVersaoVigente(): void
    {
        $versao = $this->modelo->publicar(
            1,
            $this->modelo->hash($this->modelo->retrato($this->os())),
            7,
            str_pad('pres', 16, 'j'),
            ['equipamento' => 'Bicicleta', 'defeito' => 'Freio', 'diagnostico' => '', 'pagamento' => '', 'prazo' => '', 'garantia' => '']
        );
        $this->db->where('idOs', 1)->update('os', ['status' => 'Finalizado']);
        $this->db->where('idServicos_os', 1)->update('servicos_os', ['preco' => 85, 'subTotal' => 85]);
        $this->modelo->registrarRespostaInterna(
            1,
            $versao,
            'aprovar',
            'Cliente QA',
            '1',
            str_pad('pre2', 16, 'x'),
            7,
            ['canal' => 'presencial', 'comunicado_em' => '2026-11-20'],
            $this->modelo->hash($this->modelo->retrato($this->os()))
        );
        $atual = $this->modelo->atual(1);
        $this->assertSame(1, (int) $atual->ativo);
        $conteudo = json_decode((string) $this->db->where('id', $atual->id)->get('trifase_orcamento_versoes')->row()->conteudo, true);
        $this->assertSame('Bicicleta', $conteudo['apresentacao']['equipamento']);
        $this->assertNotNull($this->modelo->versaoVigente($this->os()));
        $this->assertSame('aprovar', $this->modelo->decisao((int) $atual->id)->tipo);
    }

    public function testItensEditadosAntesDaEntregaCriamVersaoNoAtoDoRegistro(): void
    {
        $versao = $this->publicar();
        $this->db->where('idOs', 1)->update('os', ['status' => 'Finalizado']);
        $this->db->where('idServicos_os', 1)->update('servicos_os', ['preco' => 85, 'subTotal' => 85]);
        $this->assertNull($this->modelo->decisao($versao));
        $antes = (int) $this->db->where('os_id', 1)->count_all_results('trifase_orcamento_versoes');
        $this->modelo->registrarRespostaInterna(
            1,
            $versao,
            'aprovar',
            'Cliente QA',
            '1',
            str_pad('snap', 16, 'q'),
            7,
            ['canal' => 'presencial', 'comunicado_em' => '2026-11-20'],
            $this->modelo->hash($this->modelo->retrato($this->os()))
        );
        $atual = $this->modelo->atual(1);
        $this->assertSame($antes + 1, (int) $atual->numero);
        $this->assertGreaterThan($versao, (int) $atual->id);
        $this->assertSame(1, (int) $atual->ativo);
        $decisao = $this->modelo->decisao((int) $atual->id);
        $this->assertNotNull($decisao);
        $this->assertSame('aprovar', $decisao->tipo);
        $this->assertNull($this->modelo->decisao($versao));
        $this->assertSame(1, (int) $this->db->where('id', $versao)->count_all_results('trifase_orcamento_versoes'));
        $conteudo = json_decode((string) $this->db->where('id', $atual->id)->get('trifase_orcamento_versoes')->row()->conteudo, true);
        $this->assertEquals(8500, $conteudo['itens'][0]['total_c'] ?? null);
        $this->assertSame('Finalizado', $this->os()->status);
    }

    public function testReenvioAposSnapshotNaoCriaOutraVersaoNemOutroEvento(): void
    {
        $versao = $this->publicar();
        $this->db->where('idServicos_os', 1)->update('servicos_os', ['preco' => 85, 'subTotal' => 85]);
        $dados = ['canal' => 'presencial', 'comunicado_em' => '2026-11-20'];
        $this->modelo->registrarRespostaInterna(1, $versao, 'aprovar', 'Cliente QA', '1', str_pad('rpt', 16, 'p'), 7, $dados, $this->modelo->hash($this->modelo->retrato($this->os())));
        $versoes = (int) $this->db->where('os_id', 1)->count_all_results('trifase_orcamento_versoes');
        $eventos = (int) $this->db->where('os_id', 1)->count_all_results('trifase_orcamento_eventos');
        $this->modelo->registrarRespostaInterna(1, $versao, 'aprovar', 'Cliente QA', '1', str_pad('rpt', 16, 'p'), 7, $dados, $this->modelo->hash($this->modelo->retrato($this->os())));
        $this->assertSame($versoes, (int) $this->db->where('os_id', 1)->count_all_results('trifase_orcamento_versoes'));
        $this->assertSame($eventos, (int) $this->db->where('os_id', 1)->count_all_results('trifase_orcamento_eventos'));
    }

    public function testPublicacaoRetiradaNaoImpedeRegistroEGeraVersaoAtiva(): void
    {
        $versao = $this->publicar();
        $this->modelo->retirar(1, $versao, 7, str_pad('ret', 16, 'o'));
        $this->assertNull($this->modelo->publicado(1, $this->token));
        $this->modelo->registrarRespostaInterna(
            1,
            $versao,
            'aprovar',
            'Cliente QA',
            '1',
            str_pad('ret2', 16, 'n'),
            7,
            ['canal' => 'presencial', 'comunicado_em' => '2026-11-20'],
            $this->modelo->hash($this->modelo->retrato($this->os()))
        );
        $atual = $this->modelo->atual(1);
        $this->assertSame(1, (int) $atual->ativo);
        $this->assertSame('aprovar', $this->modelo->decisao((int) $atual->id)->tipo);
        $this->assertNotNull($this->modelo->publicado(1, $this->token));
    }

    public function testSnapshotRecusaOrcamentoAcimaDoLimiteSemGravarVersao(): void
    {
        $versao = $this->publicar();
        $this->db->insert('produtos', ['idProdutos' => 1, 'descricao' => 'Peça sintética', 'precoVenda' => 1]);
        for ($lote = 0; $lote < 8; $lote++) {
            $linhas = [];
            for ($i = 0; $i < 100; $i++) {
                $linhas[] = ['os_id' => 1, 'produtos_id' => 1, 'preco' => 1, 'quantidade' => 1,
                    'subTotal' => 1, 'desconto' => 0];
            }
            $this->db->insert_batch('produtos_os', $linhas);
        }
        $this->assertGreaterThan(60000, strlen(json_encode($this->modelo->retrato($this->os()), JSON_THROW_ON_ERROR)));
        $antes = (int) $this->db->where('os_id', 1)->count_all_results('trifase_orcamento_versoes');
        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('muito extenso');
        try {
            $this->modelo->registrarRespostaInterna(
                1,
                $versao,
                'aprovar',
                'Cliente QA',
                '1',
                str_pad('big', 16, 'z'),
                7,
                ['canal' => 'presencial', 'comunicado_em' => '2026-11-20'],
                $this->modelo->hash($this->modelo->retrato($this->os()))
            );
        } finally {
            $this->assertSame($antes, (int) $this->db->where('os_id', 1)->count_all_results('trifase_orcamento_versoes'));
        }
    }

    public function testSegundaRespostaComVersaoAntigaNaoCriaOutraVersao(): void
    {
        $versao = $this->publicar();
        $this->db->where('idServicos_os', 1)->update('servicos_os', ['preco' => 85, 'subTotal' => 85]);
        $this->modelo->registrarRespostaInterna(
            1,
            $versao,
            'aprovar',
            'Cliente QA',
            '1',
            str_pad('um', 16, 'm'),
            7,
            ['canal' => 'presencial', 'comunicado_em' => '2026-11-20'],
            $this->modelo->hash($this->modelo->retrato($this->os()))
        );
        $versoes = (int) $this->db->where('os_id', 1)->count_all_results('trifase_orcamento_versoes');
        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('indisponível ou atualizado');
        try {
            $this->modelo->registrarRespostaInterna(
                1,
                $versao,
                'recusar',
                'Cliente QA',
                '1',
                str_pad('dois', 16, 'l'),
                7,
                ['canal' => 'telefone', 'comunicado_em' => '2026-11-20']
            );
        } finally {
            $this->assertSame($versoes, (int) $this->db->where('os_id', 1)->count_all_results('trifase_orcamento_versoes'));
        }
    }
}
