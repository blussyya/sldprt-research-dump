"""Files that share bytes 0-3: do they also share the three signatures and the filler?
Compares, per pair, the sequence of filler-block signatures and filler field values."""
import json, os
from collections import defaultdict
HERE = os.path.dirname(os.path.abspath(__file__))
C = [r for r in json.load(open(os.path.join(HERE, 'check_all.json'))) if r['b4_7'] == '00000004']
S = {r['path']: r for r in json.load(open(os.path.join(HERE, 'scan_headers.json')))}
by = defaultdict(list)
for r in C:
    by[r['key']].append(r)
def filler(path):
    return [(x['sig'], x['csize'], x['usize'], x['crc']) for x in S[path]['loc']
            if x['shape'] == 'strict' and not x['real'] and not x['alias_of_real_cen']]
pairs = [v for v in by.values() if len(v) > 1]
print('distinct keys', len(by), 'files', len(C), 'keys shared by 2+ files', len(pairs),
      'files involved', sum(len(v) for v in pairs))
n_same_sigs = 0
for v in pairs:
    a, b = v[0], v[1]
    same = (a['loc_sigs'], a['cen_sigs'], a['end_sig']) == (b['loc_sigs'], b['cen_sigs'], b['end_sig'])
    n_same_sigs += same
    fa, fb = filler(a['path']), filler(b['path'])
    k = 0
    while k < min(len(fa), len(fb)) and fa[k][0] == fb[k][0]:
        k += 1
    print(a['key'], 'sigs equal:', same, '| filler blocks', len(fa), len(fb), 'leading filler sigs equal:', k,
          '| any filler sig shared:', len({x[0] for x in fa} & {x[0] for x in fb}),
          '|', os.path.basename(a['path'])[:28], '/', os.path.basename(b['path'])[:28])
print('pairs with all three record signatures equal:', n_same_sigs, 'of', len(pairs))
# expected number of shared keys if keys were uniform 32-bit
n = len(C)
print('expected shared pairs for uniform 32-bit keys: %.2e' % (n * (n - 1) / 2 / 2**32))
print('key-space size that would give this many pairs: ~%d' % (n * (n - 1) / 2 / len(pairs)))
