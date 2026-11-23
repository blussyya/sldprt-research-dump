// EXP-103 (finish): fit the spines of the given head_back blends alone, with two converters, and
// compare: each one's reported error and control count, and how far apart the two curves are
// (4001 points of one, each to its nearest point on the other).
// usage: node spines.js <part> <convA> <convB> node,node,...
const [part,A,B,list]=process.argv.slice(2);
const load=R=>{const S=require(R+'/src'),N=require(R+'/src/brep/native'),F=require(R+'/src/brep/fit'),G=require(R+'/src/geom/eval');
  return {F,G,M:N.build(S.readBrep(part).parsed)};};
const a=load(A),b=load(B);
const blend=(X,n)=>{for(const f of X.M.faces.values())if(f.surface&&f.surface.node===n)return f.surface;};
const near=(G,c,q)=>{const [s,e]=G.curveRange(c);let bt=s,bd=Infinity;for(let i=0;i<=400;i++){const t=s+(e-s)*i/400,d=G.dist(G.bsplineCurve(c,t).p,q);if(d<bd){bd=d;bt=t;}}
  let h=(e-s)/400;for(let k=0;k<50;k++){for(const t of [bt-h,bt+h]){if(t<s||t>e)continue;const d=G.dist(G.bsplineCurve(c,t).p,q);if(d<bd){bd=d;bt=t;}}h/=2;}return bd;};
for(const n of list.split(',').map(Number)){
  const ra=a.F.spineOf(blend(a,n),1e-8),rb=b.F.spineOf(blend(b,n),1e-8);
  const ca=ra.curve,[s,e]=a.G.curveRange(ca);let w=0;for(let i=0;i<=4000;i++)w=Math.max(w,near(a.G,rb.curve,a.G.bsplineCurve(ca,s+(e-s)*i/4000).p));
  console.log('blend',n,'| A error',ra.error.toExponential(3),'ctrl',ca.ctrl.length,'| B error',rb.error.toExponential(3),'ctrl',rb.curve.ctrl.length,'| curves apart, max',w.toExponential(3),'m');}
