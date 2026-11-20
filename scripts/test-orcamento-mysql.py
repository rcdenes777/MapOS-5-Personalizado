#!/usr/bin/env python3
"""Disposable offline MySQL runner. Run: python3 scripts/test-orcamento-mysql.py.
No published ports; only newly named containers/volume are removed. Evidence is
outside the checkout. Worker barriers are verified with data_lock_waits, not time.
"""
import json
import os
from pathlib import Path
import secrets
import subprocess
import tempfile
import time

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT.parent / 'mapos5-orcamento-lab' / 'evidence-mysql'

def main():
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    prefix = 'mapos5-orcamento-races-' + secrets.token_hex(6)
    db, php, volume = prefix + '-db', prefix + '-php', prefix + '-data'
    password = secrets.token_hex(32)
    scratch = Path(os.environ.get('TMPDIR', str(Path.home() / '.hermes/cache/scratch')))
    scratch.mkdir(parents=True, exist_ok=True)
    env = None
    created = []
    def run(args, timeout=120, check=True):
        r = subprocess.run(args, capture_output=True, text=True, timeout=timeout)
        if check and r.returncode:
            raise RuntimeError((r.stdout + r.stderr).replace(password, '[REDACTED]'))
        return r
    try:
        with tempfile.NamedTemporaryFile(mode='w', dir=scratch, prefix='orcamento-', delete=False) as f:
            env = Path(f.name)
            os.chmod(env, 0o600)
            f.write('MYSQL_ROOT_PASSWORD=' + password + '\nMYSQL_DATABASE=orcamento_test\n')
        run(['docker', 'image', 'inspect', 'mysql:8.4', 'mapos5-preview-php'])
        run(['docker', 'volume', 'create', volume]); created.append(('volume', volume))
        run(['docker', 'create', '--pull=never', '--name', db, '--network', 'none', '--env-file', str(env), '-v', volume + ':/var/lib/mysql', 'mysql:8.4']); created.append(('container', db))
        run(['docker', 'start', db])
        deadline = time.monotonic() + 90
        while True:
            r = run(['docker', 'exec', db, 'sh', '-c', 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqladmin -h127.0.0.1 -uroot ping --silent'], check=False)
            if r.returncode == 0:
                break
            if time.monotonic() > deadline:
                raise RuntimeError('MySQL startup timeout')
            time.sleep(.3)
        run(['docker', 'create', '--pull=never', '--name', php, '--network', 'container:' + db, '--env-file', str(env), '-v', str(ROOT) + ':/app:ro', '--entrypoint', 'php', 'mapos5-preview-php', '/app/tests/Integration/TrifaseOrcamentoMysql.php']); created.append(('container', php))
        r = run(['docker', 'start', '-a', php], timeout=200, check=False)
        safe = (r.stdout + r.stderr).replace(password, '[REDACTED]')
        print(safe, end='')
        (EVIDENCE / (prefix + '.log')).write_text(safe)
        summaries = []
        for line in safe.splitlines():
            try:
                row = json.loads(line)
                if isinstance(row, dict) and 'passed' in row and 'failed' in row:
                    summaries.append(row)
            except json.JSONDecodeError:
                pass
        if summaries:
            (EVIDENCE / (prefix + '.json')).write_text(json.dumps(summaries[-1], indent=2) + '\n')
        code = run(['docker', 'inspect', php, '--format', '{{.State.ExitCode}}']).stdout.strip()
        return 0 if code == '0' and r.returncode == 0 and summaries and summaries[-1]['failed'] == 0 and summaries[-1]['skipped'] == 0 else 1
    except Exception as e:
        message = str(e).replace(password, '[REDACTED]')
        print('RUNNER ERROR: ' + message)
        (EVIDENCE / (prefix + '.log')).write_text('RUNNER ERROR: ' + message)
        return 1
    finally:
        cleanup_failures = []
        for kind, name in reversed(created):
            removed = run(['docker', kind, 'rm'] + (['-f'] if kind == 'container' else []) + [name], check=False)
            remaining = run(['docker', kind, 'inspect', name], check=False)
            if removed.returncode != 0 or remaining.returncode == 0:
                cleanup_failures.append(name)
        if env:
            env.unlink(missing_ok=True)
        if cleanup_failures:
            print('CLEANUP FAILED: ' + ', '.join(cleanup_failures))
            raise SystemExit(1)
        print('CLEANUP verified: runner containers, volume and private env removed')

if __name__ == '__main__':
    import argparse
    argparse.ArgumentParser(description=__doc__).parse_args()
    raise SystemExit(main())
