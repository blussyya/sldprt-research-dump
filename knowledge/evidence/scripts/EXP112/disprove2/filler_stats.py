"""Describe the filler blocks found by scan_headers.py (reads scan_headers.json + check_all.json)."""
import json, os, sys
from collections import Counter
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import zip8
S = json.load(open(os.path.join(HERE, 'scan_headers.json')))
C = {r['path']: r for r in json.load(open(os.path.join(HERE, 'check_all.json')))}
st = Counter()
lho_target = Counter()
loose_other = []
for r in S:
    if 'skip' in r: continue
    c = C[r['path']]
    data = open(r['path'], 'rb').read()
    w = zip8.walk(data, c['eoc'], 8)
    last_lhoff = max(e['lhoff'] for e in w['entries'])
    real_lhoffs = {e['lhoff'] for e in w['entries']}
    cen = {x['c']: x for x in r['cen']}
    for x in r['loc']:
        if x['shape'] == 'loose' and not x['real']:
            loose_other.append((os.path.basename(r['path']), x['h'], x['zone'], x['sig'], x['meth'], x['csize'], x['usize'], x['crc'], x['nlen']))
        if x['shape'] != 'strict' or x['real'] or x['alias_of_real_cen']:
            continue
        st['filler_blocks'] += 1
        cs, us, crc = x['csize'], x['usize'], x['crc']
        st['usize==2*csize'] += us == 2 * cs
        st['usize==2*csize+1'] += us == 2 * cs + 1
        st['crc==2*usize'] += crc == 2 * us
        st['zone_' + x['zone']] += 1
        cx = cen.get(x['h'] - 2)
        if x['zone'] == 'cd_slack':
            st['slack_central_name_printable'] += bool(cx and cx['name'])
            st['slack_central_lhoff_is_last_real'] += bool(cx and cx['lhoff'] == last_lhoff)
            st['slack_central_lhoff_is_some_real'] += bool(cx and cx['lhoff'] in real_lhoffs)
            lho_target[(cx['lhoff'] == last_lhoff) if cx else None] += 1
        else:
            st['local_name_printable'] += x.get('name') is not None
        # the gap that holds this block: how many bytes of 'data' actually follow its name?
print(dict(st))
print('loose-shape valid blocks outside the directory (all empty):')
for t in loose_other: print('  ', t)
