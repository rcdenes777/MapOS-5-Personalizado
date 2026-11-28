<?php

if (is_file(APPPATH . 'models/Trifase_cliente_publico_model.php')) {
    require_once APPPATH . 'models/Trifase_cliente_publico_model.php';
}

final class TrifaseClientePublicoTest extends MaposTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->db->query('CREATE TABLE clientes (idClientes INTEGER PRIMARY KEY, nomeCliente TEXT)');
        $this->db->query('CREATE TABLE os (idOs INTEGER PRIMARY KEY, clientes_id INTEGER, status TEXT, dataInicial TEXT, dataFinal TEXT, descricaoProduto TEXT, observacoes TEXT)');
        $this->db->query('CREATE TABLE trifase_entregas_estado (os_id INTEGER PRIMARY KEY, evento_id INTEGER)');
        $this->db->query('CREATE TABLE trifase_entregas_eventos (id INTEGER PRIMARY KEY, os_id INTEGER)');
        $this->db->query('CREATE TABLE trifase_cliente_publico_links (cliente_id INTEGER PRIMARY KEY, token_hash TEXT UNIQUE, token_cifrado TEXT, expira_em INTEGER, usuario_id INTEGER)');
        $this->db->insert('clientes', ['idClientes' => 1, 'nomeCliente' => 'Cliente A']);
        $this->db->insert('clientes', ['idClientes' => 2, 'nomeCliente' => 'Cliente B']);
    }

    public function testMigrationCriaERemoveSomenteTabelaDeLinksDeCliente(): void
    {
        $this->db->query('DROP TABLE trifase_cliente_publico_links');
        $arquivo = APPPATH . 'database/migrations/20261127010000_trifase_cliente_publico.php';
        $this->assertFileExists($arquivo);
        require_once $arquivo;
        require_once BASEPATH . 'database/DB_forge.php';
        require_once BASEPATH . 'database/drivers/sqlite3/sqlite3_forge.php';
        $migration = new class() extends Migration_trifase_cliente_publico {
            public object $dbforge;
        };
        $migration->db = $this->db;
        $migration->dbforge = new CI_DB_sqlite3_forge($this->db);
        $migration->up();
        $this->db->data_cache = [];
        $this->assertTrue($this->db->table_exists('trifase_cliente_publico_links'));
        $this->db->query('DROP INDEX trifase_cliente_token_unico');
        $migration->up();
        $indices = $this->db->query("PRAGMA index_list('trifase_cliente_publico_links')")->result_array();
        $indicesUnicos = array_filter($indices, static fn ($indice) => $indice['name'] === 'trifase_cliente_token_unico' && (int) $indice['unique'] === 1);
        $this->assertCount(1, $indicesUnicos, 'Repetição recupera o índice único ausente');
        $migration->down();
        $this->db->data_cache = [];
        $this->assertFalse($this->db->table_exists('trifase_cliente_publico_links'));
        $this->assertSame(2, $this->db->count_all('clientes'));
    }

    public function testTokensInvalidosEClienteExcluidoNaoResolvem(): void
    {
        $modelo = new Trifase_cliente_publico_model(new Trifase_token(['chave' => str_repeat('segredo-ficticio-', 4)]));
        $modelo->db = $this->db;
        foreach ([null, [], '', str_repeat('A', 64), str_repeat('f', 64), "' OR 1=1 --"] as $token) {
            $this->assertNull($modelo->resolver($token));
        }
        $token = $modelo->gerar(1, 7);
        $this->assertNotNull($modelo->resolver($token));
        $this->db->where('idClientes', 1)->delete('clientes');
        $this->assertNull($modelo->resolver($token));
        $this->assertNotNull($this->db->where('cliente_id', 1)->get('trifase_cliente_publico_links')->row());
    }

    public function testExcluirClienteInvalidaTokenMesmoSeIdentificadorForReutilizado(): void
    {
        require_once APPPATH . 'models/Clientes_model.php';
        $portal = new Trifase_cliente_publico_model(new Trifase_token(['chave' => str_repeat('segredo-ficticio-', 4)]));
        $portal->db = $this->db;
        $token = $portal->gerar(1, 7);
        $outro = $portal->gerar(2, 7);
        $clientes = new Clientes_model();
        $clientes->db = $this->db;
        $this->assertTrue($clientes->delete('clientes', 'idClientes', 1));
        $this->assertNull($this->db->where('cliente_id', 1)->get('trifase_cliente_publico_links')->row());
        $this->db->insert('clientes', ['idClientes' => 1, 'nomeCliente' => 'Novo cliente']);
        $this->assertNull($portal->resolver($token));
        $this->assertNotNull($portal->resolver($outro));
    }

    public function testFalhaAoExcluirClientePreservaTokenNaMesmaTransacao(): void
    {
        require_once APPPATH . 'models/Clientes_model.php';
        $portal = new Trifase_cliente_publico_model(new Trifase_token(['chave' => str_repeat('segredo-ficticio-', 4)]));
        $portal->db = $this->db;
        $token = $portal->gerar(1, 7);
        $this->db->query('CREATE TRIGGER impedir_exclusao BEFORE DELETE ON clientes BEGIN SELECT RAISE(IGNORE); END');
        $clientes = new Clientes_model();
        $clientes->db = $this->db;
        $this->assertFalse($clientes->delete('clientes', 'idClientes', 1));
        $this->assertNotNull($portal->resolver($token));
        $this->assertSame(1, $this->db->where('idClientes', 1)->count_all_results('clientes'));
    }

    public function testListaSemTabelasDeEntregaMantemOsEEntregaIndisponivel(): void
    {
        $this->db->query('DROP TABLE trifase_entregas_eventos');
        $this->db->insert('os', ['idOs' => 10, 'clientes_id' => 1, 'status' => 'Aberto', 'descricaoProduto' => 'TV']);
        $modelo = new Trifase_cliente_publico_model();
        $modelo->db = $this->db;
        $linhas = $modelo->ordens(1);
        $this->assertCount(1, $linhas);
        $this->assertNull($linhas[0]->entregue);
    }

    public function testListaEDetalheLimitadosAoClienteEEntregaRefleteEstadoAtual(): void
    {
        $this->assertTrue(class_exists('Trifase_cliente_publico_model'));
        $this->db->insert('os', ['idOs' => 10, 'clientes_id' => 1, 'status' => 'Finalizado', 'descricaoProduto' => 'TV', 'observacoes' => 'privado']);
        $this->db->insert('os', ['idOs' => 11, 'clientes_id' => 2, 'status' => 'Aberto', 'descricaoProduto' => 'Outro']);
        $modelo = new Trifase_cliente_publico_model();
        $modelo->db = $this->db;
        $this->assertTrue(method_exists($modelo, 'ordens'));
        $lista = $modelo->ordens(1);
        $this->assertCount(1, $lista);
        $this->assertSame(10, (int) $lista[0]->idOs);
        $this->assertFalse((bool) $lista[0]->entregue);
        $this->assertFalse(property_exists($lista[0], 'observacoes'));
        $this->assertNull($modelo->ordem(1, 11));
        $this->assertNotNull($modelo->ordem(2, 11));
        $this->db->insert('trifase_entregas_estado', ['os_id' => 10, 'evento_id' => 42]);
        $this->assertFalse((bool) $modelo->ordem(1, 10)->entregue, 'Estado órfão não é entrega ativa');
        $this->db->insert('trifase_entregas_eventos', ['id' => 42, 'os_id' => 10]);
        $this->assertTrue((bool) $modelo->ordem(1, 10)->entregue);
        $this->db->where('os_id', 10)->delete('trifase_entregas_estado');
        $this->assertFalse((bool) $modelo->ordem(1, 10)->entregue);
    }

    public function testTokenPorClienteExpiraRenovaERevogaSemAfetarOutroCliente(): void
    {
        $this->assertTrue(class_exists('Trifase_cliente_publico_model'));
        $modelo = new Trifase_cliente_publico_model(new Trifase_token(['chave' => str_repeat('segredo-ficticio-', 4)]));
        $modelo->db = $this->db;
        $primeiro = $modelo->gerar(1, 7);
        $outro = $modelo->gerar(2, 7);
        $this->assertMatchesRegularExpression('/\A[a-f0-9]{64}\z/', $primeiro);
        $linha = $this->db->where('cliente_id', 1)->get('trifase_cliente_publico_links')->row();
        $this->assertSame(hash('sha256', $primeiro), $linha->token_hash);
        $this->assertStringNotContainsString($primeiro, $linha->token_cifrado);
        $this->assertSame(1, (int) $modelo->resolver($primeiro)->idClientes);
        $this->assertSame($primeiro, $modelo->tokenAtivo(1));
        $novo = $modelo->gerar(1, 7);
        $this->assertNotSame($primeiro, $novo);
        $this->assertNull($modelo->resolver($primeiro));
        $this->assertSame(2, (int) $modelo->resolver($outro)->idClientes);
        $this->db->where('cliente_id', 1)->update('trifase_cliente_publico_links', ['expira_em' => time()]);
        $this->assertNull($modelo->resolver($novo));
        $renovado = $modelo->gerar(1, 7);
        $modelo->revogar(1);
        $this->assertNull($modelo->resolver($renovado));
        $this->assertSame(2, (int) $modelo->resolver($outro)->idClientes);
    }
}
