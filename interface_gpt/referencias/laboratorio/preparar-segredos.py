#!/usr/bin/env python3
"""Create fresh synthetic-lab credentials in ./private; never overwrite."""
import json
import os
from pathlib import Path
import secrets

os.umask(0o077)
p = Path.cwd() / 'private'
p.mkdir(mode=0o700, exist_ok=True)
if p.stat().st_mode & 0o077:
    raise SystemExit('Refusing non-private private/ directory')
paths = [p / name for name in ('mysql.env', 'app.env', 'users.json')]
if any(path.exists() for path in paths):
    raise SystemExit('Refusing to overwrite existing private credentials')
root = secrets.token_hex(32)
db = secrets.token_hex(32)
mysql = f'MYSQL_ROOT_PASSWORD={root}\nMYSQL_DATABASE=mapos_lab_synthetic\nMYSQL_USER=mapos_lab\nMYSQL_PASSWORD={db}\n'
env = {
    'APP_ENVIRONMENT':'testing', 'APP_BASEURL':'http://127.0.0.1:18130/',
    'APP_ENCRYPTION_KEY':secrets.token_hex(32), 'APP_SESS_DRIVER':'database',
    'APP_SESS_COOKIE_NAME':'MAPOS_SYNTH_LAB', 'APP_SESS_SAVE_PATH':'ci_sessions',
    'APP_COOKIE_SECURE':'false', 'APP_CSRF_PROTECTION':'true', 'APP_CSRF_REGENERATE':'true',
    'DB_HOSTNAME':'db', 'DB_USERNAME':'mapos_lab', 'DB_PASSWORD':db,
    'DB_DATABASE':'mapos_lab_synthetic', 'DB_DRIVER':'mysqli', 'DB_CHARSET':'utf8mb4',
    'DB_COLLATION':'utf8mb4_general_ci', 'STORAGE_PATH':'/lab/storage',
    'API_ENABLED':'false', 'WHOOPS_ERROR_PAGE_ENABLED':'false',
    'EMAIL_SMTP_HOST':'127.0.0.1', 'EMAIL_SMTP_PORT':'9', 'PAYMENT_GATEWAYS_ASAAS_NOTIFY':'false',
    'TRIFASE_PUBLICO_ENABLED':'false', 'TRIFASE_FINANCEIRO_ENABLED':'true',
    'TRIFASE_ENTREGAS_ENABLED':'true', 'TRIFASE_EQUIPAMENTOS_ENABLED':'true',
    'TRIFASE_ORCAMENTOS_ENABLED':'true', 'TRIFASE_ATENDIMENTOS_ENABLED':'true',
    'TRIFASE_RETORNOS_ENABLED':'true', 'TRIFASE_CADASTROS_ENABLED':'true',
    'TRIFASE_ESTOQUE_ENABLED':'true', 'TRIFASE_GARANTIA_OPERACOES_ENABLED':'true',
}
users = {role: {'email':role+'@example.invalid', 'password':secrets.token_urlsafe(24)}
         for role in ('admin','tecnico','atendente','financeiro')}
contents = [mysql, ''.join(f'{key}={value}\n' for key, value in env.items()), json.dumps(users, ensure_ascii=False, indent=2)+'\n']
for path, text in zip(paths, contents, strict=True):
    with path.open('x', encoding='utf-8') as handle:
        handle.write(text)
    path.chmod(0o600)
print('Synthetic credentials created in private/; no values printed.')
