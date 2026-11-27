<?php
// Operator only. Run AFTER model process has ended, in a disposable isolated grader.
// Requires exact production-schema snapshot + synthetic fixtures freshly imported.
if (PHP_SAPI !== 'cli') { exit(2); }
$task = $argv[1] ?? '';
$root = realpath($argv[2] ?? '');
$schema = getenv('BENCH_DB_NAME') ?: '';
$host = getenv('BENCH_DB_HOST') ?: '';
$user = getenv('BENCH_DB_USER') ?: '';
if (!in_array($task, ['T01','T02','T03'], true) || !$root || !preg_match('/\Amapos_bench_[a-z0-9_]+\z/', $schema) || !$host || $host === 'localhost' || !preg_match('/\Abench_[a-z0-9_]+\z/', $user) || !getenv('BENCH_DB_PASSWORD')) {
    fwrite(STDERR, "Refuse unsafe or incomplete benchmark DB configuration.\n"); exit(2);
}
define('ENVIRONMENT','testing');
require $root.'/tests/bootstrap.php';
require_once APPPATH.'models/Trifase_estoque_model.php';
$db = &DB(['hostname'=>$host,'username'=>$user,'password'=>getenv('BENCH_DB_PASSWORD'),'database'=>$schema,'dbdriver'=>'mysqli','pconnect'=>false,'db_debug'=>false,'char_set'=>'utf8mb4','dbcollat'=>'utf8mb4_general_ci','stricton'=>true,'save_queries'=>true]);
function sql(string $q,array $args=[]){global $db;$r=$db->query($q,$args);if($r===false)throw new RuntimeException('SQL failure');return $r;}
function ok(bool $v):void {if(!$v)throw new RuntimeException('Behavior mismatch');}
$meta=sql('SELECT DATABASE() AS db, VERSION() AS version, @@foreign_key_checks AS fk')->row_array();
if($meta['db']!==$schema || !str_starts_with($meta['version'],'8.4.') || (int)$meta['fk']!==1){fwrite(STDERR,"Wrong DB or engine/FK state\n");exit(2);}
if((int)sql('SELECT COUNT(*) AS n FROM trifase_estoque_eventos')->row()->n!==1 || (int)sql('SELECT estoque FROM produtos WHERE idProdutos=1')->row()->estoque!==8 || (int)sql('SELECT COUNT(*) AS n FROM os')->row()->n!==2){fwrite(STDERR,"Fixture not pristine\n");exit(2);}
$s=new Trifase_estoque_model();$s->db=$db;
$checks=[];
function check(string $name,bool $critical,callable $fn):void {global $checks;try{$fn();$checks[]=['name'=>$name,'critical'=>$critical,'pass'=>true];}catch(Throwable $e){$checks[]=['name'=>$name,'critical'=>$critical,'pass'=>false,'error_class'=>get_class($e),'message'=>$e->getMessage()];}}
function snapshot():array{return [sql('SELECT * FROM produtos ORDER BY idProdutos')->result_array(),sql('SELECT * FROM trifase_estoque_eventos ORDER BY id')->result_array(),sql('SELECT * FROM produtos_os ORDER BY idProdutos_os')->result_array()];}
function event(int $os,int $line,string $type,int $qty,string $key):void {
    sql("INSERT INTO trifase_estoque_eventos(produto_id,tipo,origem,quantidade,saldo_antes,saldo_depois,data_movimento,motivo,usuario_id,criado_em,operacao,payload_hash,os_id,os_item_id) VALUES (1,?,'Benchmark',?,8,8,'2026-11-01','Synthetic probe',1,'2026-11-01 09:00:00',?,SHA2(?,256),?,?)",[$type,$qty,$key,$key,$os,$line]);
}
function triple(int $o,int $i,int $p=1):array{return ['os_id'=>$o,'os_item_id'=>$i,'produto_id'=>$p];}
if($task==='T01'||$task==='T02'){
    // Independent adversarial legacy/ledger rows; synthetic only; no FKs disabled.
    event(1,991,'os_saida',-7,'bench_other_line_991');
    event(2,1,'os_saida',-11,'bench_other_os_0001');
    event(1,1,'troca_saida',-13,'bench_unrelated_type');
    event(1,1,'os_conciliacao',1,'bench_reconcile_001');
    event(1,992,'os_devolucao',4,'bench_positive_net');
    $before=snapshot();
    if($task==='T01'){
        foreach([[1,1,1,1],[1,991,1,7],[2,1,1,11],[1,999,1,0],[1,992,1,0],[1,1,99,0]] as $i=>$case){
            check('exact-triple-'.$i,true,function()use($s,$case){ok($s->saldoBaixaDaLinha($case[0],$case[1],$case[2])===$case[3]);});
        }
    }else{
        check('empty-no-query',false,function()use($s,$db){$n=count($db->queries);ok($s->resumosBaixas([])===[] && count($db->queries)===$n);});
        check('ordered-duplicates-and-types',true,function()use($s){
            ok($s->resumosBaixas([triple(1,991),triple(1,1),triple(2,1),triple(1,1),triple(1,999),triple(1,992),triple(1,1,99)])===[7,1,11,1,0,0,0]);
        });
        check('max-batch-and-query-budget',true,function()use($s,$db){
            $input=[];$expected=[];for($i=0;$i<100;$i++){$input[]=($i%2===0)?triple(1,991):triple(1,1);$expected[]=($i%2===0)?7:1;}
            $n=count($db->queries);$r=$s->resumosBaixas($input);ok($r===$expected && count($db->queries)-$n<=3);
        });
        foreach([
            [1=>triple(1,1)], [triple(0,1)], [['os_id'=>'1','os_item_id'=>1,'produto_id'=>1]], [['os_id'=>true,'os_item_id'=>1,'produto_id'=>1]],
            [['os_id'=>1,'os_item_id'=>1.0,'produto_id'=>1]], [['os_id'=>1,'os_item_id'=>1]], [triple(1,1)+['extra'=>1]], array_fill(0,101,triple(1,1)), [triple(1,1),null]
        ] as $i=>$bad){
            check('reject-invalid-'.$i,true,function()use($s,$db,$bad){$n=count($db->queries);$rejected=false;try{$s->resumosBaixas($bad);}catch(DomainException $e){$rejected=true;}ok($rejected && count($db->queries)===$n);});
        }
        check('legacy-method-preserved',true,function()use($s){ok($s->saldoBaixaDaLinha(1,1,1)===1);});
    }
    check('read-only-state',true,function()use($before){ok(snapshot()===$before);});
}else{
    require_once APPPATH.'models/Trifase_entrega_model.php';
    require_once APPPATH.'models/Trifase_financeiro_model.php';
    $d=new Trifase_entrega_model();$d->db=$db;$f=new Trifase_financeiro_model();$f->db=$db;
    check('delivery-valid-document',true,function()use($d){$r=$d->comprovante(1,1);ok(is_array($r)&&(int)$r['evento']->id===1);});
    check('delivery-foreign-os',true,function()use($d){ok($d->comprovante(2,1)===null);});
    check('delivery-missing',true,function()use($d){ok($d->comprovante(1,999999)===null);});
    check('receipt-valid-document',true,function()use($f){$r=$f->recibo(1,1);ok(is_array($r)&&(int)$r['evento']->valor_c===32000);});
    check('receipt-foreign-os',true,function()use($f){ok($f->recibo(2,1)===null);});
    check('receipt-missing',true,function()use($f){ok($f->recibo(1,999999)===null);});
    $move=fn(string $key)=>$s->movimentar(1,'os_devolucao',1,null,'2026-11-01','Synthetic return','Benchmark',1,$key,null,['os_id'=>1,'os_item_id'=>1]);
    $first=null;
    check('full-proof-positive',true,function()use($move,&$first){$first=$move('bench_return_first_01');ok(is_int($first)&&(int)sql('SELECT estoque FROM produtos WHERE idProdutos=1')->row()->estoque===9);});
    $before=snapshot();
    check('same-operation-replay',true,function()use($move,$first,$before){ok(is_int($first)&&$move('bench_return_first_01')===$first&&snapshot()===$before);});
    check('partial-proof-no-return',true,function()use($move,$before){ok($move('bench_return_second_02')===null&&snapshot()===$before);});
}
$pass=count(array_filter($checks,fn($x)=>$x['pass']));
$critical=count(array_filter($checks,fn($x)=>$x['critical']&&!$x['pass']));
echo json_encode(['task'=>$task,'engine'=>$meta['version'],'cases'=>$checks,'pass'=>$pass,'total'=>count($checks),'critical_failures'=>$critical,'gate'=>$pass===count($checks)],JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE).PHP_EOL;
exit($pass===count($checks)?0:1);
