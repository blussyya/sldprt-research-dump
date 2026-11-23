"""List every .sldprt in the in-scope corpus folders, mark OLE vs modern by first 4 bytes."""
import os, sys, json
ROOT = '/home/user/sldprt-research-dump'
SCOPE = ['test files online', 'test files new/SW2022', 'test files new/SW2011', 'test files original']
EXTRA = ['test files new/SW2026', 'test files new/re-exports']
out = []
for group, dirs in (('scope', SCOPE), ('extra', EXTRA)):
    for d in dirs:
        for dp, dn, fn in os.walk(os.path.join(ROOT, d)):
            for f in sorted(fn):
                if not f.lower().endswith('.sldprt'):
                    continue
                p = os.path.join(dp, f)
                with open(p, 'rb') as fh:
                    head = fh.read(8)
                kind = 'ole' if head[:4] == b'\xd0\xcf\x11\xe0' else 'modern'
                out.append({'group': group, 'dir': d, 'path': p, 'size': os.path.getsize(p),
                            'kind': kind, 'head8': head.hex()})
out.sort(key=lambda r: r['path'])
json.dump(out, open(os.path.join(os.path.dirname(__file__), 'inventory.json'), 'w'), indent=1)
from collections import Counter
c = Counter((r['group'], r['dir'], r['kind']) for r in out)
for k, v in sorted(c.items()):
    print(k, v)
b47 = Counter(r['head8'][8:16] for r in out if r['kind'] == 'modern')
print('bytes 4-7 among modern:', dict(b47))
