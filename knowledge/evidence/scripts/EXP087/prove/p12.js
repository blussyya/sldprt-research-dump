const L=require('./lib'),G=L.G;
const bad=require('./bad8.json').filter(b=>b.d<1e-3);
const sub=(a,c)=>[a[0]-c[0],a[1]-c[1],a[2]-c[2]],nm=a=>Math.hypot(...a),dt=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const bas=L.off.basis;
function gn(S,X,u,v){let it=0;for(;it<400;it++){const q=G.surfaceEval(S,u,v),R=sub(X,q.p);const a=dt(q.du,q.du),bb=dt(q.du,q.dv),c=dt(q.dv,q.dv),x=dt(R,q.du),y=dt(R,q.dv),det=a*c-bb*bb;const su=(c*x-bb*y)/det,sv=(a*y-bb*x)/det;u+=su;v+=sv;if(Math.abs(su)+Math.abs(sv)<1e-12)break;}
 const q=G.surfaceEval(S,u,v);return {u,v,it,dist:nm(sub(X,q.p))}}
// good main points for comparison, and bad ones
const goods=[-0.0455,-0.0465,-0.0470,-0.0475].map(x=>{const m=L.solve(x,-13.2,77);return {x,X:m.p,tag:'good'}});
for(const g of goods.concat(bad.slice(0,6).map(b=>({x:b.x,X:b.X,tag:'bad'})))){
  const a=gn(bas,g.X,-13.2,76),c=gn(bas,g.X,-12.5,47.559);
  console.log(g.tag,g.x.toFixed(5),'basis foot from v=76:',a.u.toFixed(3),a.v.toFixed(3),'dist',a.dist.toFixed(6),'it',a.it,'| from edge:',c.u.toFixed(3),c.v.toFixed(3),'dist',c.dist.toFixed(6),'it',c.it,'| inverse():',(r=>r.u.toFixed(3)+','+r.v.toFixed(3))(G.surfaceInverse(L.off,g.X)));
}
