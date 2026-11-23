"""Chance baseline for deflate_scan: how many raw-deflate 'streams' does random data hold?
Generates 8 MiB from a fixed seed (scratch file, not kept), runs deflate_scan, and reports hits per
byte and the largest input consumed by a hit that is not a single stored block."""
import os, random, subprocess, struct, sys
HERE = os.path.dirname(os.path.abspath(__file__))
tmp = os.environ.get('SCRATCH', '/tmp') + '/exp112_random_8MiB.bin'
rnd = random.Random(112)
data = rnd.randbytes(8 << 20)
open(tmp, 'wb').write(data)
out = subprocess.run([os.path.join(HERE, 'deflate_scan'), tmp, '1'], capture_output=True, text=True).stdout
hits = [tuple(int(x, 16) if i == 3 else (int(x) if i < 3 else x) for i, x in enumerate(l.split())) for l in out.splitlines()]
def stored(o, used, n):
    if data[o] & 7 != 1: return False
    ln, nl = struct.unpack_from('<HH', data, o + 1)
    return ln ^ nl == 0xFFFF and used == 5 + ln
ns = [h for h in hits if not stored(h[0], h[1], h[2])]
print('random bytes:', len(data), 'hits(out>=1):', len(hits), 'per byte: %.5f' % (len(hits) / len(data)))
print('non-stored hits:', len(ns), ' with in>=32:', sum(h[1] >= 32 for h in ns), ' with out>=64:', sum(h[2] >= 64 for h in ns))
print('largest input consumed by a non-stored hit:', max(h[1] for h in ns), ' largest output:', max(h[2] for h in ns))
print('single stored-block hits:', len(hits) - len(ns))
os.remove(tmp)
