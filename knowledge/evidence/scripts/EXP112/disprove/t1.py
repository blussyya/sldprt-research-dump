import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import sys,struct,zlib,json
from lib import *
res=[]
for f in files():
    b=open(f,'rb').read()
    if not modern(b): continue
    k=b[7]
    cands=shape_candidates(b)
    full=[]
    for p in cands:
        r=parse_dir(b,p)
        if r: full.append((p,r))
    row=dict(f=f,len=len(b),b7=k,shape=cands,full=[p for p,_ in full])
    if len(full)==1:
        p,(ents,info)=full[0]
        ok=0;bad=[];names=[]
        for e in ents:
            nm=unrot(e['name'],k)
            names.append(nm)
            data=inflate(b,e['dpos'],e['cs'],e['us'])
            good= data is not None and len(data)==e['us'] and zlib.crc32(data)==e['crc']
            ok+=good
            if not good: bad.append(nm.decode('latin1'))
        row.update(n=len(ents),ok=ok,bad=bad,dups=len(names)-len(set(names)),unprint=sum(not printable(n) for n in names),
          meths=sorted({e['meth'] for e in ents}|{e['lmeth'] for e in ents}),fls=sorted({e['fl'] for e in ents}|{e['lfl'] for e in ents}),
          els=sorted({e['el'] for e in ents}|{e['lel'] for e in ents}|{e['cl'] for e in ents}),
          vm=sorted({(e['vm'],e['vn']) for e in ents}),ea=sorted({(e['dsk'],e['ia'],e['ea']) for e in ents}),
          trawc=len({e['traw'] for e in ents}),trawl=len({e['ltraw'] for e in ents}),trawsame=all(e['traw']==e['ltraw'] for e in ents),
          traw=ents[0]['traw'].hex(),
          sig=[info['lsig'].hex(),info['csig'].hex(),info['esig'].hex()],
          lastend_gap=len(b)-(p+22), hdr=b[:8].hex())
    res.append(row)
json.dump(res,open('t1.json','w'),indent=0,default=str)
print(len(res))
from collections import Counter
print('shape count',Counter(len(r['shape']) for r in res))
print('full count',Counter(len(r['full']) for r in res))
print('b7',Counter(r['b7'] for r in res))
for r in res:
    if len(r['full'])!=1 or r.get('bad') or r.get('dups') or r.get('unprint') or r.get('lastend_gap'):
        print(r['f'],r['shape'],r['full'],r.get('bad'),r.get('dups'),r.get('unprint'),r.get('lastend_gap'))
print('meth',Counter(str(r.get('meths')) for r in res),'fl',Counter(str(r.get('fls')) for r in res),'el',Counter(str(r.get('els')) for r in res))
print('vm',Counter(str(r.get('vm')) for r in res).most_common(4),'ea',Counter(str(r.get('ea')) for r in res).most_common(4))
print('traw per-file distinct central',Counter(r.get('trawc') for r in res),'local',Counter(r.get('trawl') for r in res),'same',Counter(r.get('trawsame') for r in res))
print('ok total',sum(r.get('ok',0) for r in res),'n total',sum(r.get('n',0) for r in res))
