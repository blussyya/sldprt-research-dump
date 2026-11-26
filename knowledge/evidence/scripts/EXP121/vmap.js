// EXP-121: is Parasolid's blend v the angle fraction across the section? At each vertex of an SP_CURVE
// edge on a blend: the 2D curve's v at that end, and the vertex's angle from the support-0 contact as a
// fraction of the section's arc (support 0 -> support 1). Also the 2D u at each end.
const R=process.env.CONV,S=require(R+'/src'),N=require(R+'/src/brep/native'),F=require(R+'/src/brep/fit'),G=require(R+'/src/geom/eval'),fs=require('fs');
const M=N.build(S.readBrep(fs.readFileSync(process.argv[2])).parsed);
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],nrm=a=>Math.hypot(...a),ang=(a,b)=>Math.acos(Math.max(-1,Math.min(1,dot(a,b)/(nrm(a)*nrm(b)))));
for(const id of process.argv.slice(3).map(Number)){const e=[...M.edges.values()].find(x=>x.displayId===id);let c=e.curve,tr=null;if(c.type==='trimmed'){tr=c;c=c.basis;}const b=c.surface,sp=F.spineOf(b,1e-8).curve;
  const rows=e.v.map(v=>{const p=M.vertices.get(v).p,t=G.curveProject(sp,p).t,cc=G.curvePoint(sp,t),P0=F.contact(b,0,cc,new Map()),P1=F.contact(b,1,cc,new Map());
    const th=ang(sub(P0,cc),sub(P1,cc)),f=ang(sub(P0,cc),sub(p,cc))/th;
    // the 2D point at this end: the 2D curve's point whose 3D image is nearest... use the 2D range ends, matched by order below
    return {v,t,f};});
  const [a,z]=G.curveRange(c.c2),A=G.curvePoint(c.c2,a),Z=G.curvePoint(c.c2,z);
  console.log(`edge ${id} blend${b.node}: 2D ends (u,v) (${A[0].toPrecision(6)}, ${A[1].toPrecision(4)}) and (${Z[0].toPrecision(6)}, ${Z[1].toPrecision(4)})${tr?' [basis curve; trimmed]':''}; vertices: ${rows.map(x=>`${x.v} spine t ${x.t.toPrecision(6)} angle fraction ${x.f.toFixed(4)}`).join('; ')}`);}
