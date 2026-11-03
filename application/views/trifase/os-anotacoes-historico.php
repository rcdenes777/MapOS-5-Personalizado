<section class="trifase-os-painel" aria-labelledby="piloto-anotacoes">
    <h2 id="piloto-anotacoes">Anotações internas</h2>
    <?php if ($pode['editar_tecnico'] ?? $pode['editar']) { ?>
        <form method="post" action="<?= e(site_url('os/adicionarAnotacao')) ?>" novalidate class="mb-4 grid gap-3" data-os-acao="anotacao" data-os-limpar>
            <input type="hidden" name="idOs" value="<?= e((int) $os->idOs) ?>">
            <?= component('textarea', [
                'name' => 'anotacao', 'id' => 'piloto-anotacao-texto', 'label' => 'Nova anotação',
                'required' => true, 'help' => 'Interna: o cliente não vê. Registrada com seu nome e a data.',
                'attrs' => ['rows' => 3, 'maxlength' => 200, 'data-msg-vazio' => 'Escreva a anotação.'],
            ]) ?>
            <div><?= component('button', ['label' => 'Adicionar anotação', 'icon' => 'plus', 'variant' => 'outline', 'type' => 'submit', 'attrs' => ['data-rotulo-carregando' => 'Salvando…']]) ?></div>
        </form>
    <?php } ?>
    <div data-os-parte="anotacoes"><?php $this->load->view('os/partes/anotacoes'); ?></div>
</section>
<section class="trifase-os-painel" aria-labelledby="piloto-historico-atendimento">
    <h2 id="piloto-historico-atendimento">Histórico do atendimento</h2>
    <p class="text-caption text-muted">Mudanças de status, com responsável e data.</p>
    <div class="mt-4" data-os-parte="historico"><?php $this->load->view('os/partes/historico'); ?></div>
</section>
