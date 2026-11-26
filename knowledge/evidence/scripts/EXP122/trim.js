// EXP-122 (NQ-067): sample an SP_CURVE edge's basis around its trim, with the 2D (u, v), the
// surface's parameter range and the distance from each vertex.
// usage: node trim.js <part> <edge id> [t from] [t to] [steps]
const R=process.env.CONV||'/home/user/solidworks-converters',S=require(R+'/src'),N=require(R+'/src/brep/native'),G=require(R+'/src/geom/eval'),fs=require('fs');
const M=N.build(S.readBrep(fs.readFileSync(process.argv[2])).parsed),e=M.edges.get(+process.argv[3]);
const c=e.curve.type==='trimmed'?e.curve.basis:e.curve,V=e.v.map(v=>M.vertices.get(v).p),d=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
const [a,b]=G.curveRange(c),t0=+(process.argv[4]??a),t1=+(process.argv[5]??b),n=+(process.argv[6]??20);
console.log(`trim ${e.curve.t0}..${e.curve.t1}; basis range ${a}..${b}; 2D degree ${c.c2.degree}, ${c.c2.ctrl.length} control points, knots ${JSON.stringify(c.c2.knots)}`);
const s=c.surface;console.log(`surface ${s.type}${s.node||''}: ${s.type==='bspline'?`degree ${s.du}x${s.dv}, ${s.ctrl.length}x${s.ctrl[0].length}, u ${s.ku[s.du]}..${s.ku[s.ctrl.length]}, v ${s.kv[s.dv]}..${s.kv[s.ctrl[0].length]}`:''}`);
console.log('2D control points: '+c.c2.ctrl.map(q=>`(${q[0].toFixed(6)}, ${q[1].toFixed(6)})`).join(' '));
for(let i=0;i<=n;i++){const t=t0+(t1-t0)*i/n,q=G.bsplineCurve(c.c2,t).p,p=G.curvePoint(c,t);
  console.log(`t ${t.toFixed(6)}: uv (${q[0].toFixed(6)}, ${q[1].toFixed(6)}) to v0 ${d(p,V[0]).toExponential(3)} to v1 ${d(p,V[1]).toExponential(3)}`);}
