"""Summarise check_all.json: totals and every deviation from the claim."""
import json, os
from collections import Counter
HERE = os.path.dirname(os.path.abspath(__file__))
R = json.load(open(os.path.join(HERE, 'check_all.json')))
mod = [r for r in R if r['b4_7'] == '00000004']
print('modern files (bytes 4-7 = 00000004):', len(mod), ' other non-OLE files:', len(R) - len(mod))
print('  by group:', Counter(r['group'] for r in mod))
print('bare rule hits (base 8) per file:', Counter(len(r['end8']) for r in mod))
print('bare rule hits (base 0) per file:', Counter(len(r['end0']) for r in mod))
print('shaped end records passing rule per file:', Counter(len(r['end8_shaped']) for r in mod))
for r in mod:
    if r['end8_not_shaped']:
        print('  non-shaped rule hit:', r['end8_not_shaped'], os.path.basename(r['path']))
print('end-shaped blocks per file: min', min(r['n_end_shaped'] for r in mod), 'max', max(r['n_end_shaped'] for r in mod))
print('decoy dirs yielding any valid entry:', sum(len(r['decoy_dirs_with_valid_entries']) for r in mod))
ents = sum(r['n_entries'] for r in mod); ok = sum(r['n_ok'] for r in mod)
print('entries', ents, 'fully ok', ok)
for r in mod:
    if r['bad']: print('  BAD', os.path.basename(r['path']), r['bad'][:3])
print('files with >1 central sig:', sum(len(r['cen_sigs']) != 1 for r in mod), ' >1 local sig:', sum(len(r['loc_sigs']) != 1 for r in mod))
print('files with dup names:', [(os.path.basename(r['path']), r['dup_names']) for r in mod if r['dup_names']])
print('files with offset order breaks:', [(os.path.basename(r['path']), r['n_order_breaks']) for r in mod if not r['offsets_increasing']])
print('files with overlapping records:', sum(r['n_overlaps'] > 0 for r in mod))
print('entries whose lhoff also matches from byte 0:', sum(r['entries_matching_from_byte0'] for r in mod))
print('end comment lengths:', Counter(r['end_comment_len'] for r in mod))
print('cdsize == walked central bytes:', sum(r['cdsize'] == r['cd_walked_bytes'] for r in mod), 'of', len(mod))
sl = [r['cd_slack_before_end'] for r in mod]
print('slack (filler) between last central record and end record, inside cdsize: min', min(sl), 'max', max(sl), 'zero in', sum(s == 0 for s in sl))
print('rotation sets:', Counter(str(x[0]) for r in mod for x in r['rot_sets'] for _ in range(x[1])))
agg = {}
for r in mod:
    for k, v in r['fields'].items():
        if k == 'timedate': continue
        if k == 'zero_usize': agg.setdefault(k, 0); agg[k] += v; continue
        c = agg.setdefault(k, Counter())
        for val, cnt in v: c[val] += cnt
print('field values:', {k: (dict(v) if isinstance(v, Counter) else v) for k, v in agg.items()})
print('gap positions:', sum((Counter(dict((k, v) for k, v in r['gap_where'])) for r in mod), Counter()))
print('files with filler before first stream:', sum(any(k == 'before_first' for k, v in r['gap_where']) for r in mod))
print('files with filler between streams:', sum(any(k == 'between_streams' for k, v in r['gap_where']) for r in mod))
print('files with filler streams->cd:', sum(any(k == 'streams_to_cd' for k, v in r['gap_where']) for r in mod))
print('files with filler cd->end:', sum(any(k == 'cd_to_end' for k, v in r['gap_where']) for r in mod))
print('files with filler after end:', sum(any(k == 'after_end' for k, v in r['gap_where']) for r in mod))
fb = [r['filler_bytes'] for r in mod]
print('filler bytes per file: min', min(fb), 'max', max(fb), 'total', sum(fb))
print('distinct keys:', len(set(r['key'] for r in mod)), ' distinct loc sigs:', len(set(r['loc_sigs'][0] for r in mod)),
      ' cen sigs:', len(set(r['cen_sigs'][0] for r in mod)), ' end sigs:', len(set(r['end_sig'] for r in mod)))
for k in ('loc^PK', 'cen^PK', 'end^PK', 'loc^PK^key', 'cen^PK^key', 'end^PK^key'):
    print('  distinct', k, len(set(r['sig_rel'].get(k) for r in mod)))
same = sum(r['loc_sigs'][0] == r['cen_sigs'][0] or r['cen_sigs'][0] == r['end_sig'] or r['loc_sigs'][0] == r['end_sig'] for r in mod)
print('files where two of the three sigs are equal:', same)
