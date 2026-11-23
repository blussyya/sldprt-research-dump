"""The positions that pass the bare position rule but are not end-record-shaped (base 8 and base 0):
read them as filler local headers (sig 2 bytes earlier for base 8) and show the field arithmetic."""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import zip8
for r in json.load(open(os.path.join(HERE, 'check_all.json'))):
    if r['b4_7'] != '00000004':
        continue
    d = open(r['path'], 'rb').read()
    for base, hits in ((8, r['end8_not_shaped']), (0, r['end0'])):
        for q in hits:
            f = zip8.END.unpack_from(d, q)
            # find the 14 00 06 00 08 00 run that owns these bytes
            x = d.rfind(b'\x14\x00\x06\x00\x08\x00', max(0, q - 30), q + 10)
            h = x - 4
            L = zip8.LOC.unpack_from(d, h)
            print(f"{os.path.basename(r['path'])[:34]:34} base {base} q={q} disk={f[1]} cdisk={f[2]} cdsize={f[5]} cdoff={f[6]} "
                  f"| filler local at {h}: sig {L[0].hex()} crc {L[6]} csize {L[7]} usize {L[8]} (crc==2*usize {L[6]==2*L[8]}) "
                  f"| in gap: {any(a <= h < b for a, b in r['gaps'])}")
