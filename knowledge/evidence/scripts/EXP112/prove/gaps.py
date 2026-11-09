import collections
src=open('/home/user/sldprt-research-dump/knowledge/evidence/scripts/EXP112/prove/prove.py').read().replace('\nmain()\n','\n')
exec(src)
first=collections.Counter();mid=collections.Counter();per=collections.defaultdict(set);order=0;nf=0;fail=[]
for f in files():
    d=open(f,'rb').read();k=d[7]&7
    g=[(e,ents) for e in endcands(d) for ents,_ in [walk(d,e,k)] if ents][0][1]
    hs=[x['h'] for x in g]
    if hs!=sorted(hs): order+=1
    prev=8
    for i,x in enumerate(sorted(g,key=lambda x:x['h'])):
        gap=x['h']-prev; (first if i==0 else mid)[gap]+=1
        if i>0: per[f].add(gap)
        prev=x['data']+x['cs']
    # dir-order check: is directory order == offset order
print('dir order != offset order files:',order)
print('first gap (byte 8 to first header) min/max',min(first),max(first),'distinct',len(first))
print('between-streams gap distribution',sorted(mid.items()))
print('files with a single nonzero gap value:',sum(1 for s in per.values() if len(s-{0})<=1),'of',len(per))
nz=[v for v in mid if v]; print('nonzero gap min/max',min(nz),max(nz),'count in 69-84:',sum(mid[v] for v in nz if 69<=v<=84),'of',sum(mid[v] for v in nz))
