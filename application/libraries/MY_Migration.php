<?php

defined('BASEPATH') or exit('No direct script access allowed');

class MY_Migration extends CI_Migration
{
    public function version($target_version)
    {
        $atual = (string) $this->_get_version();
        if ($atual !== '0' && ! isset($this->find_migrations()[$atual])) {
            $this->_error_string = 'A versão de migração ' . $atual . ' não pertence a esta instalação. Verifique a origem do banco e faça o ensaio de migração em uma cópia.';

            return false;
        }

        return parent::version($target_version);
    }
}
