// EXP-122 (NQ-067): edge 6075's basis, radius of curvature across u (along v = const) at u = 0 and
// u = 1, against the offset distance; and vertex 1's foot on the offset to full precision.
const {M,e,c,O,B,D,V1,q}=require('./ext.js');const G=require((process.env.CONV||'/home/user/solidworks-converters')+'/src/geom/eval');
const v0=B.kv[B.dv],v1=B.kv[B.ctrl[0].length];
const nrm=(u,v)=>{const f=G.surfaceEval(B,u,v);return G.unit(G.cross(f.du,f.dv));};
for(const v of [v0,(v0+v1)/2,v1])for(const u of [0,0.5,1]){const h=1e-6,f=G.surfaceEval(B,u,v),dn=G.mul(G.sub(nrm(Math.min(1,u+h),v),nrm(Math.max(0,u-h),v)),1/(Math.min(1,u+h)-Math.max(0,u-h)));
  // signed: positive when the normal turns away from the tangent (centre on the -n side)
  const k=G.dot(dn,G.unit(f.du))/G.norm(f.du);
  console.log(`v ${v.toFixed(6)} u ${u}: radius across u ${(1/Math.abs(k)*1e3).toFixed(4)} mm, centre on the ${k>0?'-':'+'}n side; offset ${(D*1e3).toFixed(4)} mm along +n`);}
const r=G.surfaceInverse(O,V1);console.log(`vertex 1 foot: u ${r.u} v ${r.v}`);
