// The trimmed SP_CURVE edges that p23 couldn't sample (their surface needs resolving): how close do
// their vertices and fin faces come to the bore end circle? If all are mm away they can't cover it.
const L=require('./lib'),S=require(L.R+'/src'),N=require(L.R+'/src/brep/native'),G=require(L.R+'/src/geom/eval'),B=require('./branch'),fs=require('fs');
const file='/home/user/sldprt-research-dump/test files online/2013/f666f342_head_face.sldprt';
const buf=fs.readFileSync(file),M=N.build(S.readBrep(buf).parsed);
for(const [nfid,arcId] of [[2516,1166],[12990,11124]]){
const e0=M.edges.get(arcId),C=e0.curve;const centre=C.c,r=C.r;let minD=Infinity,who=null;
for(const e of M.edges.values()){let br=null;try{br=B.branch(M,e,false,64);}catch(_){}if(br)continue;
  const cs=[e.curve,...(e.pcurves||[]).map(x=>x.curve)];let ok=false;for(const c of cs){try{G.curvePoint(c,G.curveRange(c)[0]);ok=true;}catch(_){}}if(ok)continue;
  for(const v of e.v||[]){const p=M.vertices.get(v).p;const dd=G.dist(p,centre);if(dd<minD){minD=dd;who=e.id;}}}
console.log('bore',nfid,'unsampled spcurve edges: nearest vertex to the end-circle centre',(minD*1000).toFixed(3),'mm (edge',who+'), circle radius',(r*1000).toFixed(3),'mm');}
