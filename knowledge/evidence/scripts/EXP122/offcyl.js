// EXP-122 (NQ-067): along an SP_CURVE edge on an offset, its 2D (u, v) against the basis B-surface's
// range, its distance from each of the edge's faces, and from the other fin. CONV picks the converter.
// usage: node offcyl.js <part> <edge id> [steps]
const R=process.env.CONV||'/home/user/solidworks-converters',S=require(R+'/src'),N=require(R+'/src/brep/native'),G=require(R+'/src/geom/eval'),fs=require('fs');
const M=N.build(S.readBrep(fs.readFileSync(process.argv[2])).parsed),e=M.edges.get(+process.argv[3]),n=+(process.argv[4]||20);
const base=k=>k.type==='trimmed'?k.basis:k,c=base(e.curve),d=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]),x=v=>v.toExponential(2);
const fins=(e.pcurves||[]).map(pc=>({face:pc.face,c:base(pc.curve)})),faces=M.faces.filter(f=>fins.some(q=>q.face===f.id));
const sd=(s,p)=>{const r=G.surfaceInverse(s,p);return d(G.surfaceEval(s,r.u,r.v).p,p);};
const B=c.surface.type==='offset'?c.surface.basis:c.surface;
if(B.type==='bspline')console.log(`basis ${B.type}${B.node||''}: degree ${B.du}x${B.dv}, ${B.ctrl.length}x${B.ctrl[0].length}, u ${B.ku[B.du]}..${B.ku[B.ctrl.length]}, v ${B.kv[B.dv]}..${B.kv[B.ctrl[0].length]}`);
const t0=e.curve.type==='trimmed'?e.curve.t0:G.curveRange(c)[0],t1=e.curve.type==='trimmed'?e.curve.t1:G.curveRange(c)[1];
for(let i=0;i<=n;i++){const t=t0+(t1-t0)*i/n,q=G.bsplineCurve(c.c2,t).p,p=G.curvePoint(c,t);
  const other=fins.filter(f=>f.c!==c).map(f=>`fin on ${f.face} ${x(G.curveProject(f.c,p).d)}`).join(', ');
  console.log(`t ${t.toFixed(6)} uv (${q[0].toFixed(6)}, ${q[1].toFixed(6)}): `+faces.map(f=>`face ${f.id} ${f.surface.type} ${x(sd(f.surface,p))}`).join(', ')+'; '+other);}
