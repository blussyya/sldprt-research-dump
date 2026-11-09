// EXP-103: how far do Parasolid's own chart points of a spine lie from a swept offset, under three foots:
// clamped to the curve's range (what genericInverse does), the polynomial continuation of the B-spline curve
// (what surfaceEval does past the range), and a straight tangent continuation. A chart point is on the real
// surface to the chart's own accuracy, so the model nearest 0 is the one Parasolid uses.
// usage: node ext.js part blendnode
const R=process.env.CONV||'/home/user/solidworks-converters',S=require(R+'/src'),N=require(R+'/src/brep/native'),G=require(R+'/src/geom/eval');
const n=N.build(S.readBrep(process.argv[2]).parsed);const f=n.faces.find(f=>f.surface.node===+process.argv[3]);let c=f.surface.spine;if(c.type==='trimmed')c=c.basis;
const off=c.surfaces.find(s=>s.basis&&s.basis.type==='swept'),sw=off.basis,cv=sw.curve;
const [t0,t1]=G.curveRange(cv);
const nrm=(u,v,ext)=>{ // offset surface point under a continuation model
  const tc=Math.min(t1,Math.max(t0,u));let P,T;
  if(ext==='poly'){const e=G.surfaceEval(sw,u,v);P=e.p;T=e.du;const n=G.unit(G.cross(e.du,e.dv));return G.add(P,G.mul(sw.sense===-1?G.mul(n,-1):n,off.d));}
  const e=G.surfaceEval(sw,tc,v);P=G.add(e.p,G.mul(e.du,(u-tc)));const n=G.unit(G.cross(e.du,e.dv));return G.add(P,G.mul(sw.sense===-1?G.mul(n,-1):n,off.d));};
function foot(p,ext){let u=0.5,v=0;
  for(let it=0;it<200;it++){const h=1e-6,P=nrm(u,v,ext),Pu=G.mul(G.sub(nrm(u+h,v,ext),nrm(u-h,v,ext)),1/(2*h)),Pv=G.mul(G.sub(nrm(u,v+h,ext),nrm(u,v-h,ext)),1/(2*h)),r=G.sub(p,P);
    const a=G.dot(Pu,Pu),b=G.dot(Pu,Pv),cc=G.dot(Pv,Pv),det=a*cc-b*b,x=G.dot(r,Pu),y=G.dot(r,Pv);const su=(cc*x-b*y)/det,sv=(a*y-b*x)/det;
    u+=su;v+=sv;if(Math.hypot(su,sv)<1e-14)break;}
  return {u,v,d:G.dist(p,nrm(u,v,ext))};}
console.log('swept curve range',t0,t1,'offset d',off.d,'sense',sw.sense);
for(const q of c.chart){const r1=G.surfaceDistance(off,q),a=foot(q,'poly'),b=foot(q,'tangent');
  console.log('chart pt u(poly)',a.u.toFixed(4),' |d| clamped-foot(surfaceDistance)',Math.abs(r1.d).toExponential(2),' poly',a.d.toExponential(2),' tangent',b.d.toExponential(2),' u(tangent)',b.u.toFixed(4));}
