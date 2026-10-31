<?php
require_once APPPATH . 'helpers/trifase_publico_helper.php';
if (trifasePublicoHabilitado()
    && $this->permission->checkPermission($this->session->userdata('permissao'), 'vOs')
    && $this->permission->checkPermission($this->session->userdata('permissao'), 'eOs')) { ?>
    <?= component('button', ['label' => 'Link público', 'variant' => 'outline', 'href' => site_url('trifase/gerenciar/' . (int) $trifaseOsId)]) ?>
<?php } ?>
