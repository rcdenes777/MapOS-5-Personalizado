#!/usr/bin/env python3
"""R07-002 — proveniência dos arquivos testados (assets, suítes e evidências)."""
import hashlib, json, os, subprocess, datetime

BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
REPO = os.path.abspath(os.path.join(BASE, '..', '..', '..', '..'))
ASSETS = os.path.join(REPO, 'interface_gpt', 'assets')
TESTS = os.path.join(REPO, 'interface_gpt', 'tests')

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

v5_remote = remote_tip('refs/heads/v5-trifase')
v5_local = None
try:
    v5_local = git('rev-parse', '--verify', 'refs/remotes/origin/v5-trifase')
except Exception:
    v5_local = None

assets = {f: sha(os.path.join(ASSETS, f)) for f in sorted(os.listdir(ASSETS)) if f.endswith(('.js', '.css'))}
suites = {f: sha(os.path.join(TESTS, f)) for f in sorted(os.listdir(TESTS)) if f.endswith('.cjs')}
scripts = {}
for root, _, files in os.walk(os.path.join(BASE, 'testes')):
    for f in files:
        if f.endswith(('.cjs', '.py', '.log', '.json')):
            p = os.path.join(root, f)
            rel = os.path.relpath(p, BASE)
            scripts[rel] = sha(p)

data = {
    'generatedAt': datetime.datetime.now().astimezone().isoformat(),
    'repository': 'rcdenes777/MapOS-5-Personalizado',
    'branch': 'interface-gpt',
    'candidate': 'b1dfff0197d81f2ad4cd7a570f5476cd0aa6fc8d',
    'candidateSubject': git('log', '-1', '--format=%s', 'b1dfff0197d81f2ad4cd7a570f5476cd0aa6fc8d'),
    'baseR07001': 'f46ad182bcb7fb067d68c335369640c82bccba1d',
    'finalCodeTested': git('rev-parse', 'HEAD'),
    'finalCodeCommit': git('log', '-1', '--format=%s', 'HEAD'),
    'correctionThisRound': ['e04bb4059282197a0ce98e10d1715379433b5084'],
    'functionalReference': '8c256cae4ddaeefad68922abddbb8addfe37c99d',
    'v5TrifaseTip': v5_remote or '8c256cae4ddaeefad68922abddbb8addfe37c99d',
    'v5TrifaseRemoteTip': v5_remote,
    'v5TrifaseLocalTrackingRef': v5_local,
    'v5TrifaseEqualsReference': (v5_remote == '8c256cae4ddaeefad68922abddbb8addfe37c99d') if v5_remote else None,
    'v5TrifaseVerification': 'git ls-remote origin refs/heads/v5-trifase; a ref local de tracking nao existe neste clone (ver v5TrifaseLocalTrackingRef)',
    'outsideInterfaceGptDiff': git('diff', '--name-only', '8c256cae4ddaeefad68922abddbb8addfe37c99d..HEAD', '--', '.', ':(exclude)interface_gpt'),
    'server': 'http://127.0.0.1:8130 (python3 -m http.server, dados fictícios em localStorage)',
    'environment': {
        'node': subprocess.check_output(['node', '-v'], text=True).strip(),
        'chromium': 'Google Chrome for Testing 156.0.8078.4 (playwright chromium-1248)',
        'axeCore': json.load(open('/home/dragonblue/workspace/interface-gpt-lab/tools/node_modules/axe-core/package.json'))['version'],
        'pdftotext': subprocess.check_output(['pdftotext', '-v'], stderr=subprocess.STDOUT, text=True).splitlines()[0],
        'pillow': __import__('PIL').__version__,
    },
    'assets': assets,
    'gptSuites': suites,
    'evidenceScriptsAndLogs': scripts,
}
out = os.path.join(BASE, 'proveniencia.json')
json.dump(data, open(out, 'w'), indent=2, ensure_ascii=False)
print(json.dumps({k: data[k] for k in ['finalCodeTested', 'outsideInterfaceGptDiff', 'v5TrifaseTip']}, ensure_ascii=False))
print('assets', len(assets), 'suites', len(suites), 'evidence files', len(scripts))
