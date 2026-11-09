import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import json,struct,zlib,datetime
from lib import *
res=json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'t1.json')))
summ=[]
for r in res:
    b=open(r['f'],'rb').read(); k=b[7]
    p=r['full'][0]; ents,info=parse_dir(b,p)
    dirl={e['lp'] for e in ents}
    found=[]; shapehits=0
    for q in range(8,len(b)-30):
        if b[q+8]!=8 or b[q+9]!=0: continue
        crc,cs,us,nl,el=struct.unpack_from('<IIIHH',b,q+14)
        if not(1<=nl<=200) or el>64 or us==0 or cs==0 or q+30+nl+el+cs>len(b): continue
        nm=unrot(b[q+30:q+30+nl],k)
        if not printable(nm): continue
        shapehits+=1
        d=inflate(b,q+30+nl+el,cs,us)
        if d is not None and len(d)==us and zlib.crc32(d)==crc: found.append((q,nm))
    fs={q for q,_ in found}
    extra=[(q,n) for q,n in found if q not in dirl]
    missing=[e['lp'] for e in ents if e['lp'] not in fs]
    # dup names
    ds=[]
    for e in ents:
        d=struct.unpack('<HH',e['traw'])
        t,dt=d
        try: ds.append(datetime.datetime(1980+(dt>>9),(dt>>5)&15,dt&31,t>>11,(t>>5)&63,(t&31)*2))
        except Exception: ds.append(None)
    summ.append(dict(f=r['f'],found=len(found),dirn=len(ents),extra=extra,missing=missing,shapehits=shapehits,
        validdos=sum(x is not None for x in ds),ndos=len(ds),dos=[str(x) for x in ds[:3]]))
json.dump(summ,open('t2.json','w'),default=str)
print('files',len(summ),'found',sum(s['found'] for s in summ),'dir',sum(s['dirn'] for s in summ))
print('files with extra',[ (s['f'],s['extra']) for s in summ if s['extra']][:10])
print('files with missing',[(s['f'],s['missing'][:3]) for s in summ if s['missing']][:10])
print('dos valid',sum(s['validdos'] for s in summ),sum(s['ndos'] for s in summ))
for s in summ[:6]: print(s['dos'])
