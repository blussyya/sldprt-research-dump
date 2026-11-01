const L=require('./lib'),G=L.G;
const bad=require('./bad8.json').filter(b=>b.d<1e-3);
const sub=(a,c)=>[a[0]-c[0],a[1]-c[1],a[2]-c[2]],nm=a=>Math.hypot(...a),dt=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
function gn(X,u,v){for(let it=0;it<300;it++){const q=G.surfaceEval(L.off,u,v),R=sub(X,q.p);const a=dt(q.du,q.du),bb=dt(q.du,q.dv),c=dt(q.dv,q.dv),x=dt(R,q.du),y=dt(R,q.dv),det=a*c-bb*bb;if(!det)break;const su=(c*x-bb*y)/det,sv=(a*y-bb*x)/det;u+=su;v+=sv;if(Math.abs(su)+Math.abs(sv)<1e-10)break;}
 const q=G.surfaceEval(L.off,u,v);return {u,v,dist:nm(sub(X,q.p))}}
for(const b of [bad[3],bad[8]]){
  const mins=[];
  for(let u=-70;u<=40;u+=1.5)for(let v=20;v<=140;v+=1.5){
    const d=nm(sub(b.X,G.surfaceEval(L.off,u,v).p)); if(d<0.012){const r=gn(b.X,u,v);if(r.dist<0.012&&!mins.some(m=>Math.hypot(m.u-r.u,m.v-r.v)<0.2))mins.push(r);}}
  console.log('X x=',b.x.toFixed(5),'local nearest-points on offset with dist<12mm:',mins.map(m=>`(${m.u.toFixed(2)},${m.v.toFixed(2)}) d=${(m.dist*1e6).toFixed(1)}um`).join('  '));
}
