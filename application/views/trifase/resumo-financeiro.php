<?php
/** Projeção financeira autorizada; nunca infere recebido ou saldo. */
$idOs = (int) $os->idOs;
$financeiroUrl = site_url('trifase_financeiro/visualizar/' . $idOs);
$permite = fn (string $p): bool => $this->permission->checkPermission($this->session->userdata('permissao'), $p);
?>
                    <h2 id="piloto-financeiro">Financeiro</h2>
                    <?php if ($pilotoFinanceiro !== null) { ?>
                        <?= component('pill-status', ['label' => $pilotoFinanceiro['situacao'], 'variant' => $pilotoFinanceiro['saldo_c'] === 0 ? 'success' : 'warning']) ?>
                        <dl class="trifase-os-financeiro">
                            <div><dt>Total acordado</dt><dd><?= e(dinheiro($pilotoFinanceiro['total_c'] / 100)) ?></dd></div>
                            <div><dt>Recebido</dt><dd><?= e(dinheiro($pilotoFinanceiro['recebido_c'] / 100)) ?></dd></div>
                            <div class="trifase-os-saldo"><dt>Saldo a receber</dt><dd><?= e(dinheiro($pilotoFinanceiro['saldo_c'] / 100)) ?></dd></div>
                        </dl>
                        <?= component('link', ['label' => 'Ver histórico financeiro', 'href' => $financeiroUrl]) ?>
                    <?php } else { ?>
                        <p class="text-muted">Valores dos itens desta OS</p>
                        <p class="trifase-os-total-nao-formalizado"><?= e(dinheiro($totais['total'])) ?></p>
                        <p class="text-muted"><?= e((int) $os->faturado === 1 ? 'Faturamento anterior: consulte o registro para conferir os pagamentos.' : ($totais['total'] <= 0 ? 'Sem valor a cobrar nos itens atuais. Nenhum recebimento ou saldo registrado.' : 'Cobrança ainda não formalizada. Recebimentos e saldo não foram registrados.')) ?></p>
                        <?php if (trifaseFinanceiroHabilitado()) { ?>
                            <?= component('button', ['label' => 'Consultar financeiro', 'variant' => 'outline', 'href' => $financeiroUrl]) ?>
                        <?php } ?>
                    <?php } ?>
