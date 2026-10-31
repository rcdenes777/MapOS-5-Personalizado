<?php

require_once APPPATH . 'helpers/trifase_video_helper.php';

final class TrifaseVideoTest extends MaposTestCase
{
    public function testIntervalosPermitemSeekSemEnviarArquivoInteiro(): void
    {
        foreach ([['bytes=10-19', 10, 10, 'bytes 10-19/100'], ['bytes=90-', 90, 10, 'bytes 90-99/100'], ['bytes=-7', 93, 7, 'bytes 93-99/100'], ['bytes=90-999', 90, 10, 'bytes 90-99/100'], ['bytes=-999', 0, 100, 'bytes 0-99/100']] as [$range, $inicio, $tamanho, $cabecalho]) {
            $p = trifaseVideoPlano(100, $range);
            $this->assertSame(206, $p['status']);
            $this->assertSame($inicio, $p['inicio']);
            $this->assertSame($tamanho, $p['tamanho']);
            $this->assertSame($cabecalho, $p['cabecalhos']['Content-Range']);
        }
    }

    public function testIntervalosInvalidosSaoNegadosSemCorpo(): void
    {
        foreach (['bytes=100-', 'bytes=20-10', 'bytes=-0', 'bytes=-', 'bytes=1-2,3-4', 'bytes=abc', 'bytes=9999999999999999999999999-', 'items=1-2'] as $range) {
            $p = trifaseVideoPlano(100, $range);
            $this->assertSame(416, $p['status']);
            $this->assertSame(0, $p['tamanho']);
            $this->assertSame('bytes */100', $p['cabecalhos']['Content-Range']);
        }
    }

    public function testHeadIgnoraRangeENaoPerdeTamanhoTotal(): void
    {
        $p = trifaseVideoPlano(209715200, 'bytes=1-2', true);
        $this->assertSame(200, $p['status']);
        $this->assertSame('209715200', $p['cabecalhos']['Content-Length']);
        $this->assertSame(200, trifaseVideoPlano(100, null)['status']);
    }

    public function testCopiaSomenteOsBytesSolicitadosInclusiveEntreBlocos(): void
    {
        $dados = str_repeat('0123456789', 150000);
        $origem = fopen('php://temp', 'w+b');
        $destino = fopen('php://temp', 'w+b');
        fwrite($origem, $dados);
        trifaseVideoCopiar($origem, $destino, 13, 1100001);
        rewind($destino);
        $this->assertSame(substr($dados, 13, 1100001), stream_get_contents($destino));
        fclose($origem);
        fclose($destino);
    }

    public function testVideoDe200MbNaoEhInterpretadoComoImagem(): void
    {
        $arquivo = sys_get_temp_dir() . '/trifase-video-grande-' . bin2hex(random_bytes(6)) . '.mp4';
        copy(MAPOS_ROOT . '/tests/fixtures/trifase/video.mp4', $arquivo);
        try {
            $f = fopen($arquivo, 'r+b');
            ftruncate($f, 209715200);
            fclose($f);
            $this->assertFalse(trifasePublicoEhImagem($arquivo));
        } finally {
            unlink($arquivo);
        }
    }

    public function testMimeRealDosVideosENomeFalso(): void
    {
        $raiz = sys_get_temp_dir() . '/trifase-video-' . bin2hex(random_bytes(6));
        mkdir($raiz, 0700);
        $anterior = $_ENV['STORAGE_PATH'] ?? null;
        $_ENV['STORAGE_PATH'] = $raiz;
        try {
            foreach (['mp4', 'webm'] as $ext) {
                copy(MAPOS_ROOT . '/tests/fixtures/trifase/video.' . $ext, $raiz . '/video.' . $ext);
                $anexo = (object) ['path' => '.', 'anexo' => 'video.' . $ext];
                $this->assertNotNull(trifaseVideoArquivo($anexo));
                file_put_contents($raiz . '/video.' . $ext, '<?php echo "falso";');
                $this->assertNull(trifaseVideoArquivo($anexo));
            }
            $this->assertNull(trifaseVideoArquivo((object) ['path' => '/etc', 'anexo' => 'passwd']));
        } finally {
            foreach (glob($raiz . '/*') as $p) {
                unlink($p);
            }
            rmdir($raiz);
            if ($anterior === null) {
                unset($_ENV['STORAGE_PATH']);
            } else {
                $_ENV['STORAGE_PATH'] = $anterior;
            }
        }
    }
}
