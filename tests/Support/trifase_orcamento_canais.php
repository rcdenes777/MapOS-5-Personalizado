<?php
if (PHP_SAPI!=='cli') {
    exit(1);
}
$_ENV=array_merge(getenv(), $_ENV);
if (($_ENV['DB_DATABASE']??'')!=='mapos5_orcamento_lab'||($_ENV['DB_HOSTNAME']??'')!=='mapos5-orcamento-lab-db') {
    exit(2);
}
chdir('/var/www/html');
require_once 'application/vendor/autoload.php';
$argv=['index.php','tools','message'];
$_SERVER['argv']=$argv;
$_SERVER['argc']=3;
ob_start();
require 'index.php';
ob_end_clean();
$ci=&get_instance();
$seed = json_decode(file_get_contents('/lab/fixture-ids.json'), true, flags: JSON_THROW_ON_ERROR);
if (empty($seed['cliente']) || empty($seed['servico']) || empty($seed['usuario'])) {
    throw new RuntimeException('Create the synthetic base fixture first.');
}
$mode=getenv('CANAIS_MODE')?:'create';
if ($mode==='create') {
    $ci->db->insert('os', ['dataInicial'=>date('Y-m-d'),'descricaoProduto'=>'F001 Canais LAB','defeito'=>'Sintetico','status'=>'Orçamento','clientes_id'=>(int) $seed['cliente'],'usuarios_id'=>(int) $seed['usuario'],'faturado'=>0,'valorTotal'=>'100.00']);
    $os=$ci->db->insert_id();
    $ci->db->insert('servicos_os', ['servico'=>'Diagnostico Sintetico LAB','quantidade'=>1,'preco'=>'100.00','os_id'=>$os,'servicos_id'=>(int) $seed['servico'],'subTotal'=>'100.00']);
    $ci->db->insert('permissoes', ['nome'=>'F001 sem publicar','permissoes'=>json_encode(['vOs'=>1,'vLancamento'=>1]),'situacao'=>1,'data'=>date('Y-m-d')]);
    $perm=$ci->db->insert_id();
    $u=$ci->db->where('idUsuarios', (int) $seed['usuario'])->get('usuarios')->row_array();
    unset($u['idUsuarios']);
    $pass=bin2hex(random_bytes(20));
    $u['email']='f001-'.bin2hex(random_bytes(5)).'@example.invalid';
    $u['senha']=password_hash($pass, PASSWORD_DEFAULT);
    $u['permissoes_id']=$perm;
    $u['nome']='F001 Operador Restrito';
    $ci->db->insert('usuarios', $u);
    $restricted=['email'=>$u['email'],'password'=>$pass];
    $ci->db->insert('permissoes', ['nome'=>'F001 Operador Dedicado','permissoes'=>json_encode(array_fill_keys(['vOs','vLancamento','eOs','publicarOrcamento','registrarEntrega','corrigirEntrega','vCliente','vServico','vProduto','vGarantia','vArquivo'], 1)),'situacao'=>1,'data'=>date('Y-m-d')]);
    $u['permissoes_id']=$ci->db->insert_id();
    $pass=bin2hex(random_bytes(20));
    $u['email']='f001-operador-'.bin2hex(random_bytes(5)).'@example.invalid';
    $u['senha']=password_hash($pass, PASSWORD_DEFAULT);
    $u['nome']='F001 Operador Dedicado';
    $ci->db->insert('usuarios', $u);
    $operator=$ci->db->insert_id();
    file_put_contents('/lab/orcamento-canais-private.json', json_encode(['os'=>$os,'email'=>$u['email'],'password'=>$pass,'operator'=>$operator,'restricted'=>$restricted]));
    chmod('/lab/orcamento-canais-private.json', 0600);
    echo json_encode(['os'=>$os]);
} elseif ($mode==='diagnostic') {
    $f=json_decode(file_get_contents('/lab/orcamento-canais-private.json'), true);
    $ci->load->helper('manutencao');
    $u=$ci->db->select('idUsuarios,permissoes_id')->where('idUsuarios', $f['operator'])->get('usuarios')->row_array();
    $p=$ci->db->where('idPermissao', $u['permissoes_id'])->get('permissoes')->row_array();
    echo json_encode(['operator'=>$u,'permissions'=>json_decode($p['permissoes'], true),'pending'=>migracoesPendentes($ci->db),'db_migration'=>$ci->db->get('migrations')->row()->version], JSON_PRETTY_PRINT);
} else {
    $id=json_decode(file_get_contents('/lab/orcamento-canais-private.json'), true)['os'];
    $rows=$ci->db->select('tipo,usuario_id,canal,comunicado_em,criado_em,observacao')->where('os_id', $id)->where_in('tipo', ['aprovar','recusar'])->get('trifase_orcamento_eventos')->result_array();
    echo json_encode(['os'=>$id,'decisions'=>$rows,'count'=>count($rows)], JSON_PRETTY_PRINT);
}
