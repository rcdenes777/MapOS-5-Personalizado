<?php
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
if (getenv('MYSQL_DATABASE') !== 'orcamento_test') {
    fwrite(STDERR, "This harness requires its disposable orcamento_test database.\n");
    exit(2);
}
/** Real models + real MySQL; invoked by scripts/test-orcamento-mysql.py. */
define('ENVIRONMENT', 'testing');
require dirname(__DIR__) . '/bootstrap.php';
require APPPATH . 'models/Trifase_orcamento_model.php';
require APPPATH . 'models/Trifase_entrega_model.php';
require BASEPATH . 'database/DB_forge.php';
require BASEPATH . 'database/drivers/mysqli/mysqli_forge.php';
$db = &DB(['hostname' => '127.0.0.1', 'username' => 'root', 'password' => getenv('MYSQL_ROOT_PASSWORD'), 'database' => getenv('MYSQL_DATABASE'), 'dbdriver' => 'mysqli', 'pconnect' => false, 'db_debug' => false, 'char_set' => 'utf8mb4', 'dbcollat' => 'utf8mb4_general_ci', 'stricton' => true]);
$db->query('SET SESSION innodb_lock_wait_timeout=12');
$o = new Trifase_orcamento_model();
$o->db = $db;
$e = new Trifase_entrega_model();
$e->db = $db;
function sql(string $query, array $params = [])
{
    global $db;
    $r = $db->query($query, $params);
    if ($r === false) {
        throw new RuntimeException('SQL failure: ' . $db->error()['code']);
    } return $r;
}
function scalar(string $query, array $params = [])
{
    return array_values(sql($query, $params)->row_array())[0];
}
function insist(bool $ok, string $message): void
{
    if (!$ok) {
        throw new RuntimeException($message);
    }
}
function keyFor(string $name): string
{
    return 'mysql_' . str_pad($name, 20, '_');
}
function act(array $a): ?int
{
    global $o, $e;
    [$action, $id, $version, $key] = $a;
    $communication = ['canal' => 'telefone', 'comunicado_em' => date('Y-m-d\TH:i'), 'observacao' => 'Sintetico', 'justificativa' => 'Registro tardio sintetico'];
    if ($action === 'publish') {
        // Carry the preview hash into the worker; do not refresh it after waiting.
        return $o->publicar($id, $version, 7, $key, $a[4] ?? []);
    } elseif ($action === 'delivery') {
        $e->registrar($id, ['recebedor' => 'Cliente Teste', 'itens' => 'Equipamento', 'terceiro' => '0', 'confirmou_condicoes' => '1', 'entregue_em' => date('Y-m-d\TH:i')], 7, $key);
    } elseif ($action === 'correction') {
        $e->cancelar($id, $version, 'Correcao sintetica', 7, $key);
    } elseif (in_array($action, ['public', 'public_aprovar', 'public_recusar'], true)) {
        $o->responder($id, str_repeat('a', 64), $version, $action === 'public_recusar' ? 'recusar' : 'aprovar', 'Cliente Teste', '1', $key);
    } else {
        $method = $action === 'regularize' ? 'registrarRegularizacao' : 'registrarRespostaInterna';
        $o->$method($id, $version, $action === 'recusar' ? 'recusar' : 'aprovar', 'Cliente Teste', '1', $key, 7, $communication);
    }
    return null;
}
if (($argv[1] ?? '') === 'worker') {
    $a = json_decode($argv[2], true, 512, JSON_THROW_ON_ERROR);
    echo json_encode(['connection' => (int) scalar('SELECT CONNECTION_ID()')]) . "\n";
    flush();
    $outer = null;
    try {
        if (($argv[3] ?? '') === 'hold') {
            $outer = new Trifase_os_lock($db, $a[1]);
            echo "{\"locked\":true}\n";
            flush();
            insist(trim(fgets(STDIN)) === 'go', 'Barrier closed');
        }
        act($a);
        if ($outer) {
            $outer->finalizar(true);
        }
        echo "{\"result\":\"ok\"}\n";
    } catch (DomainException $x) {
        if ($outer) {
            $outer->finalizar(false);
        }
        echo json_encode(['result' => 'denied', 'class' => get_class($x)]) . "\n";
    } catch (Throwable $x) {
        if ($outer) {
            $outer->finalizar(false);
        }
        echo json_encode(['result' => 'error', 'class' => get_class($x), 'message' => $x->getMessage()]) . "\n";
        exit(2);
    }
    exit;
}
$passed = [];
$failed = [];
$skipped = [];
$workers = [];
function testCase(string $name, callable $fn): void
{
    global $passed, $failed;
    try {
        $fn();
        $passed[] = $name;
        echo json_encode(['case' => $name, 'result' => 'PASS']) . "\n";
    } catch (Throwable $x) {
        $failed[] = ['case' => $name, 'message' => $x->getMessage()];
        echo json_encode(['case' => $name, 'result' => 'FAIL', 'message' => $x->getMessage()]) . "\n";
    }
}
function migrate(string $stamp, string $name): void
{
    global $db;
    require_once APPPATH . 'database/migrations/' . $stamp . '_' . $name . '.php';
    $m = match ($name) {
        'trifase_entregas' => new class() extends Migration_trifase_entregas {
            public object $dbforge;
        },
        'trifase_orcamentos' => new class() extends Migration_trifase_orcamentos {
            public object $dbforge;
        },
        'trifase_orcamento_comunicacao' => new class() extends Migration_trifase_orcamento_comunicacao {
            public object $dbforge;
        },
        'trifase_orcamento_regularizacao' => new class() extends Migration_trifase_orcamento_regularizacao {
            public object $dbforge;
        },
        default => throw new LogicException('Unknown test migration.'),
    };
    $m->db = $db;
    $m->dbforge = new CI_DB_mysqli_forge($db);
    $m->up();
}
function seed(): array
{
    global $db, $o;
    static $next = 0;
    $id = ++$next;
    sql("INSERT INTO os(idOs,status,clientes_id,usuarios_id,dataInicial,descricaoProduto) VALUES (?, 'Orçamento',1,7,'2020-01-01','Sintetico')", [$id]);
    sql('INSERT INTO produtos_os(os_id,produtos_id,quantidade,subTotal,preco) VALUES (?,1,1,100,100)', [$id]);
    $os = sql('SELECT * FROM os WHERE idOs=?', [$id])->row();
    $v = $o->publicar($id, $o->hash($o->retrato($os)), 7, keyFor('publish_' . $id));
    sql('INSERT INTO trifase_publico_links(os_id,token_hash,expira_em) VALUES (?,?,?)', [$id, hash('sha256', str_repeat('a', 64)), time()+3600]);
    return [$id, $v];
}
function snapshot(int $id): array
{
    return [sql('SELECT * FROM os WHERE idOs=?', [$id])->row_array(), sql('SELECT * FROM os_historico WHERE os_id=? ORDER BY id', [$id])->result_array(), sql('SELECT * FROM trifase_orcamento_eventos WHERE os_id=? ORDER BY id', [$id])->result_array()];
}
/** Includes immutable versions and both projections, not just OS status/events. */
function publicationSnapshot(int $id): array
{
    $result = [snapshot($id)];
    foreach (['trifase_orcamento_versoes', 'trifase_orcamento_estado', 'trifase_entregas_eventos', 'trifase_entregas_estado'] as $table) {
        $order = str_ends_with($table, '_estado') ? 'os_id' : 'id';
        $result[] = sql("SELECT * FROM $table WHERE os_id=? ORDER BY $order", [$id])->result_array();
    }
    return $result;
}
function invariants(int $id): void
{
    insist((int) scalar('SELECT COUNT(*) FROM (SELECT decisao_versao FROM trifase_orcamento_eventos WHERE os_id=? AND decisao_versao IS NOT NULL GROUP BY decisao_versao HAVING COUNT(*)>1) d', [$id]) === 0, 'Duplicate decision');
    foreach (['trifase_orcamento_eventos','trifase_entregas_eventos'] as $table) {
        insist((int) scalar("SELECT COUNT(*) FROM (SELECT operacao FROM $table WHERE os_id=? GROUP BY operacao HAVING COUNT(*)>1) d", [$id]) === 0, 'Duplicate operation');
    }
    insist((int) scalar("SELECT COUNT(*) FROM trifase_entregas_estado s LEFT JOIN trifase_entregas_eventos e ON e.id=s.evento_id AND e.os_id=s.os_id WHERE s.os_id=? AND (e.id IS NULL OR e.tipo<>'registrar')", [$id]) === 0, 'Invalid delivery state');
}
function lineFrom($pipe): array
{
    $read = [$pipe];
    $write = $except = [];
    insist(stream_select($read, $write, $except, 15) === 1, 'Worker output timeout');
    $line = fgets($pipe);
    insist($line !== false, 'Worker exited without JSON');
    return json_decode($line, true, 512, JSON_THROW_ON_ERROR);
}
function worker(array $a, bool $hold): array
{
    global $workers;
    $p = proc_open([PHP_BINARY, __FILE__, 'worker', json_encode($a), $hold ? 'hold' : 'run'], [0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']], $pipes);
    insist(is_resource($p), 'Cannot launch worker');
    $workers[] = $p;
    $connection = lineFrom($pipes[1])['connection'];
    if ($hold) {
        insist(lineFrom($pipes[1])['locked'] === true, 'First lock missing');
    }
    return [$p, $pipes, $connection];
}
function finish(array $w): string
{
    [$p,$pipes] = $w;
    $result = lineFrom($pipes[1]);
    fclose($pipes[0]);
    fclose($pipes[1]);
    $err = stream_get_contents($pipes[2]);
    fclose($pipes[2]);
    $code = proc_close($p);
    insist($code === 0 && $err === '' && ($result['result'] ?? '') !== 'error', 'Worker failure: ' . json_encode([$code,$result,$err]));
    return $result['result'];
}
function awaitBlocked(int $waiting, int $holding): void
{
    $deadline = microtime(true) + 8;
    $blocked = false;
    do {
        $blocked = (int) scalar('SELECT COUNT(*) FROM performance_schema.data_lock_waits w JOIN performance_schema.threads t ON t.THREAD_ID=w.REQUESTING_THREAD_ID JOIN performance_schema.threads h ON h.THREAD_ID=w.BLOCKING_THREAD_ID WHERE t.PROCESSLIST_ID=? AND h.PROCESSLIST_ID=?', [$waiting,$holding]) > 0;
        if (!$blocked) {
            usleep(10000);
        } // Poll server-observed lock waits, never infer ordering from sleep.
    } while (!$blocked && microtime(true)<$deadline);
    insist($blocked, 'Second connection did not block behind first OS lock');
}
function race(array $first, array $second): array
{
    $a = worker($first, true);
    $b = worker($second, false);
    try {
        awaitBlocked($b[2], $a[2]);
        fwrite($a[1][0], "go\n");
        fflush($a[1][0]);
        return [finish($a), finish($b)];
    } catch (Throwable $x) {
        foreach ([$a,$b] as $w) {
            proc_terminate($w[0]);
        } throw $x;
    }
}
try {
    foreach ([
        'os' => 'idOs INT PRIMARY KEY,status VARCHAR(80),clientes_id INT,usuarios_id INT,dataInicial DATE,descricaoProduto TEXT,valor_desconto DECIMAL(12,2) DEFAULT 0,tipo_desconto VARCHAR(20),desconto DECIMAL(12,2) DEFAULT 0',
        'produtos' => 'idProdutos INT PRIMARY KEY,descricao VARCHAR(100),precoVenda DECIMAL(12,2)',
        'servicos' => 'idServicos INT PRIMARY KEY,nome VARCHAR(100),preco DECIMAL(12,2)',
        'produtos_os' => 'idProdutos_os INT AUTO_INCREMENT PRIMARY KEY,os_id INT,produtos_id INT,quantidade DECIMAL(12,2),subTotal DECIMAL(12,2),preco DECIMAL(12,2)',
        'servicos_os' => 'idServicos_os INT AUTO_INCREMENT PRIMARY KEY,os_id INT,servicos_id INT,quantidade DECIMAL(12,2),subTotal DECIMAL(12,2),preco DECIMAL(12,2)',
        'os_historico' => 'id INT AUTO_INCREMENT PRIMARY KEY,os_id INT,status_anterior VARCHAR(80),status_novo VARCHAR(80),usuarios_id INT,data_hora DATETIME',
        'trifase_publico_links' => 'os_id INT PRIMARY KEY,token_hash CHAR(64),expira_em BIGINT',
    ] as $table=>$columns) {
        sql("CREATE TABLE $table ($columns) ENGINE=InnoDB");
    }
    sql("INSERT INTO produtos VALUES (1,'Peca sintetica',100)");
    migrate('20261102000000', 'trifase_entregas');
    migrate('20261102020000', 'trifase_orcamentos');
    [$legacyId,$legacyV] = seed();
    act(['public',$legacyId,$legacyV,keyFor('legacy')]);
    $legacy = snapshot($legacyId);
    migrate('20261119010000', 'trifase_orcamento_comunicacao');
    $late = method_exists($o, 'registrarRegularizacao') && is_file(APPPATH . 'database/migrations/20261119020000_trifase_orcamento_regularizacao.php');
    if ($late) {
        migrate('20261119020000', 'trifase_orcamento_regularizacao');
    }
    testCase('migration-reapply-legacy-index-fk', function () use ($legacyId, $legacy, $late) {
        $before = snapshot($legacyId);
        migrate('20261102000000', 'trifase_entregas');
        migrate('20261102020000', 'trifase_orcamentos');
        migrate('20261119010000', 'trifase_orcamento_comunicacao');
        if ($late) {
            migrate('20261119020000', 'trifase_orcamento_regularizacao');
        }
        insist(snapshot($legacyId) === $before, 'Reapply mutated legacy');
        insist($before[0] === $legacy[0] && $before[1] === $legacy[1], 'Legacy OS/history changed');
        foreach ($before[2] as $i=>$row) {
            foreach ($legacy[2][$i] as $k=>$v) {
                insist($row[$k] === $v, 'Legacy event changed');
            } insist($row['canal'] === null, 'Fabricated legacy communication');
        }
        insist((int) scalar('SELECT COUNT(*) FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE()') === ($late ? 10 : 9), 'FK count');
        foreach (['decisao_versao','operacao'] as $column) {
            insist((int) scalar("SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='trifase_orcamento_eventos' AND COLUMN_NAME=? AND NON_UNIQUE=0", [$column]) > 0, 'Missing unique index');
        }
        insist((int) scalar("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND ENGINE<>'InnoDB'") === 0, 'Non-InnoDB table');
    });
    foreach ([false, true] as $deliveryFirst) {
        testCase('publish-vs-delivery-' . ($deliveryFirst ? 'delivery-first' : 'publish-first'), function () use ($o, $e, $deliveryFirst) {
            [$id, $v] = seed();
            act(['aprovar', $id, $v, keyFor('publish_approved_' . $id)]);
            $approved = (array) $o->decisao($v);
            $before = publicationSnapshot($id);
            $hash = $o->atual($id)->conteudo_hash;
            $publish = ['publish', $id, $hash, keyFor('race_publish_' . $id)];
            $delivery = ['delivery', $id, $v, keyFor('race_delivery_' . $id)];
            // race() holds the real OS lock and proves the second connection's
            // wait in performance_schema before allowing the first operation.
            $results = race($deliveryFirst ? $delivery : $publish, $deliveryFirst ? $publish : $delivery);
            insist($results === ($deliveryFirst ? ['ok', 'denied'] : ['ok', 'ok']), 'Publication/delivery ordering violated: ' . json_encode($results));
            $after = publicationSnapshot($id);
            insist($e->ativa($id) !== null && count($after[3]) === 1 && count($after[4]) === 1, 'Delivery event/projection missing or duplicated');
            insist((array) $o->decisao($v) === $approved && $approved['tipo'] === 'aprovar', 'Historical approval changed');
            if ($deliveryFirst) {
                insist(array_slice($after, 0, 3) === array_slice($before, 0, 3), 'Losing publication mutated OS/history/events/versions/state');
                insist((int) $o->atual($id)->id === $v && (int) $o->atual($id)->ativo === 1, 'Delivery winner lost approved current version');
            } else {
                $current = $o->atual($id);
                insist(count($after[1]) === 2 && $after[1][0] === $before[1][0], 'Publication did not append exactly one immutable version');
                insist((int) $current->id !== $v && (int) $current->numero === 2 && (int) $current->ativo === 1, 'New version/projection incorrect');
                insist($o->decisao((int) $current->id) === null, 'Approval copied into new version');
                insist(count($after[0][2]) === count($before[0][2]) + 1 && array_slice($after[0][2], 0, count($before[0][2])) === $before[0][2], 'Publication altered historical events');
                $event = $after[0][2][count($after[0][2]) - 1];
                insist($event['tipo'] === 'publicar' && $event['operacao'] === $publish[3] && (int) $event['versao_id'] === (int) $current->id, 'Publication event does not reference new version');
                insist($after[0][0]['status'] === 'Negociação' && count($after[0][1]) === count($before[0][1]) + 1, 'Publication status/history incorrect');
                insist(act($publish) === (int) $current->id, 'New publication replay returned wrong version');
            }
            // Even a no-longer-current publication must replay before the
            // delivery guard, without resurrecting its projection or approval.
            $historical = ['publish', $id, $hash, keyFor('publish_' . $id)];
            insist(act($historical) === $v, 'Historical publication replay denied or returned wrong version');
            insist(publicationSnapshot($id) === $after, 'Replay duplicated version/event or changed projection');
            try {
                act([...$historical, ['diagnostico' => 'Outro diagnostico sintetico']]);
                throw new LogicException('Publication accepted conflicting payload with same key');
            } catch (DomainException $x) {
            }
            insist(publicationSnapshot($id) === $after, 'Conflicting publication mutated database');
            invariants($id);
        });
    }
    foreach (['Aprovado', 'Em Andamento', 'Finalizado'] as $status) {
        foreach ([false, true] as $enabled) {
            testCase('publish-delivered-status-' . $status . '-flags-' . (int) $enabled, function () use ($o, $e, $status, $enabled) {
                $flags = ['TRIFASE_ENTREGAS_ENABLED', 'TRIFASE_ORCAMENTOS_ENABLED', 'TRIFASE_GARANTIA_OPERACOES_ENABLED'];
                $saved = [];
                foreach ($flags as $flag) {
                    $saved[$flag] = $_ENV[$flag] ?? null;
                    $_ENV[$flag] = $enabled ? 'true' : 'false';
                }
                try {
                    [$id, $v] = seed();
                    act(['aprovar', $id, $v, keyFor('status_approve_' . $id)]);
                    sql('UPDATE os SET status=? WHERE idOs=?', [$status, $id]);
                    act(['delivery', $id, $v, keyFor('status_delivery_' . $id)]);
                    $before = publicationSnapshot($id);
                    $publish = ['publish', $id, $o->atual($id)->conteudo_hash, keyFor('status_publish_' . $id)];
                    try {
                        act($publish);
                        throw new LogicException('New publication accepted with active delivery');
                    } catch (DomainException $x) {
                    }
                    insist(publicationSnapshot($id) === $before, 'Denied publication changed versions/state/events/OS/history/delivery');
                    insist($o->decisao($v)->tipo === 'aprovar', 'Denied publication lost approval');
                    // An administrative cancellation removes the guard, not the
                    // old delivery evidence; the exact denied key may now work.
                    act(['correction', $id, (int) $e->ativa($id)->id, keyFor('status_cancel_' . $id)]);
                    $corrected = publicationSnapshot($id);
                    insist($e->ativa($id) === null && count($corrected[3]) === 2 && $corrected[3][0] === $before[3][0], 'Administrative cancellation lost delivery evidence');
                    $new = act($publish);
                    $after = publicationSnapshot($id);
                    insist($new !== $v && (int) $o->atual($id)->id === $new && count($after[1]) === 2, 'Publication not restored after cancellation');
                    insist($after[1][0] === $before[1][0] && $after[3] === $corrected[3] && $after[4] === [], 'Publication mutated historical version/delivery');
                    insist($o->decisao($v)->tipo === 'aprovar' && $o->decisao($new) === null, 'Approval overwritten or copied');
                    insist($after[0][0]['status'] === ($status === 'Aprovado' ? 'Negociação' : $status), 'Publication changed technical status');
                    insist(act($publish) === $new && publicationSnapshot($id) === $after, 'Publication replay after correction duplicated writes');
                    invariants($id);
                } finally {
                    foreach ($saved as $flag => $value) {
                        if ($value === null) {
                            unset($_ENV[$flag]);
                        } else {
                            $_ENV[$flag] = $value;
                        }
                    }
                }
            });
        }
    }
    foreach (['internal', 'public'] as $channel) {
        foreach (['aprovar','recusar'] as $decision) {
            foreach ([false,true] as $deliveryFirst) {
                testCase($channel . '-' . $decision . '-delivery-' . ($deliveryFirst?'delivery-first':'decision-first'), function () use ($channel, $decision, $deliveryFirst) {
                    [$id,$v] = seed();
                    $before = snapshot($id);
                    insist((int) scalar('SELECT COUNT(*) FROM trifase_publico_links WHERE os_id=? AND token_hash=? AND expira_em>?', [$id, hash('sha256', str_repeat('a', 64)), time()]) === 1, 'Initial public token invalid');
                    $d = ['delivery',$id,$v,keyFor('delivery_'.$id)];
                    $r = [$channel === 'public' ? 'public_' . $decision : $decision,$id,$v,keyFor('decision_'.$id)];
                    $results = race($deliveryFirst?$d:$r, $deliveryFirst?$r:$d);
                    insist($results === ($deliveryFirst?['ok','denied']:['ok','ok']), 'Unexpected race outcomes');
                    invariants($id);
                    insist((int) scalar('SELECT COUNT(*) FROM trifase_entregas_estado WHERE os_id=?', [$id])===1, 'Delivery missing');
                    insist((int) scalar('SELECT COUNT(*) FROM trifase_orcamento_eventos WHERE os_id=? AND decisao_versao IS NOT NULL', [$id])===($deliveryFirst?0:1), 'Decision count');
                    $after = snapshot($id);
                    if ($deliveryFirst) {
                        insist($before === $after, 'Delivery winner allowed normal decision or OS/history mutation');
                    } else {
                        insist($after[0]['status'] === ($decision==='aprovar'?'Aprovado':'Orçamento recusado'), 'Wrong OS status');
                        insist((int) scalar('SELECT COUNT(*) FROM os_historico h JOIN trifase_orcamento_eventos e ON e.os_id=h.os_id AND e.decisao_versao IS NOT NULL JOIN trifase_entregas_eventos d ON d.os_id=e.os_id WHERE e.os_id=? AND h.status_novo=? AND h.data_hora=e.criado_em AND e.criado_em<=d.registrado_em', [$id,$after[0]['status']])===1, 'Ordered timestamps/history');
                    }
                });
            }
        }
    }
    foreach (['aprovar','recusar'] as $decision) {
        testCase('public-' . $decision . '-token-revalidated-under-os-lock', function () use ($db, $decision) {
            [$id,$v]=seed();
            $before=snapshot($id);
            insist((int) scalar('SELECT COUNT(*) FROM trifase_publico_links WHERE os_id=? AND token_hash=? AND expira_em>?', [$id,hash('sha256', str_repeat('a', 64)),time()])===1, 'Token not initially valid');
            $controller = new Trifase_os_lock($db, $id);
            $child = null;
            try {
                $child = worker(['public_'.$decision,$id,$v,keyFor('revalidated_'.$id)], false);
                awaitBlocked($child[2], (int) scalar('SELECT CONNECTION_ID()'));
                // Rotate only the synthetic token under the actual shared OS lock.
                // The waiting responder must observe the committed rotation, not a pre-lock check.
                sql('UPDATE trifase_publico_links SET token_hash=? WHERE os_id=?', [hash('sha256', str_repeat('b', 64)),$id]);
                $controller->finalizar(true);
                insist(finish($child)==='denied', 'Responder accepted a token revoked while it waited');
                insist(snapshot($id)===$before, 'Revoked-token response changed OS/history/events');
                insist((int) scalar('SELECT COUNT(*) FROM trifase_publico_links WHERE os_id=? AND token_hash=?', [$id,hash('sha256', str_repeat('b', 64))])===1, 'Rotation did not commit');
                insist((int) scalar('SELECT COUNT(*) FROM trifase_entregas_estado WHERE os_id=?', [$id])===0, 'Unexpected delivery');
                invariants($id);
            } finally {
                $controller->finalizar(false);
                if ($child !== null && is_resource($child[0])) {
                    proc_terminate($child[0]);
                }
            }
        });
    }
    foreach (['aprovar','recusar'] as $second) {
        testCase('approve-vs-'.$second, function () use ($second) {
            [$id,$v] = seed();
            insist(race(['aprovar',$id,$v,keyFor('first_'.$id)], [$second,$id,$v,keyFor('second_'.$id)])===['ok','denied'], 'Decision race');
            invariants($id);
            insist((int) scalar('SELECT COUNT(*) FROM trifase_orcamento_eventos WHERE decisao_versao=?', [$v])===1, 'Decision missing');
        });
    }
    testCase('replay-and-conflicting-key', function () {
        [$id,$v] = seed();
        $a=['aprovar',$id,$v,keyFor('replay_'.$id)];
        act($a);
        $before=snapshot($id);
        act($a);
        insist(snapshot($id)===$before, 'Replay duplicated event');
        try {
            act(['recusar',$id,$v,$a[3]]);
            throw new LogicException('Conflict accepted');
        } catch (DomainException $x) {
        } insist(snapshot($id)===$before, 'Conflict changed DB');
        invariants($id);
    });
    testCase('public-delivered-denied-and-normal-replay-after-delivery', function () {
        [$id,$v]=seed();
        act(['delivery',$id,$v,keyFor('public_delivery_'.$id)]);
        $before=snapshot($id);
        try {
            act(['public',$id,$v,keyFor('public_denied_'.$id)]);
            throw new LogicException('Public decision accepted after delivery');
        } catch (DomainException $x) {
        }
        insist(snapshot($id)===$before, 'Public denial mutated DB');
        invariants($id);
        [$id,$v]=seed();
        $a=['aprovar',$id,$v,keyFor('normal_repeat_'.$id)];
        act($a);
        act(['delivery',$id,$v,keyFor('normal_delivery_'.$id)]);
        $before=snapshot($id);
        act($a);
        insist(snapshot($id)===$before, 'Normal replay after delivery duplicated/mutated');
        invariants($id);
    });
    foreach (['os','os_historico'] as $table) {
        testCase('rollback-after-event-'.$table, function () use ($table) {
            [$id,$v]=seed();
            $before=snapshot($id);
            $operation=$table==='os'?'UPDATE':'INSERT';
            sql("CREATE TRIGGER fail_normal BEFORE $operation ON $table FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Injected persistence failure'");
            try {
                try {
                    act(['aprovar',$id,$v,keyFor('rollback_'.$id)]);
                    throw new LogicException('Failure not injected');
                } catch (RuntimeException $x) {
                    insist(!($x instanceof LogicException), 'Expected rollback');
                }
            } finally {
                sql('DROP TRIGGER fail_normal');
            }
            insist(snapshot($id)===$before, 'Partial decision/history/OS persisted');
            invariants($id);
        });
    }
    foreach ([false,true] as $correctionFirst) {
        testCase('delivery-vs-correction-'.($correctionFirst?'correction-first':'delivery-first'), function () use ($e, $correctionFirst) {
            [$id,$v]=seed();
            act(['delivery',$id,$v,keyFor('initial_'.$id)]);
            $active=$e->ativa($id);
            $before=snapshot($id);
            $d=['delivery',$id,$v,keyFor('newdelivery_'.$id)];
            $c=['correction',$id,(int)$active->id,keyFor('correct_'.$id)];
            insist(race($correctionFirst?$c:$d, $correctionFirst?$d:$c)===($correctionFirst?['ok','ok']:['denied','ok']), 'Correction outcomes');
            insist(($e->ativa($id)!==null)===$correctionFirst, 'Incorrect active state');
            insist(snapshot($id)===$before, 'Delivery correction mutated budget');
            invariants($id);
        });
    }
    if ($late) {
        testCase('regularize-vs-regularize-replay', function () use ($e) {
            [$id,$v]=seed();
            act(['delivery',$id,$v,keyFor('late_delivery_'.$id)]);
            $before=snapshot($id);
            $a=['regularize',$id,$v,keyFor('late_first_'.$id)];
            insist(race($a, ['regularize',$id,$v,keyFor('late_second_'.$id)])===['ok','denied'], 'Late race');
            $after=snapshot($id);
            insist($after[0]===$before[0] && $after[1]===$before[1], 'Late decision changed OS/history');
            act($a);
            insist(snapshot($id)===$after, 'Late replay duplicated');
            $event=sql('SELECT * FROM trifase_orcamento_eventos WHERE decisao_versao=?', [$v])->row();
            insist((int)$event->regularizacao_tardia===1 && (int)$event->entrega_id===(int)$e->ativa($id)->id && strlen($event->justificativa)>=5, 'Late metadata missing');
            insist($event->comunicado_em <= $e->ativa($id)->entregue_em && $event->criado_em >= $e->ativa($id)->registrado_em, 'Late timestamps');
            try {
                act(['recusar',$id,$v,$a[3]]);
                throw new LogicException('Late conflicting key accepted');
            } catch (DomainException $x) {
            }
            insist(snapshot($id)===$after, 'Late conflict mutated DB');
            invariants($id);
        });
        testCase('regularization-persistence-rollback', function () {
            [$id,$v]=seed();
            act(['delivery',$id,$v,keyFor('late_rollback_delivery_'.$id)]);
            $before=snapshot($id);
            // AFTER INSERT rejects actual event persistence, rolling back its insert.
            sql("CREATE TRIGGER fail_late AFTER INSERT ON trifase_orcamento_eventos FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Injected late failure'");
            try {
                try {
                    act(['regularize',$id,$v,keyFor('late_rollback_'.$id)]);
                    throw new LogicException('Late failure not injected');
                } catch (RuntimeException $x) {
                }
            } finally {
                sql('DROP TRIGGER fail_late');
            }
            insist(snapshot($id)===$before, 'Late partial persistence');
            invariants($id);
        });
    } else {
        $skipped[]='regularize-vs-regularize-replay';
        $skipped[]='regularization-persistence-rollback';
    }
} catch (Throwable $x) {
    $failed[]=['case'=>'setup','message'=>$x->getMessage()];
}
foreach ($workers as $p) {
    if (is_resource($p)) {
        proc_terminate($p);
    }
}
echo json_encode(['engine'=>scalar('SELECT VERSION()'),'passed'=>count($passed),'failed'=>count($failed),'skipped'=>count($skipped),'failures'=>$failed,'skips'=>$skipped], JSON_UNESCAPED_UNICODE) . "\n";
exit($failed ? 1 : ($skipped ? 3 : 0));
