<?php

defined('BASEPATH') or exit('No direct script access allowed');

/** Extensão Trifase: não depende de alterações no controller Os. */
function trifasePublicoHabilitado(): bool
{
    return filter_var($_ENV['TRIFASE_PUBLICO_ENABLED'] ?? false, FILTER_VALIDATE_BOOLEAN);
}

function trifasePublicoTokenValido(mixed $token): bool
{
    return is_string($token) && preg_match('/\A[a-f0-9]{64}\z/D', $token) === 1;
}

/** Só usa configuração local; nunca confia em Host ou X-Forwarded-Host. */
function trifasePublicoBase(string $padrao): string
{
    $url = trim((string) ($_ENV['TRIFASE_PUBLIC_BASEURL'] ?? $padrao));
    $partes = parse_url($url);
    if ($partes === false || ! isset($partes['host'], $partes['scheme'])
        || ! in_array($partes['scheme'], ['http', 'https'], true)
        || isset($partes['user']) || isset($partes['pass'])
        || isset($partes['query']) || isset($partes['fragment'])
        || preg_match('/[\x00-\x20\x7f]/', $url)) {
        throw new DomainException('Configure uma URL pública http(s) válida para o módulo Trifase.');
    }

    return rtrim($url, '/') . '/';
}

function trifasePublicoUrl(string $token, string $padrao, string $index = 'index.php'): string
{
    if (! trifasePublicoTokenValido($token)) {
        throw new DomainException('Token inválido.');
    }

    return trifasePublicoBase($padrao) . ($index === '' ? '' : trim($index, '/') . '/') . 'publico/os/' . $token;
}

/** @return array<string, string> */
function trifasePublicoCabecalhos(): array
{
    return [
        'Cache-Control' => 'private, no-store, max-age=0',
        'Pragma' => 'no-cache',
        'Referrer-Policy' => 'no-referrer',
        'X-Robots-Tag' => 'noindex, nofollow, noarchive',
        'X-Content-Type-Options' => 'nosniff',
        'X-Frame-Options' => 'DENY',
        'Content-Security-Policy' => "default-src 'none'; style-src 'self'; img-src 'self'; font-src 'self'; script-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    ];
}

/** @return array<string, string> */
function trifasePublicoArquivoCabecalhos(string $nome, string $extensao, int $tamanho): array
{
    return array_replace(armazenamentoCabecalhos($nome, $extensao, $tamanho, true), trifasePublicoCabecalhos());
}

/** A projeção pública não recebe cliente, técnico, anotações ou dados financeiros. */
function trifasePublicoDados(object $os): array
{
    return [
        'id' => (int) $os->idOs,
        'status' => (string) $os->status,
        'inicio' => (string) $os->dataInicial,
        'previsao' => (string) ($os->dataFinal ?? ''),
        // Não transportar HTML do editor nem suas imagens privadas para a área pública.
        'equipamento' => trim(html_entity_decode(strip_tags((string) $os->descricaoProduto), ENT_QUOTES | ENT_HTML5, 'UTF-8')),
    ];
}
