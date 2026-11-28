<?php

require_once APPPATH . 'helpers/trifase_orcamento_helper.php';

/**
 * Exclusão de catálogo não pode remover itens de OS com orçamento negociado,
 * mesmo quando a tabela opcional de estoque/custos não existe.
 */
final class TrifaseCatalogoProtegidoTest extends MaposTestCase
{
    private function cenario(float $valorDesconto, ?string $tipo = 'real', float $informado = 10, bool $comVersao = true): void
    {
        $this->db->query('CREATE TABLE os (idOs INTEGER PRIMARY KEY, clientes_id INTEGER, status TEXT, faturado INTEGER, valor_desconto REAL, tipo_desconto TEXT, desconto REAL)');
        $this->db->query('CREATE TABLE trifase_orcamento_versoes (id INTEGER PRIMARY KEY, os_id INTEGER)');
        $this->db->query('CREATE TABLE produtos (idProdutos INTEGER PRIMARY KEY, descricao TEXT, precoVenda REAL)');
        $this->db->query('CREATE TABLE servicos (idServicos INTEGER PRIMARY KEY, nome TEXT, preco REAL)');
        $this->db->query('CREATE TABLE produtos_os (idProdutos_os INTEGER PRIMARY KEY, os_id INTEGER, produtos_id INTEGER, preco REAL, quantidade REAL, subTotal REAL)');
        $this->db->query('CREATE TABLE servicos_os (idServicos_os INTEGER PRIMARY KEY, os_id INTEGER, servicos_id INTEGER, preco REAL, quantidade REAL, subTotal REAL)');
        $this->db->insert('produtos', ['idProdutos' => 1, 'descricao' => 'Peça sintética', 'precoVenda' => 300]);
        $this->db->insert('servicos', ['idServicos' => 1, 'nome' => 'Serviço sintético', 'preco' => 50]);
        $this->db->insert('os', ['idOs' => 1, 'clientes_id' => 3, 'status' => 'Em Andamento', 'faturado' => 0,
            'valor_desconto' => $valorDesconto, 'tipo_desconto' => $tipo, 'desconto' => $informado]);
        $this->db->insert('produtos_os', ['idProdutos_os' => 1, 'os_id' => 1, 'produtos_id' => 1, 'preco' => 300, 'quantidade' => 1, 'subTotal' => 300]);
        $this->db->insert('servicos_os', ['idServicos_os' => 1, 'os_id' => 1, 'servicos_id' => 1, 'preco' => 50, 'quantidade' => 1, 'subTotal' => 50]);
        if ($comVersao) {
            $this->db->insert('trifase_orcamento_versoes', ['id' => 1, 'os_id' => 1]);
        }
    }

    public function testProdutoEServicoDeOsComDescontoEfetivoFicamProtegidos(): void
    {
        $this->cenario(340);
        $this->assertTrue(trifaseCatalogoItemProtegido($this->db, 'produto', 1));
        $this->assertTrue(trifaseCatalogoItemProtegido($this->db, 'servico', 1));
        $this->assertFalse(trifaseCatalogoItemProtegido($this->db, 'produto', 2), 'Produto sem vínculo não é protegido.');
    }

    public function testSemDescontoEfetivoOuSemVersaoNaoProtege(): void
    {
        $this->cenario(350, 'real', 10);
        $this->assertFalse(trifaseCatalogoItemProtegido($this->db, 'produto', 1), 'Total efetivo é o bruto: não há desconto a proteger.');
        $this->db->query('DROP TABLE trifase_orcamento_versoes');
        $this->db->query('CREATE TABLE trifase_orcamento_versoes (id INTEGER PRIMARY KEY, os_id INTEGER)');
        $this->db->query('UPDATE os SET valor_desconto = 340 WHERE idOs = 1');
        $this->assertFalse(trifaseCatalogoItemProtegido($this->db, 'produto', 1), 'Sem histórico comercial não há versão a preservar.');
    }

    public function testSemTabelaOpcionalDeEstoqueAProtecaoContinua(): void
    {
        $this->cenario(340);
        $this->assertFalse($this->db->table_exists('trifase_estoque_eventos'));
        $this->assertFalse($this->db->table_exists('trifase_servico_custos'));
        $this->assertTrue(trifaseCatalogoItemProtegido($this->db, 'produto', 1));
        $this->assertTrue(trifaseCatalogoItemProtegido($this->db, 'servico', 1));
    }

    public function testExclusaoProtegidaNaoExecutaCallbackComDescontoEfetivo(): void
    {
        $this->cenario(340);
        $chamado = false;
        $this->assertFalse(trifaseCatalogoExcluirProtegido($this->db, 'produto', 1, function () use (&$chamado): bool {
            $chamado = true;

            return true;
        }));
        $this->assertFalse($chamado, 'Callback de exclusão não roda quando há desconto negociado.');
        $this->assertSame(1, (int) $this->db->count_all('produtos_os'));
    }

    public function testExclusaoProtegidaExecutaCallbackSemDescontoEfetivo(): void
    {
        $this->cenario(350, 'real', 10);
        $chamado = false;
        $this->assertTrue(trifaseCatalogoExcluirProtegido($this->db, 'produto', 1, function () use (&$chamado): bool {
            $chamado = true;

            return true;
        }));
        $this->assertTrue($chamado);
    }

    public function testSubtotalLegadoNuloNaoEscondeDescontoEfetivo(): void
    {
        $this->cenario(340);
        $this->db->where('idServicos_os', 1)->update('servicos_os', ['subTotal' => null]);
        $this->assertTrue(trifaseCatalogoItemProtegido($this->db, 'servico', 1), 'O retrato canônico usa preço × quantidade quando o subTotal legado está vazio.');
        $this->assertTrue(trifaseCatalogoItemProtegido($this->db, 'produto', 1));
        $this->db->where('idProdutos_os', 1)->update('produtos_os', ['preco' => 0, 'subTotal' => 0]);
        $this->db->where('idOs', 1)->update('os', ['valor_desconto' => 45, 'desconto' => 5]);
        $this->assertTrue(trifaseCatalogoItemProtegido($this->db, 'servico', 1), 'Só o serviço legado, com preço no cadastro, ainda revela o desconto.');
    }
}
