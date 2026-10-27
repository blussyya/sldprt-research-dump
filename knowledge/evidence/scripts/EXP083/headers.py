# Every local-header-like record in a modern SLDPRT, whatever its flags or method.
# Usage: python3 -I headers.py file...   prints signature, version, flags, method, sizes, decoded name
import sys,struct,collections
for f in sys.argv[1:]:
    b=open(f,'rb').read(); key=b[7]&7; sig=b[0:4]
    rol=lambda c:((c<<key)|(c>>(8-key)))&0xff if key else c
    seen=collections.Counter(); rows=[]
    i=b.find(sig,0)
    while i>=0:
        if i+30<=len(b):
            ver,flags,meth=struct.unpack_from('<HHH',b,i+4); csize,usize,nlen=struct.unpack_from('<III',b,i+18)
            if nlen<1024 and i+30+nlen<=len(b):
                name=bytes(rol(c) for c in b[i+30:i+30+nlen]).decode('latin1')
                seen[(ver,flags,meth)]+=1; rows.append((i,ver,flags,meth,csize,usize,name))
        i=b.find(sig,i+1)
    print('==',f,'sig',sig.hex(),'key',key,dict(seen))
    for r in rows:
        if (r[1],r[2],r[3])!=(20,6,8) or 'Display' in r[6]: print('  ',r)
