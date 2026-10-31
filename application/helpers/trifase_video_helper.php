<?php

defined('BASEPATH') or exit('No direct script access allowed');

require_once APPPATH . 'helpers/trifase_publico_helper.php';

/** Vídeos locais verificados; nunca aceita caminhos públicos ou MIME genérico. */
function trifaseVideoArquivo(object $anexo): ?string
{
    $arquivo = trifasePublicoArquivo($anexo);
    $extensao = $arquivo ? strtolower(pathinfo($arquivo, PATHINFO_EXTENSION)) : '';

    return $arquivo && in_array($extensao, ['mp4', 'webm'], true) && armazenamentoMimePermitido($arquivo, $extensao) ? $arquivo : null;
}

/**
 * Um intervalo por resposta, inclusive sufixos; HEAD ignora Range conforme HTTP.
 *
 * @return array{status: int, inicio: int, tamanho: int, cabecalhos: array<string, string>}
 */
function trifaseVideoPlano(int $total, ?string $range, bool $head = false): array
{
    $inicio = 0;
    $fim = $total - 1;
    $status = 200;
    $cabecalhos = ['Accept-Ranges' => 'bytes'];
    if (! $head && $range !== null && $range !== '') {
        $valido = preg_match('/\Abytes=(\d*)-(\d*)\z/iD', trim($range), $partes) === 1;
        if ($valido && $total > 0 && ($partes[1] !== '' || $partes[2] !== '')) {
            if ($partes[1] === '') {
                $sufixo = (int) $partes[2];
                $inicio = max(0, $total - $sufixo);
                $valido = $sufixo > 0;
            } else {
                $inicio = (int) $partes[1];
                $fim = $partes[2] === '' ? $fim : min($fim, (int) $partes[2]);
                $valido = $inicio <= $fim && $inicio < $total;
            }
        } else {
            $valido = false;
        }
        if (! $valido) {
            return ['status' => 416, 'inicio' => 0, 'tamanho' => 0, 'cabecalhos' => $cabecalhos + ['Content-Range' => 'bytes */' . $total, 'Content-Length' => '0']];
        }
        $status = 206;
        $cabecalhos['Content-Range'] = 'bytes ' . $inicio . '-' . $fim . '/' . $total;
    }
    $tamanho = max(0, $fim - $inicio + 1);
    $cabecalhos['Content-Length'] = (string) $tamanho;

    return ['status' => $status, 'inicio' => $inicio, 'tamanho' => $tamanho, 'cabecalhos' => $cabecalhos];
}

/**
 * Copia em blocos: um vídeo de 200 MB não é carregado inteiro na memória.
 *
 * @param resource $origem
 * @param resource $destino
 */
function trifaseVideoCopiar($origem, $destino, int $inicio, int $tamanho): void
{
    if (fseek($origem, $inicio) !== 0) {
        return;
    }
    while ($tamanho > 0 && ! feof($origem) && ! connection_aborted()) {
        $bloco = fread($origem, min(1048576, $tamanho));
        if ($bloco === false || $bloco === '') {
            break;
        }
        $escritos = 0;
        while ($escritos < strlen($bloco)) {
            $n = fwrite($destino, substr($bloco, $escritos));
            if ($n === false || $n === 0) {
                return;
            }
            $escritos += $n;
        }
        $tamanho -= strlen($bloco);
    }
}

/** Só chamar depois de validar sessão/token, vínculo à OS e publicação. */
function trifaseVideoEnviar(string $arquivo, int $id, bool $head, ?string $range): never
{
    $entrada = fopen($arquivo, 'rb');
    if ($entrada === false) {
        show_404('', false);
        exit;
    }
    $total = (int) filesize($arquivo);
    $plano = trifaseVideoPlano($total, $range, $head);
    $cabecalhos = array_replace(trifasePublicoArquivoCabecalhos('anexo-' . $id . '.' . pathinfo($arquivo, PATHINFO_EXTENSION), pathinfo($arquivo, PATHINFO_EXTENSION), $total, true), $plano['cabecalhos']);
    while (ob_get_level() > 0) {
        ob_end_clean();
    }
    http_response_code($plano['status']);
    foreach ($cabecalhos as $nome => $valor) {
        header($nome . ': ' . $valor);
    }
    if (! $head && $plano['tamanho'] > 0) {
        $saida = fopen('php://output', 'wb');
        if ($saida !== false) {
            trifaseVideoCopiar($entrada, $saida, $plano['inicio'], $plano['tamanho']);
            fclose($saida);
        }
    }
    fclose($entrada);
    exit;
}
