<?php
if (PHP_SAPI!=='cli') {
    exit(1);
}$_ENV=array_merge(getenv(), $_ENV);
if (($_ENV['DB_DATABASE']??'')!=='mapos5_orcamento_lab'||($_ENV['DB_HOSTNAME']??'')!=='mapos5-orcamento-lab-db') {
    exit(2);
}
$mode=getenv('F002_MODE')?:'create';
chdir('/var/www/html');
require_once 'application/vendor/autoload.php';
$argv=['index.php','tools','message'];
$_SERVER['argv']=$argv;
$_SERVER['argc']=3;
ob_start();
require 'index.php';
ob_end_clean();
$ci=&get_instance();
function snapshot($ci, $id)
{
    return ['budget_versions'=>$ci->db->where('os_id', $id)->order_by('id')->get('trifase_orcamento_versoes')->result_array(),'budget_events'=>$ci->db->where('os_id', $id)->order_by('id')->get('trifase_orcamento_eventos')->result_array(),'budget_state'=>$ci->db->where('os_id', $id)->get('trifase_orcamento_estado')->result_array(),'link_digest'=>hash('sha256', json_encode($ci->db->where('os_id', $id)->get('trifase_publico_links')->result_array(), JSON_THROW_ON_ERROR)),'os'=>$ci->db->where('idOs', $id)->get('os')->row_array(),'delivery'=>$ci->db->where('os_id', $id)->get('trifase_entregas_eventos')->result_array(),'delivery_state'=>$ci->db->where('os_id', $id)->get('trifase_entregas_estado')->result_array(),'history'=>$ci->db->where('os_id', $id)->get('os_historico')->result_array(),'services'=>$ci->db->where('os_id', $id)->get('servicos_os')->result_array(),'products'=>$ci->db->where('os_id', $id)->get('produtos_os')->result_array(),'stock'=>$ci->db->select('idProdutos,estoque')->get('produtos')->result_array(),'financial'=>$ci->db->get('lancamentos')->result_array()];
}
$seed=json_decode(file_get_contents('/lab/fixture-ids.json'), true, flags:JSON_THROW_ON_ERROR);
if (empty($seed['cliente'])||empty($seed['servico'])||empty($seed['usuario'])) {
    throw new RuntimeException('Create synthetic base fixture first.');
}
$state='/lab/orcamento-entrega-regularizacao-state.json';
if ($mode==='create') {
    $run=bin2hex(random_bytes(6));
    $roles=[];
    $normal=['vOs','vLancamento','eOs','publicarOrcamento','registrarEntrega','corrigirEntrega'];
    foreach (['normal'=>$normal,'regularizador'=>array_merge($normal, ['regularizarOrcamento']),'negado'=>['vOs']] as $role=>$permissions) {
        $ci->db->insert('permissoes', ['nome'=>'F002 '.$role.' '.$run,'permissoes'=>json_encode(array_fill_keys($permissions, 1)),'situacao'=>1,'data'=>date('Y-m-d')]);
        $p=$ci->db->insert_id();
        $u=$ci->db->where('idUsuarios', (int)$seed['usuario'])->get('usuarios')->row_array();
        unset($u['idUsuarios']);
        $password=bin2hex(random_bytes(24));
        $u['nome']='F002 '.$role.' PRIVADO';
        $u['email']='f002-'.$role.'-'.$run.'@example.invalid';
        $u['senha']=password_hash($password, PASSWORD_DEFAULT);
        $u['permissoes_id']=$p;
        $ci->db->insert('usuarios', $u);
        $roles[$role]=['id'=>$ci->db->insert_id(),'email'=>$u['email'],'password'=>$password];
    }
    $ci->db->insert('os', ['dataInicial'=>date('Y-m-d'),'descricaoProduto'=>'F002 Equipamento '.$run,'defeito'=>'Sintetico','status'=>'Orçamento','clientes_id'=>(int)$seed['cliente'],'usuarios_id'=>$roles['normal']['id'],'faturado'=>0,'valorTotal'=>'100.00']);
    $id=$ci->db->insert_id();
    $ci->db->insert('servicos_os', ['servico'=>'Diagnostico Sintetico LAB','quantidade'=>1,'preco'=>'100.00','os_id'=>$id,'servicos_id'=>(int)$seed['servico'],'subTotal'=>'100.00']);
    // A closed workflow status alone is not evidence of physical delivery.
    $finished=$ci->db->where('idOs', $id)->get('os')->row_array();
    unset($finished['idOs']);
    $finished['status']='Finalizado';
    $finished['descricaoProduto']='F002 Finalizado sem entrega '.$run;
    $ci->db->insert('os', $finished);
    $finishedId=$ci->db->insert_id();
    $ci->db->insert('servicos_os', ['servico'=>'Diagnostico Sintetico LAB','quantidade'=>1,'preco'=>'100.00','os_id'=>$finishedId,'servicos_id'=>(int)$seed['servico'],'subTotal'=>'100.00']);
    $ci->load->model('Trifase_orcamento_model', 'f002');
    $os=$ci->db->where('idOs', $id)->get('os')->row();
    $version=$ci->f002->publicar($id, $ci->f002->hash($ci->f002->retrato($os)), $roles['normal']['id'], bin2hex(random_bytes(16)));
    file_put_contents($state, json_encode(['os'=>$id,'finished'=>$finishedId,'version'=>$version,'roles'=>array_map(fn ($r) =>$r['id'], $roles),'baseline'=>snapshot($ci, $id)]));
    chmod($state, 0600);
    echo json_encode(['os'=>$id,'finished'=>$finishedId,'version'=>$version,'roles'=>$roles]);
} else {
    $f=json_decode(file_get_contents($state), true);
    $id=$f['os'];
    $result=['finished'=>snapshot($ci, $f['finished']),'os'=>$id,'version'=>$f['version'],'roles'=>$f['roles'],'current'=>snapshot($ci, $id),'baseline'=>$f['baseline'],'decisions'=>$ci->db->where('os_id', $id)->where_in('tipo', ['aprovar','recusar'])->get('trifase_orcamento_eventos')->result_array()];
    echo json_encode($result);
}
