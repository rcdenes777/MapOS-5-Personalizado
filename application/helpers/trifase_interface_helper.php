<?php

defined('BASEPATH') or exit('No direct script access allowed');

/** Apresentação alternativa opt-in; nunca ativa módulos ou converte dados. */
function trifaseInterfacePiloto(): bool
{
    return filter_var($_ENV['TRIFASE_UI_PILOTO_ENABLED'] ?? false, FILTER_VALIDATE_BOOLEAN);
}
