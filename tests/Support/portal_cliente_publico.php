<?php
// Synthetic lab only. Never print bearer credentials or passwords.
if (PHP_SAPI !== 'cli') {
    exit(1);
}
$_ENV = array_merge(getenv(), $_ENV);
if (($_ENV['DB_DATABASE'] ?? '') !== 'mapos5_portal_cliente_lab' || ($_ENV['DB_HOSTNAME'] ?? '') !== 'mapos5-portal-cliente-lab-db') {
    exit(2);
}
chdir('/var/www/html');
require_once 'application/vendor/autoload.php';
$argv = ['index.php', 'tools', 'message'];
$_SERVER['argv'] = $argv;
$_SERVER['argc'] = 3;
ob_start();
require 'index.php';
ob_end_clean();
$ci =& get_instance();
$base = json_decode(file_get_contents('/lab/fixture-ids.json'), true, flags: JSON_THROW_ON_ERROR);
$usuario = (int) $base['usuario'];
$ci->db->insert('permissoes', ['nome' => 'Portal laboratório somente leitura ' . bin2hex(random_bytes(3)), 'permissoes' => json_encode(['vCliente' => 1, 'vOs' => 1]), 'situacao' => 1, 'data' => date('Y-m-d')]);
$permissaoRestrita = (int) $ci->db->insert_id();
$operador = $ci->db->where('idUsuarios', $usuario)->get('usuarios')->row_array();
unset($operador['idUsuarios']);
$senhaRestrita = bin2hex(random_bytes(12));
$operador['email'] = 'restrito-' . bin2hex(random_bytes(6)) . '@example.invalid';
$operador['senha'] = password_hash($senhaRestrita, PASSWORD_DEFAULT);
$operador['nome'] = 'Operador Restrito Sintetico';
$operador['permissoes_id'] = $permissaoRestrita;
$ci->db->insert('usuarios', $operador);
$senhaCliente = bin2hex(random_bytes(12));
$emailCliente = 'portal-' . bin2hex(random_bytes(6)) . '@example.invalid';
$ci->db->insert('clientes', ['nomeCliente' => 'Cliente Alfa Sintetico', 'documento' => '', 'telefone' => '0000000000', 'email' => $emailCliente, 'senha' => password_hash($senhaCliente, PASSWORD_DEFAULT), 'dataCadastro' => date('Y-m-d'), 'fornecedor' => 0]);
$clienteA = (int) $ci->db->insert_id();
$ci->db->insert('clientes', ['nomeCliente' => 'Cliente Beta Sintetico', 'documento' => '', 'telefone' => '0000000000', 'email' => 'beta-' . bin2hex(random_bytes(5)) . '@example.invalid', 'dataCadastro' => date('Y-m-d'), 'fornecedor' => 0]);
$clienteB = (int) $ci->db->insert_id();
$osA = [];
for ($i = 1; $i <= 12; $i++) {
    $ci->db->insert('os', ['dataInicial' => date('Y-m-d'), 'descricaoProduto' => 'Equipamento Alfa ' . $i, 'defeito' => 'Teste', 'status' => 'Finalizado', 'observacoes' => 'PRIVADO-ALFA', 'clientes_id' => $clienteA, 'usuarios_id' => $usuario, 'faturado' => 0, 'valorTotal' => '0.00']);
    $osA[] = (int) $ci->db->insert_id();
}
$ci->db->insert('os', ['dataInicial' => date('Y-m-d'), 'descricaoProduto' => 'Equipamento Beta Sintetico', 'defeito' => 'Teste', 'status' => 'Finalizado', 'observacoes' => 'PRIVADO-BETA', 'clientes_id' => $clienteB, 'usuarios_id' => $usuario, 'faturado' => 0, 'valorTotal' => '0.00']);
$osB = (int) $ci->db->insert_id();
$ci->load->model('Trifase_financeiro_model', 'financeiro_lab_portal');
foreach ([[$osA[0], 10000, 0], [$osA[1], 20000, 5000], [$osA[11], 30000, 30000]] as [$os, $total, $pago]) {
    $ci->financeiro_lab_portal->formalizar($os, $total, 0, date('Y-m-d'), $usuario);
    if ($pago > 0) {
        $ci->financeiro_lab_portal->receber($os, $pago, date('Y-m-d'), 'Pix', bin2hex(random_bytes(16)), $usuario);
    }
}
$ci->load->model('Trifase_entrega_model', 'entrega_lab_portal');
$entrega = ['recebedor' => 'Pessoa sintética', 'itens' => 'Equipamento', 'observacoes' => '', 'terceiro' => '0', 'confirmou_condicoes' => '1', 'entregue_em' => date('Y-m-d')];
$ci->entrega_lab_portal->registrar($osA[1], $entrega, $usuario, bin2hex(random_bytes(16)));
$cancelada = $ci->entrega_lab_portal->registrar($osA[2], $entrega, $usuario, bin2hex(random_bytes(16)));
$ci->entrega_lab_portal->cancelar($osA[2], $cancelada, 'Correção sintética', $usuario, bin2hex(random_bytes(16)));
$pasta = 'anexos/portal-' . bin2hex(random_bytes(6));
mkdir('/lab/storage/' . $pasta, 0700, true);
$anexos = [];
foreach (['publico', 'privado', 'outro'] as $tipo) {
    $nome = $tipo . '.txt';
    file_put_contents('/lab/storage/' . $pasta . '/' . $nome, 'Conteúdo sintético ' . $tipo);
    $ci->db->insert('anexos', ['anexo' => $nome, 'path' => $pasta, 'os_id' => $tipo === 'outro' ? $osB : $osA[0]]);
    $anexos[$tipo] = (int) $ci->db->insert_id();
}
$ci->db->insert('trifase_publico_anexos', ['os_id' => $osA[0], 'anexo_id' => $anexos['publico']]);
$ci->db->insert('trifase_publico_anexos', ['os_id' => $osB, 'anexo_id' => $anexos['outro']]);
$ci->load->model('Trifase_publico_model', 'os_publica_lab');
$tokenOs = $ci->os_publica_lab->gerar($osA[0], $usuario);
$ci->load->model('Trifase_cliente_publico_model', 'portal_cliente_lab');
$a = $ci->portal_cliente_lab->gerar($clienteA, $usuario);
$b = $ci->portal_cliente_lab->gerar($clienteB, $usuario);
file_put_contents('/lab/portal-cliente-private.json', json_encode(['a' => $a, 'b' => $b, 'tokenOs' => $tokenOs, 'clienteA' => $clienteA, 'osA' => $osA[0], 'ordensA' => $osA, 'osB' => $osB, 'anexos' => $anexos, 'emailCliente' => $emailCliente, 'senhaCliente' => $senhaCliente, 'restrito' => ['email' => $operador['email'], 'senha' => $senhaRestrita]], JSON_THROW_ON_ERROR));
chmod('/lab/portal-cliente-private.json', 0600);
echo "Fixture sintética do portal preparada.\n";
