<?php
$idOs = (int) $os->idOs;
$campoAnexo = ($prefixoAnexo ?? 'anexo') . '-arquivos';
?>
                <form method="post" action="<?= e(site_url('os/anexar')) ?>" enctype="multipart/form-data" novalidate
                      class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start" data-os-acao="anexo" data-os-limpar>
                    <input type="hidden" name="idOs" value="<?= e($idOs) ?>">
                    <div class="flex min-w-0 flex-1 flex-col gap-1.5">
                        <label for="<?= e($campoAnexo) ?>" class="text-label-md text-text">Arquivos <span class="text-danger-ink" aria-hidden="true">*</span></label>
                        <input type="file" id="<?= e($campoAnexo) ?>" name="userfile[]" multiple required
                               accept=".jpg,.jpeg,.png,.gif,.pdf,.cdr,.docx,.txt,.mp4,.webm"
                               aria-describedby="<?= e($campoAnexo) ?>-ajuda"
                               data-msg-vazio="Escolha ao menos um arquivo."
                               class="block w-full rounded-sm border border-input bg-field px-3 py-2 text-body-md text-text file:mr-3 file:rounded-sm file:border-0 file:bg-surface-subtle file:px-3 file:py-1 file:text-label-md file:text-text focus:outline-3 focus:outline-offset-0 focus:outline-ring">
                        <p id="<?= e($campoAnexo) ?>-ajuda" class="text-caption text-muted"><?= e('Imagens (JPG, PNG, GIF), vídeos (MP4, WebM), PDF, DOCX, CDR ou TXT. Até ' . (int) (armazenamentoLimiteKb() / 1024) . ' MB por arquivo. O envio inteiro deve caber no limite do servidor.') ?></p>
                    </div>
                    <div class="sm:pt-7">
                        <?= component('button', ['label' => 'Enviar', 'icon' => 'upload', 'variant' => 'outline', 'type' => 'submit', 'attrs' => ['data-rotulo-carregando' => 'Enviando…']]) ?>
                    </div>
                </form>
