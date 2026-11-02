    <form method="post" action="<?= e(site_url('trifase_financeiro/tecnico/' . (int) $osTecnica->idOs)) ?>" class="grid gap-4 rounded-card border border-border bg-surface p-4" novalidate <?= ($tecnicoIntegrado ?? false) ? 'data-os-acao="tecnico"' : js_module('formulario/padrao') ?>>
        <input type="hidden" name="<?= e($this->security->get_csrf_token_name()) ?>" value="<?= e($this->security->get_csrf_hash()) ?>">
        <?php foreach (['descricaoProduto' => 'Equipamento e serviço', 'defeito' => 'Defeito informado', 'observacoes' => 'Observações internas', 'laudoTecnico' => 'Laudo técnico'] as $campo => $rotulo) { ?>
            <?= component('textarea', ['name' => $campo, 'id' => ($tecnicoIntegrado ?? false) ? 'piloto-tecnico-' . $campo : 'tecnico-' . $campo, 'label' => $rotulo, 'value' => osTextoWhatsApp('{TEXTO}', ['{TEXTO}' => $osTecnica->$campo ?? '']), 'attrs' => ['maxlength' => 20000, 'rows' => 4]]) ?>
        <?php } ?>
        <?= component('input', ['name' => 'dataFinal', 'id' => ($tecnicoIntegrado ?? false) ? 'piloto-tecnico-dataFinal' : 'tecnico-dataFinal', 'label' => 'Previsão de entrega', 'type' => 'date', 'value' => $osTecnica->dataFinal, 'required' => true, 'attrs' => ['readonly' => $metaTecnica->origem === 'legado_nao_conciliado'], 'help' => 'Alterar a previsão não muda a data de início da garantia.']) ?>
        <div><?= component('button', ['label' => 'Salvar dados técnicos', 'type' => 'submit']) ?></div>
    </form>
