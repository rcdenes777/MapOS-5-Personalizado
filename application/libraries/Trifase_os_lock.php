<?php

defined('BASEPATH') or exit('No direct script access allowed');

/** Trava compartilhada entre edição nativa, faturamento e operações Trifase. */
final class Trifase_os_lock
{
    private bool $aberta = false;
    public readonly object $os;

    public function __construct(private object $db, int $id)
    {
        if ($id <= 0 || ! $db->trans_begin()) {
            throw new DomainException('OS inválida ou indisponível.');
        }
        $this->aberta = true;
        try {
            $sufixo = match ($db->dbdriver) {
                'mysqli' => ' FOR UPDATE', 'sqlite3' => '',
                default => throw new RuntimeException('Driver não suportado.'),
            };
            $os = $db->query('SELECT * FROM os WHERE idOs = ?' . $sufixo, [$id])->row();
            if (! $os) {
                throw new DomainException('OS inexistente.');
            }
            $this->os = $os;
        } catch (Throwable $e) {
            $this->finalizar(false);
            throw $e;
        }
    }

    public function finalizar(bool $sucesso): void
    {
        if (! $this->aberta) {
            return;
        }
        $this->aberta = false;
        if (! $sucesso || ! $this->db->trans_status()) {
            $this->db->trans_rollback();
            if ($sucesso) {
                throw new RuntimeException('Não foi possível gravar todas as alterações.');
            }
            return;
        }
        if (! $this->db->trans_commit()) {
            $this->db->trans_rollback();
            throw new RuntimeException('Não foi possível confirmar as alterações.');
        }
    }

    public function __destruct()
    {
        $this->finalizar(false);
    }
}
