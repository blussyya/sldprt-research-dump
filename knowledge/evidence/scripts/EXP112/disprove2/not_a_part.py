"""The 5 non-OLE files whose bytes 4-7 are not 00 00 00 04: what are they?"""
import json, os, base64
HERE = os.path.dirname(os.path.abspath(__file__))
for r in json.load(open(os.path.join(HERE, 'inventory.json'))):
    if r['kind'] == 'modern' and r['head8'][8:] != '00000004':
        s = open(r['path'], 'rb').read()
        kind = 'STEP text' if s.startswith(b'ISO-10303-21') else 'other'
        if kind == 'other':
            b64 = not set(s) - set(b'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=\r\n')
            try:
                base64.b64decode(s); dec = 'decodes'
            except Exception as e:
                dec = f'does not decode ({e})'
            kind = f'base64 alphabet only: {b64}, {dec}'
        print(os.path.relpath(r['path'], '/home/user/sldprt-research-dump'), '|', kind)
