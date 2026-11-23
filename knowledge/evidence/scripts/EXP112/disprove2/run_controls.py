"""Run every check on the control files from make_controls.py and say whether each one caught its plant.

Random-data baseline (baseline_random.out): a chance raw-deflate hit consumes at most 90 bytes, so a
raw hit consuming more than 90 bytes outside the directory is counted as a found stream.
"""
import os, sys, json, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import check_all, scan_headers, classify_deflate

CHANCE_MAX_IN = 90
M = json.load(open(os.path.join(HERE, 'controls', 'manifest.json')))
SRC = '/home/user/sldprt-research-dump/test files new/SW2022/C00_cube_10mm/model.SLDPRT'
rows = []


def outside_valid_headers(path):
    r = scan_headers.scan_file(path)
    if 'skip' in r:
        return None
    return [(x['h'], x['shape'], x['csize']) for x in r['loc']
            if not x['real'] and x['valid'] and x['csize'] > 0 and x['usize'] > 0]


def raw_outside(path, c):
    out = subprocess.run([os.path.join(HERE, 'deflate_scan'), path, '1'], capture_output=True, text=True).stdout
    hits = [(int(a), int(b), int(n), int(crc, 16)) for a, b, n, crc, _ in (l.split() for l in out.splitlines())]
    cls_rows, n_ne, missed = classify_deflate.classify_file(path, hits, c)
    big = [(o, used, n, cls) for o, used, n, cls, flag in cls_rows
           if cls in ('filler', 'filler_crossing', 'struct') and not flag and used > CHANCE_MAX_IN]
    return big, missed


for path_tag in [{'tag': 'C0_unmodified', 'path': SRC, 'expect': {'kind': 'none'}}] + M:
    tag, p, ex = path_tag['tag'], path_tag['path'], path_tag['expect']
    c = check_all.check_file(p)
    res = {'tag': tag, 'verdict': c['verdict'], 'end8': c['end8'], 'end8_shaped': c.get('end8_shaped'),
           'end0': c['end0'], 'n': c.get('n_entries'), 'ok': c.get('n_ok'), 'bad': c.get('bad'),
           'dup': c.get('dup_names'), 'order_ok': c.get('offsets_increasing')}
    if 'eoc' in c:
        res['hdr_outside'] = outside_valid_headers(p)
        res['raw_outside'], res['raw_missed_real'] = raw_outside(p, c)
    k = ex['kind']
    if k == 'none':
        caught = res['verdict'] == 'ok' and not res['hdr_outside'] and not res['raw_outside']
        res['result'] = 'clean (as expected)' if caught else 'NOT CLEAN'
    elif k in ('local', 'local_loose'):
        got_h = any(h == ex['pos'] for h, s, cs in res['hdr_outside'])
        got_r = any(o == ex['pos'] + 30 + len('Contents/Planted') for o, *_ in res['raw_outside'])
        res["result"] = (f"header scan caught: {got_h}; raw scan caught: {got_r}"
                         + (" (not expected: stored data is not deflate)" if k == "local_loose" else "")
                         + f"; directory walk still ok: {res['verdict'] == 'ok'}")
    elif k == 'raw':
        got_r = any(o == ex['pos'] for o, *_ in res['raw_outside'])
        res['result'] = f"raw scan caught: {got_r}; header scan (should not, no header): {bool(res['hdr_outside'])}"
    elif k == 'bad_entry':
        res['result'] = f"walk flags bad entry: {bool(res['bad'])} -> {res['bad']}"
    elif k == 'dup':
        res['result'] = f"duplicate name flagged: {bool(res['dup'])}; order break flagged: {res['order_ok'] is False}"
    elif k == 'base0':
        res['result'] = f"base-8 rule finds nothing: {not res['end8_shaped']}; base-0 rule hits: {res['end0']}"
    elif k == 'two_ends':
        res['result'] = f"two shaped end records pass: {res['end8_shaped']}"
    elif k == 'registered':
        res['result'] = (f"walker lists it: n={res['n']} ok={res['ok']}; header scan calls it outside: "
                         f"{any(h == ex['pos'] for h, s, cs in res['hdr_outside'])}; order break flagged: {res['order_ok'] is False}")
    rows.append(res)
    print(f"{tag:22} verdict={res['verdict']:28} {res['result']}")
json.dump(rows, open(os.path.join(HERE, 'run_controls.json'), 'w'), indent=1, default=str)
