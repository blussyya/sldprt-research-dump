// EXP-121: section-type SP_CURVE edges on blends. The spine parameter of each vertex (global and local
// projection), the arc distance between the vertices' sections along the spine, and each vertex's
// distance from the blend (|p - spine| - r).
const R=process.env.CONV,S=require(R+'/src'),N=require(R+'/src/brep/native'),F=require(R+'/src/brep/fit'),G=require(R+'/src/geom/eval'),fs=require('fs');
const M=N.build(S.readBrep(fs.readFileSync(process.argv[2])).parsed),dd=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
for(const id of process.argv.slice(3).map(Number)){const e=[...M.edges.values()].find(x=>x.displayId===id);let c=e.curve;if(c.type==='trimmed')c=c.basis;const b=c.surface,sp=F.spineOf(b,1e-8).curve,r=Math.abs(b.range[0]);
  const T=e.v.map(v=>{const p=M.vertices.get(v).p,t=G.curveProject(sp,p).t,q=G.curvePoint(sp,t);return {p,t,q,off:dd(p,q)-r};});
  const along=dd(T[0].q,T[1].q);
  // for each vertex, the distance to the other vertex's section plane
  const tan=G.curveTangent(sp,T[0].t),n=Math.hypot(...tan),u=tan.map(x=>x/n),plane=(p,q)=>Math.abs((p[0]-q[0])*u[0]+(p[1]-q[1])*u[1]+(p[2]-q[2])*u[2]);
  console.log(`edge ${id} on blend${b.node} r ${r}: vertex spine t ${T.map(x=>x.t.toPrecision(7)).join(' / ')}; section centres ${along.toExponential(2)} m apart; vertex 1 is ${plane(T[1].p,T[0].q).toExponential(2)} m from vertex 0's section plane; off the blend ${T.map(x=>x.off.toExponential(1)).join(' / ')} m; ends ${(dd(T[0].p,T[1].p)*1e3).toFixed(3)} mm apart`);}
