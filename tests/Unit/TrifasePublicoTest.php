<?php

require_once APPPATH . 'models/Trifase_publico_model.php';

/** Executa o modelo real com Query Builder/SQLite; HTTP/MySQL também no laboratório. */
final class TrifasePublicoTest extends MaposTestCase
{
    private Trifase_publico_model $modelo;

    protected function setUp(): void
    {
        parent::setUp();
        $this->db->query('CREATE TABLE os (idOs INTEGER PRIMARY KEY, status TEXT, dataInicial TEXT, dataFinal TEXT, descricaoProduto TEXT)');
        $this->db->query('CREATE TABLE anexos (idAnexos INTEGER PRIMARY KEY, os_id INTEGER, anexo TEXT, path TEXT)');
        $this->db->query('CREATE TABLE trifase_publico_links (os_id INTEGER PRIMARY KEY, token_hash TEXT UNIQUE, expira_em INTEGER, usuario_id INTEGER, token_cifrado TEXT, validade_dias INTEGER DEFAULT 30)');
        $this->db->query('CREATE TABLE trifase_publico_anexos (os_id INTEGER, anexo_id INTEGER, PRIMARY KEY (os_id, anexo_id))');
        $this->db->insert('os', ['idOs' => 1, 'status' => 'Em Andamento', 'dataInicial' => '2026-10-31', 'descricaoProduto' => '<p>Televisor &amp; som</p>']);
        $this->db->insert('os', ['idOs' => 2, 'status' => 'Aberto', 'dataInicial' => '2026-10-31', 'descricaoProduto' => 'Outra OS']);
        foreach ([[11, 1], [12, 1], [21, 2]] as [$id, $os]) {
            $this->db->insert('anexos', ['idAnexos' => $id, 'os_id' => $os, 'anexo' => 'arquivo.txt', 'path' => 'anexos']);
        }
        $this->modelo = new Trifase_publico_model(new Trifase_token(['chave' => str_repeat('teste-segredo-', 4)]));
        $this->modelo->db = $this->db;
    }

    public function testGeraTokenAleatorioArmazenaApenasHashEProjecaoDaOs(): void
    {
        $token = $this->modelo->gerar(1, 7);
        $this->assertMatchesRegularExpression('/^[a-f0-9]{64}$/', $token);
        $linha = $this->db->get('trifase_publico_links')->row();
        $this->assertSame(hash('sha256', $token), $linha->token_hash);
        $this->assertNotSame($token, $linha->token_hash);
        $this->assertSame(1, (int) $this->modelo->resolver($token)->idOs);
        $this->assertSame(7, (int) $linha->usuario_id);
        $this->assertGreaterThan(time() + 119 * 86400, (int) $linha->expira_em);
        $this->assertNotNull($this->modelo->estado(1));
    }

    public function testLinkPersistenteContinuaIgualAoVoltarENaoGuardaTokenEmClaro(): void
    {
        $token = $this->modelo->gerar(1, 7);
        $linha = $this->db->where('os_id', 1)->get('trifase_publico_links')->row();
        $this->assertStringNotContainsString($token, $linha->token_cifrado);
        $this->assertSame($token, $this->modelo->tokenAtivo(1));
        $this->assertSame($token, $this->modelo->tokenAtivo(1));
        $this->assertLessThanOrEqual(time() + 120 * 86400, (int) $linha->expira_em);
        $this->modelo->revogar(1);
        $this->assertNull($this->modelo->tokenAtivo(1));
        $this->assertNull($this->db->where('os_id', 1)->get('trifase_publico_links')->row()->token_cifrado);
    }

    public function testTokenAntigoConhecidoEhPreservadoSemTrocarHashOuPrazo(): void
    {
        $token = $this->modelo->gerar(1, 7);
        $antes = $this->db->where('os_id', 1)->get('trifase_publico_links')->row();
        $this->db->where('os_id', 1)->update('trifase_publico_links', ['token_cifrado' => null]);
        $this->assertNull($this->modelo->tokenAtivo(1));
        $this->assertFalse($this->modelo->guardarTokenExistente(1, str_repeat('f', 64)));
        $this->assertTrue($this->modelo->guardarTokenExistente(1, $token));
        $depois = $this->db->where('os_id', 1)->get('trifase_publico_links')->row();
        $this->assertSame($antes->token_hash, $depois->token_hash);
        $this->assertSame($antes->expira_em, $depois->expira_em);
        $this->assertSame($token, $this->modelo->tokenAtivo(1));
    }

    public function testCopiaAdulteradaExpiradaOuDeOutraOsNaoEhRevelada(): void
    {
        $token = $this->modelo->gerar(1, 7);
        $this->modelo->gerar(2, 7);
        $outra = $this->db->where('os_id', 2)->get('trifase_publico_links')->row();
        $this->db->where('os_id', 1)->update('trifase_publico_links', ['token_cifrado' => $outra->token_cifrado]);
        $this->assertNull($this->modelo->tokenAtivo(1));
        $this->db->where('os_id', 1)->update('trifase_publico_links', ['expira_em' => time()]);
        $this->assertFalse($this->modelo->guardarTokenExistente(1, $token));
        $this->assertNull($this->modelo->tokenAtivo(1));
    }

    public function testRenovarInvalidaAnteriorEMantemUmSlot(): void
    {
        $antigo = $this->modelo->gerar(1, 7);
        $novo = $this->modelo->gerar(1, 7);
        $this->assertNotSame($antigo, $novo);
        $this->assertNull($this->modelo->resolver($antigo));
        $this->assertNotNull($this->modelo->resolver($novo));
        $this->assertSame(1, $this->db->count_all('trifase_publico_links'));
    }

    public function testRevogarUmaOsNaoAfetaOutra(): void
    {
        $um = $this->modelo->gerar(1, 7);
        $dois = $this->modelo->gerar(2, 7);
        $this->modelo->revogar(1);
        $this->assertNull($this->modelo->resolver($um));
        $this->assertNull($this->modelo->estado(1));
        $this->assertNotNull($this->modelo->resolver($dois));
    }

    public function testTokenExpiradoMalformadoOuInexistenteNaoResolve(): void
    {
        foreach ([null, [], '', str_repeat('a', 63), str_repeat('a', 65), str_repeat('A', 64), "' OR 1=1 --", str_repeat('f', 64)] as $token) {
            $this->assertNull($this->modelo->resolver($token));
        }
        $token = $this->modelo->gerar(1, 7);
        $this->db->where('os_id', 1)->update('trifase_publico_links', ['expira_em' => time()]);
        $this->assertNull($this->modelo->resolver($token));
        $this->assertNull($this->modelo->estado(1));
    }

    public function testExcluirOsInvalidaResolucaoMesmoComRegistroOrfao(): void
    {
        $token = $this->modelo->gerar(1, 7);
        $this->db->where('idOs', 1)->delete('os');
        $this->assertNull($this->modelo->resolver($token));
    }

    public function testNaoGeraLinkParaOsInexistente(): void
    {
        $this->expectException(DomainException::class);
        $this->modelo->gerar(999, 7);
    }

    public function testAnexosPrivadosPorPadraoEPublicacaoReversivel(): void
    {
        $this->assertSame([], $this->modelo->anexos(1, true));
        $this->assertNull($this->modelo->anexoPublicado(1, 11));
        $this->modelo->publicarAnexos(1, ['11', '11']);
        $this->assertCount(1, $this->modelo->anexos(1, true));
        $this->assertNotNull($this->modelo->anexoPublicado(1, 11));
        $this->assertNull($this->modelo->anexoPublicado(1, 12));
        $this->assertNull($this->modelo->anexoPublicado(2, 11));
        $this->modelo->publicarAnexos(1, []);
        $this->assertNull($this->modelo->anexoPublicado(1, 11));
    }

    public function testAnexoDeOutraOsRejeitaSelecaoInteiraSemPerderSelecaoAnterior(): void
    {
        $this->modelo->publicarAnexos(1, [11]);
        try {
            $this->modelo->publicarAnexos(1, [12, 21]);
            $this->fail('Aceitou anexo de outra OS');
        } catch (DomainException $erro) {
            $this->assertNotNull($this->modelo->anexoPublicado(1, 11));
            $this->assertNull($this->modelo->anexoPublicado(1, 12));
        }
    }

    public function testSelecaoMalformadaNaoPublica(): void
    {
        foreach ([[[]], ['1 OR 1=1'], [0], [-1], ['011'], [1.5]] as $ids) {
            try {
                $this->modelo->publicarAnexos(1, $ids);
                $this->fail('Aceitou seleção malformada');
            } catch (DomainException $erro) {
                $this->assertSame([], $this->modelo->anexos(1, true));
            }
        }
    }

    public function testPublicacaoOrfaNaoAutorizaArquivoDeOutraOs(): void
    {
        $this->db->insert('trifase_publico_anexos', ['os_id' => 1, 'anexo_id' => 21]);
        $this->assertNull($this->modelo->anexoPublicado(1, 21));
        $this->assertSame([], $this->modelo->anexos(1, true));
    }

    public function testProjecaoNaoVazaDadosInternosNemHtmlAtivo(): void
    {
        $dados = trifasePublicoDados((object) [
            'idOs' => 1, 'status' => 'Aberto', 'dataInicial' => '2026-10-31',
            'descricaoProduto' => '<img src="https://example.test/privado">TV &lt;script&gt;alert(1)&lt;/script&gt;',
            'observacoes' => 'segredo', 'senha' => 'senha', 'nomeCliente' => 'Cliente privado',
        ]);
        $this->assertSame(['id', 'status', 'inicio', 'previsao', 'equipamento'], array_keys($dados));
        $this->assertStringNotContainsString('privado', $dados['equipamento']);
        $this->assertStringNotContainsString('<script>', e($dados['equipamento']));
    }

    public function testBasePublicaConfiguradaNaoUsaHostDaRequisicao(): void
    {
        $anterior = $_ENV['TRIFASE_PUBLIC_BASEURL'] ?? null;
        try {
            $_ENV['TRIFASE_PUBLIC_BASEURL'] = 'https://cliente.example.test/mapos/';
            $this->assertSame('https://cliente.example.test/mapos/index.php/publico/os/' . str_repeat('a', 64), trifasePublicoUrl(str_repeat('a', 64), 'http://painel.local/'));
            $_ENV['TRIFASE_PUBLIC_BASEURL'] = 'javascript:alert(1)';
            $this->expectException(DomainException::class);
            trifasePublicoBase('http://painel.local/');
        } finally {
            if ($anterior === null) {
                unset($_ENV['TRIFASE_PUBLIC_BASEURL']);
            } else {
                $_ENV['TRIFASE_PUBLIC_BASEURL'] = $anterior;
            }
        }
    }

    public function testDesativadoPorPadraoECabecalhosPrivados(): void
    {
        $anterior = $_ENV['TRIFASE_PUBLICO_ENABLED'] ?? null;
        try {
            unset($_ENV['TRIFASE_PUBLICO_ENABLED']);
            $this->assertFalse(trifasePublicoHabilitado());
            $_ENV['TRIFASE_PUBLICO_ENABLED'] = 'true';
            $this->assertTrue(trifasePublicoHabilitado());
            $h = trifasePublicoCabecalhos();
            $this->assertStringContainsString('no-store', $h['Cache-Control']);
            $this->assertSame('no-referrer', $h['Referrer-Policy']);
            $this->assertStringContainsString("script-src 'none'", $h['Content-Security-Policy']);
        } finally {
            if ($anterior === null) {
                unset($_ENV['TRIFASE_PUBLICO_ENABLED']);
            } else {
                $_ENV['TRIFASE_PUBLICO_ENABLED'] = $anterior;
            }
        }
    }

    public function testDownloadSobrescreveCacheDoStorageEForcaDisposicaoSegura(): void
    {
        $cabecalhos = trifasePublicoArquivoCabecalhos('anexo.txt', 'txt', 123);
        $this->assertStringContainsString('no-store', $cabecalhos['Cache-Control']);
        $this->assertStringContainsString('attachment;', $cabecalhos['Content-Disposition']);
        $this->assertSame('123', $cabecalhos['Content-Length']);
        $this->assertStringContainsString("script-src 'none'", $cabecalhos['Content-Security-Policy']);
    }

    public function testGaleriaUsaNonceSemLiberarScriptsEmDownloads(): void
    {
        $nonce = base64_encode(random_bytes(18));
        $h = trifasePublicoCabecalhos($nonce);
        $this->assertStringContainsString("script-src 'nonce-" . $nonce . "' 'strict-dynamic'", $h['Content-Security-Policy']);
        $this->assertStringNotContainsString('unsafe-inline', $h['Content-Security-Policy']);
        $this->assertStringNotContainsString('unsafe-eval', $h['Content-Security-Policy']);
        $this->assertStringContainsString("script-src 'none'", trifasePublicoArquivoCabecalhos('imagem.png', 'png', 1, true)['Content-Security-Policy']);
    }

    public function testNonceInvalidoEhRecusado(): void
    {
        $this->expectException(InvalidArgumentException::class);
        trifasePublicoCabecalhos("' unsafe-inline");
    }
}
