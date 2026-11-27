#!/usr/bin/env python3
import sys,json,pathlib,statistics
from prepare import plan, CFG
p=pathlib.Path(sys.argv[1])
expected={x["id"]:x for x in plan()}
records={}
for f in sorted(p.glob("*.json")):
    r=json.loads(f.read_text()); key=r["id"]
    if key not in expected or key in records:raise SystemExit("Unexpected/duplicate record "+key)
    x=expected[key]
    if (r["task"],r["model"],r["repetition"])!=(x["task"],x["model"]["id"],x["repetition"]):raise SystemExit("Identity mismatch "+key)
    if r.get("accepted"):
        if not (r.get("classification")=="valid" and r.get("grade_total",0)>0 and r.get("grade_pass")==r.get("grade_total") and r.get("critical_failures")==0 and r.get("native_regression_pass") is True and r.get("scope_integrity_pass") is True and (r["task"]!="T03" or r.get("audit_detection")==3)):
            raise SystemExit("Inconsistent acceptance "+key)
    records[key]=r
print("# Pilot results\n\nExpected %d; recorded %d. Descriptive only.\n"%(len(expected),len(records)))
print("| Attempt | Classification | Held-out | Accepted | Seconds | API-equiv USD | Actual billed USD |")
print("|---|---|---|---|---:|---:|---:|")
def show(x):return "—" if x is None else str(x).replace("|","/")
for key in expected:
    r=records.get(key,{})
    print("| %s | %s | %s/%s | %s | %s | %s | %s |"%(key,r.get("classification","pending"),show(r.get("grade_pass")),show(r.get("grade_total")),show(r.get("accepted")),show(r.get("wall_seconds")),show(r.get("api_equivalent_usd")),show(r.get("billed_usd"))))
print("\n| Model | Valid/6 | Accepted | Invalid/infra | Median valid wall (s) | API-equivalent cost/accepted* |")
print("|---|---:|---:|---:|---:|---:|")
for m in [model["id"] for model in CFG["models"]]:
    allr=[r for r in records.values() if r["model"]==m]
    valid=[r for r in allr if r.get("classification")=="valid"]
    accepted=sum(bool(r.get("accepted")) for r in valid)
    times=[r["wall_seconds"] for r in valid if r.get("wall_seconds") is not None]
    costs=[r.get("api_equivalent_usd") for r in valid]
    value=round(sum(costs)/accepted,4) if accepted and all(x is not None for x in costs) else None
    print("| %s | %d | %d | %d | %s | %s |"%(m,len(valid),accepted,len(allr)-len(valid),show(statistics.median(times) if times else None),show(value)))
print("\n* All valid attempts including failures, not infrastructure or actual bills. Missing cost makes ratio undefined. No accepted tasks => undefined. Report actual bills/quota and infrastructure costs separately. Do not infer universal rankings.")
