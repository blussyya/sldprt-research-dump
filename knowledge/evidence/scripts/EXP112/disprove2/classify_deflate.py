"""Classify every raw-deflate hit from deflate_scan (deflate_hits/*.txt) against my directory walk.

Classes (by the hit's start offset o):
  real_start   o is the data start of a directory entry
  nested       o is inside an entry's compressed data AND the hit's input bytes appear verbatim
               in that entry's inflated content (data stored inside a stored block, e.g. a PNG)
  interior     o is inside an entry's compressed data, not nested: a chance decode of entropy-coded bits
  filler       o is in a gap the directory does not own
  struct       o is in the 8-byte header, a local header or name, the central records or the end record

A hit is 'substantial' when it outputs >= 64 bytes. A 'single stored block' hit is a final stored
block (first byte & 7 == 1) whose LEN/NLEN check passes: random bytes pass that check about once
per 2^19 offsets, so those are expected by chance and reported apart.

Usage: python3 classify_deflate.py [hits_dir]   (default deflate_hits/)
"""
import sys, os, json, struct, zlib, bisect
from collections import Counter
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import zip8, check_all


def single_stored(data, o, used, out_len):
    if data[o] & 7 != 1 or o + 5 > len(data):
        return False
    ln, nl = struct.unpack_from('<HH', data, o + 1)
    return ln ^ nl == 0xFFFF and used == 5 + ln and out_len == ln


def classify_file(path, hits, walkres=None):
    data = open(path, 'rb').read()
    c = walkres or check_all.check_file(path)
    w = zip8.walk(data, c['eoc'], 8)
    ents = w['entries']
    starts = {e['data_start']: e for e in ents}
    rng = sorted(((e['data_start'], e['data_end'], e) for e in ents), key=lambda t: (t[0], t[1]))
    rstarts = [a for a, b, e in rng]
    gaps = c['gaps']
    inflated = {}

    def content(e):
        if e['i'] not in inflated:
            inflated[e['i']] = zip8.inflate_exact(data[e['data_start']:e['data_end']])[1]
        return inflated[e['i']]

    rows = []
    found_real = set()
    for o, used, out_len, crc in hits:
        if o in starts:
            e = starts[o]
            cls = 'real_start'
            exact = (used == e['csize'] and out_len == e['usize'] and crc == e['crc'])
            if exact:
                found_real.add(e['i'])
            rows.append((o, used, out_len, cls, exact))
            continue
        k = bisect.bisect_right(rstarts, o) - 1
        if k >= 0 and rng[k][0] < o < rng[k][1]:
            e = rng[k][2]
            ce = content(e)
            if o + used == e['data_end'] and out_len <= len(ce) and \
                    zlib.crc32(ce[len(ce) - out_len:]) & 0xFFFFFFFF == crc:
                cls = 'tail'          # a later block of the real stream, decoded to the real end
            elif o + used == e['data_end']:
                cls = 'tail_resync'   # chance start that falls into step with the real stream's bits
            elif data[o:o + used] in ce:
                cls = 'nested'
            else:
                cls = 'interior'
        elif any(a <= o < b for a, b in gaps):
            g = [(a, b) for a, b in gaps if a <= o < b][0]
            cls = 'filler' if o + used <= g[1] else 'filler_crossing'
        else:
            cls = 'struct'
        rows.append((o, used, out_len, cls, single_stored(data, o, used, out_len)))
    nonempty = [e for e in ents if e['csize'] > 0 and e['usize'] > 0]
    missed = [e['i'] for e in nonempty if e['i'] not in found_real]
    return rows, len(nonempty), missed


def load_hits(fn):
    out = []
    for line in open(fn):
        o, used, n, crc, fb = line.split()
        out.append((int(o), int(used), int(n), int(crc, 16)))
    return out


def main():
    hd = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'deflate_hits')
    idx = [l.rstrip('\n').split('\t') for l in open(os.path.join(hd, 'index.tsv'))]
    cj = os.path.join(HERE, 'check_all.json')
    W = {r['path']: r for r in json.load(open(cj))} if os.path.exists(cj) and hd.endswith('deflate_hits') else {}
    T = Counter()
    worst = []
    report = []
    for fid, path in idx:
        hits = load_hits(os.path.join(hd, fid + '.txt'))
        rows, n_nonempty, missed = classify_file(path, hits, W.get(path))
        T['files'] += 1
        T['entries_nonempty'] += n_nonempty
        T['real_found_exact'] += n_nonempty - len(missed)
        T['real_missed'] += len(missed)
        for o, used, out_len, cls, flag in rows:
            T[f'hits_{cls}'] += 1
            if cls != 'real_start':
                if not flag:
                    T[f'maxin_{cls}'] = max(T.get(f'maxin_{cls}', 0), used)
                    if used >= 32:
                        T[f'in32_{cls}'] += 1
                if out_len >= 64:
                    T[f'subst_{cls}'] += 1
                    if flag:
                        T[f'subst_{cls}_single_stored'] += 1
                    elif cls in ('filler', 'filler_crossing', 'struct'):
                        worst.append((out_len, used, cls, o, os.path.basename(path)))
        mx = {}
        for o, used, out_len, cls, flag in rows:
            if cls in ('filler', 'filler_crossing', 'struct') and not flag:
                mx[cls] = max(mx.get(cls, 0), out_len)
        report.append({'path': path, 'missed_real': missed,
                       'max_out_filler': max(mx.get('filler', 0), mx.get('filler_crossing', 0)),
                       'max_out_struct': mx.get('struct', 0)})
    for k in sorted(T):
        if k.startswith('maxin_'):
            continue
        print(k, T[k])
    print('largest input consumed by a non-stored hit, per class:',
          {k[6:]: v for k, v in T.items() if k.startswith('maxin_')})
    worst.sort(reverse=True)
    print('largest non-stored hits outside real stream starts (out, in, class, offset, file):')
    for x in worst[:25]:
        print('  ', x)
    fill = [r['max_out_filler'] for r in report]
    print('max output of any filler-start hit, over all files:', max(fill))
    print('files where a real non-empty entry was not found by the blind scan:',
          [(os.path.basename(r['path']), r['missed_real']) for r in report if r['missed_real']])
    json.dump({'totals': T, 'worst': worst[:200], 'per_file': report},
              open(os.path.join(hd, 'classified.json'), 'w'), indent=1)


if __name__ == '__main__':
    main()
