#!/usr/bin/env python3
"""Create only new lab resources. Refuses reuse; never prints secrets."""
import os, pathlib, secrets, subprocess, json, time
L=pathlib.Path(__file__).resolve().parent
R=pathlib.Path(os.environ.get('MAPOS_REPO_DIR', pathlib.Path.cwd())).resolve()
if not (R/'application/models/Trifase_orcamento_model.php').is_file():
 raise SystemExit('Run from the repository root or set MAPOS_REPO_DIR')
if L.is_relative_to(R):
 raise SystemExit('Copy this harness outside the repository before creating private lab data')
def run(*args): return subprocess.check_output(args, text=True).strip()
def private(name, value):
 p=L/name;p.write_text(value);p.chmod(0o600)
if __name__=='__main__':
 os.umask(0o077)
 for name in ['mapos5-orcamento-lab-db','mapos5-orcamento-lab-php']:
  if subprocess.run(['docker','container','inspect',name],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode==0: raise SystemExit('Refusing existing container: '+name)
 if (L/'app.env').exists(): raise SystemExit('Refusing credential overwrite')
 for d in ['mysql','storage','logs','cache','empty-anexos','empty-arquivos','empty-userImage']: (L/d).mkdir(mode=0o700)
 dbpass=secrets.token_hex(24)
 private('mysql.env',f'MYSQL_ROOT_PASSWORD={secrets.token_hex(32)}\nMYSQL_DATABASE=mapos5_orcamento_lab\nMYSQL_USER=lab\nMYSQL_PASSWORD={dbpass}\n')
 env={'APP_ENVIRONMENT':'testing','APP_BASEURL':'http://127.0.0.1:8230/','APP_ENCRYPTION_KEY':secrets.token_hex(32),'DB_HOSTNAME':'mapos5-orcamento-lab-db','DB_USERNAME':'lab','DB_PASSWORD':dbpass,'DB_DATABASE':'mapos5_orcamento_lab','DB_DRIVER':'mysqli','DB_CHARSET':'utf8mb4','DB_COLLATION':'utf8mb4_general_ci','STORAGE_PATH':'/lab/storage','APP_SESS_COOKIE_NAME':'MAPOS_LAB_SESSION','APP_CSRF_PROTECTION':'true','APP_CSRF_REGENERATE':'true','APP_COOKIE_HTTPONLY':'true','APP_COOKIE_SECURE':'false','API_ENABLED':'false','WHOOPS_ERROR_PAGE_ENABLED':'false','EMAIL_SMTP_HOST':'127.0.0.1','EMAIL_SMTP_PORT':'9','TRIFASE_UI_PILOTO_ENABLED':'true','TRIFASE_ENTREGAS_ENABLED':'true','TRIFASE_EQUIPAMENTOS_ENABLED':'true','TRIFASE_ORCAMENTOS_ENABLED':'true','TRIFASE_PUBLICO_ENABLED':'true','TRIFASE_ATENDIMENTOS_ENABLED':'true','TRIFASE_CADASTROS_ENABLED':'true','TRIFASE_FINANCEIRO_ENABLED':'false','TRIFASE_ESTOQUE_ENABLED':'false'}
 private('app.env',''.join(f'{k}={v}\n' for k,v in env.items()))
 private('credentials.json',json.dumps({'email':'admin.orcamento@example.invalid','password':secrets.token_urlsafe(24)}))
 print('network',run('docker','network','create','--internal','mapos5-orcamento-lab-net'))
 print('database',run('docker','run','-d','--pull=never','--name','mapos5-orcamento-lab-db','--network','mapos5-orcamento-lab-net','--env-file',str(L/'mysql.env'),'--mount',f'type=bind,src={L}/mysql,dst=/var/lib/mysql','mysql:8.4'))
 args=['docker','run','-d','--pull=never','--name','mapos5-orcamento-lab-php','--network','mapos5-orcamento-lab-net','--env-file',str(L/'app.env'),'-p','127.0.0.1:8230:8000','-w','/var/www/html','--mount',f'type=bind,src={R},dst=/var/www/html,readonly','--mount',f'type=bind,src={L},dst=/lab']
 for source,target in [('logs','application/logs'),('cache','application/cache'),('empty-anexos','assets/anexos'),('empty-arquivos','assets/arquivos'),('empty-userImage','assets/userImage')]: args+=['--mount',f'type=bind,src={L}/{source},dst=/var/www/html/{target}']
 args+=['mapos5-preview-php','php','-d','variables_order=EGPCS','-S','0.0.0.0:8000','-t','/var/www/html','/lab/router.php']
 print('php',run(*args))
