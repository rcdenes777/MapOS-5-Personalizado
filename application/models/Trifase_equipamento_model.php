<?php

defined('BASEPATH') or exit('No direct script access allowed');
require_once APPPATH . 'libraries/Trifase_os_lock.php';
require_once APPPATH . 'helpers/trifase_garantia_helper.php';

/** Modelo não é unidade: o retrato original é preservado e correções têm histórico próprio. */
class Trifase_equipamento_model extends CI_Model
{
    public function modelos(string $termo): array
    {
        return $this->db->group_start()->like('marca', mb_substr($termo, 0, 100))->or_like('modelo', mb_substr($termo, 0, 100))->group_end()
            ->order_by('marca')->order_by('modelo')->limit(25)->get('trifase_equipamento_modelos')->result();
    }

    public function unidades(int $clienteId, string $termo): array
    {
        $this->baseUnidade();
        if ($this->db->table_exists('trifase_garantia_trocas')) {
            $this->db->where('NOT EXISTS (SELECT 1 FROM trifase_garantia_trocas gt WHERE gt.antiga_id = u.id)', null, false);
        }
        return $this->db->where('u.cliente_id', $clienteId)
            ->group_start()->like('u.selo', mb_substr($termo, 0, 100))->or_like('u.serie', mb_substr($termo, 0, 100))
            ->or_like('u.imei', mb_substr($termo, 0, 100))->or_like('m.marca', mb_substr($termo, 0, 100))->or_like('m.modelo', mb_substr($termo, 0, 100))->group_end()
            ->order_by('u.id', 'desc')->limit(25)->get()->result();
    }

    public function unidade(int $id): ?object
    {
        return $this->baseUnidade()->where('u.id', $id)->get()->row() ?: null;
    }

    private function baseUnidade(): object
    {
        return $this->db->select('u.*, m.tipo, m.marca, m.modelo')->from('trifase_equipamentos u')
            ->join('trifase_equipamento_modelos m', 'm.id = u.modelo_id');
    }

    public function porOs(int $id): ?object
    {
        $retrato = $this->db->where('os_id', $id)->get('trifase_os_equipamentos', 1)->row() ?: null;
        if ($retrato !== null) {
            $retrato->correcao_versao = 0;
            $eventos = $this->correcoes($id);
            if ($eventos !== []) {
                foreach (json_decode($eventos[0]->depois, true, 512, JSON_THROW_ON_ERROR) as $campo => $valor) {
                    $retrato->$campo = $valor;
                }
                $retrato->correcao_versao = (int) $eventos[0]->id;
            }
        }
        return $retrato;
    }

    public function correcoes(int $osId): array
    {
        return $this->db->table_exists('trifase_equipamento_correcoes')
            ? $this->db->where('os_id', $osId)->order_by('id', 'DESC')->get('trifase_equipamento_correcoes')->result()
            : [];
    }

    /** Apenas o retrato desta OS: cadastro, vínculo físico e comprovantes não mudam. */
    public function corrigir(int $osId, array $dados, int $versao, string $motivo, int $usuario, string $chave): int
    {
        if (! $this->db->table_exists('trifase_equipamento_correcoes') || $usuario <= 0 || $versao < 0
            || ! preg_match('/\A[a-zA-Z0-9_-]{16,64}\z/', $chave)) {
            throw new DomainException('Correção indisponível ou identificador inválido. Recarregue a OS.');
        }
        $campos = ['marca' => 100, 'modelo' => 160, 'selo' => 100, 'serie' => 100, 'imei' => 100, 'itens_recebidos' => 10000, 'estado_entrada' => 10000];
        if (array_diff(array_keys($dados), array_keys($campos)) !== []) {
            throw new DomainException('A correção não altera o vínculo nem outros campos da OS.');
        }
        $novo = [];
        foreach ($campos as $campo => $limite) {
            $novo[$campo] = $this->texto($dados[$campo] ?? '', $limite, in_array($campo, ['marca', 'modelo', 'itens_recebidos', 'estado_entrada'], true));
        }
        $motivo = $this->texto($motivo, 2000, true);
        $hash = hash('sha256', json_encode([$osId, $novo, $versao, $motivo, $usuario], JSON_THROW_ON_ERROR));
        $lock = new Trifase_os_lock($this->db, $osId);
        try {
            $repetido = $this->db->where('operacao', $chave)->get('trifase_equipamento_correcoes', 1)->row();
            if ($repetido !== null) {
                if (! hash_equals($repetido->payload_hash, $hash)) {
                    throw new DomainException('Identificador já utilizado com outros dados.');
                }
                $lock->finalizar(true);
                return (int) $repetido->id;
            }
            $atual = $this->porOs($osId);
            if ($atual === null) {
                throw new DomainException('Identifique a unidade antes de corrigir seus dados.');
            }
            if ((int) $atual->correcao_versao !== $versao) {
                throw new DomainException('Outra correção foi registrada. Recarregue antes de salvar.');
            }
            $antes = array_intersect_key((array) $atual, $campos);
            if ($antes === $novo) {
                throw new DomainException('Altere pelo menos um campo antes de salvar.');
            }
            $this->inserir('trifase_equipamento_correcoes', ['os_id' => $osId, 'usuario_id' => $usuario,
                'antes' => json_encode($antes, JSON_THROW_ON_ERROR), 'depois' => json_encode($novo, JSON_THROW_ON_ERROR),
                'motivo' => $motivo, 'criado_em' => date('Y-m-d H:i:s'), 'operacao' => $chave, 'payload_hash' => $hash]);
            $id = (int) $this->db->insert_id();
            $lock->finalizar(true);
            return $id;
        } catch (Throwable $e) {
            $lock->finalizar(false);
            throw $e;
        }
    }

    public function historico(int $unidade): array
    {
        return $this->db->select('os.idOs, os.dataInicial, os.status, vinculo.marca, vinculo.modelo, vinculo.selo, vinculo.serie, vinculo.imei, vinculo.estado_entrada, vinculo.itens_recebidos')
            ->from('trifase_os_equipamentos vinculo')->join('os', 'os.idOs = vinculo.os_id')->where('vinculo.equipamento_id', $unidade)
            ->order_by('os.idOs', 'desc')->get()->result();
    }

    public function vincular(int $osId, array $dados, int $usuario, string $chave): int
    {
        if ($usuario <= 0 || ! preg_match('/\A[a-zA-Z0-9_-]{16,64}\z/', $chave)) {
            throw new DomainException('Operador ou identificador da operação inválido. Recarregue a OS.');
        }
        $campos = ['modo', 'itens_recebidos', 'estado_entrada', 'equipamento_id', 'modelo_id', 'tipo', 'marca', 'modelo', 'selo', 'serie', 'imei'];
        if (array_diff(array_keys($dados), $campos) !== []) {
            throw new DomainException('O formulário de identificação não altera outros dados da OS.');
        }
        $normalizados = [];
        foreach ($campos as $campo) {
            $valor = $dados[$campo] ?? '';
            if (! is_string($valor) && ! is_int($valor)) {
                throw new DomainException('Campo de identificação inválido.');
            }
            $normalizados[$campo] = $this->texto((string) $valor, 10000);
        }
        $dados = $normalizados;
        $modo = $dados['modo'];
        if (! in_array($modo, ['novo', 'existente'], true)) {
            throw new DomainException('Escolha cadastrar ou reutilizar uma unidade.');
        }
        $itens = $this->texto($dados['itens_recebidos'], 10000, true);
        $estado = $this->texto($dados['estado_entrada'], 10000, true);
        $hash = hash('sha256', json_encode([$osId, $dados, $usuario], JSON_THROW_ON_ERROR));
        $lock = new Trifase_os_lock($this->db, $osId);
        try {
            $os = $lock->os;
            $atual = $this->porOs($osId);
            if ($atual !== null) {
                if ($atual->operacao === $chave && hash_equals($atual->payload_hash, $hash)) {
                    $lock->finalizar(true);
                    return (int) $atual->equipamento_id;
                }
                throw new DomainException('Esta OS já tem identificação vinculada. O retrato histórico não é substituído.');
            }
            if ($this->db->table_exists('trifase_entregas_eventos') && $this->db->where('os_id', $osId)->count_all_results('trifase_entregas_eventos') > 0) {
                throw new DomainException('Identifique o equipamento antes de registrar sua entrega. Esta OS já tem histórico de retirada.');
            }
            if ($modo === 'existente') {
                $id = filter_var($dados['equipamento_id'], FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
                if ($id !== false) {
                    $sufixo = $this->db->dbdriver === 'mysqli' ? ' FOR UPDATE' : '';
                    $this->db->query('SELECT id FROM trifase_equipamentos WHERE id = ?' . $sufixo, [$id]);
                    if (trifaseGarantiaUnidadeSubstituida($this->db, $id)) {
                        throw new DomainException('Unidade substituída em garantia. Consulte o histórico e selecione a substituta.');
                    }
                }
                $unidade = $id !== false ? $this->unidade($id) : null;
                if ($unidade === null || (int) $unidade->cliente_id !== (int) $os->clientes_id) {
                    throw new DomainException('Escolha um equipamento deste cliente.');
                }
            } else {
                $selo = $this->texto($dados['selo'], 100);
                $serie = $this->texto($dados['serie'], 100);
                $imei = $this->texto($dados['imei'], 100);
                $seloChave = $selo === '' ? null : hash('sha256', mb_strtoupper(preg_replace('/\s+/u', '', $selo), 'UTF-8'));
                if ($seloChave !== null && $this->db->where('selo_chave', $seloChave)->count_all_results('trifase_equipamentos') > 0) {
                    throw new DomainException('Este selo já foi cadastrado. Procure a unidade existente antes de continuar.');
                }
                $modeloId = filter_var($dados['modelo_id'], FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
                if ($dados['modelo_id'] !== '' && $modeloId === false) {
                    throw new DomainException('Modelo inválido. Escolha novamente ou preencha um cadastro novo.');
                }
                if ($modeloId !== false) {
                    $modelo = $this->db->where('id', $modeloId)->get('trifase_equipamento_modelos', 1)->row();
                    if ($modelo === null) {
                        throw new DomainException('Modelo não encontrado. Escolha novamente.');
                    }
                } else {
                    $modeloId = $this->obterModelo($dados['tipo'], $dados['marca'], $dados['modelo'], $usuario);
                }
                $this->inserir('trifase_equipamentos', ['modelo_id' => $modeloId, 'cliente_id' => (int) $os->clientes_id,
                    'selo' => $selo, 'selo_chave' => $seloChave, 'serie' => $serie, 'imei' => $imei,
                    'usuario_id' => $usuario, 'criado_em' => date('Y-m-d H:i:s')]);
                $unidade = $this->unidade((int) $this->db->insert_id());
            }
            if ($unidade === null) {
                throw new RuntimeException('Não foi possível conferir o equipamento criado.');
            }
            $this->inserir('trifase_os_equipamentos', ['os_id' => $osId, 'equipamento_id' => (int) $unidade->id,
                'tipo' => $unidade->tipo, 'marca' => $unidade->marca, 'modelo' => $unidade->modelo,
                'selo' => $unidade->selo, 'serie' => $unidade->serie, 'imei' => $unidade->imei,
                'itens_recebidos' => $itens, 'estado_entrada' => $estado, 'usuario_id' => $usuario,
                'vinculado_em' => date('Y-m-d H:i:s'), 'operacao' => $chave, 'payload_hash' => $hash]);
            $lock->finalizar(true);
            return (int) $unidade->id;
        } catch (Throwable $e) {
            $lock->finalizar(false);
            throw $e;
        }
    }

    /** Upsert da chave normalizada reutiliza o cadastro sem reescrever seus dados. */
    public function obterModelo(mixed $tipo, mixed $marca, mixed $nome, int $usuario): int
    {
        if (! in_array($tipo, ['placa', 'celular', 'outro'], true)) {
            throw new DomainException('Escolha o tipo de equipamento.');
        }
        $marca = $this->texto($marca, 100, true);
        $nome = $this->texto($nome, 160, true);
        $normalizar = static fn ($s) => mb_strtolower(preg_replace('/\s+/u', ' ', trim($s)), 'UTF-8');
        $chave = hash('sha256', json_encode([$tipo, $normalizar($marca), $normalizar($nome)], JSON_THROW_ON_ERROR));
        $sql = match ($this->db->dbdriver) {
            'mysqli' => 'INSERT INTO trifase_equipamento_modelos (tipo, marca, modelo, chave, usuario_id, atualizado_em) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)',
            'sqlite3' => 'INSERT OR IGNORE INTO trifase_equipamento_modelos (tipo, marca, modelo, chave, usuario_id, atualizado_em) VALUES (?, ?, ?, ?, ?, ?)',
            default => throw new RuntimeException('Driver não suportado.'),
        };
        if (! $this->db->query($sql, [$tipo, $marca, $nome, $chave, $usuario, date('Y-m-d H:i:s')])) {
            throw new RuntimeException('Não foi possível cadastrar o modelo.');
        }
        $modelo = $this->db->where('chave', $chave)->get('trifase_equipamento_modelos', 1)->row();
        if ($modelo === null) {
            throw new RuntimeException('Modelo não confirmado.');
        }
        return (int) $modelo->id;
    }

    private function texto(mixed $valor, int $maximo, bool $obrigatorio = false): string
    {
        if (! is_string($valor) || ! mb_check_encoding($valor, 'UTF-8') || str_contains($valor, "\0")
            || mb_strlen(trim($valor)) > $maximo || ($obrigatorio && trim($valor) === '')) {
            throw new DomainException('Confira os textos obrigatórios e seus limites.');
        }
        return trim($valor);
    }

    private function inserir(string $tabela, array $dados): void
    {
        $debug = $this->db->db_debug;
        $this->db->db_debug = false;
        try {
            if (! $this->db->insert($tabela, $dados)) {
                $erro = $this->db->error();
                if (in_array((int) $erro['code'], [19, 1062], true)) {
                    throw new DomainException('Identificação já utilizada. Recarregue e confira os cadastros existentes.');
                }
                throw new RuntimeException('Não foi possível gravar a identificação.');
            }
        } finally {
            $this->db->db_debug = $debug;
        }
    }
}
