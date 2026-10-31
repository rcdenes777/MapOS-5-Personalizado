<?php

use PHPUnit\Framework\Attributes\PreserveGlobalState;
use PHPUnit\Framework\Attributes\RunInSeparateProcess;

if (! function_exists('site_url')) {
    function site_url($uri = '')
    {
        return 'http://mapos.test/index.php/' . ltrim((string) $uri, '/');
    }
}

if (! function_exists('base_url')) {
    function base_url($uri = '')
    {
        return 'http://mapos.test/' . ltrim((string) $uri, '/');
    }
}

final class TrifaseAnexosViewTest extends \PHPUnit\Framework\TestCase
{
    #[RunInSeparateProcess]
    #[PreserveGlobalState(false)]
    public function testTrechoAjaxIndependeDoCabecalhoEAbreVideoNaMesmaPagina(): void
    {
        $raiz = sys_get_temp_dir() . '/trifase-view-' . bin2hex(random_bytes(6));
        mkdir($raiz . '/anexos/teste', 0700, true);
        copy(MAPOS_ROOT . '/tests/fixtures/trifase/video.mp4', $raiz . '/anexos/teste/video.mp4');
        $storage = $_ENV['STORAGE_PATH'] ?? null;
        $ativo = $_ENV['TRIFASE_PUBLICO_ENABLED'] ?? null;
        $_ENV['STORAGE_PATH'] = $raiz;
        $_ENV['TRIFASE_PUBLICO_ENABLED'] = 'true';
        try {
            $view = new class() {
                public object $load;
                public object $permission;
                public object $session;
                public function __construct()
                {
                    $this->load = $this;
                    $this->permission = new class() {
                        public function checkPermission($p, $c)
                        {
                            return true;
                        }
                    };
                    $this->session = new class() {
                        public function userdata($c)
                        {
                            return 1;
                        }
                    };
                }
                public function view(string $nome, array $dados): void
                {
                    extract($dados);
                    include APPPATH . 'views/' . $nome . '.php';
                }
            };
            $nivelBuffer = ob_get_level();
            ob_start();
            $view->view('os/partes/anexos', ['os' => (object) ['idOs' => 1], 'pode' => ['editar' => true], 'anexos' => [(object) ['idAnexos' => 7, 'anexo' => 'video.mp4', 'path' => 'anexos/teste', 'thumb' => '']]]);
            $html = (string) ob_get_clean();
            $this->assertStringContainsString('data-trifase-video', $html);
            $this->assertStringContainsString('data-module="trifase/miniatura-video"', $html);
            $this->assertStringContainsString('trifase/video/1/7', $html);
            $this->assertStringNotContainsString('target="_blank"', $html);
        } finally {
            while (isset($nivelBuffer) && ob_get_level() > $nivelBuffer) {
                ob_end_clean();
            }
            unlink($raiz . '/anexos/teste/video.mp4');
            rmdir($raiz . '/anexos/teste');
            rmdir($raiz . '/anexos');
            rmdir($raiz);
            foreach (['STORAGE_PATH' => $storage, 'TRIFASE_PUBLICO_ENABLED' => $ativo] as $chave => $valor) {
                if ($valor === null) {
                    unset($_ENV[$chave]);
                } else {
                    $_ENV[$chave] = $valor;
                }
            }
        }
    }
}
