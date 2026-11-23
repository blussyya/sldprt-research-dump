"""Build modified copies of one corpus file (into controls/, never in the corpus) that each scan
must catch. Each control plants one known defect or one known extra stream.

  C1_append_local      valid local record (new random signature, strict shape) appended after EOF
  C1b_append_loose     valid stored (method 0) record, ver 10 flags 0, new signature, appended
  C1c_local_in_filler  valid local record written over the filler before the first real stream
  C2_raw_in_filler     bare raw-deflate stream (no header) written over the same filler
  C3_flip_data         one bit flipped inside entry 4's compressed data
  C4_flip_cen_crc      one bit flipped in central record 2's CRC field
  C5_dup_central       copy of central record 0 written into the directory slack, entry count +1
  C6_base0_offsets     every stored offset rewritten as counted from byte 0 (lhoff+8, cdoff+8)
  C7_second_end        a second end record appended whose cdsize makes it pass the position rule
  C8_hidden_cen        central record for C1c's stream written into the directory slack, count +1
                       (then C1c's stream is IN the directory: the walker must list it, scans must not
                       call it outside)
"""
import os, sys, struct, zlib, random, json
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import zip8

SRC = '/home/user/sldprt-research-dump/test files new/SW2022/C00_cube_10mm/model.SLDPRT'
OUT = os.path.join(HERE, 'controls')
os.makedirs(OUT, exist_ok=True)
rnd = random.Random(1120)
data = open(SRC, 'rb').read()
cands = zip8.end_candidates(data, 8)
assert len(cands) == 1
eoc = cands[0]
w = zip8.walk(data, eoc, 8)
E = w['entries']


def rot(name):
    return bytes(zip8.rotl8(b, 4) for b in name)


def deflate_raw(b):
    c = zlib.compressobj(9, zlib.DEFLATED, -15)
    return c.compress(b) + c.flush()


PAYLOAD = (b'<?xml version="1.0"?><control>planted by EXP112 disprove2 make_controls.py</control>\n' * 40)
COMP = deflate_raw(PAYLOAD)
CRC = zlib.crc32(PAYLOAD) & 0xFFFFFFFF


def local(sig, name, comp, usize, crc, ver=20, flags=6, meth=8):
    raw = rot(name)
    return zip8.LOC.pack(sig, ver, flags, meth, 0xFFDF, 0x7DEE, crc, len(comp), usize, len(raw), 0) + raw + comp


def save(tag, b, expect):
    p = os.path.join(OUT, tag + '.SLDPRT')
    open(p, 'wb').write(b)
    return {'tag': tag, 'path': p, 'expect': expect}


manifest = []
used_sigs = {bytes.fromhex(s) for s in w['loc_sigs'] + w['cen_sigs'] + [w['end_sig']]}
newsig = bytes(rnd.randrange(256) for _ in range(4))
assert newsig not in used_sigs

# C1: append a strict-shaped valid record after EOF
rec = local(newsig, b'Contents/Planted', COMP, len(PAYLOAD), CRC)
manifest.append(save('C1_append_local', data + rec, {'pos': len(data), 'csize': len(COMP), 'kind': 'local'}))
# C1b: stored, loose shape
rec = local(newsig, b'Contents/PlantedStored', PAYLOAD[:300], 300, zlib.crc32(PAYLOAD[:300]) & 0xFFFFFFFF,
            ver=10, flags=0, meth=0)
manifest.append(save('C1b_append_loose', data + rec, {'pos': len(data), 'kind': 'local_loose'}))
# C1c: a valid record over the filler before the first real local header
first_loc = min(e['loc_pos'] for e in E)
rec = local(newsig, b'Contents/Planted', COMP, len(PAYLOAD), CRC)
assert 8 + 40 + len(rec) < first_loc, (len(rec), first_loc)
pos = 8 + 40
b = bytearray(data); b[pos:pos + len(rec)] = rec
manifest.append(save('C1c_local_in_filler', bytes(b), {'pos': pos, 'csize': len(COMP), 'kind': 'local'}))
c1c_bytes = bytes(b); c1c_pos = pos
# C2: raw deflate stream only, same place
b = bytearray(data); b[pos:pos + len(COMP)] = COMP
manifest.append(save('C2_raw_in_filler', bytes(b), {'pos': pos, 'csize': len(COMP), 'kind': 'raw'}))
# C3: flip one bit in entry 4's compressed data
e = E[4]
b = bytearray(data); b[e['data_start'] + e['csize'] // 2] ^= 0x10
manifest.append(save('C3_flip_data', bytes(b), {'entry': 4, 'kind': 'bad_entry'}))
# C4: flip one bit in central record 2's CRC
e = E[2]
b = bytearray(data); b[e['cen_pos'] + 16] ^= 0x01
manifest.append(save('C4_flip_cen_crc', bytes(b), {'entry': 2, 'kind': 'bad_entry'}))
# C5: duplicate central record 0 into the slack between the last central record and the end record
e0 = E[0]
cen0 = data[e0['cen_pos']:e0['cen_pos'] + 46 + e0['nlen']]
slack = w['cd_end']
assert slack + len(cen0) <= eoc
b = bytearray(data); b[slack:slack + len(cen0)] = cen0
struct.pack_into('<HH', b, eoc + 8, w['ntotal'] + 1, w['ntotal'] + 1)
manifest.append(save('C5_dup_central', bytes(b), {'kind': 'dup'}))
# C6: offsets from byte 0
b = bytearray(data)
for e in E:
    struct.pack_into('<I', b, e['cen_pos'] + 42, e['lhoff'] + 8)
struct.pack_into('<I', b, eoc + 16, w['cdoff'] + 8)
manifest.append(save('C6_base0_offsets', bytes(b), {'kind': 'base0'}))
# C7: second end record appended, passing the rule
newpos = len(data)
end2 = bytearray(data[eoc:eoc + 22])
struct.pack_into('<I', end2, 12, newpos - 8 - w['cdoff'])
manifest.append(save('C7_second_end', data + bytes(end2), {'kind': 'two_ends'}))
# C8: C1c's planted stream registered in the directory (central record written into the slack)
lrec = zip8.LOC.unpack_from(c1c_bytes, c1c_pos)
raw = rot(b'Contents/Planted')
cen = zip8.CEN.pack(bytes.fromhex(w['cen_sigs'][0]), 0, 20, 6, 8, 0xFFDF, 0x7DEE, CRC, len(COMP), len(PAYLOAD),
                    len(raw), 0, 0, 0, 0, 0, c1c_pos - 8) + raw
b = bytearray(c1c_bytes); b[slack:slack + len(cen)] = cen
struct.pack_into('<HH', b, eoc + 8, w['ntotal'] + 1, w['ntotal'] + 1)
manifest.append(save('C8_hidden_cen', bytes(b), {'kind': 'registered', 'pos': c1c_pos}))

json.dump(manifest, open(os.path.join(OUT, 'manifest.json'), 'w'), indent=1)
print('payload', len(PAYLOAD), 'compressed', len(COMP), 'new signature', newsig.hex())
for m in manifest:
    print(m['tag'], m['expect'])
