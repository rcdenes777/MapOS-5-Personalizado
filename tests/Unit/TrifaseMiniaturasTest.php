<?php

require_once APPPATH . 'helpers/trifase_publico_helper.php';

final class TrifaseMiniaturasTest extends MaposTestCase
{
    private string $raiz;
    private mixed $storageAnterior;
    private mixed $limiteAnterior;
    private object $anexo;

    protected function setUp(): void
    {
        $this->storageAnterior = $_ENV['STORAGE_PATH'] ?? null;
        $this->limiteAnterior = $_ENV['UPLOAD_MAX_PIXELS'] ?? null;
        $this->raiz = sys_get_temp_dir() . '/trifase-miniatura-' . bin2hex(random_bytes(8));
        mkdir($this->raiz . '/storage/anexos/os-1/thumbs', 0700, true);
        $_ENV['STORAGE_PATH'] = $this->raiz . '/storage';
        $_ENV['UPLOAD_MAX_PIXELS'] = '100';
        $this->png($this->raiz . '/storage/anexos/os-1/foto.png', 4);
        $this->png($this->raiz . '/storage/anexos/os-1/thumbs/foto_thumb.png', 2);
        $this->anexo = (object) ['anexo' => 'foto.png', 'thumb' => 'foto_thumb.png', 'path' => 'anexos/os-1'];
    }

    protected function tearDown(): void
    {
        $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($this->raiz, FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::CHILD_FIRST);
        foreach ($it as $arquivo) {
            if ($arquivo->isDir() && ! $arquivo->isLink()) {
                rmdir($arquivo->getPathname());
            } else {
                unlink($arquivo->getPathname());
            }
        }
        rmdir($this->raiz);
        foreach (['STORAGE_PATH' => $this->storageAnterior, 'UPLOAD_MAX_PIXELS' => $this->limiteAnterior] as $chave => $valor) {
            if ($valor === null) {
                unset($_ENV[$chave]);
            } else {
                $_ENV[$chave] = $valor;
            }
        }
    }

    private function png(string $caminho, int $tamanho): void
    {
        $imagem = imagecreatetruecolor($tamanho, $tamanho);
        imagepng($imagem, $caminho);
    }

    public function testPrefereMiniaturaExistenteEAbreOriginalSeparadamente(): void
    {
        $this->assertSame($this->raiz . '/storage/anexos/os-1/thumbs/foto_thumb.png', trifasePublicoMiniatura($this->anexo));
        $this->assertSame($this->raiz . '/storage/anexos/os-1/foto.png', trifasePublicoMiniatura($this->anexo, false));
    }

    public function testImagemOriginalServeDeFallbackQuandoMiniaturaNaoExiste(): void
    {
        $this->anexo->thumb = 'ausente.png';
        $this->assertSame(trifasePublicoArquivo($this->anexo), trifasePublicoMiniatura($this->anexo));
        $this->anexo->thumb = '';
        $this->assertSame(trifasePublicoArquivo($this->anexo), trifasePublicoMiniatura($this->anexo));
    }

    public function testMiniaturaComMimeFalsoNaoEhExibida(): void
    {
        file_put_contents($this->raiz . '/storage/anexos/os-1/thumbs/foto_thumb.png', '<script>alert(1)</script>');
        $this->assertSame(trifasePublicoArquivo($this->anexo), trifasePublicoMiniatura($this->anexo));
    }

    public function testOriginalAusenteOuInvalidoNaoPermiteThumbOrfa(): void
    {
        file_put_contents($this->raiz . '/storage/anexos/os-1/foto.png', 'falso');
        $this->assertNull(trifasePublicoMiniatura($this->anexo));
        unlink($this->raiz . '/storage/anexos/os-1/foto.png');
        $this->assertNull(trifasePublicoMiniatura($this->anexo));
    }

    public function testArquivoDeTextoNaoViraImagemInline(): void
    {
        file_put_contents($this->raiz . '/storage/anexos/os-1/documento.txt', 'Arquivo de texto');
        $this->anexo->anexo = 'documento.txt';
        $this->assertNull(trifasePublicoMiniatura($this->anexo));
    }

    public function testCaminhoESymlinkExternosSaoNegados(): void
    {
        $this->png($this->raiz . '/externa.png', 2);
        $this->anexo->path = $this->raiz;
        $this->anexo->anexo = 'externa.png';
        $this->assertNull(trifasePublicoArquivo($this->anexo));
        $this->assertNull(trifasePublicoMiniatura($this->anexo));
        symlink($this->raiz . '/externa.png', $this->raiz . '/storage/anexos/os-1/symlink.png');
        $this->anexo->path = 'anexos/os-1';
        $this->anexo->anexo = 'symlink.png';
        $this->assertNull(trifasePublicoMiniatura($this->anexo));
    }

    public function testMiniaturaSymlinkExternoCaiNoOriginalSeguro(): void
    {
        $this->png($this->raiz . '/externa.png', 2);
        unlink($this->raiz . '/storage/anexos/os-1/thumbs/foto_thumb.png');
        symlink($this->raiz . '/externa.png', $this->raiz . '/storage/anexos/os-1/thumbs/foto_thumb.png');
        $this->assertSame(trifasePublicoArquivo($this->anexo), trifasePublicoMiniatura($this->anexo));
    }

    public function testImagemQueExcedeLimiteDePixelsNaoEhExibida(): void
    {
        $_ENV['UPLOAD_MAX_PIXELS'] = '1';
        $this->assertNull(trifasePublicoMiniatura($this->anexo));
    }

    public function testPreviewInlinePreservaMimeENaoPermiteCache(): void
    {
        $h = trifasePublicoArquivoCabecalhos('anexo.png', 'png', 123, true);
        $this->assertSame('image/png', $h['Content-Type']);
        $this->assertStringStartsWith('inline;', $h['Content-Disposition']);
        $this->assertStringContainsString('no-store', $h['Cache-Control']);
        $this->assertSame('no-referrer', $h['Referrer-Policy']);
        $this->assertStringStartsWith('attachment;', trifasePublicoArquivoCabecalhos('anexo.png', 'png', 123)['Content-Disposition']);
    }
}
