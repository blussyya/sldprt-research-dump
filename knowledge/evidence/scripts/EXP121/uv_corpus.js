// EXP-121: Parasolid's (u,v) on a constant-radius rolling-ball blend. For every SP_CURVE edge on such a
// blend (vertices at both ends): the 2D (u,v) at each end (from the trimmed range), the vertex's spine
// parameter on our spine, the arc length of our spine between the two vertices' sections, and each
// vertex's angle fraction across its section from the support-0 contact. Tests: |du| = arc length
// (u is spine arc length in metres), and v = fraction or 1 - fraction (one or the other per blend).
// usage: node uv_corpus.js <part>   (one JSON line per edge)
const R=process.env.CONV,S=require(R+'/src'),N=require(R+'/src/brep/native'),F=require(R+'/src/brep/fit'),G=require(R+'/src/geom/eval'),fs=require('fs');
const M=N.build(S.readBrep(fs.readFileSync(process.argv[2])).parsed),part=require('path').basename(process.argv[2]).slice(0,8);
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],nrm=a=>Math.hypot(...a),ang=(a,b)=>Math.acos(Math.max(-1,Math.min(1,dot(a,b)/(nrm(a)*nrm(b)))));
const raw=s=>s&&s.type==='blend'&&Math.abs(Math.abs(s.range[0])-Math.abs(s.range[1]))<1e-12&&Math.abs(s.range[0])>0;
for(const e of M.edges.values()){let c=e.curve,tr=null;if(c.type==='trimmed'){tr=c;c=c.basis;}if(c.type!=='spcurve'||!raw(c.surface)||!e.v||e.v[0]==null)continue;
  try{const b=c.surface,sp=F.spineOf(b,1e-8).curve;
    const [a,z]=tr?[tr.t0,tr.t1]:G.curveRange(c.c2),E=[G.curvePoint(c.c2,a),G.curvePoint(c.c2,z)];
    let V=e.v.map(v=>M.vertices.get(v).p);
    // which vertex is the 2D start: by the trimmed curve's own end point, else by the edge order
    if(tr&&tr.p0&&nrm(sub(tr.p0,V[1]))<nrm(sub(tr.p0,V[0])))V=[V[1],V[0]];
    const X=V.map(p=>{const t=G.curveProject(sp,p).t,cc=G.curvePoint(sp,t),P0=F.contact(b,0,cc,new Map()),P1=F.contact(b,1,cc,new Map());return {t,f:ang(sub(P0,cc),sub(p,cc))/ang(sub(P0,cc),sub(P1,cc))};});
    let L=0,prev=G.curvePoint(sp,X[0].t);for(let k=1;k<=400;k++){const q=G.curvePoint(sp,X[0].t+(X[1].t-X[0].t)*k/400);L+=nrm(sub(q,prev));prev=q;}
    console.log(JSON.stringify({part,edge:e.displayId,blend:b.node,r:Math.abs(b.range[0]),du:E[1][0]-E[0][0],arc:L,dt:X[1].t-X[0].t,v:[E[0][1],E[1][1]],f:[X[0].f,X[1].f]}));
  }catch(err){console.log(JSON.stringify({part,edge:e.displayId,error:err.message.slice(0,80)}));}}
