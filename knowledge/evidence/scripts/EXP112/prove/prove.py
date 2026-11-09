import os,sys,struct,zlib,json,collections
ROOT='/home/user/sldprt-research-dump'
def files():
    out=[]
    for r,d,f in os.walk(ROOT):
        if '.git' in r.split(os.sep): continue
        for x in f:
            if x.lower().endswith('.sldprt'):
                p=os.path.join(r,x)
                if open(p,'rb').read(8)[4:8]==b'\0\0\0\4': out.append(p)
    return sorted(out)
def rol(b,k): return bytes(((c<<k)|(c>>(8-k)))&255 for c in b) if k else b
U16=lambda d,o:struct.unpack_from('<H',d,o)[0]
U32=lambda d,o:struct.unpack_from('<I',d,o)[0]
def walk(d,e,k,corrupt=None):
    """e = end record position. return list of entries or None + reason"""
    n=U16(d,e+10); size=U32(d,e+12); off=U32(d,e+16)
    if e!=8+off+size: return None,'pos'
    p=8+off; ents=[]; csig=d[p:p+4]; lsig=None
    for i in range(n):
        if p+46>len(d) or d[p:p+4]!=csig: return None,'csig'
        crc=U32(d,p+16);cs=U32(d,p+20);us=U32(d,p+24);nl=U16(d,p+28);el=U16(d,p+30);cl=U16(d,p+32);lo=U32(d,p+42)
        name=rol(d[p+46:p+46+nl],k)
        h=8+lo
        if h+30>len(d): return None,'lh'
        if lsig is None: lsig=d[h:h+4]
        if d[h:h+4]!=lsig: return None,'lsig'
        if (U32(d,h+14),U32(d,h+18),U32(d,h+22),U16(d,h+26))!=(crc,cs,us,nl): return None,'lhmatch'
        if rol(d[h+30:h+30+nl],k)!=name: return None,'lhname'
        ents.append(dict(name=name,crc=crc,cs=cs,us=us,h=h,data=h+30+nl+U16(d,h+28),cdir=p))
        p+=46+nl+el+cl
    return ents,(csig,lsig,d[e:e+4],e-p)
def endcands(d):
    # brute force: every position where disk fields 0, count fields equal, comment len 0 at end
    c=[]
    for e in range(8,len(d)-21):
        if d[e+4:e+8]==b'\0\0\0\0' and d[e+8:e+10]==d[e+10:e+12] and U16(d,e+8)>0 and e+22+U16(d,e+20)<=len(d):
            c.append(e)
    return c
def brute(d,k):
    s=set();pat=bytes([0x14,0,6,0,8,0]);i=d.find(pat)
    while i>=0:
        h=i-4
        if h>=8 and h+30<=len(d):
            crc,cs,us,nl,el=U32(d,h+14),U32(d,h+18),U32(d,h+22),U16(d,h+26),U16(d,h+28)
            a=h+30+nl+el
            if 0<nl<512 and a+cs<=len(d):
                try:
                    z=zlib.decompressobj(-15);o=z.decompress(d[a:a+cs])
                    if z.eof and len(o)==us and zlib.crc32(o)&0xffffffff==crc:
                        s.add((h,rol(d[h+30:h+30+nl],k),crc,cs,us))
                except Exception: pass
        i=d.find(pat,i+1)
    return s
LEFT=[]
def main():
    R=collections.Counter();log=[];gaps=collections.Counter();tot=0;sizes=[]
    for f in files():
        d=open(f,'rb').read();k=d[7]&7;R['files']+=1
        cands=endcands(d);pos=[e for e in cands if e==8+U32(d,e+16)+U32(d,e+12)]
        good=[]
        for e in cands:
            ents,r=walk(d,e,k)
            if ents is not None: good.append((e,ents,r))
        R['cand_total']+=len(cands);R['cand_pos']+=len(pos);R['cand_full']+=len(good)
        R['pos_but_fail_walk']+=len(pos)-len(good)
        if len(good)!=1: log.append((f,'good=%d'%len(good)));R['nonunique']+=1;continue
        e,ents,(cs,ls,es,left)=good[0]
        R['cdir_leftover_nonzero']+= left!=0; LEFT.append(left)
        # sig uniqueness: ents all share sig by construction; check count
        sigs=(cs,ls,es)
        R['sigs_distinct_from_PK']+= (cs!=b'PK\1\2' and ls!=b'PK\3\4' and es!=b'PK\5\6')
        bad=0
        for x in ents:
            tot+=1
            try:
                z=zlib.decompressobj(-15);o=z.decompress(d[x['data']:x['data']+x['cs']])
                ok=z.eof and len(o)==x['us'] and zlib.crc32(o)&0xffffffff==x['crc']
            except Exception: ok=False
            if not ok: bad+=1
        R['entries']+=len(ents);R['entry_bad']+=bad
        # order & gaps
        hs=[x['h'] for x in ents]
        if hs!=sorted(hs): R['unordered']+=1
        prev=8
        for x in ents:
            g=x['h']-prev;gaps[g if g<69 or g>84 else '69-84']+=1 if (g==0 or 69<=g<=84) else 0
            if not(g==0 or 69<=g<=84): log.append((f,'gap',g,x['h']));R['gap_viol']+=1
            R['gap0']+=g==0;R['gap69_84']+=69<=g<=84
            if 69<=g<=84: sizes.append(g)
            prev=x['data']+x['cs']
        lastgap=ents[0]['cdir']  # first cdir record pos
        R['lastgap']+=0
        g=min(x['cdir'] for x in ents)-prev
        R.update({'tail_gap_%s'%('0' if g==0 else '69-84' if 69<=g<=84 else 'other'):1})
        # brute-force
        B=brute(d,k);D={(x['h'],x['name'],x['crc'],x['cs'],x['us']) for x in ents}
        R['brute']+=len(B);R['brute_not_in_dir']+=len(B-D);R['dir_not_in_brute']+=len(D-B)
        for t in B-D: log.append((f,'OUTSIDE',t[0],t[1],t[4]))
        for t in D-B: log.append((f,'DIRONLY',t[0],t[1]))
        # controls
        for name,mut in (('flip_cdir_crc',lambda b,x:x['cdir']+16),('flip_cdir_sig',lambda b,x:x['cdir']),('flip_lh_crc',lambda b,x:x['h']+14),('flip_lh_name',lambda b,x:x['h']+30)):
            b=bytearray(d);b[mut(b,ents[len(ents)//2])]^=1
            r,_=walk(bytes(b),e,k);R['ctl_'+name+'_rejected']+= r is None
        b=bytearray(d);b[e+16]^=1;r,_=walk(bytes(b),e,k);R['ctl_flip_end_diroff_rejected']+= r is None
        # offsets from 0 instead of 8 control
        R['ctl_off_from_0_would_match']+= (e==U32(d,e+16)+U32(d,e+12))
        R['sig_perfile_values']+=0
    print('leftover bytes in dir span after count records: min',min(LEFT),'max',max(LEFT))
    print(dict(R));print('total entries',tot)
    print('gap sizes',min(sizes) if sizes else None,max(sizes) if sizes else None,collections.Counter(sizes).most_common(5))
    for l in log[:40]:print(l)
    print('log lines',len(log))
main()
