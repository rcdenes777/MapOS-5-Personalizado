<?php

require_once APPPATH . 'libraries/Trifase_token.php';

final class TrifaseTokenTest extends \PHPUnit\Framework\TestCase
{
    public function testCopiaCifradaTemNonceAleatorioEExigeMesmaChaveEOs(): void
    {
        $c = new Trifase_token(['chave' => str_repeat('a', 32)]);
        $token = bin2hex(random_bytes(32));
        $a = $c->cifrar($token, 1);
        $b = $c->cifrar($token, 1);
        $this->assertNotSame($a, $b);
        $this->assertSame($token, $c->decifrar($a, 1));
        $this->assertNull($c->decifrar($a, 2));
        $this->assertNull((new Trifase_token(['chave' => str_repeat('b', 32)]))->decifrar($a, 1));
        $bytes = base64_decode(substr($a, 3));
        $bytes[40] = chr(ord($bytes[40]) ^ 1);
        $this->assertNull($c->decifrar('v1:' . base64_encode($bytes), 1));
        foreach ([null, '', 'v2:abc', 'v1:!!!!', 'v1:' . base64_encode('curto')] as $ruim) {
            $this->assertNull($c->decifrar($ruim, 1));
        }
    }

    public function testChaveAusenteOuCurtaNaoPermiteGuardarTokens(): void
    {
        $this->expectException(RuntimeException::class);
        new Trifase_token(['chave' => 'curta']);
    }
}
