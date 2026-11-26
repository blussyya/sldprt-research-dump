// EXP-122 (NQ-067): edge 6075's offset SP_CURVE past the basis's v range. Where vertex 1's foot on the
// offset is; the basis's curvature across u = 0; and the curve's end evaluated three ways past
// and seam.js load the part through it.
const R=process.env.CONV||'/home/user/solidworks-converters',S=require(R+'/src'),N=require(R+'/src/brep/native'),G=require(R+'/src/geom/eval'),fs=require('fs');
const M=N.build(S.readBrep(fs.readFileSync(process.argv[2])).parsed),e=M.edges.get(6075),c=e.curve.basis,O=c.surface,B=O.basis;
const d=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]),x=v=>v.toExponential(2),V1=M.vertices.get(e.v[1]).p;
const D=B.sense===-1?-O.d:O.d,v0=B.kv[B.dv];
console.log(`basis sense ${B.sense}, offset d ${O.d} (applied ${D}), v range starts ${v0}`);
for(const near of [null,{u:0,v:0.00704},{u:0,v:0.0074}]){const r=G.surfaceInverse(O,V1,near);console.log(`vertex 1 foot on the offset (seed ${JSON.stringify(near)}): u ${r.u.toFixed(7)} v ${r.v.toFixed(7)}, distance ${x(d(G.surfaceEval(O,r.u,r.v).p,V1))}`);}
// curvature of the basis in v along u = 0, near v0, from the normal's turn rate
const nrm=(u,v)=>{const f=G.surfaceEval(B,u,v);return G.unit(G.cross(f.du,f.dv));};
for(const v of [v0,v0+2e-4,v0+8e-4]){const h=1e-6,f=G.surfaceEval(B,0,v),dn=G.mul(G.sub(nrm(0,v+h),nrm(0,v-h)),1/(2*h));
  console.log(`v ${v.toFixed(6)}: |dS/dv| ${G.norm(f.dv).toFixed(4)} m, |dn/dv| ${G.norm(dn).toFixed(4)}, radius of curvature ${(G.norm(f.dv)/G.norm(dn)*1e3).toFixed(3)} mm`);}

const tEnd=e.curve.t1,q=G.bsplineCurve(c.c2,tEnd).p;
console.log(`curve end t ${tEnd}: uv (${q[0]}, ${q[1]})`);
module.exports={M,e,c,O,B,D,V1,q};
