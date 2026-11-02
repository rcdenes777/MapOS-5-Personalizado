<input type="hidden" name="<?= e($this->security->get_csrf_token_name()) ?>" value="<?= e($this->security->get_csrf_hash()) ?>">
<input type="hidden" name="operacao" value="<?= e(bin2hex(random_bytes(16))) ?>">
<input type="hidden" name="avaliacao" value="<?= e((int) ($avaliacaoRetorno->id ?? 0)) ?>">
