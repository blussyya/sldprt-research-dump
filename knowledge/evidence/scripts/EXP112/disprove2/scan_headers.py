"""Signature-agnostic scan for local- and central-header-shaped blocks, and a test of whether
any of them outside the directory describes a valid stream.

Two shapes per record kind:
  strict : the constant fields the real records carry (ver 20, flags 6, method 8)
  loose  : only method in {0, 8} plus sane lengths (name 1..1024, extra <= 1024, data inside file)
A block is a *valid stream* when its data inflates (method 8) or is stored (method 0) to exactly the
declared size and the CRC-32 matches, with csize > 0 (empty streams counted apart).

Usage: python3 scan_headers.py [inventory.json | file ...]  -> scan_headers.json + summary
"""
import sys, os, json, struct, zlib
from collections import Counter
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import zip8
import check_all


def valid_stream(data, ds, meth, csz, usz, crc):
    n = len(data)
    if ds < 0 or ds + csz > n:
        return False, 'oob'
    blob = data[ds:ds + csz]
    if meth == 8:
        ok, out, unused, err = zip8.inflate_exact(blob)
        if not ok:
            return False, 'inflate:' + (err or 'no end')
        if unused:
            return False, f'unused {unused}'
    elif meth == 0:
        out = blob
    else:
        return False, 'method'
    if len(out) != usz:
        return False, f'size {len(out)} != {usz}'
    if zlib.crc32(out) & 0xFFFFFFFF != crc:
        return False, 'crc'
    return True, 'ok'


def scan_file(path):
    data = open(path, 'rb').read()
    n = len(data)
    base = check_all.check_file(path)          # real directory, from my walker
    res = {'path': path, 'size': n}
    if base.get('verdict') not in ('ok', 'FAIL') or 'eoc' not in base:
        res['skip'] = base.get('verdict'); return res
    w = zip8.walk(data, base['eoc'], 8)
    real_loc = {e['loc_pos'] for e in w['entries']}
    real_cen = {e['cen_pos'] for e in w['entries']}
    real_data = [(e['data_start'], e['data_end']) for e in w['entries']]
    real_names = {bytes.fromhex(e['rawname']) for e in w['entries']}
    real_by_name = {bytes.fromhex(e['rawname']): e for e in w['entries']}
    loc_sig = bytes.fromhex(w['loc_sigs'][0]); cen_sig = bytes.fromhex(w['cen_sigs'][0])

    first_loc = min(real_loc); last_end = max(b for a, b in real_data)
    cd_start = 8 + w['cdoff']; eoc = base['eoc']

    def zone(p):
        return ('before_first' if p < first_loc else 'streams' if p < last_end else
                'streams_to_cd' if p < cd_start else 'cd' if p < w['cd_end'] else
                'cd_slack' if p < eoc else 'end' if p < eoc + 22 else 'after_end')

    def inside_real_data(p):
        return any(a <= p < b for a, b in real_data)

    u16 = zip8._u16_all(data)
    qs = np.arange(0, n - 30, dtype=np.int64)
    # ---- local-header shapes ----
    strict_l = qs[(u16[qs + 4] == 20) & (u16[qs + 6] == 6) & (u16[qs + 8] == 8)]
    loose_l = qs[((u16[qs + 8] == 8) | (u16[qs + 8] == 0)) & (u16[qs + 26] >= 1) &
                 (u16[qs + 26] <= 1024) & (u16[qs + 28] <= 1024)]
    loc_rows = []
    for shape, arr in (('strict', strict_l), ('loose', loose_l)):
        for h in arr.tolist():
            sig, ver, fl, meth, tm, dt, crc, csz, usz, nl, el = zip8.LOC.unpack_from(data, h)
            ds = h + 30 + nl + el
            if shape == 'loose' and (ds + csz > n):
                continue
            ok, why = valid_stream(data, ds, meth, csz, usz, crc)
            row = {'h': h, 'shape': shape, 'real': h in real_loc, 'sig': sig.hex(),
                   'sig_is_loc': sig == loc_sig, 'ver': ver, 'flags': fl, 'meth': meth,
                   'crc': crc, 'csize': csz, 'usize': usz, 'nlen': nl, 'elen': el,
                   'valid': ok, 'why': why, 'in_real_data': inside_real_data(h),
                   'alias_of_real_cen': (h - 2) in real_cen, 'zone': zone(h)}
            if shape == 'strict' or ok:
                raw = data[h + 30:h + 30 + nl]
                row['name'] = zip8.unrotate(raw, 4).decode('latin1') if zip8.rotations_that_print(raw) else None
                row['name_is_real'] = raw in real_names
                if raw in real_by_name:
                    re_ = real_by_name[raw]
                    row['same_fields_as_real'] = (re_['crc'], re_['csize'], re_['usize']) == (crc, csz, usz)
                loc_rows.append(row)
    # ---- central-header shapes (strict only; loose central would be every 46-byte window) ----
    # The 6-byte run 14 00 06 00 08 00 marks a local header at x-4 or a central record at x-6, so
    # a local-shaped hit at h is also a central-shaped hit at h-2. Each run is one block; below it
    # is read both ways and tagged by what owns it.
    strict_c = qs[(u16[qs + 6] == 20) & (u16[qs + 8] == 6) & (u16[qs + 10] == 8)]
    cen_rows = []
    for c in strict_c.tolist():
        if c + 46 > n:
            continue
        f = zip8.CEN.unpack_from(data, c)
        sig, crc, csz, usz, nl, lho = f[0], f[7], f[8], f[9], f[10], f[16]
        row = {'c': c, 'real': c in real_cen, 'alias_of_real_local': (c + 2) in real_loc,
               'sig': sig.hex(), 'sig_is_cen': sig == cen_sig,
               'crc': crc, 'csize': csz, 'usize': usz, 'nlen': nl, 'lhoff': lho,
               'in_cd_slack': w['cd_end'] <= c < base['eoc'],
               'zone': zone(c)}
        raw = data[c + 46:c + 46 + nl]
        row['name'] = zip8.unrotate(raw, 4).decode('latin1') if (nl and zip8.rotations_that_print(raw)) else None
        # does its local offset point at a local header, from byte 8 or byte 0?
        for b in (8, 0):
            lp = b + lho
            hit = None
            if 0 <= lp and lp + 30 <= n:
                lf = zip8.LOC.unpack_from(data, lp)
                if (lf[6], lf[7], lf[8]) == (crc, csz, usz):
                    ok, why = valid_stream(data, lp + 30 + lf[9] + lf[10], lf[3], csz, usz, crc)
                    hit = {'lp': lp, 'real_loc': lp in real_loc, 'valid': ok}
            row[f'points_b{b}'] = hit
        cen_rows.append(row)
    res['loc'] = loc_rows
    res['cen'] = cen_rows
    res['n_real'] = len(w['entries'])
    return res


def summarise(results):
    S = Counter()
    notes = []
    for r in results:
        if 'skip' in r:
            S['skipped'] += 1; continue
        S['files'] += 1
        for x in r['loc']:
            k = x['shape']
            S[f'loc_{k}_blocks'] += 1
            S[f'loc_{k}_{"real" if x["real"] else "alias_of_real_central" if x["alias_of_real_cen"] else "other"}'] += 1
            if not x['real'] and x['valid']:
                tag = 'empty' if x['csize'] == 0 or x['usize'] == 0 else 'nonempty'
                S[f'loc_{k}_other_VALID_{tag}'] += 1
                if tag == 'nonempty':
                    notes.append((os.path.basename(r['path']), 'loc', x))
            if x['shape'] == 'strict' and not x['real'] and not x['alias_of_real_cen']:
                S['filler_loc_zone_' + x['zone']] += 1
                S['filler_loc_sig_is_file_loc_sig'] += x['sig_is_loc']
                S['filler_loc_in_real_data'] += x['in_real_data']
                S['filler_loc_name_printable'] += x.get('name') is not None
                S['filler_loc_name_is_real_name'] += bool(x.get('name_is_real'))
                S['filler_loc_same_fields_as_real'] += bool(x.get('same_fields_as_real'))
        for x in r['cen']:
            S['cen_strict_blocks'] += 1
            S[f'cen_strict_{"real" if x["real"] else "alias_of_real_local" if x["alias_of_real_local"] else "other"}'] += 1
            if not x['real'] and not x['alias_of_real_local']:
                S['filler_cen_zone_' + x['zone']] += 1
                S['filler_cen_in_cd_slack'] += x['in_cd_slack']
                S['filler_cen_sig_is_file_cen_sig'] += x['sig_is_cen']
                for b in (8, 0):
                    if x[f'points_b{b}']:
                        S[f'filler_cen_points_to_matching_local_b{b}'] += 1
                        notes.append((os.path.basename(r['path']), f'cen->b{b}', x))
    return S, notes


def main():
    args = sys.argv[1:] or [os.path.join(HERE, 'inventory.json')]
    if args[0].endswith('.json'):
        inv = json.load(open(args[0]))
        files = [x['path'] for x in inv if x['kind'] == 'modern' and x['head8'][8:] == '00000004']
        out = os.path.join(HERE, 'scan_headers.json')
    else:
        files = args; out = None
    results = []
    for p in files:
        r = scan_file(p)
        results.append(r)
        nv = sum(1 for x in r.get('loc', []) if not x['real'] and x['valid'] and x['csize'] and x['usize'])
        print(f"{os.path.basename(p)[:50]:50} strictL={sum(x['shape']=='strict' for x in r.get('loc', []))} "
              f"looseValid={sum(x['shape']=='loose' and x['valid'] for x in r.get('loc', []))} "
              f"cen={len(r.get('cen', []))} outsideValidNonEmpty={nv}", flush=True)
    if out:
        json.dump(results, open(out, 'w'))
    S, notes = summarise(results)
    for k in sorted(S):
        print(k, S[k])
    print('notes (first 30):')
    for t in notes[:30]:
        print(' ', t)
    return results


if __name__ == '__main__':
    main()
