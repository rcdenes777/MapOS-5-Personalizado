<?php

require_once APPPATH . 'models/Trifase_retorno_model.php';
require_once APPPATH . 'models/Trifase_publico_model.php';
require_once APPPATH . 'models/Os_model.php';

final class TrifaseRetornoAnexosTest extends MaposTestCase
{
    private Trifase_retorno_model $modelo;

    protected function setUp(): void
    {
        parent::setUp();
        $this->db->query('CREATE TABLE os (idOs INTEGER PRIMARY KEY, clientes_id INTEGER, dataInicial TEXT)');
        $this->db->query('CREATE TABLE trifase_garantia_retornos (os_id INTEGER PRIMARY KEY, origem_id INTEGER, anterior_id INTEGER, equipamento_id INTEGER, cliente_id INTEGER)');
        $this->db->query('CREATE TABLE trifase_os_equipamentos (os_id INTEGER PRIMARY KEY, equipamento_id INTEGER)');
        $this->db->query('CREATE TABLE trifase_equipamentos (id INTEGER PRIMARY KEY, cliente_id INTEGER)');
        $this->db->query('CREATE TABLE anexos (idAnexos INTEGER PRIMARY KEY, os_id INTEGER, anexo TEXT, thumb TEXT, path TEXT, url TEXT)');
        $this->db->query('CREATE TABLE trifase_publico_anexos (os_id INTEGER, anexo_id INTEGER)');
        foreach ([101, 102, 103] as $id) {
            $this->db->insert('os', ['idOs' => $id, 'clientes_id' => 40, 'dataInicial' => '2026-01-02']);
            $this->db->insert('trifase_os_equipamentos', ['os_id' => $id, 'equipamento_id' => 50]);
        }
        $this->db->insert('trifase_equipamentos', ['id' => 50, 'cliente_id' => 40]);
        $this->db->insert('trifase_garantia_retornos', ['os_id' => 102, 'origem_id' => 101, 'anterior_id' => 101, 'equipamento_id' => 50, 'cliente_id' => 40]);
        $this->db->insert('trifase_garantia_retornos', ['os_id' => 103, 'origem_id' => 101, 'anterior_id' => 102, 'equipamento_id' => 50, 'cliente_id' => 40]);
        $this->db->insert('anexos', ['idAnexos' => 201, 'os_id' => 101, 'anexo' => 'foto.jpg', 'thumb' => 'foto_thumb.jpg', 'path' => '/storage/privado', 'url' => 'javascript:alert(1)']);
        $this->db->insert('anexos', ['idAnexos' => 202, 'os_id' => 102, 'anexo' => 'retorno.pdf', 'thumb' => '', 'path' => '/storage/privado', 'url' => 'https://invalido.test']);
        $this->modelo = new Trifase_retorno_model();
        $this->modelo->db = $this->db;
    }

    public static function relacoesInvalidas(): array
    {
        return [
            'origem inexistente' => ['DELETE FROM os WHERE idOs = 101'],
            'filho inexistente' => ['DELETE FROM os WHERE idOs = 103'],
            'cliente filho alterado' => ['UPDATE os SET clientes_id = 41 WHERE idOs = 103'],
            'cliente origem alterado' => ['UPDATE os SET clientes_id = 41 WHERE idOs = 101'],
            'cliente relacao alterado' => ['UPDATE trifase_garantia_retornos SET cliente_id = 41 WHERE os_id = 103'],
            'equipamento filho alterado' => ['UPDATE trifase_os_equipamentos SET equipamento_id = 51 WHERE os_id = 103'],
            'equipamento origem alterado' => ['UPDATE trifase_os_equipamentos SET equipamento_id = 51 WHERE os_id = 101'],
            'equipamento relacao alterado' => ['UPDATE trifase_garantia_retornos SET equipamento_id = 51 WHERE os_id = 103'],
            'dono unidade alterado' => ['UPDATE trifase_equipamentos SET cliente_id = 41 WHERE id = 50'],
            'unidade inexistente' => ['DELETE FROM trifase_equipamentos'],
            'autorreferencia' => ['UPDATE trifase_garantia_retornos SET origem_id = 103 WHERE os_id = 103'],
            'raiz nao e raiz' => ['UPDATE trifase_garantia_retornos SET origem_id = 102 WHERE os_id = 103'],
            'sem anexos origem' => ['DELETE FROM anexos WHERE os_id = 101'],
            'sem modulo' => ['DROP TABLE trifase_garantia_retornos'],
        ];
    }

    #[\PHPUnit\Framework\Attributes\DataProvider('relacoesInvalidas')]
    public function testNegaRelacaoInvalida(string $sql): void
    {
        $this->db->query($sql);
        $this->assertSame([], $this->modelo->anexosOrigem(103));
    }

    public function testSemRetornoEIdsInvalidosNaoRecebemHistorico(): void
    {
        foreach ([0, -1, 999, 101] as $id) {
            $this->assertSame([], $this->modelo->anexosOrigem($id));
        }
    }

    public function testAnexoNaoImagemTemMetadadosSemCaminhoNemMiniatura(): void
    {
        $this->db->where('idAnexos', 201)->update('anexos', ['anexo' => '/privado/nota.pdf']);
        $anexo = $this->modelo->anexosOrigem(103)['anexos'][0];
        $this->assertSame('nota.pdf', $anexo->nome);
        $this->assertFalse($anexo->imagem);
        $this->assertFalse($anexo->tem_miniatura);
        $this->assertSame('2026-01-02', $anexo->data_origem);
    }

    public function testConsultaReferenciaDaRaizSemCopiarNemAmpliarSuperficiePublica(): void
    {
        $antes = $this->db->get('anexos')->result_array();
        $resultado = $this->modelo->anexosOrigem(103);
        $this->assertSame(101, $resultado['origem_id']);
        $this->assertSame([201], array_column($resultado['anexos'], 'idAnexos'));
        $this->assertSame(['idAnexos', 'nome', 'imagem', 'tem_miniatura', 'data_origem'], array_keys((array) $resultado['anexos'][0]));
        $this->assertStringNotContainsString('storage', json_encode($resultado));
        $this->assertStringNotContainsString('javascript:', json_encode($resultado));
        $this->assertSame($antes, $this->db->get('anexos')->result_array());
        $os = (new ReflectionClass(Os_model::class))->newInstanceWithoutConstructor();
        $os->db = $this->db;
        $this->assertSame([], $os->getAnexos(103));
        $this->db->insert('trifase_publico_anexos', ['os_id' => 101, 'anexo_id' => 201]);
        $publico = new Trifase_publico_model();
        $publico->db = $this->db;
        $this->assertCount(1, $publico->anexos(101, true));
        $this->assertSame([], $publico->anexos(103, true));
        $this->assertNull($publico->anexoPublicado(103, 201));
    }
}
