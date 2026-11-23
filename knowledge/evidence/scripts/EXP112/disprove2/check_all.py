"""Walk every modern file with my own reader (zip8.py) and test each part of the claim.

Usage: python3 check_all.py [inventory.json | file ...]  -> check_all.json + printed summary
"""
import sys, os, json, struct, zlib
from collections import Counter
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import zip8

PK = {'loc': b'PK\x03\x04', 'cen': b'PK\x01\x02', 'end': b'PK\x05\x06'}


def xor4(a, b):
    return bytes(x ^ y for x, y in zip(a, b))


def check_file(path):
    data = open(path, 'rb').read()
    n = len(data)
    r = {'path': path, 'size': n, 'key': data[:4].hex(), 'b4_7': data[4:8].hex()}
    r['end8'] = zip8.end_candidates(data, 8)
    r['end0'] = zip8.end_candidates(data, 0)
    shaped = zip8.end_shaped(data)
    r['n_end_shaped'] = len(shaped)
    r['end_shaped_sigs'] = Counter(data[q:q + 4].hex() for q in shaped).most_common()
    # every end-shaped block: does it pass the rule, and does walking it (base 0 or 8) give
    # any fully valid entry? A filler block that also yields valid entries would be a decoy dir.
    decoys = []
    for q in shaped:
        for base in (8, 0):
            if q in r['end8'] and base == 8:   # the real one, walked below
                continue
            w = zip8.walk(data, q, base)
            good = sum(zip8.entry_ok(e) for e in w['entries'])
            if good:
                decoys.append({'q': q, 'base': base, 'good': good, 'n': w['ntotal']})
    r['decoy_dirs_with_valid_entries'] = decoys
    r['end8_shaped'] = [q for q in r['end8'] if q in set(shaped)]
    r['end8_not_shaped'] = [q for q in r['end8'] if q not in set(shaped)]
    if len(r['end8_shaped']) != 1:
        r['verdict'] = f'end8 shaped hits = {len(r["end8_shaped"])}'
        return r
    eoc = r['end8_shaped'][0]
    w = zip8.walk(data, eoc, 8)
    ents = w['entries']
    r['end_sig'] = w['end_sig']
    r['eoc'] = eoc
    r['end_comment_len'] = w['end_comment_len']
    r['n_entries'] = w['ntotal']
    r['cdoff'] = w['cdoff']; r['cdsize'] = w['cdsize']
    r['cd_start'] = 8 + w['cdoff']; r['cd_end_walked'] = w['cd_end']
    r['cd_walked_bytes'] = w['cd_bytes_walked']
    r['cd_slack_before_end'] = eoc - w['cd_end']     # bytes inside cdsize that are not central records
    r['problems'] = w['problems']
    r['cen_sigs'] = w['cen_sigs']; r['loc_sigs'] = w['loc_sigs']
    r['n_ok'] = sum(zip8.entry_ok(e) for e in ents)
    r['bad'] = [{k: e.get(k) for k in ('i', 'rawname', 'err', 'inflate_end', 'inflate_err', 'unused',
                                       'size_ok', 'crc_ok', 'cen_loc_mismatch')}
                for e in ents if not zip8.entry_ok(e)]
    rots = Counter(tuple(e['rots']) for e in ents)
    r['rot_sets'] = [[list(k), v] for k, v in rots.items()]
    names = [zip8.unrotate(bytes.fromhex(e['rawname']), data[7] & 7) for e in ents]
    r['names'] = [nm.decode('latin1') for nm in names]
    r['dup_names'] = [k.decode('latin1') for k, v in Counter(names).items() if v > 1]
    r['dup_raw'] = [k for k, v in Counter(e['rawname'] for e in ents).items() if v > 1]
    offs = [e['lhoff'] for e in ents]
    r['offsets_increasing'] = all(a < b for a, b in zip(offs, offs[1:]))
    r['n_order_breaks'] = sum(1 for a, b in zip(offs, offs[1:]) if a >= b)
    spans = sorted((e['loc_pos'], e.get('data_end', e['loc_pos'] + 30)) for e in ents)
    r['n_overlaps'] = sum(1 for (a0, a1), (b0, b1) in zip(spans, spans[1:]) if b0 < a1)
    r['fields'] = {
        'vmade': Counter(e['vmade'] for e in ents).most_common(),
        'vneed': Counter(e['vneed'] for e in ents).most_common(),
        'flags': Counter(e['flags'] for e in ents).most_common(),
        'method': Counter(e['method'] for e in ents).most_common(),
        'timedate': Counter((e['time'], e['date']) for e in ents).most_common(3),
        'celen': Counter(e['celen'] for e in ents).most_common(),
        'cclen': Counter(e['cclen'] for e in ents).most_common(),
        'loc_elen': Counter(e.get('loc_elen') for e in ents).most_common(),
        'disk': Counter(e['disk'] for e in ents).most_common(),
        'iattr': Counter(e['iattr'] for e in ents).most_common(),
        'eattr': Counter(e['eattr'] for e in ents).most_common(),
        'zero_usize': sum(1 for e in ents if e['usize'] == 0),
    }
    # base-0 test: for each entry, does lhoff counted from byte 0 also land on a matching local header?
    b0 = 0
    for e in ents:
        lp = e['lhoff']
        if lp + 30 <= n:
            f = zip8.LOC.unpack_from(data, lp)
            if f[6] == e['crc'] and f[7] == e['csize'] and f[8] == e['usize']:
                b0 += 1
    r['entries_matching_from_byte0'] = b0
    # coverage map: which bytes are owned by the real structure, which are filler
    owned = [(0, 8, 'hdr')]
    for e in ents:
        owned.append((e['loc_pos'], e.get('data_end', e['loc_pos'] + 30), 'loc'))
    owned.append((r['cd_start'], w['cd_end'], 'cen'))
    owned.append((eoc, eoc + 22 + w['end_comment_len'], 'end'))
    owned.sort()
    gaps = []
    pos = 0
    for a, b, t in owned:
        if a > pos:
            gaps.append((pos, a))
        pos = max(pos, b)
    if pos < n:
        gaps.append((pos, n))
    r['gaps'] = gaps
    r['filler_bytes'] = sum(b - a for a, b in gaps)
    first_loc = min(e['loc_pos'] for e in ents)
    last_dend = max(e.get('data_end', 0) for e in ents)
    r['gap_where'] = Counter(
        'before_first' if b <= first_loc else
        'between_streams' if b <= last_dend else
        'streams_to_cd' if b <= r['cd_start'] else
        'cd_to_end' if b <= eoc else 'after_end' for a, b in gaps).most_common()
    r['n_entries_followed_by_gap'] = sum(1 for e in ents
                                         if any(a == e.get('data_end') for a, b in gaps))
    # signature relations
    key = data[:4]
    rel = {}
    for t, s in (('loc', w['loc_sigs']), ('cen', w['cen_sigs']), ('end', [w['end_sig']])):
        if len(s) == 1:
            sb = bytes.fromhex(s[0])
            rel[t + '^PK'] = xor4(sb, PK[t]).hex()
            rel[t + '^PK^key'] = xor4(xor4(sb, PK[t]), key).hex()
    r['sig_rel'] = rel
    r['verdict'] = 'ok' if (r['n_ok'] == r['n_entries'] and not r['dup_names'] and
                            r['offsets_increasing'] and not r['problems'] and r['n_overlaps'] == 0
                            and len(w['cen_sigs']) == 1 and len(w['loc_sigs']) == 1) else 'FAIL'
    return r


def main():
    args = sys.argv[1:] or [os.path.join(HERE, 'inventory.json')]
    if args[0].endswith('.json'):
        inv = json.load(open(args[0]))
        files = [(x['group'], x['path']) for x in inv if x['kind'] == 'modern']
        out_name = 'check_all.json'
    else:
        files = [('arg', a) for a in args]
        out_name = None
    results = []
    for g, p in files:
        r = check_file(p)
        r['group'] = g
        results.append(r)
        print(f"{r['verdict']:5} e8={len(r['end8'])} e0={len(r['end0'])} shaped={r['n_end_shaped']:3} "
              f"n={r.get('n_entries', '-'):>4} ok={r.get('n_ok', '-'):>4} slack={r.get('cd_slack_before_end', '-')} "
              f"filler={r.get('filler_bytes', '-')} {os.path.relpath(p, '/home/user/sldprt-research-dump')}",
              flush=True)
    if out_name:
        json.dump(results, open(os.path.join(HERE, out_name), 'w'), indent=1)
    return results


if __name__ == '__main__':
    main()
