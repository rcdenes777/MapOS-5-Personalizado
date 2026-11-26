#!/usr/bin/env python3
"""R07-003 — proveniência dos arquivos testados (assets, suítes e evidências)."""
import hashlib, json, os, subprocess, datetime

BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
REPO = os.path.abspath(os.path.join(BASE, '..', '..', '..', '..'))
ASSETS = os.path.join(REPO, 'interface_gpt', 'assets')
TESTS = os.path.join(REPO, 'interface_gpt', 'tests')
CANDIDATE = 'b619ceb8fe27b56df8aeac4fbb7c9e46d99a61f8'
FINAL_CODE = os.environ.get('FINAL_CODE_SHA', 'cc738622436d3df1224df700916970570eb0bd40')
REFERENCE = '8c256cae4ddaeefad68922abddbb8addfe37c99d'

def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(65536), b''):
            h.update(b)
    return h.hexdigest()

def git(*args):
    return subprocess.check_output(['git', '-C', REPO] + list(args), text=True).strip()

def remote_tip(ref):
    try:
        out = subprocess.check_output(['git', '-C', REPO, 'ls-remote', 'origin', ref], text=True, timeout=30).strip()
        return out.split()[0] if out else None
    except Exception:
        return None

# Resolve o SHA completo do commit de código desta rodada
try:
    final_code = git('rev-parse', '--verify', 'cc738622')
except Exception:
    final_code = FINAL_CODE

v5_remote = remote_tip('refs/heads/v5-trifase')
assets = {f: sha(os.path.join(ASSETS, f)) for f in sorted(os.listdir(ASSETS)) if f.endswith(('.js', '.css'))}
suites = {f: sha(os.path.join(TESTS, f)) for f in sorted(os.listdir(TESTS)) if f.endswith('.cjs')}
scripts = {}
for root, _, files in os.walk(os.path.join(BASE, 'testes')):
    for f in files:
        if f.endswith(('.cjs', '.py', '.log', '.json')):
            p = os.path.join(root, f)
            scripts[os.path.relpath(p, BASE)] = sha(p)

docs = {}
for f in ['RELATORIO.md', 'RESUMO.md', 'INDICE.md', 'MATRIZ-F04.md', 'AUDITORIA-INDEPENDENTE.md']:
    p = os.path.join(BASE, f)
    if os.path.exists(p):
        docs[f] = sha(p)

data = {
    'generatedAt': datetime.datetime.now().astimezone().isoformat(),
    'repository': 'rcdenes777/MapOS-5-Personalizado',
    'branch': 'interface-gpt',
    'candidate': CANDIDATE,
    'candidateSubject': git('log', '-1', '--format=%s', CANDIDATE),
    'baseR07002': 'e04bb4059282197a0ce98e10d1715379433b5084',
    'finalCodeTested': final_code,
    'finalCodeCommit': git('log', '-1', '--format=%s', final_code),
    'codeChangesAfterCandidate': git('diff', '--name-status', CANDIDATE + '..' + final_code, '--', 'interface_gpt/assets', 'interface_gpt/tests'),
    'functionalReference': REFERENCE,
    'v5TrifaseTip': v5_remote or REFERENCE,
    'v5TrifaseRemoteTip': v5_remote,
    'v5TrifaseEqualsReference': (v5_remote == REFERENCE) if v5_remote else None,
    'outsideInterfaceGptDiff': git('diff', '--name-only', REFERENCE + '..HEAD', '--', '.', ':(exclude)interface_gpt'),
    'server': 'http://127.0.0.1:8130 (python3 -m http.server em interface_gpt/, dados fictícios em localStorage)',
    'environment': {
        'node': subprocess.check_output(['node', '-v'], text=True).strip(),
        'chromium': 'Google Chrome for Testing 156.0.8078.4 (playwright chromium-1248)',
        'axeCore': json.load(open('/home/dragonblue/workspace/interface-gpt-lab/tools/node_modules/axe-core/package.json'))['version'],
        'pdftotext': subprocess.check_output(['pdftotext', '-v'], stderr=subprocess.STDOUT, text=True).splitlines()[0],
        'pillow': __import__('PIL').__version__,
    },
    'assets': assets,
    'gptSuites': suites,
    'reviewDocuments': docs,
    'evidenceScriptsAndLogs': scripts,
}
out = os.path.join(BASE, 'proveniencia.json')
json.dump(data, open(out, 'w'), indent=2, ensure_ascii=False)
print(json.dumps({k: data[k] for k in ['finalCodeTested', 'outsideInterfaceGptDiff', 'v5TrifaseTip']}, ensure_ascii=False))
print('assets', len(assets), 'suites', len(suites), 'evidence files', len(scripts))
