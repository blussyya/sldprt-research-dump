import sys,os,json,collections,zlib;sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from lib import *
D=os.path.dirname(os.path.abspath(__file__))
res=json.load(open(D+'/t1.json'))
C=collections.Counter();gapbytes=0;tot=0
firstlocal=collections.Counter();tile_issues=0
sigfill=collections.Counter();hdrvs=0
ex=[]
for r in res:
    b=open(r['f'],'rb').read();p=r['full'][0];ents,info=parse_dir(b,p)
    cov=[]
    for e in ents: cov.append((e['lp'],e['dpos']+e['cs'],'L'))
    nrec=len(ents); endc=ents[-1]['cpos']; 
    cs0=8+struct.unpack_from('<I',b,p+16)[0]
    last=ents[-1]; cend=last['cpos']+46+last['nl']
    cov.append((cs0,cend,'C')); cov.append((p,p+22,'E')); cov.append((0,8,'H'))
    cov.sort()
    prev=0;gaps=[]
    for a,z,t in cov:
        if a<prev: C['overlap']+=1
        if a>prev: gaps.append((prev,a))
        prev=max(prev,z)
    if prev<len(b): gaps.append((prev,len(b)))
    firstlocal[min(e['lp'] for e in ents)]+=1
    tot+=len(b)
    gb=sum(z-a for a,z in gaps);gapbytes+=gb
    # gaps by position: between locals / dir tail / trailing
    for a,z in gaps:
        kind='trail' if a>=p+22 else ('dirtail' if cs0<=a<p else 'datagap')
        C[kind]+=1
        C[kind+'_bytes']+=z-a
        g=b[a:z]
        for nm,s in (('lsig',info['lsig']),('csig',info['csig']),('esig',info['esig'])):
            if s in g: sigfill[(kind,nm)]+=1
        # try inflate in gaps
        if kind=='datagap' and z-a>=8:
            for q in range(a,z-4):
                d=zlib.decompressobj(-15)
                try: o=d.decompress(b[q:q+4000]) 
                except Exception: continue
                if d.eof and len(o)>=16: C['inflate_in_gap']+=1; ex.append((r['f'],q,len(o)));break
print(C);print(sigfill);print('first local ro offsets',firstlocal.most_common(3));print('gapbytes/total',gapbytes,tot);print(ex[:5])
