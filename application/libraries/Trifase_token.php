<?php

defined('BASEPATH') or exit('No direct script access allowed');

/** Cópia recuperável apenas no painel, vinculada à OS e à chave da instalação. */
class Trifase_token
{
    private string $chave;

    /** @param array{chave?: string}|null $opcoes */
    public function __construct(?array $opcoes = null)
    {
        $segredo = (string) ($opcoes['chave'] ?? config_item('encryption_key'));
        if (strlen($segredo) < 32 || $segredo === 'enter_encryption_key') {
            throw new RuntimeException('Configure APP_ENCRYPTION_KEY para guardar os links públicos.');
        }
        $this->chave = hash_hkdf('sha256', $segredo, 32, 'mapos-trifase-publico-v1');
    }

    public function cifrar(string $token, int $os): string
    {
        if ($os <= 0 || ! preg_match('/\A[a-f0-9]{64}\z/D', $token)) {
            throw new InvalidArgumentException('Token ou OS inválida.');
        }
        $nonce = random_bytes(12);
        $tag = '';
        $cifrado = openssl_encrypt($token, 'aes-256-gcm', $this->chave, OPENSSL_RAW_DATA, $nonce, $tag, 'os:' . $os);
        if ($cifrado === false) {
            throw new RuntimeException('Não foi possível guardar o link público.');
        }

        return 'v1:' . base64_encode($nonce . $tag . $cifrado);
    }

    public function decifrar(?string $valor, int $os): ?string
    {
        if ($valor === null || ! str_starts_with($valor, 'v1:') || $os <= 0) {
            return null;
        }
        $binario = base64_decode(substr($valor, 3), true);
        if ($binario === false || strlen($binario) !== 92) {
            return null;
        }
        $token = openssl_decrypt(substr($binario, 28), 'aes-256-gcm', $this->chave, OPENSSL_RAW_DATA, substr($binario, 0, 12), substr($binario, 12, 16), 'os:' . $os);

        return is_string($token) && preg_match('/\A[a-f0-9]{64}\z/D', $token) ? $token : null;
    }
}
