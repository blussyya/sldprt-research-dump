import sys,os,json,collections;sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from lib import *
res=json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'t1.json')))
nm=collections.Counter();alln=collections.Counter();dominant_frac=[];ia1=collections.Counter()
fl_n=0
for r in res:
    b=open(r['f'],'rb').read();ents,_=parse_dir(b,r['full'][0])
    c=collections.Counter(e['traw'] for e in ents);dom=c.most_common(1)[0][0]
    dominant_frac.append(c[dom]/len(ents))
    for e in ents:
        n=unrot(e['name'],b[7]).decode('latin1');alln[n]+=1
        if e['traw']!=dom: nm[n]+=1
        if e['ia']==1: ia1[n]+=1
print('dominant fraction min/mean',min(dominant_frac),sum(dominant_frac)/len(dominant_frac))
print('nondominant by name',nm.most_common(8))
print('ia=1 names',ia1.most_common(8))
