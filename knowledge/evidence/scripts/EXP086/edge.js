// head_back blend 3443: do the spine chart points lie past the edge of the offsets' basis B-splines?
// For each chart point: the clamped foot on each basis, whether it sits on a parameter bound,
// and the distance to it compared with |offset|.
const R=process.env.CONV||require('path').join(__dirname,'../../../../../solidworks-converters'),S=require(R+'/src'),N=require(R+'/src/brep/native'),G=require(R+'/src/geom/eval');
const M=N.build(S.readBrep(process.argv[2]).parsed);let b;for(const f of M.faces.values())if(f.surface&&f.surface.node===+(process.env.NODE||3443)){b=f.surface;break;}
let c=b.spine;if(c.type==='trimmed')c=c.basis;
for(const s of c.surfaces){const q=s.basis,[[u0,u1],[v0,v1]]=G.surfaceRange(q);console.log('offset',s.node,'d',s.d,'basis',q.node,'u',u0.toFixed(3),u1.toFixed(3),'v',v0.toFixed(3),v1.toFixed(3));
  c.chart.forEach((p,i)=>{const r=G.surfaceInverse(q,p),e=G.surfaceEval(q,r.u,r.v),edge=[r.u-u0,u1-r.u,r.v-v0,v1-r.v].some(x=>Math.abs(x)<1e-9);
    console.log(' ',i,'dist-|d| um',((G.dist(p,e.p)-Math.abs(s.d))*1e6).toFixed(3),edge?'ON EDGE u '+r.u.toFixed(3)+' v '+r.v.toFixed(3):'');});}
// past the edge: carry the boundary span's polynomial on (no clamp) and look for the foot there
const s=c.surfaces.find(x=>x.node===3440)||c.surfaces[1],q=s.basis;
for(const i of [14,15,16,17,18]){const p=c.chart[i];let {u,v}=G.surfaceInverse(q,p);
  for(let it=0;it<200;it++){const e=G.bsplineSurface(q,u,v),r=G.sub(p,e.p),a=G.dot(e.du,e.du),bb=G.dot(e.du,e.dv),cc=G.dot(e.dv,e.dv),det=a*cc-bb*bb;
    const x=G.dot(r,e.du),y=G.dot(r,e.dv);u+=(cc*x-bb*y)/det;v+=(a*y-bb*x)/det;}
  const e=G.bsplineSurface(q,u,v);console.log('chart',i,'extended foot v',v.toFixed(4),'dist-|d| um',((G.dist(p,e.p)-Math.abs(s.d))*1e6).toFixed(4));}
// past the edge, extended along the edge tangent: S(u,v0) + (v-v0)·Sv(u,v0); the foot by Newton on
// (u, v) with numeric derivatives of that extension, then the distance compared with |offset|
const v0=G.surfaceRange(q)[1][0];
const X=(u,v)=>{const e=G.bsplineSurface(q,u,v0);return G.add(e.p,G.mul(e.dv,v-v0));};
for(const i of [15,16,17,18]){const p=c.chart[i];let u=G.surfaceInverse(q,p).u,v=v0-0.1;
  for(let it=0;it<100;it++){const h=1e-6,P=X(u,v),Pu=G.mul(G.sub(X(u+h,v),X(u-h,v)),1/(2*h)),Pv=G.mul(G.sub(X(u,v+h),X(u,v-h)),1/(2*h)),r=G.sub(p,P);
    const a=G.dot(Pu,Pu),bb=G.dot(Pu,Pv),cc=G.dot(Pv,Pv),det=a*cc-bb*bb,x=G.dot(r,Pu),y=G.dot(r,Pv);u+=(cc*x-bb*y)/det;v+=(a*y-bb*x)/det;}
  console.log('chart',i,'linear-extension foot v',v.toFixed(4),'dist-|d| um',((G.dist(p,X(u,v))-Math.abs(s.d))*1e6).toFixed(4));}
