"""Line up the converter's readDirectory output with my walk: same entries, same order, same fields?"""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
mine = {r['path']: r for r in json.load(open(os.path.join(HERE, 'check_all.json')))}
conv = json.load(open(os.path.join(HERE, 'compare_converter.json')))
same = diff = 0
for c in conv:
    m = mine[c['path']]
    if not c['entries']:
        print('converter found no directory:', c['path']); diff += 1; continue
    import sys; sys.path.insert(0, HERE); import zip8
    data = open(c['path'], 'rb').read()
    w = zip8.walk(data, m['eoc'], 8)
    a = [(zip8.unrotate(bytes.fromhex(e['rawname']), 4).decode('latin1'), e['data_start'], e['csize'], e['usize'], e['crc']) for e in w['entries']]
    b = [(e['name'], e['dataStart'], e['compSize'], e['size'], e['crc']) for e in c['entries']]
    if a == b: same += 1
    else:
        diff += 1; print('DIFF', os.path.basename(c['path']), len(a), len(b), [x for x in a if x not in b][:2], [x for x in b if x not in a][:2])
print('files where converter and my walk list identical entries:', same, ' differ:', diff)
