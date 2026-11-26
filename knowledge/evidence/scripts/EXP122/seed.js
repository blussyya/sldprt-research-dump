// EXP-122 (NQ-067): for an SP_CURVE edge, the parameter of each vertex on the basis curve three ways:
// the converter's curveProject, a dense search (20,000 samples then the same Newton), and the
// edge's own trim. Then the converter's fit with each pair of end parameters. CONV picks the converter.
// usage: node seed.js <part> <edge id>
const R=process.env.CONV||'/home/user/solidworks-converters',S=require(R+'/src'),N=require(R+'/src/brep/native'),G=require(R+'/src/geom/eval'),F=require(R+'/src/brep/fit'),fs=require('fs');
const M=N.build(S.readBrep(fs.readFileSync(process.argv[2])).parsed),e=M.edges.get(+process.argv[3]);
const c=e.curve.type==='trimmed'?e.curve.basis:e.curve,V=e.v.map(v=>M.vertices.get(v).p),d=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
const [a,b]=G.curveRange(c);
function dense(p){let best={t:a,d:Infinity};for(let i=0;i<=20000;i++){const t=a+(b-a)*i/20000,q=d(G.curvePoint(c,t),p);if(q<best.d)best={t,d:q};}return best;}
V.forEach((p,i)=>{const r=G.curveProject(c,p),q=dense(p);
  console.log(`vertex ${i}: curveProject t ${r.t.toFixed(9)} distance ${r.d.toExponential(2)}; dense t ${q.t.toFixed(9)} distance ${q.d.toExponential(2)}; trim t ${(i?e.curve.t1:e.curve.t0)} distance ${d(G.curvePoint(c,i?e.curve.t1:e.curve.t0),p).toExponential(2)}`);});
const vt=e.v.map(v=>M.vertices.get(v).tolerance||0);
const r0=F.edgeCurve(e,c,V[0],V[1],{tolerance:1e-8,vertexTolerance:vt});
console.log(`converter fit: t ${r0.t0}..${r0.t1}, error ${r0.error.toExponential(2)}`);
// the same fit with the projection replaced by the trim (only for this call)
if(e.curve.type==='trimmed'){const cp=G.curveProject;let k=0;G.curveProject=(cc,p)=>cc===c&&k<2?{t:(k++?e.curve.t1:e.curve.t0),d:0}:cp(cc,p);
  try{const r1=F.edgeCurve(e,c,V[0],V[1],{tolerance:1e-8,vertexTolerance:vt});console.log(`fit from the trim: error ${r1.error.toExponential(2)}`);}finally{G.curveProject=cp;}}
