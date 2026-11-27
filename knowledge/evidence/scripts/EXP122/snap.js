// EXP-122, after the blind prove agent: edge 6075's end with the 2D curve's u as stored (-2.7e-17)
// and snapped to 0. bsplineSurface takes a point outside in both u and v as a corner and drops the
// cross-derivative from du; a u this close to the edge shouldn't count as outside. Also the fit.
const R=process.env.CONV||'/home/user/solidworks-converters',S=require(R+'/src'),N=require(R+'/src/brep/native'),G=require(R+'/src/geom/eval'),F=require(R+'/src/brep/fit'),fs=require('fs');
const M=N.build(S.readBrep(fs.readFileSync(process.argv[2])).parsed),e=M.edges.get(6075),c=e.curve.basis,O=c.surface,B=O.basis;
const d=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]),x=v=>v.toExponential(3),V=e.v.map(v=>M.vertices.get(v));
console.log('2D control points (u exactly): '+c.c2.ctrl.map(q=>q[0]).join(', '));
const q=G.bsplineCurve(c.c2,e.curve.t1).p;console.log(`end (u, v) = (${q[0]}, ${q[1]})`);
for(const u of [q[0],0]){const b=G.bsplineSurface(B,u,q[1]),o=G.surfaceEval(O,u,q[1]).p;
  console.log(`u ${u}: basis du (${b.du.map(z=>z.toFixed(6)).join(', ')}); offset point to vertex 1 ${x(d(o,V[1].p))} (tolerance ${x(V[1].tolerance)})`);}
// the same curve with its 2D control points' u snapped to 0, through the converter's own fit
const c0={...c,c2:{...c.c2,ctrl:c.c2.ctrl.map(p=>[Math.abs(p[0])<1e-12?0:p[0],p[1],p[2]||0])}};
for(const [name,k] of [['as stored',c],['u snapped',c0]]){const r=F.edgeCurve(e,k,V[0].p,V[1].p,{tolerance:1e-8,vertexTolerance:V.map(v=>v.tolerance||0)});
  const cyl=(e.pcurves||[]).map(pc=>pc.curve.type==='trimmed'?pc.curve.basis:pc.curve).find(z=>z.surface.type==='cylinder');
  let w=0;for(let i=0;i<=200;i++){const t=e.curve.t1+(e.curve.t0-e.curve.t1)*i/200;w=Math.max(w,G.curveProject(cyl,G.curvePoint(k,t)).d);}
  console.log(`${name}: converter fit error ${x(r.error)}; furthest from the cylinder fin ${x(w)} (edge tolerance ${x(e.tolerance)})`);}
