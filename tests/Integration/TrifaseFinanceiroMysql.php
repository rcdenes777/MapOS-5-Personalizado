<?php

define('ENVIRONMENT', 'testing');
require '/var/www/html/tests/bootstrap.php';
require APPPATH . 'models/Trifase_financeiro_model.php';
require APPPATH . 'models/Financeiro_model.php';
require APPPATH . 'models/Relatorios_model.php';
require APPPATH . 'database/migrations/20261031120000_trifase_financeiro_lab.php';
require BASEPATH . 'database/DB_forge.php';
require BASEPATH . 'database/drivers/mysqli/mysqli_forge.php';
$db = &DB(['hostname' => '127.0.0.1', 'username' => 'root', 'password' => getenv('MYSQL_ROOT_PASSWORD'), 'database' => getenv('MYSQL_DATABASE'), 'dbdriver' => 'mysqli', 'pconnect' => false, 'db_debug' => false, 'char_set' => 'utf8mb4', 'dbcollat' => 'utf8mb4_general_ci', 'stricton' => true, 'save_queries' => true]);
$db->query('SET FOREIGN_KEY_CHECKS=0');
$f = new Trifase_financeiro_model();
$f->db = $db;
$n = new Financeiro_model();
$n->db = $db;
if (($argv[1] ?? '') === 'race') {
    try {
        $f->receber(9, 20000, '2026-10-31', 'Pix', str_pad('race-' . $argv[2], 20, '_'), 7);
        echo 'recebido';
    } catch (DomainException $e) {
        echo 'negado';
    }
    exit;
}
$m = new class() extends Migration_trifase_financeiro_lab {
    public object $dbforge;
};
$m->db = $db;
$m->dbforge = new CI_DB_mysqli_forge($db);
$m->up();
$m->up();
$checks = [];
function checkLab(bool $ok, string $nome): void
{
    global $checks;
    if (! $ok) {
        throw new RuntimeException('FAIL: ' . $nome);
    }
    $checks[] = $nome;
    echo 'PASS ' . $nome . PHP_EOL;
}
function resumoLab(int $recebido, int $saldo, float $desconto = 0): void
{
    global $db, $f, $n;
    $r = $f->resumo(1);
    checkLab($r['recebido_c'] === $recebido && $r['saldo_c'] === $saldo, 'saldo Trifase ' . $recebido . '/' . $saldo);
    $totais = $n->totais([], '2026-11-20');
    checkLab(abs($totais['receitas_pagas'] - $recebido / 100) < 0.001 && abs($totais['receitas_pendentes'] - $saldo / 100) < 0.001, 'totais nativos sem duplicacao');
    checkLab(abs($n->visaoGeral()['descontos'] - $desconto) < 0.001, 'desconto nativo conciliado');
    checkLab($db->where('idOs', 1)->get('os')->row()->status === 'Em Andamento', 'andamento preservado');
}
foreach ([1, 2, 9] as $id) {
    if (! $db->insert('os', ['idOs' => $id, 'status' => 'Em Andamento', 'faturado' => 0, 'clientes_id' => 1, 'usuarios_id' => 7])) {
        throw new RuntimeException('Seed inválida.');
    }
}
$f->formalizar(1, 55001, 5001, '2026-11-15', 7);
resumoLab(0, 50000, 50.01);
$a = $f->receber(1, 20000, '2026-10-31', 'Pix', 'mysql-entrada-000001', 7);
resumoLab(20000, 30000, 50.01);
checkLab($a === $f->receber(1, 20000, '2026-10-31', 'Pix', 'mysql-entrada-000001', 7), 'repeticao idempotente');
$f->receber(1, 30000, '2026-11-02', 'Dinheiro', 'mysql-restante-00001', 7);
resumoLab(50000, 0, 50.01);
checkLab($n->contar(['status' => 'pendente'], '2026-11-20') === 0, 'nenhuma pendencia de zero reais');
$f->estornar(1, $a['evento_id'], 'Correcao ficticia', '2026-11-03', 'mysql-estorno-000001', 7);
resumoLab(30000, 20000, 50.01);
checkLab($db->count_all('trifase_financeiro_eventos') === 3, 'eventos originais preservados');
checkLab($n->contar([], '2026-11-20') === 2, 'linha estornada omitida na listagem');
try {
    $f->estornar(2, $a['evento_id'], 'Outra OS', '2026-11-03', 'mysql-outra-os-00001', 7);
    throw new RuntimeException('Aceitou outra OS');
} catch (DomainException $e) {
    checkLab(true, 'referencia de outra OS negada');
}
$db->query("CREATE TRIGGER falhar_evento BEFORE INSERT ON trifase_financeiro_eventos FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Falha simulada'");
try {
    $f->receber(1, 10000, '2026-11-04', 'Pix', 'mysql-falha-00000001', 7);
    throw new LogicException('Não simulou falha');
} catch (RuntimeException $e) {
    checkLab($db->count_all('lancamentos') === 3 && $db->count_all('trifase_financeiro_eventos') === 3, 'rollback InnoDB sem linha ou evento extra');
}
$db->query('DROP TRIGGER falhar_evento');
$f->formalizar(9, 30000, 0, '2026-11-15', 7);
$filhos = [];
foreach (['a', 'b'] as $nome) {
    $p = proc_open([PHP_BINARY, __FILE__, 'race', $nome], [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes);
    fclose($pipes[0]);
    $filhos[] = [$p, $pipes];
}
$resultados = [];
foreach ($filhos as [$p, $pipes]) {
    $resultados[] = trim(stream_get_contents($pipes[1]));
    $err = stream_get_contents($pipes[2]);
    fclose($pipes[1]);
    fclose($pipes[2]);
    checkLab(proc_close($p) === 0 && $err === '', 'processo concorrente concluido');
}
sort($resultados);
checkLab($resultados === ['negado', 'recebido'] && $f->resumo(9)['saldo_c'] === 10000, 'duas conexoes InnoDB nao excedem saldo');
file_put_contents('/lab/mysql_result.json', json_encode(['checks' => $checks, 'total' => count($checks), 'dados' => 'somente ficticios', 'engine' => 'MySQL 8.4 / InnoDB'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
