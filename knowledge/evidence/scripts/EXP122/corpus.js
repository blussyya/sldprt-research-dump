// EXP-122 (NQ-067): over many parts, every edge whose curve is a trimmed SP_CURVE with two vertices.
// At each vertex: the distance from the converter's projection onto the basis (curveProject) and
// from the trim's own end (parm_1/parm_2, matched to the nearer vertex). One JSON line per edge where
// either is over 1e-8 m, and a count line per part. CONV picks the converter.
// usage: node corpus.js <part>... > out.jsonl
const R=process.env.CONV||'/home/user/solidworks-converters',S=require(R+'/src'),N=require(R+'/src/brep/native'),G=require(R+'/src/geom/eval'),fs=require('fs'),path=require('path');
const d=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]),out=o=>fs.writeSync(1,JSON.stringify(o)+'\n');
for(const file of process.argv.slice(2)){let M;try{M=N.build(S.readBrep(fs.readFileSync(file)).parsed);}catch(err){out({part:path.basename(file),error:err.message.slice(0,80)});continue;}
  let n=0,over=0;
  for(const e of M.edges.values()){const k=e.curve;if(!k||k.type!=='trimmed'||k.basis.type!=='spcurve'||!e.v||e.v.length<2||e.v[0]===e.v[1])continue;n++;
    const c=k.basis,P=e.v.map(v=>M.vertices.get(v).p),vt=e.v.map(v=>M.vertices.get(v).tolerance||0);
    let a,b;try{a=G.curvePoint(c,k.t0);b=G.curvePoint(c,k.t1);}catch(err){continue;}
    const swap=d(a,P[0])+d(b,P[1])>d(a,P[1])+d(b,P[0]),T=swap?[k.t1,k.t0]:[k.t0,k.t1],trim=swap?[d(b,P[0]),d(a,P[1])]:[d(a,P[0]),d(b,P[1])];
    const pr=P.map(p=>{try{return G.curveProject(c,p);}catch(err){return {t:NaN,d:NaN};}});
    if(Math.max(...trim,...pr.map(r=>r.d))>1e-8){over++;out({part:path.basename(file).slice(0,40),edge:e.id,surface:c.surface.type,tol:e.tolerance||0,vtol:vt,swap,proj:pr.map(r=>+r.d.toExponential(3)),trim:trim.map(x=>+x.toExponential(3)),tProj:pr.map(r=>+r.t.toFixed(6)),tTrim:T.map(x=>+x.toFixed(6))});}}
  out({part:path.basename(file).slice(0,40),trimmedSpcurveEdges:n,over});}
