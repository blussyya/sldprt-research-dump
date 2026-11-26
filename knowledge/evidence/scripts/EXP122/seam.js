// EXP-122 (NQ-067): does edge 6075's basis close in u? S(0, v) against S(1, v), basis and offset,
// inside the v range and on our extension past v0; the end tangents and normals on each side.
const {M,e,c,O,B,D,V1,q}=require('./ext.js');const G=require((process.env.CONV||'/home/user/solidworks-converters')+'/src/geom/eval');
const d=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]),x=v=>v.toExponential(2),v0=B.kv[B.dv],v1=B.kv[B.ctrl[0].length];
const nrm=(s,u,v)=>{const f=G.surfaceEval(s,u,v);return G.unit(G.cross(f.du,f.dv));};
console.log(`u knots ${JSON.stringify(B.ku)}, v knots ${JSON.stringify(B.kv)}, weights ${B.weights?'yes':'no'}`);
for(const v of [v1,(v0+v1)/2,v0,0.007122,q[1]]){const a=G.surfaceEval(B,0,v),b=G.surfaceEval(B,1,v);
  const ang=Math.acos(Math.min(1,Math.abs(G.dot(nrm(B,0,v),nrm(B,1,v)))))*180/Math.PI;
  console.log(`v ${v.toFixed(6)}${v<v0?' (extension)':''}: basis S(0,v)-S(1,v) ${x(d(a.p,b.p))}, dS/dv apart ${x(d(a.dv,b.dv))}, normals ${ang.toFixed(4)} deg apart; offset ${x(d(G.surfaceEval(O,0,v).p,G.surfaceEval(O,1,v).p))}`);}
// distance from vertex 1 to the curve point at the same v on u = 0
console.log(`vertex 1 to offset S(0, 0.007122): ${x(d(G.surfaceEval(O,0,0.007122).p,V1))}; to S(1, 0.007122): ${x(d(G.surfaceEval(O,1,0.007122).p,V1))}`);
