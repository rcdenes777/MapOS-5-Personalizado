<?php

require_once APPPATH . 'models/Trifase_orcamento_model.php';
require_once APPPATH . 'database/migrations/20261102020000_trifase_orcamentos.php';
require_once BASEPATH . 'database/DB_forge.php';
require_once BASEPATH . 'database/drivers/sqlite3/sqlite3_forge.php';

final class TrifaseOrcamentoTest extends MaposTestCase
{
    private Trifase_orcamento_model $modelo;
    private string $token;

    protected function setUp(): void
    {
        parent::setUp();
        $this->db->query('CREATE TABLE os (idOs INTEGER PRIMARY KEY, clientes_id INTEGER, status TEXT, faturado INTEGER, valor_desconto REAL, tipo_desconto TEXT, desconto REAL)');
        $this->db->insert('os', ['idOs' => 1, 'clientes_id' => 3, 'status' => 'Em Andamento', 'faturado' => 0, 'valor_desconto' => 145, 'tipo_desconto' => 'real', 'desconto' => 5]);
        $this->db->insert('os', ['idOs' => 2, 'clientes_id' => 4, 'status' => 'Aberto', 'faturado' => 0]);
        $this->db->query('CREATE TABLE produtos (idProdutos INTEGER PRIMARY KEY, descricao TEXT, precoVenda REAL, precoCompra REAL)');
        $this->db->query('CREATE TABLE servicos (idServicos INTEGER PRIMARY KEY, nome TEXT, preco REAL)');
        $this->db->query('CREATE TABLE produtos_os (idProdutos_os INTEGER PRIMARY KEY, os_id INTEGER, produtos_id INTEGER, preco REAL, quantidade REAL, subTotal REAL, desconto REAL, tipo_desconto TEXT)');
        $this->db->query('CREATE TABLE servicos_os (idServicos_os INTEGER PRIMARY KEY, os_id INTEGER, servicos_id INTEGER, preco REAL, quantidade REAL, subTotal REAL, desconto REAL, tipo_desconto TEXT)');
        $this->db->insert('produtos', ['idProdutos' => 1, 'descricao' => 'Peça de teste', 'precoVenda' => 30, 'precoCompra' => 7.13]);
        $this->db->insert('servicos', ['idServicos' => 1, 'nome' => 'Serviço de teste', 'preco' => 100]);
        $this->db->insert('produtos_os', ['idProdutos_os' => 1, 'os_id' => 1, 'produtos_id' => 1, 'preco' => 30, 'quantidade' => 2, 'subTotal' => 50, 'desconto' => 10, 'tipo_desconto' => 'real']);
        $this->db->insert('servicos_os', ['idServicos_os' => 1, 'os_id' => 1, 'servicos_id' => 1, 'preco' => 100, 'quantidade' => 1, 'subTotal' => 100, 'desconto' => 0]);
        $this->db->query('CREATE TABLE os_historico (os_id INTEGER, status_anterior TEXT, status_novo TEXT, usuarios_id INTEGER, data_hora TEXT)');
        $this->db->query('CREATE TABLE trifase_publico_links (os_id INTEGER, token_hash TEXT, expira_em INTEGER)');
        $this->token = str_repeat('a', 64);
        $this->db->insert('trifase_publico_links', ['os_id' => 1, 'token_hash' => hash('sha256', $this->token), 'expira_em' => time() + 86400]);
        $m = new class() extends Migration_trifase_orcamentos {
            public object $dbforge;
        };
        $m->db = $this->db;
        $m->dbforge = new CI_DB_sqlite3_forge($this->db);
        $m->up();
        $m->up();
        $this->modelo = new Trifase_orcamento_model();
        $this->modelo->db = $this->db;
    }

    private function chave(string $id): string
    {
        return str_pad($id, 24, '_');
    }
    private function retrato(): array
    {
        return $this->modelo->retrato($this->db->where('idOs', 1)->get('os')->row());
    }
    private function publicar(string $chave = 'publicar'): int
    {
        return $this->modelo->publicar(1, $this->modelo->hash($this->retrato()), 7, $this->chave($chave));
    }

    public function testApresentacaoPublicadaCongelaTextosSemVazarDadosInternos(): void
    {
        $this->db->query('ALTER TABLE os ADD COLUMN laudoTecnico TEXT');
        $this->db->query('ALTER TABLE os ADD COLUMN observacoes TEXT');
        $this->db->where('idOs', 1)->update('os', ['laudoTecnico' => 'LAUDO_INTERNO', 'observacoes' => 'NOTA_PRIVADA']);
        $dados = ['equipamento' => 'LG · Inverter', 'defeito' => 'Não liga', 'diagnostico' => 'Falha na fonte', 'pagamento' => 'Na retirada', 'prazo' => '5 dias úteis', 'garantia' => '90 dias', 'observacoes' => 'NAO_PUBLICAR'];
        $hash = $this->modelo->hash($this->retrato());
        $id = $this->modelo->publicar(1, $hash, 7, $this->chave('texto'), $dados);
        $this->assertSame($id, $this->modelo->publicar(1, $hash, 7, $this->chave('texto'), $dados));
        $publicado = $this->modelo->publicado(1, $this->token);
        $this->assertNotNull($publicado);
        $conteudo = json_decode($publicado->conteudo, true);
        $this->assertSame('Falha na fonte', $conteudo['apresentacao']['diagnostico']);
        $this->assertSame(14500, $conteudo['total_c']);
        foreach (['NOTA_PRIVADA', 'LAUDO_INTERNO', 'NAO_PUBLICAR'] as $privado) {
            $this->assertStringNotContainsString($privado, $publicado->conteudo);
        }
        $this->db->where('idOs', 1)->update('os', ['laudoTecnico' => 'Outro laudo']);
        $this->assertSame($publicado->conteudo, $this->modelo->publicado(1, $this->token)->conteudo);
        try {
            $this->modelo->publicar(1, $hash, 7, $this->chave('texto'), array_replace($dados, ['diagnostico' => 'Outro diagnóstico']));
            $this->fail('Reutilizou chave com texto diferente');
        } catch (DomainException $e) {
            $this->assertSame(1, $this->db->count_all('trifase_orcamento_versoes'));
        }
        $this->modelo->responder(1, $this->token, $id, 'aprovar', 'Cliente QA', '1', $this->chave('resposta-texto'));
        $this->assertSame('aprovar', $this->modelo->decisao($id)->tipo);
    }

    public function testTextosInvalidosNaoPublicam(): void
    {
        foreach ([['diagnostico' => []], ['defeito' => str_repeat('a', 4001)], ['garantia' => "teste\0"]] as $dados) {
            try {
                $this->modelo->publicar(1, $this->modelo->hash($this->retrato()), 7, $this->chave('invalido'), $dados);
                $this->fail('Aceitou texto inválido');
            } catch (DomainException $e) {
                $this->assertSame(0, $this->db->count_all('trifase_orcamento_versoes'));
            }
        }
    }

    public function testAprovacaoMudaSomenteOrcamentoOuNegociacaoUmaVez(): void
    {
        foreach (['Orçamento', 'Negociação', 'Aberto', 'Em Andamento', 'Aguardando Peças', 'Finalizado', 'Aprovado'] as $indice => $status) {
            $this->db->where('idOs', 1)->update('os', ['status' => $status]);
            $this->db->empty_table('os_historico');
            $id = $this->publicar('publicar-' . $indice);
            $antes = $this->db->where('idOs', 1)->get('os')->row_array();
            $this->modelo->responder(1, $this->token, $id, 'aprovar', 'Cliente QA', '1', $this->chave('aprovar-' . $indice));
            $this->modelo->responder(1, $this->token, $id, 'aprovar', 'Cliente QA', '1', $this->chave('aprovar-' . $indice));
            $muda = in_array($status, ['Orçamento', 'Negociação'], true);
            $depois = $this->db->where('idOs', 1)->get('os')->row_array();
            $this->assertSame($muda ? 'Aprovado' : $status, $depois['status']);
            unset($antes['status'], $depois['status']);
            $this->assertSame($antes, $depois);
            $this->assertSame($muda ? 1 : 0, $this->db->count_all('os_historico'));
            if ($muda) {
                $h = $this->db->get('os_historico')->row();
                $this->assertNull($h->usuarios_id);
                $this->assertSame($status, $h->status_anterior);
                $this->assertSame($this->modelo->decisao($id)->criado_em, $h->data_hora);
            }
        }
    }

    public function testRecusaMantemNegociacaoESemMudancaNoHistorico(): void
    {
        $this->db->where('idOs', 1)->update('os', ['status' => 'Negociação']);
        $id = $this->publicar();
        $this->modelo->responder(1, $this->token, $id, 'recusar', 'Cliente QA', '1', $this->chave('recusar'));
        $this->assertSame('Negociação', $this->db->where('idOs', 1)->get('os')->row()->status);
        $this->assertSame(0, $this->db->count_all('os_historico'));
    }

    public function testFalhaNoHistoricoReverteTambemAResposta(): void
    {
        $this->db->where('idOs', 1)->update('os', ['status' => 'Orçamento']);
        $id = $this->publicar();
        $this->db->db_debug = false;
        $this->db->query("CREATE TRIGGER falha_historico BEFORE INSERT ON os_historico BEGIN SELECT RAISE(FAIL, 'falha historico'); END");
        set_error_handler(static fn ($nivel, $mensagem) => $mensagem === 'SQLite3::exec(): falha historico');
        try {
            $this->modelo->responder(1, $this->token, $id, 'aprovar', 'Cliente QA', '1', $this->chave('falha'));
            $this->fail('Registrou decisão sem histórico');
        } catch (RuntimeException $e) {
            $this->assertNull($this->modelo->decisao($id));
            $this->assertSame('Orçamento', $this->db->where('idOs', 1)->get('os')->row()->status);
        } finally {
            restore_error_handler();
        }
    }

    public function testVersaoExplicitaImutavelECentavosNaoExpondoCusto(): void
    {
        $antes = $this->db->get('os')->result_array();
        $r = $this->retrato();
        $this->assertSame(14500, $r['total_c']);
        $this->assertSame(1000, $r['itens'][0]['desconto_c']);
        $id = $this->publicar();
        $this->assertSame($id, $this->publicar());
        $this->assertSame(1, $this->db->count_all('trifase_orcamento_versoes'));
        $this->assertStringNotContainsString('precoCompra', $this->modelo->atual(1)->conteudo);
        $this->assertEquals($antes, $this->db->get('os')->result_array());
        $this->assertNotNull($this->modelo->publicado(1, $this->token));
        $this->assertNull($this->modelo->publicado(2, $this->token));
    }

    public function testDecisaoIdempotenteNaoFaturaNemMudaAndamentoERecusaOutraResposta(): void
    {
        $id = $this->publicar();
        $antes = $this->db->get('os')->result_array();
        $this->modelo->responder(1, $this->token, $id, 'aprovar', 'Pessoa QA', '1', $this->chave('decisao'));
        $this->modelo->responder(1, $this->token, $id, 'aprovar', 'Pessoa QA', '1', $this->chave('decisao'));
        foreach ([['recusar', 'Pessoa QA', 'decisao'], ['recusar', 'Pessoa QA', 'outra']] as [$tipo, $nome, $chave]) {
            try {
                $this->modelo->responder(1, $this->token, $id, $tipo, $nome, '1', $this->chave($chave));
                $this->fail('Sobrescreveu decisão');
            } catch (DomainException $e) {
                $this->assertSame('aprovar', $this->modelo->decisao($id)->tipo);
            }
        }
        $this->assertSame(2, $this->db->count_all('trifase_orcamento_eventos'));
        $this->assertSame($antes, $this->db->get('os')->result_array());
    }

    public function testPrecoMudadoImpedeDecidirVersaoAntigaENovaMantemHistorico(): void
    {
        $id = $this->publicar();
        $original = $this->modelo->atual(1)->conteudo;
        $this->db->where('idProdutos_os', 1)->update('produtos_os', ['subTotal' => 40]);
        $this->assertNull($this->modelo->publicado(1, $this->token));
        try {
            $this->modelo->responder(1, $this->token, $id, 'aprovar', 'Pessoa QA', '1', $this->chave('antiga'));
            $this->fail('Aprovou preço alterado');
        } catch (DomainException $e) {
            $this->assertNull($this->modelo->decisao($id));
        }
        $novo = $this->publicar('segunda');
        $this->modelo->responder(1, $this->token, $novo, 'recusar', 'Pessoa QA', '1', $this->chave('recusa'));
        $this->assertSame('recusar', $this->modelo->decisao($novo)->tipo);
        $this->assertSame($original, $this->modelo->historico(1)[1]->conteudo);
        $this->assertSame(2, (int) $this->modelo->atual(1)->numero);
        try {
            $this->modelo->responder(1, $this->token, $id, 'aprovar', 'Pessoa QA', '1', $this->chave('outra-antiga'));
            $this->fail('Aprovou versão substituída');
        } catch (DomainException $e) {
            $this->assertNull($this->modelo->decisao($id));
        }
    }

    public function testRetiradaRevogacaoExpiracaoTokenErradoECancelamentoNegamResposta(): void
    {
        $id = $this->publicar();
        foreach ([str_repeat('b', 64), [], null] as $token) {
            $this->assertNull($this->modelo->publicado(1, $token));
            try {
                $this->modelo->responder(1, $token, $id, 'aprovar', 'Pessoa QA', '1', $this->chave('invalida'));
                $this->fail('Aceitou token inválido');
            } catch (DomainException $e) {
                $this->assertNull($this->modelo->decisao($id));
            }
        }
        $this->db->update('trifase_publico_links', ['expira_em' => time() - 1]);
        $this->assertNull($this->modelo->publicado(1, $this->token));
        $this->db->update('trifase_publico_links', ['expira_em' => time() + 60, 'token_hash' => null]);
        $this->assertNull($this->modelo->publicado(1, $this->token));
        $this->db->update('trifase_publico_links', ['token_hash' => hash('sha256', $this->token)]);
        $this->modelo->retirar(1, $id, 7, $this->chave('retirar'));
        $this->modelo->retirar(1, $id, 7, $this->chave('retirar'));
        $this->assertNull($this->modelo->publicado(1, $this->token));
        $this->assertTrue(trifaseOrcamentoTemHistorico($this->db, 1));
        $this->assertSame(2, $this->db->count_all('trifase_orcamento_eventos'));
        $this->db->where('idOs', 1)->update('os', ['status' => 'Cancelado']);
        $this->expectException(DomainException::class);
        $this->publicar('cancelada');
    }

    public function testPreviaAntigaEConfirmacaoInvalidaNaoGravam(): void
    {
        try {
            $this->modelo->publicar(1, str_repeat('0', 64), 7, $this->chave('hash'));
            $this->fail('Publicou prévia desatualizada');
        } catch (DomainException $e) {
            $this->assertSame(0, $this->db->count_all('trifase_orcamento_versoes'));
        }
        $id = $this->publicar();
        foreach ([['', '1', 'aprovar'], [[], '1', 'aprovar'], ['Pessoa QA', '0', 'aprovar'], ['Pessoa QA', '1', 'pagar'], ["Pessoa\0QA", '1', 'aprovar']] as [$nome, $confirmar, $tipo]) {
            try {
                $this->modelo->responder(1, $this->token, $id, $tipo, $nome, $confirmar, $this->chave('invalida'));
                $this->fail('Aceitou resposta inválida');
            } catch (DomainException $e) {
                $this->assertNull($this->modelo->decisao($id));
            }
        }
    }
    public function testFalhaAoPublicarReverteVersaoEEvento(): void
    {
        $this->db->db_debug = false;
        $this->db->query("CREATE TRIGGER falhar_publicacao BEFORE INSERT ON trifase_orcamento_estado BEGIN SELECT RAISE(FAIL, 'falha simulada'); END");
        // A falha deliberada do SQLite emite também um aviso PHP; aceitar
        // somente esse aviso específico, preservando o handler nos demais.
        set_error_handler(static fn ($nivel, $mensagem) => $mensagem === 'SQLite3::exec(): falha simulada');
        try {
            $this->publicar();
            $this->fail('Confirmou publicação incompleta');
        } catch (RuntimeException $e) {
            $this->assertSame(0, $this->db->count_all('trifase_orcamento_versoes'));
            $this->assertSame(0, $this->db->count_all('trifase_orcamento_eventos'));
            $this->assertNull($this->modelo->atual(1));
        } finally {
            restore_error_handler();
        }
    }
}
