"""How often does each of the file's three signatures occur in the file, versus the number of
real records that carry it? Also: do filler end-shaped blocks ever carry the real end signature?"""
import json, os
from collections import Counter
HERE = os.path.dirname(os.path.abspath(__file__))
C = [r for r in json.load(open(os.path.join(HERE, 'check_all.json'))) if r['b4_7'] == '00000004']
T = Counter()
for r in C:
    d = open(r['path'], 'rb').read()
    for t, s, want in (('loc', r['loc_sigs'][0], r['n_entries']), ('cen', r['cen_sigs'][0], r['n_entries']),
                       ('end', r['end_sig'], 1)):
        n = d.count(bytes.fromhex(s))
        T[f'{t}: occurrences == real records'] += n == want
        T[f'{t}: occurrences > real records'] += n > want
    sh = dict(r['end_shaped_sigs'])
    T['end-shaped blocks carrying the real end sig more than once'] += sh.get(r['end_sig'], 0) > 1
    T['key bytes 0-3 occur again in the file'] += d.count(d[:4]) > 1
print(len(C), 'files'); [print(' ', k, v) for k, v in sorted(T.items())]
