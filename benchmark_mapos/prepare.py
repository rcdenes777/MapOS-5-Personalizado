#!/usr/bin/env python3
"""Operator-side preparation; never expose this checkout to a candidate."""
import argparse, io, json, pathlib, subprocess, tarfile, hashlib, random
ROOT=pathlib.Path(__file__).resolve().parent
REPO=ROOT.parent
CFG=json.loads((ROOT/"config.json").read_text())
def git(*args):
    return subprocess.check_output(["git","-C",str(REPO),*args])
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def plan():
    pairs=[]
    for rep in range(1,CFG["repetitions"]+1):
        block=[{"id":f"{t['id']}-{m['id']}-r{rep}","task":t["id"],"model":m,"repetition":rep} for t in CFG["tasks"] for m in CFG["models"]]
        random.Random(20261126+rep).shuffle(block)
        pairs.extend(block)
    return pairs
def prepare(task,mode,out):
    out=out.resolve()
    if out.exists() or out.is_relative_to(REPO.resolve()) or REPO.resolve().is_relative_to(out):
        raise SystemExit("Use a NEW dedicated directory outside the controller checkout.")
    if task not in {t["id"] for t in CFG["tasks"]}: raise SystemExit("Unknown task")
    raw=git("archive","--format=tar",CFG["native_sha"])
    out.mkdir(parents=True)
    with tarfile.open(fileobj=io.BytesIO(raw)) as archive: archive.extractall(out,filter="data")
    if (out/".git").exists() or (out/"benchmark_mapos").exists() or (out/"interface_gpt").exists():
        raise SystemExit("Unexpected grading/history material in export; isolate and stop.")
    patches=json.loads((ROOT/"private/patches.json").read_text())[task]
    if mode=="starter":
        for p in patches:
            f=out/p["path"]; old=f.read_text()
            if old.count(p["old"])!=1: raise SystemExit("Patch anchor mismatch: "+p["path"])
            f.write_text(old.replace(p["old"],p["new"],1))
    elif mode=="reference" and task=="T02":
        f=out/"application/models/Trifase_estoque_model.php"
        old=f.read_text(); anchor="    public function movimentar("
        if old.count(anchor)!=1: raise SystemExit("Reference anchor mismatch")
        f.write_text(old.replace(anchor,(ROOT/"private/T02-reference.php.txt").read_text()+anchor,1))
    (out/"TASK.md").write_bytes((ROOT/"tasks"/(task+".md")).read_bytes())
    subprocess.run(["git","init","-q",str(out)],check=True)
    subprocess.run(["git","-C",str(out),"add","-A"],check=True)
    subprocess.run(["git","-C",str(out),"-c","user.name=Benchmark","-c","user.email=benchmark@example.invalid","commit","-qm","Frozen benchmark starter"],check=True)
    print(json.dumps({"task":task,"mode":mode,"workspace":str(out),"starter":subprocess.check_output(["git","-C",str(out),"rev-parse","HEAD"],text=True).strip(),"native":CFG["native_sha"],"prompt_sha256":digest(out/"TASK.md")},indent=2))
if __name__=="__main__":
    p=argparse.ArgumentParser(); sub=p.add_subparsers(dest="cmd",required=True)
    sub.add_parser("plan")
    a=sub.add_parser("prepare"); a.add_argument("task");a.add_argument("mode",choices=["starter","reference"]);a.add_argument("out",type=pathlib.Path)
    x=p.parse_args()
    if x.cmd=="plan":print(json.dumps(plan(),indent=2))
    else:prepare(x.task,x.mode,x.out)
