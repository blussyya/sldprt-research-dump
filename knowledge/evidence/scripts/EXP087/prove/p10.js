const L=require('./lib'),G=L.G;
const bad=require('./bad8.json').filter(b=>b.d<1e-3);
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],nm=a=>Math.hypot(...a),dt=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
function nearest(X,u,v){ // Gauss-Newton on |X-off|^2
  for(let it=0;it<200;it++){const q=G.surfaceEval(L.off,u,v),R=sub(X,q.p);
    const a=dt(q.du,q.du),bb=dt(q.du,q.dv),c=dt(q.dv,q.dv),x=dt(R,q.du),y=dt(R,q.dv),det=a*c-bb*bb;
    const su=(c*x-bb*y)/det,sv=(a*y-bb*x)/det;u+=su;v+=sv;if(Math.abs(su)+Math.abs(sv)<1e-11)break;}
  const q=G.surfaceEval(L.off,u,v);return {u,v,dist:nm(sub(X,q.p)),p:q.p};}
for(const b of bad){
  const X=b.X;const m=L.solve(X[0],-13.2,77); // main
  const n1=nearest(X,m.u,m.v);
  // converter's inverse seeded at its cached foot
  const r=G.surfaceInverse(L.off,X,b.foot);const e=G.surfaceEval(L.off,r.u,r.v);
  const n=(()=>{const c=[e.du[1]*e.dv[2]-e.du[2]*e.dv[1],e.du[2]*e.dv[0]-e.du[0]*e.dv[2],e.du[0]*e.dv[1]-e.du[1]*e.dv[0]];const l=nm(c);return c.map(v=>v/l);})();
  console.log(b.x.toFixed(5),'true dist X->offset (from main sheet) =',n1.dist.toExponential(2),'at',n1.u.toFixed(2),n1.v.toFixed(2),'| converter foot',r.u.toFixed(3),r.v.toFixed(3),'|X-e|=',nm(sub(X,e.p)).toExponential(2),'d=',dt(sub(X,e.p),n).toExponential(1));
}
