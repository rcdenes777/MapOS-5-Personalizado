<?php

defined('BASEPATH') or exit('No direct script access allowed');

/** Extensão Trifase: não depende de alterações no controller Os. */
function trifasePublicoHabilitado(): bool
{
    return filter_var($_ENV['TRIFASE_PUBLICO_ENABLED'] ?? false, FILTER_VALIDATE_BOOLEAN);
}

/** Padrão para emissão/renovação explícita; nunca altera links durante leitura. */
function trifasePublicoValidadeDias(): int
{
    $dias = filter_var($_ENV['TRIFASE_PUBLICO_VALIDADE_DIAS'] ?? 120, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 365]]);

    return $dias !== false ? $dias : 120;
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
function trifasePublicoCabecalhos(?string $nonce = null): array
{
    if ($nonce !== null && ! preg_match('/\A[A-Za-z0-9+\/]{24}\z/D', $nonce)) {
        throw new InvalidArgumentException('Nonce inválido.');
    }
    $scripts = $nonce === null ? "'none'" : "'nonce-" . $nonce . "' 'strict-dynamic'";

    return [
        'Cache-Control' => 'private, no-store, max-age=0',
        'Pragma' => 'no-cache',
        'Referrer-Policy' => 'no-referrer',
        'X-Robots-Tag' => 'noindex, nofollow, noarchive',
        'X-Content-Type-Options' => 'nosniff',
        'X-Frame-Options' => 'DENY',
        'Content-Security-Policy' => "default-src 'none'; style-src 'self'; img-src 'self'; media-src 'self'; font-src 'self'; script-src " . $scripts . "; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    ];
}

/** @return array<string, string> */
function trifasePublicoArquivoCabecalhos(string $nome, string $extensao, int $tamanho, bool $imagem = false): array
{
    return array_replace(armazenamentoCabecalhos($nome, $extensao, $tamanho, ! $imagem), trifasePublicoCabecalhos());
}

/** Somente arquivos no storage privado; nunca aceita as raízes públicas legadas. */
function trifasePublicoArquivo(object $anexo, bool $miniatura = false): ?string
{
    $pasta = rtrim((string) ($anexo->path ?? ''), '/\\');
    $nome = (string) ($miniatura ? ($anexo->thumb ?? '') : ($anexo->anexo ?? ''));
    if ($pasta === '' || $nome === '') {
        return null;
    }

    return armazenamentoLocalizar($pasta . '/' . ($miniatura ? 'thumbs/' : '') . basename($nome));
}

/** Só imagens raster verificadas podem ser exibidas inline. */
function trifasePublicoEhImagem(?string $arquivo): bool
{
    if ($arquivo === null) {
        return false;
    }
    $extensao = strtolower(pathinfo($arquivo, PATHINFO_EXTENSION));
    // Não interpretar vídeos/documentos grandes como imagem: pode esgotar memória.
    if (! in_array($extensao, ['jpg', 'jpeg', 'png', 'gif'], true) || ! armazenamentoMimePermitido($arquivo, $extensao)) {
        return false;
    }
    $dimensoes = @getimagesize($arquivo);

    return is_array($dimensoes) && $dimensoes[0] > 0 && $dimensoes[1] > 0
        && ! armazenamentoImagemGrandeDemais($arquivo, $extensao);
}

/** Usa a miniatura do upload; se ausente/inválida, usa a imagem original segura. */
function trifasePublicoMiniatura(object $anexo, bool $preferirMiniatura = true): ?string
{
    $original = trifasePublicoArquivo($anexo);
    if (! trifasePublicoEhImagem($original)) {
        return null;
    }
    if ($preferirMiniatura) {
        $thumb = trifasePublicoArquivo($anexo, true);
        if (trifasePublicoEhImagem($thumb)) {
            return $thumb;
        }
    }

    return $original;
}

/** Envia arquivo já autorizado pelo controller, preservando no-store em HEAD/GET. */
function trifasePublicoEnviarArquivo(string $arquivo, int $id, bool $imagem, bool $head): void
{
    $extensao = strtolower(pathinfo($arquivo, PATHINFO_EXTENSION));
    $cabecalhos = trifasePublicoArquivoCabecalhos('anexo-' . $id . '.' . $extensao, $extensao, (int) filesize($arquivo), $imagem);
    while (ob_get_level() > 0) {
        ob_end_clean();
    }
    foreach ($cabecalhos as $nome => $valor) {
        header($nome . ': ' . $valor);
    }
    if (! $head) {
        readfile($arquivo);
    }
    exit;
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
