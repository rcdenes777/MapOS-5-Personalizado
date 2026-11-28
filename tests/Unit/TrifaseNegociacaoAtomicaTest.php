<?php

if (! defined('ENVIRONMENT')) {
    define('ENVIRONMENT', 'testing');
}

require_once APPPATH . 'models/Trifase_orcamento_model.php';
require_once APPPATH . 'database/migrations/20261102020000_trifase_orcamentos.php';
require_once APPPATH . 'database/migrations/20261128010000_trifase_orcamento_negociacao.php';
require_once BASEPATH . 'database/DB_forge.php';
require_once BASEPATH . 'database/drivers/sqlite3/sqlite3_forge.php';

final class TrifaseNegociacaoAtomicaTest extends MaposTestCase
{
    public function testNegociacaoSetentaParaSessentaPreservaStatusVersaoELink(): void
    {
        $_ENV['TRIFASE_FINANCEIRO_ENABLED'] = 'true';
        $_ENV['TRIFASE_ENTREGAS_ENABLED'] = 'true';
        $this->db->query('CREATE TABLE os (idOs INTEGER PRIMARY KEY, clientes_id INTEGER, status TEXT, faturado INTEGER, lancamento INTEGER, valor_desconto REAL, tipo_desconto TEXT, desconto REAL)');
        $this->db->insert('os', ['idOs' => 1, 'clientes_id' => 3, 'status' => 'Em Andamento', 'faturado' => 0]);
        $this->db->query('CREATE TABLE produtos (idProdutos INTEGER PRIMARY KEY, descricao TEXT, precoVenda REAL)');
        $this->db->query('CREATE TABLE servicos (idServicos INTEGER PRIMARY KEY, nome TEXT, preco REAL)');
        $this->db->query('CREATE TABLE produtos_os (idProdutos_os INTEGER PRIMARY KEY, os_id INTEGER, produtos_id INTEGER, preco REAL, quantidade REAL, subTotal REAL)');
        $this->db->query('CREATE TABLE servicos_os (idServicos_os INTEGER PRIMARY KEY, os_id INTEGER, servicos_id INTEGER, preco REAL, quantidade REAL, subTotal REAL, desconto REAL)');
        $this->db->insert('servicos', ['idServicos' => 1, 'nome' => 'Serviço', 'preco' => 70]);
        $this->db->insert('servicos_os', ['idServicos_os' => 1, 'os_id' => 1, 'servicos_id' => 1, 'preco' => 70, 'quantidade' => 1, 'subTotal' => 70, 'desconto' => 0]);
        foreach (['trifase_financeiro_obrigacoes', 'trifase_financeiro_eventos', 'trifase_financeiro_projecoes', 'trifase_entregas_estado', 'trifase_entregas_eventos', 'trifase_cancelamentos', 'cobrancas'] as $tabela) {
            $this->db->query('CREATE TABLE ' . $tabela . ' (os_id INTEGER, tipo TEXT, evento_id INTEGER)');
        }
        $this->db->query('ALTER TABLE trifase_entregas_eventos ADD COLUMN id INTEGER');
        $this->db->query('ALTER TABLE trifase_cancelamentos ADD COLUMN id INTEGER');
        $this->db->query('CREATE TABLE lancamentos (idLancamentos INTEGER, descricao TEXT)');
        $this->db->query('CREATE TABLE os_historico (os_id INTEGER, status_anterior TEXT, status_novo TEXT, usuarios_id INTEGER, data_hora TEXT)');
        $this->db->query('CREATE TABLE trifase_publico_links (os_id INTEGER, token_hash TEXT, expira_em INTEGER)');
        $token = str_repeat('a', 64);
        $this->db->insert('trifase_publico_links', ['os_id' => 1, 'token_hash' => hash('sha256', $token), 'expira_em' => time() + 86400]);
        $m = new class() extends Migration_trifase_orcamentos {
            public object $dbforge;
        };
        $m->db = $this->db;
        $m->dbforge = new CI_DB_sqlite3_forge($this->db);
        $m->up();
        $this->db->query('ALTER TABLE trifase_orcamento_eventos ADD COLUMN negociacao TEXT');
        $modelo = new Trifase_orcamento_model();
        $modelo->db = $this->db;
        $os = $this->db->where('idOs', 1)->get('os')->row();
        $hash = $modelo->hash($modelo->retrato($os));
        $v1 = $modelo->publicar(1, $hash, 7, str_repeat('x', 16));
        $this->db->where('idOs', 1)->update('os', ['status' => 'Faturado']);
        try {
            $modelo->preverDesconto(1, $v1, $hash, 'real', '10');
            $this->fail('Estado Faturado não pode aceitar negociação mesmo com flag inconsistente.');
        } catch (DomainException $e) {
            $this->assertStringContainsString('impede negociação', $e->getMessage());
        }
        $this->db->where('idOs', 1)->update('os', ['status' => 'Em Andamento']);
        $this->assertTrue(method_exists($modelo, 'preverDesconto'), 'Prévia da negociação indisponível.');
        $previa = $modelo->preverDesconto(1, $v1, $hash, 'real', '10');
        $this->assertSame(6000, $previa['retrato']['total_c']);
        $v2 = $modelo->negociarDesconto(1, $v1, $hash, 7, str_repeat('y', 16), 'real', '10', 'Negociação por telefone', $previa['hash_proposto']);
        $this->assertNotSame($v1, $v2);
        $this->assertSame(6000, json_decode($modelo->publicado(1, $token)->conteudo, true)['total_c']);
        $this->assertSame(7000, json_decode($this->db->where('id', $v1)->get('trifase_orcamento_versoes')->row()->conteudo, true)['total_c']);
        $this->assertSame('Em Andamento', $this->db->where('idOs', 1)->get('os')->row()->status);
        $this->assertNotNull($this->db->where('versao_id', $v2)->where('negociacao IS NOT NULL')->get('trifase_orcamento_eventos')->row());

        $hashV2 = $this->db->where('id', $v2)->get('trifase_orcamento_versoes')->row()->conteudo_hash;
        $previaIgual = $modelo->preverDesconto(1, $v2, $hashV2, 'real', '10');
        $versoesAntes = (int) $this->db->where('os_id', 1)->count_all_results('trifase_orcamento_versoes');
        try {
            $modelo->negociarDesconto(1, $v2, $hashV2, 7, str_repeat('w', 16), 'real', '10', 'Sem alteração', $previaIgual['hash_proposto']);
            $this->fail('Desconto igual ao atual não pode criar versão.');
        } catch (DomainException $e) {
            $this->assertStringContainsString('não altera', $e->getMessage());
        }
        $this->assertSame($versoesAntes, (int) $this->db->where('os_id', 1)->count_all_results('trifase_orcamento_versoes'));

        $this->db->where('idOs', 1)->update('os', ['status' => 'Aprovado']);
        $previa2 = $modelo->preverDesconto(1, $v2, $hashV2, 'real', '5');
        $historicoAntes = (int) $this->db->where('os_id', 1)->count_all_results('os_historico');
        $modelo->negociarDesconto(1, $v2, $hashV2, 7, str_repeat('z', 16), 'real', '5', 'Segunda negociação', $previa2['hash_proposto']);
        $this->assertSame('Negociação', $this->db->where('idOs', 1)->get('os')->row()->status);
        $this->assertSame($historicoAntes + 1, (int) $this->db->where('os_id', 1)->count_all_results('os_historico'));
        $ultimo = $this->db->where('os_id', 1)->order_by('id', 'desc')->get('os_historico', 1)->row();
        $this->assertSame('Aprovado', $ultimo->status_anterior);
        $this->assertSame('Negociação', $ultimo->status_novo);
    }

    public function testNegociacaoExigeEstadoFinanceiroEEntregaDisponiveisSemAlterarOs(): void
    {
        $_ENV['TRIFASE_FINANCEIRO_ENABLED'] = 'false';
        $_ENV['TRIFASE_ENTREGAS_ENABLED'] = 'false';
        $this->db->query('CREATE TABLE os (idOs INTEGER PRIMARY KEY, clientes_id INTEGER, status TEXT, faturado INTEGER, valor_desconto REAL, tipo_desconto TEXT, desconto REAL)');
        $this->db->insert('os', ['idOs' => 1, 'clientes_id' => 3, 'status' => 'Em Andamento', 'faturado' => 0, 'valor_desconto' => 0, 'tipo_desconto' => null, 'desconto' => 0]);
        $modelo = new Trifase_orcamento_model();
        $modelo->db = $this->db;
        $antes = $this->db->get('os')->result_array();
        $this->assertTrue(method_exists($modelo, 'negociarDesconto'), 'A operação atômica deve existir.');
        try {
            $modelo->negociarDesconto(1, 1, str_repeat('a', 64), 7, str_repeat('b', 16), 'real', '10', 'Motivo interno');
            $this->fail('Estado de módulos indisponíveis não pode ser aceito.');
        } catch (DomainException $e) {
            $this->assertStringContainsString('desativado', $e->getMessage());
        }
        $this->assertSame($antes, $this->db->get('os')->result_array());
    }

    public function testNegociacaoBloqueiaObrigacaoPagamentoCancelamentoPendenteELiberaPedidoRetirado(): void
    {
        $_ENV['TRIFASE_FINANCEIRO_ENABLED'] = 'true';
        $_ENV['TRIFASE_ENTREGAS_ENABLED'] = 'true';
        $this->db->query('CREATE TABLE os (idOs INTEGER PRIMARY KEY, clientes_id INTEGER, status TEXT, faturado INTEGER, valor_desconto REAL, tipo_desconto TEXT, desconto REAL)');
        $this->db->insert('os', ['idOs' => 1, 'clientes_id' => 3, 'status' => 'Em Andamento', 'faturado' => 0]);
        $this->db->query('CREATE TABLE produtos (idProdutos INTEGER PRIMARY KEY, descricao TEXT, precoVenda REAL)');
        $this->db->query('CREATE TABLE servicos (idServicos INTEGER PRIMARY KEY, nome TEXT, preco REAL)');
        $this->db->query('CREATE TABLE produtos_os (idProdutos_os INTEGER PRIMARY KEY, os_id INTEGER, produtos_id INTEGER, preco REAL, quantidade REAL, subTotal REAL)');
        $this->db->query('CREATE TABLE servicos_os (idServicos_os INTEGER PRIMARY KEY, os_id INTEGER, servicos_id INTEGER, preco REAL, quantidade REAL, subTotal REAL, desconto REAL)');
        $this->db->insert('servicos', ['idServicos' => 1, 'nome' => 'Serviço', 'preco' => 70]);
        $this->db->insert('servicos_os', ['idServicos_os' => 1, 'os_id' => 1, 'servicos_id' => 1, 'preco' => 70, 'quantidade' => 1, 'subTotal' => 70, 'desconto' => 0]);
        foreach (['trifase_financeiro_obrigacoes', 'trifase_financeiro_eventos', 'trifase_financeiro_projecoes', 'trifase_entregas_estado', 'trifase_entregas_eventos', 'trifase_cancelamentos', 'cobrancas'] as $tabela) {
            $this->db->query('CREATE TABLE ' . $tabela . ' (os_id INTEGER, tipo TEXT, evento_id INTEGER)');
        }
        $this->db->query('ALTER TABLE trifase_entregas_eventos ADD COLUMN id INTEGER');
        $this->db->query('ALTER TABLE trifase_cancelamentos ADD COLUMN id INTEGER');
        $this->db->query('CREATE TABLE lancamentos (idLancamentos INTEGER, descricao TEXT)');
        $this->db->query('CREATE TABLE os_historico (os_id INTEGER, status_anterior TEXT, status_novo TEXT, usuarios_id INTEGER, data_hora TEXT)');
        $this->db->query('CREATE TABLE trifase_publico_links (os_id INTEGER, token_hash TEXT, expira_em INTEGER)');
        $token = str_repeat('a', 64);
        $this->db->insert('trifase_publico_links', ['os_id' => 1, 'token_hash' => hash('sha256', $token), 'expira_em' => time() + 86400]);
        $m = new class() extends Migration_trifase_orcamentos {
            public object $dbforge;
        };
        $m->db = $this->db;
        $m->dbforge = new CI_DB_sqlite3_forge($this->db);
        $m->up();
        $this->db->query('ALTER TABLE trifase_orcamento_eventos ADD COLUMN negociacao TEXT');
        $modelo = new Trifase_orcamento_model();
        $modelo->db = $this->db;
        $os = $this->db->where('idOs', 1)->get('os')->row();
        $hash = $modelo->hash($modelo->retrato($os));
        $v1 = $modelo->publicar(1, $hash, 7, str_repeat('x', 16));
        $antes = $this->db->where('idOs', 1)->get('os')->row_array();
        $this->db->insert('trifase_financeiro_obrigacoes', ['os_id' => 1, 'tipo' => 'receber']);
        try {
            $modelo->preverDesconto(1, $v1, $hash, 'real', '10');
            $this->fail('Obrigação financeira não pode aceitar negociação.');
        } catch (DomainException $e) {
            $this->assertStringContainsString('impede negociação', $e->getMessage());
        }
        $this->assertSame($antes, $this->db->where('idOs', 1)->get('os')->row_array());
        $this->db->where('os_id', 1)->delete('trifase_financeiro_obrigacoes');
        $this->db->insert('trifase_financeiro_eventos', ['os_id' => 1, 'tipo' => 'receber']);
        try {
            $modelo->preverDesconto(1, $v1, $hash, 'real', '10');
            $this->fail('Evento de pagamento não pode aceitar negociação.');
        } catch (DomainException $e) {
            $this->assertStringContainsString('impede negociação', $e->getMessage());
        }
        $this->db->where('os_id', 1)->delete('trifase_financeiro_eventos');
        $this->db->insert('trifase_cancelamentos', ['id' => 1, 'os_id' => 1, 'tipo' => 'solicitar']);
        try {
            $modelo->preverDesconto(1, $v1, $hash, 'real', '10');
            $this->fail('Pedido de cancelamento pendente não pode aceitar negociação.');
        } catch (DomainException $e) {
            $this->assertStringContainsString('cancelamento pendente', $e->getMessage());
        }
        $this->db->insert('trifase_cancelamentos', ['id' => 2, 'os_id' => 1, 'tipo' => 'retirar']);
        $previa = $modelo->preverDesconto(1, $v1, $hash, 'real', '10');
        $v2 = $modelo->negociarDesconto(1, $v1, $hash, 7, str_repeat('y', 16), 'real', '10', 'Pedido retirado', $previa['hash_proposto']);
        $this->assertNotSame($v1, $v2);
        $this->assertSame(6000, json_decode($modelo->publicado(1, $token)->conteudo, true)['total_c']);
    }

    public function testMigracaoAdicionaColunaEPreservaAuditoriaAoReverter(): void
    {
        $this->db->query('CREATE TABLE trifase_orcamento_eventos (id INTEGER PRIMARY KEY, tipo TEXT)');
        $m = new class() extends Migration_trifase_orcamento_negociacao {
            public object $dbforge;
        };
        $m->db = $this->db;
        $m->dbforge = new CI_DB_sqlite3_forge($this->db);
        $m->up();
        $this->assertTrue($this->db->field_exists('negociacao', 'trifase_orcamento_eventos'));
        $this->db->insert('trifase_orcamento_eventos', ['id' => 1, 'tipo' => 'publicar', 'negociacao' => '{"motivo":"privado"}']);
        $m->down();
        $this->assertTrue($this->db->field_exists('negociacao', 'trifase_orcamento_eventos'), 'Com auditoria gravada a coluna é preservada.');
        $this->db->where('id', 1)->update('trifase_orcamento_eventos', ['negociacao' => null]);
        $m->down();
        $this->assertFalse($this->db->field_exists('negociacao', 'trifase_orcamento_eventos'), 'Sem auditoria a coluna pode ser removida.');
    }
}
