"""Look harder at raw-deflate hits that start outside the directory (filler and record bytes),
for streams too small to beat the chance ceiling: does any hit's output equal a real stream's
content (same length and CRC), or read as text?"""
import json, os, sys, zlib
from collections import Counter
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import zip8, classify_deflate as cd
W = {r['path']: r for r in json.load(open(os.path.join(HERE, 'check_all.json')))}
idx = [l.rstrip('\n').split('\t') for l in open(os.path.join(HERE, 'deflate_hits', 'index.tsv'))]
real = set()
for fid, p in idx:
    d = open(p, 'rb').read()
    for e in zip8.walk(d, W[p]['eoc'], 8)['entries']:
        if e['usize']:
            real.add((e['usize'], e['crc']))
T = Counter(); ex = []
for fid, p in idx:
    d = open(p, 'rb').read()
    hits = cd.load_hits(os.path.join(HERE, 'deflate_hits', fid + '.txt'))
    rows, _, _ = cd.classify_file(p, hits, W[p])
    for (o, used, n, crc), (_, _, _, cls, flag) in zip(hits, rows):
        if cls not in ('filler', 'filler_crossing', 'struct'):
            continue
        T['hits_outside'] += 1
        if (n, crc) in real:
            T['output_equals_some_real_stream'] += 1; ex.append(('copy', os.path.basename(p), o, used, n))
        if n >= 16:
            out = zlib.decompressobj(-15).decompress(d[o:o + used])
            pr = sum(32 <= c < 127 or c in (9, 10, 13) for c in out) / len(out)
            if pr >= 0.95 and len(set(out)) >= 10:   # not a one-literal run
                T['output_95pct_printable_len>=16_10distinct'] += 1
                ex.append(('text', os.path.basename(p), o, used, n, out[:60]))
print(dict(T))
for x in ex[:20]:
    print(' ', x)
