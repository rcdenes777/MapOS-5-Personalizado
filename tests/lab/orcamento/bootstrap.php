<?php
// CLI-only lab bootstrap; all writes constrained by container env/database guard.
if (PHP_SAPI !== 'cli') {
    exit(1);
}
$_ENV = array_merge(getenv(), $_ENV);
if (($_ENV['DB_DATABASE'] ?? '') !== 'mapos5_orcamento_lab' || ($_ENV['DB_HOSTNAME'] ?? '') !== 'mapos5-orcamento-lab-db') {
    exit(2);
}
$mode = $argv[1] ?? 'inspect';
if (! in_array($mode, ['schema', 'migrate', 'fixture', 'inspect'], true)) {
    throw new RuntimeException('Unsupported lab operation.');
}
chdir('/var/www/html');
require_once 'application/vendor/autoload.php';
if ($mode === 'schema') {
    $db = new mysqli($_ENV['DB_HOSTNAME'], $_ENV['DB_USERNAME'], $_ENV['DB_PASSWORD'], $_ENV['DB_DATABASE']);
    if ($db->query('SHOW TABLES')->num_rows !== 0) {
        throw new RuntimeException('Database not empty; refusing import');
    }
    $sql = file_get_contents('banco.sql');
    // Preserve versioned installation SQL except defer installation user until fixture.
    $sql = preg_replace('/INSERT IGNORE INTO `usuarios`.*?;/s', '', $sql);
    $sql = str_replace('admin_created_at', date('Y-m-d H:i:s'), $sql);
    $db->multi_query($sql);
    do {
    } while ($db->more_results() && $db->next_result());
    echo "Versioned schema imported; usuarios/clientes/os still empty.\n";
    exit;
}
// Use documented Tools command for migration and ordinary CI bootstrap for fixtures.
$argv = ['index.php', 'tools', $mode === 'migrate' ? 'migrate' : 'message'];
$_SERVER['argv'] = $argv;
$_SERVER['argc'] = count($argv);
ob_start();
require '/var/www/html/index.php';
$bootstrapOutput = ob_get_clean();
if ($mode === 'migrate') {
    echo $bootstrapOutput;
    exit;
}
$ci =& get_instance();
if ($mode === 'fixture') {
    foreach (['usuarios','clientes','os','servicos'] as $table) {
        if ($ci->db->count_all($table) !== 0) {
            throw new RuntimeException('Fixture requires empty business tables');
        }
    }
    $credentials = json_decode(file_get_contents('/lab/credentials.json'), true, flags: JSON_THROW_ON_ERROR);
    // Exact documented installer password_hash + SQL user insertion path; no seed default password.
    require_once '/var/www/html/install/instalador.php';
    $sql = instaladorMontarSql(file_get_contents('/var/www/html/banco.sql'), ['full_name'=>'Administrador Sintetico LAB','email'=>$credentials['email'],'password'=>$credentials['password']], date('Y-m-d H:i:s'), fn ($s) =>$ci->db->escape_str($s));
    preg_match('/INSERT IGNORE INTO `usuarios`.*?;/s', $sql, $match);
    $ci->db->query($match[0]);
    $ci->db->where('idUsuarios', 1)->update('usuarios', ['cpf'=>'000.000.000-00','rg'=>'LAB-SINTETICO','cep'=>'00000-000','rua'=>'Rua Sintetica','numero'=>'0','bairro'=>'Laboratorio','cidade'=>'Cidade Sintetica','estado'=>'SP','telefone'=>'0000000000']);
    $ci->db->insert('clientes', ['nomeCliente'=>'Cliente Sintetico Orcamento LAB','documento'=>'000.000.000-00','telefone'=>'0000000000','email'=>'cliente.orcamento@example.invalid','dataCadastro'=>date('Y-m-d'),'fornecedor'=>0]);
    $cliente=$ci->db->insert_id();
    $ci->db->insert('servicos', ['nome'=>'Diagnostico Sintetico LAB','descricao'=>'Somente teste isolado','preco'=>'100.00']);
    $servico=$ci->db->insert_id();
    $ci->db->insert('os', ['dataInicial'=>date('Y-m-d'),'descricaoProduto'=>'Equipamento Sintetico LAB','defeito'=>'Defeito simulado','status'=>'Orçamento','observacoes'=>'Dados exclusivamente sinteticos; nao cobrar ou entregar','clientes_id'=>$cliente,'usuarios_id'=>1,'faturado'=>0,'valorTotal'=>'100.00']);
    $os=$ci->db->insert_id();
    $ci->db->insert('servicos_os', ['servico'=>'Diagnostico Sintetico LAB','quantidade'=>1,'preco'=>'100.00','os_id'=>$os,'servicos_id'=>$servico,'subTotal'=>'100.00']);
    $ci->db->where('config', 'email_automatico')->update('configuracoes', ['valor'=>'0']);
    file_put_contents('/lab/fixture-ids.json', json_encode(['usuario'=>1,'cliente'=>$cliente,'os'=>$os,'servico'=>$servico], JSON_PRETTY_PRINT));
    echo "Synthetic installer user and client/OS/service fixtures created.\n";
}
$counts=[];
foreach (['usuarios','clientes','os','servicos','lancamentos','email_queue'] as $table) {
    $counts[$table]=$ci->db->count_all($table);
}
echo json_encode(['mysql'=>$ci->db->query('SELECT VERSION() v')->row()->v,'migration'=>$ci->db->get('migrations')->row()->version,'counts'=>$counts], JSON_PRETTY_PRINT)."\n";
