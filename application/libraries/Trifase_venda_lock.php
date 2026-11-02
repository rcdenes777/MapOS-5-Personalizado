<?php
final class Trifase_venda_lock
{
    private bool $aberta = true;
    public function __construct(private object $db, int $id)
    {
        if (! $db->trans_begin()) {
            throw new RuntimeException('Venda indisponível.');
        }
        $sufixo = $db->dbdriver === 'mysqli' ? ' FOR UPDATE' : '';
        if (! $db->query('SELECT idVendas FROM vendas WHERE idVendas = ?' . $sufixo, [$id])->row()) {
            $this->finalizar(false);
            throw new DomainException('Venda não encontrada.');
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
                throw new RuntimeException('Falha ao confirmar a venda.');
            } return;
        }
        if (! $this->db->trans_commit()) {
            $this->db->trans_rollback();
            throw new RuntimeException('Falha ao confirmar a venda.');
        }
    }
    public function __destruct()
    {
        $this->finalizar(false);
    }
}
