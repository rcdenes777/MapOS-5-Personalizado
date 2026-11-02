<?php

defined('BASEPATH') or exit('No direct script access allowed');
require_once APPPATH . 'helpers/trifase_garantia_helper.php';
require_once APPPATH . 'models/Trifase_retorno_model.php';
require_once APPPATH . 'models/Trifase_financeiro_model.php';
require_once APPPATH . 'models/Trifase_estoque_model.php';

/** Executa soluções somente após confirmação explícita da avaliação vigente. */
class Trifase_garantia_model extends CI_Model
{
    public function operacoes(int $id): array
    {
        return $this->db->where('os_id', $id)->order_by('id', 'desc')->get('trifase_garantia_operacoes')->result();
    }
    public function reembolsos(int $id): array
    {
        return $this->db->where('os_id', $id)->order_by('id', 'desc')->get('trifase_garantia_reembolsos')->result();
    }
    public function financeiro(int $id): ?array
    {
        $v = $this->retornos()->vinculo($id);
        if (! $v || ! $this->db->where('os_id', (int) $v->origem_id)->count_all_results('trifase_financeiro_obrigacoes')) {
            return null;
        }
        return $this->financas()->resumo((int) $v->origem_id);
    }
    public function financeiroHash(array $r): string
    {
        return hash('sha256', json_encode([$r['total_c'], $r['recebido_c'], $r['saldo_c'], $r['reembolsado_c'] ?? 0, $r['abatimento_garantia_c'] ?? 0], JSON_THROW_ON_ERROR));
    }

    /** Executado sob a trava do publicador, na mesma transação da versão. */
    public function registrarOrcamento(int $id, int $versao, int $usuario): void
    {
        $a = $this->avaliacaoExigida($id, 'novo_orcamento', null);
        $v = $this->retornos()->vinculo($id);
        $this->evento($id, (int) $v->origem_id, (int) $a->id, 'orcamento', ['versao_id' => $versao], $usuario, bin2hex(random_bytes(16)), hash('sha256', 'orcamento:' . $versao));
    }

    public function trocar(int $id, array $d, int $avaliacao, int $usuario, string $chave): int
    {
        $this->operador($usuario, $chave);
        $campos = ['origem', 'produto_id', 'modelo_id', 'tipo', 'marca', 'modelo', 'selo', 'serie', 'imei', 'destino_antiga', 'custo_externo', 'motivo'];
        if (array_diff(array_keys($d), $campos)) {
            throw new DomainException('Dados de troca inválidos.');
        }
        $dados = [];
        foreach ($campos as $c) {
            $dados[$c] = $this->texto($d[$c] ?? '', $c === 'motivo' ? 2000 : 100);
        }
        $d = $dados;
        if (! in_array($d['origem'], ['estoque','externa'], true) || ! in_array($d['destino_antiga'], ['retida_assistencia','devolvida_cliente'], true)
            || $d['motivo'] === '' || ($d['selo'] === '' && $d['serie'] === '' && $d['imei'] === '')) {
            throw new DomainException('Informe origem da substituta, identificação, destino da antiga e motivo.');
        }
        $hash = hash('sha256', json_encode(['troca',$id,$d,$avaliacao,$usuario], JSON_THROW_ON_ERROR));
        return $this->transacao($id, function ($v, $os) use ($id, $d, $avaliacao, $usuario, $chave, $hash) {
            if ($r = $this->reenvio($chave, $hash)) {
                return $r;
            }
            $a = $this->avaliacaoExigida($id, 'troca', $avaliacao);
            $this->disponivel($os);
            $antiga = (int) $v->equipamento_id;
            $this->travarUnidade($antiga);
            if (trifaseGarantiaUnidadeSubstituida($this->db, $antiga) || trifaseGarantiaResolucaoExecutada($this->db, $id)) {
                throw new DomainException('Esta unidade ou retorno já tem solução executada.');
            }
            $ativos = $this->db->select('os.idOs')->from('trifase_os_equipamentos e')->join('os', 'os.idOs = e.os_id')->where('e.equipamento_id', $antiga)
                ->where('os.idOs !=', $id)->where_not_in('os.status', ['Finalizado','Cancelado'])->get()->result();
            if ($ativos !== []) {
                throw new DomainException('Conclua ou confira outros atendimentos abertos desta unidade antes de trocar.');
            }
            $eq = new Trifase_equipamento_model();
            $eq->db = $this->db;
            $modeloId = filter_var($d['modelo_id'], FILTER_VALIDATE_INT, ['options'=>['min_range'=>1]]);
            if ($d['modelo_id'] !== '' && $modeloId === false) {
                throw new DomainException('Modelo inválido.');
            }
            if ($modeloId === false) {
                $modeloId = $eq->obterModelo($d['tipo'], $d['marca'], $d['modelo'], $usuario);
            }
            $modelo = $this->db->where('id', $modeloId)->get('trifase_equipamento_modelos', 1)->row();
            if (! $modelo) {
                throw new DomainException('Modelo não encontrado.');
            }
            $seloChave = $d['selo'] === '' ? null : hash('sha256', mb_strtoupper(preg_replace('/\s+/u', '', $d['selo']), 'UTF-8'));
            if ($seloChave !== null && $this->db->where('selo_chave', $seloChave)->count_all_results('trifase_equipamentos')) {
                throw new DomainException('Selo já cadastrado. Identifique outra unidade física.');
            }
            $custo = null;
            $produto = null;
            $est = new Trifase_estoque_model();
            $est->db = $this->db;
            if ($d['origem'] === 'estoque') {
                $produto = filter_var($d['produto_id'], FILTER_VALIDATE_INT, ['options'=>['min_range'=>1]]);
                if ($produto === false) {
                    throw new DomainException('Selecione o produto que sairá do estoque.');
                }
                $sufixo = $this->db->dbdriver === 'mysqli' ? ' FOR UPDATE' : '';
                $p = $this->db->query('SELECT * FROM produtos WHERE idProdutos = ?' . $sufixo, [$produto])->row();
                if (! $p) {
                    throw new DomainException('Produto não encontrado.');
                }
                $custo = $p->precoCompra === null || $p->precoCompra === '' ? null : $est->centavos((string) $p->precoCompra);
                $est->movimentar($produto, 'troca_saida', 1, $custo, date('Y-m-d'), $d['motivo'], 'Troca em garantia · OS #' . $id, $usuario, bin2hex(random_bytes(16)));
            } elseif ($d['custo_externo'] !== '') {
                $custo = $est->centavos($d['custo_externo']);
            }
            $nova = $this->inserir('trifase_equipamentos', ['modelo_id'=>$modeloId,'cliente_id'=>(int)$v->cliente_id,'selo'=>$d['selo'],'selo_chave'=>$seloChave,
                'serie'=>$d['serie'],'imei'=>$d['imei'],'usuario_id'=>$usuario,'criado_em'=>date('Y-m-d H:i:s')]);
            $identificacao = ['equipamento_id'=>$nova,'tipo'=>$modelo->tipo,'marca'=>$modelo->marca,'modelo'=>$modelo->modelo,'selo'=>$d['selo'],'serie'=>$d['serie'],'imei'=>$d['imei']];
            $evento = $this->evento($id, (int)$v->origem_id, (int)$a->id, 'troca', ['origem'=>$d['origem'],'destino_antiga'=>$d['destino_antiga'],'motivo'=>$d['motivo'],'antiga_id'=>$antiga,'nova_id'=>$nova], $usuario, $chave, $hash);
            $this->inserir('trifase_garantia_trocas', ['os_id'=>$id,'origem_id'=>(int)$v->origem_id,'evento_id'=>$evento,'antiga_id'=>$antiga,'nova_id'=>$nova,'produto_id'=>$produto,
                'identificacao'=>json_encode($identificacao, JSON_THROW_ON_ERROR),'destino_antiga'=>$d['destino_antiga'],'custo_c'=>$custo]);
            return $evento;
        });
    }

    public function reembolsar(int $id, array $d, int $avaliacao, string $esperado, int $usuario, string $chave): int
    {
        $this->operador($usuario, $chave);
        if (array_diff(array_keys($d), ['modo','valor_c','data','forma','referencia','motivo']) || ! in_array($d['modo'] ?? null, ['parcial','total'], true)
            || ! is_int($d['valor_c'] ?? null) || ($d['valor_c'] < 0 || ($d['valor_c'] === 0 && $d['modo'] !== 'total')) || $d['valor_c'] > 999999999) {
            throw new DomainException('Confira modalidade e valor devolvido.');
        }
        foreach (['data'=>10,'forma'=>64,'referencia'=>300,'motivo'=>2000] as $c=>$limite) {
            $d[$c]=$this->texto($d[$c] ?? '', $limite, true);
        }
        $d = ['valor_c'=>$d['valor_c'],'modo'=>$d['modo'],'data'=>$d['data'],'forma'=>$d['forma'],'referencia'=>$d['referencia'],'motivo'=>$d['motivo']];
        $this->data($d['data']);
        if (! in_array($d['forma'], ['Pix','Dinheiro','Cartão de Crédito','Cartão de Débito','Transferência'], true)) {
            throw new DomainException('Forma de devolução inválida.');
        }
        $hash=hash('sha256', json_encode(['reembolso',$id,$d,$avaliacao,$esperado,$usuario], JSON_THROW_ON_ERROR));
        return $this->transacao($id, function ($v, $os) use ($id, $d, $avaliacao, $esperado, $usuario, $chave, $hash) {
            if ($r=$this->reenvio($chave, $hash)) {
                return $r;
            }
            $a=$this->avaliacaoExigida($id, 'devolucao_valor', $avaliacao);
            $this->disponivel($os);
            if (trifaseGarantiaTroca($this->db, $id)) {
                throw new DomainException('Retorno já resolvido por troca.');
            }
            $f=$this->financas();
            $r=$f->resumo((int)$v->origem_id);
            if (!hash_equals($this->financeiroHash($r), $esperado)) {
                throw new DomainException('O financeiro mudou. Recarregue e confira novamente o valor.');
            }
            if ($d['valor_c']>$r['recebido_c']||($d['modo']==='total'&&$d['valor_c']!==$r['recebido_c'])) {
                throw new DomainException('A devolução deve respeitar o recebido líquido; no encerramento total, devolva exatamente esse valor.');
            }
            $ultimo=$this->db->select_max('data_evento', 'data')->where('os_id', (int)$v->origem_id)->get('trifase_financeiro_eventos')->row();
            if (!empty($ultimo->data)&&$d['data']<$ultimo->data) {
                throw new DomainException('Data anterior aos registros financeiros da origem.');
            }
            $credito=$d['modo']==='total'?$r['total_c']:$d['valor_c'];
            if ($credito <= 0) {
                throw new DomainException('A cobrança já está encerrada.');
            }
            $evento=$this->evento($id, (int)$v->origem_id, (int)$a->id, 'reembolso', ['modo'=>$d['modo'],'valor_c'=>$d['valor_c'],'credito_c'=>$credito,'motivo'=>$d['motivo']], $usuario, $chave, $hash);
            $valor=$this->decimal($d['valor_c']);
            $despesa=$this->inserir('lancamentos', ['descricao'=>'Devolução de garantia · OS #' . (int)$v->origem_id . ' · retorno #' . $id,
                'valor'=>$valor,'desconto'=>'0.00','valor_desconto'=>$valor,'tipo_desconto'=>'real','data_vencimento'=>$d['data'],'data_pagamento'=>$d['valor_c'] > 0 ? $d['data'] : null,'baixado'=>$d['valor_c'] > 0 ? 1 : 0,
                'clientes_id'=>(int)$v->cliente_id,'cliente_fornecedor'=>'OS #' . (int)$v->origem_id,'forma_pgto'=>$d['forma'],'tipo'=>'despesa','usuarios_id'=>$usuario]);
            $this->inserir('trifase_financeiro_projecoes', ['lancamento_id'=>$despesa,'os_id'=>(int)$v->origem_id,'ativo'=>$d['valor_c'] > 0 ? 1 : 0]);
            $this->inserir('trifase_garantia_reembolsos', ['os_id'=>$id,'origem_id'=>(int)$v->origem_id,'evento_id'=>$evento,'valor_c'=>$d['valor_c'],'credito_c'=>$credito,'modo'=>$d['modo'],
                'data_evento'=>$d['data'],'forma'=>$d['forma'],'referencia'=>$d['referencia'],'motivo'=>$d['motivo'],'despesa_id'=>$despesa,'cancelado_id'=>null]);
            $f->sincronizarSaldoGarantia((int)$v->origem_id, $usuario);
            return $evento;
        });
    }

    /** Correção de registro indevido, nunca uma transferência inversa automática. */
    public function corrigirReembolso(int $id, int $reembolso, string $motivo, int $usuario, string $chave): int
    {
        $this->operador($usuario, $chave);
        $motivo=$this->texto($motivo, 2000, true);
        $hash=hash('sha256', json_encode(['corrigir_reembolso',$id,$reembolso,$motivo,$usuario], JSON_THROW_ON_ERROR));
        return $this->transacao($id, function ($v) use ($id, $reembolso, $motivo, $usuario, $chave, $hash) {
            if ($r=$this->reenvio($chave, $hash)) {
                return $r;
            }
            $r=$this->db->where('id', $reembolso)->where('os_id', $id)->where('cancelado_id', null)->get('trifase_garantia_reembolsos', 1)->row();
            if (!$r) {
                throw new DomainException('Devolução inexistente ou já corrigida.');
            }
            $a=$this->retornos()->avaliacao($id);
            $evento=$this->evento($id, (int)$v->origem_id, (int)$a->id, 'corrigir_reembolso', ['reembolso_id'=>$reembolso,'motivo'=>$motivo], $usuario, $chave, $hash);
            $this->atualizar('trifase_garantia_reembolsos', ['cancelado_id'=>$evento], ['id'=>$reembolso]);
            $this->atualizar('trifase_financeiro_projecoes', ['ativo'=>0], ['lancamento_id'=>(int)$r->despesa_id]);
            $this->atualizar('lancamentos', ['baixado'=>0,'data_pagamento'=>null], ['idLancamentos'=>(int)$r->despesa_id]);
            $this->financas()->sincronizarSaldoGarantia((int)$v->origem_id, $usuario);
            return $evento;
        });
    }

    private function disponivel(object $os): void
    {
        if (in_array($os->status, ['Cancelado','Finalizado'], true)) {
            throw new DomainException('Execute a solução antes de concluir ou entregar o retorno.');
        }
        if ($this->db->where('os_id', (int)$os->idOs)->count_all_results('trifase_financeiro_obrigacoes')) {
            throw new DomainException('Concilie a cobrança própria deste retorno antes de executar outra solução.');
        }
        if ($this->db->table_exists('trifase_entregas_estado')&&$this->db->where('os_id', (int)$os->idOs)->where('evento_id IS NOT NULL', null, false)->count_all_results('trifase_entregas_estado')) {
            throw new DomainException('Corrija a entrega antes de executar outra solução.');
        }
        if ($this->db->table_exists('trifase_orcamento_estado')&&$this->db->where('os_id', (int)$os->idOs)->where('ativo', 1)->count_all_results('trifase_orcamento_estado')) {
            throw new DomainException('Retire a publicação do orçamento antes de executar troca ou devolução.');
        }
    }
    private function avaliacaoExigida(int $id, string $solucao, ?int $esperada): object
    {
        $a=$this->retornos()->avaliacao($id);
        if (!$a||$a->cobertura==='avaliacao'||$a->solucao!==$solucao||($esperada!==null&&(int)$a->id!==$esperada)) {
            throw new DomainException('A avaliação mudou ou não permite esta solução. Reabra e confira.');
        }
        if ($solucao==='novo_orcamento'&&trifaseGarantiaResolucaoExecutada($this->db, $id)) {
            throw new DomainException('Este retorno já tem uma solução executada.');
        }
        return $a;
    }
    private function transacao(int $id, callable $acao): int
    {
        $v=$this->retornos()->vinculo($id);
        if (!$v) {
            throw new DomainException('Retorno inexistente.');
        }
        $raiz=new Trifase_os_lock($this->db, (int)$v->origem_id);
        $retorno=null;
        $debug=$this->db->db_debug;
        $this->db->db_debug=false;
        try {
            $retorno=new Trifase_os_lock($this->db, $id);
            if ($retorno->os->status==='Cancelado') {
                throw new DomainException('Retorno cancelado.');
            }
            $r=$acao($v, $retorno->os);
            $retorno->finalizar(true);
            $raiz->finalizar(true);
            return $r;
        } catch (Throwable $e) {
            $retorno?->finalizar(false);
            $raiz->finalizar(false);
            throw $e;
        } finally {
            $this->db->db_debug=$debug;
        }
    }
    private function retornos(): Trifase_retorno_model
    {
        $m=new Trifase_retorno_model();
        $m->db=$this->db;
        return $m;
    }
    private function financas(): Trifase_financeiro_model
    {
        $m=new Trifase_financeiro_model();
        $m->db=$this->db;
        return $m;
    }
    private function travarUnidade(int $id): void
    {
        $s=$this->db->dbdriver==='mysqli'?' FOR UPDATE':'';
        if (!$this->db->query('SELECT id FROM trifase_equipamentos WHERE id = ?'.$s, [$id])->row()) {
            throw new DomainException('Unidade não encontrada.');
        }
    }
    private function evento(int $os, int $raiz, int $avaliacao, string $tipo, array $dados, int $usuario, string $chave, string $hash): int
    {
        return $this->inserir('trifase_garantia_operacoes', ['os_id'=>$os,'origem_id'=>$raiz,'avaliacao_id'=>$avaliacao,'tipo'=>$tipo,'dados'=>json_encode($dados, JSON_THROW_ON_ERROR),
            'usuario_id'=>$usuario,'criado_em'=>date('Y-m-d H:i:s'),'operacao'=>$chave,'payload_hash'=>$hash]);
    }
    private function reenvio(string $chave, string $hash): ?int
    {
        $r=$this->db->where('operacao', $chave)->get('trifase_garantia_operacoes', 1)->row();
        if ($r&&!hash_equals($r->payload_hash, $hash)) {
            throw new DomainException('Chave já utilizada com outros dados.');
        }return $r?(int)$r->id:null;
    }
    private function inserir(string $t, array $d): int
    {
        if (!$this->db->insert($t, $d)) {
            throw new RuntimeException('Não foi possível confirmar toda a operação de garantia.');
        }return (int)$this->db->insert_id();
    }
    private function atualizar(string $t, array $d, array $onde): void
    {
        if (!$this->db->where($onde)->update($t, $d)) {
            throw new RuntimeException('Falha ao atualizar a operação de garantia.');
        }
    }
    private function operador(int $u, string $c): void
    {
        if ($u<=0||!preg_match('/\A[a-zA-Z0-9_-]{16,64}\z/', $c)) {
            throw new DomainException('Operador ou identificador inválido. Recarregue.');
        }
    }
    private function texto(mixed $v, int $max, bool $obrigatorio=false): string
    {
        if (!is_string($v)||!mb_check_encoding($v, 'UTF-8')||str_contains($v, "\0")||mb_strlen(trim($v))>$max||($obrigatorio&&trim($v)==='')) {
            throw new DomainException('Confira os textos obrigatórios e seus limites.');
        }return trim($v);
    }
    private function data(string $v): void
    {
        $d=DateTimeImmutable::createFromFormat('!Y-m-d',$v);
        if (!$d||$d->format('Y-m-d')!==$v||$v>date('Y-m-d')||$v<'1900-01-01') {
            throw new DomainException('Informe a data real da devolução, sem data futura.');
        }
    }
    private function decimal(int $v): string
    {
        return intdiv($v,100).'.'.str_pad((string)($v%100),2,'0',STR_PAD_LEFT);
    }
}
