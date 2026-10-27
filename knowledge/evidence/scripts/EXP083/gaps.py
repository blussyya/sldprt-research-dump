# Walk the deflate records the reader finds (magic 14 00 06 00 08 00) and print every byte range
# no record covers. A stream the reader can't see would show up as a gap.
# Usage: python3 -I gaps.py file...
import sys,struct
for f in sys.argv[1:]:
    b=open(f,'rb').read(); key=b[7]&7
    rol=lambda c:((c<<key)|(c>>(8-key)))&0xff if key else c
    recs=[]; i=b.find(bytes([20,0,6,0,8,0]))
    while i>=0:
        s=i-4
        if s>=0 and s+30<=len(b):
            c,u,n=struct.unpack_from('<III',b,s+18)
            if n<1024 and c<50e6 and s+30+n+c<=len(b):
                recs.append((s,s+30+n+c,bytes(rol(x) for x in b[s+30:s+30+n]).decode('latin1')))
        i=b.find(bytes([20,0,6,0,8,0]),i+1)
    recs.sort(); pos=0; gaps=[]
    for s,e,nm in recs:
        if s>pos: gaps.append((pos,s))
        pos=max(pos,e)
    if pos<len(b): gaps.append((pos,len(b)))
    big=[(g0,g1,g1-g0,b[g0:g0+16].hex()) for g0,g1 in gaps if g1-g0>16]
    print('==',f.split('/')[-1][:40],len(b),'bytes',len(recs),'records', 'uncovered',sum(g1-g0 for g0,g1 in gaps),'bytes in',len(gaps),'gaps; >16B:',big[:6])
