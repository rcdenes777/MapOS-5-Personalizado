<?php

defined('BASEPATH') or exit('No direct script access allowed');
require_once APPPATH . 'helpers/trifase_cadastro_helper.php';

/** Alterações explícitas, transacionais e versionadas; sem inferir categoria do cliente. */
class Trifase_cadastro_model extends CI_Model
{
    public function historico(string $tipo, int $id): array
    {
        return $this->db->where('tipo', $tipo)->where('recurso_id', $id)->order_by('id', 'desc')->get('trifase_cadastros_eventos')->result();
    }

    public function atual(string $tipo, int $id): array
    {
        $evento = $this->db->where('tipo', $tipo)->where('recurso_id', $id)->order_by('id', 'desc')->get('trifase_cadastros_eventos', 1)->row();
        return ['versao' => (int) ($evento->id ?? 0), 'dados' => $evento ? json_decode($evento->depois, true, 512, JSON_THROW_ON_ERROR) : []];
    }

    public function alterar(string $tipo, int $id, array $dados, int $versao, string $motivo, int $usuario, string $operacao): int
    {
        if (! in_array($tipo, ['cliente', 'modelo', 'unidade'], true) || $id <= 0 || $usuario <= 0
            || ! preg_match('/\A[a-zA-Z0-9_-]{16,64}\z/', $operacao)) {
            throw new DomainException('Cadastro ou identificador inválido. Recarregue a página.');
        }
        $motivo = $this->texto($motivo, 2000, true);
        $campos = match ($tipo) {
            'cliente' => ['categoria', 'orientacoes'], 'modelo' => ['tipo', 'marca', 'modelo'], 'unidade' => ['selo', 'serie', 'imei']
        };
        if (array_diff(array_keys($dados), $campos) !== []) {
            throw new DomainException('Use somente os campos deste cadastro. Cliente e histórico de OS não são substituídos.');
        }
        $novo = [];
        foreach ($campos as $campo) {
            $novo[$campo] = $this->texto($dados[$campo] ?? '', $campo === 'orientacoes' ? 4000 : ($campo === 'modelo' ? 160 : 100));
        }
        if ($tipo === 'cliente' && ! isset(trifaseCategoriasClientes()[$novo['categoria']])) {
            throw new DomainException('Escolha uma categoria interna válida.');
        }
        if ($tipo === 'modelo' && (! in_array($novo['tipo'], ['placa', 'celular', 'outro'], true) || $novo['marca'] === '' || $novo['modelo'] === '')) {
            throw new DomainException('Informe tipo, marca e modelo.');
        }
        if ($tipo === 'unidade' && implode('', $novo) === '') {
            throw new DomainException('Informe pelo menos selo, série ou IMEI.');
        }
        $hash = hash('sha256', json_encode([$tipo, $id, $novo, $versao, $motivo, $usuario], JSON_THROW_ON_ERROR));
        if (! $this->db->trans_begin()) {
            throw new RuntimeException('Cadastro indisponível.');
        }
        $debug = $this->db->db_debug;
        $this->db->db_debug = false;
        try {
            [$tabela, $pk] = match ($tipo) {
                'cliente' => ['clientes', 'idClientes'], 'modelo' => ['trifase_equipamento_modelos', 'id'], 'unidade' => ['trifase_equipamentos', 'id']
            };
            $sufixo = $this->db->dbdriver === 'mysqli' ? ' FOR UPDATE' : '';
            $registro = $this->db->query("SELECT * FROM {$tabela} WHERE {$pk} = ?" . $sufixo, [$id])->row();
            if (! $registro) {
                throw new DomainException('Cadastro não encontrado.');
            }
            $repetido = $this->db->where('operacao', $operacao)->get('trifase_cadastros_eventos', 1)->row();
            if ($repetido) {
                if (! hash_equals($repetido->payload_hash, $hash)) {
                    throw new DomainException('Identificador já utilizado com outros dados.');
                }
                $this->confirmar();
                return (int) $repetido->id;
            }
            $atual = $this->atual($tipo, $id);
            if ($atual['versao'] !== $versao) {
                throw new DomainException('Outra alteração foi registrada. Recarregue e confira antes de salvar.');
            }
            $antes = $tipo === 'cliente' ? $atual['dados'] : array_intersect_key((array) $registro, $novo);
            if ($tipo !== 'cliente') {
                $update = $novo;
                if ($tipo === 'modelo') {
                    $norm = static fn ($v) => mb_strtolower(preg_replace('/\s+/u', ' ', trim($v)), 'UTF-8');
                    $update['chave'] = hash('sha256', json_encode([$novo['tipo'], $norm($novo['marca']), $norm($novo['modelo'])], JSON_THROW_ON_ERROR));
                    if ($this->db->where('chave', $update['chave'])->where('id !=', $id)->count_all_results($tabela)) {
                        throw new DomainException('Este modelo já existe. Não una cadastros históricos silenciosamente.');
                    }
                    $update['atualizado_em'] = date('Y-m-d H:i:s');
                } else {
                    $update['selo_chave'] = $novo['selo'] === '' ? null : hash('sha256', mb_strtoupper(preg_replace('/\s+/u', '', $novo['selo']), 'UTF-8'));
                    if ($update['selo_chave'] !== null && $this->db->where('selo_chave', $update['selo_chave'])->where('id !=', $id)->count_all_results($tabela)) {
                        throw new DomainException('Este selo já pertence a outra unidade.');
                    }
                }
                if (! $this->db->where($pk, $id)->update($tabela, $update)) {
                    throw new RuntimeException('Não foi possível alterar o cadastro.');
                }
            }
            if (! $this->db->insert('trifase_cadastros_eventos', ['tipo' => $tipo, 'recurso_id' => $id, 'antes' => json_encode($antes, JSON_THROW_ON_ERROR),
                'depois' => json_encode($novo, JSON_THROW_ON_ERROR), 'motivo' => $motivo, 'usuario_id' => $usuario,
                'criado_em' => date('Y-m-d H:i:s'), 'operacao' => $operacao, 'payload_hash' => $hash])) {
                throw new RuntimeException('Não foi possível preservar o histórico.');
            }
            $eventoId = (int) $this->db->insert_id();
            $this->confirmar();
            return $eventoId;
        } catch (Throwable $e) {
            $this->db->trans_rollback();
            throw $e;
        } finally {
            $this->db->db_debug = $debug;
        }
    }

    private function texto(mixed $valor, int $maximo, bool $obrigatorio = false): string
    {
        if (! is_string($valor) || ! mb_check_encoding($valor, 'UTF-8') || str_contains($valor, "\0") || mb_strlen(trim($valor)) > $maximo || ($obrigatorio && trim($valor) === '')) {
            throw new DomainException('Confira os campos obrigatórios e os limites dos textos.');
        }
        return trim($valor);
    }

    private function confirmar(): void
    {
        if (! $this->db->trans_status() || ! $this->db->trans_commit()) {
            throw new RuntimeException('Não foi possível confirmar a alteração.');
        }
    }
}
