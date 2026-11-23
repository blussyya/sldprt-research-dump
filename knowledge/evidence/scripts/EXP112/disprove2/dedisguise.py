"""Undo the disguise and hand each file to two independent ZIP readers (Python zipfile, Info-ZIP
unzip -t). If the file really is a ZIP from byte 8, swapping in PK signatures and un-rotating the
names should be enough.

  V1 literal : drop bytes 0-7, put PK\\3\\4 / PK\\1\\2 / PK\\5\\6 at the real records, un-rotate names.
               Nothing else changes (filler stays, end record fields stay).
  V2 trimmed : V1, and also cut the filler between the last central record and the end record and
               set the end record's directory size to the bytes the central records really take.

Writes no files into the corpus. unzip gets a temporary copy in $SCRATCH that is deleted after.
"""
import os, sys, io, json, struct, zipfile, subprocess, zlib
from collections import Counter
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import zip8
SCRATCH = os.environ.get('SCRATCH', '/tmp')


def build(data, eoc, trimmed):
    w = zip8.walk(data, eoc, 8)
    b = bytearray(data)
    for e in w['entries']:
        b[e['loc_pos']:e['loc_pos'] + 4] = b'PK\x03\x04'
        b[e['cen_pos']:e['cen_pos'] + 4] = b'PK\x01\x02'
        nl = e['nlen']
        b[e['loc_pos'] + 30:e['loc_pos'] + 30 + nl] = zip8.unrotate(b[e['loc_pos'] + 30:e['loc_pos'] + 30 + nl], 4)
        b[e['cen_pos'] + 46:e['cen_pos'] + 46 + nl] = zip8.unrotate(b[e['cen_pos'] + 46:e['cen_pos'] + 46 + nl], 4)
    b[eoc:eoc + 4] = b'PK\x05\x06'
    if trimmed:
        end = bytearray(b[eoc:eoc + 22])
        struct.pack_into('<I', end, 12, w['cd_bytes_walked'])
        b = b[:w['cd_end']] + end + b[eoc + 22:]
    return bytes(b[8:]), w


def try_python(z, w, data):
    try:
        zf = zipfile.ZipFile(io.BytesIO(z))
        bad = zf.testzip()
        names = zf.namelist()
        want = [zip8.unrotate(bytes.fromhex(e['rawname']), 4).decode('latin1') for e in w['entries']]
        if bad is not None:
            return f'testzip bad member {bad}'
        if names != want:
            return 'names differ'
        return 'ok'
    except Exception as ex:
        return f'{type(ex).__name__}: {ex}'[:90]


def try_unzip(z, tag):
    p = os.path.join(SCRATCH, f'exp112_dd_{tag}.zip')
    open(p, 'wb').write(z)
    r = subprocess.run(['unzip', '-t', '-qq', p], capture_output=True, text=True)
    os.remove(p)
    msg = (r.stdout + r.stderr).strip().splitlines()
    return 'ok' if r.returncode == 0 else f'rc={r.returncode} ' + (msg[0][:80] if msg else '')


def main():
    C = [r for r in json.load(open(os.path.join(HERE, 'check_all.json'))) if r['b4_7'] == '00000004']
    T = Counter(); ex = {}
    for i, r in enumerate(C):
        data = open(r['path'], 'rb').read()
        for v, trimmed in (('V1', False), ('V2', True)):
            z, w = build(data, r['eoc'], trimmed)
            py = try_python(z, w, data)
            uz = try_unzip(z, f'{i}_{v}')
            T[f'{v} python: {py if py == "ok" else py.split(":")[0]}'] += 1
            T[f'{v} unzip: {uz if uz == "ok" else uz.split()[0]}'] += 1
            for k, val in ((f'{v} python', py), (f'{v} unzip', uz)):
                if val != 'ok' and k not in ex:
                    ex[k] = (os.path.basename(r['path']), val)
    for k in sorted(T):
        print(k, T[k])
    print('first failure message per reader:')
    for k, v in ex.items():
        print(' ', k, v)


if __name__ == '__main__':
    main()
