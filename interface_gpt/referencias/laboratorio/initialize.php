<?php
// Initialize only the dedicated synthetic schema imported from the published reference.
declare(strict_types=1);
if (getenv('DB_HOSTNAME') !== 'db' || getenv('DB_DATABASE') !== 'mapos_lab_synthetic' || getenv('DB_USERNAME') !== 'mapos_lab') {
    throw new RuntimeException('Refusing: unexpected laboratory database identity');
}
$pdo = new PDO('mysql:host=db;dbname=mapos_lab_synthetic;charset=utf8mb4', 'mapos_lab', getenv('DB_PASSWORD'), [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
if ($pdo->query('SELECT DATABASE()')->fetchColumn() !== 'mapos_lab_synthetic') throw new RuntimeException('Wrong database');
$users = json_decode(file_get_contents('/run/mapos-lab/users.json'), true, flags: JSON_THROW_ON_ERROR);
$baseline = file_get_contents('/var/www/html/banco.sql');
if (!preg_match("/\\(1, 'Administrador', '(a:53:\\{[^']+\\})'/", $baseline, $match)) throw new RuntimeException('Baseline permissions missing');
$admin = unserialize($match[1], ['allowed_classes' => false]);
if (!is_array($admin)) throw new RuntimeException('Invalid baseline permissions');
foreach (['vCustoInterno','eCustoInterno','retificarFinanceiroCancelado','publicarOrcamento','regularizarOrcamento','trocarGarantia','reembolsarGarantia','registrarEntrega','corrigirEntrega','estornarRecebimento'] as $key) $admin[$key] = 1;
$roles = [
    'admin' => [1, 'Administrador laboratório', $admin],
    'tecnico' => [2, 'Técnico laboratório', array_fill_keys(['vOs','aOs','eOs','vCliente','vProduto','vServico','vGarantia'], 1)],
    'atendente' => [3, 'Atendente laboratório', array_fill_keys(['vOs','aOs','eOs','vCliente','aCliente','eCliente','vProduto','vServico','registrarEntrega'], 1)],
    'financeiro' => [4, 'Financeiro laboratório', array_fill_keys(['vOs','vCliente','vLancamento','aLancamento','eLancamento','rFinanceiro'], 1)],
];
$pdo->beginTransaction();
try {
    if ((int)$pdo->query('SELECT COUNT(*) FROM migrations')->fetchColumn() !== 0) throw new RuntimeException('Migration state is not empty; refusing to reseed');
    $pdo->exec('INSERT INTO migrations (version) VALUES (20261124010000)');
    $roleStmt = $pdo->prepare('INSERT INTO permissoes (idPermissao,nome,permissoes,situacao,data,exigir_2fa) VALUES (?,?,?,1,CURRENT_DATE,0) ON DUPLICATE KEY UPDATE nome=VALUES(nome),permissoes=VALUES(permissoes),situacao=1,exigir_2fa=0');
    $userStmt = $pdo->prepare("INSERT INTO usuarios (idUsuarios,nome,cpf,cep,email,senha,telefone,situacao,dataCadastro,permissoes_id) VALUES (?,?,?,?,?,?,?,1,CURRENT_DATE,?) ON DUPLICATE KEY UPDATE nome=VALUES(nome),email=VALUES(email),senha=VALUES(senha),situacao=1,permissoes_id=VALUES(permissoes_id)");
    foreach ($roles as $role => [$id,$name,$permissions]) {
        $roleStmt->execute([$id,$name,json_encode($permissions, JSON_THROW_ON_ERROR)]);
        $userStmt->execute([$id,$name,'FICTICIO-'.str_pad((string)$id,4,'0',STR_PAD_LEFT),'00000-000',$users[$role]['email'],password_hash($users[$role]['password'], PASSWORD_DEFAULT),'0000000000',$id]);
    }
    $setting = $pdo->prepare('INSERT INTO configuracoes (idConfig,config,valor) VALUES (?,?,?) ON DUPLICATE KEY UPDATE config=VALUES(config),valor=VALUES(valor)');
    foreach ([[2,'app_name','MapOS Laboratório'],[3,'app_theme','white'],[4,'per_page','10'],[5,'os_notification','cliente'],[6,'control_estoque','1'],[8,'control_baixa','0'],[9,'control_editos','1'],[10,'control_datatable','1'],[11,'pix_key',''],[12,'os_status_list','["Aberto","Faturado","Negociação","Em Andamento","Orçamento","Finalizado","Cancelado","Aguardando Peças","Aprovado"]'],[13,'control_edit_vendas','1'],[14,'email_automatico','0'],[15,'control_2vias','0']] as $row) $setting->execute($row);
    $pdo->commit();
    echo "Synthetic migration state and four local roles initialized.\n";
} catch (Throwable $e) { if ($pdo->inTransaction()) $pdo->rollBack(); throw $e; }
