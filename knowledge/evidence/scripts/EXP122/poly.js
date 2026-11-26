// EXP-122 (NQ-067): edge 6075 with the basis's first v span carried on past v0 as its own
// polynomial, instead of our linear extension. For
// each: the SP_CURVE's end against vertex 1, the curve's distance from the cylinder fin past v0.
const {M,e,c,O,B,D,V1,q}=require('./ext.js');const G=require((process.env.CONV||'/home/user/solidworks-converters')+'/src/geom/eval');
const d=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]),x=v=>v.toExponential(2),v0=B.kv[B.dv],vk=B.kv[B.dv+1];
// the first v span's basis functions evaluated past v0 are that span's polynomial carried on
function polyP(u,v){const nu=B.ctrl.length,nv=B.ctrl[0].length,ku=G.span(B.ku,B.du,nu,u),kv=G.span(B.kv,B.dv,nv,Math.max(v,v0));
  const bu=G.basisFuns(B.ku,B.du,ku,u),bv=G.basisFuns(B.kv,B.dv,kv,v);let P=[0,0,0],W=0;
  for(let a=0;a<=B.du;a++)for(let b=0;b<=B.dv;b++){const i=ku-B.du+a,j=kv-B.dv+b,w=B.weights?B.weights[i][j]:1,f=bu[a]*bv[b]*w;P=G.add(P,G.mul(B.ctrl[i][j],f));W+=f;}
  return G.mul(P,1/W);}
const polyOff=(u,v)=>{const h=1e-7,du=G.mul(G.sub(polyP(u+h,v),polyP(u-h,v)),1/(2*h)),dv=G.mul(G.sub(polyP(u,v+h*1e-3),polyP(u,v-h*1e-3)),1/(2*h*1e-3));
  return G.add(polyP(u,v),G.mul(G.unit(G.cross(du,dv)),D));};
// check: inside the first span the polynomial is the surface
for(const v of [v0+1e-5,(v0+vk)/2,0.0085])console.log(`inside, v ${v.toFixed(6)}: polynomial against the surface, basis ${x(d(polyP(0.3,v),G.surfaceEval(B,0.3,v).p))}, offset ${x(d(polyOff(0.3,v),G.surfaceEval(O,0.3,v).p))}`);
const cyl=(e.pcurves||[]).map(pc=>pc.curve.type==='trimmed'?pc.curve.basis:pc.curve).find(k=>k.surface.type==='cylinder');
const cs=M.faces.find(f=>f.surface.type==='cylinder'&&(e.pcurves||[]).some(pc=>pc.face===f.id)).surface;
const cylDist=p=>{const r=G.surfaceInverse(cs,p);return d(G.surfaceEval(cs,r.u,r.v).p,p);};
console.log('t, v, then for linear | polynomial: distance from the cylinder, from the cylinder fin');
for(const t of [0.83,0.82,0.81,0.80,0.79,e.curve.t1]){const uv=G.bsplineCurve(c.c2,t).p,pl=G.surfaceEval(O,uv[0],uv[1]).p,pp=polyOff(uv[0],uv[1]);
  console.log(`t ${t.toFixed(4)} v ${uv[1].toFixed(6)}: linear ${x(cylDist(pl))}, ${x(G.curveProject(cyl,pl).d)} | polynomial ${x(cylDist(pp))}, ${x(G.curveProject(cyl,pp).d)}`);}
const uv=G.bsplineCurve(c.c2,e.curve.t1).p;
console.log(`curve end to vertex 1 (tolerance 4.82e-5): linear ${x(d(G.surfaceEval(O,uv[0],uv[1]).p,V1))}, polynomial ${x(d(polyOff(uv[0],uv[1]),V1))}`);
// nearest point of the polynomial-extended curve to vertex 1
let best=Infinity;for(let i=0;i<=4000;i++){const t=e.curve.t1+(1-e.curve.t1)*i/4000,w=G.bsplineCurve(c.c2,t).p;best=Math.min(best,d(polyOff(w[0],w[1]),V1));}
console.log(`nearest point of the polynomial curve to vertex 1: ${x(best)}`);
