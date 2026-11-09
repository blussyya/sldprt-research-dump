import os,struct,zlib
ROOT='/home/user/sldprt-research-dump'
def files():
    out=[]
    for r,d,f in os.walk(ROOT):
        if '.git' in r.split(os.sep): continue
        for x in f:
            if x.lower().endswith('.sldprt'): out.append(os.path.join(r,x))
    return sorted(out)
def modern(b): return len(b)>8 and b[4:8]==b'\0\0\0\4'
def unrot(name,k):
    k&=7
    return bytes(((c>>k)|(c<<(8-k)))&255 for c in name) if k else bytes(name)
def rot(name,k):
    k&=7
    return bytes(((c<<k)|(c>>(8-k)))&255 for c in name) if k else bytes(name)
def printable(s): return len(s)>0 and all(32<=c<127 for c in s)
def shape_candidates(b):
    """loose: shape + position rule only. returns list of p, scanning backwards"""
    res=[]
    for p in range(len(b)-22,7,-1):
        if b[p+4:p+8]!=b'\0\0\0\0': continue
        n,n2=struct.unpack_from('<HH',b,p+8)
        if n!=n2 or n==0: continue
        size,off=struct.unpack_from('<II',b,p+12)
        if b[p+20:p+22]!=b'\0\0': continue
        if p==8+off+size: res.append(p)
    return res
def parse_dir(b,p,base=8):
    """full rule; returns (entries,info) or None"""
    n=struct.unpack_from('<H',b,p+8)[0]
    size,off=struct.unpack_from('<II',b,p+12)
    pos=base+off; ents=[]; csig=set(); lsig=set()
    for i in range(n):
        if pos+46>p: return None
        csig.add(b[pos:pos+4])
        (vm,vn,fl,meth,tm,dt,crc,cs,us,nl,el,cl,dsk,ia,ea,ro)=struct.unpack_from('<HHHHHHIIIHHHHHII',b,pos+4)
        name=b[pos+46:pos+46+nl]
        ents.append(dict(vm=vm,vn=vn,fl=fl,meth=meth,tm=tm,dt=dt,crc=crc,cs=cs,us=us,nl=nl,el=el,cl=cl,dsk=dsk,ia=ia,ea=ea,ro=ro,name=name,cpos=pos,traw=b[pos+12:pos+16]))
        pos+=46+nl+el+cl
    if pos>p: return None
    tail=p-pos
    if len(csig)!=1: return None
    for e in ents:
        lp=8+e['ro']
        if lp+30>len(b): return None
        lsig.add(b[lp:lp+4])
        (vn,fl,meth,tm,dt,crc,cs,us,nl,el)=struct.unpack_from('<HHHHHIIIHH',b,lp+4)
        if (crc,cs,us,nl)!=(e['crc'],e['cs'],e['us'],e['nl']) or b[lp+30:lp+30+nl]!=e['name']: return None
        e['lp']=lp;e['lfl']=fl;e['lmeth']=meth;e['ltraw']=b[lp+10:lp+14];e['lel']=el
        e['dpos']=lp+30+nl+el
    if len(lsig)!=1: return None
    return ents,dict(tail=tail,csig=csig.pop(),lsig=lsig.pop(),esig=bytes(b[p:p+4]))
def inflate(b,pos,cs,us):
    d=zlib.decompressobj(-15)
    try:
        out=d.decompress(b[pos:pos+cs] if cs else b[pos:pos+us*2+1000],us+1)
    except Exception: return None
    return out
