const NB=require('./nurbs'),G=require('/home/user/conv-dev/src/geom/eval');
const cap=require('/home/user/sldprt-research-dump/knowledge/evidence/scripts/EXP103/e844-capture.json');
const S=cap.c.surface;
for(const v of [0,0.5,1]){console.log(v,NB.surface(S,0.10777478301282514,v),G.curvePoint(cap.c,v))}
console.log(cap.p0,cap.p1, Object.keys(cap.c.c2));
