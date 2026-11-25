<?php

require_once APPPATH . 'helpers/trifase_entrega_helper.php';
require_once APPPATH . 'helpers/trifase_equipamento_helper.php';

if (! function_exists('site_url')) {
    function site_url(string $uri = ''): string
    {
        return 'http://mapos.test/index.php/' . ltrim($uri, '/');
    }
}

if (! function_exists('base_url')) {
    function base_url(string $uri = ''): string
    {
        return 'http://mapos.test/' . ltrim($uri, '/');
    }
}

final class TrifaseEntregaViewTest extends \PHPUnit\Framework\TestCase
{
    private function render(array $extras = []): string
    {
        $visao = new class() {
            public object $permission;
            public object $session;

            public function __construct()
            {
                $this->permission = new class() {
                    public function checkPermission($perfil, $permissao): bool
                    {
                        return true;
                    }
                };
                $this->session = new class() {
                    public function userdata($campo): int
                    {
                        return 1;
                    }
                };
            }

            public function render(array $dados): string
            {
                extract($dados);
                $nivel = ob_get_level();
                ob_start();
                try {
                    include APPPATH . 'views/trifase/entrega.php';
                    return (string) ob_get_clean();
                } finally {
                    while (ob_get_level() > $nivel) {
                        ob_end_clean();
                    }
                }
            }
        };

        return $visao->render($extras + [
            'os' => (object) ['idOs' => 1, 'nomeCliente' => 'Cliente Teste', 'contato_cliente' => 'Contato do Cadastro',
                'descricaoProduto' => 'Notebook', 'status' => 'Finalizado'],
            'pilotoEntrega' => null,
            'pilotoEntregasHistorico' => [],
            'pilotoEntregaItens' => "Notebook\nMarca: Dell\nItens e acessórios:\nCarregador",
        ]);
    }

    public function testFormularioUsaDataContatoPrePreenchidoERadiosExclusivos(): void
    {
        $html = $this->render();
        $this->assertStringContainsString('type="date"', $html);
        $this->assertStringNotContainsString('datetime-local', $html);
        $this->assertStringContainsString('value="Contato do Cadastro"', $html);
        $this->assertStringContainsString('name="terceiro"', $html);
        $this->assertStringContainsString('value="0"', $html);
        $this->assertStringContainsString('value="1"', $html);
        $this->assertStringContainsString('Próprio cliente', $html);
        $this->assertStringContainsString('Terceiro', $html);
        $this->assertStringContainsString('Itens e acessórios:', $html);
        $this->assertStringContainsString('Conferi o equipamento, os itens, os acessórios', $html);
    }

    public function testEntregaAtivaMostraDataSemHoraEPreservaRegistroAuditavel(): void
    {
        $html = $this->render(['pilotoEntrega' => (object) [
            'id' => 9, 'entregue_em' => '2026-11-25 00:00:00', 'registrado_em' => '2026-11-25 12:01:51',
            'recebedor' => 'Contato do Cadastro', 'terceiro' => 0,
        ]]);
        $this->assertStringContainsString('Retirado em', $html);
        $this->assertStringContainsString('25/11/2026', $html);
        $this->assertStringNotContainsString('25/11/2026 00:00', $html);
        $this->assertStringContainsString('Registrado em', $html);
        $this->assertStringContainsString('25/11/2026 12:01', $html);
    }
}
