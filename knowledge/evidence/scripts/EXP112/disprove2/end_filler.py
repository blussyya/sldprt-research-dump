"""Fields of the filler end-shaped blocks compared with the real end record of the same file:
same entry count? same directory offset? how far does each miss the position rule (by base 8)?"""
import json, os, sys, struct
from collections import Counter
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import zip8
C = [r for r in json.load(open(os.path.join(HERE, 'check_all.json'))) if r['b4_7'] == '00000004']
T = Counter(); miss = []; rel = Counter()
for r in C:
    d = open(r['path'], 'rb').read()
    real = zip8.END.unpack_from(d, r['eoc'])
    for q in zip8.end_shaped(d):
        if q == r['eoc']:
            continue
        f = zip8.END.unpack_from(d, q)
        T['filler_end_blocks'] += 1
        T['same_count'] += f[4] == real[4]
        T['same_cdoff'] += f[6] == real[6]
        T['same_cdsize'] += f[5] == real[5]
        T['before_real'] += q < r['eoc']
        T['after_real'] += q > r['eoc']
        T['clen_0'] += f[7] == 0
        miss.append(q - (8 + f[6] + f[5]))
        rel[('cdoff==real', f[6] == real[6], 'count==real', f[4] == real[4])] += 1
print(dict(T))
print('by (cdoff==real, count==real):', dict(rel))
import statistics
print('miss = position - (8+cdoff+cdsize): min', min(miss), 'max', max(miss), 'median', statistics.median(miss),
      'abs<=64:', sum(abs(m) <= 64 for m in miss), 'abs<=8:', sum(abs(m) <= 8 for m in miss), '==0:', sum(m == 0 for m in miss))
print('misses with base 0 instead (position - (cdoff+cdsize)) == 0:', sum(m + 8 == 0 for m in miss))
