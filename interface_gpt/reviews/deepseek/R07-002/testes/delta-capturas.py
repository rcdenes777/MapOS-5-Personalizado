#!/usr/bin/env python3
"""R07-002 — delta de pixels das capturas homônimas contra a evidência R07-001."""
import json, os
from PIL import Image, ImageChops

BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OLD = os.path.abspath(os.path.join(BASE, '..', 'R07-001', 'capturas'))
NEW = os.path.join(BASE, 'capturas')
OUT = os.path.join(BASE, 'testes', 'capturas-delta.json')

rows = []
for root, _, files in os.walk(NEW):
    for name in sorted(files):
        if not name.endswith('.png'):
            continue
        newp = os.path.join(root, name)
        rel = os.path.relpath(newp, NEW)
        oldp = os.path.join(OLD, rel)
        if not os.path.exists(oldp):
            continue
        a = Image.open(oldp).convert('RGB')
        b = Image.open(newp).convert('RGB')
        same_size = a.size == b.size
        if same_size:
            diff = ImageChops.difference(a, b)
            bbox = diff.getbbox()
            if bbox is None:
                pct = 0.0
            else:
                hist = diff.convert('L').histogram()
                changed = sum(hist[1:])
                pct = round(100.0 * changed / (a.size[0] * a.size[1]), 4)
        else:
            bbox = None
            pct = None
        rows.append({
            'file': rel.replace(os.sep, '/'),
            'old': {'w': a.size[0], 'h': a.size[1]},
            'new': {'w': b.size[0], 'h': b.size[1]},
            'sameDimensions': same_size,
            'identical': same_size and pct == 0.0,
            'diffPercent': pct,
            'diffBBox': list(bbox) if bbox else None,
        })

summary = {
    'total': len(rows),
    'identical': sum(1 for r in rows if r['identical']),
    'textOnlyOrSmall': sum(1 for r in rows if not r['identical'] and r['sameDimensions'] and (r['diffPercent'] or 0) <= 1.0),
    'larger': sum(1 for r in rows if not r['identical'] and r['sameDimensions'] and (r['diffPercent'] or 0) > 1.0),
    'dimensionChanged': sum(1 for r in rows if not r['sameDimensions']),
    'maxDiffPercent': max([r['diffPercent'] for r in rows if r['diffPercent'] is not None] or [0]),
}
json.dump({'generatedAt': __import__('datetime').datetime.now().astimezone().isoformat(),
           'oldDir': OLD, 'newDir': NEW, 'summary': summary, 'rows': rows},
          open(OUT, 'w'), indent=2, ensure_ascii=False)
print(json.dumps(summary, ensure_ascii=False))
for r in rows:
    print(r['file'], r['old'], '->', r['new'], r['diffPercent'])
