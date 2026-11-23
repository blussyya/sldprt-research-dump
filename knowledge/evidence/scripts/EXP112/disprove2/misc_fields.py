"""Small entries and empty entries: how much of the corpus sits below the raw-scan chance ceiling (90 bytes)."""
import json, os, sys
from collections import Counter
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import zip8
C = [r for r in json.load(open(os.path.join(HERE, 'check_all.json'))) if r['b4_7'] == '00000004']
cs = Counter(); small = tot = 0
for r in C:
    d = open(r['path'], 'rb').read()
    for e in zip8.walk(d, r['eoc'], 8)['entries']:
        tot += 1
        if e['usize'] == 0: cs[e['csize']] += 1
        elif e['csize'] <= 90: small += 1
print('csize of empty (usize 0) entries:', dict(cs))
print('non-empty entries with csize <= 90 (below the raw-scan chance ceiling):', small, 'of', tot)
