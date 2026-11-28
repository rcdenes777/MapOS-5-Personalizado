<?php

defined('BASEPATH') or exit('No direct script access allowed');
require_once APPPATH . 'libraries/Trifase_os_lock.php';
require_once APPPATH . 'helpers/os_helper.php';
require_once APPPATH . 'helpers/trifase_publico_helper.php';
require_once APPPATH . 'helpers/trifase_orcamento_helper.php';

class Trifase_orcamento_model extends CI_Model
{
    private const ETAPAS_DE_ORCAMENTO = ['Aberto', 'Orçamento', 'Negociação', 'Orçamento recusado', 'Aprovado'];

    /** Lista fechada: nunca serializar objetos de produtos/clientes para o público. */
    public function retrato(object $os): array
    {
        $itens = [];
        $somas = ['peca' => 0.0, 'servico' => 0.0];
        foreach (['peca', 'servico'] as $tipo) {
            if ($tipo === 'peca') {
                $linhas = $this->db->select('i.*, p.descricao AS nome, p.precoVenda')->from('produtos_os i')
                    ->join('produtos p', 'p.idProdutos = i.produtos_id')->where('i.os_id', (int) $os->idOs)->order_by('i.idProdutos_os')->get()->result();
            } else {
                $linhas = $this->db->select('i.*, s.nome, s.preco AS precoVenda')->from('servicos_os i')
                    ->join('servicos s', 's.idServicos = i.servicos_id')->where('i.os_id', (int) $os->idOs)->order_by('i.idServicos_os')->get()->result();
            }
            foreach ($linhas as $item) {
                $total = $tipo === 'peca' ? (float) $item->subTotal : osValorDoItem($item);
                $bruto = osValorBrutoDoItem($item);
                $quantidade = (float) $item->quantidade;
                if (! is_finite($quantidade) || $quantidade <= 0) {
                    throw new DomainException('Confira as quantidades dos itens antes de publicar.');
                }
                $somas[$tipo] += $total;
                $itens[] = ['tipo' => $tipo, 'item' => (int) ($tipo === 'peca' ? $item->idProdutos_os : $item->idServicos_os),
                    'nome' => mb_substr(trim(html_entity_decode(strip_tags((string) $item->nome), ENT_QUOTES | ENT_HTML5, 'UTF-8')), 0, 500),
                    'quantidade' => (string) $quantidade, 'unitario_c' => $this->centavos($bruto / $quantidade),
                    'desconto_c' => $this->centavos(max(0, $bruto - $total)), 'total_c' => $this->centavos($total)];
            }
        }
        $totais = osTotais($somas['peca'], $somas['servico'], $os->valor_desconto ?? 0, $os->tipo_desconto ?? null, $os->desconto ?? 0);
        return ['os' => (int) $os->idOs, 'cliente' => (int) $os->clientes_id, 'itens' => $itens,
            'pecas_c' => $this->centavos($totais['produtos']), 'servicos_c' => $this->centavos($totais['servicos']),
            'desconto_c' => $this->centavos($totais['desconto']), 'total_c' => $this->centavos($totais['total'])];
    }

    public function hash(array $retrato): string
    {
        return hash('sha256', json_encode($retrato, JSON_THROW_ON_ERROR));
    }

    public function atual(int $id): ?object
    {
        return $this->db->select('v.*, e.ativo')->from('trifase_orcamento_estado e')->join('trifase_orcamento_versoes v', 'v.id = e.versao_id AND v.os_id = e.os_id')
            ->where('e.os_id', $id)->get()->row() ?: null;
    }

    public function historico(int $id): array
    {
        return $this->db->where('os_id', $id)->order_by('id', 'desc')->get('trifase_orcamento_versoes')->result();
    }

    public function eventos(int $id): array
    {
        return $this->db->where('os_id', $id)->order_by('id', 'desc')->get('trifase_orcamento_eventos')->result();
    }

    public function decisao(int $versao): ?object
    {
        return $this->db->where('decisao_versao', $versao)->get('trifase_orcamento_eventos', 1)->row() ?: null;
    }

    public function publicar(int $id, string $esperado, int $usuario, string $chave, array $apresentacao = []): int
    {
        $this->validarOperacao($chave);
        if ($usuario <= 0 || ! preg_match('/\A[a-f0-9]{64}\z/', $esperado)) {
            throw new DomainException('Reabra a prévia antes de publicar.');
        }
        $apresentacao = trifaseOrcamentoApresentacao($apresentacao);
        $hash = $this->hash(['publicar', $id, $esperado, $usuario, $apresentacao]);
        return $this->transacao($id, function ($os) use ($id, $esperado, $usuario, $chave, $hash, $apresentacao) {
            if ($anterior = $this->reenvio($id, $chave, $hash)) {
                return (int) $anterior->versao_id;
            }
            if ($this->entregue($id)) {
                throw new DomainException('Equipamento entregue. Corrija a entrega ativa antes de publicar outra versão do orçamento.');
            }
            if ($os->status === 'Cancelado') {
                throw new DomainException('Não publique orçamento de OS cancelada.');
            }
            $retrato = $this->retrato($os);
            if ($retrato['itens'] === [] || ! hash_equals($esperado, $this->hash($retrato))) {
                throw new DomainException('Os itens ou valores mudaram. Reabra e confira a prévia antes de publicar.');
            }
            if ($apresentacao !== []) {
                $retrato['apresentacao'] = $apresentacao;
            }
            if (strlen(json_encode($retrato, JSON_THROW_ON_ERROR)) > 60000) {
                throw new DomainException('Orçamento muito extenso. Reduza os itens antes de publicar.');
            }
            $numero = $this->db->where('os_id', $id)->count_all_results('trifase_orcamento_versoes') + 1;
            $this->inserir('trifase_orcamento_versoes', ['os_id' => $id, 'numero' => $numero, 'conteudo' => json_encode($retrato, JSON_THROW_ON_ERROR),
                'conteudo_hash' => $esperado, 'usuario_id' => $usuario, 'criado_em' => date('Y-m-d H:i:s')]);
            $versao = (int) $this->db->insert_id();
            $this->evento($id, $versao, 'publicar', '', $usuario, null, $chave, $hash);
            $dados = ['versao_id' => $versao, 'ativo' => 1];
            $ok = $this->atual($id) !== null
                ? $this->db->where('os_id', $id)->update('trifase_orcamento_estado', $dados)
                : $this->db->insert('trifase_orcamento_estado', ['os_id' => $id] + $dados);
            if (! $ok) {
                throw new RuntimeException('Não foi possível publicar o orçamento.');
            }
            if (in_array($os->status, self::ETAPAS_DE_ORCAMENTO, true)) {
                $this->registrarAndamento($os, 'Negociação', $usuario, date('Y-m-d H:i:s'));
            }
            require_once APPPATH . 'helpers/trifase_garantia_helper.php';
            if (trifaseGarantiaOperacoesHabilitadas() && $this->db->table_exists('trifase_garantia_retornos') && $this->db->where('os_id', $id)->count_all_results('trifase_garantia_retornos')) {
                require_once APPPATH . 'models/Trifase_garantia_model.php';
                $g = new Trifase_garantia_model();
                $g->db = $this->db;
                $g->registrarOrcamento($id, $versao, $usuario);
            }
            return $versao;
        });
    }

    public function retirar(int $id, int $versao, int $usuario, string $chave): void
    {
        $this->validarOperacao($chave);
        if ($usuario <= 0) {
            throw new DomainException('Operador inválido.');
        }
        $hash = $this->hash(['retirar', $id, $versao, $usuario]);
        $this->transacao($id, function ($os) use ($id, $versao, $usuario, $chave, $hash) {
            if ($this->reenvio($id, $chave, $hash)) {
                return;
            }
            $atual = $this->atual($id);
            if ($atual === null || (int) $atual->id !== $versao || ! $atual->ativo) {
                throw new DomainException('O orçamento publicado mudou. Recarregue a tela.');
            }
            $this->evento($id, $versao, 'retirar', '', $usuario, null, $chave, $hash);
            if (! $this->db->where('os_id', $id)->update('trifase_orcamento_estado', ['ativo' => 0])) {
                throw new RuntimeException('Não foi possível retirar a publicação.');
            }
            if ($os->status === 'Orçamento recusado') {
                $this->registrarAndamento($os, 'Orçamento', $usuario, date('Y-m-d H:i:s'));
            }
        });
    }

    /** Token é conferido novamente SOB a mesma trava usada na revogação do link. */
    public function responder(int $id, mixed $token, int $versao, mixed $tipo, mixed $nome, mixed $confirmado, string $chave): void
    {
        $this->registrarResposta($id, $token, $versao, $tipo, $nome, $confirmado, $chave, null);
    }

    public function registrarRespostaInterna(int $id, int $versao, mixed $tipo, mixed $nome, mixed $confirmado, string $chave, int $usuario, array $comunicacao): void
    {
        $comunicacao = $this->validarComunicacao($usuario, $comunicacao);
        $this->registrarResposta($id, null, $versao, $tipo, $nome, $confirmado, $chave, $usuario, $comunicacao);
    }

    public function registrarRegularizacao(int $id, int $versao, mixed $tipo, mixed $nome, mixed $confirmado, string $chave, int $usuario, array $comunicacao): void
    {
        $comunicacao = $this->validarComunicacao($usuario, $comunicacao, true);
        $this->registrarResposta($id, null, $versao, $tipo, $nome, $confirmado, $chave, $usuario, $comunicacao, true);
    }

    private function validarComunicacao(int $usuario, array $comunicacao, bool $regularizacao = false): array
    {
        if ($usuario <= 0) {
            throw new DomainException('Identifique quem está registrando a resposta.');
        }
        if (! in_array($comunicacao['canal'] ?? null, ['telefone', 'whatsapp', 'presencial'], true)) {
            throw new DomainException('Informe o canal da comunicação: telefone, WhatsApp ou presencial.');
        }
        $data = $comunicacao['comunicado_em'] ?? null;
        $comunicadoData = null;
        $comunicadoEm = null;
        if (! is_string($data)) {
            throw new DomainException('Informe a data da comunicação.');
        }
        if (preg_match('/\A\d{4}-\d{2}-\d{2}\z/', $data)) {
            $instante = DateTimeImmutable::createFromFormat('!Y-m-d', $data);
            if ($instante === false || $instante->format('Y-m-d') !== $data || $instante->getTimestamp() > time()) {
                throw new DomainException('Informe uma data de comunicação válida, não futura.');
            }
            $comunicadoData = $data;
        } elseif (preg_match('/\A\d{4}-\d{2}-\d{2}T\d{2}:\d{2}\z/', $data)) {
            $instante = DateTimeImmutable::createFromFormat('!Y-m-d\TH:i', $data);
            if ($instante === false || $instante->format('Y-m-d\TH:i') !== $data || $instante->getTimestamp() > time()) {
                throw new DomainException('Informe uma data de comunicação válida, não futura.');
            }
            $comunicadoEm = $instante->format('Y-m-d H:i:s');
        } else {
            throw new DomainException('Informe a data da comunicação.');
        }
        // Canonizar antes do limite, do hash idempotente e da persistência.
        foreach (['observacao', 'justificativa'] as $campo) {
            if (isset($comunicacao[$campo]) && is_string($comunicacao[$campo])) {
                $comunicacao[$campo] = str_replace("\r\n", "\n", $comunicacao[$campo]);
            }
        }
        if (array_key_exists('observacao', $comunicacao)
            && (! is_string($comunicacao['observacao']) || ! mb_check_encoding($comunicacao['observacao'], 'UTF-8')
                || mb_strlen($comunicacao['observacao']) > 2000 || preg_match('/[\x00-\x09\x0b-\x1f\x7f\x{0080}-\x{009f}\x{202a}-\x{202e}\x{2066}-\x{2069}]/u', $comunicacao['observacao']))) {
            throw new DomainException('Informe uma observação válida com até 2000 caracteres, sem controles.');
        }
        $justificativa = $comunicacao['justificativa'] ?? null;
        if ($regularizacao && (! is_string($justificativa) || ! mb_check_encoding($justificativa, 'UTF-8')
            || preg_match('/[\x00-\x09\x0b-\x1f\x7f\x{0080}-\x{009f}\x{202a}-\x{202e}\x{2066}-\x{2069}]/u', $justificativa)
            || mb_strlen(trim($justificativa)) < 5 || mb_strlen($justificativa) > 2000)) {
            throw new DomainException('Informe uma justificativa válida de 5 a 2000 caracteres, sem controles.');
        }
        $comunicacao = ['canal' => $comunicacao['canal'],
            'comunicado_em' => $comunicadoEm,
            'comunicado_data' => $comunicadoData,
            'observacao' => $comunicacao['observacao'] ?? null];
        return $regularizacao ? $comunicacao + ['regularizacao_tardia' => 1, 'justificativa' => trim($justificativa)] : $comunicacao;
    }

    /** A trava por OS do chamador serializa esta leitura com registro/correção de entrega. */
    public function entregue(int $id): bool
    {
        return $this->entregaAtiva($id) !== null;
    }

    private function entregaAtiva(int $id): ?object
    {
        if (! $this->db->table_exists('trifase_entregas_estado')) {
            return null;
        }
        require_once APPPATH . 'models/Trifase_entrega_model.php';
        $entregas = new Trifase_entrega_model();
        $entregas->db = $this->db;
        return $entregas->ativa($id);
    }

    private function registrarResposta(int $id, mixed $token, int $versao, mixed $tipo, mixed $nome, mixed $confirmado, string $chave, ?int $usuario, array $comunicacao = [], bool $regularizacao = false): void
    {
        $this->validarOperacao($chave);
        if (! in_array($tipo, ['aprovar', 'recusar'], true) || $confirmado !== '1' || ! is_string($nome)
            || ! mb_check_encoding($nome, 'UTF-8') || preg_match('/[\x00-\x1f\x7f]/', $nome)
            || mb_strlen(trim($nome)) < 3 || mb_strlen(trim($nome)) > 160) {
            throw new DomainException('Informe seu nome e confirme a decisão sobre esta versão.');
        }
        $nome = trim($nome);
        $hash = $this->hash($usuario === null ? ['responder', $id, $versao, $tipo, $nome] : [$regularizacao ? 'regularizacao_tardia' : 'resposta_interna', $id, $versao, $tipo, $nome, $usuario, $comunicacao]);
        $this->transacao($id, function ($os) use ($id, $token, $versao, $tipo, $nome, $chave, $hash, $usuario, $comunicacao, $regularizacao) {
            if ($this->reenvio($id, $chave, $hash)) {
                return;
            }
            $atual = $usuario === null ? $this->publicadoSobTrava($os, $token) : $this->versaoVigente($os);
            $registrada = $usuario !== null && ! $regularizacao && $atual === null ? $this->atual($id) : null;
            if ($registrada !== null && (int) $registrada->id === $versao) {
                // Itens/valores mudaram depois da publicação: a resposta da equipe cria, no mesmo ato,
                // a versão correspondente ao estado atual, sem exigir publicação manual.
                $versao = $this->snapshotParaResposta($os, $usuario, $hash);
                $atual = $this->versaoVigente($os);
            }
            if ($atual === null || (int) $atual->id !== $versao) {
                throw new DomainException('Orçamento indisponível ou atualizado. Reabra e confira a versão.');
            }
            $entrega = $this->entregaAtiva($id);
            if ($regularizacao && $entrega === null) {
                throw new DomainException('A regularização exige uma entrega ativa.');
            }
            $dataInformada = $comunicacao['comunicado_data'] ?? substr((string) ($comunicacao['comunicado_em'] ?? ''), 0, 10);
            if ($entrega !== null) {
                // O cliente decide pelo link só até a entrega; a equipe pode lançar o fato depois.
                if ($usuario === null) {
                    throw new DomainException('Equipamento entregue. Este orçamento está disponível somente para consulta.');
                }
                if ($dataInformada > substr((string) $entrega->entregue_em, 0, 10)) {
                    throw new DomainException('A data informada não pode ser posterior à entrega.');
                }
                $comunicacao['entrega_id'] = (int) $entrega->id;
                $comunicacao['regularizacao_tardia'] = 1;
            }
            if ($this->decisao($versao) !== null) {
                throw new DomainException('Esta versão já recebeu uma decisão. Use uma nova versão para registrar outra resposta.');
            }
            $this->evento($id, $versao, $tipo, $nome, $usuario, $versao, $chave, $hash, $comunicacao);
            if ($entrega === null && in_array($os->status, self::ETAPAS_DE_ORCAMENTO, true)) {
                $this->registrarAndamento($os, $tipo === 'aprovar' ? 'Aprovado' : 'Orçamento recusado', $usuario, $this->decisao($versao)->criado_em);
            }
        });
    }

    private function snapshotParaResposta(object $os, int $usuario, string $hash): int
    {
        if ($os->status === 'Cancelado') {
            throw new DomainException('Não registre resposta de orçamento em OS cancelada.');
        }
        $id = (int) $os->idOs;
        $retrato = $this->retrato($os);
        if ($retrato['itens'] === []) {
            throw new DomainException('Orçamento indisponível ou atualizado. Reabra e confira a versão.');
        }
        $hashRetrato = $this->hash($retrato);
        $anterior = $this->atual($id);
        if ($anterior !== null) {
            $linha = $this->db->select('conteudo')->where('id', (int) $anterior->id)->get('trifase_orcamento_versoes')->row();
            $apresentacao = $linha !== null ? (json_decode((string) $linha->conteudo, true)['apresentacao'] ?? []) : [];
            if (is_array($apresentacao) && $apresentacao !== []) {
                $retrato['apresentacao'] = $apresentacao;
            }
        }
        $json = json_encode($retrato, JSON_THROW_ON_ERROR);
        if (strlen($json) > 60000) {
            throw new DomainException('Orçamento muito extenso. Reduza os itens antes de registrar a resposta.');
        }
        $numero = $this->db->where('os_id', $id)->count_all_results('trifase_orcamento_versoes') + 1;
        $this->inserir('trifase_orcamento_versoes', ['os_id' => $id, 'numero' => $numero,
            'conteudo' => $json, 'conteudo_hash' => $hashRetrato,
            'usuario_id' => $usuario, 'criado_em' => date('Y-m-d H:i:s')]);
        $versao = (int) $this->db->insert_id();
        $this->evento($id, $versao, 'publicar', '', $usuario, null, 'snap' . substr(hash('sha256', $id . '|' . $hash), 0, 24), $hash);
        $dados = ['versao_id' => $versao, 'ativo' => 1];
        $ok = $this->atual($id) !== null
            ? $this->db->where('os_id', $id)->update('trifase_orcamento_estado', $dados)
            : $this->db->insert('trifase_orcamento_estado', ['os_id' => $id] + $dados);
        if (! $ok) {
            throw new RuntimeException('Não foi possível registrar a resposta.');
        }
        return $versao;
    }

    private function registrarAndamento(object $os, string $status, ?int $usuario, string $data): void
    {
        $id = (int) $os->idOs;
        if ($status !== $os->status && (! $this->db->insert('os_historico', [
            'os_id' => $id, 'status_anterior' => $os->status, 'status_novo' => $status,
            'usuarios_id' => $usuario, 'data_hora' => $data,
        ]) || ! $this->db->where('idOs', $id)->update('os', ['status' => $status]))) {
            throw new RuntimeException('Não foi possível registrar o andamento do orçamento.');
        }
    }

    /** Chamado sob a trava da OS após alteração dos dados cotados. */
    public function reavaliarRecusa(object $os, int $usuario): bool
    {
        if ($os->status !== 'Orçamento recusado') {
            return false;
        }
        $atual = $this->atual((int) $os->idOs);
        if ($atual === null || ! $atual->ativo || ($this->decisao((int) $atual->id)->tipo ?? '') !== 'recusar'
            || $this->versaoVigente($os, $atual) !== null) {
            return false;
        }
        $this->registrarAndamento($os, 'Orçamento', $usuario, date('Y-m-d H:i:s'));
        return true;
    }

    public function versaoVigente(object $os, ?object $atual = null): ?object
    {
        if ($os->status === 'Cancelado') {
            return null;
        }
        $atual ??= $this->atual((int) $os->idOs);
        if ($atual === null || ! $atual->ativo) {
            return null;
        }
        try {
            return hash_equals($atual->conteudo_hash, $this->hash($this->retrato($os))) ? $atual : null;
        } catch (DomainException) {
            return null;
        }
    }

    /** Somente após autenticar o cliente; confere o dono sob a mesma trava da OS. */
    public function publicadoParaCliente(int $id, int $clienteId): ?object
    {
        return $this->transacao($id, fn ($os) => (int) $os->clientes_id === $clienteId ? $this->versaoVigente($os) : null);
    }

    public function publicado(int $id, mixed $token): ?object
    {
        return $this->transacao($id, fn ($os) => $this->publicadoSobTrava($os, $token));
    }

    private function publicadoSobTrava(object $os, mixed $token): ?object
    {
        if (! trifasePublicoTokenValido($token) || $os->status === 'Cancelado') {
            return null;
        }
        $link = $this->db->where('os_id', (int) $os->idOs)->where('token_hash', hash('sha256', $token))->where('expira_em >', time())->get('trifase_publico_links', 1)->row();
        return $link ? $this->versaoVigente($os) : null;
    }

    private function evento(int $os, int $versao, string $tipo, string $nome, ?int $usuario, ?int $decisao, string $chave, string $hash, array $comunicacao = []): void
    {
        $this->inserir('trifase_orcamento_eventos', ['os_id' => $os, 'versao_id' => $versao, 'tipo' => $tipo, 'nome' => $nome,
            'usuario_id' => $usuario, 'decisao_versao' => $decisao, 'criado_em' => date('Y-m-d H:i:s'), 'operacao' => $chave, 'payload_hash' => $hash] + $comunicacao);
    }

    private function reenvio(int $os, string $chave, string $hash): ?object
    {
        $evento = $this->db->where('operacao', $chave)->get('trifase_orcamento_eventos', 1)->row();
        if ($evento !== null && ((int) $evento->os_id !== $os || ! hash_equals($evento->payload_hash, $hash))) {
            throw new DomainException('Chave já utilizada com outros dados.');
        }
        return $evento;
    }

    private function validarOperacao(string $chave): void
    {
        if (! preg_match('/\A[a-zA-Z0-9_-]{16,64}\z/', $chave)) {
            throw new DomainException('Operação inválida. Reabra a página.');
        }
    }

    private function centavos(float $valor): int
    {
        if (! is_finite($valor) || $valor < 0 || $valor > 1000000000) {
            throw new DomainException('Confira os valores antes de publicar.');
        }
        return (int) round($valor * 100);
    }

    private function inserir(string $tabela, array $dados): void
    {
        if (! $this->db->insert($tabela, $dados)) {
            throw new RuntimeException('Não foi possível salvar o orçamento.');
        }
    }

    private function transacao(int $id, callable $acao): mixed
    {
        $lock = new Trifase_os_lock($this->db, $id);
        try {
            $resultado = $acao($lock->os);
            $lock->finalizar(true);
            return $resultado;
        } catch (Throwable $e) {
            $lock->finalizar(false);
            throw $e;
        }
    }
}
